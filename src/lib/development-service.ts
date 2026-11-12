import { prisma as defaultPrisma } from '@/lib/db';
import type { PrismaClient } from '@prisma/client';
import { sanitizeContact } from './company-service';

export interface CreateDevelopmentInput {
  name: string;
  companyId: string;
  stage: string; // 'Lançamento' | 'Na planta' | 'Em construção' | 'Próximo da entrega'
  projectType?: 'VERTICAL' | 'HORIZONTAL' | 'MISTO' | 'LOTEAMENTO';
  totalTowers?: number | null;
  totalUnits?: number | null;
  deliveryDate?: string | null;
  deliveryYear?: number | null;
  deliveryMonth?: number | null;
  indexCorrection?: string | null;
  status?: string; // 'Ativo' | 'Inativo'
  description?: string | null;
  internalNotes?: string | null;
  address?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zipcode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  hasPool?: boolean | null;
  hasGym?: boolean | null;
  hasPartyHall?: boolean | null;
  hasPetSpace?: boolean | null;
  hasElevator?: boolean | null;
  hasDirectInstallments?: boolean | null;
  buildingId?: string | null;
}

export interface UpdateDevelopmentInput extends Partial<CreateDevelopmentInput> {}

export interface ListDevelopmentsParams {
  search?: string;
  companyId?: string;
  stage?: string;
  status?: string;
  city?: string;
  projectType?: string;
  page?: number;
  limit?: number;
}

export interface CreateBlockInput {
  name: string;
  blockType?: 'TOWER' | 'QUADRA' | 'BLOCO';
  totalFloors?: number | null;
  unitsPerFloor?: number | null;
  displayOrder?: number;
}

export interface UpdateBlockInput extends Partial<CreateBlockInput> {}

// ==============================================================================
// SANITIZAÇÃO DE DTO DE EMPREENDIMENTO
// ==============================================================================

export function sanitizeDevelopment(dev: any, userRole?: string): any {
  if (!dev) return null;

  const sanitizedContacts = (dev.contacts || [])
    .map((dc: any) => {
      const contactSanitized = sanitizeContact(dc.contact, userRole);
      if (!contactSanitized) return null;
      return {
        id: dc.id,
        isPrimary: dc.isPrimary,
        customRole: dc.customRole,
        contact: contactSanitized,
      };
    })
    .filter(Boolean);

  return {
    id: dev.id,
    name: dev.name,
    developer: dev.developer,
    companyId: dev.companyId,
    company: dev.company
      ? {
          id: dev.company.id,
          name: dev.company.name,
          tradeName: dev.company.tradeName,
          logoUrl: dev.company.logoUrl,
          bannerUrl: dev.company.bannerUrl,
          phone: dev.company.phone,
          whatsapp: dev.company.whatsapp,
          email: dev.company.email,
          website: dev.company.website,
          status: dev.company.status,
        }
      : null,
    projectType: dev.projectType,
    totalTowers: dev.totalTowers,
    totalUnits: dev.totalUnits,
    stage: dev.stage,
    deliveryDate: dev.deliveryDate,
    deliveryYear: dev.deliveryYear,
    deliveryMonth: dev.deliveryMonth,
    indexCorrection: dev.indexCorrection,
    status: dev.status,
    description: dev.description,
    internalNotes: userRole === 'ADMIN' ? dev.internalNotes : undefined,
    address: dev.address,
    number: dev.number,
    complement: dev.complement,
    neighborhood: dev.neighborhood,
    city: dev.city,
    state: dev.state,
    zipcode: dev.zipcode,
    latitude: dev.latitude,
    longitude: dev.longitude,
    hasPool: dev.hasPool,
    hasGym: dev.hasGym,
    hasPartyHall: dev.hasPartyHall,
    hasPetSpace: dev.hasPetSpace,
    hasElevator: dev.hasElevator,
    hasDirectInstallments: dev.hasDirectInstallments,
    buildingId: dev.buildingId,
    building: dev.building
      ? {
          id: dev.building.id,
          name: dev.building.name,
          address: dev.building.address,
          coverImageUrl: dev.building.coverImageUrl,
        }
      : null,
    contacts: sanitizedContacts,
    blocks: dev.blocks || [],
    images: dev.images || [],
    typologies: dev.typologies || [],
    createdAt: dev.createdAt,
    updatedAt: dev.updatedAt,
  };
}

// ==============================================================================
// OPERAÇÕES DE EMPREENDIMENTO (DEVELOPMENT)
// ==============================================================================

export async function createDevelopment(
  data: CreateDevelopmentInput,
  adminUserId: string,
  prisma: PrismaClient = defaultPrisma
) {
  if (!data.name?.trim()) throw new Error('Nome do empreendimento é obrigatório.');
  if (!data.companyId?.trim()) throw new Error('Vínculo com a construtora é obrigatório.');
  if (!data.stage?.trim()) throw new Error('Estágio da obra é obrigatório.');

  // Validar se a construtora existe
  const company = await prisma.company.findUnique({
    where: { id: data.companyId },
  });
  if (!company) {
    const err: any = new Error('Construtora informada não existe.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Se buildingId fornecido, validar se existe
  if (data.buildingId?.trim()) {
    const building = await prisma.building.findUnique({
      where: { id: data.buildingId },
    });
    if (!building) {
      const err: any = new Error('Edifício predial informado não existe.');
      err.code = 'NOT_FOUND';
      throw err;
    }
  }

  const development = await prisma.development.create({
    data: {
      userId: adminUserId,
      name: data.name.trim(),
      developer: company.tradeName, // Mantido para retrocompatibilidade
      companyId: company.id,
      stage: data.stage.trim(),
      projectType: data.projectType || 'VERTICAL',
      totalTowers: data.totalTowers ?? null,
      totalUnits: data.totalUnits ?? null,
      deliveryDate: data.deliveryDate?.trim() || null,
      deliveryYear: data.deliveryYear ?? null,
      deliveryMonth: data.deliveryMonth ?? null,
      indexCorrection: data.indexCorrection?.trim() || null,
      status: data.status || 'Ativo',
      description: data.description?.trim() || null,
      internalNotes: data.internalNotes?.trim() || null,
      address: data.address?.trim() || null,
      number: data.number?.trim() || null,
      complement: data.complement?.trim() || null,
      neighborhood: data.neighborhood?.trim() || null,
      city: data.city?.trim() || 'Criciúma',
      state: data.state?.trim() || 'SC',
      zipcode: data.zipcode?.trim() || null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      hasPool: data.hasPool ?? null,
      hasGym: data.hasGym ?? null,
      hasPartyHall: data.hasPartyHall ?? null,
      hasPetSpace: data.hasPetSpace ?? null,
      hasElevator: data.hasElevator ?? null,
      hasDirectInstallments: data.hasDirectInstallments ?? null,
      buildingId: data.buildingId?.trim() || null,
    },
    include: {
      company: true,
      blocks: true,
      contacts: {
        include: { contact: true },
      },
    },
  });

  console.log(`[ADMIN_AUDIT] Empreendimento criado: "${development.name}" (ID: ${development.id}) para Construtora: "${company.tradeName}" por Admin ID: ${adminUserId}`);
  return development;
}

export async function getDevelopmentById(
  id: string,
  userRole?: string,
  prisma: PrismaClient = defaultPrisma
) {
  const dev = await prisma.development.findUnique({
    where: { id },
    include: {
      company: true,
      blocks: {
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      },
      contacts: {
        orderBy: [{ isPrimary: 'desc' }, { contact: { displayOrder: 'asc' } }],
        include: { contact: true },
      },
      building: {
        select: {
          id: true,
          name: true,
          address: true,
          coverImageUrl: true,
        },
      },
      images: {
        orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
      },
      typologies: {
        orderBy: { price: 'asc' },
      },
    },
  });

  if (!dev) return null;
  return sanitizeDevelopment(dev, userRole);
}

export async function listDevelopments(
  params: ListDevelopmentsParams,
  userRole?: string,
  prisma: PrismaClient = defaultPrisma
) {
  const { search, companyId, stage, status, city, projectType, page = 1, limit = 20 } = params;
  const skip = (Math.max(1, page) - 1) * limit;

  const where: any = {};

  if (companyId) {
    where.companyId = companyId;
  }

  if (status && status !== 'Todos') {
    where.status = status;
  } else if (userRole !== 'ADMIN') {
    where.status = 'Ativo';
  }

  if (stage && stage !== 'Todos') {
    where.stage = stage;
  }

  if (projectType && projectType !== 'ALL') {
    where.projectType = projectType;
  }

  if (city) {
    where.city = { equals: city, mode: 'insensitive' };
  }

  if (search?.trim()) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { developer: { contains: q, mode: 'insensitive' } },
      { neighborhood: { contains: q, mode: 'insensitive' } },
      { address: { contains: q, mode: 'insensitive' } },
      { company: { tradeName: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [total, developments] = await Promise.all([
    prisma.development.count({ where }),
    prisma.development.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            tradeName: true,
            logoUrl: true,
          },
        },
        blocks: {
          select: { id: true, name: true, blockType: true },
        },
        contacts: {
          include: { contact: true },
        },
        images: {
          where: { isCover: true },
          take: 1,
        },
      },
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    developments: developments.map((d) => sanitizeDevelopment(d, userRole)),
  };
}

export async function updateDevelopment(
  id: string,
  data: UpdateDevelopmentInput,
  adminUserId: string,
  prisma: PrismaClient = defaultPrisma
) {
  const existing = await prisma.development.findUnique({ where: { id } });
  if (!existing) {
    const err: any = new Error('Empreendimento não encontrado.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  let developerName = existing.developer;
  if (data.companyId && data.companyId !== existing.companyId) {
    const company = await prisma.company.findUnique({ where: { id: data.companyId } });
    if (!company) {
      const err: any = new Error('Construtora informada não existe.');
      err.code = 'NOT_FOUND';
      throw err;
    }
    developerName = company.tradeName;
  }

  if (data.buildingId !== undefined && data.buildingId !== null && data.buildingId !== '') {
    const building = await prisma.building.findUnique({ where: { id: data.buildingId } });
    if (!building) {
      const err: any = new Error('Edifício informado não existe.');
      err.code = 'NOT_FOUND';
      throw err;
    }
  }

  const updated = await prisma.development.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name.trim() : undefined,
      developer: developerName,
      companyId: data.companyId !== undefined ? (data.companyId || null) : undefined,
      stage: data.stage !== undefined ? data.stage.trim() : undefined,
      projectType: data.projectType !== undefined ? data.projectType : undefined,
      totalTowers: data.totalTowers !== undefined ? data.totalTowers : undefined,
      totalUnits: data.totalUnits !== undefined ? data.totalUnits : undefined,
      deliveryDate: data.deliveryDate !== undefined ? (data.deliveryDate?.trim() || null) : undefined,
      deliveryYear: data.deliveryYear !== undefined ? data.deliveryYear : undefined,
      deliveryMonth: data.deliveryMonth !== undefined ? data.deliveryMonth : undefined,
      indexCorrection: data.indexCorrection !== undefined ? (data.indexCorrection?.trim() || null) : undefined,
      status: data.status !== undefined ? data.status : undefined,
      description: data.description !== undefined ? (data.description?.trim() || null) : undefined,
      internalNotes: data.internalNotes !== undefined ? (data.internalNotes?.trim() || null) : undefined,
      address: data.address !== undefined ? (data.address?.trim() || null) : undefined,
      number: data.number !== undefined ? (data.number?.trim() || null) : undefined,
      complement: data.complement !== undefined ? (data.complement?.trim() || null) : undefined,
      neighborhood: data.neighborhood !== undefined ? (data.neighborhood?.trim() || null) : undefined,
      city: data.city !== undefined ? (data.city?.trim() || 'Criciúma') : undefined,
      state: data.state !== undefined ? (data.state?.trim() || 'SC') : undefined,
      zipcode: data.zipcode !== undefined ? (data.zipcode?.trim() || null) : undefined,
      latitude: data.latitude !== undefined ? data.latitude : undefined,
      longitude: data.longitude !== undefined ? data.longitude : undefined,
      hasPool: data.hasPool !== undefined ? data.hasPool : undefined,
      hasGym: data.hasGym !== undefined ? data.hasGym : undefined,
      hasPartyHall: data.hasPartyHall !== undefined ? data.hasPartyHall : undefined,
      hasPetSpace: data.hasPetSpace !== undefined ? data.hasPetSpace : undefined,
      hasElevator: data.hasElevator !== undefined ? data.hasElevator : undefined,
      hasDirectInstallments: data.hasDirectInstallments !== undefined ? data.hasDirectInstallments : undefined,
      buildingId: data.buildingId !== undefined ? (data.buildingId || null) : undefined,
    },
    include: {
      company: true,
      blocks: true,
    },
  });

  console.log(`[ADMIN_AUDIT] Empreendimento atualizado: "${updated.name}" (ID: ${updated.id}) por Admin ID: ${adminUserId}`);
  return updated;
}

export async function toggleDevelopmentStatus(
  id: string,
  adminUserId: string,
  prisma: PrismaClient = defaultPrisma
) {
  const dev = await prisma.development.findUnique({ where: { id } });
  if (!dev) {
    const err: any = new Error('Empreendimento não encontrado.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const nextStatus = dev.status === 'Ativo' ? 'Inativo' : 'Ativo';
  const updated = await prisma.development.update({
    where: { id },
    data: { status: nextStatus },
  });

  console.log(`[ADMIN_AUDIT] Status do empreendimento "${dev.name}" alterado para ${nextStatus} por Admin ID: ${adminUserId}`);
  return updated;
}

// ==============================================================================
// ASSOCIAÇÃO N:M DE CONTATOS E GERENTES (DEVELOPMENTCONTACT)
// ==============================================================================

export async function linkDevelopmentContact(
  developmentId: string,
  contactId: string,
  options: { isPrimary?: boolean; customRole?: string } = {},
  adminUserId?: string,
  prisma: PrismaClient = defaultPrisma
) {
  const [dev, contact] = await Promise.all([
    prisma.development.findUnique({ where: { id: developmentId }, select: { id: true, companyId: true, name: true } }),
    prisma.companyContact.findUnique({ where: { id: contactId }, select: { id: true, companyId: true, name: true } }),
  ]);

  if (!dev) {
    const err: any = new Error('Empreendimento não encontrado.');
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (!contact) {
    const err: any = new Error('Contato não encontrado.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Regra crítica: Rejeitar vínculo entre empresas diferentes
  if (dev.companyId !== contact.companyId) {
    const err: any = new Error('VIOLACAO_CROSS_COMPANY: Não é permitido vincular contato a empreendimento de outra construtora.');
    err.code = 'CONFLICT';
    throw err;
  }

  // Se for definido como isPrimary, desmarca outros como isPrimary no mesmo empreendimento
  return prisma.$transaction(async (tx) => {
    if (options.isPrimary) {
      await tx.developmentContact.updateMany({
        where: { developmentId },
        data: { isPrimary: false },
      });
    }

    const link = await tx.developmentContact.upsert({
      where: {
        developmentId_contactId: { developmentId, contactId },
      },
      create: {
        developmentId,
        contactId,
        isPrimary: options.isPrimary ?? false,
        customRole: options.customRole?.trim() || null,
      },
      update: {
        isPrimary: options.isPrimary !== undefined ? options.isPrimary : undefined,
        customRole: options.customRole !== undefined ? (options.customRole?.trim() || null) : undefined,
      },
      include: { contact: true },
    });

    console.log(`[ADMIN_AUDIT] Gerente "${contact.name}" vinculado ao empreendimento "${dev.name}" (isPrimary: ${link.isPrimary})`);
    return link;
  });
}

export async function unlinkDevelopmentContact(
  developmentId: string,
  contactId: string,
  adminUserId?: string,
  prisma: PrismaClient = defaultPrisma
) {
  const link = await prisma.developmentContact.findUnique({
    where: {
      developmentId_contactId: { developmentId, contactId },
    },
  });

  if (!link) {
    const err: any = new Error('Vínculo entre empreendimento e contato não encontrado.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  await prisma.developmentContact.delete({
    where: {
      developmentId_contactId: { developmentId, contactId },
    },
  });

  console.log(`[ADMIN_AUDIT] Vínculo removido entre Empreendimento ${developmentId} e Contato ${contactId}`);
  return { success: true, message: 'Vínculo do contato com o empreendimento removido com sucesso.' };
}

// ==============================================================================
// GESTÃO DE TORRES, QUADRAS E BLOCOS (DEVELOPMENTBLOCK)
// ==============================================================================

export async function createDevelopmentBlock(
  developmentId: string,
  data: CreateBlockInput,
  adminUserId: string,
  prisma: PrismaClient = defaultPrisma
) {
  if (!data.name?.trim()) throw new Error('Identificação da torre/quadra é obrigatória.');

  const dev = await prisma.development.findUnique({ where: { id: developmentId } });
  if (!dev) {
    const err: any = new Error('Empreendimento não encontrado.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const normalizedName = data.name.trim();

  // Checar se já existe torre com esse nome no empreendimento
  const existing = await prisma.developmentBlock.findUnique({
    where: {
      developmentId_name: { developmentId, name: normalizedName },
    },
  });
  if (existing) {
    const err: any = new Error(`Já existe uma torre/quadra com o nome "${normalizedName}" neste empreendimento.`);
    err.code = 'CONFLICT';
    throw err;
  }

  const block = await prisma.developmentBlock.create({
    data: {
      developmentId,
      name: normalizedName,
      blockType: data.blockType || 'TOWER',
      totalFloors: data.totalFloors ?? null,
      unitsPerFloor: data.unitsPerFloor ?? null,
      displayOrder: data.displayOrder ?? 0,
    },
  });

  console.log(`[ADMIN_AUDIT] Torre/Quadra criada: "${block.name}" no Empreendimento "${dev.name}" por Admin ID: ${adminUserId}`);
  return block;
}

export async function updateDevelopmentBlock(
  blockId: string,
  data: UpdateBlockInput,
  adminUserId: string,
  prisma: PrismaClient = defaultPrisma
) {
  const block = await prisma.developmentBlock.findUnique({ where: { id: blockId } });
  if (!block) {
    const err: any = new Error('Torre/Quadra não encontrada.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (data.name?.trim() && data.name.trim() !== block.name) {
    const duplicate = await prisma.developmentBlock.findUnique({
      where: {
        developmentId_name: { developmentId: block.developmentId, name: data.name.trim() },
      },
    });
    if (duplicate && duplicate.id !== blockId) {
      const err: any = new Error(`Já existe uma torre/quadra com o nome "${data.name.trim()}" neste empreendimento.`);
      err.code = 'CONFLICT';
      throw err;
    }
  }

  const updated = await prisma.developmentBlock.update({
    where: { id: blockId },
    data: {
      name: data.name !== undefined ? data.name.trim() : undefined,
      blockType: data.blockType !== undefined ? data.blockType : undefined,
      totalFloors: data.totalFloors !== undefined ? data.totalFloors : undefined,
      unitsPerFloor: data.unitsPerFloor !== undefined ? data.unitsPerFloor : undefined,
      displayOrder: data.displayOrder !== undefined ? data.displayOrder : undefined,
    },
  });

  console.log(`[ADMIN_AUDIT] Torre/Quadra atualizada: "${updated.name}" (ID: ${blockId}) por Admin ID: ${adminUserId}`);
  return updated;
}

export async function deleteDevelopmentBlock(
  blockId: string,
  adminUserId: string,
  prisma: PrismaClient = defaultPrisma
) {
  const block = await prisma.developmentBlock.findUnique({ where: { id: blockId } });
  if (!block) {
    const err: any = new Error('Torre/Quadra não encontrada.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  await prisma.developmentBlock.delete({ where: { id: blockId } });
  console.log(`[ADMIN_AUDIT] Torre/Quadra "${block.name}" (ID: ${blockId}) excluída por Admin ID: ${adminUserId}`);
  return { success: true, message: `Torre/Quadra ${block.name} excluída com sucesso.` };
}

// ==============================================================================
// VÍNCULO COM EDIFÍCIO PREDIAL (BUILDING)
// ==============================================================================

export async function linkDevelopmentToBuilding(
  developmentId: string,
  buildingId: string | null,
  adminUserId: string,
  prisma: PrismaClient = defaultPrisma
) {
  const dev = await prisma.development.findUnique({ where: { id: developmentId } });
  if (!dev) {
    const err: any = new Error('Empreendimento não encontrado.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (buildingId) {
    const building = await prisma.building.findUnique({ where: { id: buildingId } });
    if (!building) {
      const err: any = new Error('Edifício informado não existe.');
      err.code = 'NOT_FOUND';
      throw err;
    }
  }

  const updated = await prisma.development.update({
    where: { id: developmentId },
    data: { buildingId: buildingId || null },
    include: {
      building: {
        select: { id: true, name: true, address: true, coverImageUrl: true },
      },
    },
  });

  console.log(`[ADMIN_AUDIT] Empreendimento "${dev.name}" vinculado ao edifício "${buildingId || 'NENHUM'}" por Admin ID: ${adminUserId}`);
  return updated;
}

