/**
 * Utilitário de Geolocalização do Usuário (Etapa 3B / Ponto 8)
 *
 * Regras estritas de Privacidade:
 * - A localização do usuário existe EXCLUSIVAMENTE no estado temporário de memória da interface.
 * - NUNCA é enviada para APIs externas, bancos de dados, logs ou links compartilháveis.
 * - NÃO utiliza watchPosition (sem rastreamento contínuo em segundo plano).
 */

import L from 'leaflet';

export interface UserCoordinates {
  lat: number;
  lng: number;
  accuracy: number; // Precisão em metros
  timestamp: number;
}

export type GeolocationErrorCode =
  | 'NOT_SUPPORTED'
  | 'INSECURE_CONTEXT'
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'UNKNOWN_ERROR';

export interface GeolocationResult {
  success: boolean;
  coords?: UserCoordinates;
  errorCode?: GeolocationErrorCode;
  errorMessage?: string;
}

/**
 * Solicita a localização pontual atual do usuário via navigator.geolocation.getCurrentPosition
 */
export async function getCurrentUserLocation(
  options: PositionOptions = { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
): Promise<GeolocationResult> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.geolocation) {
    return {
      success: false,
      errorCode: 'NOT_SUPPORTED',
      errorMessage: 'Seu navegador não possui suporte a geolocalização.',
    };
  }

  // A API de Geolocalização exige contexto seguro (HTTPS ou localhost)
  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (!window.isSecureContext && !isLocalhost) {
    return {
      success: false,
      errorCode: 'INSECURE_CONTEXT',
      errorMessage:
        'A geolocalização no navegador requer uma conexão segura (HTTPS). Acesse via localhost ou HTTPS.',
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          success: true,
          coords: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy || 0),
            timestamp: position.timestamp,
          },
        });
      },
      (error) => {
        let code: GeolocationErrorCode = 'UNKNOWN_ERROR';
        let msg = 'Não foi possível obter sua localização no momento.';

        switch (error.code) {
          case 1: // PERMISSION_DENIED
            code = 'PERMISSION_DENIED';
            msg = 'Permissão de localização não concedida. Habilite o acesso nas configurações do seu navegador para ver sua posição no mapa.';
            break;
          case 2: // POSITION_UNAVAILABLE
            code = 'POSITION_UNAVAILABLE';
            msg = 'Não foi possível determinar sua localização atual. Verifique se o GPS ou os serviços de localização do seu dispositivo estão ativados.';
            break;
          case 3: // TIMEOUT
            code = 'TIMEOUT';
            msg = 'Tempo esgotado ao tentar obter a localização. Tente clicar novamente.';
            break;
          default:
            code = 'UNKNOWN_ERROR';
            msg = 'Ocorreu um erro ao obter sua localização. Tente novamente.';
            break;
        }

        resolve({
          success: false,
          errorCode: code,
          errorMessage: msg,
        });
      },
      options
    );
  });
}

/**
 * Cria o marcador visual (DivIcon) do usuário: ponto azul com anel branco e pulso suave
 */
export function createUserLocationMarker(coords: UserCoordinates): L.Marker {
  const icon = L.divIcon({
    className: 'user-location-marker-wrapper',
    html: `
      <div class="user-location-marker-container">
        <div class="user-location-pulse"></div>
        <div class="user-location-dot"></div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11],
  });

  const marker = L.marker([coords.lat, coords.lng], {
    icon,
    zIndexOffset: 1000, // Garante que fique acima de polígonos e pins convencionais
    title: 'Sua localização atual',
  });

  const accuracyText = coords.accuracy > 0 ? `Precisão de aproximadamente ±${coords.accuracy}m` : 'Localização aproximada';

  marker.bindPopup(`
    <div style="font-family: inherit; font-size: 0.85rem; padding: 4px; text-align: center;">
      <div style="font-weight: 700; color: #1E4620; margin-bottom: 2px;">📍 Você está aqui</div>
      <div style="font-size: 0.72rem; color: #64748B;">${accuracyText}</div>
    </div>
  `, {
    closeButton: false,
    offset: [0, -6],
  });

  return marker;
}

/**
 * Cria o círculo semitransparente representando a margem de precisão informada pelo navegador
 */
export function createUserAccuracyCircle(coords: UserCoordinates): L.Circle {
  // Define um raio mínimo estético de 15m para visualização nítida caso a precisão seja quase zero
  const radius = Math.max(coords.accuracy, 15);

  return L.circle([coords.lat, coords.lng], {
    radius,
    color: '#2563EB',
    weight: 1.5,
    opacity: 0.45,
    fillColor: '#3B82F6',
    fillOpacity: 0.12,
    interactive: false, // Não intercepta cliques do usuário no mapa
  });
}
