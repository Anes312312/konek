const Jimp = require('jimp');

async function resizeIcons() {
    const image = await Jimp.read('public/favicon.png');
    const clone192 = image.clone();
    const clone512 = image.clone();

    await clone192.resize(192, 192).writeAsync('public/icon-192.png');
    await clone512.resize(512, 512).writeAsync('public/icon-512.png');

    console.log('Icons resized successfully.');
}

resizeIcons().catch(console.error);
