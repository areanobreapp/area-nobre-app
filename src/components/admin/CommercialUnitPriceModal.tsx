'use client';

import React, { useState, useMemo } from 'react';
import { DollarSign, X, TrendingUp, TrendingDown, Calculator, AlertCircle } from 'lucide-react';
import {
  formatAreaSqm,
  formatBrazilianNumber,
  formatCurrencyBRL,
  parseBrazilianDecimal,
} from '@/lib/commercial-unit-format';
import FieldHelper from '@/components/FieldHelper';
import styles from '@/styles/commercial-units.module.css';

interface CommercialUnitPriceModalProps {
  developmentId: string;
  unit: {
    id: string;
    unitCode: string;
    block?: { id: string; name: string } | null;
    listPrice?: number | null;
    promotionalPrice?: number | null;
    effectivePrice?: number | null;
    referenceArea?: number | null;
    referenceAreaLabel?: string | null;
    requiredReferenceAreaLabel?: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function CommercialUnitPriceModal({
  developmentId,
  unit,
  onClose,
  onSuccess,
}: CommercialUnitPriceModalProps) {
  const [listPriceRaw, setListPriceRaw] = useState(
    unit.listPrice != null ? formatBrazilianNumber(unit.listPrice) : ''
  );
  const [promotionalPriceRaw, setPromotionalPriceRaw] = useState(
    unit.promotionalPrice != null ? formatBrazilianNumber(unit.promotionalPrice) : ''
  );
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const currentEffectivePrice = useMemo(() => {
    if (unit.promotionalPrice != null && unit.promotionalPrice > 0) return unit.promotionalPrice;
    if (unit.listPrice != null && unit.listPrice > 0) return unit.listPrice;
    return null;
  }, [unit.listPrice, unit.promotionalPrice]);

  const preview = useMemo(() => {
    const nextList = parseBrazilianDecimal(listPriceRaw, { allowZero: false });
    const nextPromo = parseBrazilianDecimal(promotionalPriceRaw, { allowZero: false });

    const validList = nextList !== null && !Number.isNaN(nextList) ? nextList : null;
    const validPromo = nextPromo !== null && !Number.isNaN(nextPromo) ? nextPromo : null;

    const nextEffective = validPromo != null && validPromo > 0 ? validPromo : validList;

    const diffAmount =
      currentEffectivePrice != null && nextEffective != null
        ? nextEffective - currentEffectivePrice
        : null;

    const diffPercent =
      currentEffectivePrice != null && currentEffectivePrice > 0 && diffAmount != null
        ? Number(((diffAmount / currentEffectivePrice) * 100).toFixed(2))
        : null;

    const nextPricePerSqm =
      nextEffective != null &&
      nextEffective > 0 &&
      unit.referenceArea != null &&
      unit.referenceArea > 0
        ? Number((nextEffective / unit.referenceArea).toFixed(2))
        : null;

    return {
      nextList,
      nextPromo,
      validList,
      validPromo,
      nextEffective,
      diffAmount,
      diffPercent,
      nextPricePerSqm,
    };
  }, [listPriceRaw, promotionalPriceRaw, currentEffectivePrice, unit.referenceArea]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (Number.isNaN(preview.nextList)) {
      setError('Informe um preço de tabela válido no formato brasileiro (ex.: 850.000,00).');
      return;
    }

    if (Number.isNaN(preview.nextPromo)) {
      setError('Informe um preço promocional válido ou deixe em branco.');
      return;
    }

    if (
      preview.validList != null &&
      preview.validPromo != null &&
      preview.validPromo > preview.validList
    ) {
      setError('O preço promocional não pode ser superior ao preço de tabela.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/admin/developments/${developmentId}/units/${unit.id}/price`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listPrice: preview.validList,
            promotionalPrice: preview.validPromo,
            reason: reason.trim() || 'Atualização administrativa de preço',
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao atualizar preço da unidade.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar preço da unidade.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div
        className={`${styles.modal} ${styles.modalSm}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="commercial-unit-price-title"
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderMain}>
            <div className={styles.modalIcon}>
              <DollarSign size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 id="commercial-unit-price-title" className={styles.modalTitle}>
                Alterar Preço da Unidade {unit.unitCode}
              </h3>
              <p className={styles.modalSubtitle}>
                {unit.block?.name ? `${unit.block.name} • ` : ''}
                Histórico comercial auditável
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className={`${styles.btn} ${styles.btnGhost} ${styles.btnIcon}`}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.modalBody}>
            {error && (
              <div className={`${styles.alert} ${styles.alertError}`} role="alert">
                <AlertCircle size={16} className={styles.alertIcon} />
                <span>{error}</span>
              </div>
            )}

            {/* Preço Atual */}
            <div className={styles.detailCard}>
              <div className={styles.detailCardTitle}>Valores atuais</div>
              <dl className={styles.dl}>
                <div className={styles.dlItem}>
                  <dt className={styles.dt}>Preço de Tabela Atual</dt>
                  <dd className={styles.dd}>{formatCurrencyBRL(unit.listPrice)}</dd>
                </div>
                <div className={styles.dlItem}>
                  <dt className={styles.dt}>Preço Promocional Atual</dt>
                  <dd className={styles.dd} style={{ color: 'var(--color-success)' }}>
                    {unit.promotionalPrice != null ? formatCurrencyBRL(unit.promotionalPrice) : '—'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label className={styles.label} htmlFor="cu-price-list">
                    Novo Preço de Tabela (R$)
                  </label>
                  <FieldHelper helpKey="listPrice" />
                </div>
                <input
                  id="cu-price-list"
                  type="text"
                  inputMode="decimal"
                  value={listPriceRaw}
                  onChange={(e) => setListPriceRaw(e.target.value)}
                  placeholder="Ex.: 850.000,00"
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label className={styles.label} htmlFor="cu-price-promo">
                    Novo Preço Promocional (R$)
                  </label>
                  <FieldHelper helpKey="promotionalPrice" />
                </div>
                <input
                  id="cu-price-promo"
                  type="text"
                  inputMode="decimal"
                  value={promotionalPriceRaw}
                  onChange={(e) => setPromotionalPriceRaw(e.target.value)}
                  placeholder="Opcional (ex.: 799.000,00)"
                  className={styles.input}
                />
              </div>
            </div>

            {/* Simulação de Diferença e R$/m² */}
            <div className={styles.highlightBox}>
              <div className={styles.previewRow}>
                <span className={styles.highlightLabel} style={{ gap: 6 }}>
                  <Calculator size={14} />
                  Novo Preço Efetivo:
                </span>
                <span className={styles.previewValue}>
                  {formatCurrencyBRL(preview.nextEffective)}
                </span>
              </div>

              {preview.diffAmount !== null && (
                <div className={styles.previewRow}>
                  <span className={styles.highlightLabel}>Variação em R$ / (%):</span>
                  <span
                    className={`${styles.previewValue} ${
                      preview.diffAmount > 0
                        ? styles.trendUp
                        : preview.diffAmount < 0
                          ? styles.trendDown
                          : ''
                    }`}
                  >
                    {preview.diffAmount > 0 ? (
                      <TrendingUp size={14} />
                    ) : preview.diffAmount < 0 ? (
                      <TrendingDown size={14} />
                    ) : null}
                    {preview.diffAmount > 0 ? '+' : ''}
                    {formatCurrencyBRL(preview.diffAmount)}
                    {preview.diffPercent !== null
                      ? ` (${preview.diffPercent > 0 ? '+' : ''}${formatBrazilianNumber(preview.diffPercent)}%)`
                      : ''}
                  </span>
                </div>
              )}

              <div className={styles.previewRow}>
                <span className={styles.highlightLabel}>
                  Novo Preço por m²:
                  <FieldHelper helpKey="pricePerSqm" />
                </span>
                <span className={styles.previewValue}>
                  {preview.nextPricePerSqm != null && unit.referenceArea != null
                    ? `${formatCurrencyBRL(preview.nextPricePerSqm)}/m² (${formatAreaSqm(unit.referenceArea)} • ${unit.referenceAreaLabel})`
                    : `Indisponível — informe a ${unit.requiredReferenceAreaLabel || 'metragem de referência'}`}
                </span>
              </div>
            </div>

            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="cu-price-reason">
                  Motivo / Observação da Alteração
                </label>
              </div>
              <input
                id="cu-price-reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex.: Reajuste tabela novembro / Campanha Black Friday"
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              onClick={onClose}
              className={`${styles.btn} ${styles.btnSecondary}`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`${styles.btn} ${styles.btnPrimary}`}
            >
              {submitting ? 'Salvando...' : 'Confirmar Novo Preço'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
