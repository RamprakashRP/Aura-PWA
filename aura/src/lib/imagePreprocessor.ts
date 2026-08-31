/**
 * Advanced Receipt Image Pre-Processor
 * 1. Erases dark textured background (wood floor, table, shadows) around the receipt paper
 * 2. Applies gentle linear contrast stretching to preserve faint dot-matrix character strokes
 */
export async function preprocessImageForOcr(imageSource: string | File): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const maxDim = 2000;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const d = imageData.data;

      // Calculate horizontal luminance column profile
      const colLuminance = new Float32Array(width);
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let count = 0;
        for (let y = Math.round(height * 0.1); y < Math.round(height * 0.9); y += 4) {
          const idx = (y * width + x) * 4;
          const lum = 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
          sum += lum;
          count++;
        }
        colLuminance[x] = count > 0 ? sum / count : 128;
      }

      let minLum = 255;
      let maxLum = 0;
      for (let x = 0; x < width; x++) {
        if (colLuminance[x] < minLum) minLum = colLuminance[x];
        if (colLuminance[x] > maxLum) maxLum = colLuminance[x];
      }

      const paperThreshold = minLum + (maxLum - minLum) * 0.4;
      let leftPaperX = 0;
      let rightPaperX = width - 1;

      for (let x = 0; x < width; x++) {
        if (colLuminance[x] >= paperThreshold) {
          leftPaperX = Math.max(0, x - 10);
          break;
        }
      }

      for (let x = width - 1; x >= 0; x--) {
        if (colLuminance[x] >= paperThreshold) {
          rightPaperX = Math.min(width - 1, x + 10);
          break;
        }
      }

      const paperWidth = rightPaperX - leftPaperX;
      const isColumnDetected = paperWidth > width * 0.25 && paperWidth < width * 0.95;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;

          // Outside receipt paper: paint pure white to eliminate table/floor wood grain noise
          if (isColumnDetected && (x < leftPaperX || x > rightPaperX)) {
            d[idx] = 255;
            d[idx + 1] = 255;
            d[idx + 2] = 255;
            continue;
          }

          const gray = 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
          const enhanced = Math.min(255, Math.max(0, (gray - 60) * (255 / 160)));

          d[idx] = enhanced;
          d[idx + 1] = enhanced;
          d[idx + 2] = enhanced;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };

    img.onerror = () => {
      resolve(typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource));
    };

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(imageSource);
    }
  });
}
