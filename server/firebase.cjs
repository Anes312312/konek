const admin = require('firebase-admin');

// Para fines de esta implementación y dado que el servidor Node corre en un entorno controlado (Render), 
// inicializamos con Default Credentials o variables de entorno. 
// Para que esto funcione en Render, el usuario deberá pegar el JSON de la cuenta de servicio en una variable de entorno.

let db = null;

if (!admin.apps.length) {
    try {
        console.log('[Firebase] Inicializando Admin SDK...');
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            console.log('[Firebase] Usando FIREBASE_SERVICE_ACCOUNT de variables de entorno.');
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            console.log('[Firebase] Intentando inicialización básica con Project ID:', process.env.FIREBASE_PROJECT_ID || 'konek-fun-chat-312');
            admin.initializeApp({
                projectId: process.env.FIREBASE_PROJECT_ID || 'konek-fun-chat-312'
            });
        }
        db = admin.firestore();
        console.log('[Firebase] Admin SDK y Firestore listos.');
    } catch (error) {
        console.error('[Firebase Error] Fallo crítico al inicializar Firebase Admin:', error.message);
    }
} else {
    db = admin.firestore();
}

// Funciones para emular el comportamiento que tenía con SQLite pero sobre Firestore
const firebaseDb = {
    all: async (query, params = []) => {
        if (!db) {
            console.error('[Firebase] Error: Intento de consulta sin DB inicializada.');
            return [];
        }

        // --- CONSULTA DE USUARIOS ---
        if (query.includes('FROM users')) {
            try {
                // FAKE NOT IN (SELECT id FROM deleted_ids)
                const deletedSnap = await db.collection('deleted_ids').get();
                const deletedIds = deletedSnap.docs.map(doc => doc.id);

                const snap = await db.collection('users').get();
                let users = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Filtramos manualmente por bloqueados y eliminados
                const BANNED_NAMES = ['pelotudo', 'Anes'];
                const BANNED_NUMBERS = ['12345', '312'];

                const filtered = users.filter(u =>
                    !deletedIds.includes(u.id) &&
                    !BANNED_NAMES.includes(u.username) &&
                    !BANNED_NUMBERS.includes(u.phone_number)
                );
                console.log(`[Firebase Debug] all(users): Encontrados ${users.length}, filtrados ${filtered.length}`);
                return filtered;
            } catch (err) {
                console.error('[Firebase Error] Error en all(users):', err.message);
                return [];
            }
        }

        // --- CONSULTA DE MENSAJES ---
        if (query.includes('FROM messages')) {
            // Historial global o entre dos usuarios
            let msgQuery = db.collection('messages');

            if (query.includes('receiver_id = "global"')) {
                msgQuery = msgQuery.where('receiver_id', '==', 'global');
            } else if (params.length >= 2) {
                // Simplificación: Traemos todos y filtramos fuera para historial directo
                const snap = await msgQuery.orderBy('timestamp', 'asc').get();
                const u1 = params[0];
                const u2 = params[1];
                return snap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(m => (m.sender_id === u1 && m.receiver_id === u2) || (m.sender_id === u2 && m.receiver_id === u1));
            }

            const snap = await msgQuery.orderBy('timestamp', 'asc').get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        // --- CONSULTA DE ESTADOS (CON JOIN SIMULADO) ---
        if (query.includes('FROM statuses')) {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const snap = await db.collection('statuses').where('timestamp', '>', twentyFourHoursAgo).orderBy('timestamp', 'desc').get();

            const statuses = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Simular el JOIN con Users para traer nombre y foto
            const userIds = [...new Set(statuses.map(s => s.user_id))];
            if (userIds.length > 0) {
                const userSnaps = await Promise.all(userIds.map(uid => db.collection('users').doc(uid).get()));
                const userMap = {};
                userSnaps.forEach(s => { if (s.exists) userMap[s.id] = s.data(); });

                return statuses.map(s => ({
                    ...s,
                    username: userMap[s.user_id]?.username || 'Usuario',
                    profile_pic: userMap[s.user_id]?.profile_pic || ''
                }));
            }
            return statuses;
        }

        return [];
    },

    get: async (query, params = []) => {
        if (!db) return null;

        // Selección de ID de Admin (para unicidad)
        if (query.includes('FROM users WHERE role = \'admin\'')) {
            const snap = await db.collection('users').where('role', '==', 'admin').limit(1).get();
            if (snap.empty) return null;
            return { id: snap.docs[0].id, ...snap.docs[0].data() };
        }

        if (query.includes('FROM users WHERE id = ?') || query.includes('FROM users WHERE phone_number = ?')) {
            const val = params[0];
            const isId = query.includes('id = ?');

            if (isId) {
                const doc = await db.collection('users').doc(val).get();
                return doc.exists ? { id: doc.id, ...doc.data() } : null;
            } else {
                const snap = await db.collection('users').where('phone_number', '==', val).limit(1).get();
                return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
            }
        }

        if (query.includes('FROM deleted_ids WHERE id = ?')) {
            const snap = await db.collection('deleted_ids').doc(params[0]).get();
            return snap.exists ? { id: snap.id } : null;
        }

        return null;
    },

    run: async (query, params = []) => {
        if (!db) return;

        // BATCH DELETES (Baneos)
        if (query.includes('DELETE FROM users WHERE username IN')) {
            const names = ['pelotudo', 'Anes'];
            const snap = await db.collection('users').where('username', 'in', names).get();
            const batch = db.batch();
            snap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            return;
        }

        if (query.includes('DELETE FROM users WHERE phone_number IN')) {
            const nums = ['12345', '312'];
            const snap = await db.collection('users').where('phone_number', 'in', nums).get();
            const batch = db.batch();
            snap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            return;
        }

        // LIMPIEZA DE ADMINS DUPLICADOS
        if (query.includes('DELETE FROM users WHERE') && query.includes('role = \'admin\'')) {
            const idToKeep = params[0];
            const snap = await db.collection('users').where('role', '==', 'admin').get();
            const batch = db.batch();
            snap.forEach(doc => { if (doc.id !== idToKeep) batch.delete(doc.ref); });
            await batch.commit();
            return;
        }

        if (query.includes('UPDATE users SET role = \'user\' WHERE username = \'Admin\' AND id != ?')) {
            const idToKeep = params[0];
            const snap = await db.collection('users').where('username', '==', 'Admin').get();
            const batch = db.batch();
            snap.forEach(doc => { if (doc.id !== idToKeep) batch.update(doc.ref, { role: 'user' }); });
            await batch.commit();
            return;
        }

        // INSERT/UPDATE USUARIO
        if (query.includes('INSERT INTO users') || query.includes('ON CONFLICT(id)') || query.includes('UPDATE users SET')) {
            const id = query.includes('WHERE id = ?') ? params[params.length - 1] : params[0];
            const data = {};

            if (query.includes('INSERT')) {
                // Mapeo inteligente de parámetros según su cantidad
                if (params.length === 6) {
                    const [idVal, username, profile_pic, status, phone_number, role] = params;
                    data.username = username;
                    data.profile_pic = profile_pic;
                    data.status = status;
                    data.phone_number = phone_number;
                    data.role = role;
                } else if (params.length === 4) {
                    // Caso admin_create_user
                    const [idVal, username, phone_number, role] = params;
                    data.username = username;
                    data.phone_number = phone_number;
                    data.role = role;
                }
            } else {
                // Update simple
                if (query.includes('username = ?')) data.username = params[0];
                if (query.includes('profile_pic = ?')) data.profile_pic = params[1];
                if (query.includes('status = ?')) data.status = params[2];
                if (query.includes('role = ?')) {
                    // El role suele ser el 3er parámetro en el update de admin o el 5to si es insert...
                    // pero aquí lo buscamos por índice específico según el query del admin_update_user
                    if (query.includes('phone_number = ?, role = ?')) data.role = params[2];
                    else data.role = params[0]; // fallback
                }
                if (query.includes('phone_number = ?')) {
                    data.phone_number = params[query.includes('COALESCE') ? 3 : 1];
                }
            }

            // Eliminar campos undefined para evitar errores de Firestore
            Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

            await db.collection('users').doc(id).set(data, { merge: true });
            return;
        }

        // INSERT MENSAJE
        if (query.includes('INSERT INTO messages')) {
            const [id, sender_id, receiver_id, content, type, file_path, file_name, file_size] = params;
            await db.collection('messages').doc(id).set({
                sender_id, receiver_id, content, type, file_path, file_name, file_size,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            return;
        }

        // INSERT ESTADO
        if (query.includes('INSERT INTO statuses')) {
            const [id, user_id, content, type] = params;
            await db.collection('statuses').doc(id).set({
                user_id, content, type,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            return;
        }

        // DELETE GENÉRICO
        if (query.includes('DELETE FROM users WHERE id = ?')) {
            await db.collection('users').doc(params[0]).delete();
            return;
        }

        if (query.includes('DELETE FROM statuses WHERE id = ?')) {
            await db.collection('statuses').doc(params[0]).delete();
            return;
        }

        // INSERT DELETED_IDS
        if (query.includes('deleted_ids')) {
            await db.collection('deleted_ids').doc(params[0]).set({ timestamp: admin.firestore.FieldValue.serverTimestamp() });
            return;
        }

    },

    cleanBanned: async () => {
        if (!db) return;
        const BANNED_NAMES = ['pelotudo', 'Anes'];
        const BANNED_NUMBERS = ['12345', '312'];

        for (const name of BANNED_NAMES) {
            const snap = await db.collection('users').where('username', '==', name).get();
            snap.forEach(doc => doc.ref.delete());
        }
        for (const num of BANNED_NUMBERS) {
            const snap = await db.collection('users').where('phone_number', '==', num).get();
            snap.forEach(doc => doc.ref.delete());
        }
    }
};

module.exports = { admin, db, firebaseDb };
