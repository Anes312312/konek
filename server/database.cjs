const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs-extra');

async function setupDatabase() {
    // Para persistencia en Render/Railway, usamos una carpeta de datos
    const dataDir = process.env.PERSISTENT_DATA_PATH || __dirname;
    const dbPath = path.join(dataDir, 'konek.db');

    // Asegurar que el directorio existe
    if (process.env.PERSISTENT_DATA_PATH) {
        fs.ensureDirSync(dataDir);
    }

    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT,
            profile_pic TEXT,
            status TEXT,
            phone_number TEXT UNIQUE,
            role TEXT DEFAULT 'user'
        );

        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            sender_id TEXT,
            receiver_id TEXT,
            content TEXT,
            type TEXT, -- 'text', 'file'
            file_path TEXT,
            file_name TEXT,
            file_size INTEGER,
            read INTEGER DEFAULT 0,
            deleted_for TEXT DEFAULT '[]',
            is_deleted_for_all INTEGER DEFAULT 0,
            is_forwarded INTEGER DEFAULT 0,
            game_type TEXT,
            game_data TEXT DEFAULT '{}',
            reactions TEXT DEFAULT '[]',
            timestamp TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );

        CREATE TABLE IF NOT EXISTS uploads (
            id TEXT PRIMARY KEY,
            file_name TEXT,
            total_size INTEGER,
            current_size INTEGER DEFAULT 0,
            status TEXT -- 'uploading', 'completed'
        );

        CREATE TABLE IF NOT EXISTS statuses (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            content TEXT,
            type TEXT, -- 'image', 'text'
            media_url TEXT,
            timestamp TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );

        CREATE TABLE IF NOT EXISTS mundo (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            display_name TEXT,
            anonymous INTEGER DEFAULT 0,
            text TEXT,
            image TEXT,
            type TEXT DEFAULT 'text',
            file_info TEXT DEFAULT '{}',
            reactions TEXT DEFAULT '[]',
            profile_pic TEXT,
            timestamp TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );

        CREATE TABLE IF NOT EXISTS deleted_ids (
            id TEXT PRIMARY KEY,
            timestamp TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );

        -- Purga preventiva de usuarios eliminados
        DELETE FROM users WHERE id IN (SELECT id FROM deleted_ids);
    `);

    // Asegurar que las columnas nuevas existan si la DB ya estaba creada
    const migrations = [
        ['users', 'phone_number', 'TEXT UNIQUE'],
        ['users', 'role', 'TEXT DEFAULT "user"'],
        ['messages', 'read', 'INTEGER DEFAULT 0'],
        ['messages', 'deleted_for', "TEXT DEFAULT '[]'"],
        ['messages', 'is_deleted_for_all', 'INTEGER DEFAULT 0'],
        ['messages', 'is_forwarded', 'INTEGER DEFAULT 0'],
        ['messages', 'game_type', 'TEXT'],
        ['messages', 'game_data', "TEXT DEFAULT '{}'"],
        ['messages', 'reactions', "TEXT DEFAULT '[]'"],
        ['statuses', 'media_url', 'TEXT'],
        ['statuses', 'reactions', "TEXT DEFAULT '[]'"]
    ];

    for (const [table, col, def] of migrations) {
        try {
            await db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
        } catch (e) {
            // Ignorar si la columna ya existe
        }
    }

    return db;
}

module.exports = { setupDatabase };
