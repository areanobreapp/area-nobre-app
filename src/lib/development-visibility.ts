import type { Prisma } from '@prisma/client';

/**
 * ÁREA NOBRE — BLOCO 6A.6
 * Regras centralizadas de visibilidade de empreendimentos (Development).
 *
 * A consulta final é SEMPRE composta por camadas independentes combinadas com AND,
 * de modo que nenhuma pesquisa textual ou filtro comercial consiga contornar as
 * restrições obrigatórias:
 *
 *   1. ACESSO       — quem pode, em tese, enxergar o registro.
 *   2. PUBLICAÇÃO   — se o registro está em condição de ser divulgado.
 *   3. COMERCIAL    — filtros escolhidos pelo usuário (estágio, construtora, cidade...).
 *   4. TEXTO        — pesquisa textual livre.
 *
 *   where = { AND: [acesso, publicacao, comercial, texto] }
 *
 * Classificação dos registros (sem alterar dados):
 *   - OFICIAL: possui companyId (cadastrado pelo fluxo administrativo de construtoras).
 *   - LEGADO : companyId nulo (criado antes do Bloco 6). Nunca é promovido
 *              automaticamente a oficial.
 */

export interface DevelopmentViewer {
  id: string;
  role?: string | null;
}

export type DevelopmentPublicationStatus = 'RASCUNHO' | 'PUBLICADO' | 'ARQUIVADO';

/**
 * Converte o valor persistido em `Development.status` para o estado conceitual
 * de divulgação exigido na Etapa 6A.7 (`RASCUNHO`, `PUBLICADO`, `ARQUIVADO`),
 * sem necessidade de migração destrutiva do banco.
 */
export function resolvePublicationStatus(status?: string | null): DevelopmentPublicationStatus {
  const s = (status || '').trim().toUpperCase();
  if (s === 'RASCUNHO' || s === 'DRAFT') return 'RASCUNHO';
  if (s === 'INATIVO' || s === 'ARQUIVADO' || s === 'INACTIVE' || s === 'ARCHIVED') return 'ARQUIVADO';
  return 'PUBLICADO';
}

/**
 * Normaliza entradas de `status` ou `publicationStatus` (vindas de formulários ou APIs)
 * para o valor canônico persistido na coluna `Development.status`:
 *   - RASCUNHO  -> 'Rascunho'
 *   - PUBLICADO -> 'Ativo'
 *   - ARQUIVADO -> 'Inativo'
 */
export function normalizeDevelopmentStatusInput(
  status?: string | null,
  publicationStatus?: string | null
): 'Ativo' | 'Rascunho' | 'Inativo' {
  const raw = (publicationStatus || status || 'Ativo').trim().toUpperCase();
  if (raw === 'RASCUNHO' || raw === 'DRAFT') return 'Rascunho';
  if (raw === 'ARQUIVADO' || raw === 'INATIVO' || raw === 'INACTIVE' || raw === 'ARCHIVED') return 'Inativo';
  return 'Ativo';
}

export function isAdminViewer(viewer: DevelopmentViewer | null | undefined): boolean {
  return viewer?.role === 'ADMIN';
}

/** Registros nos quais o usuário figura como criador ou corretor responsável. */
function ownWhere(viewer: DevelopmentViewer): Prisma.DevelopmentWhereInput {
  return { OR: [{ userId: viewer.id }, { responsibleBrokerId: viewer.id }] };
}

/**
 * Camada 1 — ACESSO.
 * ADMIN: tudo. Corretor: registros próprios, oficiais e legados de corretores ativos
 * (regra de base compartilhada já existente no mapa).
 */
export function buildDevelopmentAccessWhere(viewer: DevelopmentViewer): Prisma.DevelopmentWhereInput {
  if (isAdminViewer(viewer)) return {};

  return {
    OR: [
      ownWhere(viewer),
      // Oficiais (vinculados a uma construtora cadastrada)
      { companyId: { not: null } },
      // Legados: somente quando o corretor responsável continua ativo
      {
        companyId: null,
        OR: [
          { responsibleBroker: { is: { status: 'ACTIVE' } } },
          { responsibleBrokerId: null, user: { is: { status: 'ACTIVE' } } },
        ],
      },
    ],
  };
}

/**
 * Camada 2 — PUBLICAÇÃO.
 * Para o corretor, registros de terceiros só aparecem quando ativos e, se oficiais,
 * quando a construtora está ativa.
 *
 * PONTO DE EXTENSÃO: ao introduzir `Development.publicationStatus` (decisão D3),
 * acrescentar `publicationStatus: 'PUBLICADO'` ao ramo "divulgável" abaixo.
 * Nenhum outro ponto do código precisa mudar.
 */
export function buildDevelopmentPublicationWhere(viewer: DevelopmentViewer): Prisma.DevelopmentWhereInput {
  if (isAdminViewer(viewer)) return {};

  return {
    OR: [
      // Registros legados próprios (sem construtora oficial vinculada)
      { companyId: null, ...ownWhere(viewer) },
      // Registros PUBLICADOS (status === 'Ativo')
      {
        status: 'Ativo',
        // << publicationStatus: 'PUBLICADO' (futuro, D3) >>
        OR: [{ companyId: null }, { company: { is: { status: 'ACTIVE' } } }],
      },
    ],
  };
}

export interface DevelopmentCommercialFilters {
  stage?: string | null;
  status?: string | null;
  projectType?: string | null;
  companyId?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  /** Somente ADMIN: filtra pelo corretor responsável. */
  brokerId?: string | null;
  /** 'mine' restringe aos registros do próprio usuário. */
  scope?: string | null;
}

/** Camada 3 — filtros comerciais explícitos. Nunca amplia o acesso, apenas restringe. */
export function buildDevelopmentCommercialWhere(
  viewer: DevelopmentViewer,
  f: DevelopmentCommercialFilters
): Prisma.DevelopmentWhereInput {
  const and: Prisma.DevelopmentWhereInput[] = [];

  if (f.stage && f.stage !== 'Todos') and.push({ stage: f.stage });
  if (f.status && f.status !== 'Todos') {
    const normStatus = normalizeDevelopmentStatusInput(f.status, f.status);
    and.push({ status: normStatus });
  }
  if (f.projectType && f.projectType !== 'Todos') {
    and.push({ projectType: f.projectType.trim().toUpperCase() });
  }
  if (f.companyId) and.push({ companyId: f.companyId });
  if (f.city?.trim()) and.push({ city: { contains: f.city.trim(), mode: 'insensitive' } });
  if (f.neighborhood?.trim()) and.push({ neighborhood: { contains: f.neighborhood.trim(), mode: 'insensitive' } });
  if (isAdminViewer(viewer) && f.brokerId) and.push({ responsibleBrokerId: f.brokerId });
  if (f.scope === 'mine') and.push(ownWhere(viewer));

  return and.length ? { AND: and } : {};
}

/**
 * Camada 4 — pesquisa textual. Considera apenas campos de apresentação.
 * Campos internos (observações internas) NUNCA participam da busca.
 */
export function buildDevelopmentTextWhere(search?: string | null): Prisma.DevelopmentWhereInput {
  const q = search?.trim();
  if (!q) return {};
  const contains = { contains: q, mode: 'insensitive' as const };
  return {
    OR: [
      { name: contains },
      { developer: contains },
      { neighborhood: contains },
      { city: contains },
      { address: contains },
      { company: { is: { tradeName: contains } } },
      { company: { is: { name: contains } } },
    ],
  };
}

/** Composição final. As camadas obrigatórias jamais são substituídas. */
export function buildDevelopmentWhere(
  viewer: DevelopmentViewer,
  filters: DevelopmentCommercialFilters & { search?: string | null } = {}
): Prisma.DevelopmentWhereInput {
  return {
    AND: [
      buildDevelopmentAccessWhere(viewer),
      buildDevelopmentPublicationWhere(viewer),
      buildDevelopmentCommercialWhere(viewer, filters),
      buildDevelopmentTextWhere(filters.search),
    ],
  };
}

/** Condição "este id é visível para este usuário" (detalhe por ID). */
export function buildDevelopmentVisibleByIdWhere(
  viewer: DevelopmentViewer,
  id: string
): Prisma.DevelopmentWhereInput {
  return {
    AND: [{ id }, buildDevelopmentAccessWhere(viewer), buildDevelopmentPublicationWhere(viewer)],
  };
}

/**
 * Remove dados internos antes de enviar ao navegador.
 * Observações internas e notas de tipologias só vão para ADMIN ou para o próprio autor.
 */
export function sanitizeDevelopmentForViewer<T extends Record<string, any>>(
  dev: T,
  viewer: DevelopmentViewer
): T & { publicationStatus: DevelopmentPublicationStatus } {
  const admin = isAdminViewer(viewer);
  const owner = !dev.companyId && (dev.userId === viewer.id || dev.responsibleBrokerId === viewer.id);
  const publicationStatus = resolvePublicationStatus(dev.status);

  if (admin || owner) {
    return {
      ...dev,
      publicationStatus,
    };
  }

  return {
    ...dev,
    publicationStatus,
    internalNotes: null,
    typologies: Array.isArray(dev.typologies)
      ? dev.typologies.map((t: any) => ({ ...t, notes: null }))
      : dev.typologies,
  };
}

/** Select padrão de construtora exposto junto ao empreendimento. */
export const DEVELOPMENT_COMPANY_SELECT = {
  id: true,
  name: true,
  tradeName: true,
  cnpj: true,
  city: true,
  state: true,
  status: true,
  logoUrl: true,
} as const;

/** Select padrão do edifício vinculado (identidade cartográfica). */
export const DEVELOPMENT_BUILDING_SELECT = {
  id: true,
  name: true,
  latitude: true,
  longitude: true,
  status: true,
} as const;

