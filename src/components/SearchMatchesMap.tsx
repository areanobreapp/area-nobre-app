'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import L from 'leaflet';
import {
  Building2,
  MapPin,
  ExternalLink,
  Sparkles,
  Bed,
  Bath,
  Car,
  Maximize2,
  X,
  Target,
  ChevronLeft,
  ChevronRight,
  Layers,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import CircularMatchScore from './CircularMatchScore';
import { calculateHaversineDistanceKm } from '@/lib/geo';
import {
  BaseMapType,
  createBaseMapTileLayer,
  getStoredBaseMapPreference,
  setStoredBaseMapPreference,
} from '@/lib/geo/basemaps';
import BaseMapToggle from './BaseMapToggle';

interface SearchMatchesMapProps {
  search: {
    id: string;
    name: string;
    purpose?: string;
    propertyTypes?: any;
    minPrice?: number | null;
    maxPrice?: number | null;
    minBedrooms?: number | null;
    referenceAddress?: string | null;
    referenceLatitude?: number | null;
    referenceLongitude?: number | null;
    maxRadiusKm?: number | null;
    locationStrategy?: string | null;
    searchLatitude?: number | null;
    searchLongitude?: number | null;
    searchRadiusMeters?: number | null;
    maxTravelTimeMinutes?: number | null;
    travelMode?: string | null;
    client?: {
      name?: string | null;
    } | null;
  };
  matches: any[];
  onOpenExplanation?: (match: any) => void;
  onExitSearch?: () => void;
}

export default function SearchMatchesMap({
  search,
  matches,
  onOpenExplanation,
  onExitSearch,
}: SearchMatchesMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const refLat = search.searchLatitude != null && !isNaN(search.searchLatitude)
    ? search.searchLatitude
    : search.referenceLatitude != null && !isNaN(search.referenceLatitude)
    ? search.referenceLatitude
    : null;

  const refLng = search.searchLongitude != null && !isNaN(search.searchLongitude)
    ? search.searchLongitude
    : search.referenceLongitude != null && !isNaN(search.referenceLongitude)
    ? search.referenceLongitude
    : null;

  const initialRadiusKm = search.searchRadiusMeters != null && !isNaN(search.searchRadiusMeters)
    ? Number(search.searchRadiusMeters) / 1000
    : search.maxRadiusKm != null && !isNaN(search.maxRadiusKm)
    ? Number(search.maxRadiusKm)
    : 3;

  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [currentRadiusKm, setCurrentRadiusKm] = useState<number>(initialRadiusKm);

  // Basemap Ativo: Mapa Vetorial ou Imagem de Satélite (Fase 4.3 / 5)
  const [activeBaseMap, setActiveBaseMap] = useState<BaseMapType>(() => getStoredBaseMapPreference());
  const baseMapLayerRef = useRef<L.TileLayer | null>(null);

  // Resumo amigável dos critérios para o banner operacional
  const criteriaSummary = useMemo(() => {
    const parts: string[] = [];
    if (search.purpose && search.purpose !== 'Todos') parts.push(search.purpose);
    if (search.propertyTypes) {
      const types = Array.isArray(search.propertyTypes)
        ? search.propertyTypes
        : typeof search.propertyTypes === 'string'
        ? JSON.parse(search.propertyTypes || '[]')
        : [];
      if (types.length > 0) parts.push(types.join(', '));
    }
    if (search.maxPrice) {
      parts.push(`até R$ ${Number(search.maxPrice).toLocaleString('pt-BR')}`);
    } else if (search.minPrice) {
      parts.push(`a partir de R$ ${Number(search.minPrice).toLocaleString('pt-BR')}`);
    }
    if (search.minBedrooms && search.minBedrooms > 0) {
      parts.push(`${search.minBedrooms}+ quartos`);
    }
    return parts.join(' • ');
  }, [search]);

  // Ordena os matches do maior para o menor score (Fase 4.1 - Item 2.5)
  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [matches]);

  // Filtra ofertas que possuem coordenadas válidas
  const geolocatedMatches = useMemo(() => {
    return sortedMatches.filter((m) => {
      const lat = m.offerType === 'TYPOLOGY'
        ? m.typology?.development?.latitude
        : m.property?.latitude;
      const lng = m.offerType === 'TYPOLOGY'
        ? m.typology?.development?.longitude
        : m.property?.longitude;
      return lat != null && lng != null && !isNaN(lat) && !isNaN(lng);
    });
  }, [sortedMatches]);

  const hasReferencePoint =
    refLat != null &&
    refLng != null &&
    !isNaN(refLat) &&
    !isNaN(refLng);

  function scrollToMatchCard(id: string) {
    setTimeout(() => {
      const card = document.getElementById(`match-card-${id}`);
      if (card && carouselRef.current) {
        card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }, 60);
  }

  function scrollCarousel(direction: 'left' | 'right') {
    if (carouselRef.current) {
      const amount = direction === 'left' ? -320 : 320;
      carouselRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  }

  function handleCardClick(m: any) {
    setSelectedMatch(m);
    const isTypology = m.offerType === 'TYPOLOGY';
    const lat = isTypology ? m.typology?.development?.latitude : m.property?.latitude;
    const lng = isTypology ? m.typology?.development?.longitude : m.property?.longitude;
    if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
      const map = mapInstanceRef.current;
      if (map) {
        map.flyTo([lat, lng], 16, { animate: true, duration: 0.8 });
      }
    }
    scrollToMatchCard(m.id);
  }

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centro inicial: se houver ponto de referência, usa ele; senão o primeiro match ou Criciúma
    const initialCenter: [number, number] = hasReferencePoint
      ? [refLat!, refLng!]
      : geolocatedMatches.length > 0
      ? [
          geolocatedMatches[0].offerType === 'TYPOLOGY'
            ? geolocatedMatches[0].typology.development.latitude
            : geolocatedMatches[0].property.latitude,
          geolocatedMatches[0].offerType === 'TYPOLOGY'
            ? geolocatedMatches[0].typology.development.longitude
            : geolocatedMatches[0].property.longitude,
        ]
      : [-28.6775, -49.3700];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 14,
      zoomControl: true,
    });

    const tileLayer = createBaseMapTileLayer(activeBaseMap, () => {
      setActiveBaseMap('street');
    });
    tileLayer.addTo(map);
    baseMapLayerRef.current = tileLayer;

    const markersGroup = L.featureGroup().addTo(map);

    // 1. Adiciona Ponto de Referência e Círculo de Raio
    if (hasReferencePoint) {
      const refIcon = L.divIcon({
        html: `
          <div style="
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: #1D4ED8;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(29, 78, 216, 0.45);
            border: 3px solid white;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="6"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
          </div>
        `,
        className: 'ref-marker-pin',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      const refMarker = L.marker([refLat!, refLng!], {
        icon: refIcon,
        zIndexOffset: 1000,
      }).addTo(markersGroup);

      if (search.locationStrategy === 'TRAVEL_TIME') {
        refMarker.bindPopup(`
          <div style="font-family: inherit; font-size: 13px;">
            <strong style="color: #1D4ED8;">Ponto de Referência — Tempo de Carro</strong><br/>
            <span>${search.referenceAddress || 'Origem da Busca'}</span><br/>
            <span style="font-size: 11px; color: #1D4ED8; font-weight: 700;">🚗 Máx: ${search.maxTravelTimeMinutes || 15} min de carro</span><br/>
            <span style="font-size: 10px; color: #6B7280; font-style: italic;">Estimativa baseada na rede viária; não considera trânsito em tempo real.</span>
          </div>
        `);
      } else {
        const displayRadius = currentRadiusKm >= 1
          ? `${currentRadiusKm % 1 === 0 ? currentRadiusKm.toFixed(0) : currentRadiusKm.toFixed(1).replace('.', ',')} km`
          : `${Math.round(currentRadiusKm * 1000)} m`;

        refMarker.bindPopup(`
          <div style="font-family: inherit; font-size: 13px;">
            <strong style="color: #1D4ED8;">Ponto de Referência da Busca</strong><br/>
            <span>${search.referenceAddress || 'Região Selecionada da Busca'}</span><br/>
            <span style="font-size: 11px; color: #4B5563; font-weight: 600;">Raio: ${displayRadius}</span>
          </div>
        `);

        // Círculo de Raio Geográfico (Secundário aos imóveis, perceptível)
        const radiusMeters = currentRadiusKm * 1000;
        const circle = L.circle([refLat!, refLng!], {
          radius: radiusMeters,
          color: '#1D4ED8',
          fillColor: '#3B82F6',
          fillOpacity: 0.08,
          weight: 2,
          dashArray: '5, 8',
        }).addTo(map);

        circleRef.current = circle;
      }
    }

    // 2. Adiciona Marcadores das Ofertas Compatíveis
    geolocatedMatches.forEach((m) => {
      const isTypology = m.offerType === 'TYPOLOGY';
      const lat = isTypology ? m.typology.development.latitude : m.property.latitude;
      const lng = isTypology ? m.typology.development.longitude : m.property.longitude;
      const score = m.score || 0;

      // Cor do marcador baseada no score do match
      const scoreColor = score >= 80 ? '#1E4620' : score >= 70 ? '#1D4ED8' : '#D97706';

      const pinHtml = `
        <div style="position: relative; width: 38px; height: 46px; cursor: pointer;">
          <!-- Etiqueta do tipo/empreendimento acima da bolha, centrada no eixo X (19px) -->
          <div style="
            position: absolute;
            bottom: 48px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            padding: 2px 7px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 700;
            box-shadow: 0 2px 6px rgba(0,0,0,0.15);
            border: 1px solid var(--border-light);
            white-space: nowrap;
            margin: 0;
            pointer-events: none;
            z-index: 10;
          ">
            ${isTypology ? 'Construção' : (m.property.propertyType || 'Imóvel')}
          </div>

          <!-- Pin Teardrop Vetorial Exato (Ponta em 19, 46) -->
          <svg width="38" height="46" viewBox="0 0 38 46" style="position: absolute; top: 0; left: 0; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.28)); pointer-events: none;">
            <path d="M19,46 C17.5,43 2,28 2,19 A17,17 0 1,1 36,19 C36,28 20.5,43 19,46 Z" fill="${scoreColor}" stroke="#FFFFFF" stroke-width="2"/>
          </svg>

          <!-- Score centrado na cabeça do pin (x=19, y=19) -->
          <div style="position: absolute; top: 0; left: 0; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: 800; pointer-events: none;">
            ${score}%
          </div>
        </div>
      `;

      const matchIcon = L.divIcon({
        html: pinHtml,
        className: 'match-pin',
        iconSize: [38, 46],
        iconAnchor: [19, 46],
        popupAnchor: [0, -46],
      });

      const marker = L.marker([lat, lng], { icon: matchIcon }).addTo(markersGroup);

      marker.on('click', () => {
        setSelectedMatch(m);
        map.panTo([lat, lng], { animate: true });
        scrollToMatchCard(m.id);
      });
    });

    // Ajusta visualização aos limites de todos os elementos
    if (markersGroup.getLayers().length > 0) {
      map.fitBounds(markersGroup.getBounds(), {
        padding: [50, 50],
        maxZoom: 15,
        animate: true,
      });
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      circleRef.current = null;
    };
  }, [geolocatedMatches, hasReferencePoint]);

  // Atualiza círculo quando o corretor ajusta o raio dinamicamente
  function handleRadiusChange(newRadius: number) {
    if (newRadius < 0.5) return;
    setCurrentRadiusKm(newRadius);
    if (circleRef.current) {
      circleRef.current.setRadius(newRadius * 1000);
      if (mapInstanceRef.current && hasReferencePoint) {
        mapInstanceRef.current.fitBounds(circleRef.current.getBounds(), {
          padding: [40, 40],
          maxZoom: 15,
        });
      }
    }
  }

  // Alterna o tile layer entre Mapa e Imagem de Satélite preservando pins, raios e zoom
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (baseMapLayerRef.current) {
      map.removeLayer(baseMapLayerRef.current);
      baseMapLayerRef.current = null;
    }

    const newLayer = createBaseMapTileLayer(activeBaseMap, () => {
      setActiveBaseMap('street');
    });

    newLayer.addTo(map);
    newLayer.bringToBack();
    baseMapLayerRef.current = newLayer;

    setStoredBaseMapPreference(activeBaseMap);
  }, [activeBaseMap]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* 0. Banner do Modo de Busca Operacional (Fase 5 - Requisitos 4 e 5) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          backgroundColor: '#1E4620',
          color: 'white',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 2px 8px rgba(30, 70, 32, 0.25)',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#86EFAC', fontWeight: 800 }}>
              Buscando para
            </span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#86EFAC' }} />
            <span style={{ fontSize: '0.78rem', color: '#D1FAE5' }}>
              {sortedMatches.length} {sortedMatches.length === 1 ? 'oportunidade no mapa' : 'oportunidades no mapa'}
            </span>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '2px', color: '#FFFFFF' }}>
            {search.client?.name ? search.client.name : search.name}
          </div>
          {criteriaSummary && (
            <div style={{ fontSize: '0.84rem', color: '#D1FAE5', marginTop: '2px' }}>
              {criteriaSummary}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onExitSearch ? (
            <button
              type="button"
              onClick={onExitSearch}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: 'white',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              <X size={14} />
              <span>Sair da busca</span>
            </button>
          ) : (
            <Link
              href="/buscas"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: 'white',
                fontSize: '0.82rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <X size={14} />
              <span>Sair da busca</span>
            </Link>
          )}
        </div>
      </div>

      {/* 1. Container do Mapa Leaflet */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '460px',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)',
          backgroundColor: '#E5E7EB',
        }}
      >
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {/* Controles Flutuantes Superiores */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            right: 12,
            zIndex: 500,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(6px)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-sm)',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              pointerEvents: 'auto',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />
            <span>
              {geolocatedMatches.length} de {matches.length} ofertas no mapa
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto' }}>
            {hasReferencePoint && (
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(6px)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border-light)',
                  boxShadow: 'var(--shadow-sm)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Target size={14} color="#1D4ED8" />
                <span>Raio: {currentRadiusKm} km</span>
                <div style={{ display: 'flex', gap: '2px' }}>
                  <button
                    type="button"
                    onClick={() => handleRadiusChange(currentRadiusKm - 0.5)}
                    style={{
                      width: 20,
                      height: 20,
                      border: '1px solid #D1D5DB',
                      background: '#F3F4F6',
                      borderRadius: 4,
                      fontSize: 12,
                      cursor: 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRadiusChange(currentRadiusKm + 0.5)}
                    style={{
                      width: 20,
                      height: 20,
                      border: '1px solid #D1D5DB',
                      background: '#F3F4F6',
                      borderRadius: 4,
                      fontSize: 12,
                      cursor: 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <BaseMapToggle
              activeBaseMap={activeBaseMap}
              onChange={setActiveBaseMap}
              compact
            />
          </div>
        </div>

        {/* Preview Flutuante do Marcador Selecionado */}
        {selectedMatch && (
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              right: 16,
              maxWidth: '460px',
              margin: '0 auto',
              zIndex: 600,
              backgroundColor: 'white',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-floating)',
              border: '1px solid var(--border-light)',
              padding: '14px',
              animation: 'fadeInSlide 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CircularMatchScore score={selectedMatch.score} size={36} strokeWidth={3} />
                <div>
                  <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-primary)', fontWeight: 800 }}>
                    {selectedMatch.offerType === 'TYPOLOGY' ? 'Em Construção' : selectedMatch.property?.propertyType}
                  </span>
                  <h4 style={{ fontSize: '0.96rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                    {selectedMatch.offerType === 'TYPOLOGY'
                      ? `${selectedMatch.typology?.development?.name} — ${selectedMatch.typology?.name}`
                      : selectedMatch.property?.title}
                  </h4>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMatch(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
              >
                <X size={18} color="#6B7280" />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.84rem' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                {selectedMatch.offerType === 'TYPOLOGY' ? 'A partir de ' : ''}
                R${' '}
                {(selectedMatch.offerType === 'TYPOLOGY'
                  ? selectedMatch.typology?.price
                  : selectedMatch.property?.price
                )?.toLocaleString('pt-BR')}
              </span>

              {hasReferencePoint && (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  📍{' '}
                  {calculateHaversineDistanceKm(
                    search.referenceLatitude!,
                    search.referenceLongitude!,
                    selectedMatch.offerType === 'TYPOLOGY'
                      ? selectedMatch.typology.development.latitude
                      : selectedMatch.property.latitude,
                    selectedMatch.offerType === 'TYPOLOGY'
                      ? selectedMatch.typology.development.longitude
                      : selectedMatch.property.longitude
                  ).toFixed(1)}{' '}
                  km do ponto
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              {onOpenExplanation && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => onOpenExplanation(selectedMatch)}
                  style={{ flex: 1, padding: '8px 12px', fontSize: '0.82rem', justifyContent: 'center' }}
                >
                  <Sparkles size={14} />
                  <span>Por que combina</span>
                </button>
              )}
              <Link
                href={
                  selectedMatch.offerType === 'TYPOLOGY'
                    ? `/empreendimentos/${selectedMatch.typology?.development?.id}`
                    : `/imoveis/${selectedMatch.property?.id}`
                }
                className="btn-primary"
                style={{ flex: 1, padding: '8px 12px', fontSize: '0.82rem', justifyContent: 'center', textDecoration: 'none' }}
              >
                <span>Ver detalhes</span>
                <ExternalLink size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 2. CARROSSEL DE OFERTAS COMPATÍVEIS (MAPA + CARDS SIMULTÂNEOS — FASE 4.1) */}
      <div
        className="card"
        style={{
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          backgroundColor: 'white',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.02rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Ofertas Compatíveis no Território
                </h3>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    backgroundColor: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                  }}
                >
                  {sortedMatches.length} {sortedMatches.length === 1 ? 'match' : 'matches'} ordenados
                </span>
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Cruzamento simultâneo entre score de compatibilidade, imóvel e localização no mapa.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => scrollCarousel('left')}
              title="Rolar para esquerda"
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                border: '1px solid var(--border-light)',
                backgroundColor: 'white',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel('right')}
              title="Rolar para direita"
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                border: '1px solid var(--border-light)',
                backgroundColor: 'white',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Trilho de Cards de Matches */}
        {sortedMatches.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
            Nenhuma oferta compatível cadastrada para esta busca.
          </div>
        ) : (
          <div
            ref={carouselRef}
            style={{
              display: 'flex',
              gap: '14px',
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              padding: '6px 2px 14px 2px',
              scrollBehavior: 'smooth',
            }}
          >
            {sortedMatches.map((m) => {
              const isSelected = selectedMatch?.id === m.id;
              const isTypology = m.offerType === 'TYPOLOGY';
              const offerTitle = isTypology
                ? `${m.typology?.development?.name} — ${m.typology?.name}`
                : m.property?.title;
              const offerImage = isTypology
                ? m.typology?.development?.images?.[0]?.url
                : m.property?.images?.[0]?.url;
              const offerPrice = isTypology ? m.typology?.price : m.property?.price;
              const offerNeighborhood = isTypology
                ? m.typology?.development?.neighborhood
                : m.property?.neighborhood;
              const offerCity = isTypology
                ? m.typology?.development?.city
                : m.property?.city;
              const stage = isTypology
                ? (m.typology?.development?.stage || 'Em construção')
                : (m.property?.propertyType || 'Imóvel');

              const hasCoords = isTypology
                ? m.typology?.development?.latitude != null
                : m.property?.latitude != null;

              const distanceKm =
                hasReferencePoint && hasCoords
                  ? calculateHaversineDistanceKm(
                      search.referenceLatitude!,
                      search.referenceLongitude!,
                      isTypology ? m.typology.development.latitude : m.property.latitude,
                      isTypology ? m.typology.development.longitude : m.property.longitude
                    )
                  : null;

              return (
                <div
                  key={m.id}
                  id={`match-card-${m.id}`}
                  onClick={() => handleCardClick(m)}
                  style={{
                    flex: '0 0 280px',
                    width: '280px',
                    scrollSnapAlign: 'start',
                    backgroundColor: 'white',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--border-light)',
                    boxShadow: isSelected ? '0 6px 20px rgba(30, 70, 32, 0.20)' : 'var(--shadow-xs)',
                    transform: isSelected ? 'translateY(-2px)' : 'none',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {/* Foto com object-fit: contain (Fase 4.1) */}
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '135px',
                      backgroundColor: '#F3F4F6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {offerImage ? (
                      <img
                        src={offerImage}
                        alt={offerTitle}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                        }}
                      />
                    ) : (
                      <div style={{ color: 'var(--text-light)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <Building2 size={28} />
                        <span style={{ fontSize: '0.70rem' }}>Sem foto</span>
                      </div>
                    )}

                    {/* Badge de Score de Compatibilidade */}
                    <div style={{ position: 'absolute', top: 8, left: 8 }}>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: m.score >= 80 ? '#1E4620' : m.score >= 70 ? '#1D4ED8' : '#D97706',
                          color: 'white',
                          fontSize: '0.70rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: 4,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Sparkles size={11} />
                        {m.score}%{(() => {
                          if (search.locationStrategy !== 'TRAVEL_TIME') return ' compatível';
                          const parsed = typeof m.explanation === 'string' ? JSON.parse(m.explanation || '[]') : (m.parsedExplanation || []);
                          const travelItem = parsed.find((e: any) => e.category === 'location' && (e.title?.includes('min') || e.detail?.includes('carro')));
                          const matchMinutes = travelItem?.title?.match(/(\d+)\s*min/);
                          return matchMinutes ? ` · 🚗 ${matchMinutes[1]} min` : ' compatível';
                        })()}
                      </span>
                    </div>

                    {/* Badge do Tipo / Estágio */}
                    <div style={{ position: 'absolute', top: 8, right: 8 }}>
                      <span
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.92)',
                          backdropFilter: 'blur(4px)',
                          color: 'var(--text-primary)',
                          fontSize: '0.64rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          border: '1px solid var(--border-light)',
                        }}
                      >
                        {stage}
                      </span>
                    </div>

                    {search.locationStrategy === 'TRAVEL_TIME' ? (
                      (() => {
                        const parsed = typeof m.explanation === 'string' ? JSON.parse(m.explanation || '[]') : (m.parsedExplanation || []);
                        const travelItem = parsed.find((e: any) => e.category === 'location' && (e.title?.includes('min') || e.detail?.includes('carro')));
                        const matchMinutes = travelItem?.title?.match(/(\d+)\s*min/);
                        return matchMinutes ? (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 6,
                              left: 6,
                              backgroundColor: 'rgba(15, 23, 42, 0.85)',
                              color: 'white',
                              fontSize: '0.66rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}
                          >
                            🚗 {matchMinutes[1]} min de carro
                          </div>
                        ) : null;
                      })()
                    ) : distanceKm !== null ? (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 6,
                          left: 6,
                          backgroundColor: 'rgba(15, 23, 42, 0.85)',
                          color: 'white',
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}
                      >
                        📍 {distanceKm.toFixed(1)} km do ponto
                      </div>
                    ) : null}
                  </div>

                  {/* Informações do Card */}
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-primary)', lineHeight: 1.2 }}>
                      {isTypology ? (
                        <>
                          <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginRight: 4 }}>
                            A partir de
                          </span>
                          {offerPrice > 0 ? `R$ ${offerPrice.toLocaleString('pt-BR')}` : 'Consulte'}
                        </>
                      ) : (
                        `R$ ${(offerPrice || 0).toLocaleString('pt-BR')}`
                      )}
                    </div>

                    <h4
                      style={{
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        margin: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={offerTitle}
                    >
                      {offerTitle}
                    </h4>

                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <MapPin size={12} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {offerNeighborhood ? `${offerNeighborhood}, ` : ''}{offerCity || 'Criciúma'}
                      </span>
                    </div>

                    {/* Ações: "Por que combina?" e "Ver detalhes" */}
                    <div style={{ marginTop: 'auto', paddingTop: '8px', display: 'flex', gap: '6px' }}>
                      {onOpenExplanation && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenExplanation(m);
                          }}
                          className="btn-secondary"
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            fontSize: '0.72rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                          }}
                        >
                          <HelpCircle size={12} />
                          <span>Por que combina?</span>
                        </button>
                      )}
                      <Link
                        href={
                          isTypology
                            ? `/empreendimentos/${m.typology?.development?.id}`
                            : `/imoveis/${m.property?.id}`
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="btn-primary"
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          fontSize: '0.72rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          textDecoration: 'none',
                        }}
                      >
                        <span>Ver oferta</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
