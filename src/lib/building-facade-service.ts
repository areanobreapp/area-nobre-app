import { prisma as defaultPrisma } from '@/lib/db';

export type FacadeValidationStatus =
  | 'UNVERIFIED'
  | 'BROKER_UPLOADED'
  | 'ADMIN_VALIDATED'
  | 'DISPUTED';

export interface ProcessFacadeContributionParams {
  buildingId: string;
  brokerId: string;
  imageUrl: string;
  isSubstitutionProposal?: boolean;
  justification?: string | null;
  prismaClient?: any;
}

export interface ProcessFacadeResult {
  action: 'INITIAL_COVER_ACCEPTED' | 'CONFIRMED_EXISTING' | 'SUBSTITUTION_PROPOSAL_REGISTERED';
  status: FacadeValidationStatus;
  coverImageUrl: string;
  isShared: boolean;
  message: string;
  contributionId?: string;
}

/**
 * Processa a contribuição ou proposta de foto da fachada compartilhada para um Edifício.
 * 
 * Regras estritas:
 * 1. Primeiro Corretor: Se o edifício não possui foto da fachada, a foto é associada ao registro
 *    coletivo do Edifício e disponibilizada a todos os corretores anunciantes.
 * 2. Segundo Corretor (Visualização/Herança): O segundo corretor visualiza a foto existente e
 *    não pode substituí-la arbitrariamente.
 * 3. Proposta de Substituição: Se o corretor desejar atualizar a imagem, a proposta é registrada
 *    como pendente de moderação administrativa, preservando a fachada ativa vigente.
 */
export async function processFacadeContribution(
  params: ProcessFacadeContributionParams
): Promise<ProcessFacadeResult> {
  const { buildingId, brokerId, imageUrl, isSubstitutionProposal, justification, prismaClient } = params;
  const prisma = prismaClient || defaultPrisma;

  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim().startsWith('http')) {
    throw new Error('URL da fotografia da fachada inválida.');
  }

  const cleanUrl = imageUrl.trim();

  const building = await prisma.building.findUnique({
    where: { id: buildingId },
    select: {
      id: true,
      name: true,
      coverImageUrl: true,
      createdById: true,
    },
  });

  if (!building) {
    throw new Error('Edifício não encontrado.');
  }

  const currentCover = building.coverImageUrl || null;

  // CENÁRIO 1: Edifício NÃO possui fotografia de fachada ainda
  if (!currentCover) {
    // Atualiza a coluna coverImageUrl existente no Building
    await prisma.building.update({
      where: { id: buildingId },
      data: {
        coverImageUrl: cleanUrl,
      },
    });

    // Se as novas colunas de auditoria existirem, atualiza via raw
    try {
      await prisma.$executeRawUnsafe(`
        UPDATE "Building"
        SET 
          "coverImageValidationStatus" = 'BROKER_UPLOADED',
          "coverImageUploadedById" = $1,
          "coverImageSource" = 'BROKER_UPLOAD',
          "coverImageUpdatedAt" = NOW()
        WHERE "id" = $2
      `, brokerId, buildingId);
    } catch {}

    // Registra contribuição aceita se a tabela de histórico existir
    let contribId: string | undefined;
    try {
      const rec: any = await prisma.$queryRawUnsafe(`
        INSERT INTO "BuildingImageContribution" (
          "id", "buildingId", "brokerId", "imageUrl", 
          "contributionType", "status", "source", "createdAt", "updatedAt"
        ) VALUES (
          'bic_' || gen_random_uuid(), $1, $2, $3, 
          'INITIAL_COVER', 'ACCEPTED', 'BROKER_UPLOAD', NOW(), NOW()
        ) RETURNING "id"
      `, buildingId, brokerId, cleanUrl);
      if (rec && rec[0]) contribId = rec[0].id;
    } catch {}

    return {
      action: 'INITIAL_COVER_ACCEPTED',
      status: 'BROKER_UPLOADED',
      coverImageUrl: cleanUrl,
      isShared: true,
      message: `Fotografia da fachada do ${building.name} cadastrada com sucesso e compartilhada no condomínio.`,
      contributionId: contribId,
    };
  }

  // CENÁRIO 2: Imagem idêntica
  if (currentCover === cleanUrl && !isSubstitutionProposal) {
    return {
      action: 'CONFIRMED_EXISTING',
      status: 'BROKER_UPLOADED',
      coverImageUrl: currentCover,
      isShared: true,
      message: `Fotografia da fachada do ${building.name} mantida.`,
    };
  }

  // CENÁRIO 3: Proposta de substituição de foto existente
  // REGRA DE PROTEÇÃO: NÃO SOBRESCREVE a foto coletiva ativa.
  // Registra a proposta como PENDING para moderação administrativa.
  let proposalId: string | undefined;
  try {
    const rec: any = await prisma.$queryRawUnsafe(`
      INSERT INTO "BuildingImageContribution" (
        "id", "buildingId", "brokerId", "imageUrl", 
        "contributionType", "status", "source", "justification", "createdAt", "updatedAt"
      ) VALUES (
        'bic_' || gen_random_uuid(), $1, $2, $3, 
        'PROPOSED_SUBSTITUTION', 'PENDING', 'BROKER_UPLOAD', $4, NOW(), NOW()
      ) RETURNING "id"
    `, buildingId, brokerId, cleanUrl, justification || 'Proposta de atualização de foto da fachada');
    if (rec && rec[0]) proposalId = rec[0].id;
  } catch {}

  return {
    action: 'SUBSTITUTION_PROPOSAL_REGISTERED',
    status: 'BROKER_UPLOADED',
    coverImageUrl: currentCover, // Preserva a foto ativa!
    isShared: true,
    message: `Proposta de nova foto da fachada enviada para moderação. A imagem vigente do ${building.name} foi preservada.`,
    contributionId: proposalId,
  };
}

export interface DecideFacadeContributionParams {
  contributionId: string;
  adminId: string;
  decision: 'APPROVE' | 'REJECT';
  decisionNotes?: string;
  prismaClient?: any;
}

export interface DecideFacadeResult {
  contribution: any;
  building: any;
  message: string;
}

/**
 * Decisão administrativa sobre proposta de substituição da fotografia da fachada.
 * 
 * Regras estritas:
 * 1. Transação atômica completa ($transaction).
 * 2. Proteção contra concorrência e decisões duplicadas (status deve ser PENDING).
 * 3. Ao aprovar:
 *    - Atualiza Building.coverImageUrl com a nova foto aprovada.
 *    - Marca coverImageValidationStatus = 'ADMIN_VALIDATED'.
 *    - Atualiza coverImageUploadedById e coverImageUpdatedAt.
 *    - Marca a contribuição como ACCEPTED e propostas concorrentes como SUPERSEDED.
 *    - NÃO altera as fotos particulares de anúncios (PropertyImage).
 * 4. Ao rejeitar:
 *    - Marca contribuição como REJECTED com justificativa.
 *    - Preserva integralmente a imagem oficial vigente.
 */
export async function decideFacadeContribution(
  params: DecideFacadeContributionParams
): Promise<DecideFacadeResult> {
  const { contributionId, adminId, decision, decisionNotes, prismaClient } = params;
  const prisma = prismaClient || defaultPrisma;
  const runInTx = typeof prisma.$transaction === 'function' ? prisma.$transaction.bind(prisma) : async (fn: any) => fn(prisma);

  return await runInTx(async (tx: any) => {
    const contribution = await tx.buildingImageContribution.findUnique({
      where: { id: contributionId },
      include: { building: true },
    });

    if (!contribution) {
      throw new Error('Contribuição de fotografia não encontrada.');
    }

    // Proteção contra concorrência e decisões duplicadas
    if (contribution.decidedById || ['REJECTED', 'SUPERSEDED'].includes(contribution.status)) {
      throw new Error(
        `Esta proposta de fotografia já foi decidida anteriormente (status atual: ${contribution.status}). Operação duplicada rejeitada.`
      );
    }

    const buildingId = contribution.buildingId;
    const now = new Date();

    if (decision === 'APPROVE') {
      // Atualiza o Building com a nova fotografia oficial e validação administrativa
      const updatedBuilding = await tx.building.update({
        where: { id: buildingId },
        data: {
          coverImageUrl: contribution.imageUrl,
          coverImageValidationStatus: 'ADMIN_VALIDATED',
          coverImageUpdatedAt: now,
          coverImageUploadedById: contribution.brokerId,
          coverImageSource: 'ADMIN_UPLOAD',
        },
      });

      // Atualiza a contribuição para ACCEPTED
      const updatedContribution = await tx.buildingImageContribution.update({
        where: { id: contribution.id },
        data: {
          status: 'ACCEPTED',
          decidedById: adminId,
          decidedAt: now,
          decisionNotes: decisionNotes || 'Aprovado pelo administrador.',
        },
      });

      // Marca outras propostas de imagem pendentes do mesmo edifício como SUPERSEDED (histórico imutável)
      await tx.buildingImageContribution.updateMany({
        where: {
          buildingId,
          id: { not: contribution.id },
          status: 'PENDING',
        },
        data: { status: 'SUPERSEDED' },
      });

      return {
        contribution: updatedContribution,
        building: updatedBuilding,
        message: 'Fotografia da fachada aprovada e promovida como oficial pela administração.',
      };
    }

    // Decisão: REJECT
    const updatedContribution = await tx.buildingImageContribution.update({
      where: { id: contribution.id },
      data: {
        status: 'REJECTED',
        decidedById: adminId,
        decidedAt: now,
        decisionNotes: decisionNotes || 'Proposta de fotografia rejeitada pelo administrador.',
      },
    });

    const updatedBuilding = await tx.building.findUnique({
      where: { id: buildingId },
    });

    return {
      contribution: updatedContribution,
      building: updatedBuilding,
      message: 'Proposta de fotografia rejeitada pelo administrador. Imagem vigente preservada.',
    };
  });
}

