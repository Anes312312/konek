const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { firestore } = require('./firebase.cjs');

// ===== CONFIG =====
const ADMIN_KEY = 'konek_admin_2024';
const UPLOADS_DIR = path.join(__dirname, 'uploads');
fs.ensureDirSync(UPLOADS_DIR);

// ===== MEMORIA =====
const usersMap = new Map();        // userId -> userData (solo usuarios del chat, NO admin)
const onlineUsers = new Set();     // userIds actualmente conectados
const deletedIds = new Set();      // IDs eliminados permanentemente
const messagesList = [];           // Cache en memoria para mensajes (útil para uso local sin bd)
let statusesList = [];             // Cache en memoria para estados

// ===== EXPRESS + SOCKET.IO =====
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    maxHttpBufferSize: 50 * 1024 * 1024,
    pingTimeout: 60000,
    pingInterval: 25000
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

process.on('uncaughtException', (err) => console.error('[FATAL]', err.message));
process.on('unhandledRejection', (reason) => console.error('[UNHANDLED]', reason));

// ===== HELPERS =====
function getUsersList() {
    return Array.from(usersMap.values()).map(u => ({
        ...u,
        isOnline: onlineUsers.has(u.id)
    }));
}

function broadcastUserList() {
    const users = getUsersList();
    io.to('admins_room').emit('admin_user_list', users);
    io.emit('user_list', users);
    io.emit('online_count', onlineUsers.size);
}

// Cargar datos al iniciar
async function loadFromFirestore() {
    try {
        const users = await firestore.getAllUsers();
        users.forEach(u => {
            usersMap.set(u.id, {
                id: u.id,
                username: u.username || 'Usuario',
                profile_pic: u.profile_pic || '',
                status: u.status || '',
                phone_number: u.phone_number || '',
                role: 'user' // Todos son users, no hay admin en el chat
            });
        });
        console.log(`[Init] ${usersMap.size} usuarios cargados de Firestore`);
    } catch (e) {
        console.log('[Init] Firestore no disponible:', e.message);
    }
}

// ===== API ENDPOINTS =====
app.post('/api/upload/init', async (req, res) => {
    try {
        const { fileName, totalSize, id } = req.body;
        const fileId = id || uuidv4();
        await fs.writeFile(path.join(UPLOADS_DIR, fileId + '_' + fileName), '');
        await firestore.initUpload(fileId, fileName, totalSize);
        res.json({ fileId });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/upload/chunk', upload.single('chunk'), async (req, res) => {
    try {
        const { fileId, fileName } = req.body;
        const chunk = req.file?.buffer;
        if (!chunk || !fileId) return res.status(400).json({ error: 'Faltan datos' });
        await fs.appendFile(path.join(UPLOADS_DIR, fileId + '_' + fileName), chunk);
        await firestore.addChunkSize(fileId, chunk.length);
        const doc = await firestore.getUpload(fileId);
        if (doc && doc.current_size >= doc.total_size) await firestore.completeUpload(fileId);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/download/:fileId/:fileName', async (req, res) => {
    try {
        const fp = path.join(UPLOADS_DIR, req.params.fileId + '_' + req.params.fileName);
        if (await fs.pathExists(fp)) res.sendFile(fp);
        else res.status(404).json({ error: 'No encontrado' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Limpieza total (una vez)
let cleanupDone = false;
app.get('/api/admin/cleanup-all', async (req, res) => {
    if (cleanupDone) return res.json({ done: true, message: 'Ya limpio' });
    cleanupDone = true;
    try {
        await firestore.clearAllCollections();
        usersMap.clear();
        onlineUsers.clear();
        deletedIds.clear();
        res.json({ success: true, message: 'Limpieza completa' });
    } catch (e) {
        res.json({ error: e.message });
    }
});

// Keep-alive (Ping) endpoint para evitar que Render se duerma
app.get('/api/ping', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// SPA fallback (AL FINAL)
app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
});

// ========================================
// SOCKET.IO
// ========================================
io.on('connection', (socket) => {
    let currentUserId = null;
    let isAdmin = false;

    // ==========================================
    // ADMIN LOGIN (separado de usuarios)
    // El admin NO es un usuario del chat
    // ==========================================
    socket.on('admin_login', (data) => {
        try {
            if (!data || data.key !== ADMIN_KEY) {
                socket.emit('error', { message: 'Clave de administrador incorrecta.' });
                return;
            }
            isAdmin = true;
            socket.join('admins_room');
            socket.emit('admin_authenticated');
            socket.emit('admin_user_list', getUsersList());
            socket.emit('online_count', onlineUsers.size);
            console.log('[Admin] ✓ Panel admin conectado');
        } catch (e) {
            console.error('[Admin] login error:', e.message);
        }
    });

    // ==========================================
    // ADMIN: Obtener lista
    // ==========================================
    socket.on('admin_get_all_users', () => {
        if (!isAdmin) return;
        socket.emit('admin_user_list', getUsersList());
    });

    // ==========================================
    // ADMIN: Crear usuario
    // ==========================================
    socket.on('admin_create_user', (data) => {
        try {
            if (!isAdmin) return;
            const id = uuidv4();
            const userData = {
                id,
                username: data.username || 'Nuevo Usuario',
                phone_number: data.phone_number || '',
                role: 'user',
                profile_pic: '',
                status: ''
            };
            usersMap.set(id, userData);
            firestore.saveUser(id, userData).catch(() => { });
            console.log(`[Admin] ✓ Creado: ${userData.username}`);
            broadcastUserList();
        } catch (e) {
            console.error('[Admin] create:', e.message);
        }
    });

    // ==========================================
    // ADMIN: Actualizar usuario
    // ==========================================
    socket.on('admin_update_user', (data) => {
        try {
            if (!isAdmin || !data?.userId) return;
            const user = usersMap.get(data.userId);
            if (!user) return;
            if (data.update.username) user.username = data.update.username;
            if (data.update.phone_number !== undefined) user.phone_number = data.update.phone_number;
            if (data.update.role) user.role = data.update.role;
            usersMap.set(data.userId, user);
            firestore.saveUser(data.userId, user).catch(() => { });
            console.log(`[Admin] ✓ Actualizado: ${user.username}`);
            broadcastUserList();
        } catch (e) {
            console.error('[Admin] update:', e.message);
        }
    });

    // ==========================================
    // ADMIN: Eliminar usuario
    // ==========================================
    socket.on('admin_delete_user', async (data) => {
        try {
            if (!isAdmin || !data?.userId) return;
            const targetId = data.userId;

            usersMap.delete(targetId);
            onlineUsers.delete(targetId);
            deletedIds.add(targetId);

            firestore.deleteUser(targetId).catch(() => { });
            firestore.deleteUserMessages(targetId).catch(() => { });
            firestore.deleteUserStatuses(targetId).catch(() => { });
            firestore.markDeleted(targetId).catch(() => { });

            io.to(targetId).emit('user_deleted');
            const sockets = await io.in(targetId).fetchSockets();
            sockets.forEach(s => s.disconnect(true));

            console.log(`[Admin] ✓ Eliminado: ${targetId.substring(0, 12)}`);
            broadcastUserList();
        } catch (e) {
            console.error('[Admin] delete:', e.message);
        }
    });

    // ==========================================
    // JOIN - Solo usuarios del chat (NO admin)
    // ==========================================
    socket.on('join', async (data) => {
        try {
            const { userId, profile } = data || {};
            if (!userId || !profile) {
                socket.emit('error', { message: 'Datos inválidos' });
                return;
            }

            const existing = usersMap.get(userId);
            // Si el usuario ya existe y tiene un nombre real, preservarlo salvo que envíe uno nuevo distinto al default
            const incomingName = (profile.name || '').trim();
            const isDefaultName = !incomingName || incomingName === 'Mi Usuario' || incomingName === 'Usuario';
            const username = (isDefaultName && existing?.username && existing.username !== 'Usuario' && existing.username !== 'Mi Usuario')
                ? existing.username
                : (incomingName || existing?.username || 'Usuario');
            const phoneNumber = profile.number ? String(profile.number).trim() : '';

            // Verificar eliminado
            if (deletedIds.has(userId)) {
                socket.emit('user_deleted');
                socket.disconnect(true);
                return;
            }
            const isDeletedDb = await firestore.isDeleted(userId);
            if (isDeletedDb) {
                deletedIds.add(userId);
                socket.emit('user_deleted');
                socket.disconnect(true);
                return;
            }

            // Verificar teléfono duplicado
            if (phoneNumber) {
                const dup = Array.from(usersMap.values()).find(
                    u => u.phone_number === phoneNumber && u.id !== userId
                );
                if (dup) {
                    socket.emit('error', { message: 'Este número ya está en uso.' });
                    return;
                }
            }

            // Registrar en memoria
            currentUserId = userId;
            socket.join(userId);
            onlineUsers.add(userId);

            // existing ya fue definido arriba
            const userData = {
                id: userId,
                username: username,
                profile_pic: profile.photo || existing?.profile_pic || '',
                status: profile.description || existing?.status || '',
                phone_number: phoneNumber || existing?.phone_number || '',
                role: 'user' // SIEMPRE user, nunca admin
            };
            usersMap.set(userId, userData);

            // Sync a Firestore (async)
            firestore.saveUser(userId, {
                username: userData.username,
                profile_pic: userData.profile_pic,
                status: userData.status,
                phone_number: userData.phone_number,
                role: 'user'
            }).catch(() => { });

            console.log(`[Join] ✓ ${userData.username} (${userId.substring(0, 10)})`);
            socket.emit('login_success', { ...userData, role: 'user' });

            broadcastUserList();
        } catch (e) {
            console.error('[Join] ✗', e.message);
            socket.emit('error', { message: 'Error al conectar.' });
        }
    });

    // ==========================================
    // CHAT
    // ==========================================
    socket.on('send_message', async (data) => {
        try {
            const senderId = data.senderId || data.sender_id;
            if (!senderId) return;
            const msgId = data.id || uuidv4();
            const receiverId = data.receiverId || data.receiver_id || 'global';

            const msg = {
                sender_id: senderId,
                receiver_id: receiverId,
                content: data.content || '',
                message_type: data.message_type || data.type || 'text',
                file_name: data.file_name || data?.file_info?.name || '',
                file_url: data.file_url || data?.file_info?.path || '',
                read: false
            };
            firestore.saveMessage(msgId, msg).catch(() => { });
            const emit = {
                id: msgId,
                read: false,
                ...msg,
                timestamp: new Date().toISOString(),
                type: msg.message_type,
                file_info: data.file_info,
                gameType: data.gameType,
                gameData: data.gameData
            };

            const senderData = usersMap.get(senderId);
            if (senderData) {
                emit.sender_name = senderData.username;
                emit.sender_pic = senderData.profile_pic;
                emit.sender_phone = senderData.phone_number;
            }

            messagesList.push(emit);

            if (msg.receiver_id === 'global') {
                io.emit('receive_message', emit);
            } else {
                // Emite al que envía para que se actualice si tiene múltiples clientes
                socket.emit('receive_message', emit);
                // Emite al que recibe
                io.to(receiverId).emit('receive_message', emit);
            }
        } catch (e) {
            console.error('[Chat]', e.message);
        }
    });

    socket.on('game_action', async (updatedMsg) => {
        try {
            const receiverId = updatedMsg.receiver_id === 'global' ? 'global' : updatedMsg.receiver_id;
            const existingIdx = messagesList.findIndex(m => m.id === updatedMsg.id);
            if (existingIdx !== -1) {
                messagesList[existingIdx] = updatedMsg;
            }

            // Optional: You could update `game_stats` in Firebase if you detect `updatedMsg.gameData.state === "finished"` and there is a `winner`
            if (updatedMsg.gameData && updatedMsg.gameData.state === "finished" && updatedMsg.gameData.winner) {
                const winnerId = updatedMsg.gameData.winner;
                // E.g., add +3 points logic here globally
            }

            if (receiverId === 'global') {
                io.emit('receive_message', updatedMsg);
            } else {
                io.to(updatedMsg.sender_id).emit('receive_message', updatedMsg);
                io.to(receiverId).emit('receive_message', updatedMsg);
            }
        } catch (e) { console.error('[Game Action]', e.message); }
    });

    socket.on('mark_read', ({ readerId, senderId }) => {
        try {
            if (!readerId || !senderId) return;
            // Update in memory messages
            messagesList.forEach(m => {
                if (m.sender_id === senderId && m.receiver_id === readerId) {
                    m.read = true;
                }
            });
            // Update firestore 
            firestore.markMessagesRead(senderId, readerId).catch(() => { });
            // Emit to sender
            io.to(senderId).emit('messages_read', { contactId: readerId });
        } catch (e) { console.error('[mark_read]', e.message); }
    });

    socket.on('typing_start', ({ senderId, receiverId }) => {
        if (!senderId || !receiverId) return;
        io.to(receiverId).emit('typing_start', { senderId });
    });

    socket.on('typing_stop', ({ senderId, receiverId }) => {
        if (!senderId || !receiverId) return;
        io.to(receiverId).emit('typing_stop', { senderId });
    });

    socket.on('request_history', async (data) => {
        try {
            const { userId, contactId } = data || {};
            if (!userId) return;
            let msgs = [];
            if (!contactId || contactId === 'global') {
                msgs = messagesList.filter(m => m.receiver_id === 'global');
                if (msgs.length === 0) msgs = await firestore.getGlobalMessages();
            } else {
                msgs = messagesList.filter(m =>
                    (m.sender_id === userId && m.receiver_id === contactId) ||
                    (m.sender_id === contactId && m.receiver_id === userId)
                );
                if (msgs.length === 0) msgs = await firestore.getPrivateMessages(userId, contactId);
            }
            socket.emit('chat_history', { contactId, messages: msgs });
        } catch (e) {
            socket.emit('chat_history', { contactId: data?.contactId, messages: [] });
        }
    });

    socket.on('search_user', (data) => {
        try {
            console.log(`[Search] Intentando buscar número:`, data);
            const phone = data?.phoneNumber;
            if (!phone) { socket.emit('user_found', null); return; }
            const found = Array.from(usersMap.values()).find(u => u.phone_number === phone);
            console.log(`[Search] Resultado para ${phone}:`, found ? found.username : 'No encontrado');
            socket.emit('user_found', found || null);
        } catch (e) {
            console.error('[Search] Error:', e);
            socket.emit('user_found', null);
        }
    });

    // ==========================================
    // ESTADOS
    // ==========================================
    socket.on('publish_status', async (data) => {
        try {
            const id = uuidv4();
            const statusOwner = data.userId || data.user_id;

            const newStatus = {
                id,
                user_id: statusOwner,
                content: data.content || '',
                media_url: data.media_url || '',
                type: data.type || 'text',
                timestamp: new Date().toISOString()
            };
            statusesList.push(newStatus);

            firestore.saveStatus(id, newStatus).catch(() => { });

            let all = [...statusesList];
            if (all.length === 0) all = await firestore.getStatuses();

            // Re-enriquecer statuses con los nombres de usuario actualizados si se puede
            all = all.map(s => {
                const u = usersMap.get(s.user_id);
                if (u) {
                    return { ...s, username: u.username, profile_pic: u.profile_pic };
                }
                return s;
            });

            io.emit('status_update', all);
            // También enviarlo por status_list para asegurar compatibilidad
            io.emit('status_list', all);
        } catch (e) {
            console.error('[Status]', e.message);
        }
    });

    socket.on('request_statuses', async () => {
        try {
            let s = [...statusesList];
            if (s.length === 0) s = await firestore.getStatuses();

            s = s.map(status => {
                const u = usersMap.get(status.user_id);
                if (u) {
                    return { ...status, username: u.username, profile_pic: u.profile_pic };
                }
                return status;
            });

            socket.emit('status_update', s);
            socket.emit('status_list', s); // Compatibilidad
        } catch (e) {
            socket.emit('status_update', []);
            socket.emit('status_list', []);
        }
    });

    socket.on('delete_status', async (id) => {
        try {
            statusesList = statusesList.filter(s => s.id !== id);
            firestore.deleteStatus(id).catch(() => { });

            let s = [...statusesList];
            if (s.length === 0) s = await firestore.getStatuses();

            s = s.map(status => {
                const u = usersMap.get(status.user_id);
                if (u) {
                    return { ...status, username: u.username, profile_pic: u.profile_pic };
                }
                return status;
            });

            io.emit('status_update', s);
            io.emit('status_list', s);
        } catch (e) { }
    });

    // ==========================================
    // PERFIL
    // ==========================================
    socket.on('update_profile', async (data) => {
        try {
            if (!data?.userId) return;
            // El cliente envía { userId, profile: { name, photo, description, number } }
            // Soportamos ambos formatos: data.profile.X o data.X
            const p = data.profile || data;
            const user = usersMap.get(data.userId);
            const profileName = p.name ? p.name.trim() : '';
            if (user) {
                if (profileName) user.username = profileName;
                if (p.photo !== undefined) user.profile_pic = p.photo;
                if (p.description !== undefined) user.status = p.description;
                if (p.number !== undefined) user.phone_number = String(p.number);
                usersMap.set(data.userId, user);
            }
            // Solo guardar campos que tengan valor real, no sobrescribir con vacío
            const saveData = {};
            if (profileName) saveData.username = profileName;
            else if (user?.username) saveData.username = user.username;
            saveData.profile_pic = p.photo !== undefined ? (p.photo || '') : (user?.profile_pic || '');
            saveData.status = p.description !== undefined ? p.description : (user?.status || '');
            saveData.phone_number = p.number !== undefined ? String(p.number) : (user?.phone_number || '');
            firestore.saveUser(data.userId, saveData).catch(() => { });
            console.log(`[Profile] ✓ ${saveData.username || 'sin nombre'} actualizado`);
            socket.emit('profile_updated', { success: true });
            broadcastUserList();
        } catch (e) { }
    });

    // ==========================================
    // DESCONEXIÓN
    // ==========================================
    socket.on('disconnect', () => {
        if (currentUserId) {
            onlineUsers.delete(currentUserId);
            broadcastUserList();
        }
    });
});

// ===== START =====
const PORT = process.env.PORT || 5000;
async function start() {
    await loadFromFirestore();
    server.listen(PORT, () => {
        console.log(`\n🚀 Konek Fun en puerto ${PORT}`);
        console.log(`   Usuarios: ${usersMap.size}`);
        console.log(`   Admin: Panel separado (clave: ${ADMIN_KEY})\n`);

        // Sistema Auto-Ping (Mantener despierto el servidor en Render)
        // Evita la pantalla de "Service Waking Up" haciendo tráfico continuo y falso
        setInterval(() => {
            const axios = require('axios');
            axios.get('https://konek.fun/api/ping')
                .then(() => console.log('[AutoPing] Request automatica para evitar que Render se duerma OK'))
                .catch(err => console.log('[AutoPing] Fallo (normal si el dominio aun no propaga):', err.message));
        }, 10 * 60 * 1000); // Envía una petición cada 10 minutos
    });
}
start();
