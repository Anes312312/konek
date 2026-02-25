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
        // Esta es una implementación simplificada para mantener compatibilidad con el resto del código
        // Firestore no usa SQL, así que mapeamos las consultas más usadas
        if (query.includes('FROM users')) {
            let userQuery = db.collection('users');
            if (query.includes('NOT IN (SELECT id FROM deleted_ids)')) {
                // Obtenemos los eliminados primero
                const deletedSnap = await db.collection('deleted_ids').get();
                const deletedIds = deletedSnap.docs.map(doc => doc.id);

                const snap = await db.collection('users').get();
                let users = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Filtramos manualmente para cumplir con las reglas estrictas de bloqueo
                const BANNED_NAMES = ['pelotudo', 'Anes'];
                const BANNED_NUMBERS = ['12345', '312'];

                return users.filter(u =>
                    !deletedIds.includes(u.id) &&
                    !BANNED_NAMES.includes(u.username) &&
                    !BANNED_NUMBERS.includes(u.phone_number)
                );
            }
            const snap = await userQuery.get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        if (query.includes('FROM messages')) {
            // Simplificado para historial
            const snap = await db.collection('messages').orderBy('timestamp', 'asc').get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        if (query.includes('FROM statuses')) {
            const snap = await db.collection('statuses').orderBy('timestamp', 'desc').get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        return [];
    },

    get: async (query, params = []) => {
        if (!db) return null;
        if (query.includes('FROM users WHERE id = ?') || query.includes('FROM users WHERE phone_number = ?')) {
            const val = params[0];
            const field = query.includes('id = ?') ? admin.firestore.FieldPath.documentId() : 'phone_number';
            const snap = await db.collection('users').where(field, '==', val).limit(1).get();
            if (snap.empty) return null;
            return { id: snap.docs[0].id, ...snap.docs[0].data() };
        }

        if (query.includes('FROM deleted_ids WHERE id = ?')) {
            const snap = await db.collection('deleted_ids').doc(params[0]).get();
            return snap.exists ? { id: snap.id } : null;
        }

        return null;
    },

    run: async (query, params = []) => {
        if (!db) return;
        // Mapeo de operaciones de escritura frecuentes
        if (query.includes('INSERT INTO users') || query.includes('ON CONFLICT(id) DO UPDATE')) {
            const [id, username, profile_pic, status, phone_number, role] = params;
            await db.collection('users').doc(id).set({
                username, profile_pic, status, phone_number, role
            }, { merge: true });
            return;
        }

        if (query.includes('UPDATE users SET username = ?, phone_number = ?, role = ? WHERE id = ?')) {
            const [username, phone_number, role, id] = params;
            await db.collection('users').doc(id).update({ username, phone_number, role });
            return;
        }

        if (query.includes('DELETE FROM users WHERE id = ?')) {
            await db.collection('users').doc(params[0]).delete();
            return;
        }

        if (query.includes('INSERT OR IGNORE INTO deleted_ids (id) VALUES (?)')) {
            await db.collection('deleted_ids').doc(params[0]).set({ timestamp: admin.firestore.FieldValue.serverTimestamp() });
            return;
        }

        if (query.includes('INSERT INTO messages')) {
            const [id, sender_id, receiver_id, content, type, file_path, file_name, file_size] = params;
            await db.collection('messages').doc(id).set({
                sender_id, receiver_id, content, type, file_path, file_name, file_size,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            return;
        }

        if (query.includes('INSERT INTO statuses')) {
            const [id, user_id, content, type] = params;
            await db.collection('statuses').doc(id).set({
                user_id, content, type,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            return;
        }

    },

    // Función especial para limpiezas masivas
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
