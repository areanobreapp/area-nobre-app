/**
 * Utilitários visuais e de exibição de Empreendimentos (Bloco 6B.3.4).
 * Funções seguras tanto no lado do cliente (React) quanto no servidor (Node/Next).
 */

export interface DevelopmentImageItem {
  id?: string;
  url: string;
  isCover?: boolean | null;
  order?: number | null;
}

/**
 * Resolve a imagem de capa de um empreendimento segundo a prioridade oficial:
 * 1º Imagem explicitamente definida como capa (isCover: true)
 * 2º Primeira imagem válida por ordem (order: 0 ou menor índice)
 * 3º null (para permitir placeholder elegante no componente consumidor)
 */
export function getDevelopmentCoverImage(dev: any): DevelopmentImageItem | null {
  if (!dev) return null;
  const rawImages: any[] = Array.isArray(dev.images) ? dev.images : [];
  if (rawImages.length === 0) return null;

  // Normaliza lista aceitando tanto objetos quanto strings legadas
  const normalized: DevelopmentImageItem[] = rawImages
    .map((img: any, idx: number): DevelopmentImageItem => {
      if (typeof img === 'string') {
        return { url: img, isCover: idx === 0, order: idx };
      }
      return {
        id: img?.id,
        url: img?.url || '',
        isCover: Boolean(img?.isCover),
        order: typeof img?.order === 'number' ? img.order : idx,
      };
    })
    .filter((img) => img.url && typeof img.url === 'string' && img.url.trim().length > 0);

  if (normalized.length === 0) return null;

  // 1º Prioridade: Imagem com isCover === true
  const explicitCover = normalized.find((img) => img.isCover === true);
  if (explicitCover) return explicitCover;

  // 2º Prioridade: Menor ordem (order asc)
  const sorted = [...normalized].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return sorted[0] || null;
}

/**
 * Retorna a URL da imagem de capa resolvida ou o fallback opcional.
 */
export function getDevelopmentCoverUrl(
  dev: any,
  fallbackUrl: string | null = null
): string | null {
  const cover = getDevelopmentCoverImage(dev);
  return cover?.url || fallbackUrl;
}

export interface DevelopmentStartingPriceResult {
  minPrice: number | null;
  formatted: string;       // "A partir de R$ 245.000" ou "Sob consulta"
  formattedRaw: string;    // "R$ 245.000" ou "Sob consulta"
  hasPrice: boolean;
  source: 'commercial_unit' | 'typology' | 'precalculated' | 'none';
}

/**
 * Formata um valor numérico em moeda Real brasileira (BRL) sem casas decimais supérfluas.
 */
export function formatBRLCurrency(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(val);
}

/**
 * Resolve o preço inicial ("A partir de") oficial de um empreendimento (Bloco 6B.3.4 - Ajustes Complementares):
 * 1º Prioridade: Menor preço efetivo entre as unidades comerciais com commercialStatus === 'DISPONIVEL' e preço > 0
 *    (considerando promotionalPrice > 0 ou listPrice > 0, priorizando o menor valor válido da unidade).
 * 2º Prioridade: Campo startingPrice ou minPrice pré-calculado no registro do empreendimento.
 * 3º Prioridade: Menor preço entre as tipologias ativas com status !== 'Esgotada' e price > 0.
 * 4º Fallback: Se não houver nenhum preço válido disponível, retorna null ("Sob consulta").
 */
export function resolveDevelopmentStartingPrice(dev: any): DevelopmentStartingPriceResult {
  if (!dev) {
    return {
      minPrice: null,
      formatted: 'Sob consulta',
      formattedRaw: 'Sob consulta',
      hasPrice: false,
      source: 'none',
    };
  }

  // 1º Prioridade: Unidades comerciais pertencentes ao empreendimento com status DISPONIVEL e preço > 0
  const rawUnits: any[] = Array.isArray(dev.commercialUnits)
    ? dev.commercialUnits
    : Array.isArray(dev.units)
    ? dev.units
    : [];

  const validUnitPrices: number[] = [];
  for (const unit of rawUnits) {
    if (!unit) continue;
    const status = String(unit.commercialStatus || '').toUpperCase();
    if (status !== 'DISPONIVEL') continue;

    const promo =
      unit.promotionalPrice !== null && unit.promotionalPrice !== undefined
        ? Number(unit.promotionalPrice)
        : NaN;
    const list =
      unit.listPrice !== null && unit.listPrice !== undefined
        ? Number(unit.listPrice)
        : NaN;

    const candidates: number[] = [];
    if (Number.isFinite(promo) && promo > 0) candidates.push(promo);
    if (Number.isFinite(list) && list > 0) candidates.push(list);

    if (candidates.length > 0) {
      validUnitPrices.push(Math.min(...candidates));
    }
  }

  if (validUnitPrices.length > 0) {
    const minPrice = Math.min(...validUnitPrices);
    return {
      minPrice,
      formatted: `A partir de ${formatBRLCurrency(minPrice)}`,
      formattedRaw: formatBRLCurrency(minPrice),
      hasPrice: true,
      source: 'commercial_unit',
    };
  }

  // 2º Prioridade: startingPrice / minPrice pré-calculado no empreendimento
  const precalc =
    dev.startingPrice !== null && dev.startingPrice !== undefined
      ? Number(dev.startingPrice)
      : dev.minPrice !== null && dev.minPrice !== undefined
      ? Number(dev.minPrice)
      : NaN;

  if (Number.isFinite(precalc) && precalc > 0) {
    return {
      minPrice: precalc,
      formatted: `A partir de ${formatBRLCurrency(precalc)}`,
      formattedRaw: formatBRLCurrency(precalc),
      hasPrice: true,
      source: 'precalculated',
    };
  }

  // 3º Prioridade: Tipologias ativas com status !== 'Esgotada' e price > 0
  const typologies: any[] = Array.isArray(dev.typologies) ? dev.typologies : [];
  const validTypologyPrices = typologies
    .filter((t) => t && t.status !== 'Esgotada')
    .map((t) => Number(t.price))
    .filter((p) => Number.isFinite(p) && p > 0);

  if (validTypologyPrices.length > 0) {
    const minPrice = Math.min(...validTypologyPrices);
    return {
      minPrice,
      formatted: `A partir de ${formatBRLCurrency(minPrice)}`,
      formattedRaw: formatBRLCurrency(minPrice),
      hasPrice: true,
      source: 'typology',
    };
  }

  // 4º Fallback: Nenhum preço válido disponível
  return {
    minPrice: null,
    formatted: 'Sob consulta',
    formattedRaw: 'Sob consulta',
    hasPrice: false,
    source: 'none',
  };
}

/**
 * Retorna o texto formatado do preço inicial com ou sem prefixo ("A partir de R$ 245.000" ou "R$ 245.000").
 */
export function formatDevelopmentStartingPrice(dev: any, withPrefix: boolean = true): string {
  const res = resolveDevelopmentStartingPrice(dev);
  return withPrefix ? res.formatted : res.formattedRaw;
}

/**
 * Retorna o nome da construtora responsável pelo empreendimento (Fantasia -> Razão -> developer livre).
 */
export function getDevelopmentDeveloperName(dev: any): string {
  if (!dev) return '';
  return (
    dev.company?.tradeName?.trim() ||
    dev.company?.name?.trim() ||
    dev.developer?.trim() ||
    ''
  );
}

/**
 * Formata o subtítulo padrão de identidade do empreendimento para buscas e mapa:
 * Ex: "Empreendimento · Construtora Diag Click"
 */
export function formatDevelopmentSubtitle(dev: any): string {
  const devName = getDevelopmentDeveloperName(dev);
  if (!devName) return 'Empreendimento';
  return `Empreendimento · Construtora ${devName}`;
}

/**
 * Formata a localização resumida (Bairro, Cidade - UF).
 */
export function formatDevelopmentLocation(dev: any): string {
  if (!dev) return '';
  const parts: string[] = [];
  if (dev.neighborhood?.trim()) parts.push(dev.neighborhood.trim());
  const city = dev.city?.trim() || 'Criciúma';
  const state = dev.state?.trim() || 'SC';
  parts.push(`${city} - ${state}`);
  return parts.join(', ');
}
