import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_ICON = path.join(__dirname, '../public/icon.svg');
const PUBLIC_DIR = path.join(__dirname, '../public');

async function generateIcons() {
    console.log('Generating icons from public/icon.svg...');

    if (!fs.existsSync(SOURCE_ICON)) {
        console.error('Error: public/icon.svg not found!');
        process.exit(1);
    }

    const sizes = [
        { name: 'logo192.png', size: 192 },
        { name: 'logo512.png', size: 512 },
        { name: 'apple-touch-icon.png', size: 180 } // Good practice for iOS
    ];

    try {
        // Standard PWA Icons (Transparent background)
        const pwaIcons = [
            { name: 'pwa-192x192.png', size: 192 },
            { name: 'pwa-512x512.png', size: 512 },
            { name: 'apple-touch-icon.png', size: 180 }
        ];

        for (const { name, size } of pwaIcons) {
            await sharp(SOURCE_ICON)
                .resize(size, size)
                .png()
                .toFile(path.join(PUBLIC_DIR, name));
            console.log(`✅ Generated ${name}`);
        }

        // Generate Maskable Icon (Safe zone compliant)
        // Background color #1e293b to match theme
        const MASKABLE_SIZE = 512;
        const ICON_SIZE = Math.floor(MASKABLE_SIZE * 0.65); // ~332px (Safe zone is within circle)

        const background = await sharp({
            create: {
                width: MASKABLE_SIZE,
                height: MASKABLE_SIZE,
                channels: 4,
                background: '#1e293b'
            }
        }).png().toBuffer();

        const iconBuffer = await sharp(SOURCE_ICON)
            .resize(ICON_SIZE, ICON_SIZE)
            .png()
            .toBuffer();

        await sharp(background)
            .composite([{ input: iconBuffer, gravity: 'center' }])
            .toFile(path.join(PUBLIC_DIR, 'maskable-icon-512x512.png'));

        console.log(`✅ Generated maskable-icon-512x512.png`);

        // Favicon
        await sharp(SOURCE_ICON)
            .resize(64, 64)
            .png()
            .toFile(path.join(PUBLIC_DIR, 'favicon.ico')); // VitePWA can use png as ico roughly or just use png
        // Actually let's just make a png and updating config to point to it if needed, 
        // but explicit requirements said valid sizes.

        console.log(`✅ Generated favicon.ico`);

    } catch (error) {
        console.error('❌ Error generating icons:', error);
        process.exit(1);
    }
}

generateIcons();
