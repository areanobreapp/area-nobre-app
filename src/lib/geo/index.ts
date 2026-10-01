import { GeoProvider, GeocodeResult, ReverseGeocodeResult, AddressComponents, CepLookupResult } from './types';
import { GeoBaseProvider } from './geobase-provider';
import { FallbackGeoProvider } from './fallback-provider';
import { geoLogger } from './logger';

export * from './types';
export * from './logger';
export * from './routing';
export { GeoBaseProvider } from './geobase-provider';
export { FallbackGeoProvider } from './fallback-provider';

/**
 * Provedor Híbrido Resiliente:
 * Prioriza GeoBase Mapas com credencial oficial; caso a credencial esteja ausente,
 * expirada ou o serviço temporariamente indisponível, utiliza o Fallback de forma
 * segura e transparente, sem derrubar a aplicação.
 */
export class ResilientGeoProvider implements GeoProvider {
  public readonly name = 'GeoProvider Resiliente (GeoBase / Fallback)';
  private geobase: GeoBaseProvider;
  private fallback: FallbackGeoProvider;

  constructor(geobase?: GeoBaseProvider, fallback?: FallbackGeoProvider) {
    this.geobase = geobase || new GeoBaseProvider();
    this.fallback = fallback || new FallbackGeoProvider();
  }

  public async forwardGeocode(
    address: string,
    options?: { limit?: number; components?: AddressComponents }
  ): Promise<GeocodeResult[]> {
    if (this.geobase.hasApiKey()) {
      try {
        const results = await this.geobase.forwardGeocode(address, options);
        if (results && results.length > 0) {
          return results;
        }
      } catch (err: any) {
        console.warn(`[GeoProvider] GeoBase forward falhou (${err.message}). Acionando Fallback.`);
      }
    }

    // Fallback gracioso com candidatos progressivos
    return this.fallback.forwardGeocode(address, options);
  }

  public async reverseGeocode(
    lat: number,
    lng: number
  ): Promise<ReverseGeocodeResult | null> {
    if (this.geobase.hasApiKey()) {
      try {
        const result = await this.geobase.reverseGeocode(lat, lng);
        if (result) return result;
      } catch (err: any) {
        console.warn(`[GeoProvider] GeoBase reverse falhou (${err.message}). Acionando Fallback.`);
      }
    }

    return this.fallback.reverseGeocode(lat, lng);
  }

  public async searchLocation(
    query: string,
    options?: { limit?: number }
  ): Promise<GeocodeResult[]> {
    return this.forwardGeocode(query, options);
  }

  public async lookupCep(cep: string): Promise<CepLookupResult | null> {
    if (this.geobase.hasApiKey()) {
      try {
        const result = await this.geobase.lookupCep(cep);
        if (result) return result;
      } catch (err: any) {
        console.warn(`[GeoProvider] GeoBase lookupCep falhou (${err.message}). Acionando Fallback.`);
      }
    }

    return this.fallback.lookupCep(cep);
  }
}

let instance: GeoProvider | null = null;

export function getGeoProvider(): GeoProvider {
  if (!instance) {
    instance = new ResilientGeoProvider();
  }
  return instance;
}

/**
 * Cálculo de distância em linha reta na Terra usando a fórmula de Haversine.
 * Determinístico, sem nenhuma chamada externa à rede.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
