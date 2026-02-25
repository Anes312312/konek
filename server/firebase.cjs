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

        try {
            // Selección de ID de Admin (para unicidad)
            if (query.includes('FROM users WHERE role = \'admin\'')) {
                const snap = await db.collection('users').where('role', '==', 'admin').limit(1).get();
                if (snap.empty) return null;
                return { id: snap.docs[0].id, ...snap.docs[0].data() };
            }

            // CASO ESPECIAL: WHERE phone_number = ? AND id != ?
            // Usado al hacer join para verificar si otro usuario ya tiene ese número
            if (query.includes('phone_number = ?') && query.includes('id != ?')) {
                const phoneNumber = params[0];
                const excludeId = params[1];
                const snap = await db.collection('users').where('phone_number', '==', phoneNumber).limit(5).get();
                if (snap.empty) return null;
                // Buscar uno que NO sea el ID excluido
                const match = snap.docs.find(doc => doc.id !== excludeId);
                return match ? { id: match.id, ...match.data() } : null;
            }

            // Búsqueda por phone_number solamente
            if (query.includes('phone_number = ?') && !query.includes('id')) {
                const snap = await db.collection('users').where('phone_number', '==', params[0]).limit(1).get();
                return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
            }

            // Búsqueda por ID de usuario
            if (query.includes('FROM users') && query.includes('id = ?')) {
                const docId = params[0] || params[params.length - 1];
                const doc = await db.collection('users').doc(docId).get();
                return doc.exists ? { id: doc.id, ...doc.data() } : null;
            }

            // Búsqueda en deleted_ids
            if (query.includes('FROM deleted_ids WHERE id = ?')) {
                const snap = await db.collection('deleted_ids').doc(params[0]).get();
                return snap.exists ? { id: snap.id } : null;
            }

            // Búsqueda de uploads
            if (query.includes('FROM uploads WHERE id = ?')) {
                const doc = await db.collection('uploads').doc(params[0]).get();
                return doc.exists ? { id: doc.id, ...doc.data() } : null;
            }

            console.warn(`[Firebase] get() no manejó la consulta: ${query}`);
            return null;
        } catch (err) {
            console.error(`[Firebase Error] get() falló:`, err.message, '| Query:', query, '| Params:', params);
            return null;
        }
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
                    // INSERT INTO users (id, username, profile_pic, status, phone_number, role)
                    const [idVal, username, profile_pic, status, phone_number, role] = params;
                    data.username = username;
                    data.profile_pic = profile_pic;
                    data.status = status;
                    data.phone_number = phone_number;
                    data.role = role;
                } else if (params.length === 4) {
                    // admin_create_user: INSERT INTO users (id, username, phone_number, role)
                    const [idVal, username, phone_number, role] = params;
                    data.username = username;
                    data.phone_number = phone_number;
                    data.role = role;
                }
            } else if (query.includes('UPDATE users SET username = ?, phone_number = ?, role = ? WHERE id = ?')) {
                // admin_update_user: params = [username, phone_number, role, userId]
                data.username = params[0];
                data.phone_number = params[1];
                data.role = params[2];
            } else if (query.includes('COALESCE')) {
                // update_profile: UPDATE users SET username = ?, profile_pic = ?, status = ?, phone_number = COALESCE(phone_number, ?) WHERE id = ?
                // params = [name, photo, description, number, userId]
                data.username = params[0];
                data.profile_pic = params[1];
                data.status = params[2];
                // phone_number solo se establece si no tenía uno (COALESCE)
                // En Firestore, haremos merge, así que seteamos si no es null
                if (params[3]) data.phone_number = params[3];
            } else {
                // Update genérico fallback - intentar parsear por posición
                console.warn('[Firebase] UPDATE genérico detectado:', query, params);
                if (params.length >= 1) data.username = params[0];
                if (params.length >= 2) data.phone_number = params[1];
                if (params.length >= 3) data.role = params[2];
            }

            // Eliminar campos undefined para evitar errores de Firestore
            Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

            console.log(`[Firebase Debug] run() SET doc '${id}' con data:`, JSON.stringify(data));
            await db.collection('users').doc(id).set(data, { merge: true });
            return;
        }

        // INSERT/UPDATE UPLOAD
        if (query.includes('INSERT INTO uploads')) {
            const [id, file_name, total_size, status] = params;
            await db.collection('uploads').doc(id).set({
                file_name, total_size, current_size: 0, status,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            return;
        }

        if (query.includes('UPDATE uploads SET')) {
            if (query.includes('current_size = current_size + ?')) {
                const increment = params[0];
                const id = params[1];
                await db.collection('uploads').doc(id).update({
                    current_size: admin.firestore.FieldValue.increment(increment)
                });
            } else if (query.includes('status = ?')) {
                await db.collection('uploads').doc(params[1]).update({ status: params[0] });
            }
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

        if (query.includes('DELETE FROM users WHERE phone_number = ?')) {
            const snap = await db.collection('users').where('phone_number', '==', params[0]).get();
            const batch = db.batch();
            snap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            return;
        }

        if (query.includes('DELETE FROM messages WHERE sender_id = ?')) {
            // Borrar mensajes donde el usuario es sender o receiver
            const snap1 = await db.collection('messages').where('sender_id', '==', params[0]).get();
            const snap2 = await db.collection('messages').where('receiver_id', '==', params[1] || params[0]).get();
            const batch = db.batch();
            snap1.forEach(doc => batch.delete(doc.ref));
            snap2.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            return;
        }

        if (query.includes('DELETE FROM statuses WHERE') && query.includes('user_id = ?')) {
            const snap = await db.collection('statuses').where('user_id', '==', params[0]).get();
            const batch = db.batch();
            snap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
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

        console.warn(`[Firebase] run() no manejó la consulta: ${query}`);

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
