'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Plus,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  DollarSign,
  Pencil,
  Trash2,
  AlertCircle,
  Layers,
  Table as TableIcon,
  Home,
  CheckCircle2,
} from 'lucide-react';
import FieldHelper from '@/components/FieldHelper';
import styles from '@/styles/commercial-units.module.css';
import type { CommercialUnitType } from '@/lib/commercial-unit-service';
import {
  COMMERCIAL_UNIT_TYPE_LABELS,
  formatCurrencyBRL,
  parseBrazilianDecimal,
  resolvePrimaryAreaForSummary,
} from '@/lib/commercial-unit-format';
import {
  CommercialUnitDetail,
  CommercialUnitStatusBadge,
  ResaleListingBadge,
  CapacityBadge,
  formatPricePerSqmText,
  formatUnitFloor,
} from '@/components/commercial-units/CommercialUnitShared';
import { CommercialUnitFormModal } from './CommercialUnitFormModal';
import { CommercialUnitPriceModal } from './CommercialUnitPriceModal';
import { CommercialUnitStatusModal } from './CommercialUnitStatusModal';

interface CommercialUnitsManagerProps {
  developmentId: string;
  developmentName: string;
  blocks: Array<{ id: string; name: string; blockType: string }>;
  typologies: Array<{
    id: string;
    name: string;
    propertyType: string;
    privateArea?: number | null;
    builtArea?: number | null;
    totalArea?: number | null;
    bedrooms?: number | null;
    suites?: number | null;
    bathrooms?: number | null;
    lavabos?: number | null;
    parkingSpaces?: number | null;
    price?: number | null;
  }>;
  onStockMutated?: () => void;
}

type AreaFilterType = 'PRIVATE' | 'TOTAL' | 'BUILT' | 'LAND';
type ViewMode = 'HIERARCHICAL' | 'TABLE';

interface FloorItem {
  floor: number;
  label: string;
  plannedUnitsCount: number;
  units: any[];
  availableCount: number;
  reservedCount: number;
  soldCount: number;
  minAvailablePrice: number | null;
}

interface BlockHierarchy {
  blockId: string | null;
  name: string;
  blockType: 'TOWER' | 'QUADRA' | 'BLOCO';
  isVertical: boolean;
  totalFloors?: number | null;
  unitsPerFloor?: number | null;
  plannedUnitsTotal?: number | null;
  floors: FloorItem[];
  directUnits: any[];
  totalUnits: number;
  availableCount: number;
  reservedCount: number;
  soldCount: number;
  minAvailablePrice: number | null;
}

function getDefaultFloorLabel(floor: number): string {
  if (floor === 0) return 'Térreo';
  if (floor < 0) return `${Math.abs(floor)}º Subsolo`;
  return `${floor}º Andar`;
}

/**
 * Gestão administrativa (ADMIN) do estoque oficial de unidades comerciais.
 * Suporta navegação hierárquica por Torre -> Pavimento -> Unidade (vertical)
 * e Quadra -> Unidade (horizontal), além de modo tabela tradicional.
 */
export function CommercialUnitsManager({
  developmentId,
  developmentName,
  blocks,
  typologies,
  onStockMutated,
}: CommercialUnitsManagerProps) {
  const [units, setUnits] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalUnits: 0,
    availableCount: 0,
    reservedCount: 0,
    soldCount: 0,
    unavailableCount: 0,
    minAvailablePrice: null as number | null,
    maxAvailablePrice: null as number | null,
  });
  const [blockSummaries, setBlockSummaries] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 100, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modo de visualização (Hierárquico / Tabela)
  const [viewMode, setViewMode] = useState<ViewMode>('HIERARCHICAL');

  // Filtros e ordenação
  const [search, setSearch] = useState('');
  const [filterBlockId, setFilterBlockId] = useState('');
  const [filterUnitType, setFilterUnitType] = useState('');
  const [filterTypologyId, setFilterTypologyId] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [minPriceRaw, setMinPriceRaw] = useState('');
  const [maxPriceRaw, setMaxPriceRaw] = useState('');
  const [areaType, setAreaType] = useState<AreaFilterType>('PRIVATE');
  const [minAreaRaw, setMinAreaRaw] = useState('');
  const [maxAreaRaw, setMaxAreaRaw] = useState('');
  const [sortBy, setSortBy] = useState('floor');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Expansão da hierarquia
  const [expandedBlockIds, setExpandedBlockIds] = useState<Set<string>>(new Set());
  const [expandedFloorKeys, setExpandedFloorKeys] = useState<Set<string>>(new Set());

  // Expansão de detalhes da unidade
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);
  const [expandedDetailById, setExpandedDetailById] = useState<Record<string, any>>({});
  const [expandedHistoryById, setExpandedHistoryById] = useState<Record<string, any[]>>({});
  const [loadingExpandId, setLoadingExpandId] = useState<string | null>(null);

  // Modais administrativos
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any | null>(null);
  const [priceModalUnit, setPriceModalUnit] = useState<any | null>(null);
  const [statusModalUnit, setStatusModalUnit] = useState<any | null>(null);

  const isFilterActive = Boolean(
    search.trim() ||
      filterBlockId ||
      filterUnitType ||
      filterTypologyId ||
      filterStatus !== 'ALL' ||
      minPriceRaw ||
      maxPriceRaw ||
      minAreaRaw ||
      maxAreaRaw
  );

  const fetchUnitsAndSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (filterBlockId) params.set('blockId', filterBlockId);
      if (filterUnitType) params.set('unitType', filterUnitType);
      if (filterTypologyId) params.set('typologyId', filterTypologyId);
      if (filterStatus && filterStatus !== 'ALL') params.set('commercialStatus', filterStatus);

      const minPrice = parseBrazilianDecimal(minPriceRaw, { allowZero: false });
      const maxPrice = parseBrazilianDecimal(maxPriceRaw, { allowZero: false });
      if (minPrice != null && !Number.isNaN(minPrice)) params.set('minPrice', String(minPrice));
      if (maxPrice != null && !Number.isNaN(maxPrice)) params.set('maxPrice', String(maxPrice));

      const minArea = parseBrazilianDecimal(minAreaRaw, { allowZero: false });
      const maxArea = parseBrazilianDecimal(maxAreaRaw, { allowZero: false });
      const hasMin = minArea != null && !Number.isNaN(minArea);
      const hasMax = maxArea != null && !Number.isNaN(maxArea);
      if (hasMin || hasMax) {
        params.set('areaType', areaType);
        if (hasMin) params.set('minArea', String(minArea));
        if (hasMax) params.set('maxArea', String(maxArea));
      }

      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      params.set('page', String(page));
      params.set('limit', '100');

      const [unitsRes, blocksRes] = await Promise.all([
        fetch(`/api/admin/developments/${developmentId}/units?${params.toString()}`),
        fetch(`/api/admin/developments/${developmentId}/blocks`),
      ]);

      const unitsData = await unitsRes.json();
      if (!unitsRes.ok) throw new Error(unitsData.error || 'Erro ao carregar unidades comerciais.');

      const receivedUnits = Array.isArray(unitsData.units)
        ? unitsData.units
        : Array.isArray(unitsData.items)
        ? unitsData.items
        : [];
      setUnits(receivedUnits);
      if (unitsData.summary) setSummary(unitsData.summary);
      if (unitsData.pagination) setPagination(unitsData.pagination);

      if (blocksRes.ok) {
        const blocksData = await blocksRes.json();
        const receivedBlocks = Array.isArray(blocksData.blocks)
          ? blocksData.blocks
          : Array.isArray(blocksData.items)
          ? blocksData.items
          : [];
        setBlockSummaries(receivedBlocks);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar estoque de unidades comerciais.');
    } finally {
      setLoading(false);
    }
  }, [
    developmentId,
    search,
    filterBlockId,
    filterUnitType,
    filterTypologyId,
    filterStatus,
    minPriceRaw,
    maxPriceRaw,
    areaType,
    minAreaRaw,
    maxAreaRaw,
    sortBy,
    sortOrder,
    page,
  ]);

  useEffect(() => {
    fetchUnitsAndSummary();
  }, [fetchUnitsAndSummary]);

  // Construção da hierarquia Torre -> Pavimentos -> Unidades ou Quadra -> Unidades
  const hierarchy = useMemo<BlockHierarchy[]>(() => {
    // Lista de blocos de referência
    const blockMap = new Map<string, any>();
    blockSummaries.forEach((b) => blockMap.set(b.id, b));
    blocks.forEach((b) => {
      if (!blockMap.has(b.id)) {
        blockMap.set(b.id, {
          ...b,
          unitStats: { totalUnits: 0, availableUnits: 0, reservedUnits: 0, soldUnits: 0 },
        });
      }
    });

    // Agrupamento de unidades por blockId
    const unitsByBlock = new Map<string | null, any[]>();
    units.forEach((u) => {
      const bId = u.blockId || null;
      const list = unitsByBlock.get(bId) || [];
      list.push(u);
      unitsByBlock.set(bId, list);
    });

    const result: BlockHierarchy[] = [];

    // Processar cada bloco cadastrado
    blockMap.forEach((block, bId) => {
      const blockUnits = unitsByBlock.get(bId) || [];
      const isVertical = block.blockType === 'TOWER' || (block.blockType === 'BLOCO' && (block.totalFloors > 0 || (block.floorDistribution && block.floorDistribution.length > 0)));

      if (!isVertical) {
        // Horizontal: Quadras ou Loteamentos sem pavimentos
        const availableUnits = blockUnits.filter((u) => u.commercialStatus === 'DISPONIVEL');
        const minAvailablePrice =
          availableUnits.length > 0
            ? Math.min(...availableUnits.map((u) => u.effectivePrice || u.listPrice || Infinity))
            : null;

        result.push({
          blockId: bId,
          name: block.name,
          blockType: block.blockType || 'QUADRA',
          isVertical: false,
          totalFloors: null,
          unitsPerFloor: null,
          plannedUnitsTotal: block.plannedUnitsTotal ?? null,
          floors: [],
          directUnits: blockUnits,
          totalUnits: blockUnits.length,
          availableCount: availableUnits.length,
          reservedCount: blockUnits.filter((u) => u.commercialStatus === 'RESERVADA').length,
          soldCount: blockUnits.filter((u) => u.commercialStatus === 'VENDIDA').length,
          minAvailablePrice: minAvailablePrice === Infinity ? null : minAvailablePrice,
        });
      } else {
        // Vertical: Torres e Blocos verticais
        // Coleta de pavimentos planejados e reais
        const floorConfigs = new Map<number, { label: string; plannedUnitsCount: number }>();

        if (Array.isArray(block.floorDistribution)) {
          block.floorDistribution.forEach((fd: any) => {
            if (typeof fd.floor === 'number') {
              floorConfigs.set(fd.floor, {
                label: fd.label || getDefaultFloorLabel(fd.floor),
                plannedUnitsCount: fd.plannedUnitsCount ?? 0,
              });
            }
          });
        } else if (block.totalFloors && block.totalFloors > 0) {
          const defaultPerFloor = block.unitsPerFloor || 0;
          for (let f = 1; f <= block.totalFloors; f++) {
            floorConfigs.set(f, {
              label: getDefaultFloorLabel(f),
              plannedUnitsCount: defaultPerFloor,
            });
          }
        }

        // Unidades por pavimento
        const unitsByFloor = new Map<number, any[]>();
        const directUnits: any[] = [];

        blockUnits.forEach((u) => {
          if (u.floor != null && typeof u.floor === 'number') {
            const list = unitsByFloor.get(u.floor) || [];
            list.push(u);
            unitsByFloor.set(u.floor, list);
            if (!floorConfigs.has(u.floor)) {
              floorConfigs.set(u.floor, {
                label: getDefaultFloorLabel(u.floor),
                plannedUnitsCount: 0,
              });
            }
          } else {
            directUnits.push(u);
          }
        });

        // Ordenar pavimentos
        const sortedFloors = Array.from(floorConfigs.keys()).sort((a, b) => {
          return sortOrder === 'desc' ? b - a : a - b;
        });

        const floors: FloorItem[] = sortedFloors.map((flNum) => {
          const cfg = floorConfigs.get(flNum)!;
          const flUnits = unitsByFloor.get(flNum) || [];
          const avail = flUnits.filter((u) => u.commercialStatus === 'DISPONIVEL');
          const minP =
            avail.length > 0
              ? Math.min(...avail.map((u) => u.effectivePrice || u.listPrice || Infinity))
              : null;

          return {
            floor: flNum,
            label: cfg.label,
            plannedUnitsCount: cfg.plannedUnitsCount,
            units: flUnits,
            availableCount: avail.length,
            reservedCount: flUnits.filter((u) => u.commercialStatus === 'RESERVADA').length,
            soldCount: flUnits.filter((u) => u.commercialStatus === 'VENDIDA').length,
            minAvailablePrice: minP === Infinity ? null : minP,
          };
        });

        const availTotal = blockUnits.filter((u) => u.commercialStatus === 'DISPONIVEL');
        const minBlockP =
          availTotal.length > 0
            ? Math.min(...availTotal.map((u) => u.effectivePrice || u.listPrice || Infinity))
            : null;

        result.push({
          blockId: bId,
          name: block.name,
          blockType: block.blockType || 'TOWER',
          isVertical: true,
          totalFloors: block.totalFloors ?? null,
          unitsPerFloor: block.unitsPerFloor ?? null,
          plannedUnitsTotal: block.plannedUnitsTotal ?? null,
          floors,
          directUnits,
          totalUnits: blockUnits.length,
          availableCount: availTotal.length,
          reservedCount: blockUnits.filter((u) => u.commercialStatus === 'RESERVADA').length,
          soldCount: blockUnits.filter((u) => u.commercialStatus === 'VENDIDA').length,
          minAvailablePrice: minBlockP === Infinity ? null : minBlockP,
        });
      }
    });

    // Unidades sem bloco vinculado
    const unassignedUnits = unitsByBlock.get(null) || [];
    if (unassignedUnits.length > 0) {
      const avail = unassignedUnits.filter((u) => u.commercialStatus === 'DISPONIVEL');
      const minP =
        avail.length > 0
          ? Math.min(...avail.map((u) => u.effectivePrice || u.listPrice || Infinity))
          : null;

      result.push({
        blockId: null,
        name: 'Geral / Sem Torre Definida',
        blockType: 'BLOCO',
        isVertical: false,
        totalFloors: null,
        unitsPerFloor: null,
        plannedUnitsTotal: null,
        floors: [],
        directUnits: unassignedUnits,
        totalUnits: unassignedUnits.length,
        availableCount: avail.length,
        reservedCount: unassignedUnits.filter((u) => u.commercialStatus === 'RESERVADA').length,
        soldCount: unassignedUnits.filter((u) => u.commercialStatus === 'VENDIDA').length,
        minAvailablePrice: minP === Infinity ? null : minP,
      });
    }

    return result;
  }, [blockSummaries, blocks, units, sortOrder]);

  // Auto-expansão SOMENTE quando o usuário realizar uma busca ativa
  useEffect(() => {
    if (hierarchy.length === 0) return;

    const searchTerm = search.trim();
    if (searchTerm) {
      // Quando há busca específica por unidade/código/posição, expande os agrupamentos necessários
      const nextBlocks = new Set<string>();
      const nextFloors = new Set<string>();

      hierarchy.forEach((b) => {
        const hasDirect = b.directUnits.length > 0;
        const floorsWithUnits = b.floors.filter((f) => f.units.length > 0);

        if (hasDirect || floorsWithUnits.length > 0) {
          nextBlocks.add(b.blockId || 'unassigned');
          floorsWithUnits.forEach((f) => {
            nextFloors.add(`${b.blockId || 'unassigned'}-f-${f.floor}`);
          });
        }
      });

      setExpandedBlockIds(nextBlocks);
      setExpandedFloorKeys(nextFloors);
    }
  }, [hierarchy, search]);

  const toggleBlock = (blockKey: string) => {
    setExpandedBlockIds((prev) => {
      const next = new Set(prev);
      if (next.has(blockKey)) next.delete(blockKey);
      else next.add(blockKey);
      return next;
    });
  };

  const toggleFloor = (floorKey: string) => {
    setExpandedFloorKeys((prev) => {
      const next = new Set(prev);
      if (next.has(floorKey)) next.delete(floorKey);
      else next.add(floorKey);
      return next;
    });
  };

  const handleExpandAll = () => {
    const allBlocks = new Set<string>();
    const allFloors = new Set<string>();
    hierarchy.forEach((b) => {
      const bKey = b.blockId || 'unassigned';
      allBlocks.add(bKey);
      b.floors.forEach((f) => allFloors.add(`${bKey}-f-${f.floor}`));
    });
    setExpandedBlockIds(allBlocks);
    setExpandedFloorKeys(allFloors);
  };

  const handleCollapseAll = () => {
    setExpandedBlockIds(new Set());
    setExpandedFloorKeys(new Set());
  };

  const loadExpandedDetails = useCallback(
    async (unitId: string, force = false) => {
      if (!force && expandedDetailById[unitId] && expandedHistoryById[unitId]) return;
      setLoadingExpandId(unitId);
      try {
        const [detailRes, histRes] = await Promise.all([
          fetch(`/api/admin/developments/${developmentId}/units/${unitId}`),
          fetch(`/api/admin/developments/${developmentId}/units/${unitId}/history`),
        ]);
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          if (detailData.unit) setExpandedDetailById((prev) => ({ ...prev, [unitId]: detailData.unit }));
        }
        if (histRes.ok) {
          const histData = await histRes.json();
          setExpandedHistoryById((prev) => ({
            ...prev,
            [unitId]: Array.isArray(histData.items) ? histData.items : [],
          }));
        }
      } finally {
        setLoadingExpandId(null);
      }
    },
    [developmentId, expandedDetailById, expandedHistoryById]
  );

  const toggleExpandUnit = async (unitId: string) => {
    if (expandedUnitId === unitId) {
      setExpandedUnitId(null);
      return;
    }
    setExpandedUnitId(unitId);
    await loadExpandedDetails(unitId);
  };

  const handleAfterMutation = async (mutatedUnitId?: string) => {
    await fetchUnitsAndSummary();
    if (mutatedUnitId && expandedUnitId === mutatedUnitId) await loadExpandedDetails(mutatedUnitId, true);
    if (onStockMutated) onStockMutated();
  };

  const handleDeleteUnit = async (unit: any) => {
    if (
      !window.confirm(
        `Confirma a exclusão da unidade "${unit.unitCode}"?\n\nUnidades com histórico de alterações, condições de pagamento vinculadas ou status diferente de Disponível são protegidas contra exclusão.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/developments/${developmentId}/units/${unit.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível excluir a unidade comercial.');
      if (expandedUnitId === unit.id) setExpandedUnitId(null);
      await handleAfterMutation();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir unidade comercial.');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setFilterBlockId('');
    setFilterUnitType('');
    setFilterTypologyId('');
    setFilterStatus('ALL');
    setMinPriceRaw('');
    setMaxPriceRaw('');
    setMinAreaRaw('');
    setMaxAreaRaw('');
    setAreaType('PRIVATE');
    setSortBy('floor');
    setSortOrder('asc');
    setPage(1);
  };

  const openCreateWithDefaults = (defaultBlockId?: string | null, defaultFloor?: number | null) => {
    setEditingUnit({
      blockId: defaultBlockId || undefined,
      floor: defaultFloor ?? undefined,
    });
    setFormModalOpen(true);
  };

  const openCreate = () => {
    setEditingUnit(null);
    setFormModalOpen(true);
  };

  // Renderizador de Card individual da unidade (mobile-first)
  const renderUnitCard = (unit: any) => {
    const isExpanded = expandedUnitId === unit.id;
    const primaryArea = resolvePrimaryAreaForSummary(unit);
    const sqm = formatPricePerSqmText(unit);
    const typeLabel =
      COMMERCIAL_UNIT_TYPE_LABELS[(unit.unitType as CommercialUnitType) || 'APARTAMENTO'] || unit.unitType;
    const detail = expandedDetailById[unit.id] || unit;
    const historyList = expandedHistoryById[unit.id] || [];

    return (
      <div key={unit.id} className={styles.unitCard}>
        <div className={styles.unitCardHeader}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={styles.unitCardCode}>{unit.unitCode}</span>
              {unit.resaleSummary?.activeResaleListingsCount > 0 && (
                <ResaleListingBadge count={unit.resaleSummary.activeResaleListingsCount} />
              )}
            </div>
            <span className={styles.unitCardSub}>
              {unit.typology?.name ? `${unit.typology.name} • ${typeLabel}` : typeLabel}
            </span>
          </div>

          <CommercialUnitStatusBadge
            status={unit.commercialStatus}
            onClick={() => setStatusModalUnit(unit)}
            title="Clique para alterar status"
          />
        </div>

        <div className={styles.unitCardBody}>
          <div className={styles.unitCardRow}>
            <span style={{ color: '#6B7280' }}>Metragem:</span>
            <span style={{ fontWeight: 700, color: '#111827' }}>
              {primaryArea.formatted} <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>({primaryArea.shortLabel})</span>
            </span>
          </div>

          <div className={styles.unitCardRow}>
            <span style={{ color: '#6B7280' }}>Preço de tabela:</span>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontWeight: 800, color: '#1E4620' }}>
                {formatCurrencyBRL(unit.effectivePrice)}
              </span>
              {unit.promotionalPrice != null &&
                unit.listPrice != null &&
                unit.promotionalPrice < unit.listPrice && (
                  <span className={`${styles.cellSub} ${styles.cellStrike}`} style={{ display: 'block' }}>
                    {formatCurrencyBRL(unit.listPrice)}
                  </span>
                )}
            </div>
          </div>

          <div className={styles.unitCardRow}>
            <span style={{ color: '#6B7280' }}>R$/m²:</span>
            <span
              style={{ fontWeight: 600, color: sqm.available ? '#374151' : '#9CA3AF' }}
              title={sqm.basis}
            >
              {sqm.value}
            </span>
          </div>
        </div>

        <div className={styles.unitCardActions}>
          <button
            type="button"
            onClick={() => setPriceModalUnit(unit)}
            className={`${styles.btn} ${styles.btnSecondary} ${styles.btnIcon}`}
            title="Alterar preço"
            aria-label={`Alterar preço da unidade ${unit.unitCode}`}
          >
            <DollarSign size={14} />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingUnit(unit);
              setFormModalOpen(true);
            }}
            className={`${styles.btn} ${styles.btnSecondary} ${styles.btnIcon}`}
            title="Editar unidade"
            aria-label={`Editar unidade ${unit.unitCode}`}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteUnit(unit)}
            className={`${styles.btn} ${styles.btnDanger} ${styles.btnIcon}`}
            title="Excluir unidade"
            aria-label={`Excluir unidade ${unit.unitCode}`}
          >
            <Trash2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => toggleExpandUnit(unit.id)}
            className={`${styles.btn} ${isExpanded ? styles.btnPrimary : styles.btnSecondary} ${styles.btnSm}`}
            aria-expanded={isExpanded}
          >
            {isExpanded ? 'Recolher' : 'Ver detalhes'}
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        {isExpanded && (
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #E5E7EB' }}>
            {loadingExpandId === unit.id ? (
              <div className={styles.loading}>Carregando ficha e histórico da unidade {unit.unitCode}...</div>
            ) : (
              <CommercialUnitDetail
                unit={detail}
                developmentName={developmentName}
                isAdmin
                history={historyList}
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => setPriceModalUnit(detail)}
                      className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                    >
                      <DollarSign size={14} />
                      Alterar preço
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusModalUnit(detail)}
                      className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                    >
                      <CheckCircle2 size={14} />
                      Alterar disponibilidade
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUnit(detail);
                        setFormModalOpen(true);
                      }}
                      className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
                    >
                      <Pencil size={14} />
                      Editar unidade
                    </button>
                  </>
                }
              />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.root}>
      {/* RESUMO DO ESTOQUE */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              <Building2 size={18} className={styles.sectionTitleIcon} />
              Estoque oficial de unidades comerciais
            </h2>
            <p className={styles.sectionSubtitle}>
              Gestão hierárquica por pavimento e quadra. Totalmente adaptada para visualização mobile e desktop.
            </p>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              onClick={() => fetchUnitsAndSummary()}
              className={`${styles.btn} ${styles.btnSecondary} ${styles.btnIcon}`}
              title="Atualizar estoque"
              aria-label="Atualizar estoque"
            >
              <RefreshCw size={16} className={loading ? styles.spin : undefined} />
            </button>
            <button type="button" onClick={openCreate} className={`${styles.btn} ${styles.btnPrimary}`}>
              <Plus size={16} />
              Nova unidade
            </button>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total cadastradas</span>
            <span className={styles.statValue}>{summary.totalUnits}</span>
          </div>
          <div className={`${styles.statCard} ${styles.toneSuccess}`}>
            <span className={styles.statLabel}>Disponíveis</span>
            <span className={styles.statValue}>{summary.availableCount}</span>
          </div>
          <div className={`${styles.statCard} ${styles.toneWarning}`}>
            <span className={styles.statLabel}>Reservadas</span>
            <span className={styles.statValue}>{summary.reservedCount}</span>
          </div>
          <div className={`${styles.statCard} ${styles.toneDanger}`}>
            <span className={styles.statLabel}>Vendidas</span>
            <span className={styles.statValue}>{summary.soldCount}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Indisponíveis</span>
            <span className={styles.statValue}>{summary.unavailableCount}</span>
          </div>
          <div className={`${styles.statCard} ${styles.tonePrimary}`}>
            <span className={styles.statLabel}>Menor preço disp.</span>
            <span className={`${styles.statValue} ${styles.statValueSm}`}>
              {summary.minAvailablePrice != null
                ? formatCurrencyBRL(summary.minAvailablePrice, { compact: true })
                : '—'}
            </span>
          </div>
          <div className={`${styles.statCard} ${styles.tonePrimary}`}>
            <span className={styles.statLabel}>Maior preço disp.</span>
            <span className={`${styles.statValue} ${styles.statValueSm}`}>
              {summary.maxAvailablePrice != null
                ? formatCurrencyBRL(summary.maxAvailablePrice, { compact: true })
                : '—'}
            </span>
          </div>
        </div>

        {blockSummaries.length > 0 && (
          <>
            <hr className={styles.divider} />
            <div className={styles.sectionLabel}>
              <Layers size={14} />
              Distribuição por torre / bloco / quadra
            </div>
            <div className={styles.chips}>
              {blockSummaries.map((b) => {
                const st = b.unitStats || { totalUnits: 0, availableUnits: 0 };
                const isSelected = filterBlockId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setFilterBlockId(isSelected ? '' : b.id);
                      setPage(1);
                    }}
                    className={`${styles.chip} ${isSelected ? styles.chipActive : ''}`}
                  >
                    {b.name}
                    <span className={styles.chipMeta}>
                      {st.availableUnits} disp. / {st.totalUnits}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* FILTROS, BUSCA E ORDENAÇÃO */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionLabel}>
            <Filter size={14} />
            Filtros, busca e ordenação
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className={`${styles.btn} ${styles.btnGhost}`}
              aria-expanded={showAdvanced}
            >
              {showAdvanced ? 'Menos filtros' : 'Mais filtros'}
              {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <button type="button" onClick={resetFilters} className={`${styles.btn} ${styles.btnGhost}`}>
              Limpar filtros
            </button>
          </div>
        </div>

        <div className={styles.filtersGrid}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cu-f-search">
              Buscar
            </label>
            <div className={styles.searchWrap}>
              <Search size={16} className={styles.searchIcon} />
              <input
                id="cu-f-search"
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Unidade, lote, posição..."
                className={`${styles.input} ${styles.searchInput}`}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="cu-f-block">
              Torre / quadra
            </label>
            <select
              id="cu-f-block"
              value={filterBlockId}
              onChange={(e) => {
                setFilterBlockId(e.target.value);
                setPage(1);
              }}
              className={styles.select}
            >
              <option value="">Todas</option>
              {blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.blockType})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="cu-f-type">
              Tipo de imóvel
            </label>
            <select
              id="cu-f-type"
              value={filterUnitType}
              onChange={(e) => {
                const next = e.target.value;
                setFilterUnitType(next);
                if (next === 'LOTE') setAreaType('LAND');
                else if (next === 'CASA') setAreaType('BUILT');
                else if (next) setAreaType('PRIVATE');
                setPage(1);
              }}
              className={styles.select}
            >
              <option value="">Todos</option>
              {(Object.keys(COMMERCIAL_UNIT_TYPE_LABELS) as CommercialUnitType[]).map((t) => (
                <option key={t} value={t}>
                  {COMMERCIAL_UNIT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label className={styles.label} htmlFor="cu-f-status">
                Disponibilidade
              </label>
              <FieldHelper helpKey="commercialStatus" size={13} />
            </div>
            <select
              id="cu-f-status"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className={styles.select}
            >
              <option value="ALL">Todas</option>
              <option value="DISPONIVEL">Disponíveis</option>
              <option value="RESERVADA">Reservadas</option>
              <option value="VENDIDA">Vendidas</option>
              <option value="INDISPONIVEL_TEMPORARIAMENTE">Indisponíveis temporariamente</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="cu-f-sort">
              Ordenar por
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <select
                id="cu-f-sort"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className={styles.select}
              >
                <option value="floor">Pavimento</option>
                <option value="unitCode">Identificação</option>
                <option value="listPrice">Preço de tabela</option>
                <option value="privateArea">Área privativa</option>
                <option value="totalArea">Área total</option>
                <option value="builtArea">Área construída</option>
                <option value="landArea">Área do terreno</option>
                <option value="pricePerSqm">Preço por m²</option>
                <option value="commercialStatus">Disponibilidade</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className={`${styles.btn} ${styles.btnSecondary} ${styles.btnIcon}`}
                title={sortOrder === 'asc' ? 'Crescente (clique para inverter)' : 'Decrescente (clique para inverter)'}
                aria-label="Alternar ordem crescente/decrescente"
              >
                <ArrowUpDown size={15} />
              </button>
            </div>
          </div>
        </div>

        {showAdvanced && (
          <div className={styles.filtersGrid}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="cu-f-typology">
                Tipologia
              </label>
              <select
                id="cu-f-typology"
                value={filterTypologyId}
                onChange={(e) => {
                  setFilterTypologyId(e.target.value);
                  setPage(1);
                }}
                className={styles.select}
              >
                <option value="">Todas</option>
                {typologies.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="cu-f-minp">
                Preço mínimo (R$)
              </label>
              <input
                id="cu-f-minp"
                type="text"
                inputMode="decimal"
                value={minPriceRaw}
                onChange={(e) => {
                  setMinPriceRaw(e.target.value);
                  setPage(1);
                }}
                placeholder="Ex.: 500.000"
                className={styles.input}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="cu-f-maxp">
                Preço máximo (R$)
              </label>
              <input
                id="cu-f-maxp"
                type="text"
                inputMode="decimal"
                value={maxPriceRaw}
                onChange={(e) => {
                  setMaxPriceRaw(e.target.value);
                  setPage(1);
                }}
                placeholder="Ex.: 1.200.000"
                className={styles.input}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="cu-f-areatype">
                Metragem do filtro
              </label>
              <select
                id="cu-f-areatype"
                value={areaType}
                onChange={(e) => {
                  setAreaType(e.target.value as AreaFilterType);
                  setPage(1);
                }}
                className={styles.select}
              >
                <option value="PRIVATE">Área privativa</option>
                <option value="TOTAL">Área total</option>
                <option value="BUILT">Área construída</option>
                <option value="LAND">Área do terreno</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="cu-f-mina">
                Área mín. (m²)
              </label>
              <input
                id="cu-f-mina"
                type="text"
                inputMode="decimal"
                value={minAreaRaw}
                onChange={(e) => {
                  setMinAreaRaw(e.target.value);
                  setPage(1);
                }}
                placeholder="Ex.: 70"
                className={styles.input}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="cu-f-maxa">
                Área máx. (m²)
              </label>
              <input
                id="cu-f-maxa"
                type="text"
                inputMode="decimal"
                value={maxAreaRaw}
                onChange={(e) => {
                  setMaxAreaRaw(e.target.value);
                  setPage(1);
                }}
                placeholder="Ex.: 150"
                className={styles.input}
              />
            </div>
          </div>
        )}
      </section>

      {error && (
        <div className={`${styles.alert} ${styles.alertError}`} role="alert">
          <AlertCircle size={16} className={styles.alertIcon} />
          <span>{error}</span>
        </div>
      )}

      {/* APRESENTAÇÃO E NAVEGAÇÃO DE UNIDADES */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#111827' }}>
              Unidades encontradas: {units.length}
            </span>

            {/* Alternador de visualização */}
            <div className={styles.viewModeToggle}>
              <button
                type="button"
                onClick={() => setViewMode('HIERARCHICAL')}
                className={`${styles.viewModeBtn} ${viewMode === 'HIERARCHICAL' ? styles.viewModeBtnActive : ''}`}
                title="Visualização hierárquica por pavimento e quadra"
              >
                <Layers size={14} />
                <span>Hierárquico</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                className={`${styles.viewModeBtn} ${viewMode === 'TABLE' ? styles.viewModeBtnActive : ''}`}
                title="Visualização em tabela plana"
              >
                <TableIcon size={14} />
                <span>Tabela</span>
              </button>
            </div>
          </div>

          {viewMode === 'HIERARCHICAL' && hierarchy.length > 0 && (
            <div className={styles.headerActions}>
              <button
                type="button"
                onClick={handleExpandAll}
                className={`${styles.btn} ${styles.btnGhost}`}
                style={{ fontSize: '0.76rem' }}
              >
                Expandir tudo
              </button>
              <button
                type="button"
                onClick={handleCollapseAll}
                className={`${styles.btn} ${styles.btnGhost}`}
                style={{ fontSize: '0.76rem' }}
              >
                Recolher tudo
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className={styles.loading}>Carregando unidades comerciais...</div>
        ) : units.length === 0 ? (
          summary.totalUnits === 0 ? (
            /* Sem nenhuma unidade cadastrada */
            <div className={styles.emptyState}>
              <Building2 size={40} color="var(--color-primary)" />
              <span className={styles.emptyTitle}>Nenhuma unidade cadastrada neste empreendimento</span>
              <p className={styles.emptyText}>
                Inicie o cadastro das unidades oficiais informando número/código, pavimento ou quadra, tipologia e
                valores de tabela.
              </p>
              <button type="button" onClick={openCreate} className={`${styles.btn} ${styles.btnPrimary}`}>
                <Plus size={16} />
                Cadastrar primeira unidade
              </button>
            </div>
          ) : (
            /* Filtros ativos sem resultados */
            <div className={styles.emptyState}>
              <Search size={40} color="var(--text-light)" />
              <span className={styles.emptyTitle}>Nenhuma unidade comercial encontrada</span>
              <p className={styles.emptyText}>
                Nenhum registro corresponde aos filtros selecionados (busca, disponibilidade, tipologia ou faixa de preço).
              </p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={resetFilters} className={`${styles.btn} ${styles.btnSecondary}`}>
                  Limpar filtros
                </button>
                <button type="button" onClick={openCreate} className={`${styles.btn} ${styles.btnPrimary}`}>
                  <Plus size={16} />
                  Cadastrar unidade
                </button>
              </div>
            </div>
          )
        ) : viewMode === 'HIERARCHICAL' ? (
          /* VISUALIZAÇÃO HIERÁRQUICA MOBILE-FIRST */
          <div className={styles.hierarchyWrap}>
            {hierarchy.map((block) => {
              const bKey = block.blockId || 'unassigned';
              const isBlockExpanded = expandedBlockIds.has(bKey);

              return (
                <div key={bKey} className={styles.blockSection}>
                  <button
                    type="button"
                    onClick={() => toggleBlock(bKey)}
                    className={`${styles.blockHeader} ${isBlockExpanded ? styles.blockHeaderExpanded : ''}`}
                  >
                    <div className={styles.blockHeaderLeft}>
                      {isBlockExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      {block.isVertical ? (
                        <Building2 size={20} color="#1E4620" />
                      ) : (
                        <Home size={20} color="#065F46" />
                      )}
                      <div>
                        <h3 className={styles.blockTitle}>
                          {block.name}
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6B7280' }}>
                            ({block.isVertical ? 'Torre vertical' : 'Quadra horizontal'})
                          </span>
                        </h3>
                      </div>
                    </div>

                    <div className={styles.blockHeaderRight}>
                      {block.plannedUnitsTotal != null && block.plannedUnitsTotal > 0 ? (
                        <CapacityBadge current={block.totalUnits} planned={block.plannedUnitsTotal} />
                      ) : (
                        <CapacityBadge current={block.totalUnits} />
                      )}

                      {block.availableCount > 0 && (
                        <span className={`${styles.tag} ${styles.textSuccess}`}>
                          {block.availableCount} disp.
                        </span>
                      )}
                      {block.reservedCount > 0 && (
                        <span className={`${styles.tag} ${styles.textWarning}`}>
                          {block.reservedCount} res.
                        </span>
                      )}
                      {block.soldCount > 0 && (
                        <span className={styles.tag} style={{ color: '#DC2626' }}>
                          {block.soldCount} vend.
                        </span>
                      )}

                      {block.minAvailablePrice != null && (
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1E4620' }}>
                          A partir de {formatCurrencyBRL(block.minAvailablePrice, { compact: true })}
                        </span>
                      )}
                    </div>
                  </button>

                  {isBlockExpanded && (
                    <div className={styles.blockContent}>
                      {/* Estrutura vertical: Pavimentos */}
                      {block.isVertical && (
                        <>
                          {block.floors.length === 0 ? (
                            <div className={styles.emptyState} style={{ padding: '16px' }}>
                              <span>Nenhum pavimento configurado para esta torre.</span>
                              <button
                                type="button"
                                onClick={() => openCreateWithDefaults(block.blockId, 1)}
                                className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                                style={{ marginTop: '8px' }}
                              >
                                <Plus size={14} /> Cadastrar unidade
                              </button>
                            </div>
                          ) : (
                            block.floors.map((floor) => {
                              const fKey = `${bKey}-f-${floor.floor}`;
                              const isFloorExpanded = expandedFloorKeys.has(fKey);

                              return (
                                <div key={fKey} className={styles.floorCard}>
                                  <button
                                    type="button"
                                    onClick={() => toggleFloor(fKey)}
                                    className={`${styles.floorHeader} ${isFloorExpanded ? styles.floorHeaderExpanded : ''}`}
                                  >
                                    <div className={styles.floorHeaderLeft}>
                                      {isFloorExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                      <span className={styles.floorTitle}>{floor.label}</span>
                                      {floor.plannedUnitsCount > 0 ? (
                                        <CapacityBadge current={floor.units.length} planned={floor.plannedUnitsCount} />
                                      ) : (
                                        <CapacityBadge current={floor.units.length} />
                                      )}
                                    </div>

                                    <div className={styles.floorHeaderRight}>
                                      {floor.availableCount > 0 && (
                                        <span className={`${styles.tag} ${styles.textSuccess}`} style={{ fontSize: '0.70rem' }}>
                                          {floor.availableCount} disp.
                                        </span>
                                      )}
                                      {floor.reservedCount > 0 && (
                                        <span className={`${styles.tag} ${styles.textWarning}`} style={{ fontSize: '0.70rem' }}>
                                          {floor.reservedCount} res.
                                        </span>
                                      )}
                                      {floor.soldCount > 0 && (
                                        <span className={styles.tag} style={{ fontSize: '0.70rem', color: '#DC2626' }}>
                                          {floor.soldCount} vend.
                                        </span>
                                      )}

                                      {floor.minAvailablePrice != null && (
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1E4620' }}>
                                          A partir de {formatCurrencyBRL(floor.minAvailablePrice, { compact: true })}
                                        </span>
                                      )}
                                    </div>
                                  </button>

                                  {isFloorExpanded && (
                                    <div className={styles.floorContent}>
                                      {floor.units.length === 0 ? (
                                        <div
                                          style={{
                                            padding: '16px',
                                            textAlign: 'center',
                                            backgroundColor: '#F9FAFB',
                                            borderRadius: '6px',
                                            border: '1px dashed #E5E7EB',
                                            fontSize: '0.80rem',
                                            color: '#6B7280',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '8px',
                                          }}
                                        >
                                          <span>
                                            Nenhuma unidade cadastrada neste pavimento
                                            {floor.plannedUnitsCount > 0
                                              ? ` (capacidade planejada: ${floor.plannedUnitsCount} un.)`
                                              : ''}
                                            .
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => openCreateWithDefaults(block.blockId, floor.floor)}
                                            className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                                          >
                                            <Plus size={14} />
                                            Cadastrar unidade no {floor.label}
                                          </button>
                                        </div>
                                      ) : (
                                        <div className={styles.unitCardsGrid}>
                                          {floor.units.map(renderUnitCard)}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}

                          {/* Unidades da torre sem andar especificado */}
                          {block.directUnits.length > 0 && (
                            <div style={{ marginTop: '10px' }}>
                              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6B7280', marginBottom: '8px' }}>
                                Outras unidades desta torre (sem pavimento atribuído)
                              </div>
                              <div className={styles.unitCardsGrid}>
                                {block.directUnits.map(renderUnitCard)}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Estrutura horizontal: Quadras e Lotes diretamente */}
                      {!block.isVertical && (
                        <div className={styles.unitCardsGrid}>
                          {block.directUnits.map(renderUnitCard)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* MODO TABELA PLANA (DESKTOP) */
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Torre / quadra</th>
                  <th>Unidade</th>
                  <th>Pav.</th>
                  <th>Tipologia / tipo</th>
                  <th>Metragem</th>
                  <th>Preço</th>
                  <th>R$/m²</th>
                  <th>Disponibilidade</th>
                  <th className={styles.alignRight}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {units.map((unit) => {
                  const primaryArea = resolvePrimaryAreaForSummary(unit);
                  const isExpanded = expandedUnitId === unit.id;
                  const detail = expandedDetailById[unit.id] || unit;
                  const historyList = expandedHistoryById[unit.id] || [];
                  const typeLabel =
                    COMMERCIAL_UNIT_TYPE_LABELS[(unit.unitType as CommercialUnitType) || 'APARTAMENTO'];
                  const sqm = formatPricePerSqmText(unit);

                  return (
                    <React.Fragment key={unit.id}>
                      <tr className={`${styles.unitRow} ${isExpanded ? styles.rowExpanded : ''}`}>
                        <td data-label="Torre / quadra">{unit.block?.name || unit.quadraName || '—'}</td>
                        <td data-label="Unidade">
                          <span className={styles.cellCode}>{unit.unitCode}</span>
                          {unit.resaleSummary?.activeResaleListingsCount > 0 && (
                            <div style={{ marginTop: '3px' }}>
                              <ResaleListingBadge count={unit.resaleSummary.activeResaleListingsCount} />
                            </div>
                          )}
                        </td>
                        <td data-label="Pavimento">{formatUnitFloor(unit)}</td>
                        <td data-label="Tipologia / tipo">
                          <span className={styles.cellStrong}>{unit.typology?.name || typeLabel}</span>
                          {unit.typology?.name && <span className={styles.cellSub}>{typeLabel}</span>}
                        </td>
                        <td data-label="Metragem">
                          <span className={styles.cellStrong}>{primaryArea.formatted}</span>
                          <span className={styles.cellSub}>{primaryArea.shortLabel}</span>
                        </td>
                        <td data-label="Preço">
                          <span className={styles.cellStrong}>{formatCurrencyBRL(unit.effectivePrice)}</span>
                          {unit.promotionalPrice != null &&
                            unit.listPrice != null &&
                            unit.promotionalPrice < unit.listPrice && (
                              <span className={`${styles.cellSub} ${styles.cellStrike}`}>
                                {formatCurrencyBRL(unit.listPrice)}
                              </span>
                            )}
                        </td>
                        <td data-label="R$/m²">
                          <span className={sqm.available ? styles.cellStrong : styles.cellSub}>{sqm.value}</span>
                        </td>
                        <td data-label="Disponibilidade">
                          <CommercialUnitStatusBadge
                            status={unit.commercialStatus}
                            onClick={() => setStatusModalUnit(unit)}
                            title="Alterar disponibilidade"
                          />
                        </td>
                        <td className={styles.cellActionsTd}>
                          <div className={styles.cellActions}>
                            <button
                              type="button"
                              onClick={() => setPriceModalUnit(unit)}
                              className={`${styles.btn} ${styles.btnSecondary} ${styles.btnIcon}`}
                              title="Alterar preço"
                              aria-label={`Alterar preço da unidade ${unit.unitCode}`}
                            >
                              <DollarSign size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUnit(unit);
                                setFormModalOpen(true);
                              }}
                              className={`${styles.btn} ${styles.btnSecondary} ${styles.btnIcon}`}
                              title="Editar unidade"
                              aria-label={`Editar unidade ${unit.unitCode}`}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUnit(unit)}
                              className={`${styles.btn} ${styles.btnDanger} ${styles.btnIcon}`}
                              title="Excluir unidade (protegido se houver histórico)"
                              aria-label={`Excluir unidade ${unit.unitCode}`}
                            >
                              <Trash2 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleExpandUnit(unit.id)}
                              className={`${styles.btn} ${isExpanded ? styles.btnPrimary : styles.btnSecondary} ${styles.btnSm}`}
                              aria-expanded={isExpanded}
                            >
                              {isExpanded ? 'Recolher' : 'Ver detalhes'}
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className={styles.detailRow}>
                          <td colSpan={9}>
                            {loadingExpandId === unit.id ? (
                              <div className={styles.loading}>
                                Carregando ficha e histórico da unidade {unit.unitCode}...
                              </div>
                            ) : (
                              <CommercialUnitDetail
                                unit={detail}
                                developmentName={developmentName}
                                isAdmin
                                history={historyList}
                                actions={
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setPriceModalUnit(detail)}
                                      className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                                    >
                                      <DollarSign size={14} />
                                      Alterar preço
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setStatusModalUnit(detail)}
                                      className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                                    >
                                      <CheckCircle2 size={14} />
                                      Alterar disponibilidade
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingUnit(detail);
                                        setFormModalOpen(true);
                                      }}
                                      className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
                                    >
                                      <Pencil size={14} />
                                      Editar unidade
                                    </button>
                                  </>
                                }
                              />
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className={styles.pagination}>
            <span>
              Página <strong>{pagination.page}</strong> de <strong>{pagination.totalPages}</strong> (
              {pagination.total} unidades)
            </span>
            <div className={styles.headerActions}>
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </section>

      {formModalOpen && (
        <CommercialUnitFormModal
          developmentId={developmentId}
          blocks={blocks}
          typologies={typologies}
          initialUnit={editingUnit}
          onClose={() => {
            setFormModalOpen(false);
            setEditingUnit(null);
          }}
          onSuccess={() => handleAfterMutation(editingUnit?.id)}
        />
      )}

      {priceModalUnit && (
        <CommercialUnitPriceModal
          developmentId={developmentId}
          unit={priceModalUnit}
          onClose={() => setPriceModalUnit(null)}
          onSuccess={() => handleAfterMutation(priceModalUnit.id)}
        />
      )}

      {statusModalUnit && (
        <CommercialUnitStatusModal
          developmentId={developmentId}
          unit={statusModalUnit}
          onClose={() => setStatusModalUnit(null)}
          onSuccess={() => handleAfterMutation(statusModalUnit.id)}
        />
      )}
    </div>
  );
}
