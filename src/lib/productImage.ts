import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const BUCKET = 'product-images';
const MAX_DIMENSION = 800;
const JPEG_QUALITY = 0.8;

async function compressToDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Não foi possível ler o ficheiro'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Ficheiro de imagem inválido'));
    image.src = dataUrl;
  });

  let { width, height } = img;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

function extensionFor(file: File): string {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';
  return 'jpg';
}

/**
 * Guarda a foto de um produto. Tenta Supabase Storage e, se falhar
 * (bucket por configurar), usa base64 como fallback para nunca perder a foto.
 */
export async function uploadProductImage(
  file: File,
  businessId: string,
  productId: string,
): Promise<string> {
  const compressed = await compressToDataUrl(file);

  if (isSupabaseConfigured() && businessId) {
    try {
      const blob = await (await fetch(compressed)).blob();
      const path = `${businessId}/${productId}-${Date.now()}.${extensionFor(file)}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false });
      if (!error) {
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        if (data?.publicUrl) return data.publicUrl;
      }
    } catch {
      // Segue para o fallback base64 abaixo
    }
  }

  return compressed;
}
