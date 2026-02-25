/**
 * Script de limpieza total de Firestore
 * Borra TODAS las colecciones y datos para empezar desde cero
 */
const admin = require('firebase-admin');

if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({ credential: admin.credential.cert(sa) });
    } else {
        admin.initializeApp({ projectId: 'konek-fun-chat-312' });
    }
}

const db = admin.firestore();

async function deleteCollection(name) {
    try {
        const snap = await db.collection(name).get();
        if (snap.empty) {
            console.log(`  ✓ ${name}: vacía (0 docs)`);
            return 0;
        }
        const batch = db.batch();
        snap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`  ✓ ${name}: eliminados ${snap.size} documentos`);
        return snap.size;
    } catch (e) {
        console.error(`  ✗ ${name}: error - ${e.message}`);
        return 0;
    }
}

async function main() {
    console.log('\n🔥 LIMPIEZA TOTAL DE FIRESTORE');
    console.log('================================\n');

    const collections = ['users', 'messages', 'statuses', 'deleted_ids', 'uploads'];
    let total = 0;

    for (const col of collections) {
        total += await deleteCollection(col);
    }

    console.log(`\n================================`);
    console.log(`Total eliminados: ${total} documentos`);
    console.log('✅ Firestore está completamente limpio.\n');
    process.exit(0);
}

main().catch(e => {
    console.error('Error fatal:', e.message);
    process.exit(1);
});
