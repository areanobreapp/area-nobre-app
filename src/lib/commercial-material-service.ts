import { PrismaClient, CommercialMaterial } from '@prisma/client';
import { prisma as defaultPrisma } from './db';

export const MATERIAL_CATEGORIES = [
  { value: 'FOLDER_COMERCIAL', label: 'Folder Comercial' },
  { value: 'BOOK_APRESENTACAO', label: 'Apresentação do Empreendimento' },
  { value: 'PLANTA_TIPOLOGIA', label: 'Planta de Tipologia' },
  { value: 'PLANTA_IMPLANTACAO', label: 'Planta de Implantação' },
  { value: 'MEMORIAL_DESCRITIVO', label: 'Memorial Descritivo' },
  { value: 'TABELA_PRECOS', label: 'Tabela de Preços' },
  { value: 'CONDICOES_COMERCIAIS', label: 'Condições Comerciais' },
  { value: 'DOCUMENTO_PROPOSTA', label: 'Documentos de Proposta' },
  { value: 'IMAGEM_PERSPECTIVA', label: 'Imagens e Perspectivas' },
  { value: 'OUTRO', label: 'Outros Documentos' },
] as const;

export type MaterialCategoryValue = (typeof MATERIAL_CATEGORIES)[number]['value'];

export const MATERIAL_VISIBILITIES = [
  { value: 'PUBLIC', label: 'Público (Clientes e Corretores)' },
  { value: 'BROKERS_ONLY', label: 'Somente Corretores' },
  { value: 'ADMIN_ONLY', label: 'Somente Administrativo' },
] as const;

export type MaterialVisibilityValue = (typeof MATERIAL_VISIBILITIES)[number]['value'];

export interface CreateMaterialInput {
  developmentId: string;
  title: string;
  category: string;
  description?: string | null;
  fileUrl: string;
  storagePath?: string | null;
  fileType?: string | null;
  fileExtension?: string | null;
  fileSizeBytes?: number | null;
  versionLabel?: string | null;
  visibility?: MaterialVisibilityValue;
  allowDownload?: boolean;
  allowBrokerShare?: boolean;
  displayOrder?: number;
  typologyId?: string | null;
  blockId?: string | null;
  commercialUnitId?: string | null;
  companyId?: string | null;
  uploadedById?: string | null;
}

export interface UpdateMaterialInput {
  title?: string;
  category?: string;
  description?: string | null;
  fileUrl?: string;
  storagePath?: string | null;
  fileType?: string | null;
  fileExtension?: string | null;
  fileSizeBytes?: number | null;
  versionLabel?: string | null;
  visibility?: MaterialVisibilityValue;
  allowDownload?: boolean;
  allowBrokerShare?: boolean;
  isActive?: boolean;
  displayOrder?: number;
  typologyId?: string | null;
  blockId?: string | null;
  commercialUnitId?: string | null;
}

export function validateMaterialInput(data: { title?: string; category?: string; fileUrl?: string }) {
  if (data.title !== undefined && (!data.title || !data.title.trim())) {
    throw new Error('O título do material é obrigatório.');
  }
  if (data.category !== undefined) {
    const validCats = MATERIAL_CATEGORIES.map((c) => c.value);
    if (!validCats.includes(data.category as any)) {
      throw new Error(`Categoria '${data.category}' inválida.`);
    }
  }
  if (data.fileUrl !== undefined && (!data.fileUrl || !data.fileUrl.trim())) {
    throw new Error('O arquivo ou link do material é obrigatório.');
  }
}

/**
 * Criação de Material Comercial (Exclusivo ADMIN)
 */
export async function createCommercialMaterial(
  input: CreateMaterialInput,
  prismaClient: PrismaClient = defaultPrisma
): Promise<CommercialMaterial> {
  validateMaterialInput({ title: input.title, category: input.category, fileUrl: input.fileUrl });

  // Se não informado companyId, busca a partir do development
  let companyId = input.companyId;
  if (!companyId && input.developmentId) {
    const dev = await prismaClient.development.findUnique({
      where: { id: input.developmentId },
      select: { companyId: true },
    });
    if (dev?.companyId) {
      companyId = dev.companyId;
    }
  }

  return prismaClient.commercialMaterial.create({
    data: {
      developmentId: input.developmentId,
      companyId: companyId || null,
      title: input.title.trim(),
      category: input.category,
      description: input.description?.trim() || null,
      fileUrl: input.fileUrl.trim(),
      storagePath: input.storagePath?.trim() || null,
      fileType: input.fileType || null,
      fileExtension: input.fileExtension?.toLowerCase() || null,
      fileSizeBytes: input.fileSizeBytes || null,
      versionLabel: input.versionLabel?.trim() || null,
      visibility: input.visibility || 'BROKERS_ONLY',
      allowDownload: input.allowDownload ?? true,
      allowBrokerShare: input.allowBrokerShare ?? true,
      isActive: true,
      displayOrder: Number(input.displayOrder) || 0,
      typologyId: input.typologyId || null,
      blockId: input.blockId || null,
      commercialUnitId: input.commercialUnitId || null,
      uploadedById: input.uploadedById || null,
    },
    include: {
      typology: { select: { id: true, name: true, propertyType: true } },
      block: { select: { id: true, name: true, blockType: true } },
      commercialUnit: { select: { id: true, unitCode: true } },
    },
  });
}

/**
 * Atualização de Material Comercial (Exclusivo ADMIN)
 */
export async function updateCommercialMaterial(
  id: string,
  input: UpdateMaterialInput,
  prismaClient: PrismaClient = defaultPrisma
): Promise<CommercialMaterial> {
  validateMaterialInput({ title: input.title, category: input.category, fileUrl: input.fileUrl });

  const existing = await prismaClient.commercialMaterial.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Material comercial não encontrado.');
  }

  return prismaClient.commercialMaterial.update({
    where: { id },
    data: {
      title: input.title !== undefined ? input.title.trim() : undefined,
      category: input.category !== undefined ? input.category : undefined,
      description: input.description !== undefined ? (input.description ? input.description.trim() : null) : undefined,
      fileUrl: input.fileUrl !== undefined ? input.fileUrl.trim() : undefined,
      storagePath: input.storagePath !== undefined ? (input.storagePath ? input.storagePath.trim() : null) : undefined,
      fileType: input.fileType !== undefined ? input.fileType : undefined,
      fileExtension: input.fileExtension !== undefined ? (input.fileExtension ? input.fileExtension.toLowerCase() : null) : undefined,
      fileSizeBytes: input.fileSizeBytes !== undefined ? input.fileSizeBytes : undefined,
      versionLabel: input.versionLabel !== undefined ? (input.versionLabel ? input.versionLabel.trim() : null) : undefined,
      visibility: input.visibility !== undefined ? input.visibility : undefined,
      allowDownload: input.allowDownload !== undefined ? input.allowDownload : undefined,
      allowBrokerShare: input.allowBrokerShare !== undefined ? input.allowBrokerShare : undefined,
      isActive: input.isActive !== undefined ? input.isActive : undefined,
      displayOrder: input.displayOrder !== undefined ? Number(input.displayOrder) : undefined,
      typologyId: input.typologyId !== undefined ? input.typologyId : undefined,
      blockId: input.blockId !== undefined ? input.blockId : undefined,
      commercialUnitId: input.commercialUnitId !== undefined ? input.commercialUnitId : undefined,
    },
    include: {
      typology: { select: { id: true, name: true, propertyType: true } },
      block: { select: { id: true, name: true, blockType: true } },
      commercialUnit: { select: { id: true, unitCode: true } },
    },
  });
}

/**
 * Exclusão de Material Comercial
 */
export async function deleteCommercialMaterial(
  id: string,
  prismaClient: PrismaClient = defaultPrisma
): Promise<CommercialMaterial> {
  const existing = await prismaClient.commercialMaterial.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Material comercial não encontrado.');
  }

  return prismaClient.commercialMaterial.delete({
    where: { id },
  });
}

/**
 * Listagem Administrativa (ADMIN vê todos os materiais, inclusive inativos e ADMIN_ONLY)
 */
export async function listCommercialMaterialsForAdmin(
  developmentId: string,
  prismaClient: PrismaClient = defaultPrisma
) {
  return prismaClient.commercialMaterial.findMany({
    where: { developmentId },
    orderBy: [
      { displayOrder: 'asc' },
      { createdAt: 'desc' },
    ],
    include: {
      typology: { select: { id: true, name: true, propertyType: true } },
      block: { select: { id: true, name: true, blockType: true } },
      commercialUnit: { select: { id: true, unitCode: true } },
      uploadedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

/**
 * Listagem para Corretores (Corretor vê apenas materiais ativos com visibilidade PUBLIC ou BROKERS_ONLY)
 * Se o empreendimento não estiver publicado ou estiver arquivado, corretores não visualizam nada.
 */
export async function listCommercialMaterialsForBroker(
  developmentId: string,
  prismaClient: PrismaClient = defaultPrisma
) {
  const dev = await prismaClient.development.findUnique({
    where: { id: developmentId },
    select: { id: true, status: true },
  });

  if (!dev || dev.status === 'Inativo' || dev.status === 'Rascunho') {
    return [];
  }

  return prismaClient.commercialMaterial.findMany({
    where: {
      developmentId,
      isActive: true,
      visibility: { in: ['PUBLIC', 'BROKERS_ONLY'] },
    },
    orderBy: [
      { displayOrder: 'asc' },
      { createdAt: 'desc' },
    ],
    include: {
      typology: { select: { id: true, name: true, propertyType: true } },
      block: { select: { id: true, name: true, blockType: true } },
    },
  });
}

/**
 * Busca Material por ID com verificação rigorosa de autorização
 */
export async function getMaterialWithAuthCheck(
  materialId: string,
  viewer: { role?: string; id?: string } | null,
  prismaClient: PrismaClient = defaultPrisma
) {
  const material = await prismaClient.commercialMaterial.findUnique({
    where: { id: materialId },
    include: {
      development: { select: { id: true, name: true, status: true } },
      typology: { select: { id: true, name: true, propertyType: true } },
    },
  });

  if (!material) {
    return { material: null, status: 404, error: 'Material não encontrado.' };
  }

  const isAdmin = viewer?.role === 'ADMIN';
  const isBroker = viewer?.role === 'BROKER' || viewer?.role === 'USER';

  // 1. Material ADMIN_ONLY: apenas administradores
  if (material.visibility === 'ADMIN_ONLY') {
    if (!isAdmin) {
      return { material: null, status: 403, error: 'Acesso restrito à administração.' };
    }
    return { material, status: 200, error: null };
  }

  // 2. Material BROKERS_ONLY: corretores autenticados e admin
  if (material.visibility === 'BROKERS_ONLY') {
    if (!isAdmin && !isBroker) {
      return { material: null, status: 401, error: 'Autenticação necessária para acessar este material.' };
    }
    // Verifica se o empreendimento está ativo
    if (!isAdmin && material.development?.status !== 'Ativo') {
      return { material: null, status: 403, error: 'Empreendimento não disponível para consulta.' };
    }
    return { material, status: 200, error: null };
  }

  // 3. Material PUBLIC: acesso público permitido
  if (material.visibility === 'PUBLIC') {
    // Se o empreendimento estiver arquivado e não for admin, bloqueia
    if (!isAdmin && material.development?.status === 'Inativo') {
      return { material: null, status: 403, error: 'Empreendimento inativo.' };
    }
    return { material, status: 200, error: null };
  }

  return { material: null, status: 403, error: 'Acesso não autorizado.' };
}
