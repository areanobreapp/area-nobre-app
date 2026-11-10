import { prisma as defaultPrisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { ListingSlotService } from '@/lib/listing-slot-service';

export interface CreatePriceRevisionResult {
  success: boolean;
  reason?:
    | 'NOT_FOUND'
    | 'NOT_ACTIVE'
    | 'NOT_OWNER'
    | 'CANNOT_REQUEST_AS_PRIMARY'
    | 'INVALID_PRICE'
    | 'SAME_PRICE'
    | 'DUPLICATE_PENDING_REQUEST'
    | 'ERROR';
  message?: string;
  request?: any;
}

export interface DecidePriceRevisionResult {
  success: boolean;
  reason?:
    | 'NOT_FOUND'
    | 'NOT_PENDING'
    | 'UNAUTHORIZED_NOT_PRIMARY'
    | 'STALE_PRICE'
    | 'INVALID_DECISION'
    | 'ERROR';
  message?: string;
  request?: any;
  updatedPrice?: number;
}

export interface EscalateDisputeResult {
  success: boolean;
  reason?:
    | 'NOT_FOUND'
    | 'UNAUTHORIZED'
    | 'CANNOT_DISPUTE_STATUS'
    | 'ALREADY_DISPUTED'
    | 'ERROR';
  message?: string;
  dispute?: any;
}

export interface ResolveDisputeResult {
  success: boolean;
  reason?:
    | 'NOT_FOUND'
    | 'NOT_PENDING'
    | 'UNAUTHORIZED'
    | 'INVALID_PRICE'
    | 'ERROR';
  message?: string;
  dispute?: any;
  newPrice?: number;
}

export class PriceRevisionService {
  /**
   * Abre uma solicitação de revisão de preço para um corretor secundário.
   */
  static async createRequest(params: {
    propertyId: string;
    requestingBrokerId: string;
    suggestedPrice: number;
    justification: string;
    documentProofUrl?: string | null;
    prismaClient?: Prisma.TransactionClient;
  }): Promise<CreatePriceRevisionResult> {
    const { propertyId, requestingBrokerId, suggestedPrice, justification, documentProofUrl, prismaClient } = params;

    const executeInTx = async (tx: Prisma.TransactionClient): Promise<CreatePriceRevisionResult> => {
      // 1. Busca o anúncio e valida propriedade e vínculo
      const property = await tx.property.findUnique({
        where: { id: propertyId },
        select: {
          id: true,
          userId: true,
          responsibleBrokerId: true,
          physicalPropertyId: true,
          isPrimaryListing: true,
          status: true,
        },
      });

      if (!property) {
        return {
          success: false,
          reason: 'NOT_FOUND',
          message: 'Anúncio não encontrado.',
        };
      }

      if (property.userId !== requestingBrokerId && property.responsibleBrokerId !== requestingBrokerId) {
        return {
          success: false,
          reason: 'NOT_OWNER',
          message: 'Você não tem permissão para solicitar revisão em nome deste anúncio.',
        };
      }

      if (property.status !== 'Disponível' || !property.physicalPropertyId) {
        return {
          success: false,
          reason: 'NOT_ACTIVE',
          message: 'Apenas anúncios ativos vinculados a um imóvel físico podem solicitar revisão de preço.',
        };
      }

      // 2. Corretor principal não utiliza este fluxo (ele já possui autorização direta de edição de preço)
      if (property.isPrimaryListing) {
        return {
          success: false,
          reason: 'CANNOT_REQUEST_AS_PRIMARY',
          message: 'O corretor do anúncio principal possui autorização direta para atualizar o preço compartilhado e não deve abrir solicitação de revisão.',
        };
      }

      // 3. Validação do preço sugerido
      if (typeof suggestedPrice !== 'number' || isNaN(suggestedPrice) || suggestedPrice <= 0) {
        return {
          success: false,
          reason: 'INVALID_PRICE',
          message: 'O preço sugerido deve ser um valor numérico positivo maior que zero.',
        };
      }

      if (!justification || justification.trim().length === 0) {
        return {
          success: false,
          reason: 'INVALID_PRICE',
          message: 'A justificativa para a revisão de preço é obrigatória.',
        };
      }

      // 4. Bloqueio pessimista no PhysicalProperty para ler o sharedPrice atual
      const lockedRows: any[] = await tx.$queryRaw`
        SELECT id, "sharedPrice", "primaryListingId"
        FROM "PhysicalProperty"
        WHERE id = ${property.physicalPropertyId}
        FOR UPDATE;
      `;

      if (!lockedRows || lockedRows.length === 0) {
        return {
          success: false,
          reason: 'NOT_FOUND',
          message: 'Imóvel físico não encontrado.',
        };
      }

      const physicalProperty = lockedRows[0];
      const currentPriceNum = Number(physicalProperty.sharedPrice || 0);

      if (suggestedPrice === currentPriceNum) {
        return {
          success: false,
          reason: 'SAME_PRICE',
          message: 'O preço sugerido não pode ser idêntico ao preço compartilhado atual.',
        };
      }

      // 5. Impede solicitações pendentes duplicadas do mesmo corretor para este imóvel
      const existingPending = await tx.priceRevisionRequest.findFirst({
        where: {
          physicalPropertyId: property.physicalPropertyId,
          requestingBrokerId,
          status: 'PENDING',
        },
        select: { id: true },
      });

      if (existingPending) {
        return {
          success: false,
          reason: 'DUPLICATE_PENDING_REQUEST',
          message: 'Você já possui uma solicitação de revisão pendente para este imóvel físico.',
        };
      }

      // 6. Grava a solicitação
      const created = await tx.priceRevisionRequest.create({
        data: {
          physicalPropertyId: property.physicalPropertyId,
          requestingBrokerId,
          propertyId: property.id,
          currentPrice: new Prisma.Decimal(currentPriceNum),
          suggestedPrice: new Prisma.Decimal(suggestedPrice),
          justification: justification.trim(),
          documentProofUrl: documentProofUrl?.trim() || null,
          status: 'PENDING',
        },
        include: {
          physicalProperty: {
            select: {
              id: true,
              sharedPrice: true,
            },
          },
        },
      });

      return {
        success: true,
        request: created,
      };
    };

    if (prismaClient) {
      return executeInTx(prismaClient);
    }

    return defaultPrisma.$transaction(executeInTx, {
      timeout: 15000,
      maxWait: 5000,
    });
  }

  /**
   * Aceita a solicitação de revisão de preço, atualizando atomicamente o sharedPrice
   * e sincronizando todos os anúncios ativos através do ListingSlotService.
   */
  static async acceptRequest(params: {
    requestId: string;
    userId: string;
    userRole: string;
    reason?: string | null;
    prismaClient?: Prisma.TransactionClient;
  }): Promise<DecidePriceRevisionResult> {
    const { requestId, userId, userRole, reason, prismaClient } = params;

    const executeInTx = async (tx: Prisma.TransactionClient): Promise<DecidePriceRevisionResult> => {
      // 1. Lock pessimista na solicitação
      const lockedRequests: any[] = await tx.$queryRaw`
        SELECT id, "physicalPropertyId", "requestingBrokerId", "currentPrice", "suggestedPrice", status
        FROM "PriceRevisionRequest"
        WHERE id = ${requestId}
        FOR UPDATE;
      `;

      if (!lockedRequests || lockedRequests.length === 0) {
        return {
          success: false,
          reason: 'NOT_FOUND',
          message: 'Solicitação de revisão não encontrada.',
        };
      }

      const request = lockedRequests[0];

      if (request.status !== 'PENDING') {
        return {
          success: false,
          reason: 'NOT_PENDING',
          message: 'Esta solicitação não está mais pendente e não pode ser decidida novamente.',
        };
      }

      // 2. Lock pessimista no imóvel físico
      const lockedPhysical: any[] = await tx.$queryRaw`
        SELECT id, "sharedPrice", "primaryListingId"
        FROM "PhysicalProperty"
        WHERE id = ${request.physicalPropertyId}
        FOR UPDATE;
      `;

      if (!lockedPhysical || lockedPhysical.length === 0) {
        return {
          success: false,
          reason: 'NOT_FOUND',
          message: 'Imóvel físico não encontrado.',
        };
      }

      const physicalProperty = lockedPhysical[0];
      const isAdmin = userRole === 'ADMIN';

      // 3. Verificação dinâmica da autoridade do corretor principal
      if (!isAdmin) {
        if (!physicalProperty.primaryListingId) {
          return {
            success: false,
            reason: 'UNAUTHORIZED_NOT_PRIMARY',
            message: 'Não há anúncio principal ativo no momento para analisar esta solicitação.',
          };
        }

        const primaryListing = await tx.property.findUnique({
          where: { id: physicalProperty.primaryListingId },
          select: { id: true, userId: true, responsibleBrokerId: true, status: true },
        });

        const isCurrentlyPrimaryBroker =
          primaryListing &&
          primaryListing.status === 'Disponível' &&
          (primaryListing.userId === userId || primaryListing.responsibleBrokerId === userId);

        if (!isCurrentlyPrimaryBroker) {
          return {
            success: false,
            reason: 'UNAUTHORIZED_NOT_PRIMARY',
            message: 'Apenas o corretor responsável pelo anúncio principal atual ou administradores podem aprovar a revisão de preço.',
          };
        }
      }

      // 4. Verificação de preço desatualizado (Stale Price Protection)
      const currentPhysicalPrice = Number(physicalProperty.sharedPrice || 0);
      const requestCurrentPrice = Number(request.currentPrice);

      if (currentPhysicalPrice !== requestCurrentPrice) {
        return {
          success: false,
          reason: 'STALE_PRICE',
          message: 'O preço compartilhado do imóvel físico foi alterado desde a abertura desta solicitação. A aprovação automática foi bloqueada para exigir nova avaliação do valor vigente.',
        };
      }

      // 5. Atualiza o preço compartilhado via ListingSlotService
      const newPriceNum = Number(request.suggestedPrice);
      const updateResult = await ListingSlotService.updateSharedPrice({
        physicalPropertyId: request.physicalPropertyId,
        userId,
        userRole,
        newPrice: newPriceNum,
        reason: reason?.trim() || 'Revisão de preço sugerida por corretor secundário aprovada.',
        source: 'REVISION_ACCEPTED',
        revisionRequestId: request.id,
        prismaClient: tx,
      });

      if (!updateResult.success) {
        return {
          success: false,
          reason: 'ERROR',
          message: updateResult.message || 'Falha ao sincronizar novo preço compartilhado.',
        };
      }

      // 6. Atualiza a solicitação para APPROVED
      const updatedRequest = await tx.priceRevisionRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          decidedById: userId,
          decidedAt: new Date(),
          decisionReason: reason?.trim() || 'Aprovado pelo corretor do anúncio principal.',
        },
      });

      return {
        success: true,
        request: updatedRequest,
        updatedPrice: newPriceNum,
      };
    };

    if (prismaClient) {
      return executeInTx(prismaClient);
    }

    return defaultPrisma.$transaction(executeInTx, {
      timeout: 15000,
      maxWait: 5000,
    });
  }

  /**
   * Recusa a solicitação de revisão de preço com justificativa obrigatória.
   * Não altera o preço compartilhado do imóvel físico.
   */
  static async rejectRequest(params: {
    requestId: string;
    userId: string;
    userRole: string;
    decisionReason: string;
    prismaClient?: Prisma.TransactionClient;
  }): Promise<DecidePriceRevisionResult> {
    const { requestId, userId, userRole, decisionReason, prismaClient } = params;

    if (!decisionReason || decisionReason.trim().length === 0) {
      return {
        success: false,
        reason: 'INVALID_DECISION',
        message: 'A justificativa para a recusa da solicitação de revisão é obrigatória.',
      };
    }

    const executeInTx = async (tx: Prisma.TransactionClient): Promise<DecidePriceRevisionResult> => {
      // 1. Lock pessimista na solicitação
      const lockedRequests: any[] = await tx.$queryRaw`
        SELECT id, "physicalPropertyId", "requestingBrokerId", status
        FROM "PriceRevisionRequest"
        WHERE id = ${requestId}
        FOR UPDATE;
      `;

      if (!lockedRequests || lockedRequests.length === 0) {
        return {
          success: false,
          reason: 'NOT_FOUND',
          message: 'Solicitação de revisão não encontrada.',
        };
      }

      const request = lockedRequests[0];

      if (request.status !== 'PENDING') {
        return {
          success: false,
          reason: 'NOT_PENDING',
          message: 'Esta solicitação não está mais pendente e não pode ser decidida novamente.',
        };
      }

      // 2. Lock pessimista no imóvel físico
      const lockedPhysical: any[] = await tx.$queryRaw`
        SELECT id, "sharedPrice", "primaryListingId"
        FROM "PhysicalProperty"
        WHERE id = ${request.physicalPropertyId}
        FOR UPDATE;
      `;

      if (!lockedPhysical || lockedPhysical.length === 0) {
        return {
          success: false,
          reason: 'NOT_FOUND',
          message: 'Imóvel físico não encontrado.',
        };
      }

      const physicalProperty = lockedPhysical[0];
      const isAdmin = userRole === 'ADMIN';

      // 3. Verificação dinâmica da autoridade do corretor principal
      if (!isAdmin) {
        if (!physicalProperty.primaryListingId) {
          return {
            success: false,
            reason: 'UNAUTHORIZED_NOT_PRIMARY',
            message: 'Não há anúncio principal ativo no momento para analisar esta solicitação.',
          };
        }

        const primaryListing = await tx.property.findUnique({
          where: { id: physicalProperty.primaryListingId },
          select: { id: true, userId: true, responsibleBrokerId: true, status: true },
        });

        const isCurrentlyPrimaryBroker =
          primaryListing &&
          primaryListing.status === 'Disponível' &&
          (primaryListing.userId === userId || primaryListing.responsibleBrokerId === userId);

        if (!isCurrentlyPrimaryBroker) {
          return {
            success: false,
            reason: 'UNAUTHORIZED_NOT_PRIMARY',
            message: 'Apenas o corretor responsável pelo anúncio principal atual ou administradores podem recusar a revisão de preço.',
          };
        }
      }

      // 4. Atualiza a solicitação para REJECTED
      const updatedRequest = await tx.priceRevisionRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          decidedById: userId,
          decidedAt: new Date(),
          decisionReason: decisionReason.trim(),
        },
      });

      return {
        success: true,
        request: updatedRequest,
      };
    };

    if (prismaClient) {
      return executeInTx(prismaClient);
    }

    return defaultPrisma.$transaction(executeInTx, {
      timeout: 15000,
      maxWait: 5000,
    });
  }

  /**
   * Encaminha uma solicitação recusada para contestação administrativa (PropertyDispute).
   * Apenas o corretor solicitante original pode realizar este escalonamento.
   */
  static async escalateToDispute(params: {
    requestId: string;
    userId: string;
    justification?: string | null;
    documentProofUrl?: string | null;
    prismaClient?: Prisma.TransactionClient;
  }): Promise<EscalateDisputeResult> {
    const { requestId, userId, justification, documentProofUrl, prismaClient } = params;

    const executeInTx = async (tx: Prisma.TransactionClient): Promise<EscalateDisputeResult> => {
      // 1. Lock pessimista na solicitação
      const lockedRequests: any[] = await tx.$queryRaw`
        SELECT id, "physicalPropertyId", "requestingBrokerId", "justification", "documentProofUrl", status, "disputeId"
        FROM "PriceRevisionRequest"
        WHERE id = ${requestId}
        FOR UPDATE;
      `;

      if (!lockedRequests || lockedRequests.length === 0) {
        return {
          success: false,
          reason: 'NOT_FOUND',
          message: 'Solicitação de revisão não encontrada.',
        };
      }

      const request = lockedRequests[0];

      // 2. Apenas o solicitante pode encaminhar contestação
      if (request.requestingBrokerId !== userId) {
        return {
          success: false,
          reason: 'UNAUTHORIZED',
          message: 'Apenas o corretor solicitante pode encaminhar esta recusa para contestação administrativa.',
        };
      }

      // 3. A solicitação deve ter sido RECUSADA
      if (request.status !== 'REJECTED') {
        return {
          success: false,
          reason: 'CANNOT_DISPUTE_STATUS',
          message: 'Apenas solicitações com status RECUSADA podem ser encaminhadas para contestação administrativa.',
        };
      }

      // 4. Impede duplicidade de contestação
      if (request.disputeId) {
        return {
          success: false,
          reason: 'ALREADY_DISPUTED',
          message: 'Esta solicitação já foi encaminhada para contestação administrativa.',
        };
      }

      // 5. Cria o registro de PropertyDispute
      const dispute = await tx.propertyDispute.create({
        data: {
          physicalPropertyId: request.physicalPropertyId,
          claimantBrokerId: userId,
          type: 'PRICE_DISPUTE',
          description: justification?.trim() || request.justification,
          documentProofUrl: documentProofUrl?.trim() || request.documentProofUrl,
          status: 'PENDING',
        },
      });

      // 6. Atualiza o status da solicitação para ESCALATED
      await tx.priceRevisionRequest.update({
        where: { id: requestId },
        data: {
          status: 'ESCALATED',
          disputeId: dispute.id,
        },
      });

      return {
        success: true,
        dispute,
      };
    };

    if (prismaClient) {
      return executeInTx(prismaClient);
    }

    return defaultPrisma.$transaction(executeInTx, {
      timeout: 15000,
      maxWait: 5000,
    });
  }

  /**
   * Resolução administrativa da contestação por um usuário ADMIN.
   * Pode aprovar a revisão (atualizando o preço compartilhado) ou rejeitar (mantendo o preço atual).
   */
  static async resolveDispute(params: {
    disputeId: string;
    adminUserId: string;
    action: 'APPROVE' | 'REJECT';
    approvedPrice?: number | null;
    adminNotes: string;
    prismaClient?: Prisma.TransactionClient;
  }): Promise<ResolveDisputeResult> {
    const { disputeId, adminUserId, action, approvedPrice, adminNotes, prismaClient } = params;

    if (!adminNotes || adminNotes.trim().length === 0) {
      return {
        success: false,
        reason: 'NOT_PENDING',
        message: 'A justificativa / parecer administrativo é obrigatório para resolver a contestação.',
      };
    }

    const executeInTx = async (tx: Prisma.TransactionClient): Promise<ResolveDisputeResult> => {
      // 1. Lock pessimista na disputa
      const lockedDisputes: any[] = await tx.$queryRaw`
        SELECT id, "physicalPropertyId", "claimantBrokerId", type, status
        FROM "PropertyDispute"
        WHERE id = ${disputeId}
        FOR UPDATE;
      `;

      if (!lockedDisputes || lockedDisputes.length === 0) {
        return {
          success: false,
          reason: 'NOT_FOUND',
          message: 'Contestação não encontrada.',
        };
      }

      const dispute = lockedDisputes[0];

      if (dispute.status !== 'PENDING' && dispute.status !== 'UNDER_REVIEW') {
        return {
          success: false,
          reason: 'NOT_PENDING',
          message: 'Esta contestação já foi resolvida ou encerrada.',
        };
      }

      // 2. Busca a PriceRevisionRequest associada
      const revisionRequest = await tx.priceRevisionRequest.findFirst({
        where: { disputeId },
      });

      // 3. Lock no imóvel físico
      const lockedPhysical: any[] = await tx.$queryRaw`
        SELECT id, "sharedPrice"
        FROM "PhysicalProperty"
        WHERE id = ${dispute.physicalPropertyId}
        FOR UPDATE;
      `;

      if (!lockedPhysical || lockedPhysical.length === 0) {
        return {
          success: false,
          reason: 'NOT_FOUND',
          message: 'Imóvel físico não encontrado.',
        };
      }

      let finalPrice: number | undefined;

      if (action === 'APPROVE') {
        const effectivePrice =
          typeof approvedPrice === 'number' && !isNaN(approvedPrice) && approvedPrice > 0
            ? approvedPrice
            : revisionRequest
            ? Number(revisionRequest.suggestedPrice)
            : 0;

        if (effectivePrice <= 0) {
          return {
            success: false,
            reason: 'INVALID_PRICE',
            message: 'O preço determinado para a decisão administrativa deve ser maior que zero.',
          };
        }

        finalPrice = effectivePrice;

        // Atualiza o preço compartilhado via ListingSlotService com fonte ADMIN_ADJUDICATION
        const updateResult = await ListingSlotService.updateSharedPrice({
          physicalPropertyId: dispute.physicalPropertyId,
          userId: adminUserId,
          userRole: 'ADMIN',
          newPrice: finalPrice,
          reason: adminNotes.trim(),
          source: 'ADMIN_ADJUDICATION',
          revisionRequestId: revisionRequest?.id || null,
          prismaClient: tx,
        });

        if (!updateResult.success) {
          return {
            success: false,
            reason: 'ERROR',
            message: updateResult.message || 'Falha ao aplicar novo preço compartilhado pela administração.',
          };
        }
      }

      // 4. Atualiza PropertyDispute
      const updatedDispute = await tx.propertyDispute.update({
        where: { id: disputeId },
        data: {
          status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          resolvedById: adminUserId,
          resolvedAt: new Date(),
          adminNotes: adminNotes.trim(),
        },
      });

      // 5. Se houver solicitação de revisão vinculada, atualiza também seu status
      if (revisionRequest) {
        await tx.priceRevisionRequest.update({
          where: { id: revisionRequest.id },
          data: {
            status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
            decidedById: adminUserId,
            decidedAt: new Date(),
            decisionReason: adminNotes.trim(),
          },
        });
      }

      return {
        success: true,
        dispute: updatedDispute,
        newPrice: finalPrice,
      };
    };

    if (prismaClient) {
      return executeInTx(prismaClient);
    }

    return defaultPrisma.$transaction(executeInTx, {
      timeout: 15000,
      maxWait: 5000,
    });
  }
}

