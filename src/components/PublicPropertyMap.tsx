'use client';

import React, { useEffect, useRef, useState } from 'react';
import type L from 'leaflet';
import { MapPin, Compass, ShieldCheck } from 'lucide-react';
import { BaseMapType, createBaseMapTileLayer } from '@/lib/geo/basemaps';
import BaseMapToggle from './BaseMapToggle';

interface PublicPropertyMapProps {
  locationPrecision: 'HIDDEN' | 'APPROXIMATE' | 'EXACT';
  latitude: number | null;
  longitude: number | null;
  approximateCenter?: { latitude: number; longitude: number } | null;
  neighborhood?: string | null;
  city?: string | null;
  title?: string;
}

export default function PublicPropertyMap({
  locationPrecision,
  latitude,
  longitude,
  approximateCenter,
  neighborhood,
  city = 'Criciúma',
  title = 'Imóvel',
}: PublicPropertyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [activeBaseMap, setActiveBaseMap] = useState<BaseMapType>('street');

  // Não renderiza mapa quando a privacidade estiver Oculta
  if (locationPrecision === 'HIDDEN') {
    return null;
  }

  const isExact = locationPrecision === 'EXACT' && latitude != null && longitude != null;
  const isApprox = locationPrecision === 'APPROXIMATE';

  const mapLat = isExact
    ? latitude!
    : approximateCenter?.latitude || -28.67881;
  const mapLng = isExact
    ? longitude!
    : approximateCenter?.longitude || -49.369534;
  const zoomLevel = isExact ? 16 : 14;

  useEffect(() => {
    let isCancelled = false;

    async function initMap() {
      if (!containerRef.current || typeof window === 'undefined') return;

      const L = (await import('leaflet')).default;
      if (isCancelled || !containerRef.current) return;

      // Destrói instância prévia se existir
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(containerRef.current, {
        center: [mapLat, mapLng],
        zoom: zoomLevel,
        zoomControl: false,
        scrollWheelZoom: false, // Evita prender o scroll da página no mobile
        attributionControl: false,
      });

      if (isCancelled || !containerRef.current) {
        map.remove();
        return;
      }

      // Controle de zoom no canto inferior direito
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Camada inicial de Basemap
      const initialTile = createBaseMapTileLayer(activeBaseMap);
      initialTile.addTo(map);
      tileLayerRef.current = initialTile;

      if (isExact) {
        // Localização COMPLETA: Marcador com pin na coordenada exata
        const pinIcon = L.divIcon({
          html: `
            <div style="
              width: 38px;
              height: 38px;
              border-radius: 50% 50% 50% 0;
              background: linear-gradient(135deg, #1E4620, #059669);
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 14px rgba(5, 150, 105, 0.45);
              border: 2px solid #FFFFFF;
            ">
              <div style="
                transform: rotate(45deg);
                color: #FFFFFF;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
            </div>
          `,
          className: 'public-property-exact-pin',
          iconSize: [38, 38],
          iconAnchor: [19, 38],
          popupAnchor: [0, -36],
        });

        const marker = L.marker([mapLat, mapLng], { icon: pinIcon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 13px; line-height: 1.4;">
            <strong style="color: #111827; font-size: 14px;">${title}</strong><br/>
            <span style="color: #059669; font-weight: 700;">Localização exata disponibilizada</span>
          </div>
        `);
      } else if (isApprox) {
        // Localização APROXIMADA: Círculo territorial + Indicador de Região (SEM PIN EXATO)
        const approxCircle = L.circle([mapLat, mapLng], {
          radius: 650,
          color: '#059669',
          weight: 2,
          opacity: 0.8,
          dashArray: '6, 6',
          fillColor: '#10B981',
          fillOpacity: 0.16,
        }).addTo(map);

        // Marcador territorial central estilizado com etiqueta de região
        const regionBadgeIcon = L.divIcon({
          html: `
            <div style="
              display: inline-flex;
              align-items: center;
              gap: 6px;
              padding: 6px 12px;
              border-radius: 9999px;
              background-color: rgba(255, 255, 255, 0.95);
              backdrop-filter: blur(6px);
              border: 1.5px solid #059669;
              box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);
              color: #065F46;
              font-size: 12px;
              font-weight: 700;
              white-space: nowrap;
              user-select: none;
            ">
              <span style="
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background-color: #059669;
                display: inline-block;
              "></span>
              <span>Região: ${neighborhood || 'Central'}</span>
            </div>
          `,
          className: 'public-property-approx-badge',
          iconSize: [140, 32],
          iconAnchor: [70, 16],
        });

        L.marker([mapLat, mapLng], { icon: regionBadgeIcon }).addTo(map);
        map.fitBounds(approxCircle.getBounds(), { padding: [25, 25], maxZoom: 15 });
      }

      mapRef.current = map;
    }

    initMap();

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapLat, mapLng, isExact, isApprox, title, neighborhood, zoomLevel]);

  // Atualiza basemap (Mapa vs Satélite) sem recriar o mapa Leaflet
  function handleBaseMapChange(newType: BaseMapType) {
    if (!mapRef.current) return;
    setActiveBaseMap(newType);

    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }
    const newTile = createBaseMapTileLayer(newType);
    newTile.addTo(mapRef.current);
    newTile.bringToBack();
    tileLayerRef.current = newTile;
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: '14px',
        overflow: 'hidden',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
        marginTop: '16px',
      }}
    >
      {/* Botão de Alternância Basemap (Mapa | Satélite) */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 500,
        }}
      >
        <BaseMapToggle
          activeBaseMap={activeBaseMap}
          onChange={handleBaseMapChange}
          compact
        />
      </div>

      {/* Selo Informativo de Privacidade no Topo do Mapa */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 500,
          backgroundColor: isExact ? 'rgba(30, 70, 32, 0.92)' : 'rgba(15, 23, 42, 0.82)',
          backdropFilter: 'blur(6px)',
          color: '#FFFFFF',
          padding: '6px 12px',
          borderRadius: '8px',
          fontSize: '0.76rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
          userSelect: 'none',
        }}
      >
        {isExact ? (
          <>
            <MapPin size={13} color="#86EFAC" />
            <span>Localização Exata</span>
          </>
        ) : (
          <>
            <Compass size={13} color="#6EE7B7" />
            <span>Localização Aproximada</span>
          </>
        )}
      </div>

      {/* Contêiner Leaflet */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '340px',
          backgroundColor: '#E5E7EB',
          zIndex: 1,
        }}
      />

      {/* Rodapé do Mapa com Explicação */}
      <div
        style={{
          padding: '10px 16px',
          backgroundColor: '#F8FAF9',
          borderTop: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          fontSize: '0.78rem',
          color: '#4B5563',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={14} color="#059669" />
          <span>
            {isExact
              ? `Endereço confirmado pela Daiane Corrêa Imóveis em ${city}.`
              : `Região territorial aproximada de ${neighborhood ? `Bairro ${neighborhood}, ` : ''}${city}. Para visitar o imóvel, solicite o agendamento.`}
          </span>
        </div>
        <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
          {activeBaseMap === 'satellite' ? 'Visão Aérea / Satélite' : 'Mapa de Vias'}
        </div>
      </div>
    </div>
  );
}
