'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Building2, ChevronDown, ChevronUp, Search, AlertCircle } from 'lucide-react';
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
  formatPricePerSqmText,
  formatUnitFloor,
} from './CommercialUnitShared';

interface CommercialUnitsBrokerViewProps {
  developmentId: string;
  developmentName?: string;
}

/**
 * Consulta somente leitura das unidades comerciais para corretores (Ajustes da Etapa 6B.3.1).
 * - Usa exclusivamente as rotas públicas autenticadas `/api/developments/[id]/units...`, que respeitam a
 *   visibilidade do empreendimento e removem no servidor dados internos e de auditoria.
 * - Não exibe nenhum controle administrativo (cadastro, edição, preço, disponibilidade ou exclusão).
 * - Reutiliza a mesma ficha (`CommercialUnitDetail`) e os mesmos cálculos do painel administrativo.
 */
export function CommercialUnitsBrokerView({ developmentId, developmentName }: CommercialUnitsBrokerViewProps) {
  const [units, setUnits] = useState<any[]>([]);
  const [summary, setSummary] = useState<any | null>(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('DISPONIVEL');
  const [filterUnitType, setFilterUnitType] = useState('');
  const [sortBy, setSortBy] = useState('floor');
  const [page, setPage] = useState(1);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailById, setDetailById] = useState<Record<string, any>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (filterStatus) params.set('commercialStatus', filterStatus);
      if (filterUnitType) params.set('unitType', filterUnitType);
      params.set('sortBy', sortBy);
      params.set('sortOrder', 'asc');
      params.set('page', String(page));
      params.set('limit', '20');

      const res = await fetch(`/api/developments/${developmentId}/units?${params.toString()}`);
      if (res.status === 404 || res.status === 403) {
        setHidden(true);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao consultar unidades.');
      setUnits(Array.isArray(data.units) ? data.units : []);
      setSummary(data.summary || null);
      if (data.pagination) setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || 'Erro ao consultar unidades.');
    } finally {
      setLoading(false);
    }
  }, [developmentId, search, filterStatus, filterUnitType, sortBy, page]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

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

  // Sem visibilidade ou sem estoque cadastrado: a seção não é exibida ao corretor
  if (hidden || (!loading && summary && summary.totalUnits === 0)) return null;

  return (
    <section className={styles.section} style={{ marginTop: 24 }}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>
            <Building2 size={18} className={styles.sectionTitleIcon} />
            Unidades da construtora
          </h2>
          <p className={styles.sectionSubtitle}>
            Estoque oficial informado pela construtora. Consulta somente leitura.
          </p>
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
              placeholder="Unidade, lote..."
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
          <span className={styles.emptyTitle}>Nenhuma unidade encontrada</span>
          <p className={styles.emptyText}>Ajuste os filtros para consultar outras unidades.</p>
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

