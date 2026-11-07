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

export default function LocationPickerModal({
  isOpen,
  initialLat,
  initialLng,
  addressToGeocode,
  addressComponents,
  initialAddress,
  onConfirm,
  onConfirmLocation,
  onCancel,
  onClose,
  title = 'Confirmar Localização no Mapa',
}: LocationPickerProps) {
  // Centro padrão de Criciúma se não houver coordenadas prévias
  const defaultLat = -28.6775;
  const defaultLng = -49.3700;

  const effectiveAddress = addressToGeocode || initialAddress || '';
  const handleClose = onCancel || onClose || (() => {});

  const [lat, setLat] = useState<number>(initialLat ?? defaultLat);
  const [lng, setLng] = useState<number>(initialLng ?? defaultLng);
  const [loading, setLoading] = useState<boolean>(false);
  const [addressFound, setAddressFound] = useState<string>('');
  const [providerSource, setProviderSource] = useState<string>('');
  const [precision, setPrecision] = useState<'precise' | 'approximate'>('approximate');
  const [precisionLevel, setPrecisionLevel] = useState<string>('street');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [foundStatus, setFoundStatus] = useState<'found' | 'not_found' | null>(null);
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

    const startLat = initialLat ?? defaultLat;
    const startLng = initialLng ?? defaultLng;

    const map = L.map(mapContainerRef.current, {
      center: [startLat, startLng],
      zoom: initialLat ? 16 : 14,
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

    // Ícone personalizado moderno e de alta visibilidade com âncora matemática exata
    const pinIcon = L.divIcon({
      html: `
        <div style="position: relative; width: 38px; height: 46px;">
          <div style="
            position: absolute;
            top: 0;
            left: 0;
            width: 38px;
            height: 38px;
            background: #1E4620;
            color: white;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(0,0,0,0.35);
            border: 2px solid white;
          ">
            <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
          </div>
        </div>
      `,
      className: 'location-picker-pin',
      iconSize: [38, 46],
      iconAnchor: [19, 46],
      popupAnchor: [0, -46],
    });

    const marker = L.marker([startLat, startLng], {
      icon: pinIcon,
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

    // Se temos endereço para geocodificar e não tínhamos coordenadas salvas, executa a busca automática
    if ((effectiveAddress || addressComponents?.street || addressComponents?.postalCode) && !initialLat) {
      handleGeocodeAddress(effectiveAddress, addressComponents, map, marker);
    } else if (initialLat && initialLng) {
      setFoundStatus('found');
      setAddressFound(effectiveAddress || 'Localização previamente configurada');
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

        if (map && marker) {
          marker.setLatLng([top.lat, top.lng]);
          map.setView([top.lat, top.lng], 16, { animate: true });
        }
      } else {
        setFoundStatus('not_found');
        setErrorMessage('Não conseguimos localizar automaticamente este endereço. Posicione o marcador no mapa para confirmar a localização.');
      }
    } catch (err: any) {
      setFoundStatus('not_found');
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
              <span>💡 <strong>Dica:</strong> Arraste o pino para alinhar com o acesso do imóvel.</span>
            </div>
          </div>

          {/* Coluna de Ferramentas, Status e Coordenadas */}
          <div className="map-modal-controls-side">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Banner de Status UX com Diferenciação Precisa vs Aproximada */}
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-primary)', fontSize: '0.88rem', fontWeight: 600, padding: '12px', backgroundColor: '#FAFBFC', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Localizando endereço automaticamente via GeoBase...</span>
                </div>
              ) : foundStatus === 'found' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', backgroundColor: '#FAFBFC', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {precision === 'precise' ? (
                      <>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: '#D1FAE5', color: '#065F46', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={14} strokeWidth={3} />
                        </div>
                        <span style={{ color: '#065F46', fontWeight: 800, fontSize: '0.90rem' }}>
                          Localização precisa encontrada
                        </span>
                      </>
                    ) : (
                      <>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: '#DBEAFE', color: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Navigation size={14} strokeWidth={2.5} />
                        </div>
                        <span style={{ color: '#1E40AF', fontWeight: 800, fontSize: '0.90rem' }}>
                          {precisionLevel === 'street'
                            ? 'Localização aproximada na via'
                            : 'Localização aproximada na região'}
                        </span>
                      </>
                    )}

                    {providerSource && (
                      <span style={{ fontSize: '0.70rem', backgroundColor: '#E0E7FF', color: '#3730A3', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                        {providerSource}
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    {addressFound || effectiveAddress}
                  </p>

                  {precision === 'approximate' && (
                    <div style={{ fontSize: '0.76rem', color: '#4B5563', backgroundColor: '#F3F4F6', padding: '6px 10px', borderRadius: 6 }}>
                      💡 O mapa centralizou na via. Você pode arrastar o pino para fixar o ponto exato.
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: '#B45309', backgroundColor: '#FFFBEB', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid #FDE68A' }}>
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2, color: '#D97706' }} />
                  <div style={{ fontSize: '0.84rem', lineHeight: '1.4' }}>
                    <strong>Localização automática não encontrada:</strong>
                    <div style={{ marginTop: '2px' }}>
                      Não conseguimos localizar automaticamente este endereço. Posicione o marcador no mapa para confirmar.
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
                  onClick={() => handleGeocodeAddress(effectiveAddress, addressComponents)}
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
            onClick={() => handleGeocodeAddress(effectiveAddress, addressComponents)}
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
