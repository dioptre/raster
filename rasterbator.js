/**
 * Rasterbator.js - JavaScript implementation of the Rasterbator image processing
 * Converts images into dot patterns suitable for printing across multiple pages
 */

class Rasterbator {
    constructor() {
        this.resolution = 144; // DPI
        this.maxRadius = 10; // Maximum dot radius
        this.dotColor = '#000000';
        this.useAverageColor = false;
    }

    /**
     * Convert image to rasterbated format
     * @param {HTMLImageElement} image - Source image
     * @param {Object} options - Configuration options
     * @returns {Promise<Array>} Array of canvas elements for each page
     */
    async rasterize(image, options = {}) {
        const config = {
            pagesWide: options.pagesWide || 1,
            pagesHigh: options.pagesHigh || 1,
            paperWidth: options.paperWidth || 210, // mm (A4)
            paperHeight: options.paperHeight || 297, // mm (A4)
            targetWidth: options.targetWidth || 1024,
            dotSize: options.dotSize || 5, // mm
            usePixels: options.usePixels || false,
            colorMode: options.colorMode || 'mono',
            dotColor: options.dotColor || '#000000',
            backgroundRemoval: options.backgroundRemoval || false,
            backgroundColor: options.backgroundColor || '#ffffff',
            backgroundThreshold: options.backgroundThreshold || 20,
            ...options
        };
        
        // Set the instance dot color for mono mode
        this.dotColor = config.dotColor;

        // Calculate dimensions
        const aspectRatio = image.height / image.width;
        const targetHeight = config.targetWidth * aspectRatio;
        
        // Convert paper size to pixels
        const paperWidthPx = config.usePixels ? config.paperWidth : (config.paperWidth / 25.4 * this.resolution);
        const paperHeightPx = config.usePixels ? config.paperHeight : (config.paperHeight / 25.4 * this.resolution);
        
        // Calculate image dimensions in mm/px
        const imageWidth = config.usePixels ? config.targetWidth : (config.targetWidth / this.resolution * 25.4);
        const imageHeight = config.usePixels ? targetHeight : (targetHeight / this.resolution * 25.4);
        
        // Calculate dot properties
        const dotSizePx = config.usePixels ? config.dotSize : (config.dotSize / 25.4 * this.resolution);
        const squareSize = dotSizePx * 1.2; // Space between dot centers
        
        const squaresX = Math.floor(paperWidthPx / squareSize);
        const squaresY = Math.floor(paperHeightPx / squareSize);
        
        // Create canvas for image processing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = config.targetWidth;
        canvas.height = targetHeight;
        
        // Draw and get image data
        ctx.drawImage(image, 0, 0, config.targetWidth, targetHeight);
        const imageData = ctx.getImageData(0, 0, config.targetWidth, targetHeight);
        
        // Generate pages
        const pages = [];
        for (let py = 0; py < config.pagesHigh; py++) {
            for (let px = 0; px < config.pagesWide; px++) {
                const pageCanvas = this.createPage(
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

    createPage(imageData, px, py, config, paperWidth, paperHeight, squareSize, squaresX, squaresY, maxDotRadius) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = paperWidth;
        canvas.height = paperHeight;
        
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
                
                // Calculate area for sampling
                const areaSize = Math.max(1, Math.floor(squareSize * scaleX));
                const startX = Math.floor(globalX * scaleX - areaSize / 2);
                const startY = Math.floor(globalY * scaleY - areaSize / 2);
                const endX = Math.min(imageData.width - 1, startX + areaSize);
                const endY = Math.min(imageData.height - 1, startY + areaSize);
                
                if (startX >= 0 && startY >= 0 && startX < imageData.width && startY < imageData.height) {
                    const areaData = this.analyzeArea(imageData, startX, startY, endX, endY, config);
                    
                    // Skip if background removal is enabled and this area matches background
                    if (config.backgroundRemoval && areaData.isBackground) {
                        // Check if we should preserve edges
                        if (config.preserveEdges) {
                            const isEdge = this.detectEdge(imageData, startX, startY, endX, endY, config);
                            if (!isEdge) {
                                continue;
                            }
                        } else {
                            continue;
                        }
                    }
                    
                    const radius = (1 - areaData.brightness) * maxDotRadius / 2;
                    
                    if (radius > 0.5) {
                        // Choose color based on mode
                        let dotColor = this.dotColor;
                        if (config.colorMode === 'multi' || config.colorMode === 'average') {
                            dotColor = `rgb(${areaData.color.r}, ${areaData.color.g}, ${areaData.color.b})`;
                        }
                        
                        ctx.fillStyle = dotColor;
                        ctx.beginPath();
                        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }
        
        return canvas;
    }

    analyzeArea(imageData, startX, startY, endX, endY, config) {
        let totalR = 0, totalG = 0, totalB = 0;
        let totalBrightness = 0;
        let pixelCount = 0;
        
        // Color frequency for dominant color detection
        const colorMap = new Map();
        
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const color = this.getPixelColor(imageData, x, y);
                const brightness = this.getPixelBrightness(imageData, x, y);
                
                totalR += color.r;
                totalG += color.g;
                totalB += color.b;
                totalBrightness += brightness;
                pixelCount++;
                
                // For dominant color detection, quantize colors to reduce noise
                if (config.colorMode === 'multi') {
                    const quantizedR = Math.floor(color.r / 32) * 32;
                    const quantizedG = Math.floor(color.g / 32) * 32;
                    const quantizedB = Math.floor(color.b / 32) * 32;
                    const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;
                    
                    colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
                }
            }
        }
        
        const avgR = Math.round(totalR / pixelCount);
        const avgG = Math.round(totalG / pixelCount);
        const avgB = Math.round(totalB / pixelCount);
        const avgBrightness = totalBrightness / pixelCount;
        
        let finalColor = { r: avgR, g: avgG, b: avgB };
        
        // Get dominant color for multicolor mode
        if (config.colorMode === 'multi' && colorMap.size > 0) {
            let maxCount = 0;
            let dominantColor = null;
            
            for (const [colorKey, count] of colorMap.entries()) {
                if (count > maxCount) {
                    maxCount = count;
                    dominantColor = colorKey;
                }
            }
            
            if (dominantColor) {
                const [r, g, b] = dominantColor.split(',').map(Number);
                finalColor = { r, g, b };
            }
        }
        
        // Check if this area should be considered background
        let isBackground = false;
        if (config.backgroundRemoval && config.backgroundColor) {
            const bgColor = this.hexToRgb(config.backgroundColor);
            const threshold = (config.backgroundThreshold || 20) / 100;
            
            const colorDistance = this.colorDistance(finalColor, bgColor) / 255;
            isBackground = colorDistance < threshold;
        }
        
        return {
            color: finalColor,
            brightness: avgBrightness,
            isBackground: isBackground
        };
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    }

    colorDistance(color1, color2) {
        const dr = color1.r - color2.r;
        const dg = color1.g - color2.g;
        const db = color1.b - color2.b;
        return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    detectEdge(imageData, startX, startY, endX, endY, config) {
        // Simple edge detection using surrounding areas
        const bgColor = this.hexToRgb(config.backgroundColor);
        const threshold = (config.backgroundThreshold || 20) / 100;
        
        // Check surrounding areas (expanded by 2 pixels in each direction)
        const surroundStartX = Math.max(0, startX - 2);
        const surroundStartY = Math.max(0, startY - 2);
        const surroundEndX = Math.min(imageData.width - 1, endX + 2);
        const surroundEndY = Math.min(imageData.height - 1, endY + 2);
        
        let backgroundPixels = 0;
        let nonBackgroundPixels = 0;
        
        for (let y = surroundStartY; y < surroundEndY; y++) {
            for (let x = surroundStartX; x < surroundEndX; x++) {
                const color = this.getPixelColor(imageData, x, y);
                const distance = this.colorDistance(color, bgColor) / 255;
                
                if (distance < threshold) {
                    backgroundPixels++;
                } else {
                    nonBackgroundPixels++;
                }
            }
        }
        
        // If there's a mix of background and non-background pixels, it's likely an edge
        const totalPixels = backgroundPixels + nonBackgroundPixels;
        const backgroundRatio = backgroundPixels / totalPixels;
        
        // Consider it an edge if 20-80% of surrounding pixels are background
        // This indicates a transition area
        return backgroundRatio > 0.2 && backgroundRatio < 0.8;
    }

    getPixelBrightness(imageData, x, y) {
        const index = (y * imageData.width + x) * 4;
        const r = imageData.data[index];
        const g = imageData.data[index + 1];
        const b = imageData.data[index + 2];
        
        // Standard brightness calculation
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    }

    getPixelColor(imageData, x, y) {
        const index = (y * imageData.width + x) * 4;
        return {
            r: imageData.data[index],
            g: imageData.data[index + 1],
            b: imageData.data[index + 2]
        };
    }

    /**
     * Download pages as images (browser only)
     * @param {Array} pages - Array of canvas elements
     * @param {string} baseName - Base filename
     */
    downloadPages(pages, baseName = 'rasterbator_page') {
        if (typeof window === 'undefined') {
            throw new Error('Download only available in browser environment');
        }

        pages.forEach((canvas, index) => {
            const link = document.createElement('a');
            link.download = `${baseName}_${(index + 1).toString().padStart(2, '0')}.png`;
            link.href = canvas.toDataURL();
            link.click();
        });
    }

    /**
     * Save pages to files (Node.js only)
     * @param {Array} pages - Array of canvas elements  
     * @param {string} baseName - Base filename
     */
    async savePages(pages, baseName = 'rasterbator_page') {
        if (typeof window !== 'undefined') {
            throw new Error('savePages only available in Node.js environment');
        }

        const fs = require('fs').promises;
        
        for (let i = 0; i < pages.length; i++) {
            const canvas = pages[i];
            const filename = `${baseName}_${(i + 1).toString().padStart(2, '0')}.png`;
            
            // Convert canvas to buffer (Node.js canvas library)
            const buffer = canvas.toBuffer('image/png');
            await fs.writeFile(filename, buffer);
        }
    }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Rasterbator;
} else if (typeof window !== 'undefined') {
    window.Rasterbator = Rasterbator;
}