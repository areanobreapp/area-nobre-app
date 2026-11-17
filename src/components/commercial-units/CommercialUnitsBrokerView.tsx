'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Search,
  AlertCircle,
  Layers,
  Table as TableIcon,
  Home,
} from 'lucide-react';
import FieldHelper from '@/components/FieldHelper';
import styles from '@/styles/commercial-units.module.css';
import type { CommercialUnitType } from '@/lib/commercial-unit-service';
import {
  COMMERCIAL_UNIT_TYPE_LABELS,
  formatCurrencyBRL,
  resolvePrimaryAreaForSummary,
} from '@/lib/commercial-unit-format';
import {
  CommercialUnitDetail,
  CommercialUnitStatusBadge,
  ResaleListingBadge,
  CapacityBadge,
  formatPricePerSqmText,
  formatUnitFloor,
} from './CommercialUnitShared';

interface CommercialUnitsBrokerViewProps {
  developmentId: string;
  developmentName?: string;
}

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
 * Consulta somente leitura das unidades comerciais para corretores (Bloco 6B — Etapa 6B.3.3).
 * - Usa exclusivamente rotas autenticadas `/api/developments/[id]/units...` e `/blocks`.
 * - Não exibe nenhum controle administrativo (sem botões de edição, preço ou exclusão).
 * - Exibe organização hierárquica por pavimento e quadra, além de indicador discreto
 *   de revendas do Bloco 05 quando houver imóvel físico compartilhado.
 */
export function CommercialUnitsBrokerView({ developmentId, developmentName }: CommercialUnitsBrokerViewProps) {
  const [units, setUnits] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [summary, setSummary] = useState<any | null>(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState('');

  const [viewMode, setViewMode] = useState<ViewMode>('HIERARCHICAL');

  const [search, setSearch] = useState('');
  const [filterBlockId, setFilterBlockId] = useState('');
  const [filterStatus, setFilterStatus] = useState('DISPONIVEL');
  const [filterUnitType, setFilterUnitType] = useState('');
  const [sortBy, setSortBy] = useState('floor');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  // Expansão da hierarquia
  const [expandedBlockIds, setExpandedBlockIds] = useState<Set<string>>(new Set());
  const [expandedFloorKeys, setExpandedFloorKeys] = useState<Set<string>>(new Set());

  // Ficha detalhada
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailById, setDetailById] = useState<Record<string, any>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);

  const isFilterActive = Boolean(search.trim() || filterBlockId || (filterStatus && filterStatus !== 'ALL') || filterUnitType);

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (filterBlockId) params.set('blockId', filterBlockId);
      if (filterStatus && filterStatus !== 'ALL') params.set('commercialStatus', filterStatus);
      if (filterUnitType) params.set('unitType', filterUnitType);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      params.set('page', String(page));
      params.set('limit', '100');

      const [unitsRes, blocksRes] = await Promise.all([
        fetch(`/api/developments/${developmentId}/units?${params.toString()}`),
        fetch(`/api/developments/${developmentId}/blocks`),
      ]);

      if (unitsRes.status === 404 || unitsRes.status === 403) {
        setHidden(true);
        return;
      }

      const data = await unitsRes.json();
      if (!unitsRes.ok) throw new Error(data.error || 'Erro ao consultar unidades.');

      const receivedUnits = Array.isArray(data.units)
        ? data.units
        : Array.isArray(data.items)
        ? data.items
        : [];
      setUnits(receivedUnits);
      setSummary(data.summary || null);
      if (data.pagination) setPagination(data.pagination);

      if (blocksRes.ok) {
        const bData = await blocksRes.json();
        const receivedBlocks = Array.isArray(bData.blocks)
          ? bData.blocks
          : Array.isArray(bData.items)
          ? bData.items
          : [];
        setBlocks(receivedBlocks);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao consultar unidades.');
    } finally {
      setLoading(false);
    }
  }, [developmentId, search, filterBlockId, filterStatus, filterUnitType, sortBy, sortOrder, page]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  // Construção da hierarquia Torre -> Pavimento -> Unidades ou Quadra -> Unidades
  const hierarchy = useMemo<BlockHierarchy[]>(() => {
    const blockMap = new Map<string, any>();
    blocks.forEach((b) => blockMap.set(b.id, b));

    const unitsByBlock = new Map<string | null, any[]>();
    units.forEach((u) => {
      const bId = u.blockId || null;
      const list = unitsByBlock.get(bId) || [];
      list.push(u);
      unitsByBlock.set(bId, list);
    });

    const result: BlockHierarchy[] = [];

    blockMap.forEach((block, bId) => {
      const blockUnits = unitsByBlock.get(bId) || [];
      const isVertical = block.blockType === 'TOWER' || (block.blockType === 'BLOCO' && (block.totalFloors > 0 || (block.floorDistribution && block.floorDistribution.length > 0)));

      if (!isVertical) {
        // Horizontal: Quadras ou Lotes
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
        // Vertical: Torres
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

    const unassignedUnits = unitsByBlock.get(null) || [];
    if (unassignedUnits.length > 0) {
      const avail = unassignedUnits.filter((u) => u.commercialStatus === 'DISPONIVEL');
      const minP =
        avail.length > 0
          ? Math.min(...avail.map((u) => u.effectivePrice || u.listPrice || Infinity))
          : null;

      result.push({
        blockId: null,
        name: 'Geral / Outras Unidades',
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
  }, [blocks, units, sortOrder]);

  // Auto-expansão SOMENTE quando o usuário realizar uma busca ativa
  useEffect(() => {
    if (hierarchy.length === 0) return;

    const searchTerm = search.trim();
    if (searchTerm) {
      // Quando há busca específica por unidade/código/lote, expande os agrupamentos necessários
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

  const toggleExpand = async (unitId: string) => {
    if (expandedId === unitId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(unitId);
    if (detailById[unitId]) return;
    setLoadingDetailId(unitId);
    try {
      const res = await fetch(`/api/developments/${developmentId}/units/${unitId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.unit) setDetailById((prev) => ({ ...prev, [unitId]: data.unit }));
      }
    } finally {
      setLoadingDetailId(null);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setFilterBlockId('');
    setFilterStatus('DISPONIVEL');
    setFilterUnitType('');
    setSortBy('floor');
    setSortOrder('asc');
    setPage(1);
  };

  // Sem visibilidade ou sem estoque cadastrado: a seção não é exibida ao corretor
  if (hidden || (!loading && summary && summary.totalUnits === 0)) return null;

  // Renderizador de Card individual da unidade (mobile-first para corretor)
  const renderBrokerUnitCard = (unit: any) => {
    const isExpanded = expandedId === unit.id;
    const primaryArea = resolvePrimaryAreaForSummary(unit);
    const sqm = formatPricePerSqmText(unit);
    const typeLabel =
      COMMERCIAL_UNIT_TYPE_LABELS[(unit.unitType as CommercialUnitType) || 'APARTAMENTO'] || unit.unitType;

    return (
      <div key={unit.id} className={styles.unitCard}>
        <div className={styles.unitCardHeader}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={styles.unitCardCode}>{unit.unitCode}</span>
              {unit.resaleSummary?.activeResaleListingsCount > 0 && (
                <ResaleListingBadge
                  count={unit.resaleSummary.activeResaleListingsCount}
                  label={`${unit.resaleSummary.activeResaleListingsCount} revenda(s) de corretor`}
                />
              )}
            </div>
            <span className={styles.unitCardSub}>
              {unit.typology?.name ? `${unit.typology.name} • ${typeLabel}` : typeLabel}
            </span>
          </div>

          <CommercialUnitStatusBadge status={unit.commercialStatus} />
        </div>

        <div className={styles.unitCardBody}>
          <div className={styles.unitCardRow}>
            <span style={{ color: '#6B7280' }}>Metragem:</span>
            <span style={{ fontWeight: 700, color: '#111827' }}>
              {primaryArea.formatted} <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>({primaryArea.shortLabel})</span>
            </span>
          </div>

          <div className={styles.unitCardRow}>
            <span style={{ color: '#6B7280' }}>Preço:</span>
            <span style={{ fontWeight: 800, color: '#1E4620' }}>
              {formatCurrencyBRL(unit.effectivePrice)}
            </span>
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
            onClick={() => toggleExpand(unit.id)}
            className={`${styles.btn} ${isExpanded ? styles.btnPrimary : styles.btnSecondary} ${styles.btnSm}`}
            aria-expanded={isExpanded}
          >
            {isExpanded ? 'Recolher' : 'Ver detalhes'}
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        {isExpanded && (
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #E5E7EB' }}>
            {loadingDetailId === unit.id ? (
              <div className={styles.loading}>Carregando ficha da unidade {unit.unitCode}...</div>
            ) : (
              <CommercialUnitDetail
                unit={detailById[unit.id] || unit}
                developmentName={developmentName}
                isAdmin={false}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className={styles.section} style={{ marginTop: 24 }}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>
            <Building2 size={18} className={styles.sectionTitleIcon} />
            Unidades da construtora
          </h2>
          <p className={styles.sectionSubtitle}>
            Estoque oficial informado pela construtora. Consulta organizada por pavimento e quadra.
          </p>
        </div>

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
            title="Visualização em tabela"
          >
            <TableIcon size={14} />
            <span>Tabela</span>
          </button>
        </div>
      </div>

      {summary && (
        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.toneSuccess}`}>
            <span className={styles.statLabel}>Disponíveis</span>
            <span className={styles.statValue}>{summary.availableCount}</span>
          </div>
          <div className={`${styles.statCard} ${styles.toneWarning}`}>
            <span className={styles.statLabel}>Reservadas</span>
            <span className={styles.statValue}>{summary.reservedCount}</span>
          </div>
          <div className={`${styles.statCard} ${styles.tonePrimary}`}>
            <span className={styles.statLabel}>A partir de</span>
            <span className={`${styles.statValue} ${styles.statValueSm}`}>
              {summary.minAvailablePrice != null
                ? formatCurrencyBRL(summary.minAvailablePrice, { compact: true })
                : '—'}
            </span>
          </div>
        </div>
      )}

      <div className={styles.filtersGrid}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="cub-search">
            Buscar
          </label>
          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} />
            <input
              id="cub-search"
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Unidade, lote, pavimento..."
              className={`${styles.input} ${styles.searchInput}`}
            />
          </div>
        </div>

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor="cub-status">
              Disponibilidade
            </label>
            <FieldHelper helpKey="commercialStatus" size={13} />
          </div>
          <select
            id="cub-status"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className={styles.select}
          >
            <option value="DISPONIVEL">Disponíveis</option>
            <option value="RESERVADA">Reservadas</option>
            <option value="ALL">Todas</option>
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="cub-type">
            Tipo
          </label>
          <select
            id="cub-type"
            value={filterUnitType}
            onChange={(e) => {
              setFilterUnitType(e.target.value);
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
          <label className={styles.label} htmlFor="cub-sort">
            Ordenar por
          </label>
          <select
            id="cub-sort"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            className={styles.select}
          >
            <option value="floor">Pavimento</option>
            <option value="unitCode">Identificação</option>
            <option value="listPrice">Preço</option>
            <option value="privateArea">Área privativa</option>
            <option value="pricePerSqm">Preço por m²</option>
          </select>
        </div>
      </div>

      {error && (
        <div className={`${styles.alert} ${styles.alertError}`} role="alert">
          <AlertCircle size={16} className={styles.alertIcon} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Carregando unidades...</div>
      ) : units.length === 0 ? (
        <div className={styles.emptyState}>
          <Search size={36} color="var(--text-light)" />
          <span className={styles.emptyTitle}>Nenhuma unidade encontrada</span>
          <p className={styles.emptyText}>Ajuste os filtros selecionados para consultar outras unidades.</p>
          <button type="button" onClick={resetFilters} className={`${styles.btn} ${styles.btnSecondary}`}>
            Limpar filtros
          </button>
        </div>
      ) : viewMode === 'HIERARCHICAL' ? (
        /* VISUALIZAÇÃO HIERÁRQUICA MOBILE-FIRST PARA CORRETOR */
        <div className={styles.hierarchyWrap}>
          {hierarchy.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={handleExpandAll}
                className={`${styles.btn} ${styles.btnGhost}`}
                style={{ fontSize: '0.74rem' }}
              >
                Expandir tudo
              </button>
              <button
                type="button"
                onClick={handleCollapseAll}
                className={`${styles.btn} ${styles.btnGhost}`}
                style={{ fontSize: '0.74rem' }}
              >
                Recolher tudo
              </button>
            </div>
          )}

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
                    {block.isVertical ? <Building2 size={20} color="#1E4620" /> : <Home size={20} color="#065F46" />}
                    <h3 className={styles.blockTitle}>{block.name}</h3>
                  </div>

                  <div className={styles.blockHeaderRight}>
                    {block.availableCount > 0 && (
                      <span className={`${styles.tag} ${styles.textSuccess}`}>{block.availableCount} disp.</span>
                    )}
                    {block.reservedCount > 0 && (
                      <span className={`${styles.tag} ${styles.textWarning}`}>{block.reservedCount} res.</span>
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
                    {block.isVertical && (
                      <>
                        {block.floors
                          .filter((f) => f.units.length > 0)
                          .map((floor) => {
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
                                    <CapacityBadge current={floor.units.length} />
                                  </div>

                                  <div className={styles.floorHeaderRight}>
                                    {floor.availableCount > 0 && (
                                      <span className={`${styles.tag} ${styles.textSuccess}`} style={{ fontSize: '0.70rem' }}>
                                        {floor.availableCount} disp.
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
                                    <div className={styles.unitCardsGrid}>
                                      {floor.units.map(renderBrokerUnitCard)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                        {block.directUnits.length > 0 && (
                          <div className={styles.unitCardsGrid}>
                            {block.directUnits.map(renderBrokerUnitCard)}
                          </div>
                        )}
                      </>
                    )}

                    {!block.isVertical && (
                      <div className={styles.unitCardsGrid}>
                        {block.directUnits.map(renderBrokerUnitCard)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* MODO TABELA */
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
                <th className={styles.alignRight}>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => {
                const isExpanded = expandedId === unit.id;
                const primaryArea = resolvePrimaryAreaForSummary(unit);
                const sqm = formatPricePerSqmText(unit);
                const typeLabel =
                  COMMERCIAL_UNIT_TYPE_LABELS[(unit.unitType as CommercialUnitType) || 'APARTAMENTO'];
                return (
                  <React.Fragment key={unit.id}>
                    <tr className={`${styles.unitRow} ${isExpanded ? styles.rowExpanded : ''}`}>
                      <td data-label="Torre / quadra">{unit.block?.name || unit.quadraName || '—'}</td>
                      <td data-label="Unidade">
                        <span className={styles.cellCode}>{unit.unitCode}</span>
                        {unit.resaleSummary?.activeResaleListingsCount > 0 && (
                          <div style={{ marginTop: '2px' }}>
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
                      </td>
                      <td data-label="R$/m²">
                        <span className={sqm.available ? styles.cellStrong : styles.cellSub}>{sqm.value}</span>
                      </td>
                      <td data-label="Disponibilidade">
                        <CommercialUnitStatusBadge status={unit.commercialStatus} />
                      </td>
                      <td className={styles.cellActionsTd}>
                        <div className={styles.cellActions}>
                          <button
                            type="button"
                            onClick={() => toggleExpand(unit.id)}
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
                          {loadingDetailId === unit.id ? (
                            <div className={styles.loading}>Carregando ficha da unidade...</div>
                          ) : (
                            <CommercialUnitDetail
                              unit={detailById[unit.id] || unit}
                              developmentName={developmentName}
                              isAdmin={false}
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
            Página <strong>{pagination.page}</strong> de <strong>{pagination.totalPages}</strong>
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
  );
}
