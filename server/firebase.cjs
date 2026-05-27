const { setupDatabase } = require('./database.cjs');
const dbPromise = setupDatabase();

async function getDb() {
    return await dbPromise;
}

const firestore = {
    // ----- USUARIOS -----
    async getAllUsers() {
        const db = await getDb();
        try {
            return await db.all('SELECT * FROM users');
        } catch (e) {
            console.error('[SQLite] getAllUsers error:', e.message);
            return [];
        }
    },

    async getUser(id) {
        if (!id) return null;
        const db = await getDb();
        try {
            const u = await db.get('SELECT * FROM users WHERE id = ?', [String(id)]);
            return u || null;
        } catch (e) {
            console.error('[SQLite] getUser error:', e.message);
            return null;
        }
    },

    async getUserByPhone(phone) {
        if (!phone) return null;
        const db = await getDb();
        try {
            const u = await db.get('SELECT * FROM users WHERE phone_number = ?', [phone]);
            return u || null;
        } catch (e) {
            console.error('[SQLite] getUserByPhone error:', e.message);
            return null;
        }
    },

    async getUserByPhoneExcluding(phone, excludeId) {
        if (!phone) return null;
        const db = await getDb();
        try {
            const u = await db.get('SELECT * FROM users WHERE phone_number = ? AND id != ?', [phone, excludeId]);
            return u || null;
        } catch (e) {
            console.error('[SQLite] getUserByPhoneExcluding error:', e.message);
            return null;
        }
    },

    async getAdmin() {
        const db = await getDb();
        try {
            const u = await db.get("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
            return u || null;
        } catch (e) {
            console.error('[SQLite] getAdmin error:', e.message);
            return null;
        }
    },

    async saveUser(id, data) {
        if (!id) return;
        const db = await getDb();
        try {
            const existing = await this.getUser(id);
            if (existing) {
                const username = data.username !== undefined ? data.username : existing.username;
                const profile_pic = data.profile_pic !== undefined ? data.profile_pic : existing.profile_pic;
                const status = data.status !== undefined ? data.status : existing.status;
                const phone_number = data.phone_number !== undefined ? data.phone_number : existing.phone_number;
                const role = data.role !== undefined ? data.role : existing.role;
                await db.run(
                    `UPDATE users SET username = ?, profile_pic = ?, status = ?, phone_number = ?, role = ? WHERE id = ?`,
                    [username || '', profile_pic || '', status || '', phone_number || '', role || 'user', String(id)]
                );
            } else {
                await db.run(
                    `INSERT INTO users (id, username, profile_pic, status, phone_number, role) VALUES (?, ?, ?, ?, ?, ?)`,
                    [String(id), data.username || '', data.profile_pic || '', data.status || '', data.phone_number || '', data.role || 'user']
                );
            }
        } catch (e) {
            console.error('[SQLite] saveUser error:', e.message);
        }
    },

    async deleteUser(id) {
        if (!id) return;
        const db = await getDb();
        try {
            await db.run('DELETE FROM users WHERE id = ?', [String(id)]);
        } catch (e) {
            console.error('[SQLite] deleteUser error:', e.message);
        }
    },

    async demoteOtherAdmins(keepId) {
        if (!keepId) return;
        const db = await getDb();
        try {
            await db.run("UPDATE users SET role = 'user' WHERE role = 'admin' AND id != ?", [keepId]);
        } catch (e) {
            console.error('[SQLite] demoteOtherAdmins error:', e.message);
        }
    },

    // ----- MENSAJES -----
    async getPrivateMessages(userId1, userId2) {
        const db = await getDb();
        try {
            const rows = await db.all(
                `SELECT * FROM messages 
                 WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
                   AND receiver_id != 'global'
                 ORDER BY timestamp ASC`,
                [userId1, userId2, userId2, userId1]
            );
            return rows.map(r => ({
                id: r.id,
                sender_id: r.sender_id,
                receiver_id: r.receiver_id,
                content: r.content,
                message_type: r.type,
                type: r.type,
                file_name: r.file_name,
                file_url: r.file_path,
                read: !!r.read,
                deleted_for: JSON.parse(r.deleted_for || '[]'),
                is_deleted_for_all: !!r.is_deleted_for_all,
                is_forwarded: !!r.is_forwarded,
                gameType: r.game_type,
                gameData: JSON.parse(r.game_data || '{}'),
                reactions: JSON.parse(r.reactions || '[]'),
                timestamp: r.timestamp
            }));
        } catch (e) {
            console.error('[SQLite] getPrivateMessages error:', e.message);
            return [];
        }
    },

    async getAllUserMessages(userId) {
        if (!userId) return [];
        const db = await getDb();
        try {
            const rows = await db.all(
                `SELECT * FROM messages WHERE sender_id = ? OR receiver_id = ? ORDER BY timestamp ASC`,
                [userId, userId]
            );
            return rows.map(r => ({
                id: r.id,
                sender_id: r.sender_id,
                receiver_id: r.receiver_id,
                content: r.content,
                message_type: r.type,
                type: r.type,
                file_name: r.file_name,
                file_url: r.file_path,
                read: !!r.read,
                deleted_for: JSON.parse(r.deleted_for || '[]'),
                is_deleted_for_all: !!r.is_deleted_for_all,
                is_forwarded: !!r.is_forwarded,
                gameType: r.game_type,
                gameData: JSON.parse(r.game_data || '{}'),
                reactions: JSON.parse(r.reactions || '[]'),
                timestamp: r.timestamp
            }));
        } catch (e) {
            console.error('[SQLite] getAllUserMessages error:', e.message);
            return [];
        }
    },

    async getGlobalMessages() {
        const db = await getDb();
        try {
            const rows = await db.all(`SELECT * FROM messages WHERE receiver_id = 'global' ORDER BY timestamp ASC`);
            return rows.map(r => ({
                id: r.id,
                sender_id: r.sender_id,
                receiver_id: r.receiver_id,
                content: r.content,
                message_type: r.type,
                type: r.type,
                file_name: r.file_name,
                file_url: r.file_path,
                read: !!r.read,
                deleted_for: JSON.parse(r.deleted_for || '[]'),
                is_deleted_for_all: !!r.is_deleted_for_all,
                is_forwarded: !!r.is_forwarded,
                gameType: r.game_type,
                gameData: JSON.parse(r.game_data || '{}'),
                reactions: JSON.parse(r.reactions || '[]'),
                timestamp: r.timestamp
            }));
        } catch (e) {
            console.error('[SQLite] getGlobalMessages error:', e.message);
            return [];
        }
    },

    async saveMessage(id, data) {
        if (!id) return;
        const db = await getDb();
        try {
            const time = data.timestamp || new Date().toISOString();
            const readVal = data.read ? 1 : 0;
            const delVal = JSON.stringify(data.deleted_for || []);
            const delAllVal = data.is_deleted_for_all ? 1 : 0;
            const fwdVal = data.is_forwarded ? 1 : 0;
            const gameDataVal = JSON.stringify(data.gameData || {});
            const reactVal = JSON.stringify(data.reactions || []);

            const existing = await db.get('SELECT id FROM messages WHERE id = ?', [String(id)]);
            if (existing) {
                await db.run(
                    `UPDATE messages SET sender_id=?, receiver_id=?, content=?, type=?, file_path=?, file_name=?, read=?, deleted_for=?, is_deleted_for_all=?, is_forwarded=?, game_type=?, game_data=?, reactions=?, timestamp=? WHERE id=?`,
                    [data.sender_id || '', data.receiver_id || '', data.content || '', data.message_type || data.type || 'text', data.file_url || data.file_path || '', data.file_name || '', readVal, delVal, delAllVal, fwdVal, data.gameType || '', gameDataVal, reactVal, time, String(id)]
                );
            } else {
                await db.run(
                    `INSERT INTO messages (id, sender_id, receiver_id, content, type, file_path, file_name, file_size, read, deleted_for, is_deleted_for_all, is_forwarded, game_type, game_data, reactions, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [String(id), data.sender_id || '', data.receiver_id || '', data.content || '', data.message_type || data.type || 'text', data.file_url || data.file_path || '', data.file_name || '', 0, readVal, delVal, delAllVal, fwdVal, data.gameType || '', gameDataVal, reactVal, time]
                );
            }
        } catch (e) {
            console.error('[SQLite] saveMessage error:', e.message);
        }
    },

    async deleteUserMessages(userId) {
        if (!userId) return;
        const db = await getDb();
        try {
            await db.run('DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?', [userId, userId]);
        } catch (e) {
            console.error('[SQLite] deleteUserMessages error:', e.message);
        }
    },

    async markMessagesRead(senderId, receiverId) {
        const db = await getDb();
        try {
            await db.run('UPDATE messages SET read = 1 WHERE sender_id = ? AND receiver_id = ?', [senderId, receiverId]);
        } catch (e) {
            console.error('[SQLite] markMessagesRead error:', e.message);
        }
    },

    async deleteMessageLogic(messageId, userId, type, memoryObj) {
        if (!messageId) return;
        const db = await getDb();
        try {
            const m = await db.get('SELECT * FROM messages WHERE id = ?', [String(messageId)]);
            if (!m) return;
            if (type === 'me') {
                const deleted_for = JSON.parse(m.deleted_for || '[]');
                if (!deleted_for.includes(userId)) {
                    deleted_for.push(userId);
                    await db.run('UPDATE messages SET deleted_for = ? WHERE id = ?', [JSON.stringify(deleted_for), String(messageId)]);
                }
            } else if (type === 'everyone') {
                if (m.sender_id === userId) {
                    await db.run(
                        "UPDATE messages SET is_deleted_for_all = 1, content = '', file_path = '', file_name = '', type = 'text' WHERE id = ?",
                        [String(messageId)]
                    );
                }
            }
        } catch (e) {
            console.error('[SQLite] deleteMessageLogic error:', e.message);
        }
    },

    // ----- ESTADOS -----
    async getStatuses() {
        const db = await getDb();
        try {
            const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const rows = await db.all('SELECT * FROM statuses WHERE timestamp > ? ORDER BY timestamp DESC', [cutoff]);
            const statuses = rows.map(r => ({
                id: r.id,
                user_id: r.user_id,
                content: r.content,
                type: r.type,
                media_url: r.media_url,
                timestamp: r.timestamp
            }));

            // Enriquecer
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
            console.error('[SQLite] getStatuses error:', e.message);
            return [];
        }
    },

    async saveStatus(id, data) {
        if (!id) return;
        const db = await getDb();
        try {
            const time = data.timestamp || new Date().toISOString();
            await db.run(
                'INSERT OR REPLACE INTO statuses (id, user_id, content, type, media_url, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
                [String(id), data.userId || data.user_id, data.content || '', data.type || 'text', data.media_url || '', time]
            );
        } catch (e) {
            console.error('[SQLite] saveStatus error:', e.message);
        }
    },

    async deleteStatus(id) {
        if (!id) return;
        const db = await getDb();
        try {
            await db.run('DELETE FROM statuses WHERE id = ?', [String(id)]);
        } catch (e) {
            console.error('[SQLite] deleteStatus error:', e.message);
        }
    },

    async deleteUserStatuses(userId) {
        if (!userId) return;
        const db = await getDb();
        try {
            await db.run('DELETE FROM statuses WHERE user_id = ?', [userId]);
        } catch (e) {
            console.error('[SQLite] deleteUserStatuses error:', e.message);
        }
    },

    // ----- DELETED IDS -----
    async isDeleted(id) {
        if (!id) return false;
        const db = await getDb();
        try {
            const row = await db.get('SELECT id FROM deleted_ids WHERE id = ?', [String(id)]);
            return !!row;
        } catch (e) {
            return false;
        }
    },

    async markDeleted(id) {
        if (!id) return;
        const db = await getDb();
        try {
            await db.run('INSERT OR IGNORE INTO deleted_ids (id) VALUES (?)', [String(id)]);
        } catch (e) {
            console.error('[SQLite] markDeleted error:', e.message);
        }
    },

    // ----- UPLOADS -----
    async initUpload(id, fileName, totalSize) {
        if (!id) return;
        const db = await getDb();
        try {
            await db.run(
                'INSERT OR REPLACE INTO uploads (id, file_name, total_size, current_size, status) VALUES (?, ?, ?, 0, ?)',
                [String(id), fileName, totalSize, 'uploading']
            );
        } catch (e) {
            console.error('[SQLite] initUpload error:', e.message);
        }
    },

    async addChunkSize(id, chunkSize) {
        if (!id) return;
        const db = await getDb();
        try {
            await db.run('UPDATE uploads SET current_size = current_size + ? WHERE id = ?', [chunkSize, String(id)]);
        } catch (e) {
            console.error('[SQLite] addChunkSize error:', e.message);
        }
    },

    async getUpload(id) {
        if (!id) return null;
        const db = await getDb();
        try {
            return await db.get('SELECT * FROM uploads WHERE id = ?', [String(id)]);
        } catch (e) {
            return null;
        }
    },

    async completeUpload(id) {
        if (!id) return;
        const db = await getDb();
        try {
            await db.run("UPDATE uploads SET status = 'completed' WHERE id = ?", [String(id)]);
        } catch (e) {
            console.error('[SQLite] completeUpload error:', e.message);
        }
    },

    // ----- MUNDO (Global Wall) -----
    async getMundoPosts(limit = 200) {
        const db = await getDb();
        try {
            const rows = await db.all('SELECT * FROM mundo ORDER BY timestamp ASC LIMIT ?', [limit]);
            return rows.map(r => ({
                id: r.id,
                userId: r.user_id,
                displayName: r.display_name,
                anonymous: !!r.anonymous,
                text: r.text,
                image: r.image,
                type: r.type,
                fileInfo: JSON.parse(r.file_info || 'null'),
                reactions: JSON.parse(r.reactions || '[]'),
                profilePic: r.profile_pic,
                timestamp: r.timestamp
            }));
        } catch (e) {
            console.error('[SQLite] getMundoPosts error:', e.message);
            return [];
        }
    },

    async getUserMundoPosts(userId) {
        if (!userId) return [];
        const db = await getDb();
        try {
            const rows = await db.all('SELECT * FROM mundo WHERE user_id = ? ORDER BY timestamp ASC', [userId]);
            return rows.map(r => ({
                id: r.id,
                userId: r.user_id,
                displayName: r.display_name,
                anonymous: !!r.anonymous,
                text: r.text,
                image: r.image,
                type: r.type,
                fileInfo: JSON.parse(r.file_info || 'null'),
                reactions: JSON.parse(r.reactions || '[]'),
                profilePic: r.profile_pic,
                timestamp: r.timestamp
            }));
        } catch (e) {
            console.error('[SQLite] getUserMundoPosts error:', e.message);
            return [];
        }
    },

    async saveMundoPost(id, data) {
        if (!id) return;
        const db = await getDb();
        try {
            const time = data.timestamp || new Date().toISOString();
            const anon = data.anonymous ? 1 : 0;
            await db.run(
                'INSERT OR REPLACE INTO mundo (id, user_id, display_name, anonymous, text, image, type, file_info, reactions, profile_pic, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [String(id), data.userId, data.displayName, anon, data.text || '', data.image || null, data.type || 'text', JSON.stringify(data.fileInfo || null), JSON.stringify(data.reactions || []), data.profilePic || '', time]
            );
        } catch (e) {
            console.error('[SQLite] saveMundoPost error:', e.message);
        }
    },

    async clearMundo() {
        const db = await getDb();
        try {
            await db.run('DELETE FROM mundo');
        } catch (e) {
            console.error('[SQLite] clearMundo error:', e.message);
        }
    },

    // ----- LIMPIEZA -----
    async clearAllCollections() {
        const db = await getDb();
        const tables = ['users', 'messages', 'statuses', 'deleted_ids', 'uploads', 'mundo'];
        for (const name of tables) {
            try {
                await db.run(`DELETE FROM ${name}`);
            } catch (e) {
                console.error(`[SQLite Cleanup] ${name} error:`, e.message);
            }
        }
    }
};

module.exports = { admin: { apps: { length: 1 } }, db: null, firestore };
