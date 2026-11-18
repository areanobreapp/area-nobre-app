import { PrismaClient, CommercialMaterial } from '@prisma/client';
import { prisma as defaultPrisma } from './db';
import { isDevelopmentPubliclyShareable } from './development-visibility';
import { evaluateCommercialUnitShareStatus } from './commercial-unit-share';

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
 * Busca Material por ID com verificação rigorosa de autorização (rotas internas autenticadas)
 */
export async function getMaterialWithAuthCheck(
  materialId: string,
  viewer: { role?: string; id?: string } | null,
  prismaClient: PrismaClient = defaultPrisma
) {
  const material = await prismaClient.commercialMaterial.findUnique({
    where: { id: materialId },
    include: {
      development: {
        select: {
          id: true,
          name: true,
          status: true,
          companyId: true,
          company: { select: { id: true, status: true } },
        },
      },
      company: { select: { id: true, status: true } },
      typology: { select: { id: true, name: true, propertyType: true } },
    },
  });

  if (!material) {
    return { material: null, status: 404, error: 'Material não encontrado.' };
  }

  const isAdmin = viewer?.role === 'ADMIN';
  const isBroker = viewer?.role === 'BROKER' || viewer?.role === 'USER';

  if (!isAdmin && !material.isActive) {
    return { material: null, status: 404, error: 'Material não disponível.' };
  }

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
    if (!isAdmin) {
      if (material.development && !isDevelopmentPubliclyShareable(material.development).allowed) {
        return { material: null, status: 403, error: 'Empreendimento não disponível para consulta.' };
      }
      if (material.company && material.company.status !== 'ACTIVE') {
        return { material: null, status: 403, error: 'Construtora inativa.' };
      }
    }
    return { material, status: 200, error: null };
  }

  // 3. Material PUBLIC: acesso público permitido
  if (material.visibility === 'PUBLIC') {
    if (!isAdmin) {
      if (material.development && !isDevelopmentPubliclyShareable(material.development).allowed) {
        return { material: null, status: 403, error: 'Empreendimento não disponível para consulta.' };
      }
      if (material.company && material.company.status !== 'ACTIVE') {
        return { material: null, status: 403, error: 'Construtora inativa.' };
      }
    }
    return { material, status: 200, error: null };
  }

  return { material: null, status: 403, error: 'Acesso não autorizado.' };
}

/**
 * Busca Material Público por ID para rotas sem autenticação (/api/public/materials/[id]/view e /download).
 * Valida (MEL-02 / FUNC-01 / FUNC-02):
 * - Existência e status ativo do material (isActive === true).
 * - Visibilidade PUBLIC e autorização de compartilhamento (allowBrokerShare === true).
 * - Permissão de download (allowDownload === true) quando requireDownload === true.
 * - Empreendimento publicado e construtora ativa.
 * - Quando vinculado diretamente a uma unidade comercial (commercialUnitId), a unidade deve estar publicamente ativa (DISPONIVEL ou RESERVADA).
 */
export async function getPublicMaterialWithAuthCheck(
  materialId: string,
  options?: { requireDownload?: boolean },
  prismaClient: any = defaultPrisma
) {
  const material = await prismaClient.commercialMaterial.findUnique({
    where: { id: materialId },
    include: {
      development: {
        select: {
          id: true,
          name: true,
          status: true,
          companyId: true,
          company: { select: { id: true, status: true } },
        },
      },
      company: { select: { id: true, status: true } },
      commercialUnit: {
        select: {
          id: true,
          commercialStatus: true,
        },
      },
    },
  });

  if (!material || !material.isActive) {
    return { material: null, status: 404, error: 'Material comercial não encontrado.' };
  }

  if (material.visibility !== 'PUBLIC') {
    return {
      material: null,
      status: 403,
      error: 'Este material não possui autorização para acesso público. Autenticação exigida.',
    };
  }

  if (!material.allowBrokerShare) {
    return {
      material: null,
      status: 403,
      error: 'O compartilhamento deste material não foi autorizado.',
    };
  }

  if (options?.requireDownload && !material.allowDownload) {
    return {
      material: null,
      status: 403,
      error: 'O download deste material não foi autorizado.',
    };
  }

  if (material.development) {
    const devCheck = isDevelopmentPubliclyShareable(material.development);
    if (!devCheck.allowed) {
      return {
        material: null,
        status: 403,
        error: devCheck.reason || 'Empreendimento não disponível para consulta pública.',
      };
    }
  }

  if (material.company && material.company.status !== 'ACTIVE') {
    return {
      material: null,
      status: 403,
      error: 'Este material não está disponível para consulta pública no momento.',
    };
  }

  if (material.commercialUnit) {
    const unitEval = evaluateCommercialUnitShareStatus(material.commercialUnit.commercialStatus);
    if (!unitEval.isPubliclyActive) {
      return {
        material: null,
        status: 403,
        error: 'A unidade associada a este material não está mais disponível para consulta pública.',
      };
    }
  }

  return { material, status: 200, error: null };
}

/**
 * Confirma que um materialId pertence estritamente ao typologyId informado na rota (MEL-01).
 * Rejeita operações cruzadas entre tipologias nos métodos PATCH e DELETE.
 */
export async function assertTypologyPlantOwnership(
  typologyId: string,
  materialId: string,
  prismaClient: any = defaultPrisma
): Promise<{
  allowed: boolean;
  status: number;
  error?: string;
  material?: any;
}> {
  if (!typologyId || !materialId) {
    return {
      allowed: false,
      status: 400,
      error: 'typologyId e materialId são obrigatórios.',
    };
  }

  const material = await prismaClient.commercialMaterial.findUnique({
    where: { id: materialId },
    select: {
      id: true,
      typologyId: true,
      developmentId: true,
      category: true,
      fileExtension: true,
      fileType: true,
    },
  });

  if (!material) {
    return {
      allowed: false,
      status: 404,
      error: 'Planta não encontrada.',
    };
  }

  if (material.typologyId !== typologyId) {
    return {
      allowed: false,
      status: 403,
      error: 'Operação negada: o material informado não pertence a esta tipologia.',
    };
  }

  return {
    allowed: true,
    status: 200,
    material,
  };
}

/**
 * Valida se um material existente pode ser vinculado a uma tipologia via POST JSON (MEL-01):
 * - Deve pertencer ao mesmo empreendimento (developmentId).
 * - Não pode estar vinculado a outra tipologia diferente.
 * - Não pode ser planilha (XLS, XLSX, CSV).
 */
export async function validateMaterialLinkForTypology(
  typology: { id: string; developmentId: string },
  materialId: string,
  prismaClient: any = defaultPrisma
): Promise<{
  allowed: boolean;
  status: number;
  error?: string;
  material?: any;
}> {
  const material = await prismaClient.commercialMaterial.findUnique({
    where: { id: materialId },
    select: {
      id: true,
      typologyId: true,
      developmentId: true,
      fileExtension: true,
      fileType: true,
    },
  });

  if (!material) {
    return {
      allowed: false,
      status: 404,
      error: 'Material não encontrado.',
    };
  }

  if (material.developmentId && material.developmentId !== typology.developmentId) {
    return {
      allowed: false,
      status: 403,
      error: 'Operação negada: o material pertence a outro empreendimento.',
    };
  }

  if (material.typologyId && material.typologyId !== typology.id) {
    return {
      allowed: false,
      status: 403,
      error: 'Operação negada: o material já está vinculado a outra tipologia.',
    };
  }

  const ext = (material.fileExtension || '').toLowerCase().replace('.', '');
  const mime = (material.fileType || '').toLowerCase();
  if (
    ['xls', 'xlsx', 'csv'].includes(ext) ||
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    mime.includes('csv')
  ) {
    return {
      allowed: false,
      status: 400,
      error: 'Planilhas (XLS, XLSX, CSV) não podem ser vinculadas como planta de tipologia.',
    };
  }

  return {
    allowed: true,
    status: 200,
    material,
  };
}

