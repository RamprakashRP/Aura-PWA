/**
 * High-Performance Image Pre-Processor for Receipt OCR
 * Applies scaling, grayscale conversion, and contrast enhancement
 * to dramatically improve Tesseract text recognition accuracy on phone camera photos.
 */
export async function preprocessImageForOcr(imageSource: string | File): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      // Calculate optimal OCR dimensions (max width 1600px for speed and clarity)
      const maxDim = 1600;
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

      // Draw scaled image
      ctx.drawImage(img, 0, 0, width, height);

      // Extract pixel data for contrast enhancement
      const imageData = ctx.getImageData(0, 0, width, height);
      const d = imageData.data;

      // High-contrast grayscale conversion (enhancing dark text against receipt paper)
      const contrast = 1.35; // +35% contrast
      const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

      for (let i = 0; i < d.length; i += 4) {
        // Luminance grayscale
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        // Apply contrast factor
        const enhanced = Math.min(255, Math.max(0, factor * (gray - 128) + 128));

        // Slight thresholding to make text crisper
        const finalVal = enhanced < 140 ? Math.max(0, enhanced - 20) : Math.min(255, enhanced + 20);

        d[i] = finalVal;
        d[i + 1] = finalVal;
        d[i + 2] = finalVal;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
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
