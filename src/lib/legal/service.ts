import { prisma } from '@/lib/db';
import {
  LegalDocumentType,
  LegalDocumentStatus,
  LegalAcceptanceAction,
  PropertyAuthorizationStatus,
  PropertyAuthorizationState,
} from './types';

/**
 * Consulta a versão ativa e publicada de um determinado tipo de documento legal.
 * Retorna null se não houver versão publicada cadastrada.
 */
export async function getActiveLegalDocument(type: LegalDocumentType) {
  return prisma.legalDocument.findFirst({
    where: {
      type,
      status: LegalDocumentStatus.PUBLISHED,
    },
    orderBy: [
      { effectiveDate: 'desc' },
      { publishedAt: 'desc' },
      { createdAt: 'desc' },
    ],
  });
}

/**
 * Verifica se um usuário possui aceite ou ciência registrado para um documento específico.
 */
export async function hasUserAcceptedDocument(
  userId: string,
  documentId: string
): Promise<boolean> {
  const count = await prisma.legalAcceptance.count({
    where: {
      userId,
      documentId,
    },
  });
  return count > 0;
}

/**
 * Registra a manifestação de um usuário em relação a um documento legal.
 * Previne duplicações através da restrição única no banco (userId + documentId).
 */
export async function recordUserAcceptance(params: {
  userId: string;
  documentId: string;
  action?: LegalAcceptanceAction;
}) {
  const doc = await prisma.legalDocument.findUnique({
    where: { id: params.documentId },
  });

  if (!doc) {
    throw new Error('Documento legal não encontrado.');
  }

  const defaultAction =
    doc.type === LegalDocumentType.TERMS_OF_USE
      ? LegalAcceptanceAction.ACCEPTED
      : LegalAcceptanceAction.ACKNOWLEDGED;

  return prisma.legalAcceptance.upsert({
    where: {
      userId_documentId: {
        userId: params.userId,
        documentId: params.documentId,
      },
    },
    create: {
      userId: params.userId,
      documentId: params.documentId,
      documentType: doc.type,
      documentVersion: doc.version,
      action: params.action || defaultAction,
    },
    update: {
      // Aceites anteriores são preservados; não altera a data original de aceite se já existir
    },
  });
}

/**
 * Consulta o estado atual de autorização do corretor para um imóvel.
 *
 * Regra de produto:
 * - Se existir registro ativo com status CONFIRMED -> retorna CONFIRMED.
 * - Se o registro mais recente tiver status REVOKED -> retorna REVOKED.
 * - Se não houver nenhum registro -> retorna NOT_CONFIRMED.
 */
export async function getPropertyAuthorizationState(
  propertyId: string,
  brokerId: string
): Promise<PropertyAuthorizationState> {
  const latest = await prisma.propertyAuthorization.findFirst({
    where: {
      propertyId,
      brokerId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!latest) {
    return {
      status: PropertyAuthorizationStatus.NOT_CONFIRMED,
    };
  }

  if (latest.status === 'CONFIRMED') {
    return {
      status: PropertyAuthorizationStatus.CONFIRMED,
      authorizationId: latest.id,
      confirmedAt: latest.confirmedAt,
      documentVersion: latest.documentVersion,
    };
  }

  return {
    status: PropertyAuthorizationStatus.REVOKED,
    authorizationId: latest.id,
    confirmedAt: latest.confirmedAt,
    documentVersion: latest.documentVersion,
    revokedAt: latest.revokedAt || undefined,
    revocationReason: latest.revocationReason || undefined,
  };
}

/**
 * Consulta a versão mais recente da Declaração de Autorização para Divulgação de Imóvel.
 * Prioriza versão PUBLISHED; caso ainda em versão preliminar (DRAFT), retorna a mais recente em DRAFT.
 */
export async function getLatestPropertyAuthorizationDocument() {
  const published = await prisma.legalDocument.findFirst({
    where: {
      type: LegalDocumentType.PROPERTY_AUTHORIZATION,
      status: LegalDocumentStatus.PUBLISHED,
    },
    orderBy: [
      { effectiveDate: 'desc' },
      { publishedAt: 'desc' },
      { createdAt: 'desc' },
    ],
  });
  if (published) return published;

  return prisma.legalDocument.findFirst({
    where: {
      type: LegalDocumentType.PROPERTY_AUTHORIZATION,
      status: LegalDocumentStatus.DRAFT,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Registra ou atualiza a declaração de autorização de um corretor para um imóvel específico.
 * Se já houver registro ativo CONFIRMED, atualiza o vínculo para o novo documento/versão.
 * Se for a primeira confirmação ou após revogação, cria um novo registro CONFIRMED.
 * Quando existir uma versão oficial PUBLISHED, ela é obrigatoriamente vinculada à confirmação.
 */
export async function recordPropertyAuthorization(params: {
  propertyId: string;
  brokerId: string;
  documentId?: string;
}) {
  // Se existir versão PUBLISHED ativa da declaração, ela deve ser obrigatoriamente utilizada
  const publishedDoc = await prisma.legalDocument.findFirst({
    where: {
      type: LegalDocumentType.PROPERTY_AUTHORIZATION,
      status: LegalDocumentStatus.PUBLISHED,
    },
    orderBy: [
      { effectiveDate: 'desc' },
      { publishedAt: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  let doc = publishedDoc;

  if (!doc) {
    if (params.documentId) {
      doc = await prisma.legalDocument.findUnique({
        where: { id: params.documentId },
      });
    }
    if (!doc) {
      doc = await getLatestPropertyAuthorizationDocument();
    }
  }

  if (!doc) {
    throw new Error('Documento de declaração de autorização não encontrado no sistema.');
  }

  // Verifica se já existe autorização com status CONFIRMED para o par (propertyId, brokerId)
  const existingConfirmed = await prisma.propertyAuthorization.findFirst({
    where: {
      propertyId: params.propertyId,
      brokerId: params.brokerId,
      status: 'CONFIRMED',
    },
  });

  if (existingConfirmed) {
    return prisma.propertyAuthorization.update({
      where: { id: existingConfirmed.id },
      data: {
        documentId: doc.id,
        documentVersion: doc.version,
        confirmedAt: new Date(),
      },
    });
  }

  return prisma.propertyAuthorization.create({
    data: {
      propertyId: params.propertyId,
      brokerId: params.brokerId,
      documentId: doc.id,
      documentVersion: doc.version,
      status: 'CONFIRMED',
      confirmedAt: new Date(),
    },
  });
}

/**
 * Revoga uma autorização ativa sem apagar o histórico anterior de forma estritamente ATÔMICA.
 * Em caso de falha em qualquer operação, toda a transação é revertida via prisma.$transaction.
 * Atualiza o registro ativo marcando status = 'REVOKED' e gravando timestamp e responsável.
 * Imediatamente suspende a exposição pública do imóvel (isPublic: false, status: 'Inativo')
 * e desativa links públicos de parceiros (PropertyShare).
 */
export async function revokePropertyAuthorization(params: {
  propertyId: string;
  brokerId: string;
  revokedByUserId?: string;
  reason?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const activeAuth = await tx.propertyAuthorization.findFirst({
      where: {
        propertyId: params.propertyId,
        brokerId: params.brokerId,
        status: 'CONFIRMED',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let revokedAuth = null;

    if (activeAuth) {
      revokedAuth = await tx.propertyAuthorization.update({
        where: { id: activeAuth.id },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revokedBy: params.revokedByUserId || null,
          revocationReason: params.reason || null,
        },
      });
    } else {
      // Se for imóvel legado sem registro CONFIRMED anterior, cria registro auditável REVOKED
      const doc = await getLatestPropertyAuthorizationDocument();
      if (doc) {
        revokedAuth = await tx.propertyAuthorization.create({
          data: {
            propertyId: params.propertyId,
            brokerId: params.brokerId,
            documentId: doc.id,
            documentVersion: doc.version,
            status: 'REVOKED',
            confirmedAt: new Date(),
            revokedAt: new Date(),
            revokedBy: params.revokedByUserId || null,
            revocationReason: params.reason || null,
          },
        });
      }
    }

    // 1. Imediatamente retira a visibilidade e publicação do imóvel
    await tx.property.update({
      where: { id: params.propertyId },
      data: {
        isPublic: false,
        status: 'Inativo',
      },
    });

    // 2. Desativa quaisquer PropertyShare ativos para este imóvel
    await tx.propertyShare.updateMany({
      where: {
        propertyId: params.propertyId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    return revokedAuth;
  });
}

/**
 * Verifica centralmente se um imóvel pode ser exposto publicamente ou ativado comercialmente.
 * Respeita as regras:
 * 1. Imóveis com revogação ativa NUNCA podem ser públicos (mesmo que legados).
 * 2. Imóveis históricos (legacyExemptFromAuthorization) sem revogação são isentos.
 * 3. Imóveis novos exigem autorização CONFIRMED do corretor responsável.
 * 4. Se houver versão PUBLISHED ativa oficial, confirmações atreladas a rascunhos antigos (DRAFT)
 *    ou versões obsoletas não satisfazem a exibição pública oficial, sinalizando requiresNewVersionConfirmation.
 */
export async function canPropertyBePubliclyExposed(propertyId: string): Promise<{
  allowed: boolean;
  reason?: string;
  authorization?: any;
  isLegacy?: boolean;
  requiresNewVersionConfirmation?: boolean;
}> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      userId: true,
      responsibleBrokerId: true,
      status: true,
      legacyExemptFromAuthorization: true,
    },
  });

  if (!property) {
    return { allowed: false, reason: 'Imóvel não encontrado.' };
  }

  const brokerId = property.responsibleBrokerId || property.userId;
  if (!brokerId) {
    return { allowed: false, reason: 'Corretor responsável não identificado no cadastro.' };
  }

  // Verifica se há revogação registrada para este imóvel
  const latestRevoked = await prisma.propertyAuthorization.findFirst({
    where: {
      propertyId,
      status: 'REVOKED',
    },
    orderBy: { createdAt: 'desc' },
  });

  // Verifica se há confirmação posterior à revogação (ou a mais recente ativa)
  const latestConfirmed = await prisma.propertyAuthorization.findFirst({
    where: {
      propertyId,
      brokerId,
      status: 'CONFIRMED',
    },
    include: {
      document: {
        select: {
          id: true,
          status: true,
          version: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (latestRevoked) {
    if (!latestConfirmed || latestConfirmed.confirmedAt <= latestRevoked.revokedAt!) {
      return {
        allowed: false,
        reason: 'Autorização revogada — divulgação suspensa.',
      };
    }
  }

  // Imóvel legado sem revogação ativa: isento de bloqueio
  if (property.legacyExemptFromAuthorization) {
    return {
      allowed: true,
      isLegacy: true,
    };
  }

  // Imóvel novo ou existente com autorização CONFIRMED válida
  // Regra da Etapa 1.5: anúncios existentes preservam confirmações de versões anteriores
  // sem exigência de igualdade global de versão para anúncios já publicados.
  if (latestConfirmed) {
    return {
      allowed: true,
      authorization: latestConfirmed,
    };
  }

  return {
    allowed: false,
    reason: 'Autorização ainda não confirmada — imóvel salvo como inativo.',
  };
}

/**
 * Retorna o histórico auditável de autorizações de um imóvel.
 */
export async function getPropertyAuthorizationAuditHistory(propertyId: string) {
  return prisma.propertyAuthorization.findMany({
    where: { propertyId },
    include: {
      broker: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      document: {
        select: {
          id: true,
          type: true,
          version: true,
          title: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Consulta o estado consolidado dos documentos e aceites para um usuário.
 * Retorna as versões ativas de Termos e Privacidade e os respectivos aceites do usuário.
 */
export async function getUserLegalStatus(userId?: string | null) {
  const [activeTerms, activePrivacy] = await Promise.all([
    getActiveLegalDocument(LegalDocumentType.TERMS_OF_USE),
    getActiveLegalDocument(LegalDocumentType.PRIVACY_POLICY),
  ]);

  let termsAcceptance = null;
  let privacyAcceptance = null;

  if (userId) {
    if (activeTerms) {
      termsAcceptance = await prisma.legalAcceptance.findUnique({
        where: {
          userId_documentId: {
            userId,
            documentId: activeTerms.id,
          },
        },
      });
    }

    if (activePrivacy) {
      privacyAcceptance = await prisma.legalAcceptance.findUnique({
        where: {
          userId_documentId: {
            userId,
            documentId: activePrivacy.id,
          },
        },
      });
    }
  }

  const termsPublished = !!activeTerms;
  const privacyPublished = !!activePrivacy;

  const hasAcceptedTerms = !!termsAcceptance;
  const hasAcknowledgedPrivacy = !!privacyAcceptance;

  // Só exige aceite se houver documento efetivamente publicado que o usuário ainda não confirmou
  const needsTerms = termsPublished && !hasAcceptedTerms;
  const needsPrivacy = privacyPublished && !hasAcknowledgedPrivacy;

  return {
    terms: {
      isPublished: termsPublished,
      id: activeTerms?.id || null,
      version: activeTerms?.version || null,
      title: activeTerms?.title || null,
      publishedAt: activeTerms?.publishedAt || null,
      userAccepted: hasAcceptedTerms,
      acceptedAt: termsAcceptance?.acceptedAt || null,
    },
    privacy: {
      isPublished: privacyPublished,
      id: activePrivacy?.id || null,
      version: activePrivacy?.version || null,
      title: activePrivacy?.title || null,
      publishedAt: activePrivacy?.publishedAt || null,
      userAcknowledged: hasAcknowledgedPrivacy,
      acknowledgedAt: privacyAcceptance?.acceptedAt || null,
    },
    hasPendingAcceptance: !!userId && (needsTerms || needsPrivacy),
  };
}

/**
 * Atualização controlada de documentos legais com garantia de imutabilidade.
 * Documentos já publicados ou arquivados não podem ter conteúdo, título, versão ou tipo modificados.
 */
export async function updateLegalDocument(
  id: string,
  data: {
    title?: string;
    content?: string;
    status?: LegalDocumentStatus;
    version?: string;
    type?: LegalDocumentType;
  }
) {
  const current = await prisma.legalDocument.findUnique({ where: { id } });
  if (!current) {
    throw new Error('Documento legal não encontrado.');
  }

  const isLocked =
    current.status === LegalDocumentStatus.PUBLISHED ||
    current.status === LegalDocumentStatus.ARCHIVED;

  if (isLocked) {
    if (
      (data.content !== undefined && data.content !== current.content) ||
      (data.type !== undefined && data.type !== current.type) ||
      (data.version !== undefined && data.version !== current.version) ||
      (data.title !== undefined && data.title !== current.title)
    ) {
      throw new Error(
        'Imutabilidade jurídica violada: versões publicadas ou arquivadas não podem ter seu conteúdo, título, tipo ou versão alterados.'
      );
    }
  }

  return prisma.legalDocument.update({
    where: { id },
    data: {
      title: data.title,
      content: data.content,
      status: data.status,
      version: data.version,
      type: data.type,
      publishedAt:
        data.status === LegalDocumentStatus.PUBLISHED && !current.publishedAt
          ? new Date()
          : undefined,
    },
  });
}

/**
 * Exclusão estrita de documentos legais.
 * Apenas rascunhos sem aceites ou autorizações vinculadas podem ser excluídos.
 */
export async function deleteLegalDocument(id: string) {
  const current = await prisma.legalDocument.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          acceptances: true,
          authorizations: true,
        },
      },
    },
  });

  if (!current) {
    throw new Error('Documento legal não encontrado.');
  }

  if (current.status !== LegalDocumentStatus.DRAFT) {
    throw new Error(
      'Apenas rascunhos podem ser excluídos. Documentos publicados ou arquivados são preservados para fins probatórios.'
    );
  }

  if (current._count.acceptances > 0 || current._count.authorizations > 0) {
    throw new Error(
      'Não é permitido excluir documentos com aceites ou autorizações vinculadas.'
    );
  }

  return prisma.legalDocument.delete({ where: { id } });
}

/**
 * Consulta todos os documentos jurídicos com estatísticas de uso (aceites e autorizações).
 * Agrupa versões ativas, rascunhos e histórico arquivado para visualização administrativa.
 */
export async function listLegalDocumentsWithStats() {
  return prisma.legalDocument.findMany({
    include: {
      _count: {
        select: {
          acceptances: true,
          authorizations: true,
        },
      },
    },
    orderBy: [
      { type: 'asc' },
      { createdAt: 'desc' },
    ],
  });
}

/**
 * Cria uma nova versão de documento legal em status DRAFT (Rascunho).
 * Regras:
 * - Valida campos obrigatórios e não vazios.
 * - Impede duplicidade de tipo + versão.
 * - Registra autoria administrativa.
 */
export async function createDraftLegalDocument(params: {
  type: LegalDocumentType;
  version: string;
  title: string;
  content: string;
  createdById?: string;
}) {
  const trimmedVersion = params.version?.trim();
  const trimmedTitle = params.title?.trim();
  const trimmedContent = params.content?.trim();

  if (!trimmedVersion) {
    throw new Error('A identificação de versão é obrigatória (ex: 1.1, 2.0).');
  }
  if (!trimmedTitle) {
    throw new Error('O título do documento é obrigatório.');
  }
  if (!trimmedContent) {
    throw new Error('O conteúdo textual do documento não pode ser vazio.');
  }

  // Verifica duplicação de versão para o mesmo tipo
  const existing = await prisma.legalDocument.findUnique({
    where: {
      type_version: {
        type: params.type,
        version: trimmedVersion,
      },
    },
  });

  if (existing) {
    throw new Error(
      `Já existe uma versão "${trimmedVersion}" cadastrada para o documento ${params.type}. Escolha outra numeração.`
    );
  }

  return prisma.legalDocument.create({
    data: {
      type: params.type,
      version: trimmedVersion,
      title: trimmedTitle,
      content: trimmedContent,
      status: LegalDocumentStatus.DRAFT,
      createdById: params.createdById || null,
    },
  });
}

/**
 * Publicação transacional e segura de um documento legal.
 * Regras:
 * - Apenas documentos em DRAFT podem ser publicados.
 * - Garante exatamente UMA versão com status PUBLISHED por tipo de documento.
 * - Arquiva a versão PUBLISHED anterior do mesmo tipo em uma única transação atômica.
 * - Registra data/hora da publicação e início de vigência.
 * - Bloqueio de governança para a Etapa 1.5: não permite publicar os 3 documentos reais em DEV.
 */
export async function publishLegalDocument(
  documentId: string,
  options?: {
    isSimulation?: boolean;
    adminUserId?: string;
  }
) {
  const target = await prisma.legalDocument.findUnique({
    where: { id: documentId },
  });

  if (!target) {
    throw new Error('Documento legal não encontrado.');
  }

  if (target.status !== LegalDocumentStatus.DRAFT) {
    throw new Error(
      `Apenas documentos em rascunho (DRAFT) podem ser publicados. Status atual: ${target.status}.`
    );
  }

  if (!target.content || !target.content.trim()) {
    throw new Error('Não é permitido publicar um documento com conteúdo vazio.');
  }

  // Bloqueio de governança estrito para os 3 documentos reais originais da Área Nobre em DEV (v1.0)
  const isOriginalDevDocument =
    target.version === '1.0' &&
    [
      LegalDocumentType.TERMS_OF_USE,
      LegalDocumentType.PRIVACY_POLICY,
      LegalDocumentType.PROPERTY_AUTHORIZATION,
    ].includes(target.type as any);

  if (isOriginalDevDocument && !options?.isSimulation) {
    throw new Error(
      'A publicação oficial dos documentos existentes da Área Nobre está bloqueada nesta etapa conforme diretriz de governança — requer autorização expressa posterior.'
    );
  }

  return prisma.$transaction(async (tx) => {
    // 1. Arquiva a versão anteriormente PUBLISHED do mesmo tipo, se houver
    await tx.legalDocument.updateMany({
      where: {
        type: target.type,
        status: LegalDocumentStatus.PUBLISHED,
      },
      data: {
        status: LegalDocumentStatus.ARCHIVED,
      },
    });

    // 2. Publica a nova versão
    const published = await tx.legalDocument.update({
      where: { id: target.id },
      data: {
        status: LegalDocumentStatus.PUBLISHED,
        publishedAt: new Date(),
        effectiveDate: new Date(),
      },
    });

    return published;
  });
}

/**
 * Consulta administrativa do histórico auditável de aceites gerais (LegalAcceptance).
 */
export async function getLegalAcceptancesAudit(params?: {
  type?: string;
  version?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};

  if (params?.type && params.type !== 'ALL') {
    where.documentType = params.type;
  }
  if (params?.version && params.version !== 'ALL') {
    where.documentVersion = params.version;
  }
  if (params?.search) {
    const s = params.search.trim();
    where.OR = [
      { user: { name: { contains: s, mode: 'insensitive' } } },
      { user: { email: { contains: s, mode: 'insensitive' } } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.legalAcceptance.count({ where }),
    prisma.legalAcceptance.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        document: {
          select: {
            id: true,
            type: true,
            version: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: { acceptedAt: 'desc' },
      take: params?.limit || 50,
      skip: params?.offset || 0,
    }),
  ]);

  return { total, items };
}

/**
 * Consulta administrativa do histórico auditável de autorizações de imóveis (PropertyAuthorization).
 */
export async function getPropertyAuthorizationsAudit(params?: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};

  if (params?.status && params.status !== 'ALL') {
    where.status = params.status;
  }
  if (params?.search) {
    const s = params.search.trim();
    where.OR = [
      { broker: { name: { contains: s, mode: 'insensitive' } } },
      { broker: { email: { contains: s, mode: 'insensitive' } } },
      { property: { title: { contains: s, mode: 'insensitive' } } },
      { property: { internalCode: { contains: s, mode: 'insensitive' } } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.propertyAuthorization.count({ where }),
    prisma.propertyAuthorization.findMany({
      where,
      include: {
        broker: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        property: {
          select: {
            id: true,
            title: true,
            internalCode: true,
            city: true,
            state: true,
            isPublic: true,
            status: true,
            publicId: true,
          },
        },
        document: {
          select: {
            id: true,
            type: true,
            version: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: { confirmedAt: 'desc' },
      take: params?.limit || 50,
      skip: params?.offset || 0,
    }),
  ]);

  return { total, items };
}

export { assertUserAcceptedTerms } from './guard';
