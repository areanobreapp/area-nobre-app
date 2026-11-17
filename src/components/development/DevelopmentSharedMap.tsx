'use client';

import React, { useEffect, useRef, useState } from 'react';
import type L from 'leaflet';
import { MapPin, Navigation, ExternalLink, Compass } from 'lucide-react';
import { BaseMapType, createBaseMapTileLayer } from '@/lib/geo/basemaps';
import BaseMapToggle from '@/components/BaseMapToggle';
import NavigationActionButtons from '@/components/NavigationActionButtons';

export interface DevelopmentSharedMapProps {
  developmentName: string;
  address?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zipcode?: string | null;
  latitude: number | null;
  longitude: number | null;
}

export default function DevelopmentSharedMap({
  developmentName,
  address,
  number,
  complement,
  neighborhood,
  city,
  state,
  zipcode,
  latitude,
  longitude,
}: DevelopmentSharedMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [activeBaseMap, setActiveBaseMap] = useState<BaseMapType>('street');

  const hasCoords =
    latitude !== null &&
    longitude !== null &&
    !isNaN(latitude) &&
    !isNaN(longitude);

  const formattedAddress = [
    address ? `${address}${number ? `, ${number}` : ''}${complement ? ` - ${complement}` : ''}` : null,
    neighborhood,
    city && state ? `${city} - ${state}` : city || state || null,
    zipcode ? `CEP: ${zipcode}` : null,
  ]
    .filter(Boolean)
    .join(' • ');

  useEffect(() => {
    if (!hasCoords || !containerRef.current || typeof window === 'undefined') return;

    let isCancelled = false;

    async function initMap() {
      const L = (await import('leaflet')).default;
      if (isCancelled || !containerRef.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(containerRef.current, {
        center: [latitude!, longitude!],
        zoom: 17,
        zoomControl: false,
        scrollWheelZoom: false,
        attributionControl: false,
      });

      const tileLayer = createBaseMapTileLayer(activeBaseMap);
      tileLayer.addTo(map);
      tileLayerRef.current = tileLayer;

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Marcador Agulha de Precisão Oficial Área Nobre
      const needleHtml = `
        <div style="position: relative; width: 24px; height: 44px; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 3px 5px rgba(0,0,0,0.38));">
          <svg width="24" height="44" viewBox="0 0 24 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="9.5" r="7.5" fill="#1E4620" stroke="#FFFFFF" stroke-width="2"/>
            <circle cx="10" cy="7.5" r="2" fill="#FFFFFF" fill-opacity="0.6"/>
            <line x1="12" y1="16" x2="12" y2="43.5" stroke="#1F2937" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="12" cy="43.5" r="1.2" fill="#111827"/>
          </svg>
        </div>
      `;

      const needleIcon = L.divIcon({
        html: needleHtml,
        className: 'dev-needle-pin',
        iconSize: [24, 44],
        iconAnchor: [12, 43.5],
        popupAnchor: [0, -44],
      });

      const marker = L.marker([latitude!, longitude!], { icon: needleIcon });
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; line-height: 1.4; padding: 2px;">
          <strong style="color: #111827;">${developmentName}</strong><br/>
          <span style="color: #1E4620; font-weight: 700;">Localização do Empreendimento</span>
          ${address ? `<br/><span style="color: #6B7280; font-size: 11px;">${address}${number ? `, ${number}` : ''}</span>` : ''}
        </div>
      `);

      marker.addTo(map);

      map.setView([latitude!, longitude!], 17);
      mapRef.current = map;

      // Observador de redimensionamento
      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize();
          }
        });
        resizeObserver.observe(containerRef.current);
      }
    }

    initMap();

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [hasCoords, latitude, longitude, developmentName, address, number, activeBaseMap]);

  function handleBaseMapChange(newType: BaseMapType) {
    setActiveBaseMap(newType);
    if (mapRef.current && tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
      const newLayer = createBaseMapTileLayer(newType);
      newLayer.addTo(mapRef.current);
      tileLayerRef.current = newLayer;
    }
  }

  return (
    <div
      className="card"
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginTop: '24px',
      }}
    >
      {/* Cabeçalho da Seção */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <MapPin size={20} color="#1E4620" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', margin: 0 }}>
              Localização do Empreendimento
            </h2>
          </div>
          <p style={{ fontSize: '0.88rem', color: '#4B5563', margin: 0, marginTop: '4px' }}>
            {formattedAddress || 'Endereço não informado no cadastro.'}
          </p>
        </div>

        {/* Botões de Ação Externa (Google Maps e Waze) */}
        {hasCoords && (
          <NavigationActionButtons
            latitude={latitude}
            longitude={longitude}
            size="md"
          />
        )}
      </div>

      {/* Mapa Interativo ou Aviso de Coordenadas Pendentes */}
      {hasCoords ? (
        <div style={{ position: 'relative', width: '100%', height: '320px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

          {/* Toggle de Camadas (Satélite / Ruas) */}
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000 }}>
            <BaseMapToggle
              activeBaseMap={activeBaseMap}
              onChange={handleBaseMapChange}
            />
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#92400E',
          }}
        >
          <MapPin size={22} color="#D97706" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
              Localização no mapa pendente de confirmação
            </div>
            <div style={{ fontSize: '0.80rem', marginTop: '2px', color: '#B45309' }}>
              As coordenadas geográficas exatas ainda precisam ser confirmadas no cadastro deste empreendimento. O endereço textual acima pode ser utilizado para consultas.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
