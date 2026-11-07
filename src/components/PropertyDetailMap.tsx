'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type L from 'leaflet';
import { MapPin, Pentagon, Edit3, Compass, ShieldCheck } from 'lucide-react';
import { BaseMapType, createBaseMapTileLayer } from '@/lib/geo/basemaps';
import BaseMapToggle from './BaseMapToggle';
import NavigationActionButtons from './NavigationActionButtons';
import { parseGeoJsonToLatLngs, calculatePolygonCentroid } from '@/lib/geo/polygon';

export interface PropertyDetailMapProps {
  latitude?: number | null;
  longitude?: number | null;
  boundary?: string | null;
  boundaryArea?: number | null;
  title?: string;
  propertyType?: string;
  address?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  propertyId: string;
  isOwner?: boolean;
}

export default function PropertyDetailMap({
  latitude,
  longitude,
  boundary,
  boundaryArea,
  title = 'Imóvel',
  propertyType = 'Imóvel',
  address,
  number,
  neighborhood,
  city = 'Criciúma',
  state = 'SC',
  propertyId,
  isOwner = false,
}: PropertyDetailMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [activeBaseMap, setActiveBaseMap] = useState<BaseMapType>('street');

  // Validação de coordenadas
  const hasExactCoords =
    latitude !== null &&
    latitude !== undefined &&
    longitude !== null &&
    longitude !== undefined &&
    !isNaN(latitude) &&
    !isNaN(longitude);

  // Validação de demarcação (perímetro / polígono)
  const parsedBoundary = parseGeoJsonToLatLngs(boundary);
  const hasBoundary = Boolean(parsedBoundary && parsedBoundary.length >= 3);

  // Centróide do perímetro (usado como ponto focal caso só haja o polígono cadastrado)
  const boundaryCentroid = hasBoundary
    ? calculatePolygonCentroid(parsedBoundary!.map((pt) => [pt.lng, pt.lat]))
    : null;

  const effectiveLat = hasExactCoords
    ? latitude!
    : boundaryCentroid
    ? boundaryCentroid[1]
    : null;

  const effectiveLng = hasExactCoords
    ? longitude!
    : boundaryCentroid
    ? boundaryCentroid[0]
    : null;

  const hasAnyLocation = effectiveLat !== null && effectiveLng !== null;

  useEffect(() => {
    if (!hasAnyLocation || !containerRef.current || typeof window === 'undefined') return;

    let isCancelled = false;

    async function initMap() {
      const L = (await import('leaflet')).default;
      if (isCancelled || !containerRef.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(containerRef.current, {
        center: [effectiveLat!, effectiveLng!],
        zoom: hasBoundary ? 17 : 16,
        zoomControl: false,
        scrollWheelZoom: false, // Não intercepta a rolagem vertical da página
        attributionControl: false,
      });

      if (isCancelled || !containerRef.current) {
        map.remove();
        return;
      }

      // Controles de zoom no canto inferior direito
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Basemap inicial (Vias ou Satélite)
      const initialTile = createBaseMapTileLayer(activeBaseMap);
      initialTile.addTo(map);
      tileLayerRef.current = initialTile;

      const layersGroup = L.featureGroup();

      // 1. Renderiza Polígono de Demarcação do Terreno, se cadastrado
      if (hasBoundary && parsedBoundary) {
        const polygon = L.polygon(
          parsedBoundary.map((pt) => [pt.lat, pt.lng]),
          {
            color: '#1E4620',
            weight: 2.5,
            opacity: 0.95,
            fillColor: '#059669',
            fillOpacity: activeBaseMap === 'satellite' ? 0.35 : 0.22,
          }
        );

        const areaFormatted = boundaryArea
          ? `${Math.round(boundaryArea).toLocaleString('pt-BR')} m²`
          : `${parsedBoundary.length} vértices`;

        polygon.bindPopup(`
          <div style="font-family: inherit; font-size: 13px; line-height: 1.4; padding: 2px;">
            <strong style="color: #1E4620;">Terreno demarcado</strong><br/>
            <span>Área calculada: <strong>${areaFormatted}</strong></span>
          </div>
        `);

        polygon.addTo(layersGroup);
      }

      // 2. Renderiza Pin Exato se houver coordenadas pontuais cadastradas
      if (hasExactCoords) {
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
          className: 'property-detail-pin',
          iconSize: [38, 38],
          iconAnchor: [19, 38],
          popupAnchor: [0, -36],
        });

        const marker = L.marker([latitude!, longitude!], { icon: pinIcon });
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 13px; line-height: 1.4; padding: 2px;">
            <strong style="color: #111827;">${title}</strong><br/>
            <span style="color: #059669; font-weight: 700;">Localização Cadastrada</span>
          </div>
        `);
        marker.addTo(layersGroup);
      }

      layersGroup.addTo(map);

      // Enquadramento suave
      if (hasBoundary && parsedBoundary) {
        map.fitBounds(layersGroup.getBounds(), { padding: [45, 45], maxZoom: 17 });
      } else {
        map.setView([effectiveLat!, effectiveLng!], 16);
      }

      mapRef.current = map;

      // Observador de redimensionamento para manter o mapa fluido (Etapa 3A / Ponto 1)
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
  }, [hasAnyLocation, effectiveLat, effectiveLng, hasExactCoords, hasBoundary, boundary, boundaryArea, title, activeBaseMap]);

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

  // Monta linha textual do endereço cadastrado
  const addressLine = [
    address ? `${address}${number ? `, ${number}` : ''}` : null,
    neighborhood ? `Bairro ${neighborhood}` : null,
    city ? (state ? `${city} - ${state}` : city) : null,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Cabeçalho da Seção */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={20} color="var(--color-primary)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Localização do imóvel
            </h2>
            {hasBoundary && (
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  backgroundColor: '#EBF4EC',
                  color: '#1E4620',
                  border: '1px solid #C4E2C7',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Pentagon size={12} />
                <span>Terreno demarcado</span>
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            {addressLine || 'Endereço não informado.'}
          </p>
        </div>

        {isOwner && (
          <Link
            href={`/imoveis/${propertyId}/editar`}
            className="btn-secondary"
            style={{
              padding: '6px 12px',
              fontSize: '0.80rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Edit3 size={14} />
            <span>Ajustar no mapa</span>
          </Link>
        )}
      </div>

      {/* Caso NÃO haja coordenadas nem demarcação cadastradas */}
      {!hasAnyLocation ? (
        <div
          style={{
            padding: '36px 20px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: '#F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <Compass size={22} />
          </div>
          <div>
            <strong style={{ fontSize: '0.96rem', color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>
              Localização no mapa ainda não cadastrada.
            </strong>
            <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              O imóvel possui informações de endereço em texto, mas suas coordenadas geográficas ainda não foram marcadas.
            </span>
          </div>
          {isOwner && (
            <Link
              href={`/imoveis/${propertyId}/editar`}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.84rem', marginTop: '4px' }}
            >
              Definir localização no mapa
            </Link>
          )}
        </div>
      ) : (
        /* Caso HAJA localização válida cadastrada */
        <div
          className="home-map-outer-wrapper"
          style={{
            position: 'relative',
            width: '100%',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-sm)',
            backgroundColor: '#E5E7EB',
          }}
        >
          <div className="home-map-inner-container" style={{ position: 'relative', width: '100%' }}>
            {/* Seletor de Basemap no topo direito */}
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

            {/* Badge de tipo de localização no topo esquerdo */}
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                zIndex: 500,
                backgroundColor: 'rgba(30, 70, 32, 0.92)',
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
              {hasBoundary ? (
                <>
                  <Pentagon size={13} color="#86EFAC" />
                  <span>
                    Terreno demarcado{' '}
                    {boundaryArea ? `(${Math.round(boundaryArea).toLocaleString('pt-BR')} m²)` : ''}
                  </span>
                </>
              ) : (
                <>
                  <MapPin size={13} color="#86EFAC" />
                  <span>Localização Cadastrada</span>
                </>
              )}
            </div>

            {/* Elemento Leaflet */}
            <div
              ref={containerRef}
              style={{
                width: '100%',
                height: '360px',
                backgroundColor: '#E5E7EB',
                zIndex: 1,
              }}
            />

            {/* Rodapé Interno do Mapa — Preparação para Etapa 3D (Rotas) */}
            <div
              style={{
                padding: '10px 16px',
                backgroundColor: '#F8FAF9',
                borderTop: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                fontSize: '0.80rem',
                color: 'var(--text-secondary)',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={14} color="#059669" />
                <span>
                  Área interna do corretor • Coordenadas exatas cadastradas:{' '}
                  <strong>
                    {hasExactCoords ? `${latitude!.toFixed(5)}, ${longitude!.toFixed(5)}` : 'Vértices do terreno'}
                  </strong>
                </span>
              </div>

              {/* Contêiner de Ações (Botões de Navegação Google Maps / Waze - Etapa 3D.1) */}
              <div id="property-detail-map-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <NavigationActionButtons latitude={effectiveLat} longitude={effectiveLng} size="sm" />
                <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                  {activeBaseMap === 'satellite' ? 'Visão Aérea / Satélite' : 'Mapa de Vias'}
                </span>
              </div>
            </div>
          </div>

          {/* Faixa lateral livre à direita no mobile para rolagem suave (Etapa 3A / Ponto 1) */}
          <div
            className="home-map-scroll-strip"
            title="Deslize o dedo nesta faixa lateral para rolar a página verticalmente"
            aria-label="Faixa lateral para rolagem da página"
          >
            <div className="home-map-scroll-strip-text">
              <span>↓ Rolar página</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
