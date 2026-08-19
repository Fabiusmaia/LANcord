/** Reduz uma imagem pra um data URL JPEG dentro de um tamanho maximo,
 *  mantendo a proporcao original. Usado tanto pro anexo de imagem no chat
 *  quanto pra foto de perfil (com limites diferentes de tamanho/qualidade). */
export async function fileToCompressedDataUrl(
  file: File,
  maxDimension: number,
  quality: number
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D não suportado");
  ctx.drawImage(bitmap, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", quality);
}
