'use client';

import React from 'react';
import {
  Building2,
  Ruler,
  Home,
  DollarSign,
  CreditCard,
  History,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import FieldHelper from '@/components/FieldHelper';
import type { FieldHelpKey } from '@/lib/field-help';
import styles from '@/styles/commercial-units.module.css';
import {
  COMMERCIAL_UNIT_STATUS_META,
  COMMERCIAL_UNIT_TYPE_LABELS,
  formatAreaSqm,
  formatBrazilianNumber,
  formatCurrencyBRL,
  formatLinearMeters,
} from '@/lib/commercial-unit-format';
import type { CommercialUnitStatus, CommercialUnitType } from '@/lib/commercial-unit-service';
import {
  deriveRoomBreakdown,
  getUnitCategory,
  unitTypeHasBathrooms,
  unitTypeHasBedrooms,
} from '@/lib/commercial-unit-rules';

/**
 * Componentes compartilhados entre a gestão administrativa e a consulta do corretor
 * (mesmos dados, nomenclaturas e cálculos — Ajustes da Etapa 6B.3.1).
 */

export function CommercialUnitStatusBadge({
  status,
  onClick,
  title,
  long = false,
}: {
  status?: string | null;
  onClick?: () => void;
  title?: string;
  long?: boolean;
}) {
  const meta =
    COMMERCIAL_UNIT_STATUS_META[(status as CommercialUnitStatus) || 'DISPONIVEL'] ||
    COMMERCIAL_UNIT_STATUS_META.DISPONIVEL;
  const style = { color: meta.color, background: meta.background, borderColor: meta.border };
  const content = (
    <>
      <span className={styles.statusDot} />
      {long ? meta.label : meta.shortLabel}
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={styles.statusBadge} style={style} onClick={onClick} title={title}>
        {content}
      </button>
    );
  }
  return (
    <span className={styles.statusBadge} style={style} title={title}>
      {content}
    </span>
  );
}

export function DetailItem({
  label,
  value,
  helpKey,
  muted = false,
}: {
  label: string;
  value: React.ReactNode;
  helpKey?: FieldHelpKey;
  muted?: boolean;
}) {
  return (
    <div className={styles.dlItem}>
      <dt className={styles.dt}>
        {label}
        {helpKey && <FieldHelper helpKey={helpKey} size={13} />}
      </dt>
      <dd className={`${styles.dd} ${muted ? styles.ddMuted : ''}`}>{value}</dd>
    </div>
  );
}

export function formatUnitFloor(unit: { unitType?: string | null; floor?: number | null }, long = false) {
  if (getUnitCategory(unit.unitType) === 'LOT' || unit.floor == null) return long ? 'Não aplicável' : '—';
  if (unit.floor === 0) return 'Térreo';
  return long ? `${unit.floor}º andar` : `${unit.floor}º`;
}

export function formatPricePerSqmText(unit: {
  pricePerSqm?: number | null;
  referenceArea?: number | null;
  referenceAreaLabel?: string | null;
  requiredReferenceAreaLabel?: string | null;
}) {
  if (unit.pricePerSqm != null && unit.referenceArea != null && unit.referenceAreaLabel) {
    return {
      available: true,
      value: `${formatCurrencyBRL(unit.pricePerSqm)}/m²`,
      basis: `base: ${formatAreaSqm(unit.referenceArea)} de ${unit.referenceAreaLabel}`,
    };
  }
  return {
    available: false,
    value: 'Indisponível',
    basis: `informe a ${unit.requiredReferenceAreaLabel || 'metragem de referência'} e o preço`,
  };
}

interface CommercialUnitDetailProps {
  unit: any;
  developmentName?: string;
  /** ADMIN: exibe informações internas, auditoria e histórico. */
  isAdmin: boolean;
  history?: any[];
  actions?: React.ReactNode;
}

/**
 * Ficha completa da unidade comercial, reutilizada pelo administrador e pelo corretor.
 * Informações internas e de auditoria só são renderizadas quando `isAdmin` é verdadeiro
 * (e, para corretores, já chegam removidas/nulas pela API).
 */
export function CommercialUnitDetail({
  unit,
  developmentName,
  isAdmin,
  history = [],
  actions,
}: CommercialUnitDetailProps) {
  const category = getUnitCategory(unit.unitType);
  const hasBedrooms = unitTypeHasBedrooms(unit.unitType);
  const hasBathrooms = unitTypeHasBathrooms(unit.unitType);
  const rooms = deriveRoomBreakdown(unit);
  const sqm = formatPricePerSqmText(unit);
  const typeLabel =
    COMMERCIAL_UNIT_TYPE_LABELS[(unit.unitType as CommercialUnitType) || 'APARTAMENTO'] || unit.unitType;
  const conditions: any[] = Array.isArray(unit.paymentConditions) ? unit.paymentConditions : [];

  const areaItems: Array<{ label: string; value: number | null | undefined; helpKey: FieldHelpKey }> =
    category === 'VERTICAL'
      ? [
          { label: 'Área privativa', value: unit.privateArea, helpKey: 'privateArea' },
          { label: 'Área total', value: unit.totalArea, helpKey: 'totalArea' },
        ]
      : category === 'HOUSE'
        ? [
            { label: 'Área construída', value: unit.builtArea, helpKey: 'builtArea' as FieldHelpKey },
            { label: 'Área do terreno', value: unit.landArea, helpKey: 'landArea' as FieldHelpKey },
            { label: 'Área total documental', value: unit.totalArea, helpKey: 'totalArea' as FieldHelpKey },
            ...(unit.privateArea != null && unit.privateArea > 0
              ? [{ label: 'Área privativa', value: unit.privateArea, helpKey: 'privateArea' as FieldHelpKey }]
              : []),
          ]
        : [
            { label: 'Área do terreno', value: unit.landArea, helpKey: 'landArea' },
            { label: 'Área total (fração ideal)', value: unit.totalArea, helpKey: 'totalArea' },
          ];

  return (
    <div className={styles.detail}>
      <div className={styles.detailHeader}>
        <div>
          <span className={styles.detailEyebrow}>Ficha da unidade</span>
          <h4 className={styles.detailTitle}>
            {developmentName ? `${developmentName} • ` : ''}Unidade {unit.unitCode}
          </h4>
        </div>
        {actions && <div className={styles.headerActions}>{actions}</div>}
      </div>

      <div className={styles.detailGrid}>
        {/* 1. Identificação */}
        <div className={styles.detailCard}>
          <div className={styles.detailCardTitle}>
            <Building2 size={15} className={styles.sectionTitleIcon} />
            Identificação
          </div>
          <dl className={styles.dl}>
            <DetailItem label="Unidade" value={unit.unitCode} helpKey="unitCode" />
            <DetailItem label="Tipo" value={typeLabel} />
            <DetailItem
              label="Tipologia"
              value={unit.typology?.name || '—'}
              helpKey="typology"
            />
            <DetailItem
              label={category === 'VERTICAL' ? 'Torre / Bloco' : 'Quadra / Setor'}
              value={unit.block?.name || unit.quadraName || '—'}
            />
            {category !== 'LOT' && (
              <DetailItem label="Pavimento" value={formatUnitFloor(unit, true)} helpKey="unitFloor" />
            )}
            {unit.lotNumber && <DetailItem label="Lote" value={unit.lotNumber} />}
            {unit.position && <DetailItem label="Posição" value={unit.position} muted />}
            {unit.solarOrientation && (
              <DetailItem label="Orientação solar" value={unit.solarOrientation} muted />
            )}
          </dl>
        </div>

        {/* 2. Metragens */}
        <div className={styles.detailCard}>
          <div className={styles.detailCardTitle}>
            <Ruler size={15} className={styles.sectionTitleIcon} />
            Metragens
          </div>
          <dl className={styles.dl}>
            {areaItems.map((a) => (
              <DetailItem key={a.label} label={a.label} value={formatAreaSqm(a.value)} helpKey={a.helpKey} />
            ))}
            {unit.frontage != null && unit.frontage > 0 && (
              <DetailItem label="Testada / frente" value={formatLinearMeters(unit.frontage)} muted />
            )}
            {unit.backDimension != null && unit.backDimension > 0 && (
              <DetailItem label="Fundos" value={formatLinearMeters(unit.backDimension)} muted />
            )}
            {unit.leftDepth != null && unit.leftDepth > 0 && (
              <DetailItem label="Lateral esquerda" value={formatLinearMeters(unit.leftDepth)} muted />
            )}
            {unit.rightDepth != null && unit.rightDepth > 0 && (
              <DetailItem label="Lateral direita" value={formatLinearMeters(unit.rightDepth)} muted />
            )}
            {unit.topography && <DetailItem label="Topografia" value={unit.topography} muted />}
            {category !== 'VERTICAL' && (
              <DetailItem label="Esquina" value={unit.isCorner ? 'Sim' : 'Não'} muted />
            )}
          </dl>
        </div>

        {/* 3. Características */}
        {category !== 'LOT' && (
          <div className={styles.detailCard}>
            <div className={styles.detailCardTitle}>
              <Home size={15} className={styles.sectionTitleIcon} />
              Características
            </div>
            <dl className={styles.dl}>
              {hasBedrooms && (
                <>
                  <DetailItem label="Suítes" value={rooms.suites} helpKey="suites" />
                  <DetailItem label="Dormitórios extras" value={rooms.extraBedrooms} helpKey="extraBedrooms" />
                  <DetailItem
                    label="Total de dormitórios"
                    value={rooms.totalBedrooms}
                    helpKey="totalDormitories"
                  />
                </>
              )}
              {hasBathrooms && (
                <>
                  <DetailItem label="Banheiros sociais" value={rooms.socialBathrooms} helpKey="socialBathrooms" />
                  <DetailItem label="Lavabos" value={rooms.lavabos} helpKey="lavabos" />
                  <DetailItem label="Total de banheiros" value={rooms.totalBathrooms} helpKey="totalBathrooms" />
                </>
              )}
              <DetailItem
                label="Vagas totais"
                value={unit.parkingSpaces ?? 0}
                helpKey="totalParkingSpaces"
              />
              {unit.coveredParkingSpaces != null && (
                <DetailItem
                  label="Vagas cobertas"
                  value={unit.coveredParkingSpaces}
                  helpKey="coveredParkingSpaces"
                  muted
                />
              )}
              {unit.uncoveredParkingSpaces != null && (
                <DetailItem
                  label="Vagas descobertas"
                  value={unit.uncoveredParkingSpaces}
                  helpKey="uncoveredParkingSpaces"
                  muted
                />
              )}
              {unit.parkingBoxNumbers && (
                <DetailItem label="Box de garagem" value={unit.parkingBoxNumbers} muted />
              )}
              {unit.storageNumber && <DetailItem label="Depósito" value={unit.storageNumber} muted />}
              {unit.houseFloors != null && (
                <DetailItem label="Pavimentos da casa" value={unit.houseFloors} muted />
              )}
              <DetailItem
                label="Diferenciais"
                value={
                  [unit.hasBarbecue ? 'Churrasqueira' : null, unit.isPenthouse ? 'Cobertura' : null]
                    .filter(Boolean)
                    .join(' • ') || '—'
                }
                muted
              />
            </dl>
            {rooms.isInconsistent && isAdmin && (
              <div className={`${styles.alert} ${styles.alertWarning}`}>
                <AlertTriangle size={16} className={styles.alertIcon} />
                <span>
                  Totais salvos anteriormente são menores que a soma das suítes e lavabos. Revise a unidade
                  no formulário de edição.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {unit.description && (
        <div className={styles.detailCard}>
          <div className={styles.detailCardTitle}>
            Descrição da unidade
            <FieldHelper helpKey="unitDescription" size={13} />
          </div>
          <p className={styles.dd} style={{ fontWeight: 500, whiteSpace: 'pre-line', margin: 0 }}>
            {unit.description}
          </p>
        </div>
      )}

      <div className={styles.detailGrid}>
        {/* 4. Informações comerciais */}
        <div className={styles.detailCard}>
          <div className={styles.detailCardTitle}>
            <DollarSign size={15} className={styles.sectionTitleIcon} />
            Informações comerciais
          </div>
          <dl className={styles.dl}>
            <DetailItem label="Preço de tabela" value={formatCurrencyBRL(unit.listPrice)} helpKey="listPrice" />
            <DetailItem
              label="Preço promocional"
              value={unit.promotionalPrice != null ? formatCurrencyBRL(unit.promotionalPrice) : '—'}
              helpKey="promotionalPrice"
            />
            <DetailItem
              label="Disponibilidade"
              value={<CommercialUnitStatusBadge status={unit.commercialStatus} long />}
              helpKey="commercialStatus"
            />
            <DetailItem
              label="Financiamento"
              value={unit.acceptsFinancing ? 'Aceita' : 'Não aceita'}
              helpKey="acceptsFinancing"
              muted
            />
            <DetailItem
              label="Permuta"
              value={
                unit.acceptsExchange
                  ? `Aceita${unit.exchangeNotes ? ` — ${unit.exchangeNotes}` : ''}`
                  : 'Não aceita'
              }
              helpKey="acceptsExchange"
              muted
            />
          </dl>

          <div className={`${styles.highlightBox} ${sqm.available ? '' : styles.highlightMuted}`}>
            <span className={styles.highlightLabel}>
              Preço por m²
              <FieldHelper helpKey="pricePerSqm" size={13} />
            </span>
            <span className={styles.highlightValue}>
              {sqm.value}
              <span className={styles.cellSub} style={{ textAlign: 'right' }}>
                {sqm.basis}
              </span>
            </span>
          </div>

          {unit.publicNotes && (
            <div className={styles.noteBox}>
              <strong>Observações para corretores:</strong> {unit.publicNotes}
            </div>
          )}

          <div className={styles.sectionLabel}>
            <CreditCard size={14} />
            Condições comerciais
            <FieldHelper helpKey="paymentConditions" size={13} />
          </div>
          {conditions.length === 0 ? (
            <p className={styles.hint} style={{ margin: 0 }}>
              Nenhuma condição comercial cadastrada para esta unidade.
            </p>
          ) : (
            <div className={styles.list}>
              {conditions.map((pc: any) => (
                <div key={pc.id} className={styles.listItem}>
                  <div className={styles.listItemHeader}>
                    <span>{pc.name}</span>
                    {pc.scopeLevel && <span className={styles.tag}>{pc.scopeLevel}</span>}
                  </div>
                  <span>
                    Entrada:{' '}
                    {pc.downPaymentPercent != null ? `${formatBrazilianNumber(pc.downPaymentPercent)}%` : '—'} •
                    Mensais: {pc.monthlyCount || 0}x • Correção: {pc.correctionIndexPreKeys || '—'}
                  </span>
                  {pc.description && <span className={styles.listItemMeta}>{pc.description}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. Administração (exclusivo ADMIN) */}
        {isAdmin && (
          <div className={`${styles.detailCard} ${styles.detailCardInternal}`}>
            <div className={styles.detailCardTitle}>
              <ShieldCheck size={15} className={styles.sectionTitleIcon} />
              Administração (exclusivo admin)
            </div>
            <div className={styles.noteBox}>
              <strong>Observações internas:</strong>{' '}
              {unit.internalNotes || 'Nenhuma observação interna registrada.'}
            </div>
            {unit.reservedByNote && (
              <div className={styles.noteBox}>
                <strong>Controle de reserva:</strong> {unit.reservedByNote}
                {unit.reservedUntil
                  ? ` (até ${new Date(unit.reservedUntil).toLocaleDateString('pt-BR')})`
                  : ''}
              </div>
            )}
            <div className={styles.noteBox}>
              <strong>Vínculo físico (Bloco 05):</strong>{' '}
              {unit.resaleSummary?.hasPhysicalIdentity
                ? `Vinculado (${unit.resaleSummary.physicalPropertyId || unit.buildingUnitId})`
                : 'Estoque primário independente'}{' '}
              • Revendas ativas: {unit.resaleSummary?.activeResaleListingsCount || 0}
            </div>

            <div className={styles.sectionLabel}>
              <History size={14} />
              Histórico de preço e disponibilidade ({history.length})
            </div>
            {history.length === 0 ? (
              <p className={styles.hint} style={{ margin: 0 }}>
                Nenhum registro histórico encontrado.
              </p>
            ) : (
              <div className={`${styles.list} ${styles.listScroll}`}>
                {history.map((h: any) => (
                  <div key={h.id} className={styles.listItem}>
                    <div className={styles.listItemHeader}>
                      <span>
                        {h.previousStatus
                          ? `${COMMERCIAL_UNIT_STATUS_META[h.previousStatus as CommercialUnitStatus]?.shortLabel || h.previousStatus} → `
                          : ''}
                        {COMMERCIAL_UNIT_STATUS_META[h.newStatus as CommercialUnitStatus]?.shortLabel ||
                          h.newStatus}
                      </span>
                      <span className={styles.listItemMeta}>
                        {new Date(h.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <span>
                      Preço:{' '}
                      {h.previousListPrice != null ? `${formatCurrencyBRL(h.previousListPrice)} → ` : ''}
                      <strong>{formatCurrencyBRL(h.newListPrice)}</strong>
                      {h.newPromotionalPrice != null
                        ? ` (promo: ${formatCurrencyBRL(h.newPromotionalPrice)})`
                        : ''}
                    </span>
                    {h.reason && <span className={styles.listItemMeta}>Motivo: {h.reason}</span>}
                    {h.changedBy && (
                      <span className={styles.listItemMeta}>
                        Por: {h.changedBy.name || h.changedBy.email}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {unit.createdAt && (
              <span className={styles.listItemMeta}>
                Criada em {new Date(unit.createdAt).toLocaleString('pt-BR')} • Atualizada em{' '}
                {new Date(unit.updatedAt).toLocaleString('pt-BR')}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
