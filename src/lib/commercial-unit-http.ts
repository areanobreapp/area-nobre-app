import type {
  ListCommercialUnitsFilters,
  CommercialUnitStatus,
  CommercialUnitType,
} from './commercial-unit-service';

function parseOptionalNumber(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null;
  const trimmed = raw.trim();
  const normalized =
    trimmed.includes(',') && trimmed.includes('.')
      ? trimmed.replace(/\./g, '').replace(',', '.')
      : trimmed.replace(',', '.');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function parseOptionalBoolean(raw: string | null): boolean | null {
  if (raw === null || raw.trim() === '') return null;
  const norm = raw.trim().toLowerCase();
  if (norm === 'true' || norm === '1') return true;
  if (norm === 'false' || norm === '0') return false;
  return null;
}

/**
 * Extrai e normaliza os filtros de consulta de unidades comerciais a partir de URLSearchParams.
 */
export function parseUnitListSearchParams(
  developmentId: string,
  searchParams: URLSearchParams
): ListCommercialUnitsFilters {
  const rawStatus =
    searchParams.get('commercialStatus') || searchParams.get('status') || null;
  const rawType = searchParams.get('unitType') || searchParams.get('type') || null;

  return {
    developmentId,
    blockId: searchParams.get('blockId') || null,
    typologyId: searchParams.get('typologyId') || null,
    commercialStatus: rawStatus
      ? (rawStatus.trim().toUpperCase() as CommercialUnitStatus | 'ALL')
      : null,
    unitType: rawType ? (rawType.trim().toUpperCase() as CommercialUnitType) : null,
    floor: parseOptionalNumber(searchParams.get('floor')),
    minPrice: parseOptionalNumber(searchParams.get('minPrice')),
    maxPrice: parseOptionalNumber(searchParams.get('maxPrice')),
    minArea: parseOptionalNumber(searchParams.get('minArea')),
    maxArea: parseOptionalNumber(searchParams.get('maxArea')),
    areaType: searchParams.get('areaType') || null,
    minBedrooms: parseOptionalNumber(searchParams.get('minBedrooms')),
    minParkingSpaces: parseOptionalNumber(searchParams.get('minParkingSpaces')),
    acceptsExchange: parseOptionalBoolean(searchParams.get('acceptsExchange')),
    search: searchParams.get('search') || null,
    page: parseOptionalNumber(searchParams.get('page')) || 1,
    limit: parseOptionalNumber(searchParams.get('limit')) || 25,
    sortBy: searchParams.get('sortBy') || 'floor',
    sortOrder: searchParams.get('sortOrder') || 'asc',
  };
}

