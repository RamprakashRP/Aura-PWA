/**
 * Adaptive Receipt Pre-Processor with Otsu Binarization & DPI Normalization
 * Converts phone photos of thermal receipts into crisp, high-contrast black-and-white text
 * which maximizes Tesseract character recognition accuracy.
 */
export async function preprocessImageForOcr(imageSource: string | File): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      // Scale image to standard OCR width (1800px)
      const targetWidth = 1800;
      let width = img.width;
      let height = img.height;

      if (width !== targetWidth) {
        height = Math.round((height * targetWidth) / width);
        width = targetWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const totalPixels = width * height;

      // 1. Calculate Histogram for Otsu's Thresholding
      const histogram = new Array(256).fill(0);
      const grayscale = new Uint8Array(totalPixels);

      for (let i = 0; i < totalPixels; i++) {
        const offset = i * 4;
        // Standard Rec. 709 Luminance
        const gray = Math.round(0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2]);
        grayscale[i] = gray;
        histogram[gray]++;
      }

      // 2. Otsu's Threshold Algorithm
      let sum = 0;
      for (let t = 0; t < 256; t++) sum += t * histogram[t];

      let sumB = 0;
      let wB = 0;
      let wF = 0;
      let varMax = 0;
      let threshold = 128;

      for (let t = 0; t < 256; t++) {
        wB += histogram[t];
        if (wB === 0) continue;
        wF = totalPixels - wB;
        if (wF === 0) break;

        sumB += t * histogram[t];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;

        const varBetween = wB * wF * (mB - mF) * (mB - mF);
        if (varBetween > varMax) {
          varMax = varBetween;
          threshold = t;
        }
      }

      // Slightly bias threshold towards preserving thin thermal strokes
      const optimalThreshold = Math.max(90, Math.min(180, threshold - 10));

      // 3. Apply Threshold (Pure Crisp Black & White)
      for (let i = 0; i < totalPixels; i++) {
        const offset = i * 4;
        const val = grayscale[i] < optimalThreshold ? 0 : 255;
        data[offset] = val;
        data[offset + 1] = val;
        data[offset + 2] = val;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
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
