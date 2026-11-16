'use client';

import React, { useState } from 'react';
import { CheckCircle2, X, AlertTriangle, ShieldAlert, Calendar } from 'lucide-react';
import type { CommercialUnitStatus } from '@/lib/commercial-unit-service';
import { COMMERCIAL_UNIT_STATUS_META } from '@/lib/commercial-unit-format';
import FieldHelper from '@/components/FieldHelper';
import styles from '@/styles/commercial-units.module.css';

interface CommercialUnitStatusModalProps {
  developmentId: string;
  unit: {
    id: string;
    unitCode: string;
    block?: { id: string; name: string } | null;
    commercialStatus: CommercialUnitStatus;
    reservedUntil?: string | Date | null;
    reservedByNote?: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}

const STATUS_OPTIONS: CommercialUnitStatus[] = [
  'DISPONIVEL',
  'RESERVADA',
  'VENDIDA',
  'INDISPONIVEL_TEMPORARIAMENTE',
];

export function CommercialUnitStatusModal({
  developmentId,
  unit,
  onClose,
  onSuccess,
}: CommercialUnitStatusModalProps) {
  const [newStatus, setNewStatus] = useState<CommercialUnitStatus>(unit.commercialStatus);
  const [reason, setReason] = useState('');
  const [reservedUntil, setReservedUntil] = useState(() => {
    if (!unit.reservedUntil) return '';
    try {
      return new Date(unit.reservedUntil).toISOString().split('T')[0];
    } catch {
      return '';
    }
  });
  const [reservedByNote, setReservedByNote] = useState(unit.reservedByNote || '');
  const [confirmSold, setConfirmSold] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isDistrato =
    unit.commercialStatus === 'VENDIDA' && newStatus === 'DISPONIVEL';
  const isMarkingSold =
    unit.commercialStatus !== 'VENDIDA' && newStatus === 'VENDIDA';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isDistrato && !reason.trim()) {
      setError(
        'Para reabrir uma unidade Vendida para Disponível (distrato), informe obrigatoriamente a justificativa.'
      );
      return;
    }

    if (isMarkingSold && !confirmSold) {
      setError(
        'Confirme a caixa de verificação antes de marcar a unidade como VENDIDA.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/admin/developments/${developmentId}/units/${unit.id}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commercialStatus: newStatus,
            reason:
              reason.trim() ||
              `Alteração de disponibilidade para ${COMMERCIAL_UNIT_STATUS_META[newStatus].label}`,
            reservedUntil:
              newStatus === 'RESERVADA' && reservedUntil
                ? new Date(reservedUntil).toISOString()
                : null,
            reservedByNote:
              newStatus === 'RESERVADA' && reservedByNote.trim()
                ? reservedByNote.trim()
                : null,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao atualizar disponibilidade da unidade.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar disponibilidade.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentMeta = COMMERCIAL_UNIT_STATUS_META[unit.commercialStatus];

  return (
    <div className={styles.overlay}>
      <div
        className={`${styles.modal} ${styles.modalSm}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="commercial-unit-status-title"
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderMain}>
            <div className={styles.modalIcon}>
              <CheckCircle2 size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 id="commercial-unit-status-title" className={styles.modalTitle}>
                Disponibilidade da Unidade {unit.unitCode}
              </h3>
              <p
                className={styles.modalSubtitle}
                style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}
              >
                {unit.block?.name ? `${unit.block.name} • ` : ''}
                Status atual:{' '}
                <span
                  className={styles.statusBadge}
                  style={{
                    color: currentMeta.color,
                    background: currentMeta.background,
                    borderColor: currentMeta.border,
                  }}
                >
                  <span className={styles.statusDot} />
                  {currentMeta.shortLabel}
                </span>
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
                <AlertTriangle size={16} className={styles.alertIcon} />
                <span>{error}</span>
              </div>
            )}

            <div className={styles.field}>
              <div className={styles.labelRow}>
                <span className={styles.label}>Selecione a Nova Disponibilidade</span>
                <FieldHelper helpKey="commercialStatus" />
              </div>
              <div className={styles.statusOptions} role="radiogroup">
                {STATUS_OPTIONS.map((st) => {
                  const meta = COMMERCIAL_UNIT_STATUS_META[st];
                  const active = newStatus === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setNewStatus(st)}
                      className={`${styles.statusOption} ${active ? styles.statusOptionActive : ''}`}
                    >
                      <span
                        className={styles.statusBadge}
                        style={{
                          color: meta.color,
                          background: meta.background,
                          borderColor: meta.border,
                        }}
                      >
                        <span className={styles.statusDot} />
                        {meta.shortLabel}
                      </span>
                      {active && <CheckCircle2 size={16} style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {newStatus === 'RESERVADA' && (
              <div className={`${styles.formGroup} ${styles.formGroupInternal}`}>
                <div className={styles.formGroupHeader}>
                  <span className={styles.formGroupTitle}>
                    <Calendar size={16} />
                    Dados da Reserva (Interno Admin)
                  </span>
                </div>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <div className={styles.labelRow}>
                      <label className={styles.label} htmlFor="cu-status-reserved-until">
                        Reservada até (Opcional)
                      </label>
                    </div>
                    <input
                      id="cu-status-reserved-until"
                      type="date"
                      value={reservedUntil}
                      onChange={(e) => setReservedUntil(e.target.value)}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.field}>
                    <div className={styles.labelRow}>
                      <label className={styles.label} htmlFor="cu-status-reserved-note">
                        Corretor / Cliente (Interno)
                      </label>
                      <FieldHelper helpKey="internalNotes" />
                    </div>
                    <input
                      id="cu-status-reserved-note"
                      type="text"
                      value={reservedByNote}
                      onChange={(e) => setReservedByNote(e.target.value)}
                      placeholder="Ex.: Proposta em análise"
                      className={styles.input}
                    />
                  </div>
                </div>
              </div>
            )}

            {isMarkingSold && (
              <div
                className={`${styles.alert} ${styles.alertError}`}
                style={{ flexDirection: 'column', gap: 10 }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontWeight: 700 }}>
                  <ShieldAlert size={16} className={styles.alertIcon} />
                  <span>
                    Atenção: Ao marcar como VENDIDA, a unidade deixará de compor o estoque disponível e o preço mínimo do empreendimento será recalculado.
                  </span>
                </div>
                <label className={styles.checkbox} style={{ color: 'inherit' }}>
                  <input
                    type="checkbox"
                    checked={confirmSold}
                    onChange={(e) => setConfirmSold(e.target.checked)}
                  />
                  Confirmo que esta unidade comercial foi efetivamente vendida.
                </label>
              </div>
            )}

            {isDistrato && (
              <div className={`${styles.alert} ${styles.alertWarning}`}>
                <AlertTriangle size={16} className={styles.alertIcon} />
                <span>
                  Reabertura de unidade vendida (distrato): informe obrigatoriamente a justificativa abaixo para registro no histórico.
                </span>
              </div>
            )}

            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="cu-status-reason">
                  Motivo / Observação {isDistrato ? '*' : '(Opcional)'}
                </label>
              </div>
              <input
                id="cu-status-reason"
                type="text"
                required={isDistrato}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  isDistrato
                    ? 'Obrigatório: informe o motivo do distrato / retorno ao estoque'
                    : 'Ex.: Reserva solicitada pela coordenação comercial'
                }
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
              {submitting ? 'Salvando...' : 'Confirmar Disponibilidade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
