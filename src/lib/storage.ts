import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';

// Tipos permitidos e limites de segurança (Fase 5.5B - Seção 13)
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export const DEFAULT_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'area-nobre-media';

let supabaseClientInstance: SupabaseClient | null = null;

export function getSupabaseStorageClient(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL;
  // Credencial moderna exclusivamente server-side (Secret Key)
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  if (!supabaseClientInstance) {
    supabaseClientInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
    });
  }

  return supabaseClientInstance;
}

/**
 * Validação rigorosa de magic bytes do buffer binário.
 * Não confia exclusivamente no Content-Type informado pelo navegador.
 */
export function validateImageMagicBytes(buffer: Buffer): { valid: boolean; detectedMime?: string; error?: string } {
  if (buffer.length < 12) {
    return { valid: false, error: 'Arquivo inválido ou corrompido.' };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedMime: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
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

  // WEBP: RIFF .... WEBP
  const isRiff = buffer.subarray(0, 4).toString('ascii') === 'RIFF';
  const isWebp = buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  if (isRiff && isWebp) {
    return { valid: true, detectedMime: 'image/webp' };
  }

  return {
    valid: false,
    error: 'Formato de arquivo incompatível. Apenas imagens JPEG, PNG ou WEBP são aceitas.',
  };
}

export interface UploadOptions {
  entityType?: 'property' | 'development' | 'avatar' | 'logo' | 'general';
  entityId?: string;
  userId: string;
  originalFilename?: string;
}

/**
 * Constrói o caminho hierárquico previsível para o Supabase Storage.
 * Ex:
 * - properties/{propertyId}/{uniqueName}.jpg
 * - developments/{developmentId}/{uniqueName}.jpg
 * - profiles/{userId}/avatar/{uniqueName}.jpg
 * - profiles/{userId}/logo/{uniqueName}.jpg
 * - uploads/{userId}/{uniqueName}.jpg
 */
export function buildStoragePath(options: UploadOptions, extension: string): string {
  const uniqueId = crypto.randomBytes(12).toString('hex');
  const safeExt = extension.toLowerCase();
  const filename = `${uniqueId}${safeExt}`;

  const { entityType = 'general', entityId, userId } = options;

  switch (entityType) {
    case 'property':
      return entityId ? `properties/${entityId}/${filename}` : `properties/temp_${userId}/${filename}`;
    case 'development':
      return entityId ? `developments/${entityId}/${filename}` : `developments/temp_${userId}/${filename}`;
    case 'avatar':
      return `profiles/${userId}/avatar/${filename}`;
    case 'logo':
      return `profiles/${userId}/logo/${filename}`;
    default:
      return `uploads/${userId}/${filename}`;
  }
}

/**
 * Faz o upload de um arquivo, priorizando Supabase Storage quando configurado,
 * ou fazendo fallback para filesystem local (public/uploads) em desenvolvimento offline.
 */
export async function uploadFileBuffer(
  buffer: Buffer,
  originalFilename: string,
  options: UploadOptions
): Promise<{ url: string; path: string; storage: 'supabase' | 'local' }> {
  // 1. Valida tamanho
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Tamanho de arquivo excede o limite máximo permitido de ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`);
  }

  // 2. Valida Magic Bytes
  const magicValidation = validateImageMagicBytes(buffer);
  if (!magicValidation.valid || !magicValidation.detectedMime) {
    throw new Error(magicValidation.error || 'Assinatura binária do arquivo inválida.');
  }

  // 3. Valida extensão
  const ext = path.extname(originalFilename).toLowerCase() || (magicValidation.detectedMime === 'image/png' ? '.png' : magicValidation.detectedMime === 'image/webp' ? '.webp' : '.jpg');
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`Extensão de arquivo '${ext}' não permitida.`);
  }

  const storagePath = buildStoragePath(options, ext);
  const supabase = getSupabaseStorageClient();

  // 4. Envio para Supabase Storage se configurado
  if (supabase) {
    const bucket = DEFAULT_BUCKET;
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, buffer, {
        contentType: magicValidation.detectedMime,
        upsert: false,
      });

    if (error) {
      console.error('[Supabase Storage Upload Error]:', error);
      throw new Error(`Erro no Supabase Storage: ${error.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      url: publicUrlData.publicUrl,
      path: data.path,
      storage: 'supabase',
    };
  }

  // 5. Fallback local para desenvolvimento sem Supabase Storage
  const localUploadDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(localUploadDir, { recursive: true });

  const localFilename = path.basename(storagePath);
  const localFilePath = path.join(localUploadDir, localFilename);
  await fs.writeFile(localFilePath, buffer);

  return {
    url: `/uploads/${localFilename}`,
    path: localFilename,
    storage: 'local',
  };
}
