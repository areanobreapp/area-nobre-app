'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  DollarSign,
  CheckCircle2,
  Pencil,
  Trash2,
  AlertCircle,
  RefreshCw,
  ArrowUpDown,
  Layers,
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

/**
 * Gestão administrativa (ADMIN) do estoque oficial de unidades comerciais.
 * Consome exclusivamente as rotas `/api/admin/...`, que exigem perfil ADMIN no servidor.
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
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  // Expansão sob demanda
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);
  const [expandedDetailById, setExpandedDetailById] = useState<Record<string, any>>({});
  const [expandedHistoryById, setExpandedHistoryById] = useState<Record<string, any[]>>({});
  const [loadingExpandId, setLoadingExpandId] = useState<string | null>(null);

  // Modais administrativos
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any | null>(null);
  const [priceModalUnit, setPriceModalUnit] = useState<any | null>(null);
  const [statusModalUnit, setStatusModalUnit] = useState<any | null>(null);

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
      params.set('limit', '25');

      const [unitsRes, blocksRes] = await Promise.all([
        fetch(`/api/admin/developments/${developmentId}/units?${params.toString()}`),
        fetch(`/api/admin/developments/${developmentId}/blocks`),
      ]);

      const unitsData = await unitsRes.json();
      if (!unitsRes.ok) throw new Error(unitsData.error || 'Erro ao carregar unidades comerciais.');

      setUnits(Array.isArray(unitsData.items) ? unitsData.items : []);
      if (unitsData.summary) setSummary(unitsData.summary);
      if (unitsData.pagination) setPagination(unitsData.pagination);

      if (blocksRes.ok) {
        const blocksData = await blocksRes.json();
        setBlockSummaries(Array.isArray(blocksData.items) ? blocksData.items : []);
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

  const openCreate = () => {
    setEditingUnit(null);
    setFormModalOpen(true);
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
              Visão resumida do estoque. Use <strong>Ver detalhes</strong> para abrir metragens, características,
              R$/m², condições e histórico.
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

      {/* LISTAGEM */}
      <section className={styles.section}>
        {loading ? (
          <div className={styles.loading}>Carregando unidades comerciais...</div>
        ) : units.length === 0 ? (
          <div className={styles.emptyState}>
            <Building2 size={36} color="var(--text-light)" />
            <span className={styles.emptyTitle}>Nenhuma unidade comercial encontrada</span>
            <p className={styles.emptyText}>
              Cadastre as unidades do empreendimento (apartamentos, coberturas, studios, salas comerciais, casas ou
              lotes) ou ajuste os filtros selecionados.
            </p>
            <button type="button" onClick={openCreate} className={`${styles.btn} ${styles.btnPrimary}`}>
              <Plus size={16} />
              Cadastrar unidade
            </button>
          </div>
        ) : (
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
