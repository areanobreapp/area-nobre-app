/**
 * Centroides territoriais oficiais dos bairros de Criciúma e região.
 * Utilizado para calcular referências territoriais aproximadas e seguras
 * na apresentação pública de imóveis (Fase 5.3), garantindo que as coordenadas
 * reais e precisas de imóveis privados NUNCA sejam vazadas ou reconstruíveis.
 */

const CRICIUMA_NEIGHBORHOOD_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  "centro": { "lat": -28.67881, "lng": -49.369534 },
  "vera cruz": { "lat": -28.670168, "lng": -49.376495 },
  "demboski": { "lat": -28.676614, "lng": -49.304044 },
  "ana maria": { "lat": -28.703904, "lng": -49.350936 },
  "primeira linha pontilhao": { "lat": -28.714883, "lng": -49.413706 },
  "prospera": { "lat": -28.679336, "lng": -49.350277 },
  "maria ceu": { "lat": -28.669303, "lng": -49.391901 },
  "quarta linha": { "lat": -28.785938, "lng": -49.386517 },
  "jardim das paineiras": { "lat": -28.715231, "lng": -49.366392 },
  "comerciario": { "lat": -28.687214, "lng": -49.365772 },
  "vila maria": { "lat": -28.830693, "lng": -49.370749 },
  "archimedes naspolini": { "lat": -28.653167, "lng": -49.380724 },
  "sao simao": { "lat": -28.645139, "lng": -49.341751 },
  "sao luis": { "lat": -28.69631, "lng": -49.365606 },
  "cristo redentor": { "lat": -28.707085, "lng": -49.339314 },
  "nossa senhora do carmo": { "lat": -28.702956, "lng": -49.379659 },
  "cruzeiro do sul": { "lat": -28.683617, "lng": -49.392651 },
  "esperanca": { "lat": -28.721494, "lng": -49.394236 },
  "rio maina": { "lat": -28.674902, "lng": -49.426217 },
  "michele": { "lat": -28.68412, "lng": -49.37254 },
  "michel": { "lat": -28.68412, "lng": -49.37254 },
  "pio correa": { "lat": -28.68215, "lng": -49.37894 },
  "santa barbara": { "lat": -28.68953, "lng": -49.38712 },
  "pinheirinho": { "lat": -28.70241, "lng": -49.40115 },
  "universitario": { "lat": -28.7032, "lng": -49.4075 },
  "mina do mato": { "lat": -28.6924, "lng": -49.3982 },
  "mina brasil": { "lat": -28.6975, "lng": -49.3912 },
  "mina do toco": { "lat": -28.7082, "lng": -49.4185 },
  "santa catarina": { "lat": -28.7095, "lng": -49.3752 },
  "cavasotto": { "lat": -28.6742, "lng": -49.3415 },
  "criciuma": { "lat": -28.67881, "lng": -49.369534 },
  "morro estevao": { "lat": -28.7352, "lng": -49.3245 },
  "linho": { "lat": -28.7185, "lng": -49.3452 },
  "operaria nova": { "lat": -28.6912, "lng": -49.3745 },
  "santo antonio": { "lat": -28.6825, "lng": -49.4152 },
  "metropol": { "lat": -28.6652, "lng": -49.4521 },
  "rio bonito": { "lat": -28.6612, "lng": -49.4385 },
  "linha batista": { "lat": -28.6321, "lng": -49.3256 },
  "linha cabral": { "lat": -28.6254, "lng": -49.3512 },
  "linha anta": { "lat": -28.6412, "lng": -49.3105 }
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Obtém a coordenada territorial aproximada de um bairro ou cidade.
 * Garante que apenas o centroide amplo da região seja retornado,
 * sem jamais expor ou calcular a partir das coordenadas privadas do imóvel.
 */
export function getTerritorialApproximateCenter(
  neighborhood?: string | null,
  city?: string | null
): { latitude: number; longitude: number } | null {
  if (neighborhood) {
    const norm = normalizeText(neighborhood);
    // Busca exata ou por correspondência de prefixo/sufixo
    for (const [key, coords] of Object.entries(CRICIUMA_NEIGHBORHOOD_CENTROIDS)) {
      if (norm === key || norm.includes(key) || key.includes(norm)) {
        return { latitude: coords.lat, longitude: coords.lng };
      }
    }
  }

  // Fallback padrão para Criciúma
  if (!city || normalizeText(city).includes('criciuma')) {
    return { latitude: -28.67881, longitude: -49.369534 };
  }

  // Fallbacks para municípios vizinhos da AMREC
  const normCity = normalizeText(city);
  if (normCity.includes('icara')) {
    return { latitude: -28.7136, longitude: -49.3006 };
  }
  if (normCity.includes('forcilhinha')) {
    return { latitude: -28.7525, longitude: -49.4722 };
  }
  if (normCity.includes('nova veneza')) {
    return { latitude: -28.6372, longitude: -49.4989 };
  }
  if (normCity.includes('sideropolis')) {
    return { latitude: -28.5978, longitude: -49.4242 };
  }
  if (normCity.includes('maracaja')) {
    return { latitude: -28.8475, longitude: -49.4589 };
  }
  if (normCity.includes('ararangua')) {
    return { latitude: -28.9356, longitude: -49.4889 };
  }

  return { latitude: -28.67881, longitude: -49.369534 };
}
