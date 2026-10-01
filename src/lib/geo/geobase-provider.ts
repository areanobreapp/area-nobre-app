import { GeoProvider, GeocodeResult, ReverseGeocodeResult, AddressComponents, CepLookupResult } from './types';
import { geoLogger } from './logger';

export class GeoBaseProvider implements GeoProvider {
  public readonly name = 'GeoBase Mapas';
  private readonly baseUrl: string;
  private readonly apiKey: string | null;

  constructor(
    configOrApiKey?: string | { apiKey?: string; baseUrl?: string },
    baseUrl = 'https://api.geobasemapas.com.br/api'
  ) {
    if (typeof configOrApiKey === 'object' && configOrApiKey !== null) {
      this.apiKey = configOrApiKey.apiKey !== undefined ? configOrApiKey.apiKey : (process.env.GEOBASE_API_KEY || null);
      this.baseUrl = (configOrApiKey.baseUrl || baseUrl).replace(/\/$/, '');
    } else {
      this.apiKey = configOrApiKey !== undefined ? configOrApiKey : (process.env.GEOBASE_API_KEY || null);
      this.baseUrl = baseUrl.replace(/\/$/, '');
    }
  }

  public hasApiKey(): boolean {
    return Boolean(this.apiKey && typeof this.apiKey === 'string' && this.apiKey.trim().length > 0);
  }

  /**
   * Forward Geocoding confirmado na documentação oficial:
   * GET https://api.geobasemapas.com.br/api/forward?q={address}&limit={limit}
   * Headers: Authorization: Bearer {token}
   */
  public async forwardGeocode(
    address: string,
    options?: { limit?: number; components?: AddressComponents }
  ): Promise<GeocodeResult[]> {
    const startTime = performance.now();
    const limit = options?.limit || 5;

    if (!address || !address.trim()) {
      return [];
    }

    if (!this.hasApiKey()) {
      geoLogger.logCall({
        provider: this.name,
        operation: 'forwardGeocode',
        durationMs: 0,
        success: false,
        querySnippet: address,
        error: 'GEOBASE_API_KEY ausente nas variáveis de ambiente (.env).',
      });
      throw new Error('GEOBASE_API_KEY_MISSING');
    }

    const url = `${this.baseUrl}/forward?q=${encodeURIComponent(address.trim())}&limit=${limit}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
        },
      });

      const durationMs = performance.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        geoLogger.logCall({
          provider: this.name,
          operation: 'forwardGeocode',
          durationMs,
          success: false,
          querySnippet: address,
          error: `HTTP ${response.status}: ${errorText.substring(0, 100)}`,
        });

        if (response.status === 401) {
          throw new Error('GEOBASE_UNAUTHORIZED: Token de API inválido ou expirado.');
        }
        if (response.status === 403) {
          throw new Error('GEOBASE_PLAN_RESTRICTED: Serviço forward restrito no plano atual da GeoBase (Free).');
        }
        if (response.status === 404) {
          return [];
        }
        throw new Error(`GEOBASE_HTTP_${response.status}: Falha na consulta de forward geocoding.`);
      }

      const json = await response.json();
      const results = this.parseForwardResponse(json);

      geoLogger.logCall({
        provider: this.name,
        operation: 'forwardGeocode',
        durationMs,
        success: true,
        querySnippet: address,
      });

      return results;
    } catch (err: any) {
      if (err.message?.startsWith('GEOBASE_')) {
        throw err;
      }
      const durationMs = performance.now() - startTime;
      geoLogger.logCall({
        provider: this.name,
        operation: 'forwardGeocode',
        durationMs,
        success: false,
        querySnippet: address,
        error: err.message || 'Erro de rede ou timeout.',
      });
      throw new Error(`GEOBASE_NETWORK_ERROR: ${err.message}`);
    }
  }

  /**
   * Reverse Geocoding confirmado na documentação oficial:
   * GET https://api.geobasemapas.com.br/api/reverse?lat={lat}&lon={lon}
   * Fallback público de teste: /api/public/demo/reverse
   */
  public async reverseGeocode(
    lat: number,
    lng: number
  ): Promise<ReverseGeocodeResult | null> {
    const startTime = performance.now();
    const querySnippet = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    // Se tiver chave usa endpoint oficial autenticado; caso contrário tenta endpoint demo público
    const endpoint = this.hasApiKey()
      ? `${this.baseUrl}/reverse?lat=${lat}&lon=${lng}`
      : `${this.baseUrl}/public/demo/reverse?lat=${lat}&lon=${lng}`;

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.hasApiKey()) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
      });

      const durationMs = performance.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        geoLogger.logCall({
          provider: this.name,
          operation: 'reverseGeocode',
          durationMs,
          success: false,
          querySnippet,
          error: `HTTP ${response.status}: ${errorText.substring(0, 100)}`,
        });

        if (response.status === 401) {
          throw new Error('GEOBASE_UNAUTHORIZED');
        }
        return null;
      }

      const json = await response.json();
      const result = this.parseReverseResponse(json, lat, lng);

      geoLogger.logCall({
        provider: this.name,
        operation: 'reverseGeocode',
        durationMs,
        success: Boolean(result),
        querySnippet,
      });

      return result;
    } catch (err: any) {
      const durationMs = performance.now() - startTime;
      geoLogger.logCall({
        provider: this.name,
        operation: 'reverseGeocode',
        durationMs,
        success: false,
        querySnippet,
        error: err.message,
      });
      return null;
    }
  }

  public async searchLocation(
    query: string,
    options?: { limit?: number }
  ): Promise<GeocodeResult[]> {
    return this.forwardGeocode(query, options);
  }

  // --- Normalizadores de Schema OpenAPI ---
  private parseForwardResponse(json: any): GeocodeResult[] {
    const results: GeocodeResult[] = [];
    const items = Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json?.results)
      ? json.results
      : [];

    for (const item of items) {
      // 1. Formato OpenAPI GeoBase padrão (ForwardResource)
      if (item.lat !== undefined && (item.lon !== undefined || item.lng !== undefined)) {
        const lat = Number(item.lat);
        const lng = Number(item.lon ?? item.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
          const addrObj = typeof item.address === 'object' && item.address !== null ? item.address : {};
          const hasNumber = Boolean(addrObj.house_number);
          results.push({
            lat,
            lng,
            formattedAddress: item.formatted_address || item.display_name || String(item.address || ''),
            street: addrObj.road || addrObj.street || undefined,
            number: addrObj.house_number || undefined,
            neighborhood: addrObj.suburb || addrObj.neighbourhood || addrObj.district || undefined,
            city: addrObj.city || addrObj.town || addrObj.municipality || undefined,
            state: addrObj.state || addrObj['ISO3166-2-lvl4'] || undefined,
            postalCode: addrObj.postcode || undefined,
            placeId: item.place_id ? String(item.place_id) : undefined,
            source: 'geobase',
            confidence: item.importance ? Number(item.importance) : (hasNumber ? 1.0 : 0.85),
            precision: hasNumber ? 'precise' : 'approximate',
            precisionLevel: hasNumber ? 'rooftop' : (addrObj.road ? 'street' : 'neighborhood'),
          });
          continue;
        }
      }

      // 2. Formato Google-compatible view=standard
      if (item.geometry?.location) {
        const lat = Number(item.geometry.location.lat);
        const lng = Number(item.geometry.location.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
          const isRooftop = item.geometry.location_type === 'ROOFTOP';
          results.push({
            lat,
            lng,
            formattedAddress: item.formatted_address || '',
            placeId: item.place_id ? String(item.place_id) : undefined,
            source: 'geobase',
            confidence: isRooftop ? 1.0 : 0.85,
            precision: isRooftop ? 'precise' : 'approximate',
            precisionLevel: isRooftop ? 'rooftop' : 'street',
          });
        }
      }
    }

    return results;
  }

  private parseReverseResponse(json: any, fallbackLat: number, fallbackLng: number): ReverseGeocodeResult | null {
    const rawData = json?.data || json?.results?.[0];
    if (!rawData) return null;

    const lat = Number(rawData.lat ?? rawData.geometry?.location?.lat ?? fallbackLat);
    const lng = Number(rawData.lon ?? rawData.lng ?? rawData.geometry?.location?.lng ?? fallbackLng);
    const addrObj = typeof rawData.address === 'object' && rawData.address !== null ? rawData.address : {};

    return {
      lat,
      lng,
      formattedAddress: rawData.display_name || rawData.formatted_address || '',
      street: addrObj.road || addrObj.street || undefined,
      neighborhood: addrObj.suburb || addrObj.neighbourhood || addrObj.district || undefined,
      city: addrObj.city || addrObj.town || addrObj.municipality || undefined,
      state: addrObj.state || undefined,
      postalCode: addrObj.postcode || undefined,
      source: 'geobase',
    };
  }

  public async lookupCep(cep: string): Promise<CepLookupResult | null> {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return null;

    if (!this.hasApiKey()) return null;

    const startTime = performance.now();
    try {
      const url = `${this.baseUrl}/cep/${cleanCep}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
        },
      });

      const durationMs = performance.now() - startTime;

      if (!response.ok) {
        geoLogger.logCall({
          provider: this.name,
          operation: 'cepLookup',
          durationMs,
          success: false,
          querySnippet: cleanCep,
          error: `HTTP ${response.status}`,
        });
        return null;
      }

      const json = await response.json();
      const data = json?.data;
      if (!data) return null;

      geoLogger.logCall({
        provider: this.name,
        operation: 'cepLookup',
        durationMs,
        success: true,
        querySnippet: cleanCep,
      });

      return {
        cep: data.cep || cleanCep,
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
        ibge: data.ibge || undefined,
        latitude: data.latitude ? Number(data.latitude) : null,
        longitude: data.longitude ? Number(data.longitude) : null,
        source: 'geobase',
      };
    } catch (err: any) {
      geoLogger.logCall({
        provider: this.name,
        operation: 'cepLookup',
        durationMs: performance.now() - startTime,
        success: false,
        querySnippet: cleanCep,
        error: err.message,
      });
      return null;
    }
  }
}

