import { prisma as defaultPrisma } from '@/lib/db';

export const GEO_TOLERANCE_METERS = 50.0;

export type GeoValidationStatus =
  | 'UNVERIFIED'
  | 'ESTIMATED'
  | 'SINGLE_BROKER_CONFIRMED'
  | 'MULTI_BROKER_CONFIRMED'
  | 'ADMIN_VALIDATED'
  | 'DIVERGENT';

export type ContributionType =
  | 'CONFIRMED_EXISTING'
  | 'PROPOSED_NEW'
  | 'PROPOSED_ADJUSTMENT'
  | 'SKIPPED';

export type ContributionStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'SUPERSEDED'
  | 'REJECTED'
  | 'FLAGGED_DIVERGENT';

/**
 * Calcula a distância geodésica em metros entre duas coordenadas utilizando a fórmula de Haversine.
 * Raio médio da Terra: 6.371.000 metros.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const R = 6371000; // Raio da Terra em metros
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Retorna com 1 casa decimal
}

export interface ProcessContributionParams {
  buildingId: string;
  brokerId: string;
  latitude: number;
  longitude: number;
  contributionType: ContributionType;
  source?: string;
  prismaClient?: any;
}

/**
 * Processa a contribuição de um corretor para a localização de um edifício:
 * 1. Respeita bloqueio de edifícios ADMIN_VALIDATED (não sobrescreve, submete proposta PENDING).
 * 2. Ignora ações SKIPPED sem alterar estado do edifício.
 * 3. Primeira confirmação define ponto provisório (SINGLE_BROKER_CONFIRMED).
 * 4. Segunda confirmação independente dentro da tolerância de 50m eleva para MULTI_BROKER_CONFIRMED.
 * 5. Propostas com divergência superior a 50m marcam DIVERGENT para moderação administrativa.
 * 6. Contribuições repetidas do mesmo corretor não contam como confirmação independente.
 */
export async function processLocationContribution(params: ProcessContributionParams) {
  const {
    buildingId,
    brokerId,
    latitude,
    longitude,
    contributionType,
    source = 'BROKER_MAP_PIN',
    prismaClient,
  } = params;

  // Validação estrita de coordenadas geográficas no servidor
  if (contributionType !== 'SKIPPED') {
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      isNaN(latitude) ||
      isNaN(longitude) ||
      !isFinite(latitude) ||
      !isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new Error('Coordenadas geográficas inválidas fornecidas.');
    }
  }

  const basePrisma = prismaClient || defaultPrisma;

  // Executa em bloco transacional para garantir atomicidade contra acessos simultâneos
  const runInTransaction = async (tx: any) => {
    const building = await tx.building.findUnique({
      where: { id: buildingId },
      include: {
        locationContributions: {
          where: { status: { in: ['ACCEPTED', 'PENDING', 'FLAGGED_DIVERGENT'] } },
        },
      },
    });

    if (!building) {
      throw new Error('Edifício não encontrado para registro de contribuição.');
    }

    // Caso Corretor tenha optado por "Não sei confirmar / pular"
    if (contributionType === 'SKIPPED') {
      const skippedRecord = await tx.buildingLocationContribution.create({
        data: {
          buildingId: building.id,
          brokerId,
          latitude: building.latitude ?? 0,
          longitude: building.longitude ?? 0,
          contributionType: 'SKIPPED',
          status: 'SUPERSEDED',
          source: 'BROKER_MAP_PIN',
          distanceFromCurrent: null,
          decisionNotes: 'Corretor optou por pular a validação geográfica do edifício.',
          pointsAwarded: 0,
          pointsEligible: false,
        },
      });

      return {
        contribution: skippedRecord,
        building,
        message: 'Confirmação pulada pelo corretor. Nenhuma coordenada foi alterada.',
      };
    }

    // 1. Caso Edifício já esteja com coordenadas validadas pela Administração (ADMIN_VALIDATED)
    if (building.geoValidationStatus === 'ADMIN_VALIDATED') {
      const dist =
        building.latitude !== null && building.longitude !== null
          ? calculateHaversineDistance(building.latitude, building.longitude, latitude, longitude)
          : null;

      const pendingContribution = await tx.buildingLocationContribution.create({
        data: {
          buildingId: building.id,
          brokerId,
          latitude,
          longitude,
          contributionType,
          status: 'PENDING',
          source,
          distanceFromCurrent: dist,
          decisionNotes:
            'Proposta registrada para edifício com coordenadas previamente validadas pela administração.',
          pointsAwarded: 0,
          pointsEligible: true,
        },
      });

      return {
        contribution: pendingContribution,
        building,
        message:
          'A localização deste edifício já foi validada pela administração. Sua sugestão foi registrada para auditoria.',
      };
    }

    // 2. Marcar contribuições anteriores do MESMO corretor como SUPERSEDED para evitar contagem duplicada
    const priorFromSameBroker = building.locationContributions.filter(
      (c: any) => c.brokerId === brokerId
    );
    if (priorFromSameBroker.length > 0) {
      await tx.buildingLocationContribution.updateMany({
        where: {
          buildingId: building.id,
          brokerId,
          status: { in: ['ACCEPTED', 'PENDING'] },
        },
        data: { status: 'SUPERSEDED' },
      });
    }

    // 3. Contabilizar outros corretores independentes que já contribuíram com status ACCEPTED
    const otherAcceptedContributions = building.locationContributions.filter(
      (c: any) => c.brokerId !== brokerId && c.status === 'ACCEPTED'
    );

    const hasExistingCoords =
      building.latitude !== null &&
      building.longitude !== null &&
      building.geoValidationStatus !== 'UNVERIFIED';

    // Cenário A: Edifício sem coordenadas prévias ou em estado UNVERIFIED / ESTIMATED
    if (!hasExistingCoords || building.geoValidationStatus === 'ESTIMATED') {
      const dist =
        building.latitude !== null && building.longitude !== null
          ? calculateHaversineDistance(building.latitude, building.longitude, latitude, longitude)
          : 0;

      const contribution = await tx.buildingLocationContribution.create({
        data: {
          buildingId: building.id,
          brokerId,
          latitude,
          longitude,
          contributionType,
          status: 'ACCEPTED',
          source,
          distanceFromCurrent: dist,
          decisionNotes: 'Primeira confirmação de localização por corretor parceiro.',
          pointsAwarded: 0,
          pointsEligible: true,
        },
      });

      const updatedBuilding = await tx.building.update({
        where: { id: building.id },
        data: {
          latitude,
          longitude,
          geoValidationStatus: 'SINGLE_BROKER_CONFIRMED',
          geoContributorsCount: 1,
          geoConfidence: 0.5,
          geoLastConfirmedAt: new Date(),
        },
      });

      return {
        contribution,
        building: updatedBuilding,
        message: 'Localização registrada como confirmada por 1 corretor.',
      };
    }

    // Cenário B: Edifício já com coordenadas confirmadas (SINGLE_BROKER_CONFIRMED ou MULTI_BROKER_CONFIRMED)
    const currentLat = building.latitude!;
    const currentLng = building.longitude!;
    const dist = calculateHaversineDistance(currentLat, currentLng, latitude, longitude);

    // Tolerância configurável (padrão 50 metros)
    if (dist <= GEO_TOLERANCE_METERS) {
      // Compatível!
      const contribution = await tx.buildingLocationContribution.create({
        data: {
          buildingId: building.id,
          brokerId,
          latitude,
          longitude,
          contributionType,
          status: 'ACCEPTED',
          source,
          distanceFromCurrent: dist,
          decisionNotes: `Confirmação independente consistente (distância de ${dist}m da referência).`,
          pointsAwarded: 0,
          pointsEligible: true,
        },
      });

      const uniqueBrokersCount = new Set([
        ...otherAcceptedContributions.map((c: any) => c.brokerId),
        brokerId,
      ]).size;

      const newStatus: GeoValidationStatus =
        uniqueBrokersCount >= 2 ? 'MULTI_BROKER_CONFIRMED' : 'SINGLE_BROKER_CONFIRMED';
      const newConfidence = uniqueBrokersCount >= 2 ? 0.9 : 0.5;

      const updatedBuilding = await tx.building.update({
        where: { id: building.id },
        data: {
          geoValidationStatus: newStatus,
          geoContributorsCount: uniqueBrokersCount,
          geoConfidence: newConfidence,
          geoLastConfirmedAt: new Date(),
        },
      });

      return {
        contribution,
        building: updatedBuilding,
        message:
          uniqueBrokersCount >= 2
            ? 'Localização confirmada e validada por múltiplos corretores parceiros!'
            : 'Localização atualizada e compatível.',
      };
    }

    // Cenário C: Proposta diverge mais de 50 metros da localização atual -> DIVERGENT
    const divergentContribution = await tx.buildingLocationContribution.create({
      data: {
        buildingId: building.id,
        brokerId,
        latitude,
        longitude,
        contributionType,
        status: 'FLAGGED_DIVERGENT',
        source,
        distanceFromCurrent: dist,
        decisionNotes: `Divergência detectada: pin proposto a ${dist}m de distância da localização de referência (> ${GEO_TOLERANCE_METERS}m).`,
        pointsAwarded: 0,
        pointsEligible: true,
      },
    });

    const updatedBuilding = await tx.building.update({
      where: { id: building.id },
      data: {
        geoValidationStatus: 'DIVERGENT',
        geoConfidence: 0.2,
        geoLastConfirmedAt: new Date(),
      },
    });

    return {
      contribution: divergentContribution,
      building: updatedBuilding,
      message: `Divergência de localização detectada (${dist}m de afastamento). Encaminhado para conferência administrativa.`,
    };
  };

  if (typeof basePrisma.$transaction === 'function') {
    return await basePrisma.$transaction(runInTransaction);
  }
  return await runInTransaction(basePrisma);
}

export interface DecideContributionParams {
  contributionId: string;
  adminId: string;
  decision: 'APPROVE' | 'REJECT' | 'MANUAL_OVERRIDE';
  manualCoordinates?: { latitude: number; longitude: number };
  decisionNotes?: string;
  prismaClient?: any;
}

/**
 * Decisão administrativa sobre uma proposta ou divergência de localização.
 * Quando o administrador aprova ou define coordenadas manuais, o edifício é marcado como ADMIN_VALIDATED
 * com confiança máxima (1.0) e não pode mais ser sobrescrito por corretores comuns.
 */
export async function decideLocationContribution(params: DecideContributionParams) {
  const { contributionId, adminId, decision, manualCoordinates, decisionNotes, prismaClient } =
    params;
  const prisma = prismaClient || defaultPrisma;

  const contribution = await prisma.buildingLocationContribution.findUnique({
    where: { id: contributionId },
    include: { building: true },
  });

  if (!contribution) {
    throw new Error('Contribuição não encontrada.');
  }

  const buildingId = contribution.buildingId;
  const now = new Date();

  if (decision === 'APPROVE') {
    // Aprova a contribuição e valida o edifício
    const updatedContribution = await prisma.buildingLocationContribution.update({
      where: { id: contribution.id },
      data: {
        status: 'ACCEPTED',
        decidedById: adminId,
        decidedAt: now,
        decisionNotes: decisionNotes || 'Aprovado pelo administrador.',
      },
    });

    // Marca outras propostas pendentes/divergentes deste edifício como SUPERSEDED
    await prisma.buildingLocationContribution.updateMany({
      where: {
        buildingId,
        id: { not: contribution.id },
        status: { in: ['PENDING', 'FLAGGED_DIVERGENT'] },
      },
      data: { status: 'SUPERSEDED' },
    });

    const updatedBuilding = await prisma.building.update({
      where: { id: buildingId },
      data: {
        latitude: contribution.latitude,
        longitude: contribution.longitude,
        geoValidationStatus: 'ADMIN_VALIDATED',
        geoConfidence: 1.0,
        geoAdminDecidedAt: now,
        geoAdminDecidedById: adminId,
      },
    });

    return {
      contribution: updatedContribution,
      building: updatedBuilding,
      message: 'Contribuição aprovada e localização do edifício validada como oficial pela administração.',
    };
  }

  if (decision === 'MANUAL_OVERRIDE') {
    if (!manualCoordinates || typeof manualCoordinates.latitude !== 'number' || typeof manualCoordinates.longitude !== 'number') {
      throw new Error('Coordenadas manuais são obrigatórias para sobrescrita manual.');
    }

    const updatedContribution = await prisma.buildingLocationContribution.update({
      where: { id: contribution.id },
      data: {
        status: 'SUPERSEDED',
        decidedById: adminId,
        decidedAt: now,
        decisionNotes: decisionNotes || 'Sobrescrito com coordenadas manuais pelo administrador.',
      },
    });

    await prisma.buildingLocationContribution.updateMany({
      where: {
        buildingId,
        status: { in: ['PENDING', 'FLAGGED_DIVERGENT'] },
      },
      data: { status: 'SUPERSEDED' },
    });

    const updatedBuilding = await prisma.building.update({
      where: { id: buildingId },
      data: {
        latitude: manualCoordinates.latitude,
        longitude: manualCoordinates.longitude,
        geoValidationStatus: 'ADMIN_VALIDATED',
        geoConfidence: 1.0,
        geoAdminDecidedAt: now,
        geoAdminDecidedById: adminId,
      },
    });

    return {
      contribution: updatedContribution,
      building: updatedBuilding,
      message: 'Coordenadas oficiais do edifício definidas manualmente pelo administrador.',
    };
  }

  // Decisão: REJECT
  const updatedContribution = await prisma.buildingLocationContribution.update({
    where: { id: contribution.id },
    data: {
      status: 'REJECTED',
      decidedById: adminId,
      decidedAt: now,
      decisionNotes: decisionNotes || 'Rejeitado pelo administrador.',
    },
  });

  // Reavalia o status do edifício após a rejeição
  const remainingAccepted = await prisma.buildingLocationContribution.findMany({
    where: {
      buildingId,
      status: 'ACCEPTED',
    },
  });

  const remainingBrokers = new Set(remainingAccepted.map((c: any) => c.brokerId)).size;
  let recomputedStatus: GeoValidationStatus = 'UNVERIFIED';
  let recomputedConfidence = 0.0;

  if (remainingBrokers >= 2) {
    recomputedStatus = 'MULTI_BROKER_CONFIRMED';
    recomputedConfidence = 0.9;
  } else if (remainingBrokers === 1) {
    recomputedStatus = 'SINGLE_BROKER_CONFIRMED';
    recomputedConfidence = 0.5;
  }

  const updatedBuilding = await prisma.building.update({
    where: { id: buildingId },
    data: {
      geoValidationStatus: recomputedStatus,
      geoContributorsCount: remainingBrokers,
      geoConfidence: recomputedConfidence,
    },
  });

  return {
    contribution: updatedContribution,
    building: updatedBuilding,
    message: 'Contribuição rejeitada pelo administrador.',
  };
}

