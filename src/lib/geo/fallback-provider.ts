import { GeoProvider, GeocodeResult, ReverseGeocodeResult, AddressComponents, CepLookupResult } from './types';
import { geoLogger } from './logger';

// POIs de referência conhecidos de Criciúma (apenas pontos notáveis, SEM interceptação de bairros genéricos)
const KNOWN_TERRITORY_LOCATIONS: Record<string, { lat: number; lng: number; neighborhood: string; city: string; state: string; formatted: string }> = {
  'hospital sao jose': {
    lat: -28.6789,
    lng: -49.3742,
    neighborhood: 'Centro',
    city: 'Criciúma',
    state: 'SC',
    formatted: 'Hospital São José, R. Cel. Pedro Benedet, 630 - Centro, Criciúma - SC, 88801-250',
  },
  'hospital são josé': {
    lat: -28.6789,
    lng: -49.3742,
    neighborhood: 'Centro',
    city: 'Criciúma',
    state: 'SC',
    formatted: 'Hospital São José, R. Cel. Pedro Benedet, 630 - Centro, Criciúma - SC, 88801-250',
  },
  'parque das nacoes': {
    lat: -28.6912,
    lng: -49.3515,
    neighborhood: 'Próspera',
    city: 'Criciúma',
    state: 'SC',
    formatted: 'Parque das Nações Cincinato Naspolini, Av. Centenário - Próspera, Criciúma - SC',
  },
  'parque das nações': {
    lat: -28.6912,
    lng: -49.3515,
    neighborhood: 'Próspera',
    city: 'Criciúma',
    state: 'SC',
    formatted: 'Parque das Nações Cincinato Naspolini, Av. Centenário - Próspera, Criciúma - SC',
  },
  'criciuma shopping': {
    lat: -28.6835,
    lng: -49.3570,
    neighborhood: 'Próspera',
    city: 'Criciúma',
    state: 'SC',
    formatted: 'Criciúma Shopping, Rod. Dep. Paulino Búrigo - Próspera, Criciúma - SC',
  },
  'unesc': {
    lat: -28.7032,
    lng: -49.4075,
    neighborhood: 'Universitário',
    city: 'Criciúma',
    state: 'SC',
    formatted: 'UNESC - Universidade do Extremo Sul Catarinense, Av. Universitária, 1105 - Universitário, Criciúma - SC',
  },
};

function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export class FallbackGeoProvider implements GeoProvider {
  public readonly name = 'Fallback Nominatim / Território';

  public async forwardGeocode(
    address: string,
    options?: { limit?: number; components?: AddressComponents }
  ): Promise<GeocodeResult[]> {
    const startTime = performance.now();
    const query = address.trim();
    const limit = options?.limit || 5;

    if (!query) return [];

    // 1. Verifica cache local APENAS se a busca for exatamente o nome do ponto notável
    const normalized = normalizeKey(query);
    for (const [key, loc] of Object.entries(KNOWN_TERRITORY_LOCATIONS)) {
      const normKey = normalizeKey(key);
      if (normalized === normKey || normalized === `${normKey}, criciuma` || normalized === `${normKey}, criciuma, sc`) {
        geoLogger.logCall({
          provider: this.name,
          operation: 'forwardGeocode',
          durationMs: performance.now() - startTime,
          success: true,
          querySnippet: query,
        });
        return [
          {
            lat: loc.lat,
            lng: loc.lng,
            formattedAddress: loc.formatted,
            neighborhood: loc.neighborhood,
            city: loc.city,
            state: loc.state,
            source: 'fallback',
            confidence: 0.98,
            precision: 'precise',
            precisionLevel: 'rooftop',
          },
        ];
      }
    }

    // 2. Monta lista de tentativas com fallback progressivo conforme itens 5 e 6
    const candidates = this.buildProgressiveCandidates(query, options?.components);

    for (const candidate of candidates) {
      try {
        const enrichedQuery = /crici[uú]ma|tubar[aã]o|ararangu[aá]|i[cç]ara/i.test(candidate.query)
          ? candidate.query
          : `${candidate.query}, Criciúma, SC, Brasil`;

        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          enrichedQuery
        )}&format=json&addressdetails=1&limit=${limit}&countrycodes=br`;

        const res = await fetch(url, {
          headers: {
            'User-Agent': 'AreaNobreCorretora/1.0 (contato@areanobre.com.br)',
            Accept: 'application/json',
          },
        });

        if (!res.ok) continue;

        const items = await res.json();
        if (Array.isArray(items) && items.length > 0) {
          const results: GeocodeResult[] = items.map((item: any) => {
            const addr = item.address || {};
            const hasHouseNumber = Boolean(addr.house_number);
            const isRoad = item.addresstype === 'road' || Boolean(addr.road || addr.street);
            const isPostcode = item.addresstype === 'postcode' || Boolean(item.type === 'postcode');

            let precision: 'precise' | 'approximate' = 'approximate';
            let precisionLevel: 'rooftop' | 'street' | 'neighborhood' | 'postal_code' | 'city' = 'street';

            if (hasHouseNumber) {
              precision = 'precise';
              precisionLevel = 'rooftop';
            } else if (isRoad) {
              precision = 'approximate';
              precisionLevel = 'street';
            } else if (isPostcode || candidate.precisionLevel === 'postal_code') {
              precision = 'approximate';
              precisionLevel = 'postal_code';
            } else if (addr.suburb || addr.neighbourhood) {
              precision = 'approximate';
              precisionLevel = 'neighborhood';
            }

            return {
              lat: Number(item.lat),
              lng: Number(item.lon),
              formattedAddress: item.display_name || '',
              street: addr.road || addr.street,
              number: addr.house_number,
              neighborhood: addr.suburb || addr.neighbourhood || addr.city_district,
              city: addr.city || addr.town || addr.municipality || 'Criciúma',
              state: addr.state || 'SC',
              postalCode: addr.postcode,
              placeId: String(item.place_id || ''),
              source: 'fallback',
              confidence: hasHouseNumber ? 1.0 : candidate.confidence,
              precision,
              precisionLevel,
            };
          });

          geoLogger.logCall({
            provider: this.name,
            operation: 'forwardGeocode',
            durationMs: performance.now() - startTime,
            success: true,
            querySnippet: `${candidate.step}: ${candidate.query} [${results[0]?.precision}: ${results[0]?.precisionLevel}]`,
          });

          return results;
        }
      } catch (err: any) {
        // Continua para o próximo candidato de fallback
      }
    }

    // Se nenhuma tentativa produziu resultado
    geoLogger.logCall({
      provider: this.name,
      operation: 'forwardGeocode',
      durationMs: performance.now() - startTime,
      success: false,
      querySnippet: query,
      error: 'Nenhum resultado nos níveis progressivos.',
    });
    return [];
  }

  private buildProgressiveCandidates(
    rawAddress: string,
    components?: AddressComponents
  ): Array<{
    step: string;
    query: string;
    confidence: number;
    precision: 'precise' | 'approximate';
    precisionLevel: 'rooftop' | 'street' | 'neighborhood' | 'postal_code' | 'city';
  }> {
    const list: Array<{
      step: string;
      query: string;
      confidence: number;
      precision: 'precise' | 'approximate';
      precisionLevel: 'rooftop' | 'street' | 'neighborhood' | 'postal_code' | 'city';
    }> = [];

    if (components) {
      const { street, number, neighborhood, city = 'Criciúma', state = 'SC', postalCode } = components;

      // Tentativa 1: logradouro + número + bairro + cidade + UF + CEP, Brasil
      if (street) {
        const c1Parts = [
          number ? `${street}, ${number}` : street,
          neighborhood,
          `${city} - ${state}`,
          postalCode,
          'Brasil',
        ].filter(Boolean);
        list.push({
          step: '1. Completo (Rua+Nº+Bairro+Cidade+UF+CEP)',
          query: c1Parts.join(', '),
          confidence: 1.0,
          precision: number ? 'precise' : 'approximate',
          precisionLevel: number ? 'rooftop' : 'street',
        });

        // Tentativa 2: logradouro + número + cidade + UF + CEP, Brasil (sem bairro)
        if (number) {
          list.push({
            step: '2. Rua + Nº + Cidade + UF + CEP',
            query: `${street}, ${number}, ${city} - ${state}, ${postalCode || ''}, Brasil`.replace(', ,', ','),
            confidence: 0.95,
            precision: 'precise',
            precisionLevel: 'rooftop',
          });
        }

        // Tentativa 3: logradouro + bairro + cidade + UF, Brasil (sem número)
        if (neighborhood) {
          list.push({
            step: '3. Rua + Bairro + Cidade + UF',
            query: `${street}, ${neighborhood}, ${city} - ${state}, Brasil`,
            confidence: 0.85,
            precision: 'approximate',
            precisionLevel: 'street',
          });
        }

        // Tentativa 4: logradouro + cidade + UF, Brasil
        list.push({
          step: '4. Rua + Cidade + UF',
          query: `${street}, ${city} - ${state}, Brasil`,
          confidence: 0.75,
          precision: 'approximate',
          precisionLevel: 'street',
        });
      }

      // Tentativa 5: CEP + cidade + UF, Brasil
      if (postalCode) {
        list.push({
          step: '5. CEP + Cidade + UF',
          query: `${postalCode}, ${city} - ${state}, Brasil`,
          confidence: 0.70,
          precision: 'approximate',
          precisionLevel: 'postal_code',
        });
      }
    }

    // Se a query original não estiver na lista ou não houver components estruturados
    if (!list.some((item) => item.query === rawAddress)) {
      list.unshift({
        step: '0. Endereço Informado',
        query: rawAddress,
        confidence: 0.9,
        precision: 'approximate',
        precisionLevel: 'street',
      });

      // Tenta remover segmentos separados por vírgula se houver mais de 2
      const segments = rawAddress.split(',').map((s) => s.trim()).filter(Boolean);
      if (segments.length >= 3) {
        const streetPart = segments[0];
        const lastPart = segments[segments.length - 1];
        list.push({
          step: 'Fallback simplificado',
          query: `${streetPart}, ${lastPart}`,
          confidence: 0.8,
          precision: 'approximate',
          precisionLevel: 'street',
        });
      }
    }

    return list;
  }

  public async lookupCep(cep: string): Promise<CepLookupResult | null> {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return null;

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.erro) return null;

      return {
        cep: data.cep || cleanCep,
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
        ibge: data.ibge || undefined,
        latitude: null,
        longitude: null,
        source: 'viacep',
      };
    } catch {
      return null;
    }
  }

  public async reverseGeocode(
    lat: number,
    lng: number
  ): Promise<ReverseGeocodeResult | null> {
    const startTime = performance.now();
    const querySnippet = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'AreaNobreCorretora/1.0 (contato@areanobre.local)',
          Accept: 'application/json',
        },
      });

      const durationMs = performance.now() - startTime;

      if (!res.ok) return null;

      const item = await res.json();
      const addr = item.address || {};

      geoLogger.logCall({
        provider: this.name,
        operation: 'reverseGeocode',
        durationMs,
        success: true,
        querySnippet,
      });

      return {
        lat,
        lng,
        formattedAddress: item.display_name || '',
        street: addr.road || addr.street,
        neighborhood: addr.suburb || addr.neighbourhood || addr.city_district,
        city: addr.city || addr.town || addr.municipality,
        state: addr.state,
        postalCode: addr.postcode,
        source: 'fallback',
      };
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
}
