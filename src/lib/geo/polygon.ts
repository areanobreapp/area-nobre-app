/**
 * Utilitários geográficos para polígonos e delimitações territoriais
 */

const EARTH_RADIUS = 6378137; // Raio equatorial WGS84 em metros

export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Calcula a área esférica aproximada de um anel poligonal em metros quadrados (m²).
 * Baseado no excesso esférico (mesma metodologia de Turf.js / Google Maps computeArea).
 * Coordenadas no padrão GeoJSON: [longitude, latitude].
 */
export function calculateSphericalArea(coordinates: [number, number][]): number {
  if (!coordinates || coordinates.length < 3) return 0;

  // Garante fechamento do anel
  const ring = [...coordinates];
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push(first);
  }

  if (ring.length < 4) return 0; // Mínimo de 3 pontos + ponto de fechamento

  let total = 0;
  const toRad = Math.PI / 180;

  for (let i = 0; i < ring.length - 1; i++) {
    const p1 = ring[i];
    const p2 = ring[i + 1];

    const lambda1 = p1[0] * toRad;
    const phi1 = p1[1] * toRad;
    const lambda2 = p2[0] * toRad;
    const phi2 = p2[1] * toRad;

    total += (lambda2 - lambda1) * (2 + Math.sin(phi1) + Math.sin(phi2));
  }

  const area = Math.abs((total * EARTH_RADIUS * EARTH_RADIUS) / 2);
  
  // Arredonda de maneira coerente:
  // Se for maior que 10 m², arredonda para inteiro; se menor, 1 casa decimal
  return area >= 10 ? Math.round(area) : Math.round(area * 10) / 10;
}

/**
 * Calcula ponto representativo (centróide aproximado) de um anel poligonal
 * para enquadramento e foco visual no mapa, SEM alterar coordenadas geocodificadas originais.
 */
export function calculatePolygonCentroid(coordinates: [number, number][]): [number, number] | null {
  if (!coordinates || coordinates.length === 0) return null;

  // Filtra ponto de fechamento repetido se houver
  const points = coordinates.filter((pt, idx) => {
    if (idx === coordinates.length - 1 && coordinates.length > 3) {
      return pt[0] !== coordinates[0][0] || pt[1] !== coordinates[0][1];
    }
    return true;
  });

  if (points.length === 0) return null;

  let sumLng = 0;
  let sumLat = 0;
  for (const pt of points) {
    sumLng += pt[0];
    sumLat += pt[1];
  }

  return [sumLng / points.length, sumLat / points.length];
}

/**
 * Converte coordenadas de vértices [lat, lng] (formato Leaflet) para GeoJSON Polygon válido.
 */
export function leafletLatLngsToGeoJsonPolygon(latLngs: { lat: number; lng: number }[]): {
  type: 'Polygon';
  coordinates: [number, number][][];
} | null {
  if (!latLngs || latLngs.length < 3) return null;

  const ring: [number, number][] = latLngs.map((pt) => [
    Number(pt.lng.toFixed(6)),
    Number(pt.lat.toFixed(6)),
  ]);

  // Fecha o anel se necessário
  if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
    ring.push([ring[0][0], ring[0][1]]);
  }

  return {
    type: 'Polygon',
    coordinates: [ring],
  };
}

/**
 * Extrai anel externo em formato [lat, lng] (Leaflet) a partir de string ou objeto GeoJSON.
 */
export function parseGeoJsonToLatLngs(boundary: string | object | null | undefined): { lat: number; lng: number }[] | null {
  if (!boundary) return null;

  try {
    const geo = typeof boundary === 'string' ? JSON.parse(boundary) : boundary;
    let coords: [number, number][] | null = null;

    if (geo.type === 'Polygon' && Array.isArray(geo.coordinates) && geo.coordinates.length > 0) {
      coords = geo.coordinates[0];
    } else if (geo.type === 'Feature' && geo.geometry?.type === 'Polygon') {
      coords = geo.geometry.coordinates[0];
    }

    if (!coords || coords.length < 3) return null;

    // Converte de [lng, lat] para { lat, lng }, removendo ponto duplicado de fechamento no editor
    const latLngs: { lat: number; lng: number }[] = [];
    for (let i = 0; i < coords.length; i++) {
      const isClosing = i === coords.length - 1 && coords.length > 3 && coords[i][0] === coords[0][0] && coords[i][1] === coords[0][1];
      if (!isClosing) {
        latLngs.push({ lat: coords[i][1], lng: coords[i][0] });
      }
    }

    return latLngs;
  } catch (err) {
    console.error('Falha ao parsear boundary GeoJSON:', err);
    return null;
  }
}

/**
 * Determina se um ponto geográfico { lat, lng } está contido no interior de um polígono
 * utilizando o algoritmo de Ray-Casting (cruzamento de semirretas).
 * Interoperável, rápido (sub-milissegundo) e independente de extensões de banco (PostGIS).
 */
export function isPointInPolygon(
  point: { lat: number; lng: number },
  polygonLatLngs: { lat: number; lng: number }[]
): boolean {
  if (!polygonLatLngs || polygonLatLngs.length < 3) return false;

  let inside = false;
  const x = point.lng;
  const y = point.lat;

  for (let i = 0, j = polygonLatLngs.length - 1; i < polygonLatLngs.length; j = i++) {
    const xi = polygonLatLngs[i].lng;
    const yi = polygonLatLngs[i].lat;
    const xj = polygonLatLngs[j].lng;
    const yj = polygonLatLngs[j].lat;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Calcula a caixa delimitadora (Axis-Aligned Bounding Box - AABB) de um polígono.
 * Usado para indexação e filtragem espacial preliminar ultrarrápida no banco de dados.
 */
export function calculatePolygonBoundingBox(latLngs: { lat: number; lng: number }[]): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} | null {
  if (!latLngs || latLngs.length === 0) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const pt of latLngs) {
    if (pt.lat < minLat) minLat = pt.lat;
    if (pt.lat > maxLat) maxLat = pt.lat;
    if (pt.lng < minLng) minLng = pt.lng;
    if (pt.lng > maxLng) maxLng = pt.lng;
  }

  return {
    minLat: Number(minLat.toFixed(6)),
    maxLat: Number(maxLat.toFixed(6)),
    minLng: Number(minLng.toFixed(6)),
    maxLng: Number(maxLng.toFixed(6)),
  };
}

/**
 * Converte um anel GeoJSON [lng, lat][] para { lat, lng }[]
 */
function ringCoordsToLatLngs(ring: [number, number][]): { lat: number; lng: number }[] {
  return ring.map((pt) => ({ lat: pt[1], lng: pt[0] }));
}

/**
 * Determina se um ponto [lat, lng] está contido em um polígono composto com anéis (exterior e furos)
 */
function isPointInSinglePolygon(
  point: { lat: number; lng: number },
  rings: [number, number][][]
): boolean {
  if (!rings || rings.length === 0) return false;

  // Anel 0 é o anel exterior obrigatório
  const exteriorLatLngs = ringCoordsToLatLngs(rings[0]);
  if (!isPointInPolygon(point, exteriorLatLngs)) {
    return false;
  }

  // Anéis 1..n são furos (interior rings / enclaves). Se cair dentro de um furo, o ponto está FORA do lote!
  for (let i = 1; i < rings.length; i++) {
    const holeLatLngs = ringCoordsToLatLngs(rings[i]);
    if (isPointInPolygon(point, holeLatLngs)) {
      return false; // Está no furo, logo fora da área construível/privativa
    }
  }

  return true;
}

/**
 * Determina se um ponto geográfico { lat, lng } está contido em uma geometria GeoJSON arbitrária.
 * Suporta:
 * 1. Polígonos simples (convexos e côncavos).
 * 2. Polígonos com furos (interior rings).
 * 3. MultiPolygons (múltiplas glebas).
 * 4. Validação rigorosa de coordenadas (rejeita NaN e valores fora do globo [-90, 90] / [-180, 180]).
 * 5. Padrão RFC 7946 (ordem estrita de coordenadas [longitude, latitude]).
 */
export function isPointInGeoJson(
  point: { lat: number; lng: number },
  geoJson: string | object | null | undefined
): boolean {
  if (!geoJson || point.lat === null || point.lng === null || isNaN(point.lat) || isNaN(point.lng)) {
    return false;
  }

  // Rejeita coordenadas inválidas fora dos limites terrestres
  if (point.lat < -90 || point.lat > 90 || point.lng < -180 || point.lng > 180) {
    return false;
  }

  try {
    const geo = typeof geoJson === 'string' ? JSON.parse(geoJson) : geoJson;
    const geometry = geo.type === 'Feature' ? geo.geometry : geo;
    if (!geometry || !geometry.type || !geometry.coordinates) return false;

    if (geometry.type === 'Polygon') {
      return isPointInSinglePolygon(point, geometry.coordinates);
    }

    if (geometry.type === 'MultiPolygon') {
      for (const polyCoords of geometry.coordinates) {
        if (isPointInSinglePolygon(point, polyCoords)) {
          return true;
        }
      }
      return false;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Combina múltiplos limites GeoJSON (Polygon ou MultiPolygon) em uma geometria GeoJSON unificada (MultiPolygon).
 * Utilizado para calcular o cache unificado de delimitação coletiva quando um edifício está assentado em múltiplos lotes.
 */
export function combineGeoJsonBoundaries(boundaries: string[]): string | null {
  if (!boundaries || boundaries.length === 0) return null;
  const validBoundaries = boundaries.filter((b) => b && typeof b === 'string' && b.trim().length > 0);
  if (validBoundaries.length === 0) return null;
  if (validBoundaries.length === 1) return validBoundaries[0];

  const allPolygons: [number, number][][][] = [];

  for (const b of validBoundaries) {
    try {
      const geo = typeof b === 'string' ? JSON.parse(b) : b;
      const geom = geo.type === 'Feature' ? geo.geometry : geo;
      if (!geom || !geom.coordinates) continue;

      if (geom.type === 'Polygon') {
        allPolygons.push(geom.coordinates);
      } else if (geom.type === 'MultiPolygon') {
        for (const poly of geom.coordinates) {
          allPolygons.push(poly);
        }
      }
    } catch {
      // Ignora polígono inválido
    }
  }

  if (allPolygons.length === 0) return null;
  if (allPolygons.length === 1) {
    return JSON.stringify({
      type: 'Polygon',
      coordinates: allPolygons[0],
    });
  }

  return JSON.stringify({
    type: 'MultiPolygon',
    coordinates: allPolygons,
  });
}

