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
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
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
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS deleted_ids (
            id TEXT PRIMARY KEY,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Purga preventiva de usuarios eliminados
        DELETE FROM users WHERE id IN (SELECT id FROM deleted_ids);
    `);

    // Asegurar que las columnas nuevas existan si la DB ya estaba creada
    try {
        await db.run('ALTER TABLE users ADD COLUMN phone_number TEXT UNIQUE');
    } catch (e) { }

    try {
        await db.run('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "user"');
    } catch (e) { }

    return db;
}

module.exports = { setupDatabase };
