import { NormalizedOffer, SearchCriteria } from './types';

export function normalizeProperty(property: any): NormalizedOffer {
  const coverImage = property.images?.find((img: any) => img.isCover) || property.images?.[0];

  const suites = Number(property.suites) || 0;
  const otherBedrooms =
    property.otherBedrooms != null
      ? Number(property.otherBedrooms)
      : (property.bedrooms != null ? Math.max(0, Number(property.bedrooms) - suites) : 0);
  const bedrooms =
    property.bedrooms != null
      ? Number(property.bedrooms)
      : suites + otherBedrooms;

  const otherBathrooms =
    property.otherBathrooms != null
      ? Number(property.otherBathrooms)
      : (property.bathrooms != null ? Math.max(0, Number(property.bathrooms) - suites) : 0);
  const bathrooms =
    property.bathrooms != null
      ? Number(property.bathrooms)
      : suites + otherBathrooms;

  return {
    id: property.id,
    offerType: 'PROPERTY',
    propertyId: property.id,
    title: property.title || `${property.propertyType} no ${property.neighborhood || property.city || 'Bairro'}`,
    propertyType: property.propertyType,
    purpose: property.purpose || 'Venda',
    status: property.status,
    price: Number(property.price) || 0,
    bedrooms,
    suites,
    otherBedrooms,
    bathrooms,
    otherBathrooms,
    parkingSpaces: Number(property.parkingSpaces) || 0,
    privateArea: property.privateArea ? Number(property.privateArea) : null,
    totalArea: property.totalArea ? Number(property.totalArea) : null,
    landArea: property.landArea ? Number(property.landArea) : null,
    city: property.city?.trim() || null,
    neighborhood: property.neighborhood?.trim() || null,
    address: property.address?.trim() || null,
    latitude: property.latitude ? Number(property.latitude) : null,
    longitude: property.longitude ? Number(property.longitude) : null,
    travelDurationSeconds: property.travelDurationSeconds != null ? Number(property.travelDurationSeconds) : null,
    travelDistanceMeters: property.travelDistanceMeters != null ? Number(property.travelDistanceMeters) : null,
    imageUrl: coverImage?.url || null,
    stage: 'Pronto',
    developer: null,
    developmentName: null,
    active: property.active !== false && property.status !== 'Inativo' && property.status !== 'Vendido/Alugado',

    // Negociação & Matrícula
    acceptsExchange: property.acceptsExchange ?? null,
    exchangeNotes: property.exchangeNotes || null,
    registryNumber: property.registryNumber || null,

    // Casa
    isRegistered: property.isRegistered ?? null,

    // Lazer / Comodidades
    hasPool: property.hasPool ?? null,
    hasGym: property.hasGym ?? null,
    hasBarbecue: property.hasBarbecue ?? null,
    furniture: property.furniture || null,

    // Apartamento
    hasPartyHall: property.hasPartyHall ?? null,
    hasElevator: property.hasElevator ?? null,
    isPenthouse: property.isPenthouse ?? null,
    hasPetSpace: property.hasPetSpace ?? null,
    floor: property.floor != null ? Number(property.floor) : null,

    // Terreno
    isCorner: property.isCorner ?? null,
    inGatedCommunity: property.inGatedCommunity ?? null,
    inAllotment: property.inAllotment ?? null,
    streetPaving: property.streetPaving || null,

    // Comercial
    commercialType: property.commercialType || null,

    // Empreendimento
    hasDirectInstallments: null,
  };
}

export function normalizeTypology(typology: any, development: any): NormalizedOffer {
  const coverImage = development.images?.find((img: any) => img.isCover) || development.images?.[0];

  const devActive = development.active !== false && development.status !== 'Inativo';
  const typoActive = typology.active !== false && typology.status !== 'Esgotada' && typology.status !== 'Inativo';

  const suites = Number(typology.suites) || 0;
  const otherBedrooms =
    typology.otherBedrooms != null
      ? Number(typology.otherBedrooms)
      : (typology.bedrooms != null ? Math.max(0, Number(typology.bedrooms) - suites) : 0);
  const bedrooms =
    typology.bedrooms != null
      ? Number(typology.bedrooms)
      : suites + otherBedrooms;

  const otherBathrooms =
    typology.otherBathrooms != null
      ? Number(typology.otherBathrooms)
      : (typology.bathrooms != null ? Math.max(0, Number(typology.bathrooms) - suites) : 0);
  const bathrooms =
    typology.bathrooms != null
      ? Number(typology.bathrooms)
      : suites + otherBathrooms;

  return {
    id: typology.id,
    offerType: 'TYPOLOGY',
    typologyId: typology.id,
    developmentId: development.id,
    title: `${development.name} — ${typology.name}`,
    developmentName: development.name,
    developer: development.developer,
    propertyType: typology.propertyType || 'Apartamento',
    purpose: 'Venda', // Empreendimentos em lançamento/construção são comercializados para venda
    status: typology.status,
    price: Number(typology.price) || 0,
    bedrooms,
    suites,
    otherBedrooms,
    bathrooms,
    otherBathrooms,
    parkingSpaces: Number(typology.parkingSpaces) || 0,
    privateArea: typology.privateArea ? Number(typology.privateArea) : null,
    totalArea: typology.totalArea ? Number(typology.totalArea) : null,
    landArea: null,
    city: development.city?.trim() || null,
    neighborhood: development.neighborhood?.trim() || null,
    address: development.address?.trim() || null,
    latitude: development.latitude ? Number(development.latitude) : null,
    longitude: development.longitude ? Number(development.longitude) : null,
    travelDurationSeconds: (typology as any).travelDurationSeconds != null ? Number((typology as any).travelDurationSeconds) : null,
    travelDistanceMeters: (typology as any).travelDistanceMeters != null ? Number((typology as any).travelDistanceMeters) : null,
    imageUrl: coverImage?.url || null,
    stage: development.stage || 'Em construção',
    active: devActive && typoActive,

    // Tipologia específica
    acceptsExchange: typology.acceptsExchange ?? null,
    exchangeNotes: typology.exchangeNotes || null,
    registryNumber: null,
    isRegistered: null,
    hasBarbecue: typology.hasBarbecue ?? null,
    isPenthouse: typology.isPenthouse ?? null,
    furniture: null,
    floor: null,
    isCorner: null,
    inGatedCommunity: null,
    inAllotment: null,
    streetPaving: null,
    commercialType: null,

    // Herança de comodidades do condomínio/empreendimento
    hasPool: development.hasPool ?? null,
    hasGym: development.hasGym ?? null,
    hasPartyHall: development.hasPartyHall ?? null,
    hasPetSpace: development.hasPetSpace ?? null,
    hasElevator: typology.hasElevator ?? development.hasElevator ?? null,
    hasDirectInstallments: development.hasDirectInstallments ?? null,
  };
}

export function parseSearchCriteria(search: any): SearchCriteria {
  const parseJsonArray = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [String(parsed)];
    } catch {
      return String(val)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  };

  return {
    id: search.id,
    userId: search.userId,
    clientId: search.clientId,
    clientName: search.client?.name,
    clientPhone: search.client?.phone,
    name: search.name,
    purpose: search.purpose || 'Venda',
    propertyTypes: parseJsonArray(search.propertyTypes),
    cities: parseJsonArray(search.cities),
    neighborhoods: parseJsonArray(search.neighborhoods),
    minPrice: search.minPrice ? Number(search.minPrice) : null,
    maxPrice: Number(search.maxPrice) || 0,
    minBedrooms: Number(search.minBedrooms) || 0,
    minSuites: Number(search.minSuites) || 0,
    minOtherBedrooms: search.minOtherBedrooms != null ? Number(search.minOtherBedrooms) : null,
    minOtherBathrooms: search.minOtherBathrooms != null ? Number(search.minOtherBathrooms) : null,
    minParkingSpaces: Number(search.minParkingSpaces) || 0,
    minArea: search.minArea ? Number(search.minArea) : null,
    minLandArea: search.minLandArea ? Number(search.minLandArea) : null,
    referenceAddress: search.referenceAddress || null,
    referenceLatitude: search.referenceLatitude ? Number(search.referenceLatitude) : null,
    referenceLongitude: search.referenceLongitude ? Number(search.referenceLongitude) : null,
    maxRadiusKm: search.maxRadiusKm ? Number(search.maxRadiusKm) : null,

    // Busca geográfica por Ponto + Raio (Fase 5.2) e Tempo de Carro (Fase 5.2.1)
    locationStrategy: search.locationStrategy || (search.maxTravelTimeMinutes ? 'TRAVEL_TIME' : (search.searchRadiusMeters || search.maxRadiusKm ? 'RADIUS' : 'NEIGHBORHOODS')),
    searchLatitude: search.searchLatitude != null
      ? Number(search.searchLatitude)
      : (search.referenceLatitude != null ? Number(search.referenceLatitude) : null),
    searchLongitude: search.searchLongitude != null
      ? Number(search.searchLongitude)
      : (search.referenceLongitude != null ? Number(search.referenceLongitude) : null),
    searchRadiusMeters: search.searchRadiusMeters != null
      ? Number(search.searchRadiusMeters)
      : (search.maxRadiusKm != null ? Number(search.maxRadiusKm) * 1000 : null),
    maxTravelTimeMinutes: search.maxTravelTimeMinutes != null ? Number(search.maxTravelTimeMinutes) : null,
    travelMode: search.travelMode || 'DRIVING',

    active: search.active !== undefined ? Boolean(search.active) : true,

    // Preferências tri-state (aceita tanto wants* do SearchForm/DB quanto *Pref da interface interna)
    acceptsExchangePref: search.acceptsExchangePref || (search.acceptsExchange ? 'DESEJAVEL' : 'INDIFERENTE'),
    isRegisteredPref: search.isRegisteredPref || (search.requiresRegistered ? 'NECESSARIO' : 'INDIFERENTE'),
    poolPref: search.poolPref || search.wantsPool || 'INDIFERENTE',
    gymPref: search.gymPref || search.wantsGym || 'INDIFERENTE',
    barbecuePref: search.barbecuePref || search.wantsBarbecue || 'INDIFERENTE',
    partyHallPref: search.partyHallPref || search.wantsPartyHall || 'INDIFERENTE',
    elevatorPref: search.elevatorPref || search.wantsElevator || 'INDIFERENTE',
    petSpacePref: search.petSpacePref || search.wantsPetSpace || 'INDIFERENTE',
    penthousePref: search.penthousePref || search.wantsPenthouse || 'INDIFERENTE',
    cornerPref: search.cornerPref || search.wantsCorner || 'INDIFERENTE',
    gatedCommunityPref: search.gatedCommunityPref || search.wantsGatedCommunity || 'INDIFERENTE',
    allotmentPref: search.allotmentPref || search.wantsAllotment || 'INDIFERENTE',

    // Preferências de opções específicas
    furniturePref: search.furniturePref || search.preferredFurniture || 'INDIFERENTE',
    streetPavingPref: search.streetPavingPref || search.preferredStreetPaving || 'INDIFERENTE',
    commercialTypePref: search.commercialTypePref || search.preferredCommercialType || 'INDIFERENTE',
    customPreferences: search.customPreferences || null,
  };
}
