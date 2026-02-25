const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const { setupDatabase } = require('./database.cjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// Directorio para archivos subidos (configurado para persistencia en el servidor nube)
const UPLOADS_DIR = path.join(__dirname, 'uploads');
fs.ensureDirSync(UPLOADS_DIR);

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["https://konek.fun", "http://localhost:5173"],
        methods: ["GET", "POST"],
        credentials: true
    },
    maxHttpBufferSize: 1e8 // 100MB buffer
});

// Confianza en el proxy para despliegues en la nube (Render/Vercel)
app.set('trust proxy', 1);

let db;

// Configuración de Multer para recibir trozos (chunks)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- SERVIR ARCHIVOS ESTÁTICOS (PRODUCCIÓN) ---
// Carpeta de archivos subidos (fotos de perfil, etc.)
app.use('/uploads', express.static(UPLOADS_DIR));

// Servir el frontend compilado (Vite dist)
app.use(express.static(path.join(__dirname, '../dist')));

// --- API ENDPOINTS ---

// Iniciar una carga de archivo grande
app.post('/api/upload/init', async (req, res) => {
    const { fileName, totalSize, id } = req.body;
    const fileId = id || uuidv4();
    const filePath = path.join(UPLOADS_DIR, fileId + '_' + fileName);

    // Crear archivo vacío
    await fs.writeFile(filePath, '');

    await db.run(
        'INSERT INTO uploads (id, file_name, total_size, status) VALUES (?, ?, ?, ?)',
        [fileId, fileName, totalSize, 'uploading']
    );

    res.json({ fileId, filePath });
});

// Recibir un trozo (chunk) del archivo
app.post('/api/upload/chunk', upload.single('chunk'), async (req, res) => {
    const { fileId, fileName } = req.body;
    const chunk = req.file.buffer;

    const filePath = path.join(UPLOADS_DIR, fileId + '_' + fileName);

    // Append del trozo al archivo final
    await fs.appendFile(filePath, chunk);

    // Actualizar progreso en DB
    await db.run(
        'UPDATE uploads SET current_size = current_size + ? WHERE id = ?',
        [chunk.length, fileId]
    );

    const uploadStatus = await db.get('SELECT current_size, total_size FROM uploads WHERE id = ?', [fileId]);

    if (uploadStatus.current_size >= uploadStatus.total_size) {
        await db.run('UPDATE uploads SET status = ? WHERE id = ?', ['completed', fileId]);
    }

    res.json({ success: true, received: chunk.length });
});

// Descargar archivo
app.get('/api/download/:fileId/:fileName', async (req, res) => {
    const { fileId, fileName } = req.params;
    const filePath = path.join(UPLOADS_DIR, fileId + '_' + fileName);

    if (await fs.pathExists(filePath)) {
        res.download(filePath, fileName);
    } else {
        res.status(404).send('Archivo no encontrado');
    }
});

// --- SOCKET.IO ---
const onlineUsers = new Set();
const tempDeletedIds = new Set(); // Evita que usuarios recién borrados se re-creen por re-conexiones automáticas

// Función global para notificar a los admins y usuarios sobre cambios en el censo
async function broadcastAdminUserList(io, db, onlineUsers) {
    if (!db) return;
    try {
        console.log('[Debug] Ejecutando broadcastAdminUserList...');
        const allUsers = await db.all(`
            SELECT id, username, profile_pic, status, phone_number, role 
            FROM users 
            WHERE id NOT IN (SELECT id FROM deleted_ids)
        `);
        console.log(`[Debug] Usuarios encontrados en DB: ${allUsers.length}`);

        const usersWithStatus = allUsers.map(u => ({
            ...u,
            isOnline: onlineUsers.has(u.id)
        }));

        // Notificar a la sala de administradores
        const adminRoomSize = io.sockets.adapter.rooms.get('admins_room')?.size || 0;
        console.log(`[Debug] Enviando lista a 'admins_room' (Admins conectados: ${adminRoomSize})`);
        io.to('admins_room').emit('admin_user_list', usersWithStatus);

        // Notificar a todos los usuarios para actualizar sus listas de contactos
        io.emit('user_list', allUsers);

        console.log(`[Sistema] Lista de usuarios sincronizada. Total: ${allUsers.length}`);
    } catch (error) {
        console.error('[Error] Error al difundir lista de usuarios:', error);
    }
}

io.on('connection', (socket) => {
    let currentUserId = null;

    socket.on('join', async (data) => {
        const { userId, profile } = data;

        // Asegurar que el número vacío se guarde como null para evitar conflictos de UNIQUE
        const phoneNumber = profile.number && profile.number.trim() !== '' ? profile.number.trim() : null;

        // Verificar si el número ya está siendo usado por otro ID
        if (phoneNumber) {
            const existingUser = await db.get('SELECT id FROM users WHERE phone_number = ? AND id != ?', [phoneNumber, userId]);
            if (existingUser) {
                socket.emit('error', { message: 'Este número ya está en uso por otro usuario.' });
                return;
            }
        }

        currentUserId = userId;
        socket.join(userId);
        onlineUsers.add(userId);

        // Guardar o actualizar usuario en DB
        try {
            // Verificar si el ID está en la lista negra temporal o permanente de borrados
            const isBannedForever = await db.get('SELECT id FROM deleted_ids WHERE id = ?', [userId]);
            if (tempDeletedIds.has(userId) || isBannedForever) {
                console.log(`Intento de conexión rechazado (ID eliminado): ${userId}`);
                socket.emit('error', { message: 'Esta cuenta ha sido desactivada por el administrador.' });
                socket.emit('user_deleted');
                socket.disconnect(true);
                return;
            }

            const existing = await db.get('SELECT role, phone_number FROM users WHERE id = ?', [userId]);
            let role = existing ? existing.role : 'user';

            // Si el usuario es nuevo, usamos el número que trae el perfil si existe
            // Si ya existe, nos quedamos con el que tiene en la DB o actualizamos si el perfil trae uno nuevo
            // pero priorizando la DB si ya está establecido.
            let finalPhoneNumber = existing?.phone_number || phoneNumber;

            // Si el perfil no existe y no es el primer join (trae un nombre por defecto), 
            // no lo creamos si no tiene nombre real o si sospechamos que fue borrado
            if (!existing && profile.name === 'Mi Usuario') {
                // Es un usuario nuevo legítimo o uno borrado
            }

            // SISTEMA DE ROL AUTOMÁTICO PARA EL PANEL:
            // Si el usuario trae el nombre exacto 'Admin' (mayúscula inicial) y es su primer ingreso
            // o ya tiene el rol, le permitimos ser admin. 
            if (profile.name === 'Admin') {
                role = 'admin';
            } else if (!existing && profile.name.toLowerCase() === 'admin') {
                // Si intenta llamarse 'admin' en minúsculas siendo nuevo, lo dejamos como user por seguridad
                role = 'user';
            }

            await db.run(
                'INSERT INTO users (id, username, profile_pic, status, phone_number, role) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET username=excluded.username, profile_pic=excluded.profile_pic, status=excluded.status, role=excluded.role, phone_number=COALESCE(users.phone_number, excluded.phone_number)',
                [userId, profile.name, profile.photo, profile.description, finalPhoneNumber, role]
            );

            const userData = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
            socket.emit('login_success', userData);

            // Si es un admin, unirlo a la sala especial para recibir actualizaciones masivas
            if (userData.role === 'admin') {
                await socket.join('admins_room');
                console.log(`[Seguridad] Admin detectado y suscrito: ${userData.username} (ID: ${userId})`);

                // LIMPIEZA AGRESIVA DE DUPLICADOS: Solo puede haber un admin total
                // Borramos cualquier otro usuario que se llame 'Admin' o tenga rol 'admin'
                await db.run(
                    "DELETE FROM users WHERE (username = 'Admin' OR role = 'admin') AND id != ?",
                    [userId]
                );

                // Forzar envío inmediato de la lista al admin que acaba de entrar
                const allUsers = await db.all(`
                    SELECT id, username, profile_pic, status, phone_number, role 
                    FROM users 
                    WHERE id NOT IN (SELECT id FROM deleted_ids)
                `);
                const usersWithStatus = allUsers.map(u => ({
                    ...u,
                    isOnline: onlineUsers.has(u.id)
                }));
                console.log(`[Debug] Enviando lista inicial directamente al admin ${userId} (${usersWithStatus.length} usuarios)`);
                socket.emit('admin_user_list', usersWithStatus);
            }

            console.log(`Usuario conectado: ${profile.name} (${userId}) - Online: ${onlineUsers.size}`);
        } catch (error) {
            console.error('Error al unir usuario:', error);
            socket.emit('error', { message: 'Error al registrar usuario en la base de datos.' });
        }

        // Avisar a todos que hay un nuevo usuario/actualización
        // La función broadcastAdminUserList ya emite 'user_list' a todos
        // Avisar a todos que hay un nuevo usuario/actualización
        await broadcastAdminUserList(io, db, onlineUsers);
        io.emit('online_count', onlineUsers.size);
    });

    socket.on('update_profile', async (data) => {
        const { userId, profile } = data;

        try {
            const user = await db.get('SELECT role FROM users WHERE id = ?', [userId]);

            // Actualizamos nombre, foto y descripción. 
            // También actualizamos el número si el usuario lo está configurando y no tenía uno
            await db.run(
                'UPDATE users SET username = ?, profile_pic = ?, status = ?, phone_number = COALESCE(phone_number, ?) WHERE id = ?',
                [profile.name, profile.photo, profile.description, profile.number || null, userId]
            );

            await broadcastAdminUserList(io, db, onlineUsers);
        } catch (error) {
            socket.emit('error', { message: 'Error al actualizar perfil.' });
        }
    });

    // --- ADMIN EVENTS ---

    socket.on('admin_get_all_users', async (adminId) => {
        if (!db) return;
        const admin = await db.get('SELECT role FROM users WHERE id = ?', [adminId]);
        if (admin?.role !== 'admin') {
            console.log(`[Seguridad] Intento de acceso denegado a lista de usuarios por ID: ${adminId}`);
            return;
        }

        // Limpieza preventiva: Eliminar de 'users' cualquier ID que esté en 'deleted_ids'
        await db.run('DELETE FROM users WHERE id IN (SELECT id FROM deleted_ids)');

        const users = await db.all(`
            SELECT id, username, profile_pic, status, phone_number, role 
            FROM users 
            WHERE id NOT IN (SELECT id FROM deleted_ids)
        `);
        const usersWithStatus = users.map(u => ({
            ...u,
            isOnline: onlineUsers.has(u.id)
        }));
        socket.emit('admin_user_list', usersWithStatus);
        console.log(`[Admin] Solicitud manual de lista recibida de admin ${adminId}. Enviando ${users.length} usuarios.`);
    });

    socket.on('admin_update_user', async (data) => {
        const { adminId, userId, update } = data;
        const admin = await db.get('SELECT role FROM users WHERE id = ?', [adminId]);
        if (admin?.role !== 'admin') return;

        const { username, phone_number, role } = update;
        await db.run(
            'UPDATE users SET username = ?, phone_number = ?, role = ? WHERE id = ?',
            [username, phone_number, role, userId]
        );

        await broadcastAdminUserList(io, db, onlineUsers);
    });

    socket.on('admin_delete_user', async (data) => {
        const { adminId, userId: targetId } = data;
        const admin = await db.get('SELECT role FROM users WHERE id = ?', [adminId]);
        if (admin?.role !== 'admin') return;

        // Obtener info del usuario antes de borrarlo para banear su número si tiene
        const targetUser = await db.get('SELECT phone_number, username FROM users WHERE id = ?', [targetId]);

        // Eliminar de la base de datos definitivamente
        await db.run('DELETE FROM users WHERE id = ?', [targetId]);

        // Si tenía número, borrar CUALQUIER otro registro con ese número (limpieza total)
        if (targetUser?.phone_number) {
            await db.run('DELETE FROM users WHERE phone_number = ?', [targetUser.phone_number]);
        }

        await db.run('DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?', [targetId, targetId]);
        await db.run('DELETE FROM statuses WHERE user_id = ?', [targetId]);

        // Registrar el ID como eliminado permanentemente para evitar que se re-cree
        await db.run('INSERT OR IGNORE INTO deleted_ids (id) VALUES (?)', [targetId]);

        // Añadir a lista negra temporal para evitar re-creación inmediata por sockets persistentes
        tempDeletedIds.add(targetId);
        setTimeout(() => tempDeletedIds.delete(targetId), 60000); // 1 minuto de bloqueo

        // Forzar desconexión física de todos los sockets en esa "habitación"
        io.to(targetId).emit('user_deleted');

        // Desconexión inmediata de sockets asociados a ese ID
        const sockets = await io.in(targetId).fetchSockets();
        sockets.forEach(s => s.disconnect(true));
        onlineUsers.delete(targetId);

        await broadcastAdminUserList(io, db, onlineUsers);
        console.log(`[Seguridad] Usuario ${targetId} (${targetUser?.username}) eliminado definitivamente por Admin ${adminId}`);
    });

    socket.on('admin_create_user', async (data) => {
        const { adminId, newUser } = data;
        const admin = await db.get('SELECT role FROM users WHERE id = ?', [adminId]);
        if (admin?.role !== 'admin') return;

        const { id, username, phone_number, role } = newUser;
        await db.run(
            'INSERT INTO users (id, username, phone_number, role) VALUES (?, ?, ?, ?)',
            [id || uuidv4(), username, phone_number, role || 'user']
        );

        await broadcastAdminUserList(io, db, onlineUsers);
    });

    socket.on('request_chat_history', async ({ userId, contactId }) => {
        try {
            const messages = await db.all(
                `SELECT * FROM messages 
                 WHERE (sender_id = ? AND receiver_id = ?) 
                 OR (sender_id = ? AND receiver_id = ?) 
                 ORDER BY timestamp ASC`,
                [userId, contactId, contactId, userId]
            );

            // También necesitamos la info del remitente para cada mensaje si no la tenemos
            // pero el cliente ya maneja el filtrado de mensajes guardados localmente.
            // Para asegurar consistencia total con f5, devolvemos los mensajes.
            socket.emit('chat_history', { contactId, messages });
        } catch (error) {
            console.error('Error al obtener historial:', error);
        }
    });

    socket.on('request_global_history', async () => {
        try {
            const messages = await db.all(
                'SELECT * FROM messages WHERE receiver_id = "global" ORDER BY timestamp ASC'
            );
            socket.emit('chat_history', { contactId: 'global', messages });
        } catch (error) {
            console.error('Error al obtener historial global:', error);
        }
    });

    socket.on('find_user_by_number', async (number) => {
        const cleanNumber = String(number).trim();
        console.log(`Buscando usuario con número: ${cleanNumber}`);

        if (!cleanNumber) {
            socket.emit('user_found', null);
            return;
        }

        const user = await db.get('SELECT * FROM users WHERE phone_number = ?', [cleanNumber]);

        if (user) {
            console.log(`Usuario encontrado: ${user.username}`);
            socket.emit('user_found', user);
        } else {
            console.log(`Usuario con número ${cleanNumber} no encontrado.`);
            socket.emit('user_found', null);
        }
    });


    socket.on('send_message', async (data) => {
        const { id, sender_id, receiver_id, content, type, file_info } = data;

        // Obtener info del remitente para que el receptor pueda identificarlo si no lo tiene en contactos
        const sender = await db.get('SELECT username, profile_pic, phone_number FROM users WHERE id = ?', [sender_id]);

        const messageToForward = {
            ...data,
            sender_name: sender?.username || 'Usuario',
            sender_pic: sender?.profile_pic,
            sender_phone: sender?.phone_number
        };

        await db.run(
            'INSERT INTO messages (id, sender_id, receiver_id, content, type, file_path, file_name, file_size, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime("%Y-%m-%dT%H:%M:%fZ", "now"))',
            [id, sender_id, receiver_id, content, type, file_info?.path, file_info?.name, file_info?.size]
        );

        if (receiver_id === 'global') {
            socket.broadcast.emit('receive_message', messageToForward);
        } else {
            io.to(receiver_id).emit('receive_message', messageToForward);
        }
        socket.emit('message_sent', { id });
    });


    socket.on('publish_status', async (data) => {
        const { id, user_id, content, type } = data;

        await db.run(
            'INSERT INTO statuses (id, user_id, content, type, timestamp) VALUES (?, ?, ?, ?, strftime("%Y-%m-%dT%H:%M:%fZ", "now"))',
            [id, user_id, content, type]
        );

        console.log(`Estado publicado por: ${user_id}`);

        // Obtener todos los estados válidos (últimas 24h)
        const statuses = await db.all(`
            SELECT statuses.*, users.username, users.profile_pic 
            FROM statuses 
            JOIN users ON statuses.user_id = users.id 
            WHERE datetime(statuses.timestamp) > datetime('now', '-24 hours')
            ORDER BY statuses.timestamp DESC
        `);

        io.emit('status_list', statuses);
    });

    socket.on('request_statuses', async () => {
        // Limpieza de estados viejos - Normalizamos con datetime() para ser seguros
        await db.run("DELETE FROM statuses WHERE datetime(timestamp) <= datetime('now', '-24 hours')");

        const statuses = await db.all(`
            SELECT statuses.*, users.username, users.profile_pic 
            FROM statuses 
            JOIN users ON statuses.user_id = users.id 
            WHERE datetime(statuses.timestamp) > datetime('now', '-24 hours')
            ORDER BY statuses.timestamp DESC
        `);

        socket.emit('status_list', statuses);
    });

    socket.on('delete_status', async (statusId) => {
        await db.run('DELETE FROM statuses WHERE id = ?', [statusId]);

        const statuses = await db.all(`
            SELECT statuses.*, users.username, users.profile_pic 
            FROM statuses 
            JOIN users ON statuses.user_id = users.id 
            WHERE datetime(statuses.timestamp) > datetime('now', '-24 hours')
            ORDER BY statuses.timestamp DESC
        `);

        io.emit('status_list', statuses);
    });

    socket.on('disconnect', async () => {
        if (currentUserId) {
            onlineUsers.delete(currentUserId);
            io.emit('online_count', onlineUsers.size);
            await broadcastAdminUserList(io, db, onlineUsers);
        }
        console.log('Usuario desconectado');
    });
});

const PORT = process.env.PORT || 5000;
setupDatabase().then(database => {
    db = database;

    // Ruta de captura general para el frontend (SPA)
    // Debe ir al final de todos los endpoints y sockets
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
    });

    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Servidor Konek Fun corriendo en el puerto ${PORT}`);
    });
});
