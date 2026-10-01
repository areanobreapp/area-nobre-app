export type OfferType = 'PROPERTY' | 'TYPOLOGY';

export type TriStatePreference = 'INDIFERENTE' | 'DESEJAVEL' | 'NECESSARIO';

export interface NormalizedOffer {
  id: string; // propertyId ou typologyId
  offerType: OfferType;
  propertyId?: string;
  developmentId?: string;
  typologyId?: string;
  title: string;
  propertyType: string; // Apartamento, Casa, Terreno, Comercial, etc.
  purpose: string;      // Venda, Locação
  status: string;       // Disponível, Reservado, etc.
  price: number;
  bedrooms: number;     // Total = suites + otherBedrooms
  suites: number;
  otherBedrooms: number;
  bathrooms: number;    // Total = suites + otherBathrooms
  otherBathrooms: number;
  parkingSpaces: number;
  privateArea: number | null; // Área útil / privativa
  totalArea: number | null;   // Área total
  landArea: number | null;    // Área do terreno documental
  city: string | null;
  neighborhood: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  travelDurationSeconds?: number | null; // Tempo em segundos pela rede viária (Fase 5.2.1)
  travelDistanceMeters?: number | null;  // Distância em metros pela rede viária (Fase 5.2.1)
  imageUrl: string | null;
  stage?: string | null;      // "Pronto" ou "Em construção", "Lançamento", etc.
  developer?: string | null;  // Nome da construtora se for empreendimento
  developmentName?: string | null;
  active: boolean;

  // Negociação & Matrícula
  acceptsExchange: boolean | null;
  exchangeNotes: string | null;
  registryNumber: string | null;

  // Casa
  isRegistered: boolean | null; // Averbada?

  // Lazer & Comodidades (Unidade ou compartilhada do Empreendimento)
  hasPool: boolean | null;
  hasGym: boolean | null;
  hasBarbecue: boolean | null;
  furniture: string | null; // "Completa" | "Semi" | "Não" | null

  // Apartamento / Empreendimento
  hasPartyHall: boolean | null;
  hasElevator: boolean | null;
  isPenthouse: boolean | null;
  hasPetSpace: boolean | null;
  floor: number | null;

  // Terreno
  isCorner: boolean | null;
  inGatedCommunity: boolean | null;
  inAllotment: boolean | null;
  streetPaving: string | null; // Asfalto | Lajota | Paralelepípedo | Terra

  // Comercial
  commercialType: string | null; // Térrea | Aérea

  // Empreendimento
  hasDirectInstallments: boolean | null;
}

export interface SearchCriteria {
  id: string;
  userId: string;
  clientId: string;
  clientName?: string;
  clientPhone?: string | null;
  name: string;
  purpose: string;
  propertyTypes: string[];   // parsed array
  cities: string[];          // parsed array
  neighborhoods: string[];   // parsed array
  minPrice: number | null;
  maxPrice: number;
  minBedrooms: number;
  minSuites: number;
  minOtherBedrooms?: number | null;
  minOtherBathrooms?: number | null;
  minParkingSpaces: number;
  minArea: number | null;     // Área útil mínima
  minLandArea?: number | null; // Área de terreno mínima
  referenceAddress?: string | null;
  referenceLatitude?: number | null;
  referenceLongitude?: number | null;
  maxRadiusKm?: number | null;

  // Busca geográfica por Ponto + Raio (Fase 5.2) e Tempo de Carro (Fase 5.2.1)
  locationStrategy?: 'NEIGHBORHOODS' | 'RADIUS' | 'TRAVEL_TIME' | string | null;
  searchLatitude?: number | null;
  searchLongitude?: number | null;
  searchRadiusMeters?: number | null;
  maxTravelTimeMinutes?: number | null;
  travelMode?: string | null; // 'DRIVING'

  active: boolean;

  // Preferências tri-state (INDIFERENTE | DESEJAVEL | NECESSARIO)
  acceptsExchangePref?: string | null;
  isRegisteredPref?: string | null;
  poolPref?: string | null;
  gymPref?: string | null;
  barbecuePref?: string | null;
  partyHallPref?: string | null;
  elevatorPref?: string | null;
  petSpacePref?: string | null;
  penthousePref?: string | null;
  cornerPref?: string | null;
  gatedCommunityPref?: string | null;
  allotmentPref?: string | null;

  // Preferências de opções específicas
  furniturePref?: string | null;      // INDIFERENTE | COMPLETA | SEMI | SEM_MOBILIA
  streetPavingPref?: string | null;   // INDIFERENTE | ASFALTO | LAJOTA | PARALELEPIPEDO | TERRA
  commercialTypePref?: string | null; // INDIFERENTE | TERREA | AEREA
  customPreferences?: any;
}

export interface MatchExplanationItem {
  category:
    | 'purpose'
    | 'type'
    | 'location'
    | 'price'
    | 'bedrooms'
    | 'suites'
    | 'parking'
    | 'area'
    | 'amenity'
    | 'structure'
    | 'negotiation'
    | 'other';
  status: 'positive' | 'warning' | 'negative';
  title: string;
  detail: string;
  pointsAwarded: number;
  maxPoints: number;
}

export interface MatchResult {
  eligible: boolean;
  score: number; // 0 a 100
  reasons: string[]; // motivos caso inelegível
  explanation: MatchExplanationItem[];
}
