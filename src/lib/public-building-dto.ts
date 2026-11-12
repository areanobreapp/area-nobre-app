/**
 * ÁREA NOBRE — ETAPA J.2.E.2
 * DTO Público Seguro da Página Compartilhada do Edifício (/edificios/[id])
 * 
 * Define os tipos estritos e os formatadores para consumo público seguro,
 * garantindo:
 * 1. Zero vazamento de notas internas, dados sensíveis de matrícula ou dados administrativos.
 * 2. Unicidade estrita de unidades físicas (Edifício > Torre > Andar > Unidade > Corretores).
 * 3. Preço canônico compartilhado (PhysicalProperty.sharedPrice).
 * 4. Neutralidade e equidade entre corretores via ordenação periódica determinística.
 */

export interface PublicBuildingBrokerDTO {
  id: string;
  name: string;
  commercialName: string;
  phone: string | null;
  creci: string | null;
  avatarUrl: string | null;
  logoUrl: string | null;
  tagline: string | null;
  city: string | null;
}

export interface PublicBuildingListingImageDTO {
  id: string;
  url: string;
  isCover?: boolean;
}

export interface PublicBuildingListingDTO {
  id: string;
  title: string;
  price: number;
  broker: PublicBuildingBrokerDTO;
  images: PublicBuildingListingImageDTO[];
  isMine?: boolean;
}

export interface PublicBuildingUnitDTO {
  physicalPropertyId: string;
  unitId: string | null;
  unitNumber: string | null;
  tower: string | null;
  floor: number | null;
  floorLabel: string;
  title: string;
  price: number; // Preço canônico compartilhado (sharedPrice)
  bedrooms: number;
  suites: number;
  bathrooms: number;
  parkingSpaces: number;
  privateArea: number | null;
  totalArea: number | null;
  listingsCount: number;
  listings: PublicBuildingListingDTO[];
  hasMyListing?: boolean;
}

export interface PublicBuildingFloorDTO {
  floor: number | null;
  tower: string | null;
  floorLabel: string;
  units: PublicBuildingUnitDTO[];
}

export interface PublicBuildingAmenitiesDTO {
  hasPool: boolean | null;
  hasGym: boolean | null;
  hasPartyHall: boolean | null;
  hasElevator: boolean | null;
  hasPetSpace: boolean | null;
  hasBarbecue: boolean | null;
}

export interface PublicBuildingDTO {
  id: string;
  name: string;
  address: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  zipcode: string | null;
  latitude: number | null;
  longitude: number | null;
  hasCoordinates: boolean;
  geoValidationStatus: string;
  coverImageUrl: string | null;
  coverImageValidationStatus: string;
  boundary: string | null; // GeoJSON string do terreno coletivo
  boundaryArea: number | null;
  boundaryValidationStatus: string;
  totalFloors: number | null;
  unitsPerFloor: number | null;
  towers: string[] | null;
  amenities: PublicBuildingAmenitiesDTO;
  totalUnitsCount: number; // Unidades físicas únicas com anúncios disponíveis
  totalListingsCount: number; // Total de anúncios ativos de todos os corretores
  minPrice: number | null; // Menor valor de entrada entre as unidades disponíveis
  floors: PublicBuildingFloorDTO[];
  hasAvailableUnits: boolean;
}

/**
 * Retorna a chave de data estável (YYYY-MM-DD em UTC) para rotação diária de neutralidade.
 */
export function getDailyRotationKey(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Função de hash determinística FNV-1a para desempate neutro de corretores.
 * Combina a chave diária, o ID da unidade e o ID do anúncio.
 * Garante equidade de exposição diária sem favorecer o primeiro cadastrado.
 */
export function getDeterministicBrokerScore(
  dateKey: string,
  unitKey: string,
  listingId: string
): number {
  const seed = `${dateKey}:${unitKey}:${listingId}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

