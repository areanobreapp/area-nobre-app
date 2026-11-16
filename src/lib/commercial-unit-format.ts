import type { CommercialUnitStatus, CommercialUnitType } from './commercial-unit-service';
import { resolvePrimaryArea } from './commercial-unit-rules';

export const COMMERCIAL_UNIT_TYPE_LABELS: Record<CommercialUnitType, string> = {
  APARTAMENTO: 'Apartamento',
  SALA_COMERCIAL: 'Sala Comercial',
  CASA: 'Casa',
  LOTE: 'Lote / Terreno',
  COBERTURA: 'Cobertura',
  STUDIO: 'Studio / Loft',
};

export const COMMERCIAL_UNIT_STATUS_META: Record<
  CommercialUnitStatus,
  {
    label: string;
    shortLabel: string;
    badgeClass: string;
    dotClass: string;
    color: string;
    background: string;
    border: string;
  }
> = {
  DISPONIVEL: {
    label: 'Disponível',
    shortLabel: 'Disponível',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
    color: 'var(--color-success, #15803D)',
    background: 'var(--color-success-bg, #DCFCE7)',
    border: '#BBF7D0',
  },
  RESERVADA: {
    label: 'Reservada',
    shortLabel: 'Reservada',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500',
    color: 'var(--color-warning, #B45309)',
    background: 'var(--color-warning-bg, #FEF3C7)',
    border: '#FDE68A',
  },
  VENDIDA: {
    label: 'Vendida',
    shortLabel: 'Vendida',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
    color: 'var(--color-danger, #B91C1C)',
    background: 'var(--color-danger-bg, #FEE2E2)',
    border: '#FECACA',
  },
  INDISPONIVEL_TEMPORARIAMENTE: {
    label: 'Indisponível Temporariamente',
    shortLabel: 'Indisponível',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    dotClass: 'bg-slate-400',
    color: 'var(--text-secondary, #4B5563)',
    background: 'var(--bg-subtle, #F1F4F2)',
    border: 'var(--border-light, #E5E7EB)',
  },
};

/**
 * Converte strings numéricas no padrão brasileiro ("85,50", "1.250,75") ou internacional ("85.5")
 * em número decimal exato sem arredondamento indevido.
 * Retorna `null` se vazio e `NaN` se o valor for inválido.
 */
export function parseBrazilianDecimal(
  raw: string | number | null | undefined,
  options: { allowZero?: boolean; allowNegative?: boolean } = {}
): number | null {
  const { allowZero = true, allowNegative = false } = options;

  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return Number.NaN;
    if (!allowNegative && raw < 0) return Number.NaN;
    if (!allowZero && raw === 0) return Number.NaN;
    return raw;
  }

  const cleaned = raw
    .trim()
    .replace(/^R\$\s*/i, '')
    .replace(/\s*m²$/i, '')
    .replace(/\s*m2$/i, '')
    .replace(/\s+/g, '');

  if (!cleaned) return null;

  let normalized = cleaned;
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Padrão brasileiro: 1.250,75
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Padrão US: 1,250.75
      normalized = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Ex: "85,50" -> "85.50"
    const parts = cleaned.split(',');
    if (parts.length > 2) return Number.NaN;
    normalized = `${parts[0]}.${parts[1]}`;
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return Number.NaN;
  }

  const num = Number(normalized);
  if (!Number.isFinite(num)) return Number.NaN;
  if (!allowNegative && num < 0) return Number.NaN;
  if (!allowZero && num === 0) return Number.NaN;

  return num;
}

/**
 * Formata um número decimal no padrão brasileiro ("85", "85,50", "1.250,75")
 * preservando até 2 casas decimais quando houver fração.
 */
export function formatBrazilianNumber(
  value: number | null | undefined,
  options: { minimumFractionDigits?: number; maximumFractionDigits?: number } = {}
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const hasDecimals = Math.abs(value % 1) > 0.0001;
  const minDecimals =
    options.minimumFractionDigits !== undefined
      ? options.minimumFractionDigits
      : hasDecimals
        ? 2
        : 0;
  const maxDecimals =
    options.maximumFractionDigits !== undefined ? options.maximumFractionDigits : 2;

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

/**
 * Formata metragem em metros quadrados no padrão brasileiro:
 * Ex.: 85 -> "85 m²", 85.5 -> "85,50 m²", 1250.75 -> "1.250,75 m²"
 */
export function formatAreaSqm(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) {
    return '—';
  }
  return `${formatBrazilianNumber(value)} m²`;
}

/**
 * Formata dimensão linear em metros (testada, fundos, laterais):
 * Ex.: 12 -> "12 m", 12.5 -> "12,50 m"
 */
export function formatLinearMeters(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) {
    return '—';
  }
  return `${formatBrazilianNumber(value)} m`;
}

/**
 * Formata valor monetário em Reais (BRL):
 * Ex.: 850000 -> "R$ 850.000,00"
 */
export function formatCurrencyBRL(
  value: number | null | undefined,
  options: { compact?: boolean } = {}
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'Sob consulta';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: options.compact && Math.abs(value % 1) < 0.001 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formata o preço por m² indicando explicitamente a metragem de referência considerada.
 * Ex.: "R$ 7.000,00/m² (base: 85 m² de Área privativa)"
 */
export function formatPricePerSqmDetailed(params: {
  pricePerSqm: number | null | undefined;
  referenceArea: number | null | undefined;
  referenceAreaLabel: string | null | undefined;
}): string {
  const { pricePerSqm, referenceArea, referenceAreaLabel } = params;
  if (
    pricePerSqm === null ||
    pricePerSqm === undefined ||
    !Number.isFinite(pricePerSqm) ||
    pricePerSqm <= 0 ||
    referenceArea === null ||
    referenceArea === undefined ||
    referenceArea <= 0 ||
    !referenceAreaLabel
  ) {
    return 'Indisponível (metragem de referência não informada)';
  }

  return `${formatCurrencyBRL(pricePerSqm)}/m² (base: ${formatAreaSqm(referenceArea)} de ${referenceAreaLabel})`;
}

/**
 * Metragem principal exibida na visão resumida (Ajustes da Etapa 6B.3.1).
 * Delega ao módulo central `commercial-unit-rules.ts`:
 * - Apartamentos, coberturas, studios e salas: Área privativa (na ausência, Área total, identificada como tal);
 * - Casas: Área construída (na ausência, Área do terreno, identificada como tal);
 * - Lotes: Área do terreno.
 * A Área útil não é metragem principal e nunca é usada como rótulo de outra área.
 */
export function resolvePrimaryAreaForSummary(unit: {
  unitType?: CommercialUnitType | string | null;
  usableArea?: number | null;
  privateArea?: number | null;
  builtArea?: number | null;
  landArea?: number | null;
  totalArea?: number | null;
}): {
  value: number | null;
  formatted: string;
  label: string;
  shortLabel: string;
} {
  const primary = resolvePrimaryArea(unit);
  return {
    value: primary.value,
    formatted: formatAreaSqm(primary.value),
    label: primary.label,
    shortLabel: primary.shortLabel,
  };
}
