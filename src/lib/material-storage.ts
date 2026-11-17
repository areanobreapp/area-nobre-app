import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { getSupabaseStorageClient, DEFAULT_BUCKET } from './storage';

export const MAX_MATERIAL_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export const ALLOWED_MATERIAL_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.xlsx',
  '.xls',
  '.csv',
];

export const ALLOWED_MATERIAL_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'text/plain',
];

/**
 * Validação rigorosa de Magic Bytes para documentos e mídias
 */
export function validateMaterialMagicBytes(
  buffer: Buffer,
  filename: string
): { valid: boolean; detectedMime?: string; error?: string } {
  if (buffer.length < 4) {
    return { valid: false, error: 'Arquivo inválido ou corrompido.' };
  }

  const ext = path.extname(filename).toLowerCase();

  // 1. PDF: %PDF (25 50 44 46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return { valid: true, detectedMime: 'application/pdf' };
  }

  // 2. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedMime: 'image/jpeg' };
  }

  // 3. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, detectedMime: 'image/png' };
  }

  // 4. WEBP: RIFF .... WEBP
  if (buffer.length >= 12) {
    const isRiff = buffer.subarray(0, 4).toString('ascii') === 'RIFF';
    const isWebp = buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    if (isRiff && isWebp) {
      return { valid: true, detectedMime: 'image/webp' };
    }
  }

  // 5. XLSX (formato ZIP PK 03 04): 50 4B 03 04
  if (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
    (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08)
  ) {
    return {
      valid: true,
      detectedMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  // 6. XLS clássico OLE2: D0 CF 11 E0 A1 B1 1A E1
  if (
    buffer.length >= 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0
  ) {
    return { valid: true, detectedMime: 'application/vnd.ms-excel' };
  }

  // 7. CSV / Texto simples
  if (ext === '.csv' || ext === '.txt') {
    // Verifica se não contém bytes nulos executáveis
    const hasNullBytes = buffer.subarray(0, Math.min(1024, buffer.length)).includes(0x00);
    if (!hasNullBytes) {
      return { valid: true, detectedMime: 'text/csv' };
    }
  }

  return {
    valid: false,
    error: `Formato de arquivo não suportado ou assinatura binária inválida para '${ext}'. Formatos aceitos: PDF, XLSX, XLS, CSV, JPG, PNG e WEBP.`,
  };
}

/**
 * Upload seguro de Material Comercial
 */
export async function uploadCommercialMaterialFile(
  buffer: Buffer,
  originalFilename: string,
  developmentId: string,
  visibility: 'PUBLIC' | 'BROKERS_ONLY' | 'ADMIN_ONLY' = 'BROKERS_ONLY'
): Promise<{
  url: string;
  storagePath: string;
  fileType: string;
  fileExtension: string;
  fileSizeBytes: number;
}> {
  if (buffer.length > MAX_MATERIAL_SIZE_BYTES) {
    throw new Error(
      `O arquivo excede o limite máximo permitido de ${MAX_MATERIAL_SIZE_BYTES / (1024 * 1024)}MB.`
    );
  }

  const magic = validateMaterialMagicBytes(buffer, originalFilename);
  if (!magic.valid || !magic.detectedMime) {
    throw new Error(magic.error || 'Arquivo não autorizado.');
  }

  const rawExt = path.extname(originalFilename).toLowerCase();
  const ext = ALLOWED_MATERIAL_EXTENSIONS.includes(rawExt)
    ? rawExt
    : magic.detectedMime === 'application/pdf'
    ? '.pdf'
    : magic.detectedMime.includes('spreadsheet')
    ? '.xlsx'
    : magic.detectedMime === 'image/png'
    ? '.png'
    : '.jpg';

  const uniqueId = crypto.randomBytes(12).toString('hex');
  const safeFilename = `${uniqueId}${ext}`;

  // Se o material for restrito (ADMIN_ONLY ou BROKERS_ONLY), armazena sob o prefixo protected/
  const storagePath =
    visibility === 'PUBLIC'
      ? `developments/${developmentId}/materials/public/${safeFilename}`
      : `developments/${developmentId}/materials/protected/${safeFilename}`;

  const supabase = getSupabaseStorageClient();

  if (supabase) {
    const bucket = DEFAULT_BUCKET;
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, buffer, {
        contentType: magic.detectedMime,
        upsert: false,
      });

    if (error) {
      console.error('[Supabase Storage Material Upload Error]:', error);
      throw new Error(`Erro ao enviar arquivo para o Storage: ${error.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      url: publicUrlData.publicUrl,
      storagePath: data.path,
      fileType: magic.detectedMime,
      fileExtension: ext.replace('.', ''),
      fileSizeBytes: buffer.length,
    };
  }

  // Fallback local caso Supabase Storage não esteja configurado
  const localDir = path.join(process.cwd(), 'public', 'uploads', 'materials');
  await fs.mkdir(localDir, { recursive: true });
  await fs.writeFile(path.join(localDir, safeFilename), buffer);

  return {
    url: `/uploads/materials/${safeFilename}`,
    storagePath: `local/materials/${safeFilename}`,
    fileType: magic.detectedMime,
    fileExtension: ext.replace('.', ''),
    fileSizeBytes: buffer.length,
  };
}

/**
 * Gera URL temporária assinada para acesso seguro a materiais restritos
 */
export async function getSignedOrDirectUrl(
  material: { storagePath?: string | null; fileUrl: string; visibility: string },
  expiresInSeconds: number = 300,
  options?: { download?: string | boolean }
): Promise<string> {
  const supabase = getSupabaseStorageClient();

  // Para materiais restritos ou quando download explícito é solicitado
  if (supabase && material.storagePath && !material.storagePath.startsWith('local/')) {
    const { data } = await supabase.storage
      .from(DEFAULT_BUCKET)
      .createSignedUrl(material.storagePath, expiresInSeconds, options);

    if (data?.signedUrl) {
      return data.signedUrl;
    }
  }

  // Se for público sem necessidade de assinatura especial
  if (material.visibility === 'PUBLIC') {
    return material.fileUrl;
  }

  return material.fileUrl;
}

/**
 * Retorna o nome amigável e limpo para download com extensão correta
 */
export function getMaterialDownloadFilename(material: {
  title: string;
  fileExtension?: string | null;
}): string {
  const rawExt = material.fileExtension?.trim();
  const ext = rawExt
    ? rawExt.startsWith('.')
      ? rawExt.toLowerCase()
      : `.${rawExt.toLowerCase()}`
    : '';
  const cleanTitle = material.title
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ');

  if (ext && !cleanTitle.toLowerCase().endsWith(ext)) {
    return `${cleanTitle}${ext}`;
  }
  return cleanTitle || `material${ext}`;
}

/**
 * Cria uma resposta HTTP de streaming com Content-Disposition configurado
 * Permite tanto visualização inline segura quanto download como attachment
 */
export async function createMaterialStreamResponse(
  material: {
    id: string;
    title: string;
    fileUrl: string;
    storagePath?: string | null;
    fileType?: string | null;
    fileExtension?: string | null;
    fileSizeBytes?: number | null;
    visibility: string;
  },
  disposition: 'inline' | 'attachment' = 'attachment'
): Promise<Response> {
  const filename = getMaterialDownloadFilename(material);
  const safeAsciiFilename = filename.replace(/[^\x20-\x7E]/g, '_');
  const encodedFilename = encodeURIComponent(filename);

  const headers = new Headers();
  headers.set(
    'Content-Disposition',
    `${disposition}; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodedFilename}`
  );
  if (material.fileType) {
    headers.set('Content-Type', material.fileType);
  }
  if (material.fileSizeBytes) {
    headers.set('Content-Length', String(material.fileSizeBytes));
  }
  headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');

  // 1. Caso seja arquivo local em disco (fallback de desenvolvimento)
  if (material.storagePath && material.storagePath.startsWith('local/')) {
    const relativePath = material.storagePath.replace('local/', '');
    const localFilePath = path.join(process.cwd(), 'public', relativePath);
    try {
      const fileBuffer = await fs.readFile(localFilePath);
      return new Response(fileBuffer, { status: 200, headers });
    } catch (e) {
      console.warn('[Material Storage] Arquivo local não encontrado em disco, tentando fileUrl:', e);
    }
  }

  // 2. Arquivo no Supabase Storage ou URL remota
  const signedUrl = await getSignedOrDirectUrl(material, 300, {
    download: disposition === 'attachment' ? filename : undefined,
  });

  try {
    const upstream = await fetch(signedUrl);
    if (!upstream.ok) {
      console.warn(`[Material Stream] Fetch upstream falhou com status ${upstream.status}, fazendo redirect seguro.`);
      return Response.redirect(signedUrl);
    }

    const upstreamType = upstream.headers.get('content-type');
    if (upstreamType && !headers.has('Content-Type')) {
      headers.set('Content-Type', upstreamType);
    }
    const upstreamLen = upstream.headers.get('content-length');
    if (upstreamLen && !headers.has('Content-Length')) {
      headers.set('Content-Length', upstreamLen);
    }

    return new Response(upstream.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error('[Material Stream Error], redirecionando para signedUrl:', err);
    return Response.redirect(signedUrl);
  }
}
