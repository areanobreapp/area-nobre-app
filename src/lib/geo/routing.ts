import { geoLogger } from './logger';

export interface RoutingResult {
  success: boolean;
  durationSeconds: number | null;
  drivingDistanceMeters: number | null;
  fromCache?: boolean;
  error?: string;
}

export interface RoutingMetrics {
  totalCandidatesChecked: number;
  candidatesPassedPreFilter: number;
  apiCallsMade: number;
  cacheHits: number;
  errorsCount: number;
}

interface CacheEntry {
  durationSeconds: number;
  drivingDistanceMeters: number;
  calculatedAt: number;
}

// Cache centralizado em memória para resultados de roteamento
const routingCache = new Map<string, CacheEntry>();

// Métricas de custo e escalabilidade
const metrics: RoutingMetrics = {
  totalCandidatesChecked: 0,
  candidatesPassedPreFilter: 0,
  apiCallsMade: 0,
  cacheHits: 0,
  errorsCount: 0,
};

function buildCacheKey(
  originLat: number,
  originLon: number,
  destLat: number,
  destLon: number,
  mode: string = 'DRIVING'
): string {
  return `${originLat.toFixed(5)},${originLon.toFixed(5)}->${destLat.toFixed(5)},${destLon.toFixed(5)}:${mode}`;
}

/**
 * Distância Haversine em linha reta (em metros).
 */
function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Raio da Terra em metros
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Pré-filtro local conservador para eliminar destinos obviamente inviáveis antes de chamar a GeoBase.
 *
 * Premissa: mesmo numa rodovia livre a 120 km/h (2 km/min), é fisicamente impossível
 * percorrer em linha reta uma distância maior que (maxMinutes * 2000m * 1.2 margem).
 * Imóveis além dessa distância máxima são eliminados localmente sem consumir créditos.
 */
export function isPlausibleTravelTimeCandidate(
  originLat: number,
  originLon: number,
  destLat: number,
  destLon: number,
  maxTravelTimeMinutes: number
): boolean {
  metrics.totalCandidatesChecked++;

  if (
    originLat == null ||
    originLon == null ||
    destLat == null ||
    destLon == null ||
    maxTravelTimeMinutes <= 0
  ) {
    return false;
  }

  const straightLineMeters = calculateHaversineDistanceMeters(
    originLat,
    originLon,
    destLat,
    destLon
  );

  // 120 km/h = 2.000 metros por minuto. Margem de segurança de 25% (2.500 m/min).
  const maxFeasibleStraightLineMeters = maxTravelTimeMinutes * 2500;

  const isPlausible = straightLineMeters <= maxFeasibleStraightLineMeters;
  if (isPlausible) {
    metrics.candidatesPassedPreFilter++;
  }

  return isPlausible;
}

/**
 * Consulta a duração e distância de carro pela rede viária usando GeoBase /routing/distance
 * com cache centralizado e tratamento resiliente de erros.
 */
export async function getDrivingDistanceAndDuration(
  originLat: number,
  originLon: number,
  destLat: number,
  destLon: number
): Promise<RoutingResult> {
  const cacheKey = buildCacheKey(originLat, originLon, destLat, destLon, 'DRIVING');

  // 1. Verificação no cache
  const cached = routingCache.get(cacheKey);
  if (cached) {
    metrics.cacheHits++;
    return {
      success: true,
      durationSeconds: cached.durationSeconds,
      drivingDistanceMeters: cached.drivingDistanceMeters,
      fromCache: true,
    };
  }

  // 2. Chamada à API GeoBase Mapas
  const apiKey = process.env.GEOBASE_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    metrics.errorsCount++;
    return {
      success: false,
      durationSeconds: null,
      drivingDistanceMeters: null,
      error: 'GEOBASE_API_KEY_MISSING',
    };
  }

  metrics.apiCallsMade++;
  const startTime = performance.now();
  const baseUrl = process.env.GEOBASE_BASE_URL || 'https://api.geobasemapas.com.br/api';
  const url = `${baseUrl.replace(/\/$/, '')}/routing/distance?origin_lat=${originLat}&origin_lon=${originLon}&dest_lat=${destLat}&dest_lon=${destLon}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    const durationMs = performance.now() - startTime;

    if (!response.ok) {
      metrics.errorsCount++;
      const errorText = await response.text().catch(() => '');
      geoLogger.logCall({
        provider: 'GeoBase Mapas',
        operation: 'searchLocation', // categoria geral de consulta
        durationMs,
        success: false,
        querySnippet: `Routing origin(${originLat.toFixed(3)}, ${originLon.toFixed(3)}) -> dest(${destLat.toFixed(3)}, ${destLon.toFixed(3)})`,
        error: `HTTP ${response.status}: ${errorText.slice(0, 100)}`,
      });

      return {
        success: false,
        durationSeconds: null,
        drivingDistanceMeters: null,
        error: `GeoBase HTTP ${response.status}`,
      };
    }

    const data = await response.json();

    const durationSec =
      data.duration_seconds != null ? Number(data.duration_seconds) : null;
    const distanceMeters =
      data.driving_distance != null ? Number(data.driving_distance) : null;

    if (durationSec == null || isNaN(durationSec)) {
      metrics.errorsCount++;
      return {
        success: false,
        durationSeconds: null,
        drivingDistanceMeters: null,
        error: 'INVALID_DURATION_RESPONSE',
      };
    }

    // Salva no cache
    routingCache.set(cacheKey, {
      durationSeconds: durationSec,
      drivingDistanceMeters: distanceMeters || 0,
      calculatedAt: Date.now(),
    });

    geoLogger.logCall({
      provider: 'GeoBase Mapas',
      operation: 'searchLocation',
      durationMs,
      success: true,
      querySnippet: `Routing: ${Math.round(durationSec / 60)} min (${distanceMeters ? Math.round(distanceMeters) : 0}m)`,
    });

    return {
      success: true,
      durationSeconds: durationSec,
      drivingDistanceMeters: distanceMeters,
      fromCache: false,
    };
  } catch (err: any) {
    metrics.errorsCount++;
    geoLogger.logCall({
      provider: 'GeoBase Mapas',
      operation: 'searchLocation',
      durationMs: performance.now() - startTime,
      success: false,
      querySnippet: `Routing failed origin(${originLat.toFixed(3)}, ${originLon.toFixed(3)})`,
      error: err.message,
    });

    return {
      success: false,
      durationSeconds: null,
      drivingDistanceMeters: null,
      error: err.message,
    };
  }
}

/**
 * Retorna as métricas operacionais para auditoria de consumo e escalabilidade.
 */
export function getRoutingMetrics(): RoutingMetrics {
  return { ...metrics };
}

/**
 * Limpa o cache de roteamento (usado em testes).
 */
export function clearRoutingCache(): void {
  routingCache.clear();
}

/**
 * Reseta os contadores de métricas (usado em testes).
 */
export function resetRoutingMetrics(): void {
  metrics.totalCandidatesChecked = 0;
  metrics.candidatesPassedPreFilter = 0;
  metrics.apiCallsMade = 0;
  metrics.cacheHits = 0;
  metrics.errorsCount = 0;
}
