const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const { firebaseDb } = require('./firebase.cjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// --- SEGURIDAD ANTI-CRASH ---
process.on('uncaughtException', (err) => {
    console.error('[CRÍTICO] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[CRÍTICO] Unhandled Rejection:', reason);
});

// Directorio para archivos subidos
const UPLOADS_DIR = path.join(__dirname, 'uploads');
fs.ensureDirSync(UPLOADS_DIR);

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["https://konek.fun", "http://localhost:5173", "http://localhost:5000"],
        methods: ["GET", "POST"],
        credentials: true
    },
    maxHttpBufferSize: 1e8
});

app.set('trust proxy', 1);

// Configuración de Multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- ARCHIVOS ESTÁTICOS ---
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, '../dist')));

// --- API ENDPOINTS ---

app.post('/api/upload/init', async (req, res) => {
    try {
        const { fileName, totalSize, id } = req.body;
        const fileId = id || uuidv4();
        const filePath = path.join(UPLOADS_DIR, fileId + '_' + fileName);
        await fs.writeFile(filePath, '');
        await firebaseDb.run(
            'INSERT INTO uploads (id, file_name, total_size, status) VALUES (?, ?, ?, ?)',
            [fileId, fileName, totalSize, 'uploading']
        );
        res.json({ fileId, filePath });
    } catch (error) {
        console.error('[API Error] upload/init:', error.message);
        res.status(500).json({ error: 'Error al iniciar carga' });
    }
});

app.post('/api/upload/chunk', upload.single('chunk'), async (req, res) => {
    try {
        const { fileId, fileName } = req.body;
        const chunk = req.file?.buffer;
        if (!chunk) return res.status(400).json({ error: 'No chunk received' });

        const filePath = path.join(UPLOADS_DIR, fileId + '_' + fileName);
        await fs.appendFile(filePath, chunk);
        await firebaseDb.run(
            'UPDATE uploads SET current_size = current_size + ? WHERE id = ?',
            [chunk.length, fileId]
        );

        const uploadStatus = await firebaseDb.get('SELECT current_size, total_size FROM uploads WHERE id = ?', [fileId]);
        if (uploadStatus && uploadStatus.current_size >= uploadStatus.total_size) {
            await firebaseDb.run('UPDATE uploads SET status = ? WHERE id = ?', ['completed', fileId]);
        }

        res.json({ success: true, received: chunk.length });
    } catch (error) {
        console.error('[API Error] upload/chunk:', error.message);
        res.status(500).json({ error: 'Error al procesar chunk' });
    }
});

app.get('/api/download/:fileId/:fileName', async (req, res) => {
    try {
        const { fileId, fileName } = req.params;
        const filePath = path.join(UPLOADS_DIR, fileId + '_' + fileName);
        if (await fs.pathExists(filePath)) {
            res.download(filePath, fileName);
        } else {
            res.status(404).send('Archivo no encontrado');
        }
    } catch (error) {
        console.error('[API Error] download:', error.message);
        res.status(500).send('Error al descargar');
    }
});

// --- SOCKET.IO ---
const onlineUsers = new Set();
const tempDeletedIds = new Set();

const BANNED_NAMES = ['pelotudo', 'Anes'];
const BANNED_NUMBERS = ['12345', '312'];

// Función para enviar lista de usuarios a admins y a todos
async function broadcastAdminUserList(ioInstance) {
    try {
        const users = await firebaseDb.all('SELECT * FROM users');
        if (!users) return;

        const usersWithStatus = users.map(u => ({
            ...u,
            role: u.role || 'user',
            isOnline: onlineUsers.has(u.id)
        }));

        ioInstance.to('admins_room').emit('admin_user_list', usersWithStatus);
        ioInstance.emit('user_list', usersWithStatus);
        console.log(`[Broadcast] Lista enviada: ${usersWithStatus.length} usuarios, ${onlineUsers.size} online`);
    } catch (error) {
        console.error('[Broadcast Error]:', error.message);
    }
}

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

            step = 'parsing';
            const phoneNumber = (profile.number && String(profile.number).trim() !== '')
                ? String(profile.number).trim()
                : null;

            // Verificar número duplicado
            if (phoneNumber) {
                step = 'verificar duplicado';
                const existingUser = await firebaseDb.get(
                    'SELECT id FROM users WHERE phone_number = ? AND id != ?',
                    [phoneNumber, userId]
                );
                if (existingUser) {
                    socket.emit('error', { message: 'Este número ya está en uso por otro usuario.' });
                    return;
                }
            }

            currentUserId = userId;
            socket.join(userId);
            onlineUsers.add(userId);

            // Bloqueo de nombres/números baneados
            if (BANNED_NAMES.includes(profile.name) || BANNED_NUMBERS.includes(phoneNumber)) {
                console.log(`[Bloqueo] Datos baneados: ${profile.name} / ${phoneNumber}`);
                socket.emit('error', { message: 'Esta cuenta ha sido prohibida.' });
                onlineUsers.delete(userId);
                socket.disconnect(true);
                return;
            }

            // Verificar si fue eliminado
            step = 'verificar eliminado';
            let isBannedForever = null;
            try {
                isBannedForever = await firebaseDb.get('SELECT id FROM deleted_ids WHERE id = ?', [userId]);
            } catch (e) {
                console.warn('[Warn] Error al verificar deleted_ids:', e.message);
            }

            if (tempDeletedIds.has(userId) || isBannedForever) {
                console.log(`[Bloqueo] ID eliminado: ${userId}`);
                socket.emit('error', { message: 'Esta cuenta ha sido desactivada por el administrador.' });
                socket.emit('user_deleted');
                onlineUsers.delete(userId);
                socket.disconnect(true);
                return;
            }

            // Obtener usuario existente
            step = 'buscar existente';
            const existing = await firebaseDb.get('SELECT role, phone_number FROM users WHERE id = ?', [userId]);
            let role = existing ? (existing.role || 'user') : 'user';
            let finalPhoneNumber = existing?.phone_number || phoneNumber || '';

            // Asignación de rol Admin - SOLO si no existe otro admin
            if (profile.name === 'Admin') {
                step = 'verificar admin existente';
                const existingAdmin = await firebaseDb.get("SELECT id FROM users WHERE role = 'admin'", []);
                if (!existingAdmin || existingAdmin.id === userId) {
                    // No hay admin, o este usuario YA es el admin → permitir
                    role = 'admin';
                    console.log(`[Admin] Rol admin asignado a ${userId}`);
                } else {
                    // Ya existe otro admin → este es usuario normal
                    console.log(`[Admin] Ya existe admin ${existingAdmin.id}, ${userId} será 'user'`);
                    role = 'user';
                }
            }

            // Guardar/actualizar usuario
            step = 'insertar/actualizar usuario';
            await firebaseDb.run(
                'INSERT INTO users (id, username, profile_pic, status, phone_number, role) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET',
                [userId, profile.name || 'Usuario', profile.photo || '', profile.description || '', finalPhoneNumber, role]
            );

            // Leer datos actualizados
            step = 'leer usuario';
            const userData = await firebaseDb.get('SELECT * FROM users WHERE id = ?', [userId]);
            const userResponse = userData || { id: userId, username: profile.name || 'Usuario', role: role };

            console.log(`[Join] ${userResponse.username} (${userId}) rol=${userResponse.role}`);
            socket.emit('login_success', userResponse);

            // Si es admin, suscribir a sala de admins y enviar lista
            if (userResponse.role === 'admin') {
                step = 'configurar admin';
                socket.join('admins_room');
                console.log(`[Admin] Suscrito: ${userResponse.username} (${userId})`);

                // Limpiar admins duplicados (solo por seguridad)
                step = 'limpiar admins duplicados';
                await firebaseDb.run(
                    "UPDATE users SET role = 'user' WHERE username = 'Admin' AND id != ?",
                    [userId]
                );

                step = 'lista para admin';
                const allUsers = await firebaseDb.all('SELECT * FROM users');
                const usersWithStatus = (allUsers || []).map(u => ({
                    ...u,
                    role: u.role || 'user',
                    isOnline: onlineUsers.has(u.id)
                }));
                socket.emit('admin_user_list', usersWithStatus);
                console.log(`[Admin] Lista enviada: ${usersWithStatus.length} usuarios`);
            }

            step = 'broadcast';
            await broadcastAdminUserList(io);
            io.emit('online_count', onlineUsers.size);

        } catch (error) {
            console.error(`[Error Join] paso="${step}":`, error.message, error.stack);
            socket.emit('error', { message: `Error al unirse (${step}): ${error.message}` });
        }
    });

    // ==========================================
    // UPDATE PROFILE
    // ==========================================
    socket.on('update_profile', async (data) => {
        try {
            const { userId, profile } = data;
            if (!userId || !profile) return;

            await firebaseDb.run(
                'UPDATE users SET username = ?, profile_pic = ?, status = ?, phone_number = COALESCE(phone_number, ?) WHERE id = ?',
                [profile.name || 'Usuario', profile.photo || '', profile.description || '', profile.number || '', userId]
            );

            await broadcastAdminUserList(io);
        } catch (error) {
            console.error('[Error] update_profile:', error.message);
            socket.emit('error', { message: 'Error al actualizar perfil.' });
        }
    });

    // ==========================================
    // ADMIN EVENTS
    // ==========================================

    socket.on('admin_get_all_users', async (adminId) => {
        try {
            if (!adminId) return;
            const admin = await firebaseDb.get('SELECT role FROM users WHERE id = ?', [adminId]);
            if (admin?.role !== 'admin') {
                console.log(`[Seguridad] Acceso denegado: ${adminId}`);
                return;
            }

            // Limpiar baneados
            if (firebaseDb.cleanBanned) await firebaseDb.cleanBanned();

            const users = await firebaseDb.all('SELECT * FROM users');
            const usersWithStatus = (users || []).map(u => ({
                ...u,
                isOnline: onlineUsers.has(u.id)
            }));
            socket.emit('admin_user_list', usersWithStatus);
            console.log(`[Admin] Lista manual: ${usersWithStatus.length} usuarios para ${adminId}`);
        } catch (error) {
            console.error('[Error] admin_get_all_users:', error.message);
        }
    });

    socket.on('admin_update_user', async (data) => {
        try {
            const { adminId, userId, update } = data;
            if (!adminId || !userId) return;

            const admin = await firebaseDb.get('SELECT role FROM users WHERE id = ?', [adminId]);
            if (admin?.role !== 'admin') return;

            const { username, phone_number, role } = update;
            await firebaseDb.run(
                'UPDATE users SET username = ?, phone_number = ?, role = ? WHERE id = ?',
                [username || 'Usuario', phone_number || '', role || 'user', userId]
            );

            await broadcastAdminUserList(io);
            console.log(`[Admin] Usuario ${userId} actualizado por ${adminId}`);
        } catch (error) {
            console.error('[Error] admin_update_user:', error.message);
        }
    });

    socket.on('admin_delete_user', async (data) => {
        try {
            const { adminId, userId: targetId } = data;
            if (!adminId || !targetId) return;

            const admin = await firebaseDb.get('SELECT role FROM users WHERE id = ?', [adminId]);
            if (admin?.role !== 'admin') return;

            const targetUser = await firebaseDb.get('SELECT phone_number, username FROM users WHERE id = ?', [targetId]);

            // Eliminar usuario
            await firebaseDb.run('DELETE FROM users WHERE id = ?', [targetId]);

            // Si tenía número, limpiar registros relacionados
            if (targetUser?.phone_number) {
                await firebaseDb.run('DELETE FROM users WHERE phone_number = ?', [targetUser.phone_number]);
            }

            // Eliminar mensajes y estados
            await firebaseDb.run('DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?', [targetId, targetId]);
            await firebaseDb.run('DELETE FROM statuses WHERE user_id = ?', [targetId]);

            // Registrar como eliminado permanente
            await firebaseDb.run('INSERT OR IGNORE INTO deleted_ids (id) VALUES (?)', [targetId]);

            // Bloqueo temporal
            tempDeletedIds.add(targetId);
            setTimeout(() => tempDeletedIds.delete(targetId), 60000);

            // Forzar desconexión
            io.to(targetId).emit('user_deleted');
            const sockets = await io.in(targetId).fetchSockets();
            sockets.forEach(s => s.disconnect(true));
            onlineUsers.delete(targetId);

            await broadcastAdminUserList(io);
            console.log(`[Admin] Usuario ${targetId} (${targetUser?.username}) eliminado por ${adminId}`);
        } catch (error) {
            console.error('[Error] admin_delete_user:', error.message);
        }
    });

    socket.on('admin_create_user', async (data) => {
        try {
            const { adminId, newUser } = data;
            if (!adminId) return;

            const admin = await firebaseDb.get('SELECT role FROM users WHERE id = ?', [adminId]);
            if (admin?.role !== 'admin') return;

            const { id, username, phone_number, role } = newUser;
            await firebaseDb.run(
                'INSERT INTO users (id, username, phone_number, role) VALUES (?, ?, ?, ?)',
                [id || uuidv4(), username || 'Nuevo Usuario', phone_number || '', role || 'user']
            );

            await broadcastAdminUserList(io);
            console.log(`[Admin] Usuario creado: ${username} por ${adminId}`);
        } catch (error) {
            console.error('[Error] admin_create_user:', error.message);
        }
    });

    // ==========================================
    // CHAT / MENSAJES
    // ==========================================

    socket.on('request_chat_history', async ({ userId, contactId }) => {
        try {
            const messages = await firebaseDb.all(
                `SELECT * FROM messages
                 WHERE (sender_id = ? AND receiver_id = ?)
                 OR (sender_id = ? AND receiver_id = ?)
                 ORDER BY timestamp ASC`,
                [userId, contactId, contactId, userId]
            );
            socket.emit('chat_history', { contactId, messages: messages || [] });
        } catch (error) {
            console.error('[Error] request_chat_history:', error.message);
            socket.emit('chat_history', { contactId, messages: [] });
        }
    });

    socket.on('request_global_history', async () => {
        try {
            const messages = await firebaseDb.all(
                'SELECT * FROM messages WHERE receiver_id = "global" ORDER BY timestamp ASC'
            );
            socket.emit('chat_history', { contactId: 'global', messages: messages || [] });
        } catch (error) {
            console.error('[Error] request_global_history:', error.message);
            socket.emit('chat_history', { contactId: 'global', messages: [] });
        }
    });

    socket.on('find_user_by_number', async (number) => {
        try {
            const cleanNumber = String(number || '').trim();
            if (!cleanNumber) {
                socket.emit('user_found', null);
                return;
            }

            console.log(`[Search] Buscando número: ${cleanNumber}`);
            const user = await firebaseDb.get('SELECT * FROM users WHERE phone_number = ?', [cleanNumber]);
            socket.emit('user_found', user || null);
            console.log(`[Search] Resultado: ${user ? user.username : 'no encontrado'}`);
        } catch (error) {
            console.error('[Error] find_user_by_number:', error.message);
            socket.emit('user_found', null);
        }
    });

    socket.on('send_message', async (data) => {
        try {
            const { id, sender_id, receiver_id, content, type, file_info } = data;
            if (!id || !sender_id || !receiver_id) return;

            const sender = await firebaseDb.get('SELECT username, profile_pic, phone_number FROM users WHERE id = ?', [sender_id]);

            const messageToForward = {
                ...data,
                sender_name: sender?.username || 'Usuario',
                sender_pic: sender?.profile_pic || '',
                sender_phone: sender?.phone_number || ''
            };

            await firebaseDb.run(
                'INSERT INTO messages (id, sender_id, receiver_id, content, type, file_path, file_name, file_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [id, sender_id, receiver_id, content || '', type || 'text', file_info?.path || null, file_info?.name || null, file_info?.size || null]
            );

            if (receiver_id === 'global') {
                socket.broadcast.emit('receive_message', messageToForward);
            } else {
                io.to(receiver_id).emit('receive_message', messageToForward);
            }
            socket.emit('message_sent', { id });
        } catch (error) {
            console.error('[Error] send_message:', error.message);
        }
    });

    // ==========================================
    // ESTADOS (Historias)
    // ==========================================

    socket.on('publish_status', async (data) => {
        try {
            const { id, user_id, content, type } = data;
            if (!id || !user_id) return;

            await firebaseDb.run(
                'INSERT INTO statuses (id, user_id, content, type) VALUES (?, ?, ?, ?)',
                [id, user_id, content, type]
            );

            console.log(`[Status] Publicado por: ${user_id}`);
            const statuses = await firebaseDb.all('SELECT statuses.*, users.username, users.profile_pic FROM statuses');
            io.emit('status_list', statuses || []);
        } catch (error) {
            console.error('[Error] publish_status:', error.message);
        }
    });

    socket.on('request_statuses', async () => {
        try {
            const statuses = await firebaseDb.all('SELECT statuses.*, users.username, users.profile_pic FROM statuses');
            socket.emit('status_list', statuses || []);
        } catch (error) {
            console.error('[Error] request_statuses:', error.message);
            socket.emit('status_list', []);
        }
    });

    socket.on('delete_status', async (statusId) => {
        try {
            if (!statusId) return;
            await firebaseDb.run('DELETE FROM statuses WHERE id = ?', [statusId]);
            const statuses = await firebaseDb.all('SELECT statuses.*, users.username, users.profile_pic FROM statuses');
            io.emit('status_list', statuses || []);
        } catch (error) {
            console.error('[Error] delete_status:', error.message);
        }
    });

    // ==========================================
    // DESCONEXIÓN
    // ==========================================
    socket.on('disconnect', async () => {
        if (currentUserId) {
            onlineUsers.delete(currentUserId);
            io.emit('online_count', onlineUsers.size);
            await broadcastAdminUserList(io);
        }
        console.log(`[Disconnect] ${currentUserId || 'desconocido'}`);
    });
});

// --- SPA CATCH-ALL ---
app.use((req, res, next) => {
    if (req.url.startsWith('/api') || req.url.startsWith('/uploads') || req.url.startsWith('/socket.io')) {
        return next();
    }
    const indexPath = path.resolve(__dirname, '..', 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Build no disponible. Ejecuta npm run build.');
    }
});

// --- INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Servidor Konek Fun corriendo en el puerto ${PORT} con FIREBASE`);
});
