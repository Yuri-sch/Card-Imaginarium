/**
 * Compresses and normalizes an image file or dataURL to an optimized size (max ~900px, JPEG 0.85).
 * This ensures lightning-fast upload, prevents Nginx 413 "Request Entity Too Large" HTML errors,
 * and maintains pristine visual quality for both Gemini Flash and card rendering.
 */
export async function optimizeUserImage(fileOrDataUrl: File | string): Promise<{
  dataUrl: string;
  mimeType: string;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const maxDim = 900;
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
          if (typeof fileOrDataUrl === 'string') {
            resolve({ dataUrl: fileOrDataUrl, mimeType: 'image/jpeg' });
          } else {
            reject(new Error('Falha ao processar a imagem no navegador.'));
          }
          return;
        }

        // Draw and compress to clean JPEG
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve({
          dataUrl: compressedDataUrl,
          mimeType: 'image/jpeg',
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error('Não foi possível carregar a imagem. Verifique se o arquivo está corrompido.'));
    };

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo do dispositivo.'));
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}
