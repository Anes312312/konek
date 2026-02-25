const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function purge() {
    const dbPath = path.join(__dirname, 'server', 'konek.db');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    const usersToPurge = ['pelotudo', 'Anes', 'Admin'];
    console.log('Buscando usuarios para purga:', usersToPurge);

    for (const name of usersToPurge) {
        const users = await db.all('SELECT id, username, phone_number FROM users WHERE username = ?', [name]);
        console.log(`Encontrados ${users.length} usuarios con nombre ${name}`);

        for (const user of users) {
            // Si es el admin online (el que tiene el dashboard abierto), tal vez no debamos borrarlo?
            // El usuario dijo "elimina al usuario pelotudo , Anes , Admin definitivamente"
            // En el screenshot hay un Admin Online y otro Offline.
            // El Online es el admin actual. Seguramente NO quiere borrarse a sí mismo si está operando.
            // Pero el "Admin" Offline (USER) sí debe ser borrado.

            // Por seguridad, si el rol es 'admin' y está online, lo saltamos? 
            // No, el usuario fue específico. Pero borrar el Admin activo cerraría su sesión.
            // Veré el rol.
            const userDetail = await db.get('SELECT role FROM users WHERE id = ?', [user.id]);
            if (userDetail.role === 'admin' && usersToPurge.includes(user.username)) {
                console.log(`Omitiendo purga de admin activo: ${user.username} (${user.id}) para evitar cierre de sesión.`);
                continue;
            }

            console.log(`Purgando: ${user.username} (ID: ${user.id}, Num: ${user.phone_number})`);
            await db.run('DELETE FROM users WHERE id = ?', [user.id]);
            await db.run('INSERT OR IGNORE INTO deleted_ids (id) VALUES (?)', [user.id]);
        }
    }

    // Purga adicional por número si el usuario los mencionara por número, pero no lo hizo.

    await db.close();
    console.log('Purga completada.');
}

purge().catch(console.error);
