/**
 * Utilitário para geração de links universais de navegação por rotas (Google Maps e Waze)
 * Etapas 3D.1 e 3D.2 / Ponto 27
 *
 * Diretrizes:
 * - Sem dependências externas ou chaves de API.
 * - Validação estrita de coordenadas geográficas.
 * - Parâmetros codificados conforme especificações oficiais do Google Maps e Waze.
 * - Não armazena nem registra localização pessoal do usuário.
 */

export interface NavigationLinks {
  googleMapsUrl: string;
  wazeUrl: string;
}

/**
 * Valida se um par de latitude e longitude constitui uma coordenada geográfica válida no elipsoide WGS84.
 */
export function isValidCoordinate(
  lat?: number | null,
  lng?: number | null
): boolean {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return false;
  }
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return false;
  }
  if (!isFinite(lat) || !isFinite(lng) || isNaN(lat) || isNaN(lng)) {
    return false;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return false;
  }
  // Coordenadas [0, 0] puras no meio do oceano Atlântico (Null Island) são desconsideradas como destino de imóvel
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) {
    return false;
  }
  return true;
}

/**
 * Gera as URLs de navegação direta para Google Maps e Waze.
 * Retorna null se as coordenadas forem inválidas ou ausentes.
 *
 * @param lat Latitude de destino
 * @param lng Longitude de destino
 */
export function getNavigationLinks(
  lat?: number | null,
  lng?: number | null
): NavigationLinks | null {
  if (!isValidCoordinate(lat, lng)) {
    return null;
  }

  const safeLat = Number(lat!.toFixed(6)).toString();
  const safeLng = Number(lng!.toFixed(6)).toString();
  const destCoords = `${safeLat},${safeLng}`;

  // Google Maps Directions API URL Universal:
  // Ao omitir origin, o Google Maps utiliza a localização atual do usuário como ponto de partida
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    destCoords
  )}`;

  // Waze Deep Link Universal:
  // Abre o aplicativo no smartphone ou a interface web com navegação direta iniciada
  const wazeUrl = `https://waze.com/ul?ll=${encodeURIComponent(
    destCoords
  )}&navigate=yes`;

  return {
    googleMapsUrl,
    wazeUrl,
  };
}

/**
 * Gera a URL oficial de direções do Google Maps ligando uma Origem (A) e um Destino (B) arbitrários.
 * Retorna null se qualquer uma das coordenadas for inválida.
 *
 * @param originLat Latitude do ponto A (origem)
 * @param originLng Longitude do ponto A (origem)
 * @param destLat Latitude do ponto B (destino)
 * @param destLng Longitude do ponto B (destino)
 */
export function getTwoPointsGoogleMapsUrl(
  originLat?: number | null,
  originLng?: number | null,
  destLat?: number | null,
  destLng?: number | null
): string | null {
  if (
    !isValidCoordinate(originLat, originLng) ||
    !isValidCoordinate(destLat, destLng)
  ) {
    return null;
  }

  const safeOrigin = `${Number(originLat!.toFixed(6))},${Number(
    originLng!.toFixed(6)
  )}`;
  const safeDest = `${Number(destLat!.toFixed(6))},${Number(
    destLng!.toFixed(6)
  )}`;

  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    safeOrigin
  )}&destination=${encodeURIComponent(safeDest)}`;
}
