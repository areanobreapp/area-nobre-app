/**
 * Abstração de Provedores de Basemap (Fase 4.3 — Mapa Híbrido: Vetorial + Satélite)
 * Desacopla a camada visual do restante da aplicação (HomeMap, matching, filtros, pins).
 */

import L from 'leaflet';

export type BaseMapType = 'street' | 'satellite';

export interface BaseMapConfig {
  id: BaseMapType;
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  maxNativeZoom?: number;
  subdomains?: string | string[];
}

const STORAGE_KEY = 'area_nobre_basemap_preference';

/**
 * Obtém a configuração do basemap selecionado.
 * Suporta configuração desacoplada via variáveis de ambiente (.env):
 * - NEXT_PUBLIC_SATELLITE_PROVIDER ('esri' | 'mapbox' | 'custom')
 * - NEXT_PUBLIC_MAPBOX_TOKEN (opcional, para Mapbox)
 * - NEXT_PUBLIC_CUSTOM_SATELLITE_URL (opcional, para endpoint personalizado)
 */
export function getBaseMapConfig(type: BaseMapType): BaseMapConfig {
  if (type === 'satellite') {
    const provider = process.env.NEXT_PUBLIC_SATELLITE_PROVIDER || 'esri';
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const customUrl = process.env.NEXT_PUBLIC_CUSTOM_SATELLITE_URL;
    const customAttribution = process.env.NEXT_PUBLIC_CUSTOM_SATELLITE_ATTRIBUTION;

    if (provider === 'mapbox' && mapboxToken) {
      return {
        id: 'satellite',
        name: 'Satélite',
        url: `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`,
        attribution: '&copy; Mapbox &copy; OpenStreetMap &copy; Maxar',
        maxZoom: 20,
        maxNativeZoom: 19,
      };
    }

    if (provider === 'custom' && customUrl) {
      return {
        id: 'satellite',
        name: 'Satélite',
        url: customUrl,
        attribution: customAttribution || 'Imagem de Satélite',
        maxZoom: 20,
      };
    }

    // Provedor padrão oficial: Esri World Imagery (ArcGIS Online)
    // Cobertura Maxar/GeoEye de alta resolução em Criciúma e em todo o Brasil.
    // Sem necessidade de chave para visualização em protótipo/desenvolvimento web.
    // Padrão Leaflet XYZ: {z}/{y}/{x} no serviço MapServer da Esri.
    return {
      id: 'satellite',
      name: 'Satélite',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, Maxar, and the GIS User Community',
      maxZoom: 20,
      maxNativeZoom: 18,
    };
  }

  // Padrão: Mapa Vetorial OpenStreetMap
  return {
    id: 'street',
    name: 'Mapa',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
  };
}

/**
 * Cria uma camada Leaflet TileLayer para o basemap especificado,
 * com tratamento de erro e evento de fallback transparente.
 */
export function createBaseMapTileLayer(
  type: BaseMapType,
  onTileError?: (err: any) => void
): L.TileLayer {
  const config = getBaseMapConfig(type);

  const tileLayer = L.tileLayer(config.url, {
    attribution: config.attribution,
    maxZoom: config.maxZoom,
    maxNativeZoom: config.maxNativeZoom,
    subdomains: config.subdomains || 'abc',
  });

  if (onTileError) {
    tileLayer.on('tileerror', (e) => {
      console.warn(`[BaseMap] Falha ao carregar tile do basemap "${type}":`, e);
      onTileError(e);
    });
  }

  return tileLayer;
}

/**
 * Recupera a preferência salva no navegador da corretora (localStorage)
 */
export function getStoredBaseMapPreference(): BaseMapType {
  if (typeof window === 'undefined') return 'street';
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === 'satellite' || val === 'street') {
      return val;
    }
  } catch (err) {
    console.warn('[BaseMap] Não foi possível ler preferência do localStorage:', err);
  }
  return 'street';
}

/**
 * Salva a preferência escolhida no navegador da corretora
 */
export function setStoredBaseMapPreference(type: BaseMapType): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, type);
  } catch (err) {
    console.warn('[BaseMap] Não foi possível salvar preferência no localStorage:', err);
  }
}
