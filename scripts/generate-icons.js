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
        // Generate PNGs
        for (const { name, size } of sizes) {
            await sharp(SOURCE_ICON)
                .resize(size, size)
                .png()
                .toFile(path.join(PUBLIC_DIR, name));
            console.log(`✅ Generated ${name} (${size}x${size})`);
        }

        // Generate favicon.ico (usually requires specific sizes, but for simplicity we can just make a small png or use a specialized ico generator. 
        // Sharp can output to .ico if configured, but let's stick to a small PNG for favicon behavior or try standard ico sizes if sharp supports it easily.
        // Actually, modern browsers support PNG favicons. Let's make a 64x64 PNG and call it favicon.png, or just overwrite the .ico if we want to be fancy.
        // For now, let's just make a 32x32 PNG which is standard for favicon usage if we don't do full .ico files.
        // However, to replace the Vite 'favicon.ico', we might want to try to output an ico. 
        // Sharp doesn't natively support writing .ico files directly in all versions reliably without plugins.
        // Let's verify if we can output a small png and just use that or use a simple resizing.

        // For simplicity and robustness, let's output a 64x64 PNG as favicon.png, and update index.html to point to it.
        // We will ALSO try to overwrite favicon.ico with a 32x32 png (though technically incorrect format, some browsers handle it, but better to use .png in link tag).

        await sharp(SOURCE_ICON)
            .resize(32, 32)
            .png()
            .toFile(path.join(PUBLIC_DIR, 'favicon-32x32.png'));
        console.log(`✅ Generated favicon-32x32.png`);

    } catch (error) {
        console.error('❌ Error generating icons:', error);
        process.exit(1);
    }
}

generateIcons();
