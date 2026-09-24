/**
 * Downscales an image File to fit within maxDimension x maxDimension pixels
 * maintaining the original aspect ratio.
 */
export async function downscaleImage(file: File, maxDimension: number = 150): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (!src) return reject(new Error('Empty image file'));

      // If svg, return directly as base64/data URI
      if (file.type === 'image/svg+xml') {
        return resolve(src);
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image for resizing'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Proportional scale down to maxDimension (e.g. 150px)
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(src);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
        const downscaled = canvas.toDataURL(mimeType, 0.92);
        resolve(downscaled);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
