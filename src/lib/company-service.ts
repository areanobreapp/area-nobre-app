import { prisma as defaultPrisma } from '@/lib/db';
import type { PrismaClient } from '@prisma/client';

export type VisibilityLevel = 'PUBLIC' | 'BROKERS_ONLY' | 'ADMIN_ONLY';

// ==============================================================================
// HELPERS DE NORMALIZAÇÃO E VALIDAÇÃO DE CNPJ
// ==============================================================================

/**
 * Remove qualquer caractere que não seja dígito.
 */
export function normalizeCnpj(cnpj: string | null | undefined): string | null {
  if (!cnpj) return null;
  const digits = cnpj.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

/**
 * Formata um CNPJ normalizado de 14 dígitos no padrão visual XX.XXX.XXX/0001-XX.
 */
export function formatCnpj(cnpj: string | null | undefined): string | null {
  const digits = normalizeCnpj(cnpj);
  if (!digits || digits.length !== 14) return cnpj || null;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Validação do algoritmo de dígitos verificadores do CNPJ brasileiro.
 */
export function validateCnpj(cnpj: string | null | undefined): boolean {
  const digits = normalizeCnpj(cnpj);
  if (!digits || digits.length !== 14) return false;

  // Rejeita sequências de dígitos todos iguais (ex: 00000000000000, 11111111111111)
  if (/^(\d)\1+$/.test(digits)) return false;

  // Cálculo do 1º dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    sum1 += parseInt(digits[i], 10) * weights1[i];
  }
  const mod1 = sum1 % 11;
  const d1 = mod1 < 2 ? 0 : 11 - mod1;
  if (parseInt(digits[12], 10) !== d1) return false;

  // Cálculo do 2º dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 13; i++) {
    sum2 += parseInt(digits[i], 10) * weights2[i];
  }
  const mod2 = sum2 % 11;
  const d2 = mod2 < 2 ? 0 : 11 - mod2;
  if (parseInt(digits[13], 10) !== d2) return false;

  return true;
}

// ==============================================================================
// TIPOS E INTERFACES DE DTO
// ==============================================================================

export interface CreateCompanyInput {
  name: string;
  tradeName: string;
  cnpj?: string | null;
  stateRegistration?: string | null;
  address?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string;
  state?: string;
  zipcode?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  description?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
  displayOrder?: number;
  internalNotes?: string | null;
}

export interface UpdateCompanyInput extends Partial<CreateCompanyInput> {}

export interface ListCompaniesParams {
  search?: string;
  status?: string;
  city?: string;
  state?: string;
  page?: number;
  limit?: number;
}

export interface CreateCompanyContactInput {
  name: string;
  role: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  visibility?: VisibilityLevel;
  status?: 'ACTIVE' | 'INACTIVE';
  displayOrder?: number;
  internalNotes?: string | null;
}

export interface UpdateCompanyContactInput extends Partial<CreateCompanyContactInput> {}

// ==============================================================================
// SANITIZAÇÃO DE DTO POR NÍVEL DE PAPEL (RBAC & PRIVACIDADE)
// ==============================================================================

export function sanitizeContact(contact: any, userRole?: string): any | null {
  if (!contact) return null;

  // Se o contato estiver desativado, corretores e público não veem
  if (userRole !== 'ADMIN' && contact.status !== 'ACTIVE') {
    return null;
  }

  // Filtragem estrita de visibilidade
  if (contact.visibility === 'ADMIN_ONLY' && userRole !== 'ADMIN') {
    return null; // Ocultação total
  }

  if (contact.visibility === 'BROKERS_ONLY' && userRole !== 'ADMIN' && userRole !== 'BROKER') {
    return null; // Visitante anônimo não vê
  }

  // Objeto seguro sanitizado
  return {
    id: contact.id,
    companyId: contact.companyId,
    name: contact.name,
    role: contact.role,
    phone: contact.phone,
    whatsapp: contact.whatsapp,
    email: contact.email,
    photoUrl: contact.photoUrl,
    visibility: contact.visibility,
    status: contact.status,
    displayOrder: contact.displayOrder,
    // internalNotes apenas para ADMIN
    internalNotes: userRole === 'ADMIN' ? contact.internalNotes : undefined,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  };
}

export function sanitizeCompany(company: any, userRole?: string): any {
  if (!company) return null;

  const sanitizedContacts = (company.contacts || [])
    .map((c: any) => sanitizeContact(c, userRole))
    .filter(Boolean);

  return {
    id: company.id,
    name: company.name,
    tradeName: company.tradeName,
    cnpj: userRole === 'ADMIN' ? formatCnpj(company.cnpj) : undefined, // CNPJ apenas para ADMIN
    stateRegistration: userRole === 'ADMIN' ? company.stateRegistration : undefined,
    address: company.address,
    number: company.number,
    complement: company.complement,
    neighborhood: company.neighborhood,
    city: company.city,
    state: company.state,
    zipcode: company.zipcode,
    phone: company.phone,
    whatsapp: company.whatsapp,
    email: company.email,
    website: company.website,
    logoUrl: company.logoUrl,
    bannerUrl: company.bannerUrl,
    description: company.description,
    status: company.status,
    displayOrder: company.displayOrder,
    internalNotes: userRole === 'ADMIN' ? company.internalNotes : undefined,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
    createdById: userRole === 'ADMIN' ? company.createdById : undefined,
    contacts: sanitizedContacts,
    _count: company._count,
    developments: company.developments,
  };
}

// ==============================================================================
// OPERAÇÕES DE CONSTRUTORA (COMPANY)
// ==============================================================================

export async function createCompany(
  data: CreateCompanyInput,
  adminUserId: string,
  prisma: PrismaClient = defaultPrisma
) {
  if (!data.name?.trim()) throw new Error('Razão social é obrigatória.');
  if (!data.tradeName?.trim()) throw new Error('Nome fantasia é obrigatório.');

  let normalizedCnpj: string | null = null;
  if (data.cnpj?.trim()) {
    normalizedCnpj = normalizeCnpj(data.cnpj);
    if (normalizedCnpj && !validateCnpj(normalizedCnpj)) {
      throw new Error('CNPJ inválido.');
    }
  }

  // Checar se já existe com esse CNPJ
  if (normalizedCnpj) {
    const existing = await prisma.company.findUnique({
      where: { cnpj: normalizedCnpj },
    });
    if (existing) {
      const err: any = new Error(`Já existe uma construtora cadastrada com o CNPJ ${formatCnpj(normalizedCnpj)}.`);
      err.code = 'CONFLICT';
      throw err;
    }
  }

  const company = await prisma.company.create({
    data: {
      name: data.name.trim(),
      tradeName: data.tradeName.trim(),
      cnpj: normalizedCnpj,
      stateRegistration: data.stateRegistration?.trim() || null,
      address: data.address?.trim() || null,
      number: data.number?.trim() || null,
      complement: data.complement?.trim() || null,
      neighborhood: data.neighborhood?.trim() || null,
      city: data.city?.trim() || 'Criciúma',
      state: data.state?.trim() || 'SC',
      zipcode: data.zipcode?.trim() || null,
      phone: data.phone?.trim() || null,
      whatsapp: data.whatsapp?.trim() || null,
      email: data.email?.trim() || null,
      website: data.website?.trim() || null,
      logoUrl: data.logoUrl?.trim() || null,
      bannerUrl: data.bannerUrl?.trim() || null,
      description: data.description?.trim() || null,
      status: data.status || 'ACTIVE',
      displayOrder: data.displayOrder ?? 0,
      internalNotes: data.internalNotes?.trim() || null,
      createdById: adminUserId,
    },
    include: {
      contacts: true,
      _count: {
        select: { developments: true, contacts: true },
      },
    },
  });

  console.log(`[ADMIN_AUDIT] Construtora criada: "${company.tradeName}" (ID: ${company.id}) por Admin ID: ${adminUserId}`);
  return company;
}

export async function getCompanyById(
  id: string,
  userRole?: string,
  prisma: PrismaClient = defaultPrisma
) {
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      contacts: {
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      },
      developments: {
        select: {
          id: true,
          name: true,
          stage: true,
          status: true,
          city: true,
          neighborhood: true,
          totalUnits: true,
          totalTowers: true,
          deliveryDate: true,
          buildingId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: { developments: true, contacts: true },
      },
    },
  });

  if (!company) return null;
  return sanitizeCompany(company, userRole);
}

export async function listCompanies(
  params: ListCompaniesParams,
  userRole?: string,
  prisma: PrismaClient = defaultPrisma
) {
  const { search, status, city, state, page = 1, limit = 20 } = params;
  const skip = (Math.max(1, page) - 1) * limit;

  const where: any = {};

  if (status && status !== 'ALL') {
    where.status = status;
  } else if (userRole !== 'ADMIN') {
    where.status = 'ACTIVE';
  }

  if (city?.trim()) {
    where.city = { contains: city.trim(), mode: 'insensitive' };
  }

  if (state?.trim() && state !== 'ALL' && state !== 'TODAS') {
    where.state = { equals: state.trim(), mode: 'insensitive' };
  }

  if (search?.trim()) {
    const q = search.trim();
    const digits = normalizeCnpj(q);
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { tradeName: { contains: q, mode: 'insensitive' } },
      ...(digits ? [{ cnpj: { contains: digits } }] : []),
    ];
  }

  const [total, companies] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ displayOrder: 'asc' }, { tradeName: 'asc' }],
      include: {
        _count: {
          select: { developments: true, contacts: true },
        },
      },
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    companies: companies.map((c) => sanitizeCompany(c, userRole)),
  };
}

export async function updateCompany(
  id: string,
  data: UpdateCompanyInput,
  adminUserId: string,
  prisma: PrismaClient = defaultPrisma
) {
  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) {
    const err: any = new Error('Construtora não encontrada.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  let normalizedCnpj: string | null | undefined = undefined;
  if (data.cnpj !== undefined) {
    if (data.cnpj === null || data.cnpj.trim() === '') {
      normalizedCnpj = null;
    } else {
      normalizedCnpj = normalizeCnpj(data.cnpj);
      if (normalizedCnpj && !validateCnpj(normalizedCnpj)) {
        throw new Error('CNPJ inválido.');
      }
      if (normalizedCnpj && normalizedCnpj !== existing.cnpj) {
        const duplicate = await prisma.company.findUnique({
          where: { cnpj: normalizedCnpj },
        });
        if (duplicate && duplicate.id !== id) {
          const err: any = new Error(`Já existe outra construtora cadastrada com o CNPJ ${formatCnpj(normalizedCnpj)}.`);
          err.code = 'CONFLICT';
          throw err;
        }
      }
    }
  }

  const updated = await prisma.company.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name.trim() : undefined,
      tradeName: data.tradeName !== undefined ? data.tradeName.trim() : undefined,
      cnpj: normalizedCnpj,
      stateRegistration: data.stateRegistration !== undefined ? (data.stateRegistration?.trim() || null) : undefined,
      address: data.address !== undefined ? (data.address?.trim() || null) : undefined,
      number: data.number !== undefined ? (data.number?.trim() || null) : undefined,
      complement: data.complement !== undefined ? (data.complement?.trim() || null) : undefined,
      neighborhood: data.neighborhood !== undefined ? (data.neighborhood?.trim() || null) : undefined,
      city: data.city !== undefined ? (data.city?.trim() || 'Criciúma') : undefined,
      state: data.state !== undefined ? (data.state?.trim() || 'SC') : undefined,
      zipcode: data.zipcode !== undefined ? (data.zipcode?.trim() || null) : undefined,
      phone: data.phone !== undefined ? (data.phone?.trim() || null) : undefined,
      whatsapp: data.whatsapp !== undefined ? (data.whatsapp?.trim() || null) : undefined,
      email: data.email !== undefined ? (data.email?.trim() || null) : undefined,
      website: data.website !== undefined ? (data.website?.trim() || null) : undefined,
      logoUrl: data.logoUrl !== undefined ? (data.logoUrl?.trim() || null) : undefined,
      bannerUrl: data.bannerUrl !== undefined ? (data.bannerUrl?.trim() || null) : undefined,
      description: data.description !== undefined ? (data.description?.trim() || null) : undefined,
      status: data.status,
      displayOrder: data.displayOrder,
      internalNotes: data.internalNotes !== undefined ? (data.internalNotes?.trim() || null) : undefined,
    },
    include: {
      contacts: true,
      _count: {
        select: { developments: true, contacts: true },
      },
    },
  });

  console.log(`[ADMIN_AUDIT] Construtora atualizada: "${updated.tradeName}" (ID: ${updated.id}) por Admin ID: ${adminUserId}`);
  return updated;
}

export async function toggleCompanyStatus(
  id: string,
  adminUserId: string,
  prisma: PrismaClient = defaultPrisma
) {
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) {
    const err: any = new Error('Construtora não encontrada.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const nextStatus = company.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  const updated = await prisma.company.update({
    where: { id },
    data: { status: nextStatus },
  });

  console.log(`[ADMIN_AUDIT] Status da construtora "${company.tradeName}" alterado para ${nextStatus} por Admin ID: ${adminUserId}`);
  return updated;
}

export async function safeDeleteCompany(
  id: string,
  adminUserId: string,
  prisma: PrismaClient = defaultPrisma
) {
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      _count: {
        select: { developments: true },
      },
    },
  });

  if (!company) {
    const err: any = new Error('Construtora não encontrada.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Regra: Não permitir exclusão física de construtoras com empreendimentos vinculados
  if (company._count.developments > 0) {
    const err: any = new Error(
      `A construtora "${company.tradeName}" possui ${company._count.developments} empreendimento(s) vinculado(s) e não pode ser excluída. Desative-a alterando o status para INACTIVE.`
    );
    err.code = 'CONFLICT';
    throw err;
  }

  // Se não tem empreendimentos, permite exclusão segura
  await prisma.company.delete({ where: { id } });
  console.log(`[ADMIN_AUDIT] Construtora "${company.tradeName}" (ID: ${id}) excluída fisicamente por Admin ID: ${adminUserId}`);
  return { success: true, message: `Construtora ${company.tradeName} removida com sucesso.` };
}

// ==============================================================================
// OPERAÇÕES DE CONTATOS E GERENTES (COMPANYCONTACT)
// ==============================================================================

export async function createCompanyContact(
  companyId: string,
  data: CreateCompanyContactInput,
  adminUserId: string,
  prisma: PrismaClient = defaultPrisma
) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    const err: any = new Error('Construtora não encontrada.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (!data.name?.trim()) throw new Error('Nome do contato é obrigatório.');
  if (!data.role?.trim()) throw new Error('Cargo/Função é obrigatório.');

  const contact = await prisma.companyContact.create({
    data: {
      companyId,
      name: data.name.trim(),
      role: data.role.trim(),
      phone: data.phone?.trim() || null,
      whatsapp: data.whatsapp?.trim() || null,
      email: data.email?.trim() || null,
      photoUrl: data.photoUrl?.trim() || null,
      visibility: data.visibility || 'BROKERS_ONLY',
      status: data.status || 'ACTIVE',
      displayOrder: data.displayOrder ?? 0,
      internalNotes: data.internalNotes?.trim() || null,
    },
  });

  console.log(`[ADMIN_AUDIT] Contato criado: "${contact.name}" (${contact.role}) na empresa "${company.tradeName}" por Admin ID: ${adminUserId}`);
  return contact;
}

export async function updateCompanyContact(
  contactId: string,
  data: UpdateCompanyContactInput,
  adminUserId: string,
  prisma: PrismaClient = defaultPrisma
) {
  const contact = await prisma.companyContact.findUnique({ where: { id: contactId } });
  if (!contact) {
    const err: any = new Error('Contato não encontrado.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const updated = await prisma.companyContact.update({
    where: { id: contactId },
    data: {
      name: data.name !== undefined ? data.name.trim() : undefined,
      role: data.role !== undefined ? data.role.trim() : undefined,
      phone: data.phone !== undefined ? (data.phone?.trim() || null) : undefined,
      whatsapp: data.whatsapp !== undefined ? (data.whatsapp?.trim() || null) : undefined,
      email: data.email !== undefined ? (data.email?.trim() || null) : undefined,
      photoUrl: data.photoUrl !== undefined ? (data.photoUrl?.trim() || null) : undefined,
      visibility: data.visibility !== undefined ? data.visibility : undefined,
      status: data.status !== undefined ? data.status : undefined,
      displayOrder: data.displayOrder !== undefined ? data.displayOrder : undefined,
      internalNotes: data.internalNotes !== undefined ? (data.internalNotes?.trim() || null) : undefined,
    },
  });

  console.log(`[ADMIN_AUDIT] Contato atualizado: "${updated.name}" (ID: ${updated.id}) por Admin ID: ${adminUserId}`);
  return updated;
}

export async function getCompanyContactById(
  contactId: string,
  userRole?: string,
  prisma: PrismaClient = defaultPrisma
) {
  const contact = await prisma.companyContact.findUnique({
    where: { id: contactId },
    include: {
      company: {
        select: { id: true, name: true, tradeName: true, status: true },
      },
      developments: {
        include: {
          development: {
            select: { id: true, name: true, stage: true, status: true },
          },
        },
      },
    },
  });

  if (!contact) return null;
  return sanitizeContact(contact, userRole);
}

export async function listCompanyContacts(
  companyId: string,
  userRole?: string,
  prisma: PrismaClient = defaultPrisma
) {
  const contacts = await prisma.companyContact.findMany({
    where: { companyId },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    include: {
      developments: {
        include: {
          development: {
            select: { id: true, name: true, stage: true },
          },
        },
      },
    },
  });

  return contacts
    .map((c) => sanitizeContact(c, userRole))
    .filter(Boolean);
}

export async function deleteCompanyContact(
  contactId: string,
  adminUserId: string,
  prisma: PrismaClient = defaultPrisma
) {
  const contact = await prisma.companyContact.findUnique({ where: { id: contactId } });
  if (!contact) {
    const err: any = new Error('Contato não encontrado.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Ao deletar o contato, os vínculos em DevelopmentContact são excluídos em cascata
  await prisma.companyContact.delete({ where: { id: contactId } });
  console.log(`[ADMIN_AUDIT] Contato "${contact.name}" (ID: ${contactId}) excluído por Admin ID: ${adminUserId}`);
  return { success: true, message: `Contato ${contact.name} excluído com sucesso.` };
}

