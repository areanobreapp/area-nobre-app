'use client';

import React, { useEffect, useRef, useState } from 'react';
import type L from 'leaflet';
import { MapPin, Pentagon, Compass } from 'lucide-react';
import { BaseMapType, createBaseMapTileLayer } from '@/lib/geo/basemaps';
import BaseMapToggle from '@/components/BaseMapToggle';
import NavigationActionButtons from '@/components/NavigationActionButtons';
import { parseGeoJsonToLatLngs } from '@/lib/geo/polygon';

interface BuildingSharedMapProps {
  latitude: number | null;
  longitude: number | null;
  boundary: string | null;
  boundaryArea: number | null;
  buildingName: string;
  address?: string | null;
}

export default function BuildingSharedMap({
  latitude,
  longitude,
  boundary,
  boundaryArea,
  buildingName,
  address,
}: BuildingSharedMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [activeBaseMap, setActiveBaseMap] = useState<BaseMapType>('street');

  const hasCoords =
    latitude !== null &&
    longitude !== null &&
    !isNaN(latitude) &&
    !isNaN(longitude);

  const parsedBoundary = parseGeoJsonToLatLngs(boundary);
  const hasBoundary = Boolean(parsedBoundary && parsedBoundary.length >= 3);

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
        zoom: hasBoundary ? 18 : 17,
        zoomControl: false,
        scrollWheelZoom: false,
        attributionControl: false,
      });

      const tileLayer = createBaseMapTileLayer(activeBaseMap);
      tileLayer.addTo(map);
      tileLayerRef.current = tileLayer;

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const layersGroup = L.featureGroup();

      // 1. Perímetro Territorial do Terreno Coletivo (se disponível)
      if (hasBoundary && parsedBoundary) {
        const polygon = L.polygon(
          parsedBoundary.map((pt) => [pt.lat, pt.lng]),
          {
            color: '#1E4620',
            weight: 2.5,
            fillColor: '#16A34A',
            fillOpacity: 0.18,
            dashArray: '3, 5',
          }
        );

        polygon.bindPopup(`
          <div style="font-family: inherit; font-size: 13px; line-height: 1.4;">
            <strong style="color: #1E4620;">${buildingName}</strong><br/>
            <span>Terreno Coletivo: <strong>${boundaryArea ? `${Math.round(boundaryArea)} m²` : 'Delimitado'}</strong></span>
          </div>
        `);
        layersGroup.addLayer(polygon);
      }

      // 2. Marcador Agulha de Precisão Oficial (Especificação Geométrica J.2.B: 24x44px, âncora [12, 43.5])
      const needleHtml = `
        <div style="position: relative; width: 24px; height: 44px; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 3px 5px rgba(0,0,0,0.38));">
          <svg width="24" height="44" viewBox="0 0 24 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Esfera da Agulha (x=12, y=9.5, raio=7.5) -->
            <circle cx="12" cy="9.5" r="7.5" fill="#1E4620" stroke="#FFFFFF" stroke-width="2"/>
            <circle cx="10" cy="7.5" r="2" fill="#FFFFFF" fill-opacity="0.6"/>
            <!-- Haste Vertical (extensão de 27.5px de y=16 até y=43.5) -->
            <line x1="12" y1="16" x2="12" y2="43.5" stroke="#1F2937" stroke-width="2.5" stroke-linecap="round"/>
            <!-- Ponta de Contato Matemático com o Terreno (x=12, y=43.5) -->
            <circle cx="12" cy="43.5" r="1.2" fill="#111827"/>
          </svg>
        </div>
      `;

      const needleIcon = L.divIcon({
        html: needleHtml,
        className: 'building-needle-pin',
        iconSize: [24, 44],
        iconAnchor: [12, 43.5],
        popupAnchor: [0, -44],
      });

      const marker = L.marker([latitude!, longitude!], { icon: needleIcon });
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; line-height: 1.4; padding: 2px;">
          <strong style="color: #111827;">${buildingName}</strong><br/>
          <span style="color: #1E4620; font-weight: 700;">Localização do Condomínio</span>
        </div>
      `);
      layersGroup.addLayer(marker);

      layersGroup.addTo(map);

      // Ajuste de visualização
      if (hasBoundary && parsedBoundary) {
        map.fitBounds(layersGroup.getBounds(), { padding: [40, 40], maxZoom: 18 });
      } else {
        map.setView([latitude!, longitude!], 17);
      }

      mapRef.current = map;

      // Observador para ajuste automático de redimensionamento
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
  }, [hasCoords, latitude, longitude, hasBoundary, boundary, boundaryArea, buildingName, activeBaseMap]);

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

  if (!hasCoords) {
    return (
      <section
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E5E7EB',
          padding: '24px',
          textAlign: 'center',
          color: '#6B7280',
        }}
      >
        <MapPin size={28} style={{ color: '#9CA3AF', margin: '0 auto 8px auto' }} />
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#374151', margin: '0 0 4px 0' }}>
          Localização Geográfica em Atualização
        </h3>
        <p style={{ fontSize: '0.84rem', margin: 0 }}>
          As coordenadas exatas deste condomínio estão sendo verificadas pela comunidade de corretores.
        </p>
      </section>
    );
  }

  return (
    <section
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={18} style={{ color: '#1E4620' }} />
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            Localização e Perímetro Territorial
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {hasBoundary && (
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#15803D',
                backgroundColor: '#F0FDF4',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid #BBF7D0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Pentagon size={12} />
              <span>{boundaryArea ? `${Math.round(boundaryArea)} m²` : 'Lote demarcado'}</span>
            </span>
          )}

          <BaseMapToggle activeBaseMap={activeBaseMap} onChange={handleBaseMapChange} />
        </div>
      </div>

      {/* Container Leaflet */}
      <div
        ref={containerRef}
        id="building-shared-map"
        style={{
          width: '100%',
          height: '280px',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#E5E7EB',
          position: 'relative',
          zIndex: 1,
        }}
      />

      {/* Botões de Ação Rápida e Rotas */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <span style={{ fontSize: '0.80rem', color: '#6B7280' }}>
          {address || 'Criciúma - SC'}
        </span>

        <NavigationActionButtons
          latitude={latitude!}
          longitude={longitude!}
          size="sm"
        />
      </div>
    </section>
  );
}

