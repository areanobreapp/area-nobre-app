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
