'use client';

import React, { useEffect, useRef, useState, useId } from 'react';
import L from 'leaflet';
import {
  Check,
  X,
  MapPin,
  Move,
  Layers,
  Compass,
  Car,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  BaseMapType,
  createBaseMapTileLayer,
  getStoredBaseMapPreference,
  setStoredBaseMapPreference,
} from '@/lib/geo/basemaps';
import BaseMapToggle from './BaseMapToggle';

export interface RadiusLocationPickerModalProps {
  isOpen: boolean;
  mode?: 'RADIUS' | 'TRAVEL_TIME';
  initialLat?: number | null;
  initialLng?: number | null;
  initialRadiusMeters?: number | null;
  initialAddress?: string | null;
  onConfirm: (data: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
    address?: string;
  }) => void;
  onCancel: () => void;
}

const QUICK_RADIUS_OPTIONS = [
  { label: '500 m', value: 500 },
  { label: '1 km', value: 1000 },
  { label: '2 km', value: 2000 },
  { label: '3 km', value: 3000 },
  { label: '5 km', value: 5000 },
];

export default function RadiusLocationPickerModal({
  isOpen,
  mode = 'RADIUS',
  initialLat,
  initialLng,
  initialRadiusMeters,
  initialAddress,
  onConfirm,
  onCancel,
}: RadiusLocationPickerModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const baseMapLayerRef = useRef<L.TileLayer | null>(null);

  // Região padrão caso não haja coordenadas: Praça Nereu Ramos, Criciúma - SC
  const defaultLat = -28.6775;
  const defaultLng = -49.3700;

  const [lat, setLat] = useState<number>(initialLat ?? defaultLat);
  const [lng, setLng] = useState<number>(initialLng ?? defaultLng);
  const [radiusMeters, setRadiusMeters] = useState<number>(initialRadiusMeters ?? 2000);
  const [customRadiusKm, setCustomRadiusKm] = useState<string>('');
  const [addressLabel, setAddressLabel] = useState<string>(initialAddress ?? '');
  const [activeBaseMap, setActiveBaseMap] = useState<BaseMapType>(() => getStoredBaseMapPreference());

  // Formatação amigável do raio
  function formatRadiusLabel(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    const km = meters / 1000;
    return `${km % 1 === 0 ? km.toFixed(0) : km.toFixed(1).replace('.', ',')} km`;
  }

  // Tenta obter endereço aproximado por geocodificação reversa
  const fetchReverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const res = await fetch(`/api/geo/reverse?lat=${latitude}&lng=${longitude}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.address) {
          setAddressLabel(data.address);
        }
      }
    } catch {
      // Falha silenciosa em offline ou sem rota
    }
  };

  // Inicialização e gerenciamento do mapa Leaflet
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 14,
        zoomControl: true,
      });

      const tileLayer = createBaseMapTileLayer(activeBaseMap, () => {
        setActiveBaseMap('street');
      });
      tileLayer.addTo(map);
      baseMapLayerRef.current = tileLayer;

      // Ícone elegante para o ponto de referência
      const pinIcon = L.divIcon({
        html: `
          <div style="
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: #1D4ED8;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(29, 78, 216, 0.45);
            border: 3px solid white;
            cursor: grab;
          ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
        `,
        className: 'radius-picker-pin',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      // Marcador arrastável
      const marker = L.marker([lat, lng], {
        icon: pinIcon,
        draggable: true,
        zIndexOffset: 1000,
      }).addTo(map);
      markerRef.current = marker;

      // Círculo de cobertura (apenas no modo RADIUS; nunca no modo TRAVEL_TIME)
      if (mode !== 'TRAVEL_TIME') {
        const circle = L.circle([lat, lng], {
          radius: radiusMeters,
          color: '#1D4ED8',
          fillColor: '#3B82F6',
          fillOpacity: 0.14,
          weight: 2,
          dashArray: '5, 8',
        }).addTo(map);
        circleRef.current = circle;
      }

      // Evento de arrastar o marcador
      marker.on('drag', (e: any) => {
        const newPos = e.target.getLatLng();
        if (circleRef.current) circleRef.current.setLatLng(newPos);
      });

      marker.on('dragend', (e: any) => {
        const newPos = e.target.getLatLng();
        setLat(newPos.lat);
        setLng(newPos.lng);
        if (circleRef.current) circleRef.current.setLatLng(newPos);
        fetchReverseGeocode(newPos.lat, newPos.lng);
      });

      // Evento de clique no mapa para reposicionar o ponto
      map.on('click', (e: L.LeafletMouseEvent) => {
        const newLatLng = e.latlng;
        setLat(newLatLng.lat);
        setLng(newLatLng.lng);
        marker.setLatLng(newLatLng);
        if (circleRef.current) circleRef.current.setLatLng(newLatLng);
        fetchReverseGeocode(newLatLng.lat, newLatLng.lng);
      });

      mapInstanceRef.current = map;

      // Ajusta tamanho da tela do mapa e enquadra o círculo ou o ponto central
      setTimeout(() => {
        map.invalidateSize();
        if (circleRef.current) {
          map.fitBounds(circleRef.current.getBounds(), { padding: [50, 50] });
        } else {
          map.setView([lat, lng], 14);
        }
      }, 200);
    } else {
      mapInstanceRef.current.invalidateSize();
    }

    return () => {
      if (!isOpen && mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
  }, [isOpen]);

  // Atualização dinâmica do círculo quando o raio muda
  useEffect(() => {
    if (circleRef.current && mapInstanceRef.current) {
      circleRef.current.setRadius(radiusMeters);
      mapInstanceRef.current.fitBounds(circleRef.current.getBounds(), { padding: [50, 50] });
    }
  }, [radiusMeters]);

  // Alternância do Basemap (Mapa vs Satélite)
  function handleBaseMapChange(newType: BaseMapType) {
    if (!mapInstanceRef.current) return;
    setActiveBaseMap(newType);
    setStoredBaseMapPreference(newType);

    if (baseMapLayerRef.current) {
      mapInstanceRef.current.removeLayer(baseMapLayerRef.current);
    }
    const newLayer = createBaseMapTileLayer(newType, () => {
      setActiveBaseMap('street');
    });
    newLayer.addTo(mapInstanceRef.current);
    baseMapLayerRef.current = newLayer;
  }

  function handleSelectQuickRadius(meters: number) {
    setRadiusMeters(meters);
    setCustomRadiusKm('');
  }

  function handleCustomRadiusChange(val: string) {
    setCustomRadiusKm(val);
    const parsed = parseFloat(val.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      setRadiusMeters(Math.round(parsed * 1000));
    }
  }

  function handleConfirm() {
    onConfirm({
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
      radiusMeters,
      address: addressLabel || undefined,
    });
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '1000px',
          height: '90vh',
          maxHeight: '820px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Header do Modal */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#EFF6FF',
                color: '#1D4ED8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {mode === 'TRAVEL_TIME' ? <Car size={22} /> : <Compass size={22} />}
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                {mode === 'TRAVEL_TIME' ? 'Ponto de Referência — Tempo de Carro' : 'Escolher Região no Mapa'}
              </h2>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
                {mode === 'TRAVEL_TIME'
                  ? 'Clique ou arraste o marcador para definir a origem para o cálculo de tempo de carro'
                  : 'Clique ou arraste o ponto central e selecione o raio desejado de busca'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BaseMapToggle activeBaseMap={activeBaseMap} onChange={handleBaseMapChange} />
            <button
              onClick={onCancel}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748B',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Corpo: Mapa interativo */}
        <div style={{ flex: 1, position: 'relative', width: '100%', minHeight: 0 }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

          {/* Dica flutuante sobre o mapa */}
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              zIndex: 1000,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              padding: '8px 14px',
              borderRadius: '10px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              fontSize: '12px',
              fontWeight: 600,
              color: '#1E293B',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid #E2E8F0',
              pointerEvents: 'none',
            }}
          >
            <Move size={14} color="#1D4ED8" />
            {mode === 'TRAVEL_TIME'
              ? 'Clique ou arraste o pin azul para definir o ponto de referência'
              : 'Clique ou arraste o pin azul para mover o centro'}
          </div>
        </div>

        {/* Footer: Seletor de Raio e Confirmação */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Linha 1: Seletor de Raio ou Modo Tempo de Carro */}
          {mode === 'TRAVEL_TIME' ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div
                  style={{
                    backgroundColor: '#EFF6FF',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #BFDBFE',
                    fontWeight: 700,
                    color: '#1D4ED8',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Car size={16} />
                  <span>Origem para Rota de Carro</span>
                </div>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Estimativa baseada na rede viária; não considera trânsito em tempo real.
                </span>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  Raio de busca:
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {QUICK_RADIUS_OPTIONS.map((opt) => {
                    const isSelected = radiusMeters === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelectQuickRadius(opt.value)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: isSelected ? 700 : 500,
                          backgroundColor: isSelected ? '#1D4ED8' : 'white',
                          color: isSelected ? 'white' : '#334155',
                          border: isSelected ? '1px solid #1D4ED8' : '1px solid #CBD5E1',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {/* Opção personalizada */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                  <input
                    type="text"
                    placeholder="Outro km"
                    value={customRadiusKm}
                    onChange={(e) => handleCustomRadiusChange(e.target.value)}
                    style={{
                      width: '85px',
                      padding: '6px 8px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                      textAlign: 'center',
                    }}
                  />
                  <span style={{ fontSize: '12px', color: '#64748B' }}>km</span>
                </div>
              </div>

              {/* Ponto e Raio selecionados */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '13px',
                  color: '#1E293B',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#EFF6FF',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #BFDBFE',
                    fontWeight: 600,
                    color: '#1D4ED8',
                  }}
                >
                  Raio: {formatRadiusLabel(radiusMeters)}
                </div>
              </div>
            </div>
          )}

          {/* Linha 2: Resumo do Ponto e Ações */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '6px',
            }}
          >
            <div style={{ fontSize: '12px', color: '#64748B', maxWidth: '550px' }}>
              <span style={{ fontWeight: 600, color: '#334155' }}>Ponto de referência:</span>{' '}
              {addressLabel ? (
                <span>{addressLabel}</span>
              ) : (
                <span>
                  Lat: {lat.toFixed(5)}, Lng: {lng.toFixed(5)}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onCancel}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#475569',
                  backgroundColor: '#E2E8F0',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                style={{
                  padding: '9px 22px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'white',
                  backgroundColor: '#1D4ED8',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(29, 78, 216, 0.3)',
                }}
              >
                <Check size={16} />
                Confirmar Região ({formatRadiusLabel(radiusMeters)})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
