'use client';

import React, { useEffect, useRef, useState, useId } from 'react';
import L from 'leaflet';
import {
  Check,
  X,
  Undo2,
  Trash2,
  Layers,
  Info,
  Maximize2,
  Pentagon,
  MousePointerClick,
  Move,
  AlertCircle
} from 'lucide-react';
import {
  calculateSphericalArea,
  leafletLatLngsToGeoJsonPolygon,
  parseGeoJsonToLatLngs
} from '@/lib/geo/polygon';
import {
  BaseMapType,
  createBaseMapTileLayer,
  getStoredBaseMapPreference,
  setStoredBaseMapPreference,
} from '@/lib/geo/basemaps';
import BaseMapToggle from './BaseMapToggle';

export interface ParcelBoundaryModalProps {
  isOpen: boolean;
  initialBoundary?: string | null;
  centerLat: number;
  centerLng: number;
  informedArea?: number | null; // Área documental informada (m²)
  onConfirm: (geoJsonString: string, approximateAreaM2: number) => void;
  onRemove?: () => void;
  onCancel: () => void;
  title?: string;
}

export default function ParcelBoundaryModal({
  isOpen,
  initialBoundary,
  centerLat,
  centerLng,
  informedArea,
  onConfirm,
  onRemove,
  onCancel,
  title = 'Delimitação do Terreno no Mapa',
}: ParcelBoundaryModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const polylineLayerRef = useRef<L.Polyline | null>(null);
  const vertexMarkersRef = useRef<L.Marker[]>([]);
  const baseMapLayerRef = useRef<L.TileLayer | null>(null);

  // Basemap ativo (Mapa vetorial ou Satélite) persistido localmente
  const [activeBaseMap, setActiveBaseMap] = useState<BaseMapType>(() => getStoredBaseMapPreference());

  // Vertices do polígono: array de { lat, lng }
  const [vertices, setVertices] = useState<{ lat: number; lng: number }[]>(() => {
    if (initialBoundary) {
      const parsed = parseGeoJsonToLatLngs(initialBoundary);
      if (parsed && parsed.length >= 3) return parsed;
    }
    return [];
  });

  const [isClosed, setIsClosed] = useState<boolean>(() => {
    if (initialBoundary) {
      const parsed = parseGeoJsonToLatLngs(initialBoundary);
      return Boolean(parsed && parsed.length >= 3);
    }
    return false;
  });

  // Área calculada em m²
  const [calculatedArea, setCalculatedArea] = useState<number>(0);

  // 1. Inicializa mapa Leaflet
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: 18,
      zoomControl: true,
      maxZoom: 20,
    });

    // Cria basemap inicial com tratamento de erro
    const tileLayer = createBaseMapTileLayer(activeBaseMap, () => {
      console.warn('[ParcelBoundaryModal] Fallback para basemap street');
      setActiveBaseMap('street');
    });
    tileLayer.addTo(map);
    baseMapLayerRef.current = tileLayer;

    // Adiciona ponto central geocodificado como referência visual discreta
    const centerPinIcon = L.divIcon({
      html: `
        <div style="
          width: 14px;
          height: 14px;
          background: #DC2626;
          border: 2px solid #FFFFFF;
          border-radius: 50%;
          box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.35);
        "></div>
      `,
      className: '',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    L.marker([centerLat, centerLng], { icon: centerPinIcon, interactive: false })
      .bindTooltip('Coordenada geocodificada do imóvel', { direction: 'top', offset: [0, -8] })
      .addTo(map);

    mapInstanceRef.current = map;

    // Observador de redimensionamento para manter proporção quadrada perfeita (Etapa 3A / Ponto 1)
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      map.remove();
      mapInstanceRef.current = null;
      baseMapLayerRef.current = null;
    };
  }, [isOpen, centerLat, centerLng]);

  // 1.1 Atualiza camada de basemap (Mapa / Satélite) sem recarregar o mapa nem perder vértices
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (baseMapLayerRef.current) {
      map.removeLayer(baseMapLayerRef.current);
      baseMapLayerRef.current = null;
    }

    const newLayer = createBaseMapTileLayer(activeBaseMap, () => {
      console.warn('[ParcelBoundaryModal] Falha ao carregar satélite, revertendo para Mapa vetorial');
      setActiveBaseMap('street');
    });

    newLayer.addTo(map);
    newLayer.bringToBack();
    baseMapLayerRef.current = newLayer;

    setStoredBaseMapPreference(activeBaseMap);
  }, [activeBaseMap]);

  // Handler de clique no mapa para adicionar novos vértices
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    function handleMapClick(e: L.LeafletMouseEvent) {
      if (isClosed) return; // Se já fechou, edita apenas arrastando vértices

      const newPoint = {
        lat: Number(e.latlng.lat.toFixed(6)),
        lng: Number(e.latlng.lng.toFixed(6)),
      };

      setVertices((prev) => [...prev, newPoint]);
    }

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isClosed]);

  // Atualiza geometria (linhas, polígono e marcadores de vértice) quando vertices ou isClosed mudarem
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 1. Limpa marcadores e camadas anteriores
    vertexMarkersRef.current.forEach((m) => m.remove());
    vertexMarkersRef.current = [];

    if (polylineLayerRef.current) {
      polylineLayerRef.current.remove();
      polylineLayerRef.current = null;
    }

    if (polygonLayerRef.current) {
      polygonLayerRef.current.remove();
      polygonLayerRef.current = null;
    }

    if (vertices.length === 0) {
      setCalculatedArea(0);
      return;
    }

    const latLngPairs: [number, number][] = vertices.map((v) => [v.lat, v.lng]);
    const isSat = activeBaseMap === 'satellite';

    // 2. Renderiza polígono se fechado ou polilinha se aberto
    if (isClosed && vertices.length >= 3) {
      const polygon = L.polygon(latLngPairs, {
        color: isSat ? '#10B981' : '#1E4620',
        weight: isSat ? 3 : 2.5,
        fillColor: isSat ? '#22C55E' : '#22C55E',
        fillOpacity: isSat ? 0.18 : 0.25, // Baixa opacidade para manter visíveis muros, telhados e divisas no satélite
        dashArray: undefined,
      }).addTo(map);
      polygonLayerRef.current = polygon;

      // Calcula área esférica aproximada em m²
      const geoCoordinates: [number, number][] = vertices.map((v) => [v.lng, v.lat]);
      const area = calculateSphericalArea(geoCoordinates);
      setCalculatedArea(area);
    } else {
      if (vertices.length >= 2) {
        const polyline = L.polyline(latLngPairs, {
          color: isSat ? '#34D399' : '#16A34A',
          weight: isSat ? 3 : 2.5,
          dashArray: '5, 5',
        }).addTo(map);
        polylineLayerRef.current = polyline;
      }
      setCalculatedArea(0);
    }

    // 3. Renderiza marcadores interativos em cada vértice (Alto contraste sobre imagem aérea)
    const markers: L.Marker[] = vertices.map((vertex, index) => {
      const isFirst = index === 0;

      // Marcador com anel duplo de contraste (branco + halo escuro) para máxima legibilidade
      const vertexIcon = L.divIcon({
        html: `
          <div style="
            width: ${isFirst && !isClosed ? '24px' : '20px'};
            height: ${isFirst && !isClosed ? '24px' : '20px'};
            background: ${isFirst && !isClosed ? '#15803D' : (isSat ? '#10B981' : '#1E4620')};
            border: 2.5px solid #FFFFFF;
            border-radius: 50%;
            box-shadow: 0 0 0 2px rgba(0,0,0,0.5), 0 3px 8px rgba(0,0,0,0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FFFFFF;
            font-size: 11px;
            font-weight: 800;
            cursor: move;
            transition: transform 0.15s ease;
          ">
            ${index + 1}
          </div>
        `,
        className: '',
        iconSize: [isFirst && !isClosed ? 24 : 20, isFirst && !isClosed ? 24 : 20],
        iconAnchor: [isFirst && !isClosed ? 12 : 10, isFirst && !isClosed ? 12 : 10],
      });

      const marker = L.marker([vertex.lat, vertex.lng], {
        icon: vertexIcon,
        draggable: true,
        autoPan: true,
      }).addTo(map);

      // Permite fechar clicando no 1º vértice quando houver pelo menos 3 pontos
      if (isFirst && !isClosed && vertices.length >= 3) {
        marker.bindTooltip('Clique para fechar o polígono', {
          permanent: true,
          direction: 'top',
          offset: [0, -10],
          className: 'close-polygon-tooltip',
        });
        marker.on('click', () => {
          setIsClosed(true);
        });
      }

      // Evento de arrasto para ajustar posições de vértices
      marker.on('drag', (e: any) => {
        const newLatLng = e.target.getLatLng();
        setVertices((prev) => {
          const updated = [...prev];
          updated[index] = {
            lat: Number(newLatLng.lat.toFixed(6)),
            lng: Number(newLatLng.lng.toFixed(6)),
          };
          return updated;
        });
      });

      return marker;
    });

    vertexMarkersRef.current = markers;
  }, [vertices, isClosed, activeBaseMap]);

  // Ações da Toolbar
  function handleClosePolygon() {
    if (vertices.length >= 3) {
      setIsClosed(true);
    }
  }

  function handleUndo() {
    if (vertices.length === 0) return;
    if (isClosed) {
      setIsClosed(false);
    }
    setVertices((prev) => prev.slice(0, prev.length - 1));
  }

  function handleClear() {
    if (vertices.length === 0) return;
    if (window.confirm('Deseja realmente limpar toda a demarcação desenhada? Todos os vértices serão removidos.')) {
      setVertices([]);
      setIsClosed(false);
      setCalculatedArea(0);
    }
  }

  function handleSave() {
    if (vertices.length < 3) {
      alert('Para delimitar o terreno, são necessários no mínimo 3 vértices.');
      return;
    }

    const geoPolygon = leafletLatLngsToGeoJsonPolygon(vertices);
    if (!geoPolygon) {
      alert('Geometria inválida.');
      return;
    }

    const geoJsonString = JSON.stringify(geoPolygon);
    const coordinates: [number, number][] = vertices.map((v) => [v.lng, v.lat]);
    const finalArea = calculateSphericalArea(coordinates);

    onConfirm(geoJsonString, finalArea);
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '1040px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
        }}
      >
        {/* Cabeçalho */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FAFAFA',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '10px',
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Pentagon size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {title}
              </h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Perímetro delimitado no mapa • Desenho manual aproximado
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Seletor Mapa | Satélite */}
            <BaseMapToggle
              activeBaseMap={activeBaseMap}
              onChange={setActiveBaseMap}
              compact
            />

            <button
              type="button"
              onClick={onCancel}
              title="Fechar janela"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
              }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Corpo com Layout Split: Mapa Quadrado 1:1 à esquerda e Ferramentas à direita (Etapa 3A / Ponto 1) */}
        <div className="map-modal-split-body">
          {/* Coluna do Mapa Quadrado 1:1 (Livre de overlays que cubram o terreno) */}
          <div className="map-modal-square-side" style={{ width: '520px', height: '520px', maxWidth: '520px', maxHeight: '520px' }}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
          </div>

          {/* Coluna de Ferramentas, Instruções e Métricas de Área */}
          <div className="map-modal-controls-side">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Badge de Status dos Vértices */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Status da Delimitação
                </span>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '999px',
                    backgroundColor: vertices.length >= 3 ? '#DCFCE7' : '#FEF3C7',
                    color: vertices.length >= 3 ? '#166534' : '#92400E',
                  }}
                >
                  {vertices.length} vértice(s) • {isClosed ? 'Polígono Fechado' : 'Em Aberto'}
                </span>
              </div>

              {/* Instruções de Desenho */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: activeBaseMap === 'satellite' ? '#0F172A' : '#F3F4F6',
                  color: activeBaseMap === 'satellite' ? '#F8FAFC' : '#374151',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  fontSize: '0.82rem',
                  lineHeight: 1.45,
                }}
              >
                {!isClosed ? (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <MousePointerClick size={16} color={activeBaseMap === 'satellite' ? '#4ADE80' : '#1E4620'} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                      <strong>Passo {vertices.length + 1}:</strong> Clique no mapa para adicionar os cantos do terreno (mínimo de 3).
                      {activeBaseMap === 'satellite' && ' Use muros e construções como referência.'}
                      {vertices.length >= 3 && ' Clique no 1º ponto ou no botão "Fechar Polígono" para concluir.'}
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <Move size={16} color={activeBaseMap === 'satellite' ? '#4ADE80' : '#15803D'} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                      <strong>Polígono Fechado:</strong> Arraste os vértices numerados para ajustar o contorno sobre {activeBaseMap === 'satellite' ? 'a imagem aérea' : 'o mapa'}.
                    </span>
                  </div>
                )}
              </div>

              {/* Ferramentas de Desenho em Painel Dedicado */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {vertices.length >= 3 && !isClosed && (
                  <button
                    type="button"
                    onClick={handleClosePolygon}
                    style={{
                      padding: '8px 14px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      backgroundColor: '#1E4620',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Check size={15} />
                    <span>Fechar Polígono</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={vertices.length === 0}
                  title="Remove o último ponto adicionado na demarcação"
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    backgroundColor: '#FFFFFF',
                    color: vertices.length === 0 ? '#9CA3AF' : '#374151',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: vertices.length === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Undo2 size={15} />
                  <span>Desfazer último ponto</span>
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  disabled={vertices.length === 0}
                  title="Limpa todos os pontos e reinicia a demarcação (solicita confirmação)"
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    backgroundColor: '#FFFFFF',
                    color: vertices.length === 0 ? '#9CA3AF' : '#DC2626',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: vertices.length === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Trash2 size={15} />
                  <span>Limpar demarcação</span>
                </button>
              </div>

              {/* Informações de Área Delimitada */}
              <div style={{ padding: '14px', backgroundColor: '#FAFBFC', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.70rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>
                    Área aproximada delimitada no mapa
                  </div>
                  <div style={{ fontSize: '1.30rem', fontWeight: 800, color: isClosed ? '#1E4620' : '#6B7280', marginTop: '2px' }}>
                    {isClosed && calculatedArea > 0 ? `${calculatedArea.toLocaleString('pt-BR')} m²` : '— (feche o polígono)'}
                  </div>
                </div>

                {informedArea && informedArea > 0 && (
                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '8px' }}>
                    <div style={{ fontSize: '0.70rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                      Área informada documental
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#374151', marginTop: '2px' }}>
                      {Number(informedArea).toLocaleString('pt-BR')} m²
                    </div>
                  </div>
                )}
              </div>

              <div style={{ fontSize: '0.73rem', color: '#6B7280', lineHeight: 1.35 }}>
                Traçado manual de referência visual pelo corretor. Não substitui levantamento topográfico ou certidão de matrícula.
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé: Confirmação e Ações */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border-light)',
            backgroundColor: '#FAFAFA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '0.80rem', color: 'var(--text-muted)' }}>
            {isClosed ? (
              <span style={{ color: '#166534', fontWeight: 700 }}>
                ✓ Delimitação fechada ({vertices.length} vértices • {calculatedArea > 0 ? `${calculatedArea.toLocaleString('pt-BR')} m²` : ''})
              </span>
            ) : (
              <span>Adicione pelo menos 3 vértices e feche o polígono para salvar.</span>
            )}
          </div>

          {/* Botões de Ação */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {onRemove && initialBoundary && (
              <button
                type="button"
                onClick={onRemove}
                style={{
                  padding: '9px 14px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  backgroundColor: '#FEE2E2',
                  color: '#DC2626',
                  border: '1px solid #FCA5A5',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                }}
              >
                Excluir Delimitação
              </button>
            )}

            <button
              type="button"
              className="btn-secondary"
              onClick={onCancel}
              style={{ padding: '9px 16px', fontSize: '0.84rem' }}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={vertices.length < 3 || !isClosed}
              style={{
                padding: '9px 20px',
                fontSize: '0.84rem',
                fontWeight: 700,
                opacity: vertices.length < 3 || !isClosed ? 0.5 : 1,
                cursor: vertices.length < 3 || !isClosed ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Check size={16} />
              <span>Confirmar Delimitação</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
