const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { firestore } = require('./firebase.cjs');

// ===== VARIABLES GLOBALES =====
const BANNED_NAMES = ['Wiskiteca-priv', 'Anes el pro'];
const BANNED_NUMBERS = ['3413017741', '341301774'];
const onlineUsers = new Set();
const tempDeletedIds = new Set();
const UPLOADS_DIR = path.join(__dirname, 'uploads');
fs.ensureDirSync(UPLOADS_DIR);

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

// ===== SERVIR ARCHIVOS ESTÁTICOS =====
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// ===== HANDLERS GLOBALES DE ERRORES =====
process.on('uncaughtException', (err) => console.error('[FATAL]', err.message));
process.on('unhandledRejection', (reason) => console.error('[UNHANDLED]', reason));

// ===== API ENDPOINTS =====

// -- Upload Init
app.post('/api/upload/init', async (req, res) => {
    try {
        const { fileName, totalSize, id } = req.body;
        const fileId = id || uuidv4();
        const filePath = path.join(UPLOADS_DIR, fileId + '_' + fileName);
        await fs.writeFile(filePath, '');
        await firestore.initUpload(fileId, fileName, totalSize);
        res.json({ fileId, filePath });
    } catch (error) {
        console.error('[API] upload/init error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// -- Upload Chunk
app.post('/api/upload/chunk', upload.single('chunk'), async (req, res) => {
    try {
        const { fileId, fileName } = req.body;
        const chunk = req.file?.buffer;
        if (!chunk || !fileId) return res.status(400).json({ error: 'Faltan datos' });

        const filePath = path.join(UPLOADS_DIR, fileId + '_' + fileName);
        await fs.appendFile(filePath, chunk);
        await firestore.addChunkSize(fileId, chunk.length);

        const upload = await firestore.getUpload(fileId);
        if (upload && upload.current_size >= upload.total_size) {
            await firestore.completeUpload(fileId);
        }

        res.json({ success: true, received: chunk.length });
    } catch (error) {
        console.error('[API] upload/chunk error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// -- Download
app.get('/api/download/:fileId/:fileName', async (req, res) => {
    try {
        const filePath = path.join(UPLOADS_DIR, req.params.fileId + '_' + req.params.fileName);
        if (await fs.pathExists(filePath)) {
            res.sendFile(filePath);
        } else {
            res.status(404).json({ error: 'Archivo no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// -- SPA fallback (DESPUÉS de API routes)
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) return;
    res.sendFile(path.join(distPath, 'index.html'));
});

// =======================================
// FUNCIÓN: BROADCAST LISTA DE USUARIOS
// =======================================
async function broadcastUserList() {
    try {
        const users = await firestore.getAllUsers();
        const usersWithStatus = users.map(u => ({
            ...u,
            role: u.role || 'user',
            isOnline: onlineUsers.has(u.id)
        }));

        io.to('admins_room').emit('admin_user_list', usersWithStatus);
        io.emit('user_list', usersWithStatus);
        io.emit('online_count', onlineUsers.size);
        console.log(`[Broadcast] ${usersWithStatus.length} usuarios, ${onlineUsers.size} online`);
    } catch (error) {
        console.error('[Broadcast] Error:', error.message);
    }
}

// ========================================
// SOCKET.IO - CONEXIONES
// ========================================
io.on('connection', (socket) => {
    let currentUserId = null;

    // ==========================================
    // JOIN - Conexión de usuario
    // ==========================================
    socket.on('join', async (data) => {
        let step = 'inicio';
        try {
            const { userId, profile } = data;
            if (!userId || !profile) {
                socket.emit('error', { message: 'Datos de conexión inválidos' });
                return;
            }

            step = 'datos';
            const phoneNumber = profile.number ? String(profile.number).trim() : '';
            const username = profile.name || 'Usuario';

            // Verificar baneados
            if (BANNED_NAMES.includes(username) || BANNED_NUMBERS.includes(phoneNumber)) {
                socket.emit('error', { message: 'Esta cuenta ha sido prohibida.' });
                socket.disconnect(true);
                return;
            }

            // Verificar si fue eliminado permanentemente
            step = 'verificar eliminado';
            if (tempDeletedIds.has(userId)) {
                socket.emit('error', { message: 'Esta cuenta ha sido desactivada.' });
                socket.emit('user_deleted');
                socket.disconnect(true);
                return;
            }
            const isDeleted = await firestore.isDeleted(userId);
            if (isDeleted) {
                socket.emit('error', { message: 'Esta cuenta fue eliminada permanentemente.' });
                socket.emit('user_deleted');
                socket.disconnect(true);
                return;
            }

            // Verificar número duplicado
            step = 'verificar duplicado';
            if (phoneNumber) {
                const duplicate = await firestore.getUserByPhoneExcluding(phoneNumber, userId);
                if (duplicate) {
                    socket.emit('error', { message: 'Este número ya está en uso por otro usuario.' });
                    return;
                }
            }

            // Registrar online
            currentUserId = userId;
            socket.join(userId);
            onlineUsers.add(userId);

            // Determinar rol
            step = 'determinar rol';
            const existingUser = await firestore.getUser(userId);
            let role = existingUser?.role || 'user';

            // Solo asignar admin si el nombre es exactamente 'Admin'
            if (username === 'Admin') {
                const currentAdmin = await firestore.getAdmin();
                if (!currentAdmin || currentAdmin.id === userId) {
                    role = 'admin';
                } else {
                    // Ya hay un admin diferente - no asignar
                    console.log(`[Join] Ya existe admin ${currentAdmin.id}, ${userId} será user`);
                    role = 'user';
                }
            }

            // Guardar usuario
            step = 'guardar';
            await firestore.saveUser(userId, {
                username: username,
                profile_pic: profile.photo || '',
                status: profile.description || '',
                phone_number: phoneNumber,
                role: role
            });

            // Leer usuario guardado
            step = 'leer guardado';
            const savedUser = await firestore.getUser(userId);
            const userResponse = savedUser || { id: userId, username, role };

            console.log(`[Join] ✓ ${userResponse.username} (${userId.substring(0, 8)}...) rol=${userResponse.role}`);
            socket.emit('login_success', userResponse);

            // Config admin
            if (userResponse.role === 'admin') {
                socket.join('admins_room');
                console.log(`[Admin] ✓ Suscrito a admins_room`);

                // Limpiar admins duplicados
                await firestore.demoteOtherAdmins(userId);

                // Enviar lista inmediatamente al admin
                const allUsers = await firestore.getAllUsers();
                const usersWithStatus = allUsers.map(u => ({
                    ...u,
                    role: u.role || 'user',
                    isOnline: onlineUsers.has(u.id)
                }));
                socket.emit('admin_user_list', usersWithStatus);
            }

            await broadcastUserList();

        } catch (error) {
            console.error(`[Join] ✗ paso="${step}":`, error.message);
            socket.emit('error', { message: `Error al conectar (${step}): ${error.message}` });
        }
    });

    // ==========================================
    // ADMIN: Obtener lista de usuarios
    // ==========================================
    socket.on('admin_get_all_users', async (adminId) => {
        try {
            if (!adminId) return;
            const admin = await firestore.getUser(adminId);
            if (!admin || admin.role !== 'admin') {
                socket.emit('error', { message: 'No tienes permisos de administrador.' });
                return;
            }
            const allUsers = await firestore.getAllUsers();
            const usersWithStatus = allUsers.map(u => ({
                ...u,
                role: u.role || 'user',
                isOnline: onlineUsers.has(u.id)
            }));
            socket.emit('admin_user_list', usersWithStatus);
            console.log(`[Admin] Lista solicitada: ${usersWithStatus.length} usuarios`);
        } catch (error) {
            console.error('[Admin] admin_get_all_users error:', error.message);
            socket.emit('error', { message: 'Error al obtener usuarios.' });
        }
    });

    // ==========================================
    // ADMIN: Crear usuario
    // ==========================================
    socket.on('admin_create_user', async (data) => {
        try {
            const { adminId, newUser } = data;
            if (!adminId || !newUser) return;

            const adminCheck = await firestore.getUser(adminId);
            if (!adminCheck || adminCheck.role !== 'admin') {
                socket.emit('error', { message: 'No tienes permisos.' });
                return;
            }

            const id = newUser.id || uuidv4();
            await firestore.saveUser(id, {
                username: newUser.username || 'Nuevo Usuario',
                phone_number: newUser.phone_number || '',
                role: newUser.role || 'user',
                profile_pic: '',
                status: ''
            });

            console.log(`[Admin] ✓ Usuario creado: ${newUser.username} (${id.substring(0, 8)}...)`);
            await broadcastUserList();
        } catch (error) {
            console.error('[Admin] admin_create_user error:', error.message);
        }
    });

    // ==========================================
    // ADMIN: Actualizar usuario
    // ==========================================
    socket.on('admin_update_user', async (data) => {
        try {
            const { adminId, userId, update } = data;
            if (!adminId || !userId || !update) return;

            const adminCheck = await firestore.getUser(adminId);
            if (!adminCheck || adminCheck.role !== 'admin') {
                socket.emit('error', { message: 'No tienes permisos.' });
                return;
            }

            await firestore.saveUser(userId, {
                username: update.username || 'Usuario',
                phone_number: update.phone_number || '',
                role: update.role || 'user'
            });

            console.log(`[Admin] ✓ Usuario actualizado: ${userId.substring(0, 8)}...`);
            await broadcastUserList();
        } catch (error) {
            console.error('[Admin] admin_update_user error:', error.message);
        }
    });

    // ==========================================
    // ADMIN: Eliminar usuario
    // ==========================================
    socket.on('admin_delete_user', async (data) => {
        try {
            const { adminId, userId: targetId } = data;
            if (!adminId || !targetId) return;

            const adminCheck = await firestore.getUser(adminId);
            if (!adminCheck || adminCheck.role !== 'admin') {
                socket.emit('error', { message: 'No tienes permisos.' });
                return;
            }

            if (targetId === adminId) {
                socket.emit('error', { message: 'No puedes eliminar tu propia cuenta.' });
                return;
            }

            // Eliminar usuario y datos asociados
            await firestore.deleteUser(targetId);
            await firestore.deleteUserMessages(targetId);
            await firestore.deleteUserStatuses(targetId);
            await firestore.markDeleted(targetId);

            // Bloqueo temporal
            tempDeletedIds.add(targetId);
            setTimeout(() => tempDeletedIds.delete(targetId), 60000);

            // Forzar desconexión
            io.to(targetId).emit('user_deleted');
            const sockets = await io.in(targetId).fetchSockets();
            sockets.forEach(s => s.disconnect(true));
            onlineUsers.delete(targetId);

            console.log(`[Admin] ✓ Usuario eliminado: ${targetId.substring(0, 8)}...`);
            await broadcastUserList();
        } catch (error) {
            console.error('[Admin] admin_delete_user error:', error.message);
        }
    });

    // ==========================================
    // CHAT: Enviar mensaje
    // ==========================================
    socket.on('send_message', async (data) => {
        try {
            if (!data || !data.senderId) return;
            const msgId = data.id || uuidv4();
            const message = {
                sender_id: data.senderId,
                receiver_id: data.receiverId || 'global',
                content: data.content || '',
                message_type: data.message_type || 'text',
                file_name: data.file_name || '',
                file_url: data.file_url || ''
            };

            await firestore.saveMessage(msgId, message);

            const msgToEmit = { id: msgId, ...message, timestamp: new Date().toISOString() };

            if (message.receiver_id === 'global') {
                io.emit('receive_message', msgToEmit);
            } else {
                socket.emit('receive_message', msgToEmit);
                io.to(message.receiver_id).emit('receive_message', msgToEmit);
            }
        } catch (error) {
            console.error('[Chat] send_message error:', error.message);
        }
    });

    // ==========================================
    // CHAT: Historial de mensajes
    // ==========================================
    socket.on('request_history', async (data) => {
        try {
            const { userId, contactId } = data;
            if (!userId) return;

            let messages = [];
            if (!contactId || contactId === 'global') {
                messages = await firestore.getGlobalMessages();
            } else {
                messages = await firestore.getPrivateMessages(userId, contactId);
            }

            socket.emit('chat_history', messages);
        } catch (error) {
            console.error('[Chat] request_history error:', error.message);
        }
    });

    // ==========================================
    // CHAT: Buscar usuario por teléfono
    // ==========================================
    socket.on('search_user', async (data) => {
        try {
            const { phoneNumber } = data;
            if (!phoneNumber) return;
            const user = await firestore.getUserByPhone(phoneNumber);
            socket.emit('user_found', user || null);
        } catch (error) {
            console.error('[Chat] search_user error:', error.message);
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
            console.error('[Status] publish error:', error.message);
        }
    });

    socket.on('request_statuses', async () => {
        try {
            const statuses = await firestore.getStatuses();
            socket.emit('status_update', statuses);
        } catch (error) {
            console.error('[Status] request error:', error.message);
        }
    });

    socket.on('delete_status', async (statusId) => {
        try {
            await firestore.deleteStatus(statusId);
            const statuses = await firestore.getStatuses();
            io.emit('status_update', statuses);
        } catch (error) {
            console.error('[Status] delete error:', error.message);
        }
    });

    // ==========================================
    // PERFIL
    // ==========================================
    socket.on('update_profile', async (data) => {
        try {
            if (!data || !data.userId) return;
            await firestore.saveUser(data.userId, {
                username: data.name || '',
                profile_pic: data.photo || '',
                status: data.description || '',
                phone_number: data.number || ''
            });
            socket.emit('profile_updated', { success: true });
            await broadcastUserList();
        } catch (error) {
            console.error('[Profile] update error:', error.message);
        }
    });

    // ==========================================
    // LIMPIEZA (admin)
    // ==========================================
    socket.on('admin_cleanup', async (adminId) => {
        try {
            const adminCheck = await firestore.getUser(adminId);
            if (!adminCheck || adminCheck.role !== 'admin') return;
            await firestore.clearAllCollections();
            await broadcastUserList();
            console.log('[Admin] ✓ Limpieza completa');
        } catch (error) {
            console.error('[Admin] cleanup error:', error.message);
        }
    });

    // ==========================================
    // DESCONEXIÓN
    // ==========================================
    socket.on('disconnect', () => {
        if (currentUserId) {
            onlineUsers.delete(currentUserId);
            io.emit('online_count', onlineUsers.size);
            broadcastUserList();
            console.log(`[Disconnect] ${currentUserId.substring(0, 8)}... (${onlineUsers.size} online)`);
        }
    });
});

// ===== INICIAR SERVIDOR =====
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`\n🚀 Servidor Konek Fun corriendo en puerto ${PORT}`);
    console.log(`   Firebase: ${require('./firebase.cjs').db ? '✓ Conectado' : '✗ Sin conexión'}\n`);
});
