import { prisma as defaultPrisma } from '@/lib/db';
import {
  parseGeoJsonToLatLngs,
  calculateSphericalArea,
  isPointInPolygon,
  isPointInGeoJson,
  calculatePolygonBoundingBox,
  calculatePolygonCentroid,
  combineGeoJsonBoundaries,
} from '@/lib/geo/polygon';

export type BoundaryValidationStatus =
  | 'UNVERIFIED'
  | 'SINGLE_BROKER_CONFIRMED'
  | 'MULTI_BROKER_CONFIRMED'
  | 'ADMIN_VALIDATED'
  | 'DIVERGENT';

export type BoundaryContributionType =
  | 'INITIAL_DELIMITATION'
  | 'CONFIRMED_EXISTING'
  | 'PROPOSED_REVISION';

export type BoundaryContributionStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'SUPERSEDED'
  | 'REJECTED'
  | 'FLAGGED_DIVERGENT';

export interface ProcessBoundaryContributionParams {
  buildingId: string;
  brokerId: string;
  boundary: string; // GeoJSON string
  boundaryArea?: number | null;
  isRevisionProposal?: boolean;
  justification?: string | null;
  prismaClient?: any;
}

export interface ProcessBoundaryResult {
  action: 'INITIAL_DELIMITATION_ACCEPTED' | 'CONFIRMED_EXISTING' | 'REVISION_PROPOSAL_REGISTERED';
  status: BoundaryValidationStatus;
  boundary: string;
  boundaryArea: number | null;
  isShared: boolean;
  message: string;
  contributionId?: string;
  landParcelId?: string;
}

/**
 * Valida a sintaxe e geometria de uma string GeoJSON de polígono de terreno.
 */
export function validateGeoJsonBoundary(boundaryString: string): {
  valid: boolean;
  areaM2: number;
  verticesCount: number;
  error?: string;
} {
  if (!boundaryString || typeof boundaryString !== 'string') {
    return { valid: false, areaM2: 0, verticesCount: 0, error: 'Polígono não informado.' };
  }

  try {
    const latLngs = parseGeoJsonToLatLngs(boundaryString);
    if (!latLngs || latLngs.length < 3) {
      return {
        valid: false,
        areaM2: 0,
        verticesCount: latLngs ? latLngs.length : 0,
        error: 'O polígono deve conter pelo menos 3 vértices para formar uma área.',
      };
    }

    const coords: [number, number][] = latLngs.map((pt) => [pt.lng, pt.lat]);
    const calculatedArea = calculateSphericalArea(coords);
    if (calculatedArea <= 0) {
      return { valid: false, areaM2: 0, verticesCount: latLngs.length, error: 'A área calculada do polígono é inválida.' };
    }

    return { valid: true, areaM2: calculatedArea, verticesCount: latLngs.length };
  } catch (err: any) {
    return { valid: false, areaM2: 0, verticesCount: 0, error: `GeoJSON inválido: ${err?.message || 'erro de parse'}` };
  }
}

/**
 * Compara dois polígonos GeoJSON para determinar se representam o mesmo terreno aproximado.
 */
export function areBoundariesEquivalent(b1: string, b2: string, toleranceAreaPercent: number = 5.0): boolean {
  if (b1 === b2) return true;
  const p1 = parseGeoJsonToLatLngs(b1);
  const p2 = parseGeoJsonToLatLngs(b2);
  if (!p1 || !p2) return false;
  if (p1.length !== p2.length) return false;

  const c1: [number, number][] = p1.map((pt) => [pt.lng, pt.lat]);
  const c2: [number, number][] = p2.map((pt) => [pt.lng, pt.lat]);
  const a1 = calculateSphericalArea(c1);
  const a2 = calculateSphericalArea(c2);
  if (a1 <= 0 || a2 <= 0) return false;

  const diffPercent = Math.abs(a1 - a2) / Math.max(a1, a2) * 100;
  return diffPercent <= toleranceAreaPercent;
}

/**
 * Processa a contribuição ou proposta de delimitação de terreno coletivo para um Edifício.
 * 
 * Regras estritas:
 * 1. Primeiro Corretor: Se o edifício ainda não possui terreno delimitado, o polígono é aceito
 *    como delimitação coletiva inicial e o edifício passa para SINGLE_BROKER_CONFIRMED.
 * 2. Segundo Corretor (Confirmação): Se o segundo corretor enviar um polígono equivalente,
 *    o contador de confirmações é incrementado e o status evolui para MULTI_BROKER_CONFIRMED.
 * 3. Segundo Corretor (Substituição/Revisão): Se o segundo corretor tentar enviar um polígono diferente,
 *    a substituição direta é BLOQUEADA. O polígono vigente é 100% preservado e a nova proposta é
 *    registrada com status PENDING para futura moderação administrativa (J.2.D).
 */
export async function processBoundaryContribution(
  params: ProcessBoundaryContributionParams
): Promise<ProcessBoundaryResult> {
  const { buildingId, brokerId, boundary, boundaryArea, isRevisionProposal, justification, prismaClient } = params;
  const prisma = prismaClient || defaultPrisma;

  const validation = validateGeoJsonBoundary(boundary);
  if (!validation.valid) {
    throw new Error(validation.error || 'Polígono de terreno inválido.');
  }

  const effectiveArea = boundaryArea && boundaryArea > 0 ? boundaryArea : validation.areaM2;

  // Busca edifício atual (campos padrão existentes no schema)
  const building = await prisma.building.findUnique({
    where: { id: buildingId },
    select: {
      id: true,
      name: true,
      createdById: true,
    },
  });

  if (!building) {
    throw new Error('Edifício não encontrado.');
  }

  // Consulta campos de delimitação física defensivamente
  let currentBoundary: string | null = null;
  let currentValidationStatus: BoundaryValidationStatus = 'UNVERIFIED';

  try {
    const rawRes: any = await prisma.$queryRawUnsafe(
      `SELECT "boundary", "boundaryArea", "boundaryValidationStatus" FROM "Building" WHERE "id" = $1 LIMIT 1`,
      buildingId
    );
    if (rawRes && rawRes[0]) {
      currentBoundary = rawRes[0].boundary || null;
      currentValidationStatus = (rawRes[0].boundaryValidationStatus as BoundaryValidationStatus) || 'UNVERIFIED';
    }
  } catch {
    // Colunas ainda não migradas no banco físico
  }

  // CENÁRIO 1: Edifício ainda NÃO possui terreno coletivo cadastrado
  if (!currentBoundary) {
    // Atualiza o edifício se as colunas já existirem no banco
    try {
      await prisma.$executeRawUnsafe(`
        UPDATE "Building"
        SET 
          "boundary" = $1,
          "boundaryArea" = $2,
          "boundaryValidationStatus" = 'SINGLE_BROKER_CONFIRMED',
          "boundaryContributorsCount" = 1,
          "boundaryLastConfirmedAt" = NOW(),
          "boundaryCreatedById" = $3,
          "boundarySource" = 'BROKER_DRAWN',
          "updatedAt" = NOW()
        WHERE "id" = $4
      `, boundary, effectiveArea, brokerId, buildingId);
    } catch {}

    // Registra contribuição aceita se a tabela de histórico existir
    let contribId: string | undefined;
    try {
      const rec: any = await prisma.$queryRawUnsafe(`
        INSERT INTO "BuildingBoundaryContribution" (
          "id", "buildingId", "brokerId", "boundary", "boundaryArea", 
          "contributionType", "status", "source", "createdAt", "updatedAt"
        ) VALUES (
          'bbc_' || gen_random_uuid(), $1, $2, $3, $4, 
          'INITIAL_DELIMITATION', 'ACCEPTED', 'BROKER_DRAWN', NOW(), NOW()
        ) RETURNING "id"
      `, buildingId, brokerId, boundary, effectiveArea);
      if (rec && rec[0]) contribId = rec[0].id;
    } catch {}

    // Cria ou atualiza LandParcel independente se a tabela existir (Etapa J.2.C.2)
    let landParcelId: string | undefined;
    try {
      const latLngs = parseGeoJsonToLatLngs(boundary) || [];
      const bbox = calculatePolygonBoundingBox(latLngs);
      const coords: [number, number][] = latLngs.map((pt) => [pt.lng, pt.lat]);
      const centroid = calculatePolygonCentroid(coords);

      const lpRec: any = await prisma.$queryRawUnsafe(`
        INSERT INTO "LandParcel" (
          "id", "boundary", "boundaryArea", "source", "originType",
          "centroidLat", "centroidLng", "bboxMinLat", "bboxMaxLat", "bboxMinLng", "bboxMaxLng",
          "validationStatus", "confidence", "contributorsCount", "lastConfirmedAt", "createdById",
          "createdAt", "updatedAt"
        ) VALUES (
          'lp_' || gen_random_uuid(), $1, $2, 'BROKER_DRAWN', 'MANUAL_DRAW',
          $3, $4, $5, $6, $7, $8,
          'SINGLE_BROKER_CONFIRMED', 0.6, 1, NOW(), $9,
          NOW(), NOW()
        ) RETURNING "id"
      `, boundary, effectiveArea, centroid ? centroid[1] : null, centroid ? centroid[0] : null,
         bbox ? bbox.minLat : null, bbox ? bbox.maxLat : null, bbox ? bbox.minLng : null, bbox ? bbox.maxLng : null,
         brokerId
      );
      if (lpRec && lpRec[0]) {
        landParcelId = lpRec[0].id;

        // Vincula na tabela de junção BuildingLandParcel
        await prisma.$executeRawUnsafe(`
          INSERT INTO "BuildingLandParcel" ("id", "buildingId", "landParcelId", "isPrimary", "createdAt", "updatedAt")
          VALUES ('blp_' || gen_random_uuid(), $1, $2, true, NOW(), NOW())
          ON CONFLICT ("buildingId", "landParcelId") DO NOTHING
        `, buildingId, landParcelId);

        // Atualiza landParcelId no Building
        await prisma.$executeRawUnsafe(`
          UPDATE "Building" SET "landParcelId" = $1 WHERE "id" = $2
        `, landParcelId, buildingId);
      }
    } catch {}

    return {
      action: 'INITIAL_DELIMITATION_ACCEPTED',
      status: 'SINGLE_BROKER_CONFIRMED',
      boundary,
      boundaryArea: effectiveArea,
      isShared: true,
      message: `Terreno coletivo do ${building.name} delimitado com sucesso (${Math.round(effectiveArea)} m²).`,
      contributionId: contribId,
      landParcelId,
    };
  }

  // CENÁRIO 2: Edifício já possui delimitação coletiva ativa
  // Verifica se o polígono enviado é equivalente ao existente
  const isEquivalent = areBoundariesEquivalent(currentBoundary, boundary);

  if (isEquivalent && !isRevisionProposal) {
    // Confirmação do terreno existente por outro corretor
    try {
      await prisma.$executeRawUnsafe(`
        UPDATE "Building"
        SET 
          "boundaryValidationStatus" = 'MULTI_BROKER_CONFIRMED',
          "boundaryContributorsCount" = COALESCE("boundaryContributorsCount", 1) + 1,
          "boundaryLastConfirmedAt" = NOW(),
          "updatedAt" = NOW()
        WHERE "id" = $1
      `, buildingId);
    } catch {}

    return {
      action: 'CONFIRMED_EXISTING',
      status: 'MULTI_BROKER_CONFIRMED',
      boundary: currentBoundary,
      boundaryArea: (building as any).boundaryArea || effectiveArea,
      isShared: true,
      message: `Delimitação coletiva existente do ${building.name} confirmada com sucesso.`,
    };
  }

  // CENÁRIO 3: Proposta de alteração / delimitação divergente
  // REGRA DE PROTEÇÃO: NÃO SOBRESCREVE o terreno coletivo ativo.
  // Registra a proposta como PENDING para moderação administrativa.
  let revisionId: string | undefined;
  try {
    const rec: any = await prisma.$queryRawUnsafe(`
      INSERT INTO "BuildingBoundaryContribution" (
        "id", "buildingId", "brokerId", "boundary", "boundaryArea", 
        "contributionType", "status", "source", "justification", "createdAt", "updatedAt"
      ) VALUES (
        'bbc_' || gen_random_uuid(), $1, $2, $3, $4, 
        'PROPOSED_REVISION', 'PENDING', 'BROKER_DRAWN', $5, NOW(), NOW()
      ) RETURNING "id"
    `, buildingId, brokerId, boundary, effectiveArea, justification || 'Proposta de ajuste de perímetro');
    if (rec && rec[0]) revisionId = rec[0].id;
  } catch {}

  return {
    action: 'REVISION_PROPOSAL_REGISTERED',
    status: currentValidationStatus as BoundaryValidationStatus,
    boundary: currentBoundary, // Preserva o vigente!
    boundaryArea: (building as any).boundaryArea || null,
    isShared: true,
    message: `Proposta de revisão do terreno enviada para moderação. O terreno coletivo vigente de ${building.name} foi preservado.`,
    contributionId: revisionId,
  };
}

export interface FindParcelResult {
  found: boolean;
  ambiguous?: boolean;
  parcel?: {
    id: string;
    code: string | null;
    source: string;
    boundary: string;
    boundaryArea: number;
    validationStatus: string;
  };
  candidates?: Array<{
    id: string;
    code: string | null;
    source: string;
    boundary: string;
    boundaryArea: number;
    validationStatus: string;
  }>;
}

/**
 * Localiza o lote cadastral (LandParcel) que contém um ponto geográfico [lat, lng].
 * Realiza filtragem prévia ultrarrápida por Bounding Box (AABB) e confirmação geométrica por Ray-Casting via isPointInGeoJson.
 * 
 * Regra de Ambiguidade Geométrica:
 * Se múltiplos lotes sobrepostos contiverem o ponto geográfico, a seleção arbitrária é REJEITADA.
 * O sistema retorna `ambiguous: true` com a lista de candidatos para seleção manual do corretor/moderador.
 */
export async function findParcelContainingPoint(
  point: { lat: number; lng: number },
  options?: { prismaClient?: any }
): Promise<FindParcelResult> {
  const prisma = options?.prismaClient || defaultPrisma;

  // Validação básica de entrada
  if (!point || isNaN(point.lat) || isNaN(point.lng) || point.lat < -90 || point.lat > 90 || point.lng < -180 || point.lng > 180) {
    return { found: false, ambiguous: false };
  }

  try {
    // 1. Filtragem rápida por Bounding Box (AABB indexada)
    const bboxCandidates: any[] = await prisma.$queryRawUnsafe(`
      SELECT "id", "code", "source", "boundary", "boundaryArea", "validationStatus"
      FROM "LandParcel"
      WHERE "bboxMinLat" <= $1 AND "bboxMaxLat" >= $1
        AND "bboxMinLng" <= $2 AND "bboxMaxLng" >= $2
      LIMIT 20
    `, point.lat, point.lng);

    if (!bboxCandidates || bboxCandidates.length === 0) {
      return { found: false, ambiguous: false };
    }

    // 2. Teste geométrico exato com suporte a polígonos simples, furos e MultiPolygon
    const matchingParcels: Array<{
      id: string;
      code: string | null;
      source: string;
      boundary: string;
      boundaryArea: number;
      validationStatus: string;
    }> = [];

    for (const cand of bboxCandidates) {
      if (cand.boundary && isPointInGeoJson(point, cand.boundary)) {
        matchingParcels.push({
          id: cand.id,
          code: cand.code,
          source: cand.source,
          boundary: cand.boundary,
          boundaryArea: Number(cand.boundaryArea) || 0,
          validationStatus: cand.validationStatus,
        });
      }
    }

    if (matchingParcels.length === 0) {
      return { found: false, ambiguous: false };
    }

    // Rejeita seleção arbitrária quando houver ambiguidade geométrica sobreposta!
    if (matchingParcels.length > 1) {
      return {
        found: true,
        ambiguous: true,
        candidates: matchingParcels,
        parcel: undefined,
      };
    }

    // Apenas 1 lote contém o ponto com precisão
    return {
      found: true,
      ambiguous: false,
      parcel: matchingParcels[0],
    };
  } catch {
    // Tabela LandParcel ainda não migrada
    return { found: false, ambiguous: false };
  }
}

export interface SyncBuildingBoundaryCacheResult {
  buildingId: string;
  synced: boolean;
  boundary: string | null;
  boundaryArea: number | null;
  boundaryValidationStatus: BoundaryValidationStatus;
  isSharedBoundary: boolean;
  parcelCount: number;
  message: string;
}

/**
 * Invalida, reconstrói e sincroniza o cache desnormalizado `Building.boundary` a partir
 * da Fonte Única da Verdade (`LandParcel` via tabela de junção N:M `BuildingLandParcel`).
 * 
 * - Se nenhum lote estiver vinculado: limpa o cache (boundary = null, isSharedBoundary = false).
 * - Se 1 lote estiver vinculado: replica a geometria exata do LandParcel no cache do Building.
 * - Se múltiplos lotes estiverem vinculados (empreendimento multi-gleba): constrói um GeoJSON
 *   MultiPolygon combinando os lotes e somando as áreas privativas.
 */
export async function syncBuildingBoundaryCache(
  buildingId: string,
  options?: { prismaClient?: any }
): Promise<SyncBuildingBoundaryCacheResult> {
  const prisma = options?.prismaClient || defaultPrisma;

  try {
    // Busca todos os lotes ativos vinculados ao edifício
    const links: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        blp."id" AS "linkId",
        blp."isPrimary",
        lp."id" AS "parcelId",
        lp."boundary",
        lp."boundaryArea",
        lp."validationStatus"
      FROM "BuildingLandParcel" blp
      JOIN "LandParcel" lp ON blp."landParcelId" = lp."id"
      WHERE blp."buildingId" = $1
      ORDER BY blp."isPrimary" DESC, blp."createdAt" ASC
    `, buildingId);

    if (!links || links.length === 0) {
      // Nenhum lote vinculado: limpa o cache desnormalizado
      await prisma.$executeRawUnsafe(`
        UPDATE "Building"
        SET 
          "boundary" = NULL,
          "boundaryArea" = NULL,
          "boundaryValidationStatus" = 'UNVERIFIED',
          "landParcelId" = NULL,
          "updatedAt" = NOW()
        WHERE "id" = $1
      `, buildingId);

      return {
        buildingId,
        synced: true,
        boundary: null,
        boundaryArea: null,
        boundaryValidationStatus: 'UNVERIFIED',
        isSharedBoundary: false,
        parcelCount: 0,
        message: 'Cache de limite territorial desvinculado/limpo com sucesso.',
      };
    }

    if (links.length === 1) {
      const singleParcel = links[0];
      const area = Number(singleParcel.boundaryArea) || null;
      const status = (singleParcel.validationStatus || 'SINGLE_BROKER_CONFIRMED') as BoundaryValidationStatus;

      await prisma.$executeRawUnsafe(`
        UPDATE "Building"
        SET 
          "boundary" = $1,
          "boundaryArea" = $2,
          "boundaryValidationStatus" = $3,
          "landParcelId" = $4,
          "updatedAt" = NOW()
        WHERE "id" = $5
      `, singleParcel.boundary, area, status, singleParcel.parcelId, buildingId);

      return {
        buildingId,
        synced: true,
        boundary: singleParcel.boundary,
        boundaryArea: area,
        boundaryValidationStatus: status,
        isSharedBoundary: true,
        parcelCount: 1,
        message: 'Cache de limite territorial sincronizado a partir de lote único.',
      };
    }

    // Múltiplos lotes (condomínio multi-gleba): combina em MultiPolygon
    const boundaryStrings = links.map((l) => l.boundary).filter(Boolean);
    const combinedGeoJson = combineGeoJsonBoundaries(boundaryStrings);
    const totalArea = links.reduce((sum, l) => sum + (Number(l.boundaryArea) || 0), 0);

    // Se qualquer um dos lotes for ADMIN_VALIDATED, o conjunto é validado
    const hasAdmin = links.some((l) => l.validationStatus === 'ADMIN_VALIDATED');
    const combinedStatus: BoundaryValidationStatus = hasAdmin
      ? 'ADMIN_VALIDATED'
      : 'MULTI_BROKER_CONFIRMED';

    // Determina lote primário para referência
    const primaryLink = links.find((l) => l.isPrimary) || links[0];

    await prisma.$executeRawUnsafe(`
      UPDATE "Building"
      SET 
        "boundary" = $1,
        "boundaryArea" = $2,
        "boundaryValidationStatus" = $3,
        "landParcelId" = $4,
        "updatedAt" = NOW()
      WHERE "id" = $5
    `, combinedGeoJson, totalArea > 0 ? totalArea : null, combinedStatus, primaryLink ? primaryLink.parcelId : null, buildingId);

    return {
      buildingId,
      synced: true,
      boundary: combinedGeoJson,
      boundaryArea: totalArea > 0 ? totalArea : null,
      boundaryValidationStatus: combinedStatus,
      isSharedBoundary: true,
      parcelCount: links.length,
      message: `Cache unificado sincronizado com sucesso a partir de ${links.length} lotes (MultiPolygon).`,
    };
  } catch (err: any) {
    return {
      buildingId,
      synced: false,
      boundary: null,
      boundaryArea: null,
      boundaryValidationStatus: 'UNVERIFIED',
      isSharedBoundary: false,
      parcelCount: 0,
      message: `Falha ao sincronizar cache territorial do edifício: ${err?.message || 'erro desconhecido'}`,
    };
  }
}

export interface DecideBoundaryContributionParams {
  contributionId: string;
  adminId: string;
  decision: 'APPROVE' | 'REJECT' | 'MANUAL_OVERRIDE';
  manualBoundary?: string;
  decisionNotes?: string;
  prismaClient?: any;
}

export interface DecideBoundaryResult {
  contribution: any;
  building: any;
  message: string;
  landParcelId?: string;
}

/**
 * Decisão administrativa sobre uma proposta ou revisão de terreno coletivo.
 * 
 * Regras estritas:
 * 1. Transação atômica completa ($transaction).
 * 2. Proteção contra concorrência e decisões duplicadas (status deve ser PENDING ou FLAGGED_DIVERGENT).
 * 3. Ao aprovar:
 *    - Valida a geometria GeoJSON.
 *    - Atualiza ou cria o LandParcel correspondente como ADMIN_VALIDATED.
 *    - Sincroniza o cache Building.boundary como ADMIN_VALIDATED.
 *    - Marca a contribuição como ACCEPTED e propostas concorrentes como SUPERSEDED.
 *    - NÃO altera os polígonos particulares de anúncios (Property.boundary).
 * 4. Ao rejeitar:
 *    - Marca contribuição como REJECTED com justificativa.
 *    - Preserva integralmente o terreno coletivo vigente.
 */
export async function decideBoundaryContribution(
  params: DecideBoundaryContributionParams
): Promise<DecideBoundaryResult> {
  const { contributionId, adminId, decision, manualBoundary, decisionNotes, prismaClient } = params;
  const prisma = prismaClient || defaultPrisma;
  const runInTx = typeof prisma.$transaction === 'function' ? prisma.$transaction.bind(prisma) : async (fn: any) => fn(prisma);

  return await runInTx(async (tx: any) => {
    const contribution = await tx.buildingBoundaryContribution.findUnique({
      where: { id: contributionId },
      include: { building: true, landParcel: true },
    });

    if (!contribution) {
      throw new Error('Contribuição de terreno não encontrada.');
    }

    // Proteção contra concorrência e decisões duplicadas
    if (contribution.decidedById || ['REJECTED', 'SUPERSEDED'].includes(contribution.status)) {
      throw new Error(
        `Esta proposta de terreno já foi decidida anteriormente (status atual: ${contribution.status}). Operação duplicada rejeitada.`
      );
    }

    const buildingId = contribution.buildingId;
    const now = new Date();

    if (decision === 'APPROVE') {
      const boundaryToApply = contribution.boundary;
      const geomValidation = validateGeoJsonBoundary(boundaryToApply);
      if (!geomValidation.valid) {
        throw new Error(`Geometria da contribuição inválida: ${geomValidation.error}`);
      }

      const effectiveArea = geomValidation.areaM2;
      const latLngs = parseGeoJsonToLatLngs(boundaryToApply) || [];
      const bbox = calculatePolygonBoundingBox(latLngs);
      const coords: [number, number][] = latLngs.map((pt) => [pt.lng, pt.lat]);
      const centroid = calculatePolygonCentroid(coords);

      let parcelId = contribution.landParcelId;

      if (parcelId) {
        // Atualiza LandParcel existente para validação administrativa
        await tx.$executeRawUnsafe(`
          UPDATE "LandParcel"
          SET 
            "boundary" = $1,
            "boundaryArea" = $2,
            "validationStatus" = 'ADMIN_VALIDATED',
            "confidence" = 1.0,
            "source" = 'ADMIN_VALIDATED',
            "centroidLat" = $3,
            "centroidLng" = $4,
            "bboxMinLat" = $5,
            "bboxMaxLat" = $6,
            "bboxMinLng" = $7,
            "bboxMaxLng" = $8,
            "lastConfirmedAt" = NOW(),
            "updatedAt" = NOW()
          WHERE "id" = $9
        `, boundaryToApply, effectiveArea,
           centroid ? centroid[1] : null, centroid ? centroid[0] : null,
           bbox ? bbox.minLat : null, bbox ? bbox.maxLat : null,
           bbox ? bbox.minLng : null, bbox ? bbox.maxLng : null,
           parcelId);
      } else {
        // Cria novo lote cadastral validado administrativamente
        const lpRec: any = await tx.$queryRawUnsafe(`
          INSERT INTO "LandParcel" (
            "id", "boundary", "boundaryArea", "source", "originType",
            "centroidLat", "centroidLng", "bboxMinLat", "bboxMaxLat", "bboxMinLng", "bboxMaxLng",
            "validationStatus", "confidence", "contributorsCount", "lastConfirmedAt", "createdById",
            "createdAt", "updatedAt"
          ) VALUES (
            'lp_' || gen_random_uuid(), $1, $2, 'ADMIN_VALIDATED', 'MANUAL_DRAW',
            $3, $4, $5, $6, $7, $8,
            'ADMIN_VALIDATED', 1.0, 1, NOW(), $9,
            NOW(), NOW()
          ) RETURNING "id"
        `, boundaryToApply, effectiveArea,
           centroid ? centroid[1] : null, centroid ? centroid[0] : null,
           bbox ? bbox.minLat : null, bbox ? bbox.maxLat : null,
           bbox ? bbox.minLng : null, bbox ? bbox.maxLng : null,
           adminId);

        if (lpRec && lpRec[0]) {
          parcelId = lpRec[0].id;
        }
      }

      // Garante associação N:M em BuildingLandParcel
      if (parcelId) {
        await tx.$executeRawUnsafe(`
          INSERT INTO "BuildingLandParcel" ("id", "buildingId", "landParcelId", "isPrimary", "createdAt", "updatedAt")
          VALUES ('blp_' || gen_random_uuid(), $1, $2, true, NOW(), NOW())
          ON CONFLICT ("buildingId", "landParcelId") DO UPDATE SET "isPrimary" = true, "updatedAt" = NOW()
        `, buildingId, parcelId);
      }

      // Sincroniza o cache Building.boundary como ADMIN_VALIDATED
      await syncBuildingBoundaryCache(buildingId, { prismaClient: tx });
      await tx.$executeRawUnsafe(`
        UPDATE "Building"
        SET 
          "boundaryValidationStatus" = 'ADMIN_VALIDATED',
          "boundaryConfidence" = 1.0,
          "boundarySource" = 'ADMIN_OVERRIDE',
          "updatedAt" = NOW()
        WHERE "id" = $1
      `, buildingId);

      // Atualiza a contribuição para ACCEPTED
      const updatedContribution = await tx.buildingBoundaryContribution.update({
        where: { id: contribution.id },
        data: {
          status: 'ACCEPTED',
          decidedById: adminId,
          decidedAt: now,
          decisionNotes: decisionNotes || 'Aprovado pelo administrador.',
          landParcelId: parcelId || undefined,
        },
      });

      // Marca propostas concorrentes como SUPERSEDED (histórico imutável)
      await tx.buildingBoundaryContribution.updateMany({
        where: {
          buildingId,
          id: { not: contribution.id },
          status: { in: ['PENDING', 'FLAGGED_DIVERGENT'] },
        },
        data: { status: 'SUPERSEDED' },
      });

      const updatedBuilding = await tx.building.findUnique({
        where: { id: buildingId },
      });

      return {
        contribution: updatedContribution,
        building: updatedBuilding,
        landParcelId: parcelId,
        message: 'Perímetro do terreno aprovado e validado como oficial pela administração.',
      };
    }

    if (decision === 'MANUAL_OVERRIDE') {
      if (!manualBoundary || typeof manualBoundary !== 'string') {
        throw new Error('Geometria GeoJSON manual é obrigatória para substituição manual.');
      }

      const geomValidation = validateGeoJsonBoundary(manualBoundary);
      if (!geomValidation.valid) {
        throw new Error(`Geometria manual inválida: ${geomValidation.error}`);
      }

      const effectiveArea = geomValidation.areaM2;
      const latLngs = parseGeoJsonToLatLngs(manualBoundary) || [];
      const bbox = calculatePolygonBoundingBox(latLngs);
      const coords: [number, number][] = latLngs.map((pt) => [pt.lng, pt.lat]);
      const centroid = calculatePolygonCentroid(coords);

      // Cria novo LandParcel homologado manualmente pelo admin
      const lpRec: any = await tx.$queryRawUnsafe(`
        INSERT INTO "LandParcel" (
          "id", "boundary", "boundaryArea", "source", "originType",
          "centroidLat", "centroidLng", "bboxMinLat", "bboxMaxLat", "bboxMinLng", "bboxMaxLng",
          "validationStatus", "confidence", "contributorsCount", "lastConfirmedAt", "createdById",
          "createdAt", "updatedAt"
        ) VALUES (
          'lp_' || gen_random_uuid(), $1, $2, 'ADMIN_VALIDATED', 'MANUAL_DRAW',
          $3, $4, $5, $6, $7, $8,
          'ADMIN_VALIDATED', 1.0, 1, NOW(), $9,
          NOW(), NOW()
        ) RETURNING "id"
      `, manualBoundary, effectiveArea,
         centroid ? centroid[1] : null, centroid ? centroid[0] : null,
         bbox ? bbox.minLat : null, bbox ? bbox.maxLat : null,
         bbox ? bbox.minLng : null, bbox ? bbox.maxLng : null,
         adminId);

      const parcelId = lpRec && lpRec[0] ? lpRec[0].id : null;

      if (parcelId) {
        await tx.$executeRawUnsafe(`
          INSERT INTO "BuildingLandParcel" ("id", "buildingId", "landParcelId", "isPrimary", "createdAt", "updatedAt")
          VALUES ('blp_' || gen_random_uuid(), $1, $2, true, NOW(), NOW())
          ON CONFLICT ("buildingId", "landParcelId") DO UPDATE SET "isPrimary" = true, "updatedAt" = NOW()
        `, buildingId, parcelId);
      }

      await syncBuildingBoundaryCache(buildingId, { prismaClient: tx });
      await tx.$executeRawUnsafe(`
        UPDATE "Building"
        SET 
          "boundaryValidationStatus" = 'ADMIN_VALIDATED',
          "boundaryConfidence" = 1.0,
          "boundarySource" = 'ADMIN_OVERRIDE',
          "updatedAt" = NOW()
        WHERE "id" = $1
      `, buildingId);

      // Marca a contribuição como SUPERSEDED pela decisão manual
      const updatedContribution = await tx.buildingBoundaryContribution.update({
        where: { id: contribution.id },
        data: {
          status: 'SUPERSEDED',
          decidedById: adminId,
          decidedAt: now,
          decisionNotes: decisionNotes || 'Sobrescrito com perímetro manual definido pelo administrador.',
        },
      });

      await tx.buildingBoundaryContribution.updateMany({
        where: {
          buildingId,
          id: { not: contribution.id },
          status: { in: ['PENDING', 'FLAGGED_DIVERGENT'] },
        },
        data: { status: 'SUPERSEDED' },
      });

      const updatedBuilding = await tx.building.findUnique({
        where: { id: buildingId },
      });

      return {
        contribution: updatedContribution,
        building: updatedBuilding,
        landParcelId: parcelId || undefined,
        message: 'Perímetro do terreno definido manualmente e homologado pelo administrador.',
      };
    }

    // Decisão: REJECT
    const updatedContribution = await tx.buildingBoundaryContribution.update({
      where: { id: contribution.id },
      data: {
        status: 'REJECTED',
        decidedById: adminId,
        decidedAt: now,
        decisionNotes: decisionNotes || 'Proposta de terreno rejeitada pelo administrador.',
      },
    });

    const updatedBuilding = await tx.building.findUnique({
      where: { id: buildingId },
    });

    return {
      contribution: updatedContribution,
      building: updatedBuilding,
      message: 'Proposta de terreno rejeitada pelo administrador. Terreno coletivo vigente preservado.',
    };
  });
}

