const sharp = require('sharp');

async function createInvisibleSplash() {
    await sharp({
        create: {
            width: 512,
            height: 512,
            channels: 4,
            background: { r: 8, g: 21, b: 40, alpha: 1 } // #081528 en RGB
        }
    })
        .png()
        .toFile('public/splash-solid-512.png');
    console.log("Created solid 512x512 splash icon");
}

createInvisibleSplash();
