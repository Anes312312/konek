const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { firestore } = require('./firebase.cjs');

// ===== CONFIGURACIÓN =====
const BANNED_NAMES = ['Wiskiteca-priv', 'Anes el pro'];
const BANNED_NUMBERS = ['3413017741', '341301774'];
const UPLOADS_DIR = path.join(__dirname, 'uploads');
fs.ensureDirSync(UPLOADS_DIR);

// ========================================
// IN-MEMORY USER STORE (fuente principal)
// Se sincroniza con Firestore como respaldo
// ========================================
const usersMap = new Map();       // userId -> { id, username, profile_pic, status, phone_number, role, isOnline }
const onlineUsers = new Set();
const tempDeletedIds = new Set();
const deletedIds = new Set();
let adminUserId = null;           // Solo un admin permitido

// Cargar usuarios desde Firestore al iniciar
async function loadUsersFromFirestore() {
    try {
        const users = await firestore.getAllUsers();
        users.forEach(u => {
            usersMap.set(u.id, {
                id: u.id,
                username: u.username || 'Usuario',
                profile_pic: u.profile_pic || '',
                status: u.status || '',
                phone_number: u.phone_number || '',
                role: u.role || 'user',
                isOnline: false
            });
            if (u.role === 'admin') {
                adminUserId = u.id;
            }
        });
        console.log(`[Init] Cargados ${usersMap.size} usuarios de Firestore. Admin: ${adminUserId || 'ninguno'}`);
    } catch (e) {
        console.log('[Init] No se pudo cargar Firestore:', e.message);
    }
}

function getUsersList() {
    return Array.from(usersMap.values()).map(u => ({
        ...u,
        isOnline: onlineUsers.has(u.id)
    }));
}

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

// Servir archivos estáticos
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Handlers globales de errores
process.on('uncaughtException', (err) => console.error('[FATAL]', err.message));
process.on('unhandledRejection', (reason) => console.error('[UNHANDLED]', reason));

// ===== API ENDPOINTS =====
app.post('/api/upload/init', async (req, res) => {
    try {
        const { fileName, totalSize, id } = req.body;
        const fileId = id || uuidv4();
        const filePath = path.join(UPLOADS_DIR, fileId + '_' + fileName);
        await fs.writeFile(filePath, '');
        await firestore.initUpload(fileId, fileName, totalSize);
        res.json({ fileId, filePath });
    } catch (error) {
        console.error('[API] upload/init:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/upload/chunk', upload.single('chunk'), async (req, res) => {
    try {
        const { fileId, fileName } = req.body;
        const chunk = req.file?.buffer;
        if (!chunk || !fileId) return res.status(400).json({ error: 'Faltan datos' });
        const filePath = path.join(UPLOADS_DIR, fileId + '_' + fileName);
        await fs.appendFile(filePath, chunk);
        await firestore.addChunkSize(fileId, chunk.length);
        const uploadDoc = await firestore.getUpload(fileId);
        if (uploadDoc && uploadDoc.current_size >= uploadDoc.total_size) {
            await firestore.completeUpload(fileId);
        }
        res.json({ success: true, received: chunk.length });
    } catch (error) {
        console.error('[API] upload/chunk:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/download/:fileId/:fileName', async (req, res) => {
    try {
        const filePath = path.join(UPLOADS_DIR, req.params.fileId + '_' + req.params.fileName);
        if (await fs.pathExists(filePath)) res.sendFile(filePath);
        else res.status(404).json({ error: 'No encontrado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint de limpieza TOTAL (usar una sola vez por reinicio)
let cleanupUsed = false;
app.get('/api/admin/cleanup-all', async (req, res) => {
    if (cleanupUsed) return res.json({ message: 'Ya se ejecutó la limpieza.' });
    cleanupUsed = true;
    try {
        await firestore.clearAllCollections();
        usersMap.clear();
        onlineUsers.clear();
        adminUserId = null;
        res.json({ success: true, message: 'TODO limpio. Recarga la página.' });
        console.log('[Cleanup] Limpieza total ejecutada via API');
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// SPA fallback (SIEMPRE AL FINAL de todas las rutas API)
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) return;
    res.sendFile(path.join(distPath, 'index.html'));
});

// =======================================
// BROADCAST
// =======================================
function broadcastUserList() {
    const users = getUsersList();
    io.to('admins_room').emit('admin_user_list', users);
    io.emit('user_list', users);
    io.emit('online_count', onlineUsers.size);
}

// ========================================
// SOCKET.IO
// ========================================
io.on('connection', (socket) => {
    let currentUserId = null;

    // ==========================================
    // JOIN
    // ==========================================
    socket.on('join', async (data) => {
        try {
            const { userId, profile } = data || {};
            if (!userId || !profile) {
                socket.emit('error', { message: 'Datos de conexión inválidos' });
                return;
            }

            const username = (profile.name || 'Usuario').trim();
            const phoneNumber = profile.number ? String(profile.number).trim() : '';

            // --- Verificaciones de seguridad ---
            if (BANNED_NAMES.includes(username) || BANNED_NUMBERS.includes(phoneNumber)) {
                socket.emit('error', { message: 'Esta cuenta ha sido prohibida.' });
                socket.disconnect(true);
                return;
            }

            if (tempDeletedIds.has(userId) || deletedIds.has(userId)) {
                socket.emit('error', { message: 'Esta cuenta fue eliminada.' });
                socket.emit('user_deleted');
                socket.disconnect(true);
                return;
            }

            // Verificar en Firestore también
            const isDeletedInDb = await firestore.isDeleted(userId);
            if (isDeletedInDb) {
                deletedIds.add(userId);
                socket.emit('error', { message: 'Esta cuenta fue eliminada permanentemente.' });
                socket.emit('user_deleted');
                socket.disconnect(true);
                return;
            }

            // Verificar número duplicado
            if (phoneNumber) {
                const duplicate = Array.from(usersMap.values()).find(
                    u => u.phone_number === phoneNumber && u.id !== userId
                );
                if (duplicate) {
                    socket.emit('error', { message: 'Este número ya está en uso por otro usuario.' });
                    return;
                }
            }

            // --- Determinar rol ---
            let role = 'user';
            const existingUser = usersMap.get(userId);

            if (existingUser) {
                role = existingUser.role || 'user';
            }

            if (username === 'Admin') {
                if (!adminUserId || adminUserId === userId) {
                    role = 'admin';
                    adminUserId = userId;
                } else {
                    console.log(`[Join] Admin ya existe (${adminUserId}), ${userId} será user`);
                    role = 'user';
                }
            }

            // --- Guardar en memoria ---
            const userData = {
                id: userId,
                username: username,
                profile_pic: profile.photo || existingUser?.profile_pic || '',
                status: profile.description || existingUser?.status || '',
                phone_number: phoneNumber || existingUser?.phone_number || '',
                role: role,
                isOnline: true
            };
            usersMap.set(userId, userData);

            // --- Registrar conexión ---
            currentUserId = userId;
            socket.join(userId);
            onlineUsers.add(userId);

            // --- Sincronizar a Firestore (async, no bloquea) ---
            firestore.saveUser(userId, {
                username: userData.username,
                profile_pic: userData.profile_pic,
                status: userData.status,
                phone_number: userData.phone_number,
                role: userData.role
            }).catch(e => console.error('[Firestore Sync] saveUser:', e.message));

            // --- Responder al cliente ---
            console.log(`[Join] ✓ ${userData.username} (${userId.substring(0, 12)}) rol=${role}`);
            socket.emit('login_success', userData);

            // --- Config admin ---
            if (role === 'admin') {
                socket.join('admins_room');

                // Limpiar admins duplicados en memoria
                usersMap.forEach((u, id) => {
                    if (id !== userId && u.role === 'admin') {
                        u.role = 'user';
                        firestore.saveUser(id, { role: 'user' }).catch(() => { });
                    }
                });

                // Enviar lista al admin inmediatamente
                socket.emit('admin_user_list', getUsersList());
                console.log(`[Admin] ✓ Lista enviada: ${usersMap.size} usuarios`);
            }

            // --- Broadcast a todos ---
            broadcastUserList();

        } catch (error) {
            console.error('[Join] ✗ Error:', error.message);
            socket.emit('error', { message: `Error al conectar: ${error.message}` });
        }
    });

    // ==========================================
    // ADMIN: Obtener lista
    // ==========================================
    socket.on('admin_get_all_users', async (adminId) => {
        try {
            if (!adminId) return;
            const admin = usersMap.get(adminId);
            if (!admin || admin.role !== 'admin') {
                socket.emit('error', { message: 'Sin permisos de administrador.' });
                return;
            }
            socket.emit('admin_user_list', getUsersList());
            console.log(`[Admin] Lista solicitada: ${usersMap.size} usuarios`);
        } catch (error) {
            console.error('[Admin] get_all error:', error.message);
        }
    });

    // ==========================================
    // ADMIN: Crear usuario
    // ==========================================
    socket.on('admin_create_user', async (data) => {
        try {
            const { adminId, newUser } = data || {};
            if (!adminId || !newUser) return;

            const admin = usersMap.get(adminId);
            if (!admin || admin.role !== 'admin') {
                socket.emit('error', { message: 'Sin permisos.' });
                return;
            }

            const id = newUser.id || uuidv4();
            const userData = {
                id: id,
                username: newUser.username || 'Nuevo Usuario',
                phone_number: newUser.phone_number || '',
                role: newUser.role || 'user',
                profile_pic: '',
                status: '',
                isOnline: false
            };

            usersMap.set(id, userData);
            firestore.saveUser(id, userData).catch(e => console.error('[Sync]', e.message));

            console.log(`[Admin] ✓ Creado: ${userData.username} (${id.substring(0, 12)})`);
            broadcastUserList();
        } catch (error) {
            console.error('[Admin] create error:', error.message);
        }
    });

    // ==========================================
    // ADMIN: Actualizar usuario
    // ==========================================
    socket.on('admin_update_user', async (data) => {
        try {
            const { adminId, userId, update } = data || {};
            if (!adminId || !userId || !update) return;

            const admin = usersMap.get(adminId);
            if (!admin || admin.role !== 'admin') {
                socket.emit('error', { message: 'Sin permisos.' });
                return;
            }

            const existing = usersMap.get(userId);
            if (!existing) {
                socket.emit('error', { message: 'Usuario no encontrado.' });
                return;
            }

            existing.username = update.username || existing.username;
            existing.phone_number = update.phone_number || existing.phone_number;
            existing.role = update.role || existing.role;
            usersMap.set(userId, existing);

            firestore.saveUser(userId, {
                username: existing.username,
                phone_number: existing.phone_number,
                role: existing.role
            }).catch(e => console.error('[Sync]', e.message));

            console.log(`[Admin] ✓ Actualizado: ${existing.username}`);
            broadcastUserList();
        } catch (error) {
            console.error('[Admin] update error:', error.message);
        }
    });

    // ==========================================
    // ADMIN: Eliminar usuario
    // ==========================================
    socket.on('admin_delete_user', async (data) => {
        try {
            const { adminId, userId: targetId } = data || {};
            if (!adminId || !targetId) return;

            const admin = usersMap.get(adminId);
            if (!admin || admin.role !== 'admin') {
                socket.emit('error', { message: 'Sin permisos.' });
                return;
            }

            if (targetId === adminId) {
                socket.emit('error', { message: 'No puedes eliminarte a ti mismo.' });
                return;
            }

            // Eliminar de memoria
            usersMap.delete(targetId);
            onlineUsers.delete(targetId);
            deletedIds.add(targetId);
            tempDeletedIds.add(targetId);
            setTimeout(() => tempDeletedIds.delete(targetId), 60000);

            // Eliminar de Firestore (async)
            firestore.deleteUser(targetId).catch(() => { });
            firestore.deleteUserMessages(targetId).catch(() => { });
            firestore.deleteUserStatuses(targetId).catch(() => { });
            firestore.markDeleted(targetId).catch(() => { });

            // Forzar desconexión
            io.to(targetId).emit('user_deleted');
            const sockets = await io.in(targetId).fetchSockets();
            sockets.forEach(s => s.disconnect(true));

            console.log(`[Admin] ✓ Eliminado: ${targetId.substring(0, 12)}`);
            broadcastUserList();
        } catch (error) {
            console.error('[Admin] delete error:', error.message);
        }
    });

    // ==========================================
    // CHAT: Enviar mensaje
    // ==========================================
    socket.on('send_message', async (data) => {
        try {
            if (!data?.senderId) return;
            const msgId = data.id || uuidv4();
            const message = {
                sender_id: data.senderId,
                receiver_id: data.receiverId || 'global',
                content: data.content || '',
                message_type: data.message_type || 'text',
                file_name: data.file_name || '',
                file_url: data.file_url || ''
            };

            firestore.saveMessage(msgId, message).catch(e => console.error('[Msg Sync]', e.message));

            const msgToEmit = { id: msgId, ...message, timestamp: new Date().toISOString() };

            if (message.receiver_id === 'global') {
                io.emit('receive_message', msgToEmit);
            } else {
                socket.emit('receive_message', msgToEmit);
                io.to(message.receiver_id).emit('receive_message', msgToEmit);
            }
        } catch (error) {
            console.error('[Chat] send error:', error.message);
        }
    });

    // ==========================================
    // CHAT: Historial
    // ==========================================
    socket.on('request_history', async (data) => {
        try {
            const { userId, contactId } = data || {};
            if (!userId) return;
            let messages = [];
            if (!contactId || contactId === 'global') {
                messages = await firestore.getGlobalMessages();
            } else {
                messages = await firestore.getPrivateMessages(userId, contactId);
            }
            socket.emit('chat_history', { contactId, messages });
        } catch (error) {
            console.error('[Chat] history error:', error.message);
            socket.emit('chat_history', { contactId: data?.contactId, messages: [] });
        }
    });

    // ==========================================
    // CHAT: Buscar usuario
    // ==========================================
    socket.on('search_user', async (data) => {
        try {
            const { phoneNumber } = data || {};
            if (!phoneNumber) { socket.emit('user_found', null); return; }

            // Buscar primero en memoria
            const found = Array.from(usersMap.values()).find(u => u.phone_number === phoneNumber);
            if (found) {
                socket.emit('user_found', found);
            } else {
                // Fallback a Firestore
                const user = await firestore.getUserByPhone(phoneNumber);
                socket.emit('user_found', user || null);
            }
        } catch (error) {
            console.error('[Chat] search error:', error.message);
            socket.emit('user_found', null);
        }
    });

    // ==========================================
    // ESTADOS
    // ==========================================
    socket.on('publish_status', async (data) => {
        try {
            const statusId = uuidv4();
            await firestore.saveStatus(statusId, {
                user_id: data.userId,
                content: data.content || '',
                media_url: data.media_url || '',
                type: data.type || 'text'
            });
            const allStatuses = await firestore.getStatuses();
            io.emit('status_update', allStatuses);
        } catch (error) {
            console.error('[Status] publish:', error.message);
        }
    });

    socket.on('request_statuses', async () => {
        try {
            const statuses = await firestore.getStatuses();
            socket.emit('status_update', statuses);
        } catch (error) {
            socket.emit('status_update', []);
        }
    });

    socket.on('delete_status', async (statusId) => {
        try {
            await firestore.deleteStatus(statusId);
            const statuses = await firestore.getStatuses();
            io.emit('status_update', statuses);
        } catch (error) {
            console.error('[Status] delete:', error.message);
        }
    });

    // ==========================================
    // PERFIL
    // ==========================================
    socket.on('update_profile', async (data) => {
        try {
            if (!data?.userId) return;
            const existing = usersMap.get(data.userId);
            if (existing) {
                existing.username = data.name || existing.username;
                existing.profile_pic = data.photo || existing.profile_pic;
                existing.status = data.description || existing.status;
                existing.phone_number = data.number || existing.phone_number;
                usersMap.set(data.userId, existing);
            }
            firestore.saveUser(data.userId, {
                username: data.name || '',
                profile_pic: data.photo || '',
                status: data.description || '',
                phone_number: data.number || ''
            }).catch(() => { });
            socket.emit('profile_updated', { success: true });
            broadcastUserList();
        } catch (error) {
            console.error('[Profile] update:', error.message);
        }
    });

    // ==========================================
    // ADMIN: Limpieza total
    // ==========================================
    socket.on('admin_cleanup', async (adminId) => {
        try {
            const admin = usersMap.get(adminId);
            if (!admin || admin.role !== 'admin') return;

            // Limpiar memoria (mantener solo admin)
            const adminData = usersMap.get(adminId);
            usersMap.clear();
            if (adminData) usersMap.set(adminId, adminData);

            await firestore.clearAllCollections();
            if (adminData) {
                await firestore.saveUser(adminId, adminData);
            }

            broadcastUserList();
            console.log('[Admin] ✓ Limpieza completa');
        } catch (error) {
            console.error('[Admin] cleanup:', error.message);
        }
    });

    // ==========================================
    // DESCONEXIÓN
    // ==========================================
    socket.on('disconnect', () => {
        if (currentUserId) {
            onlineUsers.delete(currentUserId);
            const user = usersMap.get(currentUserId);
            if (user) user.isOnline = false;
            broadcastUserList();
            console.log(`[Disconnect] ${currentUserId.substring(0, 12)} (${onlineUsers.size} online)`);
        }
    });
});

// ===== INICIAR SERVIDOR =====
const PORT = process.env.PORT || 5000;

async function start() {
    await loadUsersFromFirestore();
    server.listen(PORT, () => {
        console.log(`\n🚀 Konek Fun en puerto ${PORT}`);
        console.log(`   Usuarios en memoria: ${usersMap.size}`);
        console.log(`   Admin: ${adminUserId || 'se creará al conectar'}\n`);
    });
}

start();
