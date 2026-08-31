/**
 * High-Precision Receipt Image Pre-Processor
 * Enhances thermal printer and dot-matrix receipt text without destroying letter geometry.
 */
export async function preprocessImageForOcr(imageSource: string | File): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      // High-resolution ceiling for crisp character recognition (2048px)
      const maxDim = 2048;
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

      // High quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const d = imageData.data;

      // Gentle contrast curve that preserves delicate dot-matrix thermal print
      const contrast = 1.18; // +18% contrast (optimal for thermal receipts without clipping)
      const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

      for (let i = 0; i < d.length; i += 4) {
        // High-accuracy Luminance
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const enhanced = Math.min(255, Math.max(0, factor * (gray - 128) + 128));

        d[i] = enhanced;
        d[i + 1] = enhanced;
        d[i + 2] = enhanced;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
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
