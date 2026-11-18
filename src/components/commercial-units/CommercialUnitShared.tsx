'use client';

import React, { useState } from 'react';
import {
  Building2,
  Ruler,
  Home,
  DollarSign,
  CreditCard,
  History,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Eye,
  Download,
  Maximize2,
  FileText,
  X,
  Loader2,
  Share2,
} from 'lucide-react';
import ShareCommercialUnitModal from './ShareCommercialUnitModal';
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
  formatUnitFloor,
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

export function ResaleListingBadge({
  count = 0,
  label,
}: {
  count?: number;
  label?: string;
}) {
  if (!count || count <= 0) return null;
  return (
    <span
      className={styles.resaleBadge}
      title={`${count} revenda(s) de corretor vinculada(s) a este imóvel físico`}
    >
      <Home size={11} />
      <span>{label || `${count} revenda${count > 1 ? 's' : ''}`}</span>
    </span>
  );
}

export function CapacityBadge({
  current,
  planned,
}: {
  current: number;
  planned?: number | null;
}) {
  const hasPlanned = planned != null && planned > 0;
  return (
    <span
      className={styles.capacityBadge}
      title={
        hasPlanned
          ? `${current} unidade(s) cadastrada(s) de ${planned} planejada(s)`
          : `${current} unidade(s) cadastrada(s)`
      }
    >
      {hasPlanned ? `${current} / ${planned} un.` : `${current} un.`}
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

export { formatUnitFloor };

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

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [zoomedPlant, setZoomedPlant] = useState<any | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const typologyPlants = Array.isArray(unit.typology?.materials)
    ? unit.typology.materials.filter((m: any) => m.category === 'PLANTA_TIPOLOGIA' && m.isActive)
    : [];

  const sortedPlants = [...typologyPlants].sort(
    (a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0)
  );
  const mainPlant = sortedPlants[0] || null;
  const otherPlants = sortedPlants.slice(1);

  async function handleDownloadPlant(plant: any) {
    if (downloadingId) return;
    try {
      setDownloadingId(plant.id);
      const res = await fetch(`/api/materials/${plant.id}/download`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Não foi possível baixar a planta.');
        return;
      }
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const disposition = res.headers.get('content-disposition');
      let filename = '';
      if (disposition && disposition.includes('filename')) {
        const match = disposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/i);
        if (match && match[1]) filename = decodeURIComponent(match[1]);
      }
      if (!filename) {
        const ext = plant.fileExtension ? `.${plant.fileExtension.replace(/^\./, '')}` : '';
        filename = `${plant.title}${ext}`;
      }
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(link);
    } catch (err) {
      console.error('Erro ao baixar planta:', err);
      alert('Erro ao iniciar download da planta.');
    } finally {
      setDownloadingId(null);
    }
  }

  const isImageFormat = (ext?: string | null, mime?: string | null) => {
    if (mime?.startsWith('image/')) return true;
    const cleanExt = (ext || '').toLowerCase().replace('.', '');
    return ['jpg', 'jpeg', 'png', 'webp'].includes(cleanExt);
  };

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

  const canShareUnit =
    unit.commercialStatus === 'DISPONIVEL' || unit.commercialStatus === 'RESERVADA';

  return (
    <div className={styles.detail}>
      <div className={styles.detailHeader}>
        <div>
          <span className={styles.detailEyebrow}>Ficha da unidade</span>
          <h4 className={styles.detailTitle}>
            {developmentName ? `${developmentName} • ` : ''}Unidade {unit.unitCode}
          </h4>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            id={`btn-compartilhar-unidade-${(unit.unitCode || 'unidade').toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            onClick={() => {
              if (canShareUnit) setShowShareModal(true);
            }}
            disabled={!canShareUnit}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: canShareUnit ? '#F1F5F9' : '#F8FAFC',
              color: canShareUnit ? '#1E4620' : '#94A3B8',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              fontSize: '0.80rem',
              fontWeight: 600,
              cursor: canShareUnit ? 'pointer' : 'not-allowed',
              opacity: canShareUnit ? 1 : 0.7,
              transition: 'all 0.15s ease',
            }}
            title={
              canShareUnit
                ? 'Compartilhar Unidade com Cliente'
                : 'Unidades vendidas ou indisponíveis temporariamente não permitem novos links de compartilhamento'
            }
          >
            <Share2 size={14} />
            <span>Compartilhar Unidade</span>
          </button>
          {actions && <div className={styles.headerActions}>{actions}</div>}
        </div>
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

      {/* SEÇÃO: Planta da Unidade vinculada à tipologia (Etapa 6C.1) */}
      {mainPlant && (
        <div className={styles.detailCard} style={{ marginBottom: '16px' }}>
          <div className={styles.detailCardTitle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={15} className={styles.sectionTitleIcon} />
              <span>Planta da Unidade</span>
            </div>
            {unit.typology?.name && (
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#166534', backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: '4px' }}>
                Tipologia: {unit.typology.name}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start', marginTop: '10px' }}>
            {/* Planta Principal */}
            <div style={{ flex: '1 1 280px', maxWidth: '420px' }}>
              {isImageFormat(mainPlant.fileExtension, mainPlant.fileType) ? (
                <div
                  onClick={() => setZoomedPlant(mainPlant)}
                  title="Clique para ampliar a planta"
                  style={{
                    position: 'relative',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#F8FAFC',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <img
                    src={mainPlant.fileUrl}
                    alt={mainPlant.title}
                    style={{
                      width: '100%',
                      maxHeight: '240px',
                      objectFit: 'contain',
                      display: 'block',
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      backgroundColor: 'rgba(17, 24, 39, 0.75)',
                      color: '#FFFFFF',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Maximize2 size={12} />
                    <span>Ampliar imagem</span>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: '#FEF2F2',
                    borderRadius: '8px',
                    border: '1px solid #FECACA',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <FileText size={36} color="#DC2626" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.90rem', color: '#991B1B' }}>
                      {mainPlant.title}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#B91C1C', marginTop: '2px' }}>
                      Documento PDF {mainPlant.fileSizeBytes ? `• ${Math.round(mainPlant.fileSizeBytes / 1024)} KB` : ''}
                    </div>
                  </div>
                </div>
              )}

              {/* Ações da Planta Principal */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                <a
                  href={`/api/materials/${mainPlant.id}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Visualizar planta em nova aba"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#F1F5F9',
                    color: '#1E293B',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    border: '1px solid #CBD5E1',
                  }}
                >
                  <Eye size={14} />
                  <span>Visualizar</span>
                </a>

                {mainPlant.allowDownload && (
                  <button
                    type="button"
                    onClick={() => handleDownloadPlant(mainPlant)}
                    disabled={downloadingId === mainPlant.id}
                    title="Baixar arquivo da planta"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#F1F5F9',
                      color: '#1E293B',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      border: '1px solid #CBD5E1',
                      cursor: downloadingId === mainPlant.id ? 'wait' : 'pointer',
                    }}
                  >
                    {downloadingId === mainPlant.id ? (
                      <Loader2 size={14} className="animate-spin" color="#1E4620" />
                    ) : (
                      <Download size={14} />
                    )}
                    <span>{downloadingId === mainPlant.id ? 'Baixando...' : 'Baixar planta'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Outras Plantas da Mesma Tipologia (se houver) */}
            {otherPlants.length > 0 && (
              <div style={{ flex: '1 1 220px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                  Outras opções de planta desta tipologia ({otherPlants.length}):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {otherPlants.map((op: any) => (
                    <div
                      key={op.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#FFFFFF',
                        gap: '8px',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {op.title}
                        </div>
                        <div style={{ fontSize: '0.70rem', color: '#64748B' }}>
                          {op.fileExtension?.toUpperCase()} {op.fileSizeBytes ? `• ${Math.round(op.fileSizeBytes / 1024)} KB` : ''}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <a
                          href={`/api/materials/${op.id}/view`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Visualizar em nova aba"
                          style={{
                            padding: '4px 6px',
                            borderRadius: '4px',
                            color: '#475569',
                            display: 'inline-flex',
                          }}
                        >
                          <Eye size={14} />
                        </a>
                        {op.allowDownload && (
                          <button
                            type="button"
                            onClick={() => handleDownloadPlant(op)}
                            disabled={downloadingId === op.id}
                            title="Baixar planta"
                            style={{
                              padding: '4px 6px',
                              border: 'none',
                              background: 'none',
                              color: '#475569',
                              cursor: downloadingId === op.id ? 'wait' : 'pointer',
                              display: 'inline-flex',
                            }}
                          >
                            {downloadingId === op.id ? (
                              <Loader2 size={14} className="animate-spin" color="#1E4620" />
                            ) : (
                              <Download size={14} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
      {/* Modal de Zoom da Planta (Celular e Desktop) */}
      {zoomedPlant && (
        <div
          onClick={() => setZoomedPlant(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '90vh',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                borderBottom: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1E293B' }}>
                {zoomedPlant.title}
              </div>
              <button
                type="button"
                onClick={() => setZoomedPlant(null)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#64748B',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ overflow: 'auto', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={zoomedPlant.fileUrl}
                alt={zoomedPlant.title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '75vh',
                  objectFit: 'contain',
                  borderRadius: '4px',
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '8px',
                padding: '10px 16px',
                borderTop: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
              }}
            >
              <a
                href={`/api/materials/${zoomedPlant.id}/view`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  fontSize: '0.80rem',
                  fontWeight: 600,
                  border: '1px solid #CBD5E1',
                  textDecoration: 'none',
                }}
              >
                <Eye size={13} />
                <span>Abrir em nova aba</span>
              </a>
              <button
                type="button"
                onClick={() => setZoomedPlant(null)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  backgroundColor: '#1E4620',
                  color: '#FFFFFF',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {showShareModal && (
        <ShareCommercialUnitModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          unit={unit}
          developmentName={developmentName}
        />
      )}
      </div>
    </div>
  );
}
