const sharp = require('sharp');

async function run() {
    const metadata = await sharp('public/splash.png').metadata();
    console.log('splash.png:', metadata.width, 'x', metadata.height);

    const meta192 = await sharp('public/icon-192.png').metadata();
    console.log('icon-192.png:', meta192.width, 'x', meta192.height);

    const meta512 = await sharp('public/icon-512.png').metadata();
    console.log('icon-512.png:', meta512.width, 'x', meta512.height);
}
run();
