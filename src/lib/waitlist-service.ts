import { prisma as defaultPrisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { ListingSlotService } from '@/lib/listing-slot-service';

export type WaitlistStatus =
  | 'WAITING'
  | 'PENDING_NOTIFICATION'
  | 'OFFERED'
  | 'CLAIMED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface JoinWaitlistResult {
  success: boolean;
  reason?:
    | 'PHYSICAL_PROPERTY_NOT_FOUND'
    | 'ALREADY_ACTIVE'
    | 'DUPLICATE_WAITLIST'
    | 'INVALID_DRAFT'
    | 'SLOTS_AVAILABLE'
    | 'ERROR';
  message?: string;
  waitlistEntry?: any;
  position?: number;
}

export interface AcceptOfferResult {
  success: boolean;
  reason?:
    | 'NOT_FOUND'
    | 'UNAUTHORIZED'
    | 'INVALID_STATUS'
    | 'OFFER_EXPIRED'
    | 'NO_CAPACITY'
    | 'DRAFT_NOT_FOUND'
    | 'CLAIM_FAILED'
    | 'ERROR';
  message?: string;
  waitlistEntry?: any;
  activatedProperty?: any;
  slot?: number;
}

export interface RejectOfferResult {
  success: boolean;
  reason?: 'NOT_FOUND' | 'UNAUTHORIZED' | 'INVALID_STATUS' | 'ERROR';
  message?: string;
  waitlistEntry?: any;
  nextOfferCreated?: boolean;
}

export interface CancelWaitlistResult {
  success: boolean;
  reason?: 'NOT_FOUND' | 'UNAUTHORIZED' | 'CANNOT_CANCEL' | 'ERROR';
  message?: string;
  waitlistEntry?: any;
}

export interface ProcessAvailabilityResult {
  physicalPropertyId: string;
  availableSlots: number;
  promotedCount: number;
  promotedEntries: any[];
}

export interface ProcessExpirationsResult {
  processedCount: number;
  expiredIds: string[];
  promotedCount: number;
}

/**
 * Serviço central transacional para gestão da Lista de Espera de Corretores (PropertyWaitlist).
 * Controla a fila FIFO, ofertas de 48h, reservas de capacidade e convocações automáticas.
 */
export class PropertyWaitlistService {
  /**
   * Adiciona um corretor à lista de espera de um imóvel físico.
   * O corretor deve possuir um anúncio inativo/rascunho para vincular à sua inscrição.
   */
  static async joinWaitlist(params: {
    physicalPropertyId: string;
    brokerId: string;
    draftPropertyId?: string | null;
    prismaClient?: Prisma.TransactionClient;
  }): Promise<JoinWaitlistResult> {
    const { physicalPropertyId, brokerId, draftPropertyId, prismaClient } = params;

    const executeInTx = async (tx: Prisma.TransactionClient): Promise<JoinWaitlistResult> => {
      // 1. Lock pessimista no imóvel físico
      const lockedPhysical: any[] = await tx.$queryRaw`
        SELECT id, "activeListingsCount", status
        FROM "PhysicalProperty"
        WHERE id = ${physicalPropertyId}
        FOR UPDATE;
      `;

      if (!lockedPhysical || lockedPhysical.length === 0) {
        return {
          success: false,
          reason: 'PHYSICAL_PROPERTY_NOT_FOUND',
          message: 'Imóvel físico não encontrado.',
        };
      }

      // 2. Impede entrada de corretor que já possui anúncio ativo no imóvel
      const activeListing = await tx.property.findFirst({
        where: {
          physicalPropertyId,
          status: 'Disponível',
          OR: [{ userId: brokerId }, { responsibleBrokerId: brokerId }],
        },
        select: { id: true },
      });

      if (activeListing) {
        return {
          success: false,
          reason: 'ALREADY_ACTIVE',
          message: 'Você já possui um anúncio ativo para este imóvel físico e não pode entrar na lista de espera.',
        };
      }

      // 3. Impede inscrição duplicada ativa na fila
      const existingWaitlist = await tx.propertyWaitlist.findFirst({
        where: {
          physicalPropertyId,
          brokerId,
        },
        select: { id: true, position: true, status: true },
      });

      if (existingWaitlist && ['WAITING', 'PENDING_NOTIFICATION', 'OFFERED'].includes(existingWaitlist.status)) {
        return {
          success: false,
          reason: 'DUPLICATE_WAITLIST',
          message: 'Você já possui uma inscrição ativa na lista de espera deste imóvel.',
          waitlistEntry: existingWaitlist,
          position: existingWaitlist.position,
        };
      }

      // 4. Valida draftPropertyId se informado
      let resolvedDraftId: string | null = null;
      if (draftPropertyId) {
        const draftProp = await tx.property.findUnique({
          where: { id: draftPropertyId },
          select: { id: true, userId: true, responsibleBrokerId: true, physicalPropertyId: true, status: true },
        });

        if (!draftProp || (draftProp.userId !== brokerId && draftProp.responsibleBrokerId !== brokerId)) {
          return {
            success: false,
            reason: 'INVALID_DRAFT',
            message: 'O anúncio informado para a fila de espera não pertence a você ou não existe.',
          };
        }

        // Garante que o anúncio esteja vinculado a este imóvel físico e não esteja Disponível
        if (draftProp.physicalPropertyId && draftProp.physicalPropertyId !== physicalPropertyId) {
          return {
            success: false,
            reason: 'INVALID_DRAFT',
            message: 'O anúncio informado está vinculado a outro imóvel físico.',
          };
        }

        // Se o anúncio estiver marcado como Disponível, não pode entrar na fila como rascunho
        if (draftProp.status === 'Disponível') {
          return {
            success: false,
            reason: 'INVALID_DRAFT',
            message: 'O anúncio vinculado à lista de espera deve estar inativo ou em rascunho.',
          };
        }

        // Assegura o vínculo com o physicalPropertyId se ainda não estiver
        if (!draftProp.physicalPropertyId) {
          await tx.property.update({
            where: { id: draftPropertyId },
            data: { physicalPropertyId },
          });
        }

        resolvedDraftId = draftProp.id;
      }

      // 5. Calcula a próxima posição cronológica na fila (FIFO)
      const maxPositionResult = await tx.propertyWaitlist.aggregate({
        where: { physicalPropertyId },
        _max: { position: true },
      });
      const nextPosition = (maxPositionResult._max.position || 0) + 1;

      // 6. Cria ou reativa o registro na fila (respeitando @@unique([physicalPropertyId, brokerId]))
      let entryRecord: any;
      if (existingWaitlist) {
        entryRecord = await tx.propertyWaitlist.update({
          where: { id: existingWaitlist.id },
          data: {
            position: nextPosition,
            status: 'WAITING',
            draftPropertyId: resolvedDraftId,
            notifiedAt: null,
            expiresAt: null,
            createdAt: new Date(),
          },
          include: {
            physicalProperty: {
              select: {
                id: true,
                sharedPrice: true,
                building: {
                  select: { id: true, name: true, address: true, city: true },
                },
              },
            },
          },
        });
      } else {
        entryRecord = await tx.propertyWaitlist.create({
          data: {
            physicalPropertyId,
            brokerId,
            position: nextPosition,
            status: 'WAITING',
            draftPropertyId: resolvedDraftId,
          },
          include: {
            physicalProperty: {
              select: {
                id: true,
                sharedPrice: true,
                building: {
                  select: { id: true, name: true, address: true, city: true },
                },
              },
            },
          },
        });
      }

      return {
        success: true,
        waitlistEntry: entryRecord,
        position: nextPosition,
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
   * Processa a disponibilidade de vagas em um imóvel físico.
   * Se houver capacidade livre (ativos + ofertas < 3), convoca os próximos corretores elegíveis da fila.
   */
  static async processSlotAvailability(params: {
    physicalPropertyId: string;
    prismaClient?: Prisma.TransactionClient;
  }): Promise<ProcessAvailabilityResult> {
    const { physicalPropertyId, prismaClient } = params;

    const executeInTx = async (tx: Prisma.TransactionClient): Promise<ProcessAvailabilityResult> => {
      // 1. Lock pessimista no imóvel físico
      const lockedPhysical: any[] = await tx.$queryRaw`
        SELECT id, "activeListingsCount", status
        FROM "PhysicalProperty"
        WHERE id = ${physicalPropertyId}
        FOR UPDATE;
      `;

      if (!lockedPhysical || lockedPhysical.length === 0) {
        return {
          physicalPropertyId,
          availableSlots: 0,
          promotedCount: 0,
          promotedEntries: [],
        };
      }

      // 2. Conta anúncios ativos atuais
      const activeListingsCount = await tx.property.count({
        where: {
          physicalPropertyId,
          status: 'Disponível',
        },
      });

      // 3. Conta ofertas reservadas válidas
      const now = new Date();
      const activeOffersCount = await tx.propertyWaitlist.count({
        where: {
          physicalPropertyId,
          OR: [
            { status: 'PENDING_NOTIFICATION' },
            {
              status: 'OFFERED',
              expiresAt: { gt: now },
            },
          ],
        },
      });

      const totalCommitted = activeListingsCount + activeOffersCount;
      const availableSlots = Math.max(0, 3 - totalCommitted);

      if (availableSlots <= 0) {
        return {
          physicalPropertyId,
          availableSlots: 0,
          promotedCount: 0,
          promotedEntries: [],
        };
      }

      // 4. Busca os próximos corretores elegíveis em ordem estrita FIFO
      const eligibleEntries = await tx.propertyWaitlist.findMany({
        where: {
          physicalPropertyId,
          status: 'WAITING',
        },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        take: availableSlots,
      });

      const promotedEntries: any[] = [];

      for (const entry of eligibleEntries) {
        // Promove para PENDING_NOTIFICATION (vaga reservada, aguardando início do prazo de notificação)
        const updated = await tx.propertyWaitlist.update({
          where: { id: entry.id },
          data: {
            status: 'PENDING_NOTIFICATION',
          },
        });
        promotedEntries.push(updated);
      }

      return {
        physicalPropertyId,
        availableSlots,
        promotedCount: promotedEntries.length,
        promotedEntries,
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
   * Disponibiliza a oferta formalmente ao corretor, iniciando a contagem do prazo de 48 horas corridas.
   */
  static async dispatchOfferNotification(params: {
    waitlistId: string;
    prismaClient?: Prisma.TransactionClient;
  }): Promise<{ success: boolean; waitlistEntry?: any; message?: string }> {
    const { waitlistId, prismaClient } = params;

    const executeInTx = async (tx: Prisma.TransactionClient) => {
      const entry = await tx.propertyWaitlist.findUnique({
        where: { id: waitlistId },
      });

      if (!entry) {
        return { success: false, message: 'Inscrição na fila não encontrada.' };
      }

      if (entry.status !== 'PENDING_NOTIFICATION') {
        return {
          success: false,
          message: `Inscrição não está com oferta pendente de notificação (status atual: ${entry.status}).`,
        };
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 horas corridas

      const updated = await tx.propertyWaitlist.update({
        where: { id: waitlistId },
        data: {
          status: 'OFFERED',
          notifiedAt: now,
          expiresAt,
        },
      });

      return { success: true, waitlistEntry: updated };
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
   * Aceitação da oferta exclusiva pelo corretor convocado.
   * Ativa transacionalmente o anúncio vinculado e ocupa uma das 3 vagas.
   */
  static async acceptOffer(params: {
    waitlistId: string;
    brokerId: string;
    prismaClient?: Prisma.TransactionClient;
  }): Promise<AcceptOfferResult> {
    const { waitlistId, brokerId, prismaClient } = params;

    const executeInTx = async (tx: Prisma.TransactionClient): Promise<AcceptOfferResult> => {
      // 1. Lock pessimista na inscrição da lista de espera
      const lockedWaitlist: any[] = await tx.$queryRaw`
        SELECT id, "physicalPropertyId", "brokerId", "draftPropertyId", status, "expiresAt"
        FROM "PropertyWaitlist"
        WHERE id = ${waitlistId}
        FOR UPDATE;
      `;

      if (!lockedWaitlist || lockedWaitlist.length === 0) {
        return {
          success: false,
          reason: 'NOT_FOUND',
          message: 'Inscrição na lista de espera não encontrada.',
        };
      }

      const waitlist = lockedWaitlist[0];

      // 2. Valida titularidade da oferta
      if (waitlist.brokerId !== brokerId) {
        return {
          success: false,
          reason: 'UNAUTHORIZED',
          message: 'Você não tem permissão para aceitar esta oferta de vaga.',
        };
      }

      // 3. Valida status da oferta
      if (waitlist.status !== 'OFFERED' && waitlist.status !== 'PENDING_NOTIFICATION') {
        return {
          success: false,
          reason: 'INVALID_STATUS',
          message: `Esta oferta não está disponível para aceitação (status atual: ${waitlist.status}).`,
        };
      }

      const now = new Date();

      // 4. Se já estiver no status OFFERED, valida prazo de expiração
      if (waitlist.status === 'OFFERED' && waitlist.expiresAt) {
        const expiresAtDate = new Date(waitlist.expiresAt);
        if (now > expiresAtDate) {
          // Marca como expirada sob o mesmo lock
          await tx.propertyWaitlist.update({
            where: { id: waitlistId },
            data: { status: 'EXPIRED' },
          });

          // Convoca o próximo corretor da fila
          await PropertyWaitlistService.processSlotAvailability({
            physicalPropertyId: waitlist.physicalPropertyId,
            prismaClient: tx,
          });

          return {
            success: false,
            reason: 'OFFER_EXPIRED',
            message: 'O prazo de 48 horas para aceitar esta oferta expirou.',
          };
        }
      }

      // 5. Valida anúncio associado (draftPropertyId)
      if (!waitlist.draftPropertyId) {
        return {
          success: false,
          reason: 'DRAFT_NOT_FOUND',
          message: 'Não há anúncio em rascunho vinculado a esta inscrição para ser ativado.',
        };
      }

      const draftProp = await tx.property.findUnique({
        where: { id: waitlist.draftPropertyId },
      });

      if (!draftProp) {
        return {
          success: false,
          reason: 'DRAFT_NOT_FOUND',
          message: 'O anúncio vinculado a esta inscrição não foi encontrado.',
        };
      }

      // 6. Lock no imóvel físico para alocação atômica da vaga
      const claimResult = await ListingSlotService.claimListingSlot({
        physicalPropertyId: waitlist.physicalPropertyId,
        propertyId: draftProp.id,
        brokerId,
        prismaClient: tx,
      });

      if (!claimResult.success) {
        return {
          success: false,
          reason: 'CLAIM_FAILED',
          message: claimResult.message || 'Falha ao alocar vaga para o anúncio.',
        };
      }

      // 7. Atualiza o anúncio para 'Disponível'
      const updatedProperty = await tx.property.update({
        where: { id: draftProp.id },
        data: {
          status: 'Disponível',
          price: claimResult.sharedPrice !== undefined ? claimResult.sharedPrice : draftProp.price,
          listingSlot: claimResult.slot,
          isPrimaryListing: claimResult.isPrimary || false,
        },
      });

      // 8. Atualiza a inscrição da lista de espera para CLAIMED
      const updatedWaitlist = await tx.propertyWaitlist.update({
        where: { id: waitlistId },
        data: {
          status: 'CLAIMED',
        },
      });

      return {
        success: true,
        waitlistEntry: updatedWaitlist,
        activatedProperty: updatedProperty,
        slot: claimResult.slot,
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
   * Recusa voluntária da oferta pelo corretor convocado.
   * Cancela a prioridade da inscrição e convoca imediatamente o próximo corretor da fila.
   */
  static async rejectOffer(params: {
    waitlistId: string;
    brokerId: string;
    reason?: string | null;
    prismaClient?: Prisma.TransactionClient;
  }): Promise<RejectOfferResult> {
    const { waitlistId, brokerId, prismaClient } = params;

    const executeInTx = async (tx: Prisma.TransactionClient): Promise<RejectOfferResult> => {
      // 1. Lock pessimista na inscrição
      const lockedWaitlist: any[] = await tx.$queryRaw`
        SELECT id, "physicalPropertyId", "brokerId", status
        FROM "PropertyWaitlist"
        WHERE id = ${waitlistId}
        FOR UPDATE;
      `;

      if (!lockedWaitlist || lockedWaitlist.length === 0) {
        return {
          success: false,
          reason: 'NOT_FOUND',
          message: 'Inscrição na lista de espera não encontrada.',
        };
      }

      const waitlist = lockedWaitlist[0];

      if (waitlist.brokerId !== brokerId) {
        return {
          success: false,
          reason: 'UNAUTHORIZED',
          message: 'Você não tem permissão para recusar esta oferta.',
        };
      }

      if (waitlist.status !== 'OFFERED' && waitlist.status !== 'PENDING_NOTIFICATION') {
        return {
          success: false,
          reason: 'INVALID_STATUS',
          message: `Esta oferta não pode ser recusada (status atual: ${waitlist.status}).`,
        };
      }

      // 2. Atualiza status para REJECTED
      const updated = await tx.propertyWaitlist.update({
        where: { id: waitlistId },
        data: {
          status: 'REJECTED',
        },
      });

      // 3. Convoca imediatamente o próximo da fila
      const promoResult = await PropertyWaitlistService.processSlotAvailability({
        physicalPropertyId: waitlist.physicalPropertyId,
        prismaClient: tx,
      });

      return {
        success: true,
        waitlistEntry: updated,
        nextOfferCreated: promoResult.promotedCount > 0,
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
   * Cancelamento voluntário de uma inscrição na lista de espera pelo corretor.
   * Se o corretor tinha uma oferta reservada, convoca o próximo da fila.
   */
  static async cancelWaitlist(params: {
    waitlistId: string;
    brokerId: string;
    prismaClient?: Prisma.TransactionClient;
  }): Promise<CancelWaitlistResult> {
    const { waitlistId, brokerId, prismaClient } = params;

    const executeInTx = async (tx: Prisma.TransactionClient): Promise<CancelWaitlistResult> => {
      // 1. Lock pessimista
      const lockedWaitlist: any[] = await tx.$queryRaw`
        SELECT id, "physicalPropertyId", "brokerId", status
        FROM "PropertyWaitlist"
        WHERE id = ${waitlistId}
        FOR UPDATE;
      `;

      if (!lockedWaitlist || lockedWaitlist.length === 0) {
        return {
          success: false,
          reason: 'NOT_FOUND',
          message: 'Inscrição na lista de espera não encontrada.',
        };
      }

      const waitlist = lockedWaitlist[0];

      if (waitlist.brokerId !== brokerId) {
        return {
          success: false,
          reason: 'UNAUTHORIZED',
          message: 'Você não tem permissão para cancelar esta inscrição.',
        };
      }

      if (waitlist.status === 'CLAIMED' || waitlist.status === 'CANCELLED') {
        return {
          success: false,
          reason: 'CANNOT_CANCEL',
          message: `Esta inscrição já foi finalizada ou cancelada (status: ${waitlist.status}).`,
        };
      }

      const hadReservedSlot = waitlist.status === 'OFFERED' || waitlist.status === 'PENDING_NOTIFICATION';

      // 2. Atualiza status para CANCELLED
      const updated = await tx.propertyWaitlist.update({
        where: { id: waitlistId },
        data: {
          status: 'CANCELLED',
        },
      });

      // 3. Se tinha vaga reservada, convoca o próximo da fila
      if (hadReservedSlot) {
        await PropertyWaitlistService.processSlotAvailability({
          physicalPropertyId: waitlist.physicalPropertyId,
          prismaClient: tx,
        });
      }

      return {
        success: true,
        waitlistEntry: updated,
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
   * Varre e processa ofertas expiradas (horário UTC de expiração ultrapassado).
   * Operação idempotente e segura contra concorrência.
   */
  static async processExpiredOffers(params?: {
    physicalPropertyId?: string;
    prismaClient?: Prisma.TransactionClient;
  }): Promise<ProcessExpirationsResult> {
    const targetPhysicalId = params?.physicalPropertyId;
    const client = params?.prismaClient;

    const executeInTx = async (tx: Prisma.TransactionClient): Promise<ProcessExpirationsResult> => {
      const now = new Date();

      const whereClause: Prisma.PropertyWaitlistWhereInput = {
        status: 'OFFERED',
        expiresAt: { lte: now },
      };

      if (targetPhysicalId) {
        whereClause.physicalPropertyId = targetPhysicalId;
      }

      // Busca ofertas expiradas sob lock pessimista de linha para prevenir concorrência duplicada
      const expiredOffers: Array<{ id: string; physicalPropertyId: string }> = targetPhysicalId
        ? await tx.$queryRaw`
            SELECT id, "physicalPropertyId"
            FROM "PropertyWaitlist"
            WHERE status = 'OFFERED'
              AND "expiresAt" <= ${now}
              AND "physicalPropertyId" = ${targetPhysicalId}
            FOR UPDATE;
          `
        : await tx.$queryRaw`
            SELECT id, "physicalPropertyId"
            FROM "PropertyWaitlist"
            WHERE status = 'OFFERED'
              AND "expiresAt" <= ${now}
            FOR UPDATE;
          `;

      if (!expiredOffers || expiredOffers.length === 0) {
        return {
          processedCount: 0,
          expiredIds: [],
          promotedCount: 0,
        };
      }

      const expiredIds = expiredOffers.map((o) => o.id);
      const affectedPhysicalIds = Array.from(new Set(expiredOffers.map((o) => o.physicalPropertyId)));
      affectedPhysicalIds.sort();

      // Atualiza para EXPIRED sob a mesma transação
      await tx.propertyWaitlist.updateMany({
        where: { id: { in: expiredIds } },
        data: { status: 'EXPIRED' },
      });

      // Para cada imóvel afetado, convoca o próximo corretor elegível
      let totalPromoted = 0;
      for (const pId of affectedPhysicalIds) {
        const promo = await PropertyWaitlistService.processSlotAvailability({
          physicalPropertyId: pId,
          prismaClient: tx,
        });
        totalPromoted += promo.promotedCount;
      }

      return {
        processedCount: expiredIds.length,
        expiredIds,
        promotedCount: totalPromoted,
      };
    };

    if (client) {
      return executeInTx(client);
    }

    return defaultPrisma.$transaction(executeInTx, {
      timeout: 15000,
      maxWait: 5000,
    });
  }

  /**
   * Consulta as ofertas ativas para um corretor autenticado.
   */
  static async getBrokerOffers(brokerId: string) {
    const now = new Date();
    return defaultPrisma.propertyWaitlist.findMany({
      where: {
        brokerId,
        OR: [
          { status: 'PENDING_NOTIFICATION' },
          {
            status: 'OFFERED',
            expiresAt: { gt: now },
          },
        ],
      },
      include: {
        physicalProperty: {
          select: {
            id: true,
            sharedPrice: true,
            building: {
              select: {
                id: true,
                name: true,
                address: true,
                city: true,
              },
            },
            unit: {
              select: {
                unitNumber: true,
                tower: true,
              },
            },
          },
        },
      },
    });
  }
}

