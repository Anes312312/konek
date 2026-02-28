const sharp = require('sharp');

async function extractLogoForSplash() {
    const imagePath = 'public/splash.png';

    // Cut out only the chat bubble area from the center
    // splash.png is 2125 x 1536. Let's find the center logo dimensions.
    // The user's logo is right in the center. We'll extract a square in the middle.

    const width = 2125;
    const height = 1536;
    const extractSize = 700; // Estimated box bounding the clay chat bubble

    const left = Math.floor((width - extractSize) / 2);
    const top = Math.floor((height - extractSize) / 2) - 80; // slightly offset usually

    await sharp(imagePath)
        .extract({ left, top, width: extractSize, height: extractSize })
        .resize(512, 512)
        .toFile('public/splash-icon-512.png');

    console.log("Created splash-icon-512.png");
}

extractLogoForSplash();
