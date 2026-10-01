import { BROKER_CONFIG } from './public-sharing';
import { getTerritorialApproximateCenter } from './geo/neighborhood-centroids';

export type PublicLocationPrecision = 'HIDDEN' | 'APPROXIMATE' | 'EXACT';

export interface PublicPropertyImage {
  id: string;
  url: string;
  isCover: boolean;
}

export interface PublicPropertyDTO {
  publicId: string;
  title: string;
  propertyType: string;
  purpose: string;
  price: number;
  description: string | null;
  bedrooms: number;
  suites: number;
  otherBedrooms: number | null;
  bathrooms: number;
  otherBathrooms: number | null;
  parkingSpaces: number;
  privateArea: number | null;
  totalArea: number | null;
  landArea: number | null;
  floor: number | null;

  // Localização respeitando privacidade
  locationPrecision: PublicLocationPrecision;
  city: string | null;
  state: string | null;
  neighborhood: string | null; // Oculto se locationPrecision === 'HIDDEN'
  address: string | null;      // Oculto exceto se locationPrecision === 'EXACT'
  number: string | null;       // Oculto exceto se locationPrecision === 'EXACT'
  zipcode: string | null;      // Oculto exceto se locationPrecision === 'EXACT'
  latitude: number | null;     // Oculto exceto se locationPrecision === 'EXACT'
  longitude: number | null;    // Oculto exceto se locationPrecision === 'EXACT'
  approximateCenter: { latitude: number; longitude: number } | null; // Presente apenas em 'APPROXIMATE'

  // Imagens públicas
  images: PublicPropertyImage[];

  // Características públicas pertinentes (somente booleanos confirmados ou textos informativos)
  acceptsExchange: boolean | null; // NUNCA exchangeNotes
  isRegistered: boolean | null;
  hasPool: boolean | null;
  hasGym: boolean | null;
  hasBarbecue: boolean | null;
  hasPartyHall: boolean | null;
  hasElevator: boolean | null;
  isPenthouse: boolean | null;
  hasPetSpace: boolean | null;
  furniture: string | null;
  isCorner: boolean | null;
  inGatedCommunity: boolean | null;
  inAllotment: boolean | null;
  streetPaving: string | null;
  commercialType: string | null;

  // Contexto de Empreendimento (quando for tipologia de lançamento / em construção)
  isDevelopmentOffer: boolean;
  development?: {
    name: string;
    developer: string;
    stage: string;
    deliveryDate: string | null;
    description: string | null;
    hasDirectInstallments: boolean | null;
    sharedAmenities: {
      hasPool: boolean | null;
      hasGym: boolean | null;
      hasPartyHall: boolean | null;
      hasPetSpace: boolean | null;
      hasElevator: boolean | null;
    };
  };

  // Identidade profissional dinâmica do corretor responsável (Fase 5.4)
  broker: {
    name: string;
    brandName: string;
    creci: string | null;
    formattedPhone: string;
    phone: string;
    email: string | null;
    city: string | null;
    tagline: string | null;
    avatarUrl: string | null;
    logoUrl: string | null;
  };

  publishedAt: string;
}

/**
 * Transforma uma entidade interna (Property ou Typology com Development)
 * em um DTO rigorosamente sanitizado para consumo público não autenticado.
 *
 * NUNCA repassa:
 * - Matrícula (registryNumber)
 * - Notas internas (internalNotes, exchangeNotes)
 * - Boundary / delimitação do terreno
 * - IDs do banco (id, userId, clientId, searchId)
 * - Dados de matching / score / "por que combina"
 * - Buscas e clientes associados
 */
export function toPublicPropertyDTO(
  entity: any,
  offerType: 'PROPERTY' | 'TYPOLOGY' = 'PROPERTY',
  brokerOverride?: any
): PublicPropertyDTO {
  const precision: PublicLocationPrecision =
    (entity.publicLocationPrecision as PublicLocationPrecision) || 'APPROXIMATE';

  // Resolução dinâmica da identidade profissional do corretor (Fase 5.4)
  const rawBroker = brokerOverride || (
    entity.responsibleBroker?.profile
      ? {
          name: entity.responsibleBroker.name,
          email: entity.responsibleBroker.email,
          ...entity.responsibleBroker.profile,
        }
      : entity.development?.responsibleBroker?.profile
      ? {
          name: entity.development.responsibleBroker.name,
          email: entity.development.responsibleBroker.email,
          ...entity.development.responsibleBroker.profile,
        }
      : entity.user?.profile
      ? {
          name: entity.user.name,
          email: entity.user.email,
          ...entity.user.profile,
        }
      : null
  );

  const phone = rawBroker?.phone || BROKER_CONFIG.phone;
  const cleanPhone = phone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.length === 11
    ? `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 7)}-${cleanPhone.slice(7)}`
    : phone;

  const resolvedBroker = {
    name: rawBroker?.name || BROKER_CONFIG.name,
    brandName: rawBroker?.commercialName || (rawBroker?.name ? `${rawBroker.name} Imóveis` : BROKER_CONFIG.brandName),
    creci: rawBroker?.creci || (rawBroker ? null : BROKER_CONFIG.creci),
    phone: cleanPhone,
    formattedPhone,
    email: rawBroker?.email || null,
    city: rawBroker?.city || 'Criciúma - SC',
    tagline: rawBroker?.tagline || (rawBroker ? null : BROKER_CONFIG.tagline),
    avatarUrl: rawBroker?.avatarUrl || null,
    logoUrl: rawBroker?.logoUrl || null,
  };

  if (offerType === 'TYPOLOGY') {
    const dev = entity.development || {};
    const devImages = (dev.images || []).map((img: any, idx: number) => ({
      id: img.id || `img-${idx}`,
      url: img.url,
      isCover: img.isCover || idx === 0,
    }));

    return {
      publicId: entity.publicId,
      title: `${dev.name || 'Empreendimento'} — ${entity.name || 'Unidade'}`,
      propertyType: entity.propertyType || dev.propertyType || 'Apartamento',
      purpose: 'Venda',
      price: entity.price || 0,
      description: dev.description || entity.notes || null,
      bedrooms: entity.bedrooms || 0,
      suites: entity.suites || 0,
      otherBedrooms: entity.otherBedrooms ?? null,
      bathrooms: entity.bathrooms || 0,
      otherBathrooms: entity.otherBathrooms ?? null,
      parkingSpaces: entity.parkingSpaces || 0,
      privateArea: entity.privateArea ?? null,
      totalArea: entity.totalArea ?? null,
      landArea: null,
      floor: null,

      locationPrecision: precision,
      city: dev.city || 'Criciúma',
      state: dev.state || 'SC',
      neighborhood: precision !== 'HIDDEN' ? dev.neighborhood || null : null,
      address: precision === 'EXACT' ? dev.address || null : null,
      number: precision === 'EXACT' ? dev.number || null : null,
      zipcode: precision === 'EXACT' ? dev.zipcode || null : null,
      latitude: precision === 'EXACT' ? dev.latitude || null : null,
      longitude: precision === 'EXACT' ? dev.longitude || null : null,
      approximateCenter: precision === 'APPROXIMATE'
        ? getTerritorialApproximateCenter(dev.neighborhood, dev.city)
        : null,

      images: devImages.length > 0 ? devImages : [
        {
          id: 'dev-cover-fallback',
          url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80',
          isCover: true,
        },
      ],

      acceptsExchange: entity.acceptsExchange ?? null,
      isRegistered: null,
      hasPool: dev.hasPool ?? null,
      hasGym: dev.hasGym ?? null,
      hasBarbecue: entity.hasBarbecue ?? null,
      hasPartyHall: dev.hasPartyHall ?? null,
      hasElevator: entity.hasElevator ?? dev.hasElevator ?? null,
      isPenthouse: entity.isPenthouse ?? null,
      hasPetSpace: dev.hasPetSpace ?? null,
      furniture: null,
      isCorner: null,
      inGatedCommunity: true,
      inAllotment: null,
      streetPaving: null,
      commercialType: null,

      isDevelopmentOffer: true,
      development: {
        name: dev.name || 'Empreendimento',
        developer: dev.developer || 'Construtora',
        stage: dev.stage || 'Em construção',
        deliveryDate: dev.deliveryDate || null,
        description: dev.description || null,
        hasDirectInstallments: dev.hasDirectInstallments ?? null,
        sharedAmenities: {
          hasPool: dev.hasPool ?? null,
          hasGym: dev.hasGym ?? null,
          hasPartyHall: dev.hasPartyHall ?? null,
          hasPetSpace: dev.hasPetSpace ?? null,
          hasElevator: dev.hasElevator ?? null,
        },
      },

      broker: resolvedBroker,
      publishedAt: entity.publishedAt ? new Date(entity.publishedAt).toISOString() : new Date().toISOString(),
    };
  }

  // Standalone Property
  const propImages = (entity.images || []).map((img: any, idx: number) => ({
    id: img.id || `img-${idx}`,
    url: img.url,
    isCover: img.isCover || idx === 0,
  }));

  return {
    publicId: entity.publicId,
    title: entity.title || 'Imóvel em Destaque',
    propertyType: entity.propertyType || 'Imóvel',
    purpose: entity.purpose || 'Venda',
    price: entity.price || 0,
    description: entity.description || null,
    bedrooms: entity.bedrooms || 0,
    suites: entity.suites || 0,
    otherBedrooms: entity.otherBedrooms ?? null,
    bathrooms: entity.bathrooms || 0,
    otherBathrooms: entity.otherBathrooms ?? null,
    parkingSpaces: entity.parkingSpaces || 0,
    privateArea: entity.privateArea ?? null,
    totalArea: entity.totalArea ?? null,
    landArea: entity.landArea ?? null,
    floor: entity.floor ?? null,

    locationPrecision: precision,
    city: entity.city || 'Criciúma',
    state: entity.state || 'SC',
    neighborhood: precision !== 'HIDDEN' ? entity.neighborhood || null : null,
    address: precision === 'EXACT' ? entity.address || null : null,
    number: precision === 'EXACT' ? entity.number || null : null,
    zipcode: precision === 'EXACT' ? entity.zipcode || null : null,
    latitude: precision === 'EXACT' ? entity.latitude || null : null,
    longitude: precision === 'EXACT' ? entity.longitude || null : null,
    approximateCenter: precision === 'APPROXIMATE'
      ? getTerritorialApproximateCenter(entity.neighborhood, entity.city)
      : null,

    images: propImages.length > 0 ? propImages : [
      {
        id: 'prop-cover-fallback',
        url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&auto=format&fit=crop&q=80',
        isCover: true,
      },
    ],

    acceptsExchange: entity.acceptsExchange ?? null,
    isRegistered: entity.isRegistered ?? null,
    hasPool: entity.hasPool ?? null,
    hasGym: entity.hasGym ?? null,
    hasBarbecue: entity.hasBarbecue ?? null,
    hasPartyHall: entity.hasPartyHall ?? null,
    hasElevator: entity.hasElevator ?? null,
    isPenthouse: entity.isPenthouse ?? null,
    hasPetSpace: entity.hasPetSpace ?? null,
    furniture: entity.furniture ?? null,
    isCorner: entity.isCorner ?? null,
    inGatedCommunity: entity.inGatedCommunity ?? null,
    inAllotment: entity.inAllotment ?? null,
    streetPaving: entity.streetPaving ?? null,
    commercialType: entity.commercialType ?? null,

    isDevelopmentOffer: false,
    broker: resolvedBroker,
    publishedAt: entity.publishedAt ? new Date(entity.publishedAt).toISOString() : new Date().toISOString(),
  };
}
