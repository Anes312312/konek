const admin = require('firebase-admin');

let db = null;

// ===== INICIALIZACIÓN =====
if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({ credential: admin.credential.cert(sa) });
            console.log('[Firebase] ✓ Inicializado con Service Account');
        } else {
            admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'konek-fun-chat-312' });
            console.log('[Firebase] ⚠ Inicializado SIN credenciales (solo funciona en Google Cloud)');
        }
        db = admin.firestore();
    } catch (error) {
        console.error('[Firebase] ✗ Error fatal:', error.message);
    }
} else {
    db = admin.firestore();
}

// ========================================
// API DIRECTA con Firestore (sin SQL shim)
// ========================================
const firestore = {

    // ----- USUARIOS -----
    async getAllUsers() {
        if (!db) return [];
        try {
            const snap = await db.collection('users').get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) {
            console.error('[Firestore] getAllUsers error:', e.message);
            return [];
        }
    },

    async getUser(id) {
        if (!db || !id) return null;
        try {
            const doc = await db.collection('users').doc(String(id)).get();
            return doc.exists ? { id: doc.id, ...doc.data() } : null;
        } catch (e) {
            console.error('[Firestore] getUser error:', e.message);
            return null;
        }
    },

    async getUserByPhone(phone) {
        if (!db || !phone) return null;
        try {
            const snap = await db.collection('users').where('phone_number', '==', phone).limit(1).get();
            return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
        } catch (e) {
            console.error('[Firestore] getUserByPhone error:', e.message);
            return null;
        }
    },

    async getUserByPhoneExcluding(phone, excludeId) {
        if (!db || !phone) return null;
        try {
            const snap = await db.collection('users').where('phone_number', '==', phone).get();
            if (snap.empty) return null;
            const match = snap.docs.find(doc => doc.id !== excludeId);
            return match ? { id: match.id, ...match.data() } : null;
        } catch (e) {
            console.error('[Firestore] getUserByPhoneExcluding error:', e.message);
            return null;
        }
    },

    async getAdmin() {
        if (!db) return null;
        try {
            const snap = await db.collection('users').where('role', '==', 'admin').limit(1).get();
            return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
        } catch (e) {
            console.error('[Firestore] getAdmin error:', e.message);
            return null;
        }
    },

    async saveUser(id, data) {
        if (!db || !id) return;
        try {
            // Limpiar undefined/null
            const clean = {};
            Object.keys(data).forEach(k => { clean[k] = data[k] ?? ''; });
            await db.collection('users').doc(String(id)).set(clean, { merge: true });
        } catch (e) {
            console.error('[Firestore] saveUser error:', e.message);
        }
    },

    async deleteUser(id) {
        if (!db || !id) return;
        try {
            await db.collection('users').doc(String(id)).delete();
        } catch (e) {
            console.error('[Firestore] deleteUser error:', e.message);
        }
    },

    async demoteOtherAdmins(keepId) {
        if (!db || !keepId) return;
        try {
            const snap = await db.collection('users').where('role', '==', 'admin').get();
            const batch = db.batch();
            let count = 0;
            snap.forEach(doc => {
                if (doc.id !== keepId) {
                    batch.update(doc.ref, { role: 'user' });
                    count++;
                }
            });
            if (count > 0) {
                await batch.commit();
                console.log(`[Firestore] Degradados ${count} admins duplicados`);
            }
        } catch (e) {
            console.error('[Firestore] demoteOtherAdmins error:', e.message);
        }
    },

    // ----- MENSAJES -----
    async getPrivateMessages(userId1, userId2) {
        if (!db) return [];
        try {
            const snap = await db.collection('messages').orderBy('timestamp', 'asc').get();
            return snap.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(m =>
                    (m.sender_id === userId1 && m.receiver_id === userId2) ||
                    (m.sender_id === userId2 && m.receiver_id === userId1)
                );
        } catch (e) {
            console.error('[Firestore] getPrivateMessages error:', e.message);
            return [];
        }
    },

    async getGlobalMessages() {
        if (!db) return [];
        try {
            const snap = await db.collection('messages')
                .where('receiver_id', '==', 'global')
                .orderBy('timestamp', 'asc').get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) {
            console.error('[Firestore] getGlobalMessages error:', e.message);
            return [];
        }
    },

    async saveMessage(id, data) {
        if (!db || !id) return;
        try {
            await db.collection('messages').doc(String(id)).set({
                ...data,
                timestamp: data.timestamp || admin.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.error('[Firestore] saveMessage error:', e.message);
        }
    },

    async deleteUserMessages(userId) {
        if (!db || !userId) return;
        try {
            const snap1 = await db.collection('messages').where('sender_id', '==', userId).get();
            const snap2 = await db.collection('messages').where('receiver_id', '==', userId).get();
            if (!snap1.empty || !snap2.empty) {
                const batch = db.batch();
                snap1.forEach(doc => batch.delete(doc.ref));
                snap2.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
        } catch (e) {
            console.error('[Firestore] deleteUserMessages error:', e.message);
        }
    },

    // ----- ESTADOS -----
    async getStatuses() {
        if (!db) return [];
        try {
            const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const snap = await db.collection('statuses')
                .where('timestamp', '>', cutoff)
                .orderBy('timestamp', 'desc').get();

            const statuses = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Enriquecer con datos de usuario
            const userIds = [...new Set(statuses.map(s => s.user_id))];
            const userMap = {};
            for (const uid of userIds) {
                const u = await this.getUser(uid);
                if (u) userMap[uid] = u;
            }

            return statuses.map(s => ({
                ...s,
                username: userMap[s.user_id]?.username || 'Usuario',
                profile_pic: userMap[s.user_id]?.profile_pic || ''
            }));
        } catch (e) {
            console.error('[Firestore] getStatuses error:', e.message);
            return [];
        }
    },

    async saveStatus(id, data) {
        if (!db || !id) return;
        try {
            await db.collection('statuses').doc(String(id)).set({
                ...data,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.error('[Firestore] saveStatus error:', e.message);
        }
    },

    async deleteStatus(id) {
        if (!db || !id) return;
        try {
            await db.collection('statuses').doc(String(id)).delete();
        } catch (e) {
            console.error('[Firestore] deleteStatus error:', e.message);
        }
    },

    async deleteUserStatuses(userId) {
        if (!db || !userId) return;
        try {
            const snap = await db.collection('statuses').where('user_id', '==', userId).get();
            if (!snap.empty) {
                const batch = db.batch();
                snap.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
        } catch (e) {
            console.error('[Firestore] deleteUserStatuses error:', e.message);
        }
    },

    // ----- DELETED IDS -----
    async isDeleted(id) {
        if (!db || !id) return false;
        try {
            const doc = await db.collection('deleted_ids').doc(String(id)).get();
            return doc.exists;
        } catch (e) {
            return false;
        }
    },

    async markDeleted(id) {
        if (!db || !id) return;
        try {
            await db.collection('deleted_ids').doc(String(id)).set({
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.error('[Firestore] markDeleted error:', e.message);
        }
    },

    // ----- UPLOADS -----
    async initUpload(id, fileName, totalSize) {
        if (!db || !id) return;
        try {
            await db.collection('uploads').doc(String(id)).set({
                file_name: fileName, total_size: totalSize, current_size: 0,
                status: 'uploading', timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.error('[Firestore] initUpload error:', e.message);
        }
    },

    async addChunkSize(id, chunkSize) {
        if (!db || !id) return;
        try {
            await db.collection('uploads').doc(String(id)).update({
                current_size: admin.firestore.FieldValue.increment(chunkSize)
            });
        } catch (e) {
            console.error('[Firestore] addChunkSize error:', e.message);
        }
    },

    async getUpload(id) {
        if (!db || !id) return null;
        try {
            const doc = await db.collection('uploads').doc(String(id)).get();
            return doc.exists ? { id: doc.id, ...doc.data() } : null;
        } catch (e) {
            return null;
        }
    },

    async completeUpload(id) {
        if (!db || !id) return;
        try {
            await db.collection('uploads').doc(String(id)).update({ status: 'completed' });
        } catch (e) {
            console.error('[Firestore] completeUpload error:', e.message);
        }
    },

    // ----- LIMPIEZA -----
    async clearAllCollections() {
        if (!db) return;
        const collections = ['users', 'messages', 'statuses', 'deleted_ids', 'uploads'];
        for (const name of collections) {
            try {
                const snap = await db.collection(name).get();
                if (!snap.empty) {
                    const batch = db.batch();
                    snap.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                    console.log(`[Cleanup] ${name}: ${snap.size} docs eliminados`);
                }
            } catch (e) {
                console.error(`[Cleanup] ${name}: error - ${e.message}`);
            }
        }
    }
};

module.exports = { admin, db, firestore };
