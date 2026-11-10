import { prisma } from '@/lib/db';
import { canPropertyBePubliclyExposed } from '@/lib/legal/service';

export interface ResolvedPublicOffer {
  isAvailable: boolean;
  entity: any | null;
  offerType: 'PROPERTY' | 'TYPOLOGY';
  brokerOverride?: any | null;
  isShare: boolean;
  unavailabilityReason?: string;
}

/**
 * Resolve com segurança uma oferta pública a partir de seu publicId.
 * Prioriza a busca por PropertyShare (links individuais de corretores parceiros).
 * Caso seja um PropertyShare revogado ou com pré-requisitos inválidos,
 * NUNCA executa fallback para outra identidade profissional e encerra com isAvailable: false.
 */
export async function resolvePublicOffer(publicId: string): Promise<ResolvedPublicOffer | null> {
  if (!publicId || typeof publicId !== 'string') {
    return null;
  }

  // 1. Prioridade: Verifica se o identificador pertence a um PropertyShare (Link individual)
  const share = await prisma.propertyShare.findUnique({
    where: { publicId },
    include: {
      broker: {
        include: { profile: true },
      },
      property: {
        include: {
          images: {
            orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
          },
          responsibleBroker: {
            include: { profile: true },
          },
          user: {
            include: { profile: true },
          },
          building: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (share) {
    // Identificado como PropertyShare de corretor parceiro.
    // Regra estrita: se inválido/inativo, NUNCA faz fallback para outra identidade.
    const brokerActive = share.broker?.status === 'ACTIVE';
    const propertyPublic = Boolean(share.property?.isPublic);
    const propertyAvailable = share.property?.status === 'Disponível';
    const owner = share.property?.responsibleBroker || share.property?.user;
    const ownerActive = owner ? owner.status === 'ACTIVE' : true;
    const shareActive = share.isActive;
    const exposureCheck = await canPropertyBePubliclyExposed(share.propertyId);
    const exposureAllowed = exposureCheck.allowed;

    const isValid = shareActive && brokerActive && propertyPublic && propertyAvailable && ownerActive && exposureAllowed;

    if (!isValid) {
      return {
        isAvailable: false,
        entity: null,
        offerType: 'PROPERTY',
        brokerOverride: null,
        isShare: true,
        unavailabilityReason: !shareActive
          ? 'Link de compartilhamento individual desativado.'
          : !brokerActive
          ? 'Corretor parceiro inativo na plataforma.'
          : !propertyPublic
          ? 'Imóvel original despublicado pelo corretor responsável.'
          : !propertyAvailable
          ? 'Imóvel original indisponível comercialmente.'
          : !ownerActive
          ? 'Corretor responsável original inativo.'
          : (exposureCheck.reason || 'Autorização de divulgação suspensa.'),
      };
    }

    const brokerOverride = {
      name: share.broker.name,
      email: share.broker.email,
      ...(share.broker.profile || {}),
    };

    return {
      isAvailable: true,
      entity: share.property,
      offerType: 'PROPERTY',
      brokerOverride,
      isShare: true,
    };
  }

  // 2. Verifica se pertence à tabela Property (Link legado / direto do proprietário)
  const property = await prisma.property.findUnique({
    where: { publicId },
    include: {
      images: {
        orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
      },
      responsibleBroker: {
        include: { profile: true },
      },
      user: {
        include: { profile: true },
      },
      building: {
        select: { id: true, name: true },
      },
    },
  });

  if (property) {
    const broker = property.responsibleBroker || property.user;
    const brokerActive = broker ? broker.status === 'ACTIVE' : true;
    const exposureCheck = await canPropertyBePubliclyExposed(property.id);
    const isAvailable = Boolean(property.isPublic && brokerActive && exposureCheck.allowed);

    return {
      isAvailable,
      entity: isAvailable ? property : null,
      offerType: 'PROPERTY',
      brokerOverride: null,
      isShare: false,
      unavailabilityReason: !exposureCheck.allowed ? exposureCheck.reason : undefined,
    };
  }

  // 3. Verifica se pertence à tabela Typology (Empreendimentos)
  const typology = await prisma.typology.findUnique({
    where: { publicId },
    include: {
      development: {
        include: {
          images: {
            orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
          },
          responsibleBroker: {
            include: { profile: true },
          },
          user: {
            include: { profile: true },
          },
        },
      },
    },
  });

  if (typology) {
    const broker = typology.development?.responsibleBroker || typology.development?.user;
    const brokerActive = broker ? broker.status === 'ACTIVE' : true;
    const isAvailable = Boolean(typology.isPublic && brokerActive);

    return {
      isAvailable,
      entity: isAvailable ? typology : null,
      offerType: 'TYPOLOGY',
      brokerOverride: null,
      isShare: false,
    };
  }

  return null;
}
