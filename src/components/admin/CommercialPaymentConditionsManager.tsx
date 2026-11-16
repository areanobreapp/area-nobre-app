'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  X,
  AlertCircle,
  Calendar,
  Layers,
  Building2,
} from 'lucide-react';
import {
  formatBrazilianNumber,
  formatCurrencyBRL,
  parseBrazilianDecimal,
} from '@/lib/commercial-unit-format';
import FieldHelper from '@/components/FieldHelper';
import styles from '@/styles/commercial-units.module.css';

interface BlockOption {
  id: string;
  name: string;
  blockType: string;
}

interface TypologyOption {
  id: string;
  name: string;
}

interface UnitOption {
  id: string;
  unitCode: string;
  block?: { id: string; name: string } | null;
}

interface CommercialPaymentConditionsManagerProps {
  developmentId: string;
  blocks: BlockOption[];
  typologies: TypologyOption[];
  units?: UnitOption[];
}

export function CommercialPaymentConditionsManager({
  developmentId,
  blocks,
  typologies,
  units = [],
}: CommercialPaymentConditionsManagerProps) {
  const [conditions, setConditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCondition, setEditingCondition] = useState<any | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scopeType, setScopeType] = useState<'DEVELOPMENT' | 'BLOCK' | 'TYPOLOGY' | 'UNIT'>(
    'DEVELOPMENT'
  );
  const [blockId, setBlockId] = useState('');
  const [typologyId, setTypologyId] = useState('');
  const [commercialUnitId, setCommercialUnitId] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [downPaymentPercentRaw, setDownPaymentPercentRaw] = useState('');
  const [downPaymentAmountRaw, setDownPaymentAmountRaw] = useState('');
  const [downPaymentInstallments, setDownPaymentInstallments] = useState('1');

  const [monthlyCount, setMonthlyCount] = useState('');
  const [monthlyPercentTotalRaw, setMonthlyPercentTotalRaw] = useState('');
  const [monthlyInstallmentAmountRaw, setMonthlyInstallmentAmountRaw] = useState('');

  const [reinforcementCount, setReinforcementCount] = useState('');
  const [reinforcementFrequencyMonths, setReinforcementFrequencyMonths] = useState('');
  const [reinforcementPercentTotalRaw, setReinforcementPercentTotalRaw] = useState('');
  const [reinforcementInstallmentAmountRaw, setReinforcementInstallmentAmountRaw] =
    useState('');

  const [keysPercentRaw, setKeysPercentRaw] = useState('');
  const [keysAmountRaw, setKeysAmountRaw] = useState('');
  const [financingPercentRaw, setFinancingPercentRaw] = useState('');
  const [financingAmountRaw, setFinancingAmountRaw] = useState('');

  const [correctionIndexPreKeys, setCorrectionIndexPreKeys] = useState('INCC-M');
  const [correctionIndexPostKeys, setCorrectionIndexPostKeys] = useState('IPCA + 1% a.m.');
  const [acceptsExchange, setAcceptsExchange] = useState(false);
  const [maxExchangePercentRaw, setMaxExchangePercentRaw] = useState('');
  const [exchangeNotes, setExchangeNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [publicNotes, setPublicNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchConditions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/admin/developments/${developmentId}/payment-conditions?includeInactive=true`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao carregar condições comerciais.');
      }
      setConditions(Array.isArray(data.items) ? data.items : []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar condições comerciais.');
    } finally {
      setLoading(false);
    }
  }, [developmentId]);

  useEffect(() => {
    fetchConditions();
  }, [fetchConditions]);

  const openCreateModal = () => {
    setEditingCondition(null);
    setName('');
    setDescription('');
    setScopeType('DEVELOPMENT');
    setBlockId('');
    setTypologyId('');
    setCommercialUnitId('');
    setIsDefault(conditions.length === 0);
    setIsActive(true);
    setDownPaymentPercentRaw('');
    setDownPaymentAmountRaw('');
    setDownPaymentInstallments('1');
    setMonthlyCount('');
    setMonthlyPercentTotalRaw('');
    setMonthlyInstallmentAmountRaw('');
    setReinforcementCount('');
    setReinforcementFrequencyMonths('');
    setReinforcementPercentTotalRaw('');
    setReinforcementInstallmentAmountRaw('');
    setKeysPercentRaw('');
    setKeysAmountRaw('');
    setFinancingPercentRaw('');
    setFinancingAmountRaw('');
    setCorrectionIndexPreKeys('INCC-M');
    setCorrectionIndexPostKeys('IPCA + 1% a.m.');
    setAcceptsExchange(false);
    setMaxExchangePercentRaw('');
    setExchangeNotes('');
    setValidUntil('');
    setPublicNotes('');
    setInternalNotes('');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (cond: any) => {
    setEditingCondition(cond);
    setName(cond.name || '');
    setDescription(cond.description || '');
    if (cond.commercialUnitId) {
      setScopeType('UNIT');
    } else if (cond.typologyId) {
      setScopeType('TYPOLOGY');
    } else if (cond.blockId) {
      setScopeType('BLOCK');
    } else {
      setScopeType('DEVELOPMENT');
    }
    setBlockId(cond.blockId || '');
    setTypologyId(cond.typologyId || '');
    setCommercialUnitId(cond.commercialUnitId || '');
    setIsDefault(Boolean(cond.isDefault));
    setIsActive(cond.isActive ?? true);

    setDownPaymentPercentRaw(
      cond.downPaymentPercent != null ? formatBrazilianNumber(cond.downPaymentPercent) : ''
    );
    setDownPaymentAmountRaw(
      cond.downPaymentAmount != null ? formatBrazilianNumber(cond.downPaymentAmount) : ''
    );
    setDownPaymentInstallments(String(cond.downPaymentInstallments ?? 1));

    setMonthlyCount(cond.monthlyCount != null ? String(cond.monthlyCount) : '');
    setMonthlyPercentTotalRaw(
      cond.monthlyPercentTotal != null
        ? formatBrazilianNumber(cond.monthlyPercentTotal)
        : ''
    );
    setMonthlyInstallmentAmountRaw(
      cond.monthlyInstallmentAmount != null
        ? formatBrazilianNumber(cond.monthlyInstallmentAmount)
        : ''
    );

    setReinforcementCount(
      cond.reinforcementCount != null ? String(cond.reinforcementCount) : ''
    );
    setReinforcementFrequencyMonths(
      cond.reinforcementFrequencyMonths != null
        ? String(cond.reinforcementFrequencyMonths)
        : ''
    );
    setReinforcementPercentTotalRaw(
      cond.reinforcementPercentTotal != null
        ? formatBrazilianNumber(cond.reinforcementPercentTotal)
        : ''
    );
    setReinforcementInstallmentAmountRaw(
      cond.reinforcementInstallmentAmount != null
        ? formatBrazilianNumber(cond.reinforcementInstallmentAmount)
        : ''
    );

    setKeysPercentRaw(
      cond.keysPercent != null ? formatBrazilianNumber(cond.keysPercent) : ''
    );
    setKeysAmountRaw(
      cond.keysAmount != null ? formatBrazilianNumber(cond.keysAmount) : ''
    );
    setFinancingPercentRaw(
      cond.financingPercent != null ? formatBrazilianNumber(cond.financingPercent) : ''
    );
    setFinancingAmountRaw(
      cond.financingAmount != null ? formatBrazilianNumber(cond.financingAmount) : ''
    );

    setCorrectionIndexPreKeys(cond.correctionIndexPreKeys || '');
    setCorrectionIndexPostKeys(cond.correctionIndexPostKeys || '');
    setAcceptsExchange(Boolean(cond.acceptsExchange));
    setMaxExchangePercentRaw(
      cond.maxExchangePercent != null ? formatBrazilianNumber(cond.maxExchangePercent) : ''
    );
    setExchangeNotes(cond.exchangeNotes || '');
    setValidUntil(
      cond.validUntil ? new Date(cond.validUntil).toISOString().split('T')[0] : ''
    );
    setPublicNotes(cond.publicNotes || '');
    setInternalNotes(cond.internalNotes || '');
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('O nome da condição comercial é obrigatório.');
      return;
    }

    const downPaymentPercent = parseBrazilianDecimal(downPaymentPercentRaw);
    const downPaymentAmount = parseBrazilianDecimal(downPaymentAmountRaw);
    const monthlyPercentTotal = parseBrazilianDecimal(monthlyPercentTotalRaw);
    const monthlyInstallmentAmount = parseBrazilianDecimal(monthlyInstallmentAmountRaw);
    const reinforcementPercentTotal = parseBrazilianDecimal(reinforcementPercentTotalRaw);
    const reinforcementInstallmentAmount = parseBrazilianDecimal(
      reinforcementInstallmentAmountRaw
    );
    const keysPercent = parseBrazilianDecimal(keysPercentRaw);
    const keysAmount = parseBrazilianDecimal(keysAmountRaw);
    const financingPercent = parseBrazilianDecimal(financingPercentRaw);
    const financingAmount = parseBrazilianDecimal(financingAmountRaw);
    const maxExchangePercent = parseBrazilianDecimal(maxExchangePercentRaw);

    const checks: Array<[number | null, string]> = [
      [downPaymentPercent, '% de Entrada'],
      [downPaymentAmount, 'Valor de Entrada'],
      [monthlyPercentTotal, '% Total Mensais'],
      [monthlyInstallmentAmount, 'Valor da Parcela Mensal'],
      [reinforcementPercentTotal, '% Total Reforços'],
      [reinforcementInstallmentAmount, 'Valor do Reforço'],
      [keysPercent, '% nas Chaves'],
      [keysAmount, 'Valor nas Chaves'],
      [financingPercent, '% de Financiamento'],
      [financingAmount, 'Valor de Financiamento'],
      [maxExchangePercent, '% Máximo de Permuta'],
    ];

    for (const [val, label] of checks) {
      if (Number.isNaN(val)) {
        setFormError(`Valor numérico inválido em "${label}".`);
        return;
      }
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      blockId: scopeType === 'BLOCK' ? blockId || null : null,
      typologyId: scopeType === 'TYPOLOGY' ? typologyId || null : null,
      commercialUnitId: scopeType === 'UNIT' ? commercialUnitId || null : null,
      isDefault,
      isActive,
      downPaymentPercent,
      downPaymentAmount,
      downPaymentInstallments: Math.max(parseInt(downPaymentInstallments || '1', 10) || 1, 1),
      monthlyCount: monthlyCount.trim() ? parseInt(monthlyCount, 10) : null,
      monthlyPercentTotal,
      monthlyInstallmentAmount,
      reinforcementCount: reinforcementCount.trim()
        ? parseInt(reinforcementCount, 10)
        : null,
      reinforcementFrequencyMonths: reinforcementFrequencyMonths.trim()
        ? parseInt(reinforcementFrequencyMonths, 10)
        : null,
      reinforcementPercentTotal,
      reinforcementInstallmentAmount,
      keysPercent,
      keysAmount,
      financingPercent,
      financingAmount,
      correctionIndexPreKeys: correctionIndexPreKeys.trim() || null,
      correctionIndexPostKeys: correctionIndexPostKeys.trim() || null,
      acceptsExchange,
      maxExchangePercent: acceptsExchange ? maxExchangePercent : null,
      exchangeNotes: acceptsExchange ? exchangeNotes.trim() || null : null,
      validUntil: validUntil ? new Date(validUntil).toISOString() : null,
      publicNotes: publicNotes.trim() || null,
      internalNotes: internalNotes.trim() || null,
    };

    setSubmitting(true);
    try {
      const url = editingCondition
        ? `/api/admin/developments/${developmentId}/payment-conditions/${editingCondition.id}`
        : `/api/admin/developments/${developmentId}/payment-conditions`;

      const res = await fetch(url, {
        method: editingCondition ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar condição de pagamento.');
      }

      setModalOpen(false);
      await fetchConditions();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar condição de pagamento.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cond: any) => {
    if (
      !window.confirm(
        `Deseja remover a condição de pagamento "${cond.name}" deste empreendimento?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/developments/${developmentId}/payment-conditions/${cond.id}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao excluir condição de pagamento.');
      }
      await fetchConditions();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir condição de pagamento.');
    }
  };

  const renderScopeBadge = (cond: any) => {
    if (cond.commercialUnit) {
      return (
        <span className={`${styles.tag} ${styles.tagInfo}`}>
          Unidade {cond.commercialUnit.unitCode}
        </span>
      );
    }
    if (cond.typology) {
      return (
        <span className={`${styles.tag} ${styles.tagInfo}`}>
          Tipologia: {cond.typology.name}
        </span>
      );
    }
    if (cond.block) {
      return (
        <span className={`${styles.tag} ${styles.tagInfo}`}>
          {cond.block.name}
        </span>
      );
    }
    return (
      <span className={`${styles.tag} ${styles.tagPrimary}`}>
        Geral do Empreendimento
      </span>
    );
  };

  return (
    <div className={styles.root}>
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div style={{ minWidth: 0 }}>
            <h2 className={styles.sectionTitle}>
              <CreditCard size={20} className={styles.sectionTitleIcon} />
              Condições Comerciais e Fluxo de Pagamento
              <FieldHelper helpKey="paymentConditions" />
            </h2>
            <p className={styles.sectionSubtitle}>
              Defina tabelas de pagamento gerais do empreendimento, por torre/quadra, por tipologia ou exclusivas de uma unidade.
            </p>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              onClick={openCreateModal}
              className={`${styles.btn} ${styles.btnPrimary}`}
            >
              <Plus size={16} />
              Nova Condição de Pagamento
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className={`${styles.alert} ${styles.alertError}`} role="alert">
          <AlertCircle size={16} className={styles.alertIcon} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className={styles.section}>
          <div className={styles.loading}>Carregando condições comerciais...</div>
        </div>
      ) : conditions.length === 0 ? (
        <div className={styles.section} style={{ borderStyle: 'dashed' }}>
          <div className={styles.emptyState}>
            <CreditCard size={40} style={{ color: 'var(--text-light)' }} />
            <div className={styles.emptyTitle}>Nenhuma condição de pagamento cadastrada</div>
            <p className={styles.emptyText}>
              Cadastre a tabela padrão de pagamento (entrada, parcelas mensais, reforços/balões, chaves, financiamento e índice de correção).
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className={`${styles.btn} ${styles.btnPrimary}`}
            >
              <Plus size={16} />
              Cadastrar Primeira Condição
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {conditions.map((cond) => (
            <div key={cond.id} className={`${styles.section} ${styles.conditionCard}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className={styles.cardHeader}>
                  <div style={{ minWidth: 0 }}>
                    <div className={styles.cardTitleRow}>
                      <h3 className={styles.cardTitle}>{cond.name}</h3>
                      {cond.isDefault && (
                        <span className={`${styles.tag} ${styles.tagWarning}`}>Padrão</span>
                      )}
                      {!cond.isActive && <span className={styles.tag}>Inativa</span>}
                    </div>
                    {cond.description && (
                      <p className={styles.sectionSubtitle}>{cond.description}</p>
                    )}
                  </div>
                  {renderScopeBadge(cond)}
                </div>

                {/* Resumo estruturado do fluxo */}
                <dl className={styles.summaryGrid} style={{ margin: 0 }}>
                  <div className={styles.dlItem}>
                    <dt className={styles.dt}>
                      Entrada ({cond.downPaymentInstallments || 1}x)
                    </dt>
                    <dd className={styles.dd}>
                      {cond.downPaymentPercent != null
                        ? `${formatBrazilianNumber(cond.downPaymentPercent)}%`
                        : cond.downPaymentAmount != null
                          ? formatCurrencyBRL(cond.downPaymentAmount)
                          : '—'}
                    </dd>
                  </div>

                  <div className={styles.dlItem}>
                    <dt className={styles.dt}>
                      Mensais {cond.monthlyCount ? `(${cond.monthlyCount}x)` : ''}
                    </dt>
                    <dd className={styles.dd}>
                      {cond.monthlyPercentTotal != null
                        ? `${formatBrazilianNumber(cond.monthlyPercentTotal)}%`
                        : cond.monthlyInstallmentAmount != null
                          ? formatCurrencyBRL(cond.monthlyInstallmentAmount)
                          : '—'}
                    </dd>
                  </div>

                  <div className={styles.dlItem}>
                    <dt className={styles.dt}>
                      Reforços {cond.reinforcementCount ? `(${cond.reinforcementCount}x)` : ''}
                    </dt>
                    <dd className={styles.dd}>
                      {cond.reinforcementPercentTotal != null
                        ? `${formatBrazilianNumber(cond.reinforcementPercentTotal)}%`
                        : cond.reinforcementInstallmentAmount != null
                          ? formatCurrencyBRL(cond.reinforcementInstallmentAmount)
                          : '—'}
                    </dd>
                  </div>

                  <div className={styles.dlItem}>
                    <dt className={styles.dt}>Chaves / Financ.</dt>
                    <dd className={styles.dd}>
                      {cond.keysPercent != null
                        ? `${formatBrazilianNumber(cond.keysPercent)}% Chaves`
                        : cond.financingPercent != null
                          ? `${formatBrazilianNumber(cond.financingPercent)}% Financ.`
                          : '—'}
                    </dd>
                  </div>
                </dl>

                <div className={styles.metaRow}>
                  {cond.correctionIndexPreKeys && (
                    <span className={styles.metaItem}>
                      <strong>Correção Obra:</strong> {cond.correctionIndexPreKeys}
                    </span>
                  )}
                  {cond.correctionIndexPostKeys && (
                    <span className={styles.metaItem}>
                      <strong>Pós-Chaves:</strong> {cond.correctionIndexPostKeys}
                    </span>
                  )}
                  {cond.acceptsExchange && (
                    <span className={`${styles.metaItem} ${styles.textSuccess}`}>
                      Aceita Permuta
                      {cond.maxExchangePercent != null
                        ? ` (até ${formatBrazilianNumber(cond.maxExchangePercent)}%)`
                        : ''}
                    </span>
                  )}
                  {cond.validUntil && (
                    <span className={`${styles.metaItem} ${styles.textWarning}`}>
                      <Calendar size={12} />
                      Válida até {new Date(cond.validUntil).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>

                {cond.publicNotes && (
                  <p className={styles.noteBox} style={{ margin: 0 }}>
                    <strong>Nota comercial:</strong> {cond.publicNotes}
                  </p>
                )}
                {cond.internalNotes && (
                  <p
                    className={styles.noteBox}
                    style={{ margin: 0, background: '#fffdf5', borderColor: '#fde68a', color: '#92400e' }}
                  >
                    <strong>Nota interna (Admin):</strong> {cond.internalNotes}
                  </p>
                )}
              </div>

              <div className={styles.cardActions}>
                <button
                  type="button"
                  onClick={() => openEditModal(cond)}
                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                >
                  <Pencil size={14} />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(cond)}
                  className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}
                >
                  <Trash2 size={14} />
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className={styles.overlay}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-condition-modal-title"
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderMain}>
                <div className={styles.modalIcon}>
                  <CreditCard size={20} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 id="payment-condition-modal-title" className={styles.modalTitle}>
                    {editingCondition
                      ? `Editar Condição: ${editingCondition.name}`
                      : 'Nova Condição Comercial de Pagamento'}
                  </h3>
                  <p className={styles.modalSubtitle}>
                    Configure entrada, mensais, reforços, chaves, financiamento e correção
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Fechar"
                className={`${styles.btn} ${styles.btnGhost} ${styles.btnIcon}`}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className={styles.modalForm}>
              <div className={styles.modalBody}>
                {formError && (
                  <div className={`${styles.alert} ${styles.alertError}`} role="alert">
                    <AlertCircle size={16} className={styles.alertIcon} />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Identificação e escopo */}
                <div className={styles.formGroup}>
                  <div className={styles.formGroupHeader}>
                    <span className={styles.formGroupTitle}>
                      <Layers size={16} />
                      Identificação e escopo
                    </span>
                  </div>
                  <div className={styles.formGridWide}>
                    <div className={styles.field}>
                      <div className={styles.labelRow}>
                        <label className={styles.label} htmlFor="pc-name">
                          Nome da Condição Comercial *
                        </label>
                      </div>
                      <input
                        id="pc-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex.: Tabela Direta Construtora 20/80"
                        className={styles.input}
                      />
                    </div>

                    <div className={styles.field}>
                      <div className={styles.labelRow}>
                        <label className={styles.label} htmlFor="pc-scope">
                          Escopo de Aplicação
                        </label>
                        <FieldHelper
                          title="Escopo de aplicação"
                          content="Define onde a condição vale: em todo o empreendimento, em uma torre/quadra, em uma tipologia ou apenas em uma unidade específica."
                        />
                      </div>
                      <select
                        id="pc-scope"
                        value={scopeType}
                        onChange={(e) => setScopeType(e.target.value as any)}
                        className={styles.select}
                      >
                        <option value="DEVELOPMENT">Geral do Empreendimento</option>
                        <option value="BLOCK">Por Torre / Quadra</option>
                        <option value="TYPOLOGY">Por Tipologia</option>
                        <option value="UNIT">Exclusiva de uma Unidade</option>
                      </select>
                    </div>

                    {scopeType === 'BLOCK' && (
                      <div className={styles.field}>
                        <div className={styles.labelRow}>
                          <label className={styles.label} htmlFor="pc-block">
                            <Building2 size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                            Selecione a Torre / Quadra *
                          </label>
                        </div>
                        <select
                          id="pc-block"
                          required
                          value={blockId}
                          onChange={(e) => setBlockId(e.target.value)}
                          className={styles.select}
                        >
                          <option value="">Selecione...</option>
                          {blocks.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.blockType})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {scopeType === 'TYPOLOGY' && (
                      <div className={styles.field}>
                        <div className={styles.labelRow}>
                          <label className={styles.label} htmlFor="pc-typology">
                            Selecione a Tipologia *
                          </label>
                        </div>
                        <select
                          id="pc-typology"
                          required
                          value={typologyId}
                          onChange={(e) => setTypologyId(e.target.value)}
                          className={styles.select}
                        >
                          <option value="">Selecione...</option>
                          {typologies.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {scopeType === 'UNIT' && (
                      <div className={styles.field}>
                        <div className={styles.labelRow}>
                          <label className={styles.label} htmlFor="pc-unit">
                            Selecione a Unidade Comercial *
                          </label>
                        </div>
                        <select
                          id="pc-unit"
                          required
                          value={commercialUnitId}
                          onChange={(e) => setCommercialUnitId(e.target.value)}
                          className={styles.select}
                        >
                          <option value="">Selecione...</option>
                          {units.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.unitCode} {u.block?.name ? `(${u.block.name})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Entrada e Mensais */}
                <div className={styles.formGroup}>
                  <div className={styles.formGroupHeader}>
                    <span className={styles.formGroupTitle}>Entrada e parcelas mensais</span>
                  </div>
                  <div className={styles.formGrid}>
                    <div className={styles.field}>
                      <div className={styles.labelRow}>
                        <label className={styles.label} htmlFor="pc-down-percent">
                          Entrada (%)
                        </label>
                        <FieldHelper
                          title="Entrada (%)"
                          content="Percentual do preço pago como sinal/entrada. Ex.: 20 = 20% do valor da unidade."
                        />
                      </div>
                      <input
                        id="pc-down-percent"
                        type="text"
                        value={downPaymentPercentRaw}
                        onChange={(e) => setDownPaymentPercentRaw(e.target.value)}
                        placeholder="Ex.: 20"
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.field}>
                      <div className={styles.labelRow}>
                        <label className={styles.label} htmlFor="pc-down-amount">
                          Entrada Fixa (R$)
                        </label>
                        <FieldHelper
                          title="Entrada fixa"
                          content="Valor fixo de entrada em reais. Use quando a entrada não for definida em percentual."
                        />
                      </div>
                      <input
                        id="pc-down-amount"
                        type="text"
                        value={downPaymentAmountRaw}
                        onChange={(e) => setDownPaymentAmountRaw(e.target.value)}
                        placeholder="Opcional"
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.field}>
                      <div className={styles.labelRow}>
                        <label className={styles.label} htmlFor="pc-down-installments">
                          Parcelas da Entrada
                        </label>
                      </div>
                      <input
                        id="pc-down-installments"
                        type="number"
                        min={1}
                        value={downPaymentInstallments}
                        onChange={(e) => setDownPaymentInstallments(e.target.value)}
                        className={styles.input}
                      />
                    </div>

                    <div className={styles.field}>
                      <div className={styles.labelRow}>
                        <label className={styles.label} htmlFor="pc-monthly-count">
                          Nº de Parcelas Mensais
                        </label>
                        <FieldHelper
                          title="Parcelas mensais"
                          content="Quantidade de parcelas mensais pagas durante a obra, normalmente até a entrega das chaves."
                        />
                      </div>
                      <input
                        id="pc-monthly-count"
                        type="number"
                        min={0}
                        value={monthlyCount}
                        onChange={(e) => setMonthlyCount(e.target.value)}
                        placeholder="Ex.: 36"
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.field}>
                      <div className={styles.labelRow}>
                        <label className={styles.label} htmlFor="pc-monthly-percent">
                          % Total das Mensais
                        </label>
                      </div>
                      <input
                        id="pc-monthly-percent"
                        type="text"
                        value={monthlyPercentTotalRaw}
                        onChange={(e) => setMonthlyPercentTotalRaw(e.target.value)}
                        placeholder="Ex.: 30"
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.field}>
                      <div className={styles.labelRow}>
                        <label className={styles.label} htmlFor="pc-monthly-amount">
                          Valor Parcela Mensal (R$)
                        </label>
                      </div>
                      <input
                        id="pc-monthly-amount"
                        type="text"
                        value={monthlyInstallmentAmountRaw}
                        onChange={(e) => setMonthlyInstallmentAmountRaw(e.target.value)}
                        placeholder="Opcional"
                        className={styles.input}
                      />
                    </div>
                  </div>
                </div>

                {/* Reforços, Chaves e Financiamento */}
                <div className={styles.formGroup}>
                  <div className={styles.formGroupHeader}>
                    <span className={styles.formGroupTitle}>
                      Reforços, chaves, financiamento e correção
                    </span>
                  </div>
                  <div className={styles.formGrid}>
                    <div className={styles.field}>
                      <div className={styles.labelRow}>
                        <label className={styles.label} htmlFor="pc-reinf-count">
                          Qtd. Reforços / Balões
                        </label>
                        <FieldHelper
                          title="Reforços / balões"
                          content="Parcelas extras de valor maior, pagas em intervalos (ex.: anuais), além das mensais."
                        />
                      </div>
                      <input
                        id="pc-reinf-count"
                        type="number"
                        min={0}
                        value={reinforcementCount}
                        onChange={(e) => setReinforcementCount(e.target.value)}
                        placeholder="Ex.: 3"
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.field}>
                      <div className={styles.labelRow}>
                        <label className={styles.label} htmlFor="pc-reinf-freq">
                          Periodicidade (Meses)
                        </label>
                      </div>
                      <input
                        id="pc-reinf-freq"
                        type="number"
                        min={1}
                        value={reinforcementFrequencyMonths}
                        onChange={(e) => setReinforcementFrequencyMonths(e.target.value)}
                        placeholder="Ex.: 12 (Anual)"
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.field}>
                      <div className={styles.labelRow}>
                        <label className={styles.label} htmlFor="pc-reinf-percent">
                          % Total Reforços
                        </label>
                      </div>
                      <input
                        id="pc-reinf-percent"
                        type="text"
                        value={reinforcementPercentTotalRaw}
                        onChange={(e) => setReinforcementPercentTotalRaw(e.target.value)}
                        placeholder="Ex.: 20"
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.field}>
                      <div className={styles.labelRow}>
                        <label className={styles.label} htmlFor="pc-reinf-amount">
                          Valor Reforço (R$)
                        </label>
                      </div>
                      <input
                        id="pc-reinf-amount"
                        type="text"
                        value={reinforcementInstallmentAmountRaw}
                        onChange={(e) => setReinforcementInstallmentAmountRaw(e.target.value)}
                        placeholder="Opcional"
                        className={styles.input}
                      />
                    </div>

                    <div className={styles.field}>
                      <div className={styles.labelRow}>
                        <label className={styles.label} htmlFor="pc-keys-percent">
                          Nas Chaves (%)
                        </label>
                        <FieldHelper
                          title="Parcela das chaves"
                          content="Percentual pago na entrega das chaves (conclusão da obra)."
                        />
                      </div>
                      <input
                        id="pc-keys-percent"
                        type="text"
                        value={keysPercentRaw}
                        onChange={(e) => setKeysPercentRaw(e.target.value)}
                        placeholder="Ex.: 10"
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.field}>
                      <div className={styles.labelRow}>
                        <label className={styles.label} htmlFor="pc-financing-percent">
                          Financiamento / Saldo (%)
                        </label>
                        <FieldHelper
                          title="Financiamento / saldo"
                          content="Percentual do saldo quitado via financiamento bancário ou direto com a construtora após as chaves."
                        />
                      </div>
                      <input
                        id="pc-financing-percent"
                        type="text"
                        value={financingPercentRaw}
                        onChange={(e) => setFinancingPercentRaw(e.target.value)}
                        placeholder="Ex.: 20"
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.field}>
                      <div className={styles.labelRow}>
                        <label className={styles.label} htmlFor="pc-index-pre">
                          Índice Pré-Chaves
                        </label>
                        <FieldHelper
                          title="Índice de correção"
                          content="Índice que reajusta as parcelas. Antes das chaves costuma ser INCC; após, IPCA/IGP-M com ou sem juros."
                        />
                      </div>
                      <input
                        id="pc-index-pre"
                        type="text"
                        value={correctionIndexPreKeys}
                        onChange={(e) => setCorrectionIndexPreKeys(e.target.value)}
                        placeholder="Ex.: INCC-M / CUB"
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.field}>
                      <div className={styles.labelRow}>
                        <label className={styles.label} htmlFor="pc-index-post">
                          Índice Pós-Chaves
                        </label>
                      </div>
                      <input
                        id="pc-index-post"
                        type="text"
                        value={correctionIndexPostKeys}
                        onChange={(e) => setCorrectionIndexPostKeys(e.target.value)}
                        placeholder="Ex.: IPCA + 1% a.m."
                        className={styles.input}
                      />
                    </div>
                  </div>
                </div>

                {/* Validade, status e permuta */}
                <div className={styles.formGroup}>
                  <div className={styles.formGroupHeader}>
                    <span className={styles.formGroupTitle}>
                      <Calendar size={16} />
                      Validade, status e permuta
                    </span>
                  </div>
                  <div className={styles.formGrid}>
                    <div className={styles.field}>
                      <div className={styles.labelRow}>
                        <label className={styles.label} htmlFor="pc-valid-until">
                          Validade da Tabela
                        </label>
                      </div>
                      <input
                        id="pc-valid-until"
                        type="date"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        className={styles.input}
                      />
                    </div>
                  </div>

                  <div className={styles.checkboxRow}>
                    <label className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={isDefault}
                        onChange={(e) => setIsDefault(e.target.checked)}
                      />
                      Condição Padrão
                    </label>

                    <label className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                      />
                      Ativa
                    </label>

                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <label className={styles.checkbox}>
                        <input
                          type="checkbox"
                          checked={acceptsExchange}
                          onChange={(e) => setAcceptsExchange(e.target.checked)}
                        />
                        Aceita Permuta
                      </label>
                      <FieldHelper helpKey="acceptsExchange" />
                    </span>
                  </div>

                  {acceptsExchange && (
                    <div className={styles.formGrid}>
                      <div className={styles.field}>
                        <div className={styles.labelRow}>
                          <label className={styles.label} htmlFor="pc-exchange-max">
                            % Máximo de Permuta
                          </label>
                        </div>
                        <input
                          id="pc-exchange-max"
                          type="text"
                          value={maxExchangePercentRaw}
                          onChange={(e) => setMaxExchangePercentRaw(e.target.value)}
                          placeholder="Ex.: 30"
                          className={styles.input}
                        />
                      </div>
                      <div className={`${styles.field} ${styles.fieldWide}`}>
                        <div className={styles.labelRow}>
                          <label className={styles.label} htmlFor="pc-exchange-notes">
                            Regras da Permuta
                          </label>
                        </div>
                        <input
                          id="pc-exchange-notes"
                          type="text"
                          value={exchangeNotes}
                          onChange={(e) => setExchangeNotes(e.target.value)}
                          placeholder="Ex.: Imóveis na região central mediante avaliação"
                          className={styles.input}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Observações */}
                <div className={styles.formGridWide}>
                  <div className={styles.field}>
                    <div className={styles.labelRow}>
                      <label className={styles.label} htmlFor="pc-public-notes">
                        Observações Comerciais (Corretores)
                      </label>
                      <FieldHelper helpKey="publicNotes" />
                    </div>
                    <textarea
                      id="pc-public-notes"
                      rows={2}
                      value={publicNotes}
                      onChange={(e) => setPublicNotes(e.target.value)}
                      placeholder="Condições visíveis aos corretores"
                      className={styles.textarea}
                    />
                  </div>
                  <div className={styles.field}>
                    <div className={styles.labelRow}>
                      <label className={styles.label} htmlFor="pc-internal-notes">
                        Observações Internas (Exclusivo Admin)
                      </label>
                      <FieldHelper helpKey="internalNotes" />
                    </div>
                    <textarea
                      id="pc-internal-notes"
                      rows={2}
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      placeholder="Margem de negociação interna"
                      className={styles.textarea}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className={`${styles.btn} ${styles.btnSecondary}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`${styles.btn} ${styles.btnPrimary}`}
                >
                  {submitting ? 'Salvando...' : 'Salvar Condição'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
