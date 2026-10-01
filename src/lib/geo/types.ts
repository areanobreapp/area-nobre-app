/**
 * Definições e contratos da camada de Geolocalização da Área Nobre (Fase 4).
 * Separação estrita entre UI/Cartografia e Serviços de Geolocalização.
 */

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  placeId?: string;
  source: 'geobase' | 'fallback';
  confidence?: number;
  precision?: 'precise' | 'approximate';
  precisionLevel?: 'rooftop' | 'street' | 'neighborhood' | 'postal_code' | 'city';
}

export interface ReverseGeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  source: 'geobase' | 'fallback';
}

export interface AddressComponents {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

export interface CepLookupResult {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  ibge?: string;
  latitude?: number | null;
  longitude?: number | null;
  source: 'geobase' | 'viacep';
}

export interface GeoLocationSearchQuery {
  query: string;
  limit?: number;
}

export interface GeoProvider {
  name: string;
  forwardGeocode(
    address: string,
    options?: { limit?: number; components?: AddressComponents }
  ): Promise<GeocodeResult[]>;
  reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null>;
  searchLocation(query: string, options?: { limit?: number }): Promise<GeocodeResult[]>;
  lookupCep?(cep: string): Promise<CepLookupResult | null>;
}

export interface GeoLogEntry {
  id: string;
  provider: string;
  operation: 'forwardGeocode' | 'reverseGeocode' | 'searchLocation' | 'cepLookup';
  timestamp: string;
  durationMs: number;
  success: boolean;
  querySnippet: string; // Sanitizado (sem dados pessoais ou chaves)
  error?: string;
}

export interface GeoConsumptionSummary {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  byProvider: Record<string, number>;
  byOperation: Record<string, number>;
  averageDurationMs: number;
  recentLogs: GeoLogEntry[];
}
