import { VisualStyle } from '../types/card';

/**
 * Applies procedural canvas artistic stylization to an image based on the chosen visual style.
 * Returns a high-res base64 dataURL with the stylized result.
 */
export async function applyArtisticFilter(
  imageSrc: string,
  style: VisualStyle
): Promise<string> {
  if (style === 'Manter Imagem Original') {
    return imageSrc;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        // Set high-res canvas size (keeping aspect ratio, around 800x600 for card art)
        const targetWidth = 800;
        const targetHeight = Math.round((img.height / img.width) * targetWidth);
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        if (style === 'Pixel Art') {
          // Downsample and upsample for authentic retro pixel art
          const pixelFactor = 0.12; // 12% scale
          const smallW = Math.max(16, Math.floor(targetWidth * pixelFactor));
          const smallH = Math.max(16, Math.floor(targetHeight * pixelFactor));

          const smallCanvas = document.createElement('canvas');
          smallCanvas.width = smallW;
          smallCanvas.height = smallH;
          const smallCtx = smallCanvas.getContext('2d');

          if (smallCtx) {
            smallCtx.imageSmoothingEnabled = false;
            smallCtx.drawImage(img, 0, 0, smallW, smallH);

            // Enhance pixel color vibrancy
            const imgData = smallCtx.getImageData(0, 0, smallW, smallH);
            const d = imgData.data;
            for (let i = 0; i < d.length; i += 4) {
              // Quantize colors to 16-color style palette
              d[i] = Math.round(d[i] / 32) * 32;
              d[i + 1] = Math.round(d[i + 1] / 32) * 32;
              d[i + 2] = Math.round(d[i + 2] / 32) * 32;
            }
            smallCtx.putImageData(imgData, 0, 0);

            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(smallCanvas, 0, 0, targetWidth, targetHeight);
          } else {
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          }
        } else if (style === 'Cyberpunk/Futurista') {
          // Draw image with cyberpunk neon tint, scanlines & chromatic offset
          ctx.filter = 'contrast(130%) saturate(160%) brightness(105%)';
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // Neon color overlay
          const grad = ctx.createLinearGradient(0, 0, targetWidth, targetHeight);
          grad.addColorStop(0, 'rgba(6, 182, 212, 0.25)'); // Cyan
          grad.addColorStop(0.5, 'transparent');
          grad.addColorStop(1, 'rgba(236, 72, 153, 0.3)'); // Magenta
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, targetWidth, targetHeight);

          // Subtle scanlines
          ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
          for (let y = 0; y < targetHeight; y += 4) {
            ctx.fillRect(0, y, targetWidth, 1.5);
          }
        } else if (style === 'Anime') {
          // Cel-shading / high vibrancy anime aesthetic
          ctx.filter = 'contrast(125%) saturate(150%) brightness(110%)';
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // Soft highlight bloom
          const bloomGrad = ctx.createRadialGradient(
            targetWidth * 0.5,
            targetHeight * 0.4,
            50,
            targetWidth * 0.5,
            targetHeight * 0.5,
            targetWidth * 0.8
          );
          bloomGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
          bloomGrad.addColorStop(1, 'rgba(236, 72, 153, 0.1)');
          ctx.fillStyle = bloomGrad;
          ctx.fillRect(0, 0, targetWidth, targetHeight);
        } else if (style === 'Fantasia Medieval') {
          // Rich oil painting / parchment oil brush aesthetic
          ctx.filter = 'contrast(115%) saturate(120%) sepia(20%)';
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // Warm fantasy vignette
          const vignette = ctx.createRadialGradient(
            targetWidth / 2,
            targetHeight / 2,
            targetWidth / 4,
            targetWidth / 2,
            targetHeight / 2,
            targetWidth / 1.3
          );
          vignette.addColorStop(0, 'transparent');
          vignette.addColorStop(1, 'rgba(25, 12, 4, 0.45)');
          ctx.fillStyle = vignette;
          ctx.fillRect(0, 0, targetWidth, targetHeight);
        } else {
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        }

        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (err) {
        console.error('Error applying canvas filter:', err);
        resolve(imageSrc);
      }
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}
