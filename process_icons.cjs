const sharp = require('sharp');
const fs = require('fs');

async function extractAndPad() {
    try {
        const imagePath = 'public/splash.png';
        const image = sharp(imagePath);
        const metadata = await image.metadata();

        const sample = await sharp(imagePath).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer();
        const hexColor = `#${sample[0].toString(16).padStart(2, '0')}${sample[1].toString(16).padStart(2, '0')}${sample[2].toString(16).padStart(2, '0')}`;

        console.log(`Background color from image: ${hexColor}`);

        const bgObj = { r: sample[0], g: sample[1], b: sample[2], alpha: 1 };

        await sharp(imagePath)
            .resize(360, 360, {
                fit: 'contain',
                background: bgObj
            })
            .extend({
                top: 76,
                bottom: 76,
                left: 76,
                right: 76,
                background: bgObj
            })
            .png()
            .toFile('public/icon-512-new.png');

        await sharp('public/icon-512-new.png')
            .resize(192, 192)
            .png()
            .toFile('public/icon-192-new.png');

        fs.writeFileSync('bg_color.txt', hexColor);
    } catch (e) { console.error('Error:', e); }
}

extractAndPad();
