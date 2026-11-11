'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Check, X, AlertCircle, Search, RefreshCw, Compass, Crosshair, Navigation } from 'lucide-react';
import { AddressComponents } from '@/lib/geo/types';
import {
  BaseMapType,
  createBaseMapTileLayer,
  getStoredBaseMapPreference,
  setStoredBaseMapPreference,
} from '@/lib/geo/basemaps';
import BaseMapToggle from './BaseMapToggle';

export interface LocationPickerProps {
  isOpen?: boolean;
  initialLat?: number | null;
  initialLng?: number | null;
  addressToGeocode?: string;
  addressComponents?: AddressComponents;
  initialAddress?: string;
  geoValidationStatus?: string | null;
  onConfirm?: (
    lat: number,
    lng: number,
    formattedAddress?: string,
    meta?: { precision?: 'precise' | 'approximate'; precisionLevel?: string }
  ) => void;
  onConfirmLocation?: (loc: {
    lat: number;
    lng: number;
    address: string;
    neighborhood?: string;
    city?: string;
    precision?: 'precise' | 'approximate';
    precisionLevel?: string;
  }) => void;
  onCancel?: () => void;
  onClose?: () => void;
  title?: string;
}

export type LocationReliability = 'CONFIRMED' | 'ESTIMATED' | 'GEOCODED' | 'FALLBACK_MUNICIPAL';

export default function LocationPickerModal({
  isOpen,
  initialLat,
  initialLng,
  addressToGeocode,
  addressComponents,
  initialAddress,
  geoValidationStatus,
  onConfirm,
  onConfirmLocation,
  onCancel,
  onClose,
  title = 'Confirmar Localização no Mapa',
}: LocationPickerProps) {
  // Centro padrão de Criciúma se não houver coordenadas prévias
  const defaultLat = -28.6775;
  const defaultLng = -49.3700;

  const hasValidInitialCoords =
    initialLat !== null &&
    initialLat !== undefined &&
    !isNaN(Number(initialLat)) &&
    initialLng !== null &&
    initialLng !== undefined &&
    !isNaN(Number(initialLng));

  const isConfirmed = Boolean(
    hasValidInitialCoords &&
      geoValidationStatus &&
      [
        'ADMIN_VALIDATED',
        'MULTI_BROKER_CONFIRMED',
        'SINGLE_BROKER_CONFIRMED',
        'CONFIRMED',
        'MANUAL_OVERRIDE',
      ].includes(geoValidationStatus)
  );

  const initialReliabilityLevel: LocationReliability = hasValidInitialCoords
    ? isConfirmed
      ? 'CONFIRMED'
      : 'ESTIMATED'
    : 'FALLBACK_MUNICIPAL';

  const effectiveAddress = addressToGeocode || initialAddress || '';
  const handleClose = onCancel || onClose || (() => {});

  const [lat, setLat] = useState<number>(hasValidInitialCoords ? Number(initialLat) : defaultLat);
  const [lng, setLng] = useState<number>(hasValidInitialCoords ? Number(initialLng) : defaultLng);
  const [loading, setLoading] = useState<boolean>(false);
  const [addressFound, setAddressFound] = useState<string>('');
  const [providerSource, setProviderSource] = useState<string>('');
  const [precision, setPrecision] = useState<'precise' | 'approximate'>('approximate');
  const [precisionLevel, setPrecisionLevel] = useState<string>('street');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [foundStatus, setFoundStatus] = useState<'found' | 'not_found' | null>(null);
  const [reliabilityLevel, setReliabilityLevel] = useState<LocationReliability>(initialReliabilityLevel);
  const [isAdjusting, setIsAdjusting] = useState<boolean>(false);

  // Basemap ativo (Mapa vetorial ou Satélite) persistido localmente
  const [activeBaseMap, setActiveBaseMap] = useState<BaseMapType>(() => getStoredBaseMapPreference());
  const baseMapLayerRef = useRef<L.TileLayer | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // 1. Inicializa o mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const startLat = hasValidInitialCoords ? Number(initialLat) : defaultLat;
    const startLng = hasValidInitialCoords ? Number(initialLng) : defaultLng;
    const initialZoom = isConfirmed ? 18 : hasValidInitialCoords ? 17 : 14;

    const map = L.map(mapContainerRef.current, {
      center: [startLat, startLng],
      zoom: initialZoom,
      zoomControl: true,
      maxZoom: 20,
    });

    // Basemap inicial com tratamento de erro
    const tileLayer = createBaseMapTileLayer(activeBaseMap, () => {
      console.warn('[LocationPickerModal] Fallback para basemap street');
      setActiveBaseMap('street');
    });
    tileLayer.addTo(map);
    baseMapLayerRef.current = tileLayer;

    // Pilar 3: Marcador Agulha de Precisão (24x44px, âncora matemática na ponta [12, 43.5])
    const needlePinIcon = L.divIcon({
      html: `
        <div style="position: relative; width: 24px; height: 44px; pointer-events: none;">
          <svg width="24" height="44" viewBox="0 0 24 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.45));">
            <!-- Sombra de ancoragem no solo sob a ponta da agulha -->
            <ellipse cx="12" cy="43" rx="4" ry="1.2" fill="rgba(0,0,0,0.45)" />
            <!-- Haste vertical ultrafina da agulha (2px afunilando para 1px) com borda branca para contraste sobre satélite e mapa -->
            <path d="M11 16 L11.5 42 L12 43.5 L12.5 42 L13 16 Z" fill="#1E4620" stroke="#FFFFFF" stroke-width="0.75" stroke-linejoin="round" />
            <!-- Esfera superior de precisão (15px) com núcleo verde vivo e mira de centro -->
            <circle cx="12" cy="9.5" r="7.5" fill="#1E4620" stroke="#FFFFFF" stroke-width="2" />
            <circle cx="12" cy="9.5" r="3.5" fill="#4ADE80" />
            <circle cx="12" cy="9.5" r="1.2" fill="#FFFFFF" />
          </svg>
        </div>
      `,
      className: 'precision-needle-pin',
      iconSize: [24, 44],
      iconAnchor: [12, 43.5],
      popupAnchor: [0, -44],
    });

    const marker = L.marker([startLat, startLng], {
      icon: needlePinIcon,
      draggable: true,
    }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setLat(pos.lat);
      setLng(pos.lng);
      setIsAdjusting(true);
    });

    // Clicar no mapa move o marcador para lá
    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      setLat(e.latlng.lat);
      setLng(e.latlng.lng);
      setIsAdjusting(true);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    // Observador de redimensionamento para garantir proporção e tiles íntegros (Etapa 3A / Ponto 1)
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    // Invalidação imediata após montagem do modal
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    // Pilar 2: Hierarquia de Localização
    // Nível 3: Se não tínhamos coordenadas salvas e temos endereço, dispara geocodificação automática via GeoBase
    if (!hasValidInitialCoords && (effectiveAddress || addressComponents?.street || addressComponents?.postalCode)) {
      handleGeocodeAddress(effectiveAddress, addressComponents, map, marker);
    } else if (hasValidInitialCoords) {
      setFoundStatus('found');
      setReliabilityLevel(isConfirmed ? 'CONFIRMED' : 'ESTIMATED');
      setAddressFound(
        effectiveAddress ||
          (isConfirmed
            ? 'Localização confirmada da edificação'
            : 'Localização previamente registrada (estimada)')
      );
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      baseMapLayerRef.current = null;
    };
  }, []);

  // 1.1 Troca de Basemap (Mapa / Satélite) sem mover o pino nem perder foco
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (baseMapLayerRef.current) {
      map.removeLayer(baseMapLayerRef.current);
      baseMapLayerRef.current = null;
    }

    const newLayer = createBaseMapTileLayer(activeBaseMap, () => {
      console.warn('[LocationPickerModal] Falha ao carregar satélite, revertendo para Mapa vetorial');
      setActiveBaseMap('street');
    });

    newLayer.addTo(map);
    newLayer.bringToBack();
    baseMapLayerRef.current = newLayer;

    setStoredBaseMapPreference(activeBaseMap);
  }, [activeBaseMap]);

  async function handleGeocodeAddress(
    address: string,
    components = addressComponents,
    map = mapInstanceRef.current,
    marker = markerRef.current
  ) {
    const rawQuery = address.trim() || [components?.street, components?.number, components?.city, components?.state].filter(Boolean).join(', ');
    if (!rawQuery) return;

    setLoading(true);
    setErrorMessage(null);
    setFoundStatus(null);

    try {
      const res = await fetch('/api/geo/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: rawQuery,
          limit: 1,
          components: components || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha na geocodificação.');

      if (data.results && data.results.length > 0) {
        const top = data.results[0];
        setLat(top.lat);
        setLng(top.lng);
        setAddressFound(top.formattedAddress || rawQuery);
        setProviderSource(top.source === 'geobase' ? 'GeoBase Mapas' : 'GeoBase / Território');
        setPrecision(top.precision || 'approximate');
        setPrecisionLevel(top.precisionLevel || 'street');
        setFoundStatus('found');
        setReliabilityLevel('GEOCODED');

        if (map && marker) {
          marker.setLatLng([top.lat, top.lng]);
          map.setView([top.lat, top.lng], 17, { animate: true });
        }
      } else {
        setFoundStatus('not_found');
        setReliabilityLevel('FALLBACK_MUNICIPAL');
        setErrorMessage('Não conseguimos localizar automaticamente este endereço. Posicione o marcador no mapa para confirmar a localização.');
      }
    } catch (err: any) {
      setFoundStatus('not_found');
      setReliabilityLevel('FALLBACK_MUNICIPAL');
      setErrorMessage('Não conseguimos localizar automaticamente este endereço. Posicione o marcador no mapa para confirmar a localização.');
    } finally {
      setLoading(false);
    }
  }

  function handleSave() {
    if (onConfirm) {
      onConfirm(lat, lng, addressFound, { precision, precisionLevel });
    }
    if (onConfirmLocation) {
      onConfirmLocation({
        lat,
        lng,
        address: addressFound,
        precision,
        precisionLevel,
      });
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={handleClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-floating)',
          backgroundColor: 'white',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Topo do Modal */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Compass size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {title}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Geolocalização do imóvel no mapa da Área Nobre
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BaseMapToggle
              activeBaseMap={activeBaseMap}
              onChange={setActiveBaseMap}
              compact
            />
            <button
              type="button"
              onClick={handleClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              <X size={20} color="#6B7280" />
            </button>
          </div>
        </div>

        {/* Corpo com Layout Split: Mapa Quadrado 1:1 à esquerda e Controles à direita (Etapa 3A / Ponto 1) */}
        <div className="map-modal-split-body">
          {/* Coluna do Mapa Quadrado 1:1 */}
          <div className="map-modal-square-side">
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

            {/* Dica flutuante sobre o mapa */}
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                left: 10,
                right: 10,
                zIndex: 500,
                backgroundColor: 'rgba(255, 255, 255, 0.94)',
                backdropFilter: 'blur(4px)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>💡 <strong>Dica:</strong> Posicione a ponta da agulha sobre a cobertura ou acesso do imóvel.</span>
            </div>
          </div>

          {/* Coluna de Ferramentas, Status e Coordenadas */}
          <div className="map-modal-controls-side">
            <style jsx global>{`
              .precision-needle-pin {
                background: transparent !important;
                border: none !important;
              }
            `}</style>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Banner de Status UX com Hierarquia de 4 Níveis e Ajuste Manual */}
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-primary)', fontSize: '0.88rem', fontWeight: 600, padding: '12px', backgroundColor: '#FAFBFC', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Localizando endereço automaticamente via GeoBase...</span>
                </div>
              ) : isAdjusting ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px 14px', backgroundColor: '#F0FDF4', borderRadius: 'var(--radius-md)', border: '1px solid #BBF7D0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: '#DCFCE7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <span style={{ color: '#166534', fontWeight: 800, fontSize: '0.90rem' }}>
                      Posição ajustada pelo corretor
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#166534', margin: 0, lineHeight: 1.4 }}>
                    📍 Agulha reposicionada manualmente no mapa. Clique em <strong>Confirmar Localização</strong> para salvar.
                  </p>
                </div>
              ) : reliabilityLevel === 'CONFIRMED' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px 14px', backgroundColor: '#ECFDF5', borderRadius: 'var(--radius-md)', border: '1px solid #A7F3D0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: '#D1FAE5', color: '#065F46', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <span style={{ color: '#065F46', fontWeight: 800, fontSize: '0.90rem' }}>
                      Localização confirmada da edificação
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#047857', margin: 0, lineHeight: 1.4 }}>
                    {addressFound || effectiveAddress || 'Coordenadas verificadas e validadas no Cadastro Mestre.'}
                  </p>
                </div>
              ) : reliabilityLevel === 'ESTIMATED' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px 14px', backgroundColor: '#EFF6FF', borderRadius: 'var(--radius-md)', border: '1px solid #BFDBFE' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: '#DBEAFE', color: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Navigation size={14} strokeWidth={2.5} />
                    </div>
                    <span style={{ color: '#1E40AF', fontWeight: 800, fontSize: '0.90rem' }}>
                      Localização estimada — confira no mapa
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#1E3A8A', margin: 0, lineHeight: 1.4 }}>
                    Coordenadas registradas no sistema. Por favor, confira e ajuste a agulha na cobertura do edifício se necessário.
                  </p>
                </div>
              ) : reliabilityLevel === 'GEOCODED' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px 14px', backgroundColor: '#FFFBEB', borderRadius: 'var(--radius-md)', border: '1px solid #FDE68A' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: '#FEF3C7', color: '#92400E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Compass size={14} strokeWidth={2.5} />
                    </div>
                    <span style={{ color: '#92400E', fontWeight: 800, fontSize: '0.90rem' }}>
                      Posição sugerida por endereço (não confirmada)
                    </span>
                    {providerSource && (
                      <span style={{ fontSize: '0.70rem', backgroundColor: '#FEF3C7', color: '#78350F', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                        {providerSource}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#78350F', margin: 0, lineHeight: 1.4 }}>
                    {addressFound || effectiveAddress}
                  </p>
                  <div style={{ fontSize: '0.76rem', color: '#92400E', backgroundColor: '#FEF9C3', padding: '6px 10px', borderRadius: 6 }}>
                    💡 O mapa centralizou na via. Arraste a agulha sobre o telhado do edifício para fixar o ponto exato.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: '#9A3412', backgroundColor: '#FFF7ED', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid #FED7AA' }}>
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2, color: '#EA580C' }} />
                  <div style={{ fontSize: '0.84rem', lineHeight: '1.4' }}>
                    <strong style={{ color: '#9A3412' }}>Posição aproximada de referência (não confirmada):</strong>
                    <div style={{ marginTop: '2px', color: '#C2410C' }}>
                      Não foi possível localizar o endereço automaticamente. Navegue no mapa e posicione a agulha sobre a edificação.
                    </div>
                  </div>
                </div>
              )}

              {/* Bloco de Coordenadas Selecionadas */}
              <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>
                  Coordenadas Geográficas
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {lat.toFixed(6)}, {lng.toFixed(6)}
                </div>
                <div style={{ fontSize: '0.76rem', color: isAdjusting ? 'var(--color-primary)' : 'var(--text-muted)', fontWeight: isAdjusting ? 700 : 500, marginTop: '4px' }}>
                  {isAdjusting
                    ? '📍 Ajuste manual ativo pelo corretor'
                    : 'Clique ou arraste o marcador para refinar a posição'}
                </div>
              </div>

              {/* Botões de Ação Rápida */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  title="Recalcular coordenadas para o endereço digitado"
                  onClick={() => {
                    setIsAdjusting(false);
                    handleGeocodeAddress(effectiveAddress, addressComponents);
                  }}
                  disabled={loading}
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: 'white',
                    color: 'var(--text-secondary)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  <span>Recalcular endereço</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAdjusting(true);
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.zoomIn();
                    }
                  }}
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: 'white',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Crosshair size={14} />
                  <span>Aproximar pino</span>
                </button>
              </div>
            </div>

            {/* Aviso informativo */}
            <div style={{ fontSize: '0.74rem', color: '#6B7280', lineHeight: 1.4, padding: '8px 0' }}>
              Este marcador determina o posicionamento do imóvel na carteira interna e a referência para cálculos de proximidade.
            </div>
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-subtle)',
          }}
        >
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setIsAdjusting(false);
              handleGeocodeAddress(effectiveAddress, addressComponents);
            }}
            disabled={loading}
            style={{ padding: '9px 14px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Tentar novamente</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleClose}
              style={{ padding: '9px 16px', fontSize: '0.88rem' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              style={{ padding: '9px 20px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Check size={18} strokeWidth={2.5} />
              <span>Confirmar Localização</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
