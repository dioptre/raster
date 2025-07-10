/**
 * Node.js example for Rasterbator.js
 * Requires: npm install canvas
 */

const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const Rasterbator = require('./rasterbator');

// Override for Node.js canvas compatibility
class NodeRasterbator extends Rasterbator {
    async rasterize(imagePath, options = {}) {
        const image = await loadImage(imagePath);
        
        const config = {
            pagesWide: options.pagesWide || 1,
            pagesHigh: options.pagesHigh || 1,
            paperWidth: options.paperWidth || 210, // mm (A4)
            paperHeight: options.paperHeight || 297, // mm (A4)
            targetWidth: options.targetWidth || 1024,
            dotSize: options.dotSize || 5, // mm
            usePixels: options.usePixels || false,
            ...options
        };

        // Calculate dimensions
        const aspectRatio = image.height / image.width;
        const targetHeight = config.targetWidth * aspectRatio;
        
        // Convert paper size to pixels
        const paperWidthPx = config.usePixels ? config.paperWidth : (config.paperWidth / 25.4 * this.resolution);
        const paperHeightPx = config.usePixels ? config.paperHeight : (config.paperHeight / 25.4 * this.resolution);
        
        // Calculate dot properties
        const dotSizePx = config.usePixels ? config.dotSize : (config.dotSize / 25.4 * this.resolution);
        const squareSize = dotSizePx * 1.2;
        
        const squaresX = Math.floor(paperWidthPx / squareSize);
        const squaresY = Math.floor(paperHeightPx / squareSize);
        
        // Create canvas for image processing
        const canvas = createCanvas(config.targetWidth, targetHeight);
        const ctx = canvas.getContext('2d');
        
        // Draw and get image data
        ctx.drawImage(image, 0, 0, config.targetWidth, targetHeight);
        const imageData = ctx.getImageData(0, 0, config.targetWidth, targetHeight);
        
        // Generate pages using Node.js canvas
        const pages = [];
        for (let py = 0; py < config.pagesHigh; py++) {
            for (let px = 0; px < config.pagesWide; px++) {
                const pageCanvas = this.createNodePage(
                    imageData, 
                    px, py, 
                    config, 
                    paperWidthPx, paperHeightPx, 
                    squareSize, squaresX, squaresY,
                    dotSizePx
                );
                pages.push(pageCanvas);
            }
        }
        
        return pages;
    }

    createNodePage(imageData, px, py, config, paperWidth, paperHeight, squareSize, squaresX, squaresY, maxDotRadius) {
        const canvas = createCanvas(paperWidth, paperHeight);
        const ctx = canvas.getContext('2d');
        
        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, paperWidth, paperHeight);
        
        const pxOffset = paperWidth * px;
        const pyOffset = paperHeight * py;
        
        const totalWidth = paperWidth * config.pagesWide;
        const totalHeight = paperHeight * config.pagesHigh;
        
        // Calculate scaling factors
        const scaleX = imageData.width / totalWidth;
        const scaleY = imageData.height / totalHeight;
        
        // Draw dots for each square
        for (let sy = 0; sy < squaresY; sy++) {
            for (let sx = 0; sx < squaresX; sx++) {
                const centerX = (sx + 0.5) * squareSize;
                const centerY = (sy + 0.5) * squareSize;
                
                // Map to global coordinates
                const globalX = pxOffset + centerX;
                const globalY = pyOffset + centerY;
                
                // Map to image coordinates
                const imgX = Math.floor(globalX * scaleX);
                const imgY = Math.floor(globalY * scaleY);
                
                if (imgX >= 0 && imgX < imageData.width && imgY >= 0 && imgY < imageData.height) {
                    const brightness = this.getPixelBrightness(imageData, imgX, imgY);
                    const radius = (1 - brightness) * maxDotRadius / 2;
                    
                    if (radius > 0.5) {
                        if (this.useAverageColor) {
                            const color = this.getPixelColor(imageData, imgX, imgY);
                            ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
                        } else {
                            ctx.fillStyle = this.dotColor;
                        }
                        
                        ctx.beginPath();
                        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }
        
        return canvas;
    }

    async savePages(pages, baseName = 'rasterbator_page') {
        for (let i = 0; i < pages.length; i++) {
            const canvas = pages[i];
            const filename = `${baseName}_${(i + 1).toString().padStart(2, '0')}.png`;
            
            const buffer = canvas.toBuffer('image/png');
            await fs.promises.writeFile(filename, buffer);
            console.log(`Saved: ${filename}`);
        }
    }
}

// Example usage
async function example() {
    try {
        console.log('Starting rasterbator process...');
        
        const rasterbator = new NodeRasterbator();
        
        const pages = await rasterbator.rasterize('money_cat.png', {
            pagesWide: 1,
            pagesHigh: 1,
            targetWidth: 1024,
            paperWidth: 210, // A4 width in mm
            paperHeight: 297, // A4 height in mm
            dotSize: 5
        });
        
        console.log(`Generated ${pages.length} page(s)`);
        
        await rasterbator.savePages(pages, 'output/rasterbator_page');
        
        console.log('Rasterbator process completed!');
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Create output directory if it doesn't exist
if (!fs.existsSync('output')) {
    fs.mkdirSync('output');
}

// Run example if this file is executed directly
if (require.main === module) {
    example();
}

module.exports = NodeRasterbator;