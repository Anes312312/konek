const admin = require('firebase-admin');

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
            console.log('[Firebase] ADVERTENCIA: Sin FIREBASE_SERVICE_ACCOUNT. Usando inicialización básica.');
            console.log('[Firebase] Project ID:', process.env.FIREBASE_PROJECT_ID || 'konek-fun-chat-312');
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

// Listas negras centralizadas
const BANNED_NAMES = ['pelotudo', 'Anes'];
const BANNED_NUMBERS = ['12345', '312'];

const firebaseDb = {

    // ==========================================
    // ALL - Retorna múltiples documentos
    // ==========================================
    all: async (query, params = []) => {
        if (!db) {
            console.error('[Firebase] Error: DB no inicializada en all()');
            return [];
        }

        try {
            // --- USUARIOS ---
            if (query.includes('FROM users')) {
                // Obtener IDs eliminados
                let deletedIds = [];
                try {
                    const deletedSnap = await db.collection('deleted_ids').get();
                    deletedIds = deletedSnap.docs.map(doc => doc.id);
                } catch (e) {
                    console.warn('[Firebase] No se pudo leer deleted_ids:', e.message);
                }

                const snap = await db.collection('users').get();
                let users = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Filtrar baneados y eliminados
                const filtered = users.filter(u =>
                    !deletedIds.includes(u.id) &&
                    !BANNED_NAMES.includes(u.username) &&
                    !BANNED_NUMBERS.includes(u.phone_number)
                );

                console.log(`[Firebase] all(users): Total=${users.length}, Filtrados=${filtered.length}`);
                return filtered;
            }

            // --- MENSAJES ---
            if (query.includes('FROM messages')) {
                if (query.includes('receiver_id = "global"')) {
                    const snap = await db.collection('messages')
                        .where('receiver_id', '==', 'global')
                        .orderBy('timestamp', 'asc')
                        .get();
                    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                }

                if (params.length >= 2) {
                    const u1 = params[0];
                    const u2 = params[1];
                    // Traemos todos los mensajes y filtramos (Firestore no soporta OR en where)
                    const snap = await db.collection('messages').orderBy('timestamp', 'asc').get();
                    return snap.docs
                        .map(doc => ({ id: doc.id, ...doc.data() }))
                        .filter(m =>
                            (m.sender_id === u1 && m.receiver_id === u2) ||
                            (m.sender_id === u2 && m.receiver_id === u1)
                        );
                }

                const snap = await db.collection('messages').orderBy('timestamp', 'asc').get();
                return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }

            // --- ESTADOS (con JOIN simulado a users) ---
            if (query.includes('FROM statuses')) {
                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const snap = await db.collection('statuses')
                    .where('timestamp', '>', twentyFourHoursAgo)
                    .orderBy('timestamp', 'desc')
                    .get();

                const statuses = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Simular JOIN con users
                const userIds = [...new Set(statuses.map(s => s.user_id))];
                if (userIds.length > 0) {
                    const userSnaps = await Promise.all(
                        userIds.map(uid => db.collection('users').doc(uid).get())
                    );
                    const userMap = {};
                    userSnaps.forEach(s => {
                        if (s.exists) userMap[s.id] = s.data();
                    });

                    return statuses.map(s => ({
                        ...s,
                        username: userMap[s.user_id]?.username || 'Usuario',
                        profile_pic: userMap[s.user_id]?.profile_pic || ''
                    }));
                }
                return statuses;
            }

            console.warn(`[Firebase] all() no manejó: ${query}`);
            return [];

        } catch (err) {
            console.error('[Firebase Error] all() falló:', err.message, '| Query:', query);
            return [];
        }
    },

    // ==========================================
    // GET - Retorna un solo documento
    // ==========================================
    get: async (query, params = []) => {
        if (!db) {
            console.warn('[Firebase] DB no inicializada en get()');
            return null;
        }

        try {
            // Admin por rol
            if (query.includes("FROM users WHERE role = 'admin'")) {
                const snap = await db.collection('users').where('role', '==', 'admin').limit(1).get();
                return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
            }

            // CASO ESPECIAL: phone_number = ? AND id != ?
            if (query.includes('phone_number = ?') && query.includes('id != ?')) {
                const phoneNumber = params[0];
                const excludeId = params[1];
                if (!phoneNumber) return null;
                const snap = await db.collection('users').where('phone_number', '==', phoneNumber).limit(5).get();
                if (snap.empty) return null;
                const match = snap.docs.find(doc => doc.id !== excludeId);
                return match ? { id: match.id, ...match.data() } : null;
            }

            // Búsqueda por phone_number solamente
            if (query.includes('phone_number = ?') && !query.includes('id')) {
                if (!params[0]) return null;
                const snap = await db.collection('users').where('phone_number', '==', params[0]).limit(1).get();
                return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
            }

            // Búsqueda por ID en users
            if (query.includes('FROM users') && query.includes('id = ?')) {
                const docId = params[0] || params[params.length - 1];
                if (!docId) return null;
                const doc = await db.collection('users').doc(String(docId)).get();
                return doc.exists ? { id: doc.id, ...doc.data() } : null;
            }

            // deleted_ids
            if (query.includes('FROM deleted_ids')) {
                if (!params[0]) return null;
                const snap = await db.collection('deleted_ids').doc(String(params[0])).get();
                return snap.exists ? { id: snap.id } : null;
            }

            // uploads
            if (query.includes('FROM uploads')) {
                if (!params[0]) return null;
                const doc = await db.collection('uploads').doc(String(params[0])).get();
                return doc.exists ? { id: doc.id, ...doc.data() } : null;
            }

            console.warn(`[Firebase] get() no manejó: ${query}`);
            return null;

        } catch (err) {
            console.error(`[Firebase Error] get() falló:`, err.message, '| Query:', query, '| Params:', params);
            return null;
        }
    },

    // ==========================================
    // RUN - Ejecuta operaciones de escritura
    // ==========================================
    run: async (query, params = []) => {
        if (!db) {
            console.warn('[Firebase] DB no inicializada en run()');
            return;
        }

        try {
            // ------ BATCH DELETES (Baneos) ------
            if (query.includes('DELETE FROM users WHERE username IN')) {
                const snap = await db.collection('users').where('username', 'in', BANNED_NAMES).get();
                if (!snap.empty) {
                    const batch = db.batch();
                    snap.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                }
                return;
            }

            if (query.includes('DELETE FROM users WHERE phone_number IN')) {
                const snap = await db.collection('users').where('phone_number', 'in', BANNED_NUMBERS).get();
                if (!snap.empty) {
                    const batch = db.batch();
                    snap.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                }
                return;
            }

            // ------ LIMPIEZA DE ADMINS DUPLICADOS ------
            if (query.includes('DELETE FROM users WHERE') && query.includes("role = 'admin'")) {
                const idToKeep = params[0];
                const snap = await db.collection('users').where('role', '==', 'admin').get();
                if (!snap.empty) {
                    const batch = db.batch();
                    snap.forEach(doc => { if (doc.id !== idToKeep) batch.delete(doc.ref); });
                    await batch.commit();
                }
                return;
            }

            if (query.includes("UPDATE users SET role = 'user' WHERE username = 'Admin' AND id != ?")) {
                const idToKeep = params[0];
                const snap = await db.collection('users').where('username', '==', 'Admin').get();
                if (!snap.empty) {
                    const batch = db.batch();
                    snap.forEach(doc => { if (doc.id !== idToKeep) batch.update(doc.ref, { role: 'user' }); });
                    await batch.commit();
                }
                return;
            }

            // ------ INSERT/UPDATE USUARIO ------
            if (query.includes('INSERT INTO users') || query.includes('ON CONFLICT(id)') || query.includes('UPDATE users SET')) {
                const id = query.includes('WHERE id = ?') ? params[params.length - 1] : params[0];

                if (!id) {
                    console.error('[Firebase] run() INSERT/UPDATE users: ID es null/undefined');
                    return;
                }

                const data = {};

                if (query.includes('INSERT')) {
                    if (params.length === 6) {
                        // JOIN: INSERT INTO users (id, username, profile_pic, status, phone_number, role)
                        data.username = params[1] || 'Usuario';
                        data.profile_pic = params[2] || '';
                        data.status = params[3] || '';
                        data.phone_number = params[4] || '';
                        data.role = params[5] || 'user';
                    } else if (params.length === 4) {
                        // admin_create_user: INSERT INTO users (id, username, phone_number, role)
                        data.username = params[1] || 'Usuario';
                        data.phone_number = params[2] || '';
                        data.role = params[3] || 'user';
                    }
                } else if (query.includes('UPDATE users SET username = ?, phone_number = ?, role = ? WHERE id = ?')) {
                    // admin_update_user: params = [username, phone_number, role, userId]
                    data.username = params[0];
                    data.phone_number = params[1] || '';
                    data.role = params[2] || 'user';
                } else if (query.includes('COALESCE')) {
                    // update_profile: params = [name, photo, description, number, userId]
                    data.username = params[0];
                    data.profile_pic = params[1] || '';
                    data.status = params[2] || '';
                    // COALESCE: solo setear phone_number si se proporciona
                    if (params[3]) data.phone_number = params[3];
                } else {
                    // Fallback UPDATE genérico
                    console.warn('[Firebase] UPDATE genérico:', query, params);
                    if (params.length >= 1) data.username = params[0];
                    if (params.length >= 2) data.phone_number = params[1];
                    if (params.length >= 3) data.role = params[2];
                }

                // Limpiar undefined para no romper Firestore
                Object.keys(data).forEach(key => {
                    if (data[key] === undefined || data[key] === null) {
                        data[key] = '';
                    }
                });

                console.log(`[Firebase] SET users/${id}:`, JSON.stringify(data));
                await db.collection('users').doc(String(id)).set(data, { merge: true });
                return;
            }

            // ------ UPLOADS ------
            if (query.includes('INSERT INTO uploads')) {
                const [id, file_name, total_size, status] = params;
                await db.collection('uploads').doc(String(id)).set({
                    file_name, total_size, current_size: 0, status: status || 'uploading',
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });
                return;
            }

            if (query.includes('UPDATE uploads SET')) {
                if (query.includes('current_size = current_size + ?')) {
                    const increment = params[0];
                    const id = params[1];
                    if (id) {
                        await db.collection('uploads').doc(String(id)).update({
                            current_size: admin.firestore.FieldValue.increment(increment)
                        });
                    }
                } else if (query.includes('status = ?')) {
                    if (params[1]) {
                        await db.collection('uploads').doc(String(params[1])).update({ status: params[0] });
                    }
                }
                return;
            }

            // ------ MENSAJES ------
            if (query.includes('INSERT INTO messages')) {
                const [id, sender_id, receiver_id, content, type, file_path, file_name, file_size] = params;
                await db.collection('messages').doc(String(id)).set({
                    sender_id: sender_id || '',
                    receiver_id: receiver_id || '',
                    content: content || '',
                    type: type || 'text',
                    file_path: file_path || null,
                    file_name: file_name || null,
                    file_size: file_size || null,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });
                return;
            }

            // ------ ESTADOS ------
            if (query.includes('INSERT INTO statuses')) {
                const [id, user_id, content, type] = params;
                await db.collection('statuses').doc(String(id)).set({
                    user_id, content, type,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });
                return;
            }

            // ------ DELETES ------
            if (query.includes('DELETE FROM users WHERE id = ?')) {
                if (params[0]) await db.collection('users').doc(String(params[0])).delete();
                return;
            }

            if (query.includes('DELETE FROM users WHERE phone_number = ?')) {
                if (params[0]) {
                    const snap = await db.collection('users').where('phone_number', '==', params[0]).get();
                    if (!snap.empty) {
                        const batch = db.batch();
                        snap.forEach(doc => batch.delete(doc.ref));
                        await batch.commit();
                    }
                }
                return;
            }

            if (query.includes('DELETE FROM messages WHERE sender_id = ?')) {
                const userId = params[0];
                if (userId) {
                    const snap1 = await db.collection('messages').where('sender_id', '==', userId).get();
                    const snap2 = await db.collection('messages').where('receiver_id', '==', userId).get();
                    if (!snap1.empty || !snap2.empty) {
                        const batch = db.batch();
                        snap1.forEach(doc => batch.delete(doc.ref));
                        snap2.forEach(doc => batch.delete(doc.ref));
                        await batch.commit();
                    }
                }
                return;
            }

            if (query.includes('DELETE FROM statuses WHERE') && query.includes('user_id = ?')) {
                if (params[0]) {
                    const snap = await db.collection('statuses').where('user_id', '==', params[0]).get();
                    if (!snap.empty) {
                        const batch = db.batch();
                        snap.forEach(doc => batch.delete(doc.ref));
                        await batch.commit();
                    }
                }
                return;
            }

            if (query.includes('DELETE FROM statuses WHERE id = ?')) {
                if (params[0]) await db.collection('statuses').doc(String(params[0])).delete();
                return;
            }

            // ------ DELETED_IDS ------
            if (query.includes('deleted_ids')) {
                if (params[0]) {
                    await db.collection('deleted_ids').doc(String(params[0])).set({
                        timestamp: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
                return;
            }

            console.warn(`[Firebase] run() sin handler: ${query}`);

        } catch (err) {
            console.error(`[Firebase Error] run() falló:`, err.message, '| Query:', query, '| Params:', params);
        }
    },

    // ==========================================
    // CLEAN BANNED - Limpia usuarios baneados
    // ==========================================
    cleanBanned: async () => {
        if (!db) return;
        try {
            for (const name of BANNED_NAMES) {
                const snap = await db.collection('users').where('username', '==', name).get();
                if (!snap.empty) {
                    const batch = db.batch();
                    snap.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                }
            }
            for (const num of BANNED_NUMBERS) {
                const snap = await db.collection('users').where('phone_number', '==', num).get();
                if (!snap.empty) {
                    const batch = db.batch();
                    snap.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                }
            }
        } catch (err) {
            console.error('[Firebase Error] cleanBanned falló:', err.message);
        }
    }
};

module.exports = { admin, db, firebaseDb };
