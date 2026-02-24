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

// Directorio para archivos subidos (se recomienda cambiar a un HDD externo en la Pi)
const UPLOADS_DIR = path.join(__dirname, 'uploads');
fs.ensureDirSync(UPLOADS_DIR);

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 1e8 // 100MB buffer para sockets si es necesario
});

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
            const existing = await db.get('SELECT role, phone_number FROM users WHERE id = ?', [userId]);
            let role = existing ? existing.role : 'user';
            let finalPhoneNumber = existing?.phone_number;

            // Auto-asignar admin si el nombre es 'Admin' (para configuración inicial)
            if (profile.name.toLowerCase() === 'admin') {
                role = 'admin';
            }

            // Si es un usuario nuevo (no existe el phone_number en DB) y el cliente envía uno, lo usamos
            // Pero si ya tiene uno asignado por el admin, ignoramos lo que envíe el cliente (es de solo lectura)
            if (!finalPhoneNumber && phoneNumber) {
                finalPhoneNumber = phoneNumber;
            }

            await db.run(
                'INSERT INTO users (id, username, profile_pic, status, phone_number, role) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET username=excluded.username, profile_pic=excluded.profile_pic, status=excluded.status',
                [userId, profile.name, profile.photo, profile.description, finalPhoneNumber, role]
            );

            const userData = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
            socket.emit('login_success', userData);

            console.log(`Usuario conectado: ${profile.name} (${userId}) - Online: ${onlineUsers.size}`);
        } catch (error) {
            console.error('Error al unir usuario:', error);
            socket.emit('error', { message: 'Error al registrar usuario en la base de datos.' });
        }

        // Avisar a todos que hay un nuevo usuario/actualización
        const allUsers = await db.all('SELECT id, username, profile_pic, status, phone_number, role FROM users');
        io.emit('user_list', allUsers);
        io.emit('online_count', onlineUsers.size);
    });

    socket.on('update_profile', async (data) => {
        const { userId, profile } = data;

        try {
            const user = await db.get('SELECT role FROM users WHERE id = ?', [userId]);

            // Solo actualizamos nombre, foto y descripción. El número es solo para el Admin
            await db.run(
                'UPDATE users SET username = ?, profile_pic = ?, status = ? WHERE id = ?',
                [profile.name, profile.photo, profile.description, userId]
            );

            const allUsers = await db.all('SELECT id, username, profile_pic, status, phone_number, role FROM users');
            io.emit('user_list', allUsers);
        } catch (error) {
            socket.emit('error', { message: 'Error al actualizar perfil.' });
        }
    });

    // --- ADMIN EVENTS ---

    socket.on('admin_get_all_users', async (adminId) => {
        const admin = await db.get('SELECT role FROM users WHERE id = ?', [adminId]);
        if (admin?.role !== 'admin') return;

        const users = await db.all('SELECT * FROM users');
        const usersWithStatus = users.map(u => ({
            ...u,
            isOnline: onlineUsers.has(u.id)
        }));
        socket.emit('admin_user_list', usersWithStatus);
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

        const users = await db.all('SELECT * FROM users');
        io.emit('user_list', users); // Actualizar para todos

        // Refrescar lista de admin
        const usersWithStatus = users.map(u => ({ ...u, isOnline: onlineUsers.has(u.id) }));
        socket.emit('admin_user_list', usersWithStatus);
    });

    socket.on('admin_delete_user', async (data) => {
        const { adminId, userId: targetId } = data;
        const admin = await db.get('SELECT role FROM users WHERE id = ?', [adminId]);
        if (admin?.role !== 'admin') return;

        await db.run('DELETE FROM users WHERE id = ?', [targetId]);
        await db.run('DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?', [targetId, targetId]);
        await db.run('DELETE FROM statuses WHERE user_id = ?', [targetId]);

        const users = await db.all('SELECT * FROM users');
        io.emit('user_list', users);

        const usersWithStatus = users.map(u => ({ ...u, isOnline: onlineUsers.has(u.id) }));
        socket.emit('admin_user_list', usersWithStatus);
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

        const users = await db.all('SELECT * FROM users');
        io.emit('user_list', users);

        const usersWithStatus = users.map(u => ({ ...u, isOnline: onlineUsers.has(u.id) }));
        socket.emit('admin_user_list', usersWithStatus);
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
            'INSERT INTO messages (id, sender_id, receiver_id, content, type, file_path, file_name, file_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
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
            'INSERT INTO statuses (id, user_id, content, type, timestamp) VALUES (?, ?, ?, ?, strftime("%Y-%m-%dT%H:%M:%SZ", "now"))',
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

    socket.on('disconnect', () => {
        if (currentUserId) {
            onlineUsers.delete(currentUserId);
            io.emit('online_count', onlineUsers.size);
        }
        console.log('Usuario desconectado');
    });
});

// Ruta de captura general para el frontend (SPA)
// Debe ir al final de todos los endpoints y sockets
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = 5000;
setupDatabase().then(database => {
    db = database;
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Servidor Konek Fun corriendo en http://0.0.0.0:${PORT}`);
    });
});
