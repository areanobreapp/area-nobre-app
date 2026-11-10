import { prisma as defaultPrisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { PropertyWaitlistService } from '@/lib/waitlist-service';

export interface SlotClaimResult {
  success: boolean;
  reason?: 'SLOTS_FULL' | 'DUPLICATE_BROKER' | 'INVALID_PRICE' | 'PHYSICAL_PROPERTY_NOT_FOUND' | 'ERROR';
  message?: string;
  slot?: number;
  isPrimary?: boolean;
  sharedPrice?: number;
  activeCount?: number;
}

export interface SlotReleaseResult {
  success: boolean;
  reason?: string;
  remainingCount: number;
  newPrimaryId: string | null;
}

export interface PriceUpdateResult {
  success: boolean;
  reason?: 'UNAUTHORIZED' | 'INVALID_PRICE' | 'PHYSICAL_PROPERTY_NOT_FOUND' | 'NO_ACTIVE_LISTINGS' | 'ERROR';
  message?: string;
  oldPrice?: number | null;
  newPrice?: number;
  updatedListingsCount?: number;
  historyId?: string;
}

export interface PhysicalPropertySlotInfo {
  physicalPropertyId: string;
  activeListingsCount: number;
  availableSlots: number;
  sharedPrice: number | null;
  primaryListingId: string | null;
  isPrimaryBroker: boolean;
  listings: Array<{
    id: string;
    slot: number | null;
    isPrimary: boolean;
    userId: string;
    responsibleBrokerId: string | null;
    price: number;
    status: string;
    createdAt: Date;
  }>;
}

/**
 * Serviço central transacional para controle de capacidade (limite de 3 vagas)
 * e consistência de Preço Único Compartilhado por Imóvel Físico.
 * 
 * Utiliza transações serializadas com bloqueio pessimista PostgreSQL (SELECT ... FOR UPDATE)
 * na entidade PhysicalProperty para garantir isolamento contra condições de corrida (race conditions).
 */
export class ListingSlotService {
  /**
   * Reserva uma vaga ativa (slot) para um anúncio no imóvel físico correspondente.
   * Executa sob lock exclusivo PostgreSQL (FOR UPDATE) na tabela PhysicalProperty.
   */
  static async claimListingSlot(params: {
    physicalPropertyId: string;
    propertyId: string;
    brokerId: string;
    requestedPrice?: number | null;
    prismaClient?: Prisma.TransactionClient;
  }): Promise<SlotClaimResult> {
    const { physicalPropertyId, propertyId, brokerId, requestedPrice, prismaClient } = params;

    const executeInTx = async (tx: Prisma.TransactionClient): Promise<SlotClaimResult> => {
      // 1. Bloqueio pessimista de linha no PostgreSQL (FOR UPDATE)
      const lockedRows: any[] = await tx.$queryRaw`
        SELECT id, "activeListingsCount", "sharedPrice", "primaryListingId", status
        FROM "PhysicalProperty"
        WHERE id = ${physicalPropertyId}
        FOR UPDATE;
      `;

      if (!lockedRows || lockedRows.length === 0) {
        return {
          success: false,
          reason: 'PHYSICAL_PROPERTY_NOT_FOUND',
          message: 'Imóvel físico não encontrado.',
        };
      }

      const physicalProperty = lockedRows[0];

      // 2. Impede duplicidade ativa do mesmo corretor
      const existingBrokerActive = await tx.property.findFirst({
        where: {
          physicalPropertyId,
          status: 'Disponível',
          id: { not: propertyId },
          OR: [
            { userId: brokerId },
            { responsibleBrokerId: brokerId },
          ],
        },
        select: { id: true },
      });

      if (existingBrokerActive) {
        return {
          success: false,
          reason: 'DUPLICATE_BROKER',
          message: 'O corretor já possui um anúncio ativo para este imóvel físico.',
        };
      }

      // 3. Consulta anúncios ativos concorrentes no imóvel
      const currentActiveListings = await tx.property.findMany({
        where: {
          physicalPropertyId,
          status: 'Disponível',
          id: { not: propertyId },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          listingSlot: true,
          isPrimaryListing: true,
          price: true,
          createdAt: true,
        },
      });

      // Consulta ofertas reservadas ativas na lista de espera para OUTROS corretores
      const now = new Date();
      const otherReservedOffers = await tx.propertyWaitlist.findMany({
        where: {
          physicalPropertyId,
          brokerId: { not: brokerId },
          OR: [
            { status: 'PENDING_NOTIFICATION' },
            {
              status: 'OFFERED',
              expiresAt: { gt: now },
            },
          ],
        },
        select: { id: true, brokerId: true },
      });

      const totalCommitted = currentActiveListings.length + otherReservedOffers.length;

      if (totalCommitted >= 3) {
        return {
          success: false,
          reason: 'SLOTS_FULL',
          message: 'O imóvel físico já atingiu o limite de 3 vagas (ativas e reservadas para a lista de espera).',
          activeCount: currentActiveListings.length,
        };
      }

      // 4. Determinação do slot (1, 2 ou 3) - independente da posição de anúncio principal
      const usedSlots = new Set<number>(
        currentActiveListings.map((l) => l.listingSlot).filter((s): s is number => typeof s === 'number')
      );
      let assignedSlot = 1;
      while (usedSlots.has(assignedSlot) && assignedSlot <= 3) {
        assignedSlot++;
      }

      // 5. Eleição do Anúncio Principal
      // O anúncio principal é o anúncio ativo mais antigo.
      // Se não há anúncios ativos anteriores, este anúncio torna-se o principal.
      const isFirstActive = currentActiveListings.length === 0;
      let isPrimary = false;
      let primaryId: string | null = null;

      if (isFirstActive) {
        isPrimary = true;
        primaryId = propertyId;
      } else {
        // Já existem outros anúncios ativos; o mais antigo existente permanece principal
        isPrimary = false;
        primaryId = currentActiveListings[0].id;
      }

      // 6. Preço Único Compartilhado
      let effectiveSharedPrice: number;

      if (isFirstActive || physicalProperty.sharedPrice === null) {
        // Primeiro anúncio efetivamente ativado define o preço inicial do imóvel físico
        const numPrice = typeof requestedPrice === 'number' ? requestedPrice : parseFloat(String(requestedPrice || 0));
        if (isNaN(numPrice) || numPrice <= 0) {
          return {
            success: false,
            reason: 'INVALID_PRICE',
            message: 'O preço inicial de ativação do imóvel deve ser um valor numérico positivo maior que zero.',
          };
        }
        effectiveSharedPrice = numPrice;

        // Atualiza PhysicalProperty com o novo sharedPrice
        await tx.physicalProperty.update({
          where: { id: physicalPropertyId },
          data: {
            sharedPrice: new Prisma.Decimal(effectiveSharedPrice),
            priceUpdatedAt: new Date(),
            priceUpdatedById: brokerId,
            primaryListingId: primaryId,
            activeListingsCount: currentActiveListings.length + 1,
          },
        });

        // Registra histórico inicial
        await tx.physicalPropertyPriceHistory.create({
          data: {
            physicalPropertyId,
            oldPrice: null,
            newPrice: new Prisma.Decimal(effectiveSharedPrice),
            changedById: brokerId,
            reason: 'Preço inicial estabelecido na primeira ativação de anúncio.',
            source: 'INITIAL_LISTING',
          },
        });
      } else {
        // Já existe preço compartilhado; o novo anúncio herda compulsoriamente este valor
        effectiveSharedPrice = Number(physicalProperty.sharedPrice);

        // Atualiza capacidade e principal
        await tx.physicalProperty.update({
          where: { id: physicalPropertyId },
          data: {
            activeListingsCount: currentActiveListings.length + 1,
            primaryListingId: primaryId,
          },
        });
      }

      // 7. Atualiza o anúncio Property com o slot, flag de principal e preço compartilhado
      await tx.property.update({
        where: { id: propertyId },
        data: {
          physicalPropertyId,
          status: 'Disponível',
          listingSlot: assignedSlot,
          isPrimaryListing: isPrimary,
          price: effectiveSharedPrice,
        },
      });

      return {
        success: true,
        slot: assignedSlot,
        isPrimary,
        sharedPrice: effectiveSharedPrice,
        activeCount: currentActiveListings.length + 1,
      };
    };

    if (prismaClient) {
      return executeInTx(prismaClient);
    }

    return defaultPrisma.$transaction(executeInTx, {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: 10000,
    });
  }

  /**
   * Libera uma vaga de anúncio quando o imóvel for inativado, vendido, reservado ou excluído.
   * Recalcula a quantidade de anúncios ativos e promove automaticamente o próximo anúncio ativo a principal.
   */
  static async releaseListingSlot(params: {
    physicalPropertyId: string;
    propertyId: string;
    newStatus?: string; // Ex: 'Inativo', 'Vendido/Alugado', 'Reservado'
    isDeleting?: boolean;
    prismaClient?: Prisma.TransactionClient;
  }): Promise<SlotReleaseResult> {
    const { physicalPropertyId, propertyId, newStatus, isDeleting, prismaClient } = params;

    const executeInTx = async (tx: Prisma.TransactionClient): Promise<SlotReleaseResult> => {
      // 1. Bloqueio pessimista de linha no PostgreSQL
      const lockedRows: any[] = await tx.$queryRaw`
        SELECT id, "activeListingsCount", "sharedPrice", "primaryListingId"
        FROM "PhysicalProperty"
        WHERE id = ${physicalPropertyId}
        FOR UPDATE;
      `;

      if (!lockedRows || lockedRows.length === 0) {
        return {
          success: false,
          reason: 'Imóvel físico não encontrado.',
          remainingCount: 0,
          newPrimaryId: null,
        };
      }

      // 2. Atualiza ou desmarca o anúncio que está liberando a vaga
      if (!isDeleting) {
        await tx.property.update({
          where: { id: propertyId },
          data: {
            status: newStatus || 'Inativo',
            listingSlot: null,
            isPrimaryListing: false,
          },
        });
      }

      // 3. Consulta anúncios ativos restantes ordenados por antiguidade
      const remainingActive = await tx.property.findMany({
        where: {
          physicalPropertyId,
          status: 'Disponível',
          id: { not: propertyId },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true, isPrimaryListing: true, listingSlot: true },
      });

      let newPrimaryId: string | null = null;

      if (remainingActive.length === 0) {
        // Não restou nenhum anúncio ativo; zera contador e primaryListingId
        // Nota: sharedPrice é mantido como referência histórica
        await tx.physicalProperty.update({
          where: { id: physicalPropertyId },
          data: {
            activeListingsCount: 0,
            primaryListingId: null,
          },
        });
      } else {
        // O anúncio ativo mais antigo remanescente torna-se o novo anúncio principal
        const oldestRemaining = remainingActive[0];
        newPrimaryId = oldestRemaining.id;

        // Atualiza a flag isPrimaryListing no novo principal
        await tx.property.update({
          where: { id: oldestRemaining.id },
          data: { isPrimaryListing: true },
        });

        // Garante que os demais permaneçam como não-principais
        if (remainingActive.length > 1) {
          const otherIds = remainingActive.slice(1).map((l) => l.id);
          await tx.property.updateMany({
            where: { id: { in: otherIds } },
            data: { isPrimaryListing: false },
          });
        }

        // Atualiza PhysicalProperty
        await tx.physicalProperty.update({
          where: { id: physicalPropertyId },
          data: {
            activeListingsCount: remainingActive.length,
            primaryListingId: newPrimaryId,
          },
        });
      }

      // 4. Se restaram vagas livres (< 3), convoca o próximo corretor elegível da lista de espera
      try {
        await PropertyWaitlistService.processSlotAvailability({
          physicalPropertyId,
          prismaClient: tx,
        });
      } catch (waitlistErr) {
        console.warn('[ListingSlotService.releaseListingSlot] Aviso ao processar lista de espera:', waitlistErr);
      }

      return {
        success: true,
        remainingCount: remainingActive.length,
        newPrimaryId,
      };
    };

    if (prismaClient) {
      return executeInTx(prismaClient);
    }

    return defaultPrisma.$transaction(executeInTx, {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: 10000,
    });
  }

  /**
   * Altera o preço único compartilhado do imóvel físico.
   * Valida a autoridade do usuário (somente o corretor responsável pelo anúncio principal ou ADMIN).
   * Atualiza atomicamente PhysicalProperty.sharedPrice, o histórico e todos os Property.price ativos.
   */
  static async updateSharedPrice(params: {
    physicalPropertyId: string;
    userId: string;
    userRole: string; // 'ADMIN' | 'BROKER'
    newPrice: number;
    reason?: string | null;
    source?: 'PRIMARY_BROKER' | 'ADMIN_ADJUDICATION' | 'REVISION_ACCEPTED';
    revisionRequestId?: string | null;
    prismaClient?: Prisma.TransactionClient;
  }): Promise<PriceUpdateResult> {
    const { physicalPropertyId, userId, userRole, newPrice, reason, source, revisionRequestId, prismaClient } = params;

    // Validação estrita de preço
    if (typeof newPrice !== 'number' || isNaN(newPrice) || newPrice <= 0) {
      return {
        success: false,
        reason: 'INVALID_PRICE',
        message: 'O novo preço compartilhado deve ser um valor numérico positivo maior que zero.',
      };
    }

    const executeInTx = async (tx: Prisma.TransactionClient): Promise<PriceUpdateResult> => {
      // 1. Bloqueio pessimista de linha no PostgreSQL (FOR UPDATE)
      const lockedRows: any[] = await tx.$queryRaw`
        SELECT id, "activeListingsCount", "sharedPrice", "primaryListingId"
        FROM "PhysicalProperty"
        WHERE id = ${physicalPropertyId}
        FOR UPDATE;
      `;

      if (!lockedRows || lockedRows.length === 0) {
        return {
          success: false,
          reason: 'PHYSICAL_PROPERTY_NOT_FOUND',
          message: 'Imóvel físico não encontrado.',
        };
      }

      const physicalProperty = lockedRows[0];
      const isAdmin = userRole === 'ADMIN';

      // 2. Validação da autoridade
      if (!isAdmin) {
        if (!physicalProperty.primaryListingId) {
          return {
            success: false,
            reason: 'NO_ACTIVE_LISTINGS',
            message: 'Não há anúncio principal ativo no momento para este imóvel.',
          };
        }

        const primaryListing = await tx.property.findUnique({
          where: { id: physicalProperty.primaryListingId },
          select: { id: true, userId: true, responsibleBrokerId: true, status: true },
        });

        const isAuthorizedPrimary =
          primaryListing &&
          primaryListing.status === 'Disponível' &&
          (primaryListing.userId === userId || primaryListing.responsibleBrokerId === userId);

        if (!isAuthorizedPrimary) {
          return {
            success: false,
            reason: 'UNAUTHORIZED',
            message: 'Somente o corretor responsável pelo anúncio principal possui autoridade para alterar o preço compartilhado.',
          };
        }
      }

      const oldPrice = physicalProperty.sharedPrice !== null ? Number(physicalProperty.sharedPrice) : null;
      const decimalNewPrice = new Prisma.Decimal(newPrice);

      // 3. Atualiza PhysicalProperty
      await tx.physicalProperty.update({
        where: { id: physicalPropertyId },
        data: {
          sharedPrice: decimalNewPrice,
          priceUpdatedAt: new Date(),
          priceUpdatedById: userId,
        },
      });

      // 4. Grava Histórico de Alteração de Preço
      const historyEntry = await tx.physicalPropertyPriceHistory.create({
        data: {
          physicalPropertyId,
          oldPrice: oldPrice !== null ? new Prisma.Decimal(oldPrice) : null,
          newPrice: decimalNewPrice,
          changedById: userId,
          reason: reason?.trim() || null,
          source: source || (isAdmin ? 'ADMIN_ADJUDICATION' : 'PRIMARY_BROKER'),
          revisionRequestId: revisionRequestId || null,
        },
      });

      // 5. Sincroniza atomicamente o preço de todos os anúncios ativos vinculados
      const updateResult = await tx.property.updateMany({
        where: {
          physicalPropertyId,
          status: 'Disponível',
        },
        data: {
          price: newPrice,
        },
      });

      return {
        success: true,
        oldPrice,
        newPrice,
        updatedListingsCount: updateResult.count,
        historyId: historyEntry.id,
      };
    };

    if (prismaClient) {
      return executeInTx(prismaClient);
    }

    return defaultPrisma.$transaction(executeInTx, {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: 10000,
    });
  }

  /**
   * Obtém informações detalhadas sobre as vagas e o preço compartilhado do imóvel físico.
   */
  static async getSlotInfo(physicalPropertyId: string, currentUserId?: string): Promise<PhysicalPropertySlotInfo | null> {
    const physical = await defaultPrisma.physicalProperty.findUnique({
      where: { id: physicalPropertyId },
      include: {
        listings: {
          where: { status: 'Disponível' },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            listingSlot: true,
            isPrimaryListing: true,
            userId: true,
            responsibleBrokerId: true,
            price: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!physical) return null;

    const listings = physical.listings.map((l) => ({
      id: l.id,
      slot: l.listingSlot,
      isPrimary: l.isPrimaryListing,
      userId: l.userId,
      responsibleBrokerId: l.responsibleBrokerId,
      price: l.price,
      status: l.status,
      createdAt: l.createdAt,
    }));

    const isPrimaryBroker = Boolean(
      currentUserId &&
        listings.length > 0 &&
        listings[0].isPrimary &&
        (listings[0].userId === currentUserId || listings[0].responsibleBrokerId === currentUserId)
    );

    return {
      physicalPropertyId: physical.id,
      activeListingsCount: listings.length,
      availableSlots: Math.max(0, 3 - listings.length),
      sharedPrice: physical.sharedPrice !== null ? Number(physical.sharedPrice) : null,
      primaryListingId: physical.primaryListingId,
      isPrimaryBroker,
      listings,
    };
  }
}

