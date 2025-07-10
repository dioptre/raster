# Rasterbator.js

Convert images into dot patterns for large-scale printing across multiple pages.

Example:


<img width="362" alt="Screenshot 2025-07-10 at 12 28 27 PM" src="https://github.com/user-attachments/assets/1026c95b-cdd8-4a60-817a-48dfcee45b3e" />


## Quick Start

### GitHub Pages (Live Demo)
Visit the live demo: [https://dioptre.github.io/rasterbator.js/](https://dioptre.github.io/rasterbator.js/)

### Local Development
```bash
npm start
```

This starts a local server at http://localhost:3000 and opens the web interface automatically.

## Features

### Image Processing
- **Aspect Ratio Preservation**: Automatically maintains image proportions
- **Multi-page Output**: Split large images across multiple pages
- **Flexible Paper Sizes**: Support for mm or pixel units

### Color Options
- **Single Color**: Use manual color picker (default: black)
- **Multicolor (Dominant)**: Uses most frequent color in each dot area
- **Average Color**: Uses average color of pixels in each dot area

### Background Removal
- **Smart Background Removal**: Remove solid backgrounds with threshold control
- **Edge Preservation**: Retains object borders while removing background
- **Color Picker**: Select exact background color to remove

### Output Options
- **Web**: Preview and download individual page images
- **Node.js**: Auto-save to files (requires `npm install` for canvas dependency)

## Basic Usage

1. **Load Image**: Upload or use the default money_cat.png
2. **Set Dimensions**: 
   - Paper width/height (leave one blank for auto-calculation)
   - Pages wide/high for multi-page posters
3. **Configure Dots**:
   - Dot size (larger = more visible from distance)
   - Color mode (mono/multicolor/average)
4. **Background Removal** (optional):
   - Check "Background Removal"
   - Pick background color
   - Adjust threshold sensitivity
5. **Render**: Click "Render Rasterbator"
6. **Download**: Use "Download All Pages" to save PNG files

## Node.js Usage

```bash
npm install  # Install canvas dependency
npm run demo # Run Node.js example
```

The Node.js version automatically saves rendered pages as PNG files to the `output/` directory.

## Paper Size Presets

- **A4**: 210mm × 297mm
- **Pixels**: 800px × 600px (adjustable)

Leave one dimension blank to auto-calculate based on image aspect ratio.
