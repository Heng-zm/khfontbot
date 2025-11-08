// services/imageService.js

const { createCanvas, registerFont } = require('canvas');
const path = require('path');
const strings = require('../localization');
const { logger } = require('./logger');

// --- Fallback Font Registration ---
// We register a reliable Khmer font at startup to ensure Khmer text always renders.
let fallbackFontFamily = 'sans-serif'; // Use a generic system font as a last resort.
const fallbackFontPath = path.join(__dirname, '..', 'assets', 'KhmerOSSiemreap-Regular.ttf');

try {
    registerFont(fallbackFontPath, { family: 'KhmerOSFallback' });
    fallbackFontFamily = 'KhmerOSFallback'; // Only assign the custom name if registration succeeds.
    logger.info('Khmer fallback font registered successfully.');
} catch (error) {
    logger.warn(`Could not register Khmer fallback font. Previews may not show Khmer text correctly. Error: ${error.message}`);
}

/**
 * Creates a standard error image when a font fails to load.
 * @param {string} errorMessage - The message to display on the image.
 * @returns {Buffer} A PNG image buffer.
 */
function createErrorImage(errorMessage) {
    const canvas = createCanvas(700, 220);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f8d7da'; // Light red background
    ctx.fillRect(0, 0, 700, 220);
    ctx.fillStyle = '#721c24'; // Dark red text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 24px "${fallbackFontFamily}"`;
    
    const lines = errorMessage.split('\n');
    ctx.fillText(lines[0], 350, 90);
    if (lines[1]) {
        ctx.font = `20px "monospace"`;
        ctx.fillText(lines[1], 350, 125);
    }
    
    return canvas.toBuffer('image/png');
}

/**
 * Generates a high-quality PNG buffer showing a preview of a given font.
 * It's robust against font registration failures and uses a fallback for unsupported characters.
 * 
 * @param {string} fontPath - Absolute path to the .ttf or .otf file.
 * @param {string} fontName - The name of the font to display.
 * @returns {Buffer} A PNG image buffer.
 */
function generateFontPreview(fontPath, fontName) {
    let targetFontFamily;

    // Attempt to register the target font.
    try {
        const uniqueFamilyName = `TargetFont-${Date.now()}-${Math.random()}`;
        registerFont(fontPath, { family: uniqueFamilyName });
        targetFontFamily = uniqueFamilyName; // Assign only if registration succeeds.
    } catch (error) {
        logger.error(`Could not register font: ${fontName}. Using fallback only. Error: ${error.message}`);
        // If registration fails, targetFontFamily remains undefined.
        // The drawing logic below will handle this gracefully.
    }

    const canvasWidth = 700;
    const canvasHeight = 220;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // 1. Draw a clean background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.strokeStyle = '#E9ECEF';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

    // 2. Safely construct the font stack for Pango.
    // If targetFontFamily is undefined, it will be ignored, preventing Pango errors.
    const fontStackParts = [];
    if (targetFontFamily) {
        fontStackParts.push(`"${targetFontFamily}"`);
    }
    fontStackParts.push(`"${fallbackFontFamily}"`);
    fontStackParts.push('sans-serif');
    const fontStack = fontStackParts.join(', ');

    // 3. Draw the font's own name at the top
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#212529';
    ctx.font = `bold 26px ${fontStack}`;
    ctx.fillText(fontName, 25, 20);

    // 4. Draw a separator line
    ctx.strokeStyle = '#DEE2E6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(25, 65);
    ctx.lineTo(canvasWidth - 25, 65);
    ctx.stroke();

    // 5. Draw the Khmer sample text (larger)
    ctx.font = `42px ${fontStack}`;
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'middle';
    ctx.fillText(strings.previewTextKhmer, 25, 115);

    // 6. Draw the Latin sample text (smaller)
    ctx.font = `32px ${fontStack}`;
    ctx.fillStyle = '#495057';
    ctx.fillText(strings.previewTextLatin, 25, 175);

    // 7. Draw a subtle watermark
    ctx.font = `14px "sans-serif"`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(strings.previewWatermark, canvasWidth - 20, canvasHeight - 15);

    return canvas.toBuffer('image/png');
}

module.exports = { 
    generateFontPreview,
    // We export createErrorImage in case it's needed elsewhere, though it's mainly internal.
    createErrorImage 
};