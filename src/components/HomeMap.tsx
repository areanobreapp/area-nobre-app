'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import L from 'leaflet';
import {
  Home,
  Building2,
  Building,
  Maximize2,
  Store,
  HardHat,
  Search,
  Filter,
  X,
  MapPin,
  Bed,
  Bath,
  Car,
  Calendar,
  Layers,
  ArrowRight,
  RotateCcw,
  Zap,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  HelpCircle,
  ExternalLink,
  Compass,
} from 'lucide-react';
import CircularMatchScore from './CircularMatchScore';
import MatchExplanationModal from './MatchExplanationModal';
import { parseGeoJsonToLatLngs, calculatePolygonCentroid } from '@/lib/geo/polygon';
import {
  BaseMapType,
  createBaseMapTileLayer,
  getStoredBaseMapPreference,
  setStoredBaseMapPreference,
} from '@/lib/geo/basemaps';
import BaseMapToggle from './BaseMapToggle';

export interface BrokerIdentityInfo {
  id: string;
  name: string;
  email?: string;
  status?: string;
  profile?: {
    commercialName?: string | null;
    phone?: string | null;
    creci?: string | null;
    avatarUrl?: string | null;
    logoUrl?: string | null;
    city?: string | null;
    tagline?: string | null;
  } | null;
}

export interface PropertyItem {
  id: string;
  userId?: string;
  responsibleBrokerId?: string | null;
  responsibleBroker?: BrokerIdentityInfo | null;
  title: string;
  internalCode?: string | null;
  propertyType: string;
  purpose: string;
  status: string;
  price: number;
  privateArea?: number | null;
  totalArea?: number | null;
  bedrooms: number;
  suites: number;
  bathrooms: number;
  parkingSpaces: number;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  boundary?: string | null;
  boundaryArea?: number | null;
  images?: { url: string; isCover?: boolean }[];
  isDevelopment?: false;
}

export interface DevelopmentItem {
  id: string;
  userId?: string;
  responsibleBrokerId?: string | null;
  responsibleBroker?: BrokerIdentityInfo | null;
  name: string;
  developer: string;
  stage: string;
  deliveryDate?: string | null;
  status: string;
  description?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  images?: { url: string; isCover?: boolean }[];
  typologies?: {
    id: string;
    name: string;
    propertyType: string;
    price: number;
    privateArea?: number | null;
    bedrooms: number;
    suites: number;
    bathrooms: number;
    parkingSpaces: number;
    status: string;
    notes?: string | null;
  }[];
  isDevelopment: true;
}

export type MapItem = (PropertyItem | DevelopmentItem) & {
  matchScore?: number;
  matchExplanation?: any[];
  matchedTypologyName?: string;
  matchedTypologyPrice?: number;
};

interface HomeMapProps {
  initialProperties: PropertyItem[];
  initialDevelopments: DevelopmentItem[];
  kpis: {
    propertiesCount: number;
    developmentsCount: number;
    activeSearchesCount: number;
    relevantMatchesCount: number;
  };
  recentMatches?: any[];
  user: {
    id?: string;
    name: string;
    email: string;
    role?: string;
    status?: string;
    profile?: any;
  };
  activeSearchContext?: any;
}

// 5 Categorias Principais exigidas na Fase 2.2
type CategoryKey = 'Todos' | 'Casa' | 'Apartamento' | 'Terreno' | 'Comércio' | 'Em construção';

interface FilterState {
  purpose: string; // 'Todos' | 'Venda' | 'Locação'
  minPrice: string;
  maxPrice: string;
  city: string;
  neighborhood: string;
  minBedrooms: number;
  minSuites: number;
  minParking: number;
  minArea: string;
  maxArea: string;
  // Campos específicos de Em construção
  stage: string; // 'Todos' | 'Lançamento' | 'Na planta' | 'Em construção' | 'Próximo da entrega'
}

const CATEGORIES: {
  key: CategoryKey;
  label: string;
  color: string;
  bgLight: string;
}[] = [
  { key: 'Todos', label: 'Todos', color: '#111827', bgLight: '#F3F4F6' },
  { key: 'Casa', label: 'Casa', color: '#1E4620', bgLight: '#EBF4EC' },
  { key: 'Apartamento', label: 'Apartamento', color: '#1D4ED8', bgLight: '#EFF6FF' },
  { key: 'Terreno', label: 'Terreno', color: '#D97706', bgLight: '#FEF3C7' },
  { key: 'Comércio', label: 'Comércio', color: '#0F766E', bgLight: '#CCFBF1' },
  { key: 'Em construção', label: 'Em construção', color: '#7C3AED', bgLight: '#F3E8FF' },
];

function getCategoryForItem(item: MapItem): CategoryKey {
  if (item.isDevelopment) return 'Em construção';
  const type = (item.propertyType || '').toLowerCase();
  if (type.includes('casa')) return 'Casa';
  if (type.includes('apartamento') || type.includes('cobertura') || type.includes('studio')) return 'Apartamento';
  if (type.includes('terreno') || type.includes('lote') || type.includes('rural')) return 'Terreno';
  if (type.includes('comercial') || type.includes('comércio') || type.includes('galpão') || type.includes('sala')) return 'Comércio';
  return 'Apartamento';
}

function getCategoryColor(cat: CategoryKey): string {
  switch (cat) {
    case 'Casa': return '#1E4620';
    case 'Apartamento': return '#1D4ED8';
    case 'Terreno': return '#D97706';
    case 'Comércio': return '#0F766E';
    case 'Em construção': return '#7C3AED';
    default: return '#111827';
  }
}

function getCategorySvgPath(cat: CategoryKey): string {
  switch (cat) {
    case 'Casa':
      return '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>';
    case 'Apartamento':
      return '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>';
    case 'Terreno':
      return '<path d="m21 16-4-4-5 5-4-4-6 6"/><path d="M17 8h4v4"/><path d="m21 8-6 6"/>';
    case 'Comércio':
      return '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/>';
    case 'Em construção':
      return '<path d="m14 12-8.5 8.5a2.12 2.12 0 1 1-3-3L11 9"/><path d="M15 13 9 7l4-4 6 6h3l-3 3 2 2-2 2-2-2-4 4Z"/>';
    default:
      return '<circle cx="12" cy="12" r="10"/>';
  }
}

function formatPriceShort(val: number): string {
  if (!val || val <= 0) return 'Consulte';
  if (val >= 1000000) {
    const mi = (val / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    return `R$ ${mi} mi`;
  }
  const mil = Math.round(val / 1000);
  return `R$ ${mil} mil`;
}

export default function HomeMap({
  initialProperties,
  initialDevelopments,
  kpis,
  recentMatches = [],
  user,
  activeSearchContext = null,
}: HomeMapProps) {
  const router = useRouter();

  // Resumo dos critérios da busca ativa para o banner contextual
  const activeSearchCriteriaSummary = useMemo(() => {
    if (!activeSearchContext) return '';
    const parts: string[] = [];
    if (activeSearchContext.purpose && activeSearchContext.purpose !== 'Todos') parts.push(activeSearchContext.purpose);
    if (activeSearchContext.propertyTypes) {
      const types = Array.isArray(activeSearchContext.propertyTypes)
        ? activeSearchContext.propertyTypes
        : typeof activeSearchContext.propertyTypes === 'string'
        ? JSON.parse(activeSearchContext.propertyTypes || '[]')
        : [];
      if (types.length > 0) parts.push(types.join(', '));
    }
    if (activeSearchContext.maxPrice) {
      parts.push(`até R$ ${Number(activeSearchContext.maxPrice).toLocaleString('pt-BR')}`);
    } else if (activeSearchContext.minPrice) {
      parts.push(`a partir de R$ ${Number(activeSearchContext.minPrice).toLocaleString('pt-BR')}`);
    }
    if (activeSearchContext.minBedrooms && activeSearchContext.minBedrooms > 0) {
      parts.push(`${activeSearchContext.minBedrooms}+ quartos`);
    }
    if (activeSearchContext.neighborhoods) {
      const neighs = Array.isArray(activeSearchContext.neighborhoods)
        ? activeSearchContext.neighborhoods
        : typeof activeSearchContext.neighborhoods === 'string'
        ? JSON.parse(activeSearchContext.neighborhoods || '[]')
        : [];
      if (neighs.length > 0) parts.push(neighs.join(', '));
    }
    return parts.join(' • ');
  }, [activeSearchContext]);

  // Estados de seleção e filtros
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('Todos');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MapItem | null>(null);
  const [selectedMatchForModal, setSelectedMatchForModal] = useState<any>(null);

  // Filtro de Escopo: Todos os Imóveis | Meus Imóveis (Fase 5.4 — Ajuste Final)
  const [scopeFilter, setScopeFilter] = useState<'all' | 'mine'>('all');

  // Navegação geográfica do mapa (busca de local / endereço / bairro / cidade)
  const [isGeocodingLocation, setIsGeocodingLocation] = useState(false);
  const [navigatedLocation, setNavigatedLocation] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [geocodeFeedback, setGeocodeFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const navigatedMarkerRef = useRef<L.Marker | null>(null);

  // Filtros contextuais
  const [filters, setFilters] = useState<FilterState>({
    purpose: 'Todos',
    minPrice: '',
    maxPrice: '',
    city: '',
    neighborhood: '',
    minBedrooms: 0,
    minSuites: 0,
    minParking: 0,
    minArea: '',
    maxArea: '',
    stage: 'Todos',
  });

  // Referência do elemento DOM do mapa e da instância do Leaflet
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Camadas de Território e Delimitação de Terrenos (Fase 4.2)
  const [showTerritory, setShowTerritory] = useState<boolean>(false);
  const [mapZoom, setMapZoom] = useState<number>(13);
  const territoryLayerRef = useRef<L.LayerGroup | null>(null);
  const parcelsLayerRef = useRef<L.LayerGroup | null>(null);
  const geoDataCacheRef = useRef<{ municipio: any; bairros: any } | null>(null);

  // Basemap Ativo: Mapa Vetorial ou Imagem de Satélite (Fase 4.3)
  const [activeBaseMap, setActiveBaseMap] = useState<BaseMapType>(() => getStoredBaseMapPreference());
  const baseMapLayerRef = useRef<L.TileLayer | null>(null);

  function scrollToCard(id: string) {
    setTimeout(() => {
      const card = document.getElementById(`home-card-${id}`);
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

  function handleCardClick(item: MapItem) {
    setSelectedItem(item);
    if (item.latitude !== null && item.latitude !== undefined && !isNaN(item.latitude)) {
      const map = mapInstanceRef.current;
      if (map) {
        let targetLat = item.latitude;
        let targetLng = item.longitude!;

        // Se houver delimitação do terreno (boundary), calcula ponto representativo para enquadramento suave (Requisito 13)
        if (!item.isDevelopment && item.boundary) {
          const parsed = parseGeoJsonToLatLngs(item.boundary);
          if (parsed && parsed.length >= 3) {
            const centroid = calculatePolygonCentroid(parsed.map((p) => [p.lng, p.lat]));
            if (centroid) {
              targetLng = centroid[0];
              targetLat = centroid[1];
            }
          }
        }

        map.flyTo([targetLat, targetLng], 17, { animate: true, duration: 0.8 });
      }
    }
    scrollToCard(item.id);
  }

  // Unifica imóveis convencionais e empreendimentos com flag isDevelopment
  // Se estiver em modo de busca, mapeia estritamente os matches calculados deterministicamente
  const allItems: MapItem[] = useMemo(() => {
    if (activeSearchContext && activeSearchContext.matches) {
      const matchedItems: MapItem[] = [];
      const seenOfferIds = new Set<string>();

      activeSearchContext.matches.forEach((m: any) => {
        if (m.offerType === 'TYPOLOGY' && m.typology) {
          const dev = m.typology.development;
          if (dev) {
            const key = `dev-${dev.id}-${m.typology.id}`;
            if (!seenOfferIds.has(key)) {
              seenOfferIds.add(key);
              matchedItems.push({
                ...dev,
                id: `dev-${dev.id}-${m.typology.id}`,
                isDevelopment: true as const,
                matchScore: m.score,
                matchExplanation: m.parsedExplanation || [],
                matchedTypologyName: m.typology.name,
                matchedTypologyPrice: m.typology.price,
                price: m.typology.price || 0,
                responsibleBroker: dev.responsibleBroker,
                responsibleBrokerId: dev.responsibleBrokerId,
              });
            }
          }
        } else if (m.offerType === 'PROPERTY' && m.property) {
          if (!seenOfferIds.has(m.property.id)) {
            seenOfferIds.add(m.property.id);
            matchedItems.push({
              ...m.property,
              isDevelopment: false as const,
              matchScore: m.score,
              matchExplanation: m.parsedExplanation || [],
              responsibleBroker: m.property.responsibleBroker,
              responsibleBrokerId: m.property.responsibleBrokerId,
            });
          }
        }
      });

      return matchedItems.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    const props = initialProperties.map((p) => ({ ...p, isDevelopment: false as const }));
    const devs = initialDevelopments.map((d) => ({ ...d, isDevelopment: true as const }));
    return [...props, ...devs];
  }, [initialProperties, initialDevelopments, activeSearchContext]);

  // Contagens para o seletor de escopo Todos | Meus imóveis
  const allSharedCount = useMemo(() => allItems.length, [allItems]);
  const myPropertiesCount = useMemo(() => {
    return allItems.filter(
      (item) => (item.responsibleBrokerId && item.responsibleBrokerId === user?.id) || item.userId === user?.id
    ).length;
  }, [allItems, user?.id]);

  // Contagem por categoria respeitando o escopo ativo
  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryKey, number> = {
      Todos: 0,
      Casa: 0,
      Apartamento: 0,
      Terreno: 0,
      Comércio: 0,
      'Em construção': 0,
    };

    allItems.forEach((item) => {
      if (!activeSearchContext && scopeFilter === 'mine') {
        const isMine =
          (item.responsibleBrokerId && item.responsibleBrokerId === user?.id) ||
          item.userId === user?.id;
        if (!isMine) return;
      }

      const cat = getCategoryForItem(item);
      counts[cat] = (counts[cat] || 0) + 1;
      counts.Todos += 1;
    });

    return counts;
  }, [allItems, scopeFilter, user?.id, activeSearchContext]);

  // Itens filtrados com base no escopo, categoria, busca e filtros contextuais
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      // 0. Filtro de Escopo: Todos vs Meus Imóveis (aplicado apenas fora do contexto de busca)
      if (!activeSearchContext && scopeFilter === 'mine') {
        const isMine =
          (item.responsibleBrokerId && item.responsibleBrokerId === user?.id) ||
          item.userId === user?.id;
        if (!isMine) return false;
      }

      const itemCat = getCategoryForItem(item);

      // 1. Filtro por Categoria Selecionada
      if (selectedCategory !== 'Todos' && itemCat !== selectedCategory) {
        return false;
      }

      // 2. Busca por Texto (Endereço, Bairro, Cidade ou Nome)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (item.isDevelopment ? item.name : item.title).toLowerCase().includes(q);
        const cityMatch = (item.city || '').toLowerCase().includes(q);
        const neighMatch = (item.neighborhood || '').toLowerCase().includes(q);
        const addrMatch = (item.address || '').toLowerCase().includes(q);
        const devMatch = item.isDevelopment ? (item.developer || '').toLowerCase().includes(q) : false;
        if (!titleMatch && !cityMatch && !neighMatch && !addrMatch && !devMatch) {
          return false;
        }
      }

      // 3. Filtros Contextuais Aplicados
      if (item.isDevelopment) {
        // Filtros para Em construção
        if (filters.stage !== 'Todos' && item.stage !== filters.stage) {
          return false;
        }
        if (filters.city && !(item.city || '').toLowerCase().includes(filters.city.toLowerCase())) {
          return false;
        }
        if (filters.neighborhood && !(item.neighborhood || '').toLowerCase().includes(filters.neighborhood.toLowerCase())) {
          return false;
        }
        // Faixa de preço do empreendimento (pelo preço mínimo das tipologias)
        const typologies = item.typologies || [];
        const minDevPrice = typologies.length > 0 ? Math.min(...typologies.map((t) => t.price).filter((p) => p > 0)) : 0;
        if (filters.minPrice && minDevPrice < Number(filters.minPrice)) {
          return false;
        }
        if (filters.maxPrice && minDevPrice > Number(filters.maxPrice)) {
          return false;
        }
        // Dormitórios mínimos entre as tipologias
        if (filters.minBedrooms > 0) {
          const hasTypologyWithBedrooms = typologies.some((t) => t.bedrooms >= filters.minBedrooms);
          if (!hasTypologyWithBedrooms) return false;
        }
      } else {
        // Filtros para Imóvel Convencional
        if (filters.purpose !== 'Todos' && item.purpose !== filters.purpose) {
          return false;
        }
        if (filters.city && !(item.city || '').toLowerCase().includes(filters.city.toLowerCase())) {
          return false;
        }
        if (filters.neighborhood && !(item.neighborhood || '').toLowerCase().includes(filters.neighborhood.toLowerCase())) {
          return false;
        }
        if (filters.minPrice && item.price < Number(filters.minPrice)) {
          return false;
        }
        if (filters.maxPrice && item.price > Number(filters.maxPrice)) {
          return false;
        }
        if (filters.minBedrooms > 0 && item.bedrooms < filters.minBedrooms) {
          return false;
        }
        if (filters.minSuites > 0 && item.suites < filters.minSuites) {
          return false;
        }
        if (filters.minParking > 0 && item.parkingSpaces < filters.minParking) {
          return false;
        }
        if (filters.minArea && (item.privateArea || 0) < Number(filters.minArea)) {
          return false;
        }
        if (filters.maxArea && (item.privateArea || 0) > Number(filters.maxArea)) {
          return false;
        }
      }

      return true;
    });
  }, [allItems, selectedCategory, searchQuery, filters]);

  // Itens que possuem coordenadas geográficas válidas
  const mappedItems = useMemo(() => {
    return filteredItems.filter(
      (item) =>
        item.latitude !== null &&
        item.latitude !== undefined &&
        item.longitude !== null &&
        item.longitude !== undefined &&
        !isNaN(item.latitude) &&
        !isNaN(item.longitude)
    );
  }, [filteredItems]);

  const unmappedCount = filteredItems.length - mappedItems.length;

  // Verifica se há filtros ativos para exibir badge de "Limpar"
  const hasActiveFilters = useMemo(() => {
    return (
      filters.purpose !== 'Todos' ||
      Boolean(filters.minPrice) ||
      Boolean(filters.maxPrice) ||
      Boolean(filters.city) ||
      Boolean(filters.neighborhood) ||
      filters.minBedrooms > 0 ||
      filters.minSuites > 0 ||
      filters.minParking > 0 ||
      Boolean(filters.minArea) ||
      Boolean(filters.maxArea) ||
      filters.stage !== 'Todos' ||
      Boolean(searchQuery)
    );
  }, [filters, searchQuery]);

  // 1. Inicialização do Mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centro inicial padrão: Criciúma - SC (ou centrado nos imóveis)
    const initialCenter: [number, number] = [-28.6775, -49.3705];
    const initialZoom = 13;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false, // Controle de zoom customizado para design limpo
    });

    // Basemap inicial (Mapa vetorial ou Satélite)
    const baseMapLayer = createBaseMapTileLayer(activeBaseMap, () => {
      console.warn('[HomeMap] Fallback para basemap street');
      setActiveBaseMap('street');
    });
    baseMapLayer.addTo(map);
    baseMapLayerRef.current = baseMapLayer;

    // 1. Camada de Território Oficial do IBGE (fundo)
    const territoryLayer = L.layerGroup().addTo(map);
    territoryLayerRef.current = territoryLayer;

    // 2. Camada de Delimitação de Terrenos (polígonos dos imóveis)
    const parcelsLayer = L.layerGroup().addTo(map);
    parcelsLayerRef.current = parcelsLayer;

    // 3. Camada de Marcadores (pins com etiqueta de preço - topo)
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    mapInstanceRef.current = map;
    if (typeof window !== 'undefined') {
      (window as any).__homeMap = map;
    }

    // Listener reativo de zoom para camadas progressivas
    map.on('zoomend', () => {
      setMapZoom(map.getZoom());
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      baseMapLayerRef.current = null;
      territoryLayerRef.current = null;
      parcelsLayerRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // 1.1 Troca de Basemap (Mapa / Satélite) sem alterar zoom, centro, seleção, filtros ou carrossel (Fase 4.3)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (baseMapLayerRef.current) {
      map.removeLayer(baseMapLayerRef.current);
      baseMapLayerRef.current = null;
    }

    const newLayer = createBaseMapTileLayer(activeBaseMap, () => {
      console.warn('[HomeMap] Falha no basemap de satélite, revertendo para Mapa vetorial');
      setActiveBaseMap('street');
    });

    newLayer.addTo(map);
    newLayer.bringToBack();
    baseMapLayerRef.current = newLayer;

    setStoredBaseMapPreference(activeBaseMap);
  }, [activeBaseMap]);

  // 2. Atualização dos Marcadores quando a lista filtrada ou seleção mudar
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    mappedItems.forEach((item) => {
      const cat = getCategoryForItem(item);
      const catColor = getCategoryColor(cat);
      const isSelected = selectedItem?.id === item.id;
      const hasMatch = item.matchScore !== undefined && item.matchScore !== null;
      const scoreColor = hasMatch
        ? (item.matchScore! >= 80 ? '#1E4620' : item.matchScore! >= 70 ? '#1D4ED8' : '#D97706')
        : catColor;

      const priceVal = item.isDevelopment
        ? (item.typologies && item.typologies.length > 0
            ? Math.min(...item.typologies.map((t) => t.price).filter((p) => p > 0))
            : 0)
        : item.price;

      const priceLabel = formatPriceShort(item.matchedTypologyPrice || priceVal);
      const svgPath = getCategorySvgPath(cat);

      // Marcador Customizado com Ponta Vetorial Exata em (18, 44) e Âncora Estável
      const markerHtml = `
        <div class="custom-map-pin ${isSelected ? 'active' : ''}" style="width: 36px; height: 44px; position: relative; cursor: pointer;">
          <!-- Etiqueta de preço posicionada absolutamente acima da bolha, centrada no eixo X (18px) -->
          <div class="pin-price-tag" style="position: absolute; bottom: 46px; left: 50%; transform: translateX(-50%); white-space: nowrap; pointer-events: none; margin: 0; z-index: 10; ${isSelected ? 'border: 2px solid ' + scoreColor + '; font-weight: 800; background: #FFFFFF;' : ''}">
            ${hasMatch ? `${item.matchScore}% • ` : (item.isDevelopment ? 'A partir de ' : '')}${priceLabel}
          </div>
          
          <!-- Pin Teardrop Vetorial Exato (Ponta matematicamente no pixel 18, 44) -->
          <svg width="36" height="44" viewBox="0 0 36 44" style="position: absolute; top: 0; left: 0; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.28)); pointer-events: none;">
            <path d="M18,44 C16.5,41 2,27 2,18 A16,16 0 1,1 34,18 C34,27 19.5,41 18,44 Z" fill="${scoreColor}" stroke="#FFFFFF" stroke-width="${isSelected ? '3' : '2'}"/>
          </svg>
          
          <!-- Ícone da categoria ou Score centrado na cabeça do pin (x=18, y=18) -->
          <div style="position: absolute; top: 0; left: 0; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: white; pointer-events: none;">
            ${hasMatch ? `
              <span style="font-weight: 800; font-size: 11px;">${item.matchScore}%</span>
            ` : `
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                ${svgPath}
              </svg>
            `}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'leaflet-custom-marker',
        iconSize: [36, 44],
        iconAnchor: [18, 44],
        popupAnchor: [0, -44],
      });

      const marker = L.marker([item.latitude!, item.longitude!], { icon: customIcon });

      const itemTitle = item.isDevelopment ? item.name : item.title;
      const itemAddr = item.address || 'Endereço cadastrado';

      // Identificação da autoria/responsabilidade no popup
      const isMine = (item.responsibleBrokerId && item.responsibleBrokerId === user?.id) || item.userId === user?.id;
      const brokerDisplayName = item.responsibleBroker?.profile?.commercialName || item.responsibleBroker?.name || 'Corretor';
      const brokerAvatar = item.responsibleBroker?.profile?.avatarUrl || item.responsibleBroker?.profile?.logoUrl;
      const brokerInitial = (brokerDisplayName || 'C').charAt(0).toUpperCase();

      const authorBadgeHtml = isMine
        ? `<div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #E5E7EB; font-size: 11px; font-weight: 700; color: #1E4620; display: flex; align-items: center; gap: 5px;">
             <span style="display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; border-radius: 50%; background: #1E4620; color: white; font-size: 8px; font-weight: 800;">✓</span>
             <span>Seu imóvel</span>
           </div>`
        : `<div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #E5E7EB; font-size: 11px; font-weight: 700; color: #4338CA; display: flex; align-items: center; gap: 5px;">
             ${brokerAvatar
               ? `<img src="${brokerAvatar}" style="width: 14px; height: 14px; border-radius: 50%; object-fit: cover;" />`
               : `<span style="display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; border-radius: 50%; background: #4F46E5; color: white; font-size: 8px; font-weight: 800;">${brokerInitial}</span>`
             }
             <span>Imóvel de ${brokerDisplayName}</span>
           </div>`;

      // Popup limpo e informativo
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; min-width: 180px;">
          <strong style="color: #111827; font-size: 14px;">${itemTitle}</strong><br/>
          ${hasMatch ? `<div style="display: inline-block; background: ${scoreColor}; color: white; padding: 2px 7px; border-radius: 4px; font-weight: 800; font-size: 11px; margin: 4px 0;">${item.matchScore}% compatível</div><br/>` : ''}
          <span style="color: #4B5563; font-size: 12px;">${itemAddr}</span>
          <div style="font-weight: 800; color: #1E4620; font-size: 13px; margin-top: 5px;">
            ${item.isDevelopment ? 'A partir de ' : ''}${priceLabel}
          </div>
          ${authorBadgeHtml}
        </div>
      `);

      marker.on('click', () => {
        setSelectedItem(item);
        // Centraliza no ponto do imóvel
        map.panTo([item.latitude!, item.longitude!], { animate: true, duration: 0.35 });
        scrollToCard(item.id);
      });

      markersLayer.addLayer(marker);
    });

    // Enquadra a visão (FitBounds) quando existirem itens mapeados e não houver local navegado específico
    if (mappedItems.length > 0 && !navigatedLocation) {
      const bounds = L.latLngBounds(mappedItems.map((m) => [m.latitude!, m.longitude!]));
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 15,
        animate: true,
      });
    }
  }, [mappedItems, selectedItem, navigatedLocation]);

  // 3. Renderização da Camada de Território Oficial do IBGE (Fase 4.2)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const territoryLayer = territoryLayerRef.current;
    if (!map || !territoryLayer) return;

    territoryLayer.clearLayers();

    if (!showTerritory) return;

    let isSubscribed = true;

    async function loadAndRenderTerritory() {
      try {
        if (!geoDataCacheRef.current) {
          const [munRes, bairrosRes] = await Promise.all([
            fetch('/data/geo/criciuma-municipio.geojson'),
            fetch('/data/geo/criciuma-bairros.geojson'),
          ]);
          if (munRes.ok && bairrosRes.ok) {
            const [municipio, bairros] = await Promise.all([
              munRes.json(),
              bairrosRes.json(),
            ]);
            if (isSubscribed) {
              geoDataCacheRef.current = { municipio, bairros };
            }
          }
        }

        const cache = geoDataCacheRef.current;
        const currentMap = mapInstanceRef.current;
        const currentTerritory = territoryLayerRef.current;
        if (!cache || !isSubscribed || !currentMap || !currentTerritory) return;

        const currentZ = currentMap.getZoom();

        // Hierarquia progressiva por nível de zoom (Requisitos 3 e 4)
        const isSat = activeBaseMap === 'satellite';
        if (currentZ < 13) {
          // Zoom distante (<13): Exibe contorno do limite municipal oficial
          const munGeo = L.geoJSON(cache.municipio, {
            style: {
              color: isSat ? '#F8FAFC' : '#334155',
              weight: isSat ? 2.4 : 2,
              dashArray: '5, 5',
              fillColor: '#64748B',
              fillOpacity: 0.02,
            },
            interactive: false,
          });
          currentTerritory.addLayer(munGeo);
        } else {
          // Zoom intermediário e próximo (>=13): Limites dos 98 bairros de Criciúma
          const bairrosGeo = L.geoJSON(cache.bairros, {
            style: {
              color: isSat ? '#E2E8F0' : '#64748B',
              weight: isSat ? 1.5 : 1.2,
              dashArray: '3, 3',
              fillColor: isSat ? '#FFFFFF' : '#94A3B8',
              fillOpacity: isSat ? 0.02 : 0.04,
            },
            interactive: false,
          });
          currentTerritory.addLayer(bairrosGeo);

          // Limite municipal em destaque perimetral
          const munGeo = L.geoJSON(cache.municipio, {
            style: {
              color: isSat ? '#FFFFFF' : '#1E293B',
              weight: isSat ? 2.5 : 2.2,
              fillOpacity: 0,
            },
            interactive: false,
          });
          currentTerritory.addLayer(munGeo);

          // Zoom de detalhe (>=15): Rótulos discretos com nomes dos bairros
          if (currentZ >= 15 && cache.bairros.features) {
            cache.bairros.features.forEach((feature: any) => {
              const name = feature.properties?.name;
              if (!name) return;

              const coords = feature.geometry?.coordinates;
              let ring: [number, number][] = [];
              if (feature.geometry?.type === 'Polygon' && coords?.[0]) {
                ring = coords[0];
              } else if (feature.geometry?.type === 'MultiPolygon' && coords?.[0]?.[0]) {
                ring = coords[0][0];
              }

              if (ring.length >= 3) {
                const centroid = calculatePolygonCentroid(ring);
                if (centroid) {
                  const labelIcon = L.divIcon({
                    html: `<div class="bairro-label-tag">${name}</div>`,
                    className: '',
                    iconSize: [0, 0],
                  });
                  const labelMarker = L.marker([centroid[1], centroid[0]], {
                    icon: labelIcon,
                    interactive: false,
                  });
                  currentTerritory.addLayer(labelMarker);
                }
              }
            });
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar malha territorial do IBGE:', err);
      }
    }

    loadAndRenderTerritory();

    return () => {
      isSubscribed = false;
    };
  }, [showTerritory, mapZoom, activeBaseMap]);

  // 4. Renderização das Delimitações dos Terrenos (Polígonos dos Imóveis - Fase 4.2)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const parcelsLayer = parcelsLayerRef.current;
    if (!map || !parcelsLayer) return;

    parcelsLayer.clearLayers();

    const currentZ = map.getZoom();
    const isSat = activeBaseMap === 'satellite';

    mappedItems.forEach((item) => {
      if (item.isDevelopment || !item.boundary) return;

      const isSelected = selectedItem?.id === item.id;
      // Em zoom distante (<13), exibe polígono apenas se estiver selecionado para não poluir
      if (currentZ < 13 && !isSelected) return;

      const latLngs = parseGeoJsonToLatLngs(item.boundary);
      if (!latLngs || latLngs.length < 3) return;

      const cat = getCategoryForItem(item);
      const catColor = getCategoryColor(cat);

      // Polígonos discretos que não escondem o mapa-base nem imagem aérea (Requisito 7 e 14)
      const polygonColor = isSelected ? (isSat ? '#22C55E' : '#1E4620') : (isSat ? '#10B981' : catColor);
      const polygon = L.polygon(
        latLngs.map((pt) => [pt.lat, pt.lng]),
        {
          color: polygonColor,
          weight: isSelected ? 3.5 : 2,
          dashArray: isSelected ? undefined : '4, 4',
          fillColor: isSelected ? '#22C55E' : (isSat ? '#10B981' : catColor),
          fillOpacity: isSelected ? 0.30 : (isSat ? 0.14 : 0.12),
        }
      );

      polygon.bindTooltip(
        `<div style="font-family: inherit; font-size: 12px; font-weight: 700; color: #1E4620;">
           ${item.title}<br/>
           <span style="font-weight: 500; color: #4B5563;">Delimitação do Terreno: ${item.boundaryArea ? `${item.boundaryArea.toLocaleString('pt-BR')} m² (aprox.)` : 'desenhado no mapa'}</span>
         </div>`,
        { sticky: true }
      );

      // Sincronização: clicar no polígono seleciona o imóvel e sincroniza carrossel (Requisito 12)
      polygon.on('click', () => {
        setSelectedItem(item);
        map.panTo([item.latitude!, item.longitude!], { animate: true, duration: 0.35 });
        scrollToCard(item.id);
      });

      parcelsLayer.addLayer(polygon);
    });
  }, [mappedItems, selectedItem, mapZoom, activeBaseMap]);

  // Marcador de Navegação Territorial (quando busca endereço/bairro pelo GeoProvider)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (navigatedMarkerRef.current) {
      map.removeLayer(navigatedMarkerRef.current);
      navigatedMarkerRef.current = null;
    }

    if (navigatedLocation) {
      const customNavIcon = L.divIcon({
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); pointer-events: none;">
            <div style="background-color: #0F172A; color: white; padding: 5px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; white-space: nowrap; box-shadow: 0 4px 14px rgba(0,0,0,0.35); margin-bottom: 5px; border: 1.5px solid #38BDF8; display: flex; align-items: center; gap: 4px;">
              <span>📍 Região:</span>
              <span style="color: #BAE6FD;">${navigatedLocation.label}</span>
            </div>
            <div style="width: 14px; height: 14px; background-color: #0284C7; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>
          </div>
        `,
        className: 'leaflet-nav-marker',
        iconSize: [0, 0],
      });

      const marker = L.marker([navigatedLocation.lat, navigatedLocation.lng], { icon: customNavIcon }).addTo(map);
      navigatedMarkerRef.current = marker;
    }
  }, [navigatedLocation]);

  // Navegar geograficamente para o endereço/bairro digitado via GeoProvider
  async function handleNavigateToLocation(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsGeocodingLocation(true);
    setGeocodeFeedback(null);

    try {
      const res = await fetch('/api/geo/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: query }),
      });
      const data = await res.json();
      if (res.ok && data.results && data.results.length > 0) {
        const top = data.results[0];
        const latitude = top.lat;
        const longitude = top.lng;
        const formattedAddress = top.formattedAddress;
        const map = mapInstanceRef.current;
        if (map) {
          map.flyTo([latitude, longitude], 15, { animate: true, duration: 1.2 });
          setNavigatedLocation({
            lat: latitude,
            lng: longitude,
            label: formattedAddress || query,
          });
          setGeocodeFeedback({
            type: 'success',
            message: `Mapa centralizado em: ${formattedAddress || query}`,
          });
          setTimeout(() => setGeocodeFeedback(null), 6000);
        }
      } else {
        setGeocodeFeedback({
          type: 'error',
          message: data.error || 'Localização não encontrada na base cartográfica.',
        });
        setTimeout(() => setGeocodeFeedback(null), 5000);
      }
    } catch (err) {
      console.error('Erro ao geocodificar:', err);
      setGeocodeFeedback({
        type: 'error',
        message: 'Não foi possível conectar ao serviço de geolocalização.',
      });
      setTimeout(() => setGeocodeFeedback(null), 5000);
    } finally {
      setIsGeocodingLocation(false);
    }
  }

  // Ação ao clicar em categoria
  function handleSelectCategory(catKey: CategoryKey) {
    if (selectedCategory === catKey) {
      // Se clicou na já selecionada e não for 'Todos', abre o drawer de filtros
      if (catKey !== 'Todos') {
        setIsFilterOpen(true);
      }
    } else {
      setSelectedCategory(catKey);
      // Ao trocar de categoria (que não seja 'Todos'), abre a experiência contextual de filtros
      if (catKey !== 'Todos') {
        setIsFilterOpen(true);
      } else {
        setIsFilterOpen(false);
      }
    }
  }

  // Limpa todos os filtros contextuais
  function handleClearFilters() {
    setFilters({
      purpose: 'Todos',
      minPrice: '',
      maxPrice: '',
      city: '',
      neighborhood: '',
      minBedrooms: 0,
      minSuites: 0,
      minParking: 0,
      minArea: '',
      maxArea: '',
      stage: 'Todos',
    });
    setSearchQuery('');
    setSelectedCategory('Todos');
    setSelectedItem(null);
    setNavigatedLocation(null);
    setGeocodeFeedback(null);
    setIsFilterOpen(false);
  }

  // Recentraliza mapa em todos os itens
  function handleFitAll() {
    setNavigatedLocation(null);
    setGeocodeFeedback(null);
    const map = mapInstanceRef.current;
    if (!map || mappedItems.length === 0) return;
    const bounds = L.latLngBounds(mappedItems.map((m) => [m.latitude!, m.longitude!]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, animate: true });
    setSelectedItem(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* 1. TOPO: Identidade e Botões de Ação Rápida */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Área Nobre
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Daiane Corrêa Imóveis
            </span>
            <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
              Território Ativo
            </span>
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Carteira Imobiliária no Território
          </h1>
        </div>

        {/* Botões de Ação do Corretor */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link href="/imoveis/novo" className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.84rem' }}>
            <Plus size={15} />
            <span>Imóvel</span>
          </Link>
          <Link href="/empreendimentos/novo" className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.84rem' }}>
            <Plus size={15} />
            <span>Empreendimento</span>
          </Link>
          <Link href="/buscas/nova" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.84rem' }}>
            <Search size={15} />
            <span>Nova busca</span>
          </Link>
        </div>
      </div>

      {/* 2. FAIXA COMPACTA DE INDICADORES (KPIs secundários que não empurram o mapa) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}
      >
        <Link
          href="/imoveis"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-light)',
            fontSize: '0.80rem',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#1E4620' }} />
          <span><strong>{kpis.propertiesCount}</strong> Imóveis prontos</span>
        </Link>

        <Link
          href="/empreendimentos"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-light)',
            fontSize: '0.80rem',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#7C3AED' }} />
          <span><strong>{kpis.developmentsCount}</strong> Em construção</span>
        </Link>

        <Link
          href="/buscas"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-light)',
            fontSize: '0.80rem',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4338CA' }} />
          <span><strong>{kpis.activeSearchesCount}</strong> Buscas ativas</span>
        </Link>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-light)',
            fontSize: '0.80rem',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <Zap size={13} color="#15803D" />
          <span><strong>{kpis.relevantMatchesCount}</strong> Matches (&ge;70%)</span>
        </div>
      </div>

      {/* Banner do Modo de Busca no Mapa (Fase 5 - Requisitos 4 e 5) */}
      {activeSearchContext && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            backgroundColor: '#1E4620',
            color: 'white',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-md)',
            flexWrap: 'wrap',
            gap: '12px',
            border: '1.5px solid #2E6830',
            animation: 'fadeIn 0.25s ease',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#86EFAC', fontWeight: 800 }}>
                Modo de Busca no Mapa
              </span>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#86EFAC' }} />
              <span style={{ fontSize: '0.78rem', color: '#D1FAE5' }}>
                {allItems.length} {allItems.length === 1 ? 'oportunidade compatível' : 'oportunidades compatíveis'}
              </span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '2px', color: '#FFFFFF' }}>
              Buscando para: {activeSearchContext.client?.name || activeSearchContext.name}
            </div>
            {activeSearchCriteriaSummary && (
              <div style={{ fontSize: '0.85rem', color: '#D1FAE5', marginTop: '3px' }}>
                {activeSearchCriteriaSummary}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => router.push('/')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: 'white',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              <X size={15} />
              <span>Sair da busca</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. BARRA DE PESQUISA & SELETORES DE TIPO (CASA, APARTAMENTO, TERRENO, COMÉRCIO, EM CONSTRUÇÃO) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Input de Busca de Localização & Navegação Geográfica */}
        <form onSubmit={handleNavigateToLocation} style={{ display: 'flex', gap: '8px', width: '100%' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar endereço, bairro, cidade (pressione Enter para navegar no mapa)..."
              style={{
                width: '100%',
                padding: '11px 40px 11px 40px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-surface)',
                fontSize: '0.92rem',
                boxShadow: 'var(--shadow-xs)',
                outline: 'none',
              }}
            />
            <Search
              size={18}
              color="#9CA3AF"
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setNavigatedLocation(null);
                  setGeocodeFeedback(null);
                }}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9CA3AF',
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!searchQuery.trim() || isGeocodingLocation}
            className="btn-secondary"
            title="Localizar região no mapa com a cartografia GeoBase"
            style={{
              padding: '0 16px',
              fontSize: '0.84rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              height: '44px',
              opacity: !searchQuery.trim() ? 0.6 : 1,
            }}
          >
            <Compass size={16} color="var(--color-primary)" />
            <span>{isGeocodingLocation ? 'Localizando...' : 'Ir ao local'}</span>
          </button>
        </form>

        {/* Feedback de Navegação Geográfica / Alerta de Erro */}
        {geocodeFeedback && (
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.80rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: geocodeFeedback.type === 'success' ? '#F0FDF4' : '#FEF2F2',
              color: geocodeFeedback.type === 'success' ? '#166534' : '#991B1B',
              border: `1px solid ${geocodeFeedback.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
            }}
          >
            <span>{geocodeFeedback.message}</span>
            <button
              type="button"
              onClick={() => setGeocodeFeedback(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 2 }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Chip de Local Navegado Ativo */}
        {navigatedLocation && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.78rem',
                backgroundColor: '#E0F2FE',
                color: '#0369A1',
                border: '1px solid #BAE6FD',
                borderRadius: 'var(--radius-full)',
                padding: '3px 10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600,
              }}
            >
              <Compass size={13} />
              <span>Região explorada: <strong>{navigatedLocation.label}</strong></span>
              <button
                type="button"
                onClick={() => setNavigatedLocation(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#0369A1',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={12} />
              </button>
            </span>
          </div>
        )}

        {/* Filtro de Escopo: Todos os Imóveis | Meus Imóveis (Fase 5.4 — Ajuste Final) */}
        {!activeSearchContext && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              paddingBottom: '2px',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                backgroundColor: '#F3F4F6',
                padding: '3px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-light)',
              }}
              role="group"
              aria-label="Filtro de visualização no mapa"
            >
              <button
                type="button"
                id="btn-scope-all"
                onClick={() => setScopeFilter('all')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  fontSize: '0.80rem',
                  fontWeight: scopeFilter === 'all' ? 700 : 500,
                  backgroundColor: scopeFilter === 'all' ? '#FFFFFF' : 'transparent',
                  color: scopeFilter === 'all' ? 'var(--color-primary)' : 'var(--text-muted)',
                  boxShadow: scopeFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Building2 size={13} />
                <span>Todos os imóveis</span>
                <span
                  style={{
                    fontSize: '0.70rem',
                    padding: '1px 6px',
                    borderRadius: '999px',
                    backgroundColor: scopeFilter === 'all' ? 'var(--color-primary-light)' : '#E5E7EB',
                    color: scopeFilter === 'all' ? 'var(--color-primary)' : 'var(--text-muted)',
                    fontWeight: 700,
                  }}
                >
                  {allSharedCount}
                </span>
              </button>

              <button
                type="button"
                id="btn-scope-mine"
                onClick={() => setScopeFilter('mine')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  fontSize: '0.80rem',
                  fontWeight: scopeFilter === 'mine' ? 700 : 500,
                  backgroundColor: scopeFilter === 'mine' ? '#FFFFFF' : 'transparent',
                  color: scopeFilter === 'mine' ? 'var(--color-primary)' : 'var(--text-muted)',
                  boxShadow: scopeFilter === 'mine' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Home size={13} />
                <span>Meus imóveis</span>
                <span
                  style={{
                    fontSize: '0.70rem',
                    padding: '1px 6px',
                    borderRadius: '999px',
                    backgroundColor: scopeFilter === 'mine' ? 'var(--color-primary-light)' : '#E5E7EB',
                    color: scopeFilter === 'mine' ? 'var(--color-primary)' : 'var(--text-muted)',
                    fontWeight: 700,
                  }}
                >
                  {myPropertiesCount}
                </span>
              </button>
            </div>

            {scopeFilter === 'mine' ? (
              <span style={{ fontSize: '0.74rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                • Filtrando apenas suas ofertas no mapa
              </span>
            ) : (
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Base compartilhada de corretores ativos
              </span>
            )}
          </div>
        )}

        {/* Seletores Visuais dos 5 Tipos + 'Todos' */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '4px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              const count = categoryCounts[cat.key];

              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => handleSelectCategory(cat.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-full)',
                    border: isSelected
                      ? `2px solid ${cat.color}`
                      : '1px solid var(--border-light)',
                    backgroundColor: isSelected ? cat.bgLight : 'var(--bg-surface)',
                    color: isSelected ? cat.color : 'var(--text-secondary)',
                    fontWeight: isSelected ? 700 : 600,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    boxShadow: isSelected ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
                    transition: 'all var(--transition-fast)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {/* Ícone com a cor correspondente */}
                  <span style={{ color: cat.color, display: 'flex', alignItems: 'center' }}>
                    {cat.key === 'Casa' && <Home size={16} />}
                    {cat.key === 'Apartamento' && <Building size={16} />}
                    {cat.key === 'Terreno' && <Maximize2 size={16} />}
                    {cat.key === 'Comércio' && <Store size={16} />}
                    {cat.key === 'Em construção' && <HardHat size={16} />}
                    {cat.key === 'Todos' && <Building2 size={16} />}
                  </span>

                  <span>{cat.label}</span>

                  <span
                    style={{
                      fontSize: '0.74rem',
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: isSelected ? 'white' : 'var(--bg-subtle)',
                      color: isSelected ? cat.color : 'var(--text-muted)',
                      fontWeight: 700,
                    }}
                  >
                    {count}
                  </span>

                  {isSelected && cat.key !== 'Todos' && (
                    <SlidersHorizontal size={13} style={{ marginLeft: 2 }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Botão de Limpar Filtros quando houver filtros aplicados */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'none',
                border: 'none',
                color: 'var(--color-danger)',
                fontSize: '0.80rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                padding: '6px 8px',
              }}
            >
              <RotateCcw size={13} />
              <span>Limpar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. CONTAINER PRINCIPAL DO MAPA (DOMINANTE E VISUALMENTE CENTRAL) */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '620px',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-md)',
          backgroundColor: '#E5E7EB',
        }}
      >
        {/* Elemento do Leaflet */}
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

        {/* 4.1. CONTROLES FLUTUANTES DO MAPA */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            zIndex: 500,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            alignItems: 'flex-end',
          }}
        >
          {/* Botão de Controle de Território (Fase 4.2 - Requisito 3) */}
          <button
            type="button"
            onClick={() => setShowTerritory(!showTerritory)}
            title="Camada Territorial Oficial do IBGE (limite municipal e bairros)"
            style={{
              backgroundColor: showTerritory ? '#1E4620' : 'white',
              color: showTerritory ? 'white' : 'var(--text-primary)',
              border: showTerritory ? '1.5px solid #1E4620' : '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              cursor: 'pointer',
              fontSize: '0.80rem',
              fontWeight: 700,
              transition: 'all 0.2s ease',
            }}
          >
            <Layers size={15} color={showTerritory ? '#86EFAC' : 'var(--color-primary)'} />
            <span>Território {showTerritory ? 'ON' : 'OFF'}</span>
          </button>

          {/* Botão Enquadrar Imóveis */}
          <button
            type="button"
            onClick={handleFitAll}
            title="Enquadrar todos os imóveis no mapa"
            style={{
              backgroundColor: 'white',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '0.80rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            <MapPin size={15} color="var(--color-primary)" />
            <span>Enquadrar imóveis</span>
          </button>
        </div>

        {/* 4.1.1. ETIQUETA DISCRETA DE FONTE TERRITORIAL (Requisito 5) */}
        {showTerritory && (
          <div
            style={{
              position: 'absolute',
              bottom: '14px',
              left: '14px',
              zIndex: 500,
              backgroundColor: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(4px)',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.70rem',
              color: '#475569',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              pointerEvents: 'none',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
          >
            Referência territorial: IBGE Censo 2022 (Malha municipal e bairros de Criciúma)
          </div>
        )}

        {/* 4.1.2. SELETOR DE BASEMAP NO TOPO DIREITO: MAPA | SATÉLITE (Fase 4.3 — Requisito 4 e 11) */}
        <div
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            zIndex: 500,
          }}
        >
          <BaseMapToggle
            activeBaseMap={activeBaseMap}
            onChange={setActiveBaseMap}
            compact
          />
        </div>

        {/* 4.2. BADGE INFORMATIVO NO TOPO DO MAPA */}
        <div
          style={{
            position: 'absolute',
            top: '14px',
            left: '14px',
            zIndex: 500,
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-sm)',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: 'var(--color-success)',
              }}
            />
            <span>
              {mappedItems.length} {mappedItems.length === 1 ? 'imóvel' : 'imóveis'}
            </span>
          </div>

          {unmappedCount > 0 && (
            <div
              style={{
                backgroundColor: 'rgba(254, 243, 199, 0.95)',
                color: '#B45309',
                backdropFilter: 'blur(8px)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid #FDE68A',
                boxShadow: 'var(--shadow-sm)',
                fontSize: '0.76rem',
                fontWeight: 600,
              }}
            >
              {unmappedCount} sem coordenadas
            </div>
          )}
        </div>

        {/* 4.3. PAINEL/DRAWER CONTEXTUAL DE FILTROS (Abre ao clicar no tipo) */}
        {isFilterOpen && (
          <div
            className="map-overlay-card"
            style={{
              top: '16px',
              left: '16px',
              bottom: '16px',
              width: '100%',
              maxWidth: '380px',
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(16px)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-floating)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 600,
              overflow: 'hidden',
            }}
          >
            {/* Header do Drawer */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'var(--bg-subtle)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', fontWeight: 800 }}>
                  Filtro Contextual
                </span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {selectedCategory === 'Todos' ? 'Todos os Imóveis' : `Filtros para ${selectedCategory}`}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '50%',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo com Campos Condicionais conforme o Tipo */}
            <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
              {/* Finalidade (Venda/Locação) - exceto para Em construção */}
              {selectedCategory !== 'Em construção' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, marginBottom: '6px' }}>
                    Finalidade
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {['Todos', 'Venda', 'Locação'].map((pur) => (
                      <button
                        key={pur}
                        type="button"
                        onClick={() => setFilters((prev) => ({ ...prev, purpose: pur }))}
                        className={filters.purpose === pur ? 'btn-primary' : 'btn-secondary'}
                        style={{ padding: '6px 8px', fontSize: '0.80rem', justifyContent: 'center' }}
                      >
                        {pur}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Estágio da Obra (Exclusivo para Em construção) */}
              {selectedCategory === 'Em construção' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, marginBottom: '6px' }}>
                    Estágio da obra
                  </label>
                  <select
                    value={filters.stage}
                    onChange={(e) => setFilters((prev) => ({ ...prev, stage: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-light)',
                      fontSize: '0.86rem',
                      backgroundColor: 'white',
                    }}
                  >
                    <option value="Todos">Todos os estágios</option>
                    <option value="Lançamento">Lançamento</option>
                    <option value="Na planta">Na planta</option>
                    <option value="Em construção">Em construção</option>
                    <option value="Próximo da entrega">Próximo da entrega</option>
                  </select>
                </div>
              )}

              {/* Faixa de Valor */}
              <div>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, marginBottom: '6px' }}>
                  {selectedCategory === 'Em construção' ? 'Valor a partir de (R$)' : 'Faixa de valor (R$)'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    type="number"
                    placeholder="Mínimo"
                    value={filters.minPrice}
                    onChange={(e) => setFilters((prev) => ({ ...prev, minPrice: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-light)',
                      fontSize: '0.86rem',
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Máximo"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters((prev) => ({ ...prev, maxPrice: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-light)',
                      fontSize: '0.86rem',
                    }}
                  />
                </div>
              </div>

              {/* Localização: Cidade e Bairro */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, marginBottom: '4px' }}>
                    Cidade
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Criciúma"
                    value={filters.city}
                    onChange={(e) => setFilters((prev) => ({ ...prev, city: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-light)',
                      fontSize: '0.84rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, marginBottom: '4px' }}>
                    Bairro
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Centro"
                    value={filters.neighborhood}
                    onChange={(e) => setFilters((prev) => ({ ...prev, neighborhood: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-light)',
                      fontSize: '0.84rem',
                    }}
                  />
                </div>
              </div>

              {/* Dormitórios (para Casa, Apartamento e Em construção) */}
              {['Casa', 'Apartamento', 'Em construção', 'Todos'].includes(selectedCategory) && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, marginBottom: '6px' }}>
                    Dormitórios mínimos
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[0, 1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setFilters((prev) => ({ ...prev, minBedrooms: num }))}
                        className={filters.minBedrooms === num ? 'btn-primary' : 'btn-secondary'}
                        style={{ flex: 1, padding: '6px 0', fontSize: '0.80rem', justifyContent: 'center' }}
                      >
                        {num === 0 ? 'Todos' : `${num}+`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Suítes e Vagas (para Casa e Apartamento) */}
              {['Casa', 'Apartamento', 'Todos'].includes(selectedCategory) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                      Suítes mínimas
                    </label>
                    <select
                      value={filters.minSuites}
                      onChange={(e) => setFilters((prev) => ({ ...prev, minSuites: Number(e.target.value) }))}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-light)',
                        fontSize: '0.84rem',
                        backgroundColor: 'white',
                      }}
                    >
                      <option value={0}>Qualquer</option>
                      <option value={1}>1+ suíte</option>
                      <option value={2}>2+ suítes</option>
                      <option value={3}>3+ suítes</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                      Vagas mínimas
                    </label>
                    <select
                      value={filters.minParking}
                      onChange={(e) => setFilters((prev) => ({ ...prev, minParking: Number(e.target.value) }))}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-light)',
                        fontSize: '0.84rem',
                        backgroundColor: 'white',
                      }}
                    >
                      <option value={0}>Qualquer</option>
                      <option value={1}>1+ vaga</option>
                      <option value={2}>2+ vagas</option>
                      <option value={3}>3+ vagas</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Área (m²) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, marginBottom: '6px' }}>
                  {selectedCategory === 'Terreno' ? 'Área do terreno (m²)' : 'Área privativa (m²)'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    type="number"
                    placeholder="Mín m²"
                    value={filters.minArea}
                    onChange={(e) => setFilters((prev) => ({ ...prev, minArea: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-light)',
                      fontSize: '0.84rem',
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Máx m²"
                    value={filters.maxArea}
                    onChange={(e) => setFilters((prev) => ({ ...prev, maxArea: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-light)',
                      fontSize: '0.84rem',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Rodapé com Botão "Ver Imóveis" */}
            <div
              style={{
                padding: '16px 20px',
                borderTop: '1px solid var(--border-light)',
                backgroundColor: 'white',
                display: 'flex',
                gap: '10px',
              }}
            >
              <button
                type="button"
                onClick={handleClearFilters}
                className="btn-secondary"
                style={{ flex: 1, justifyContent: 'center', fontSize: '0.86rem' }}
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="btn-primary"
                style={{ flex: 2, justifyContent: 'center', fontSize: '0.88rem' }}
              >
                <span>Ver imóveis ({filteredItems.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* 4.4. PREVIEW COMPACTO DO MARCADOR SELECIONADO (Inspirado no mockup 2.1.1) */}
        {selectedItem && (
          <div
            className="map-overlay-card"
            style={{
              bottom: '20px',
              left: '20px',
              width: '100%',
              maxWidth: '360px',
              backgroundColor: 'white',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-floating)',
              zIndex: 550,
              overflow: 'hidden',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Topo do Preview */}
            <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
              {/* Foto Principal */}
              <div
                style={{
                  width: '100px',
                  height: '84px',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  backgroundColor: '#F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {selectedItem.images && selectedItem.images.length > 0 ? (
                  <img
                    src={selectedItem.images[0].url}
                    alt="Foto do imóvel"
                    style={{ maxWidth: '100%', maxHeight: '100%', width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)' }}>
                    <MapPin size={24} />
                  </div>
                )}
              </div>

              {/* Informações Resumidas */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span
                    className={`badge ${selectedItem.isDevelopment ? 'badge-stage-construcao' : 'badge-primary'}`}
                    style={{ fontSize: '0.68rem', padding: '2px 6px' }}
                  >
                    {selectedItem.isDevelopment ? selectedItem.stage : selectedItem.propertyType}
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: 2,
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>

                <h4
                  style={{
                    fontSize: '0.94rem',
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    marginTop: '4px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {selectedItem.isDevelopment ? selectedItem.name : selectedItem.title}
                </h4>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <MapPin size={12} color="var(--color-primary)" />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedItem.neighborhood ? `${selectedItem.neighborhood}, ` : ''}{selectedItem.city || ''}
                  </span>
                </div>

                {/* Preço */}
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '4px' }}>
                  {selectedItem.isDevelopment ? (
                    <>
                      <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginRight: 4 }}>
                        A partir de
                      </span>
                      {selectedItem.typologies && selectedItem.typologies.length > 0
                        ? `R$ ${Math.min(...selectedItem.typologies.map((t) => t.price).filter((p) => p > 0)).toLocaleString('pt-BR')}`
                        : 'Consulte'}
                    </>
                  ) : (
                    `R$ ${selectedItem.price.toLocaleString('pt-BR')}`
                  )}
                </div>
              </div>
            </div>

            {/* Especificações Rápidas */}
            {selectedItem.isDevelopment ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Construtora: <strong>{selectedItem.developer}</strong></span>
                  <span>{selectedItem.typologies?.length || 0} tipologia(s)</span>
                </div>
                {selectedItem.deliveryDate && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                    <Calendar size={12} color="var(--color-primary)" />
                    <span>Entrega prevista: {selectedItem.deliveryDate}</span>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '6px',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Bed size={13} /> {selectedItem.bedrooms} qtos</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Bath size={13} /> {selectedItem.bathrooms} banh</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Car size={13} /> {selectedItem.parkingSpaces} vg</span>
                {selectedItem.privateArea && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}><Maximize2 size={13} /> {selectedItem.privateArea} m²</span>
                )}
              </div>
            )}

            {/* Identificação de Responsabilidade / Corretor */}
            {(() => {
              const isMine = (selectedItem.responsibleBrokerId && selectedItem.responsibleBrokerId === user?.id) || selectedItem.userId === user?.id;
              const brokerName = selectedItem.responsibleBroker?.profile?.commercialName || selectedItem.responsibleBroker?.name || 'Corretor';
              const brokerImg = selectedItem.responsibleBroker?.profile?.avatarUrl || selectedItem.responsibleBroker?.profile?.logoUrl;
              const initial = (brokerName || 'C').charAt(0).toUpperCase();

              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '2px' }}>
                  {isMine ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        backgroundColor: 'var(--color-primary-light)',
                        padding: '3px 9px',
                        borderRadius: 'var(--radius-full)',
                      }}
                    >
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-primary)',
                          color: 'white',
                          fontSize: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                        }}
                      >
                        ✓
                      </span>
                      <span>Seu imóvel</span>
                    </span>
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: '#4338CA',
                        backgroundColor: '#EEF2FF',
                        padding: '3px 9px',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid #E0E7FF',
                      }}
                    >
                      {brokerImg ? (
                        <img
                          src={brokerImg}
                          alt=""
                          style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            backgroundColor: '#4F46E5',
                            color: 'white',
                            fontSize: '9px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                          }}
                        >
                          {initial}
                        </span>
                      )}
                      <span>Imóvel de {brokerName}</span>
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Botão de Ação para Detalhes */}
            <Link
              href={selectedItem.isDevelopment ? `/empreendimentos/${selectedItem.id}` : `/imoveis/${selectedItem.id}`}
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '8px 12px',
                fontSize: '0.84rem',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <span>{selectedItem.isDevelopment ? 'Ver empreendimento' : 'Ver imóvel'}</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>

      {/* 4.5. CARROSSEL DE RESULTADOS VISUAIS SIMULTÂNEOS ASSOCIADO AO MAPA (FASE 4.1) */}
      <div
        className="card"
        style={{
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          backgroundColor: 'white',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Layers size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  {activeSearchContext ? 'Oportunidades Compatíveis no Território' : 'Imóveis e Resultados no Mapa'}
                </h3>
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    backgroundColor: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                  }}
                >
                  {filteredItems.length} {activeSearchContext ? (filteredItems.length === 1 ? 'oportunidade' : 'oportunidades') : (filteredItems.length === 1 ? 'imóvel' : 'imóveis')}
                </span>
                {unmappedCount > 0 && !activeSearchContext && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      backgroundColor: '#FEF3C7',
                      color: '#92400E',
                    }}
                  >
                    {unmappedCount} sem coordenadas
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                {activeSearchContext
                  ? `Ofertas ordenadas por compatibilidade para ${activeSearchContext.client?.name || activeSearchContext.name}.`
                  : 'Clique no card para sincronizar e centralizar o pin no mapa.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => scrollCarousel('left')}
              title="Rolar para esquerda"
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: '1px solid var(--border-light)',
                backgroundColor: 'white',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel('right')}
              title="Rolar para direita"
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: '1px solid var(--border-light)',
                backgroundColor: 'white',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Trilho do Carrossel Horizontal de Cards */}
        {filteredItems.length === 0 ? (
          <div
            style={{
              padding: '32px 20px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-light)',
            }}
          >
            <p style={{ fontSize: '0.90rem', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
              {activeSearchContext
                ? 'Nenhum imóvel da carteira atende suficientemente a esta busca no momento.'
                : 'Nenhum imóvel ou empreendimento encontrado para os filtros selecionados.'}
            </p>
            {activeSearchContext ? (
              <button
                type="button"
                onClick={() => router.push('/')}
                className="btn-primary"
                style={{ fontSize: '0.82rem', padding: '6px 14px' }}
              >
                <span>Sair da busca e ver carteira completa</span>
              </button>
            ) : hasActiveFilters ? (
              <button
                type="button"
                onClick={handleClearFilters}
                className="btn-secondary"
                style={{ fontSize: '0.82rem', padding: '6px 14px' }}
              >
                <RotateCcw size={13} />
                <span>Limpar filtros aplicados</span>
              </button>
            ) : null}
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
            {filteredItems.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              const cat = getCategoryForItem(item);
              const catColor = getCategoryColor(cat);
              const isDev = item.isDevelopment;
              const hasCoords = item.latitude !== null && item.latitude !== undefined && !isNaN(item.latitude);

              const priceVal = isDev
                ? (item.typologies && item.typologies.length > 0
                    ? Math.min(...item.typologies.map((t) => t.price).filter((p) => p > 0))
                    : 0)
                : item.price;

              const coverImg = item.images && item.images.length > 0 ? item.images[0].url : null;

              return (
                <div
                  key={item.id}
                  id={`home-card-${item.id}`}
                  onClick={() => handleCardClick(item)}
                  style={{
                    flex: '0 0 270px',
                    width: '270px',
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
                  {/* Container da Imagem com object-fit: contain (Fase 4.1) */}
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
                    {coverImg ? (
                      <img
                        src={coverImg}
                        alt={isDev ? item.name : item.title}
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

                    {/* Badge da Categoria ou Score de Compatibilidade */}
                    <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 4 }}>
                      {item.matchScore ? (
                        <span
                          className="badge"
                          style={{
                            backgroundColor: item.matchScore >= 80 ? '#1E4620' : item.matchScore >= 70 ? '#1D4ED8' : '#D97706',
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
                          {item.matchScore}% compatível
                        </span>
                      ) : (
                        <span
                          className="badge"
                          style={{
                            backgroundColor: catColor,
                            color: 'white',
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: 4,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                          }}
                        >
                          {isDev ? item.stage : item.propertyType}
                        </span>
                      )}
                    </div>

                    {/* Badge de Finalidade */}
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
                        {isDev ? 'Construção' : item.purpose}
                      </span>
                    </div>

                    {!hasCoords && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 6,
                          left: 6,
                          right: 6,
                          backgroundColor: 'rgba(254, 243, 199, 0.95)',
                          color: '#92400E',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          textAlign: 'center',
                          border: '1px solid #FDE68A',
                        }}
                      >
                        📍 Sem coordenadas no mapa
                      </div>
                    )}

                    {hasCoords && !isDev && item.boundary && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 6,
                          left: 6,
                          backgroundColor: 'rgba(21, 128, 61, 0.92)',
                          color: '#FFFFFF',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: '0.64rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                        }}
                      >
                        <span>⬟ Terreno delimitado</span>
                      </div>
                    )}
                  </div>

                  {/* Informações do Card */}
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-primary)', lineHeight: 1.2 }}>
                      {isDev ? (
                        <>
                          <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginRight: 4 }}>
                            A partir de
                          </span>
                          {priceVal > 0 ? `R$ ${priceVal.toLocaleString('pt-BR')}` : 'Consulte'}
                        </>
                      ) : (
                        `R$ ${priceVal.toLocaleString('pt-BR')}`
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
                      title={isDev ? item.name : item.title}
                    >
                      {isDev ? (item.matchedTypologyName ? `${item.name} — ${item.matchedTypologyName}` : item.name) : item.title}
                    </h4>

                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <MapPin size={12} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.neighborhood ? `${item.neighborhood}, ` : ''}{item.city || 'Criciúma'}
                      </span>
                    </div>

                    {/* Especificações Rápidas */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.74rem',
                        color: 'var(--text-muted)',
                        borderTop: '1px solid var(--border-subtle)',
                        paddingTop: '6px',
                        marginTop: '2px',
                        flexWrap: 'wrap',
                      }}
                    >
                      {isDev ? (
                        <>
                          <span><strong>{item.developer}</strong></span>
                          <span>•</span>
                          <span>{item.typologies?.length || 0} tipologias</span>
                        </>
                      ) : (
                        <>
                          {item.bedrooms > 0 && <span>{item.bedrooms} dorm</span>}
                          {item.suites > 0 && <span>• {item.suites} suíte</span>}
                          {item.parkingSpaces > 0 && <span>• {item.parkingSpaces} vg</span>}
                          {item.privateArea ? <span>• {item.privateArea}m²</span> : null}
                          {item.boundaryArea ? (
                            <span style={{ color: '#15803D', fontWeight: 700 }} title="Área delimitada no mapa">
                              • ⬟ {item.boundaryArea.toLocaleString('pt-BR')}m² (mapa)
                            </span>
                          ) : null}
                        </>
                      )}
                    </div>

                    {/* Identificação de Responsabilidade / Corretor */}
                    {(() => {
                      const isMine = (item.responsibleBrokerId && item.responsibleBrokerId === user?.id) || item.userId === user?.id;
                      const brokerName = item.responsibleBroker?.profile?.commercialName || item.responsibleBroker?.name || 'Corretor';
                      const brokerImg = item.responsibleBroker?.profile?.avatarUrl || item.responsibleBroker?.profile?.logoUrl;
                      const initial = (brokerName || 'C').charAt(0).toUpperCase();

                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '4px' }}>
                          {isMine ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.70rem',
                                fontWeight: 700,
                                color: 'var(--color-primary)',
                                backgroundColor: 'var(--color-primary-light)',
                                padding: '2px 7px',
                                borderRadius: 'var(--radius-full)',
                              }}
                            >
                              <span
                                style={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--color-primary)',
                                  color: 'white',
                                  fontSize: '7px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                }}
                              >
                                ✓
                              </span>
                              <span>Seu imóvel</span>
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '0.70rem',
                                fontWeight: 700,
                                color: '#4338CA',
                                backgroundColor: '#EEF2FF',
                                padding: '2px 7px',
                                borderRadius: 'var(--radius-full)',
                                border: '1px solid #E0E7FF',
                              }}
                            >
                              {brokerImg ? (
                                <img
                                  src={brokerImg}
                                  alt=""
                                  style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover' }}
                                />
                              ) : (
                                <span
                                  style={{
                                    width: 14,
                                    height: 14,
                                    borderRadius: '50%',
                                    backgroundColor: '#4F46E5',
                                    color: 'white',
                                    fontSize: '8px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                  }}
                                >
                                  {initial}
                                </span>
                              )}
                              <span>Imóvel de {brokerName}</span>
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    {/* Ações do Card: Por que combina? e Ver detalhes */}
                    <div style={{ marginTop: 'auto', paddingTop: '8px', display: 'flex', gap: '6px' }}>
                      {item.matchScore ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMatchForModal({
                              score: item.matchScore,
                              clientName: activeSearchContext?.client?.name || activeSearchContext?.name,
                              searchName: activeSearchContext?.name,
                              offerTitle: isDev ? `${item.name}${item.matchedTypologyName ? ' — ' + item.matchedTypologyName : ''}` : item.title,
                              offerType: isDev ? 'TYPOLOGY' : 'PROPERTY',
                              stage: isDev ? (item.stage || 'Em construção') : 'Pronto',
                              price: item.matchedTypologyPrice || priceVal,
                              explanation: item.matchExplanation || [],
                            });
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
                          <span>Por quê?</span>
                        </button>
                      ) : null}
                      <Link
                        href={isDev ? `/empreendimentos/${item.id.replace(/^dev-/, '').split('-')[0]}` : `/imoveis/${item.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className={item.matchScore ? 'btn-primary' : undefined}
                        style={{
                          flex: item.matchScore ? 1 : undefined,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          fontSize: item.matchScore ? '0.72rem' : '0.78rem',
                          fontWeight: 700,
                          color: item.matchScore ? 'white' : 'var(--color-primary)',
                          textDecoration: 'none',
                          padding: item.matchScore ? '6px 8px' : '0',
                        }}
                      >
                        <span>Ver detalhes</span>
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

      {/* 5. SEÇÃO SECUNDÁRIA: OPORTUNIDADES & CONTEXTO DA CARTEIRA (Abaixo do Mapa) */}
      <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Melhores Oportunidades & Matching
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Cruzamentos automáticos entre demandas de clientes e sua oferta territorial no mapa.
            </p>
          </div>

          <span
            className="badge badge-primary"
            style={{ fontSize: '0.72rem', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <Sparkles size={11} />
            {kpis.relevantMatchesCount} Oportunidade(s)
          </span>
        </div>

        {recentMatches.length === 0 ? (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-light)',
            }}
          >
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: 0 }}>
              Nenhuma oportunidade com score ≥ 70% encontrada na carteira no momento.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentMatches.map((m: any) => {
              const isTypology = m.offerType === 'TYPOLOGY';
              const offerTitle = isTypology
                ? `${m.typology?.development?.name} — ${m.typology?.name}`
                : m.property?.title;
              const offerImage = isTypology
                ? m.typology?.development?.images?.[0]?.url || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80'
                : m.property?.images?.[0]?.url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&auto=format&fit=crop&q=80';
              const offerPrice = isTypology ? m.typology?.price : m.property?.price;
              const stage = isTypology ? (m.typology?.development?.stage || 'Em construção') : 'Pronto';
              const clientName = m.search?.client?.name || 'Cliente';
              const offerNeighborhood = isTypology ? m.typology?.development?.neighborhood : m.property?.neighborhood;
              const offerCity = isTypology ? m.typology?.development?.city : m.property?.city;
              const offerLink = isTypology ? `/empreendimentos/${m.typology?.development?.id}` : `/imoveis/${m.property?.id}`;

              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: 'white',
                    fontSize: '0.88rem',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 300px' }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden',
                        flexShrink: 0,
                        backgroundColor: '#F3F4F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={offerImage}
                        alt={offerTitle}
                        style={{ maxWidth: '100%', maxHeight: '100%', width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 2, flexWrap: 'wrap' }}>
                        <Link
                          href={`/?buscaId=${m.search?.id}`}
                          title="Explorar esta busca no mapa da carteira"
                          style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <span>{clientName}</span>
                          {m.search?.name && m.search.name !== clientName && (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>({m.search.name})</span>
                          )}
                        </Link>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>↔</span>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '3px',
                            backgroundColor: isTypology ? '#ecfdf5' : '#f0f9ff',
                            color: isTypology ? '#065f46' : '#0369a1',
                          }}
                        >
                          {stage}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '0.84rem',
                          color: 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        <Link href={offerLink} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>
                          {offerTitle}
                        </Link>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {offerNeighborhood ? `${offerNeighborhood}, ` : ''}{offerCity} •{' '}
                        <strong style={{ color: 'var(--color-primary)' }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(offerPrice || 0)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CircularMatchScore score={m.score} size={48} strokeWidth={4} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedMatchForModal({
                              score: m.score,
                              clientName,
                              searchName: m.search?.name,
                              offerTitle,
                              offerType: m.offerType,
                              stage,
                              price: offerPrice,
                              explanation: m.parsedExplanation || [],
                            })
                          }
                          className="btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <HelpCircle size={12} />
                          Por quê?
                        </button>

                        <Link
                          href={`/?buscaId=${m.search?.id}`}
                          className="btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                          title="Explorar no mapa da carteira"
                        >
                          <MapPin size={12} color="var(--color-primary)" />
                          No mapa
                        </Link>
                      </div>

                      <Link
                        href={offerLink}
                        className="btn-primary"
                        style={{ padding: '4px 8px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center', textDecoration: 'none' }}
                      >
                        Ver Oferta
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Explicativo: Por que combina? */}
      {selectedMatchForModal && (
        <MatchExplanationModal
          isOpen={Boolean(selectedMatchForModal)}
          onClose={() => setSelectedMatchForModal(null)}
          score={selectedMatchForModal.score}
          clientName={selectedMatchForModal.clientName}
          searchName={selectedMatchForModal.searchName}
          offerTitle={selectedMatchForModal.offerTitle}
          offerType={selectedMatchForModal.offerType}
          stage={selectedMatchForModal.stage}
          price={selectedMatchForModal.price}
          explanation={selectedMatchForModal.explanation}
        />
      )}
    </div>
  );
}
