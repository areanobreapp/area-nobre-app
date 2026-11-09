/**
 * Utilitário de exibição e formatação de características imobiliárias.
 * Implementa as regras aprovadas da Etapa 4A (Pontos 14, 17 e 28):
 * - Seleção inteligente da área principal por tipo de imóvel (sem falsas equivalências).
 * - Exibição segura de totais e detalhamentos (quartos, banheiros, vagas).
 * - Tratamento fiel de dados antigos/legados e campos nulos sem inferências indevidas.
 * - Ocultação de características não aplicáveis (ex.: terrenos).
 */

export interface PropertyFeaturesInput {
  propertyType?: string | null;
  bedrooms?: number | null;
  suites?: number | null;
  otherBedrooms?: number | null;
  bathrooms?: number | null;
  socialBathrooms?: number | null;
  lavabos?: number | null;
  otherBathrooms?: number | null;
  parkingSpaces?: number | null;
  coveredParkingSpaces?: number | null;
  uncoveredParkingSpaces?: number | null;
  privateArea?: number | null;
  builtArea?: number | null;
  totalArea?: number | null;
  landArea?: number | null;
  boundaryArea?: number | null;
}

export interface AreaDisplay {
  value: number;
  formatted: string;
  label: string;
  isHistoricalFallback?: boolean;
}

export interface IndividualFeatureCard {
  id: string;
  category: 'bedrooms' | 'bathrooms' | 'parking' | 'area';
  icon: 'bed' | 'bath' | 'car' | 'maximize' | 'sparkles' | 'info';
  title: string;
  value: string | number;
  sublabel?: string;
  badge?: { label: string; type: 'neutral' | 'info' | 'warning' | 'success' };
  isResidual?: boolean;
}

/**
 * Monta a lista de cartões individuais para a grade da página de detalhes (Etapa 4A Refinamento)
 */
export function resolveIndividualFeatureCards(
  p: PropertyFeaturesInput,
  options: {
    excludeTotalBathrooms?: boolean;
    isPublic?: boolean;
  } = { excludeTotalBathrooms: true }
): IndividualFeatureCard[] {
  const cards: IndividualFeatureCard[] = [];
  const isLandPlot = isLand(p.propertyType);

  // ==========================================
  // 1. ÁREAS (Sempre exibidas no topo ou junto com as características)
  // ==========================================
  const mainArea = resolveMainArea(p);
  if (mainArea) {
    cards.push({
      id: 'main-area',
      category: 'area',
      icon: 'maximize',
      title: mainArea.label,
      value: mainArea.formatted,
      sublabel: mainArea.isHistoricalFallback
        ? options.isPublic
          ? 'metragem informada'
          : 'metragem histórica'
        : undefined,
    });
  }

  const secondaryAreas = resolveSecondaryAreas(p, mainArea);
  for (const sec of secondaryAreas) {
    cards.push({
      id: `sec-area-${sec.label}`,
      category: 'area',
      icon: 'maximize',
      title: sec.label,
      value: sec.formatted,
      sublabel: sec.label.includes('Mapa') ? 'delimitação poligonal' : undefined,
    });
  }

  // Se for terreno, encerra aqui (terrenos não têm quartos, banheiros ou vagas)
  if (isLandPlot) {
    return cards;
  }

  // ==========================================
  // 2. QUARTOS E SUÍTES
  // ==========================================
  const bedInfo = resolveBedrooms(p);
  if (bedInfo !== null) {
    // Cartão: Quartos totais
    cards.push({
      id: 'bedrooms-total',
      category: 'bedrooms',
      icon: 'bed',
      title: 'Quartos totais',
      value: bedInfo.total,
      sublabel: bedInfo.suites > 0 ? `inclui ${bedInfo.suites} ${bedInfo.suites === 1 ? 'suíte' : 'suítes'}` : undefined,
    });

    // Cartão: Suítes (se houver)
    if (bedInfo.suites > 0) {
      cards.push({
        id: 'bedrooms-suites',
        category: 'bedrooms',
        icon: 'bed',
        title: bedInfo.suites === 1 ? 'Suíte' : 'Suítes',
        value: bedInfo.suites,
        sublabel: options.excludeTotalBathrooms ? 'cada uma com banheiro' : 'com banheiro privativo',
      });
    }

    // Cartão: Dormitórios sem suíte (apenas quando expressamente confirmado)
    if (bedInfo.hasCompleteClassification && bedInfo.otherBedrooms !== null && bedInfo.otherBedrooms > 0) {
      cards.push({
        id: 'bedrooms-other',
        category: 'bedrooms',
        icon: 'bed',
        title: bedInfo.otherBedrooms === 1 ? 'Dormitório sem suíte' : 'Dormitórios sem suíte',
        value: bedInfo.otherBedrooms,
        sublabel: 'demais quartos',
      });
    }
  }

  // ==========================================
  // 3. BANHEIROS E LAVABOS
  // ==========================================
  const bathInfo = resolveBathrooms(p);
  if (bathInfo !== null) {
    // Cartão: Banheiros totais (apenas quando NÃO omitido)
    if (!options.excludeTotalBathrooms) {
      cards.push({
        id: 'bathrooms-total',
        category: 'bathrooms',
        icon: 'bath',
        title: 'Banheiros totais',
        value: bathInfo.total,
        sublabel: bathInfo.suiteBathrooms > 0 ? `inclui ${bathInfo.suiteBathrooms} de suíte` : undefined,
      });
    }

    // Se houver classificação confirmada de banheiros sociais e lavabos
    if (bathInfo.hasCompleteClassification) {
      if (bathInfo.socialBathrooms !== null && bathInfo.socialBathrooms > 0) {
        cards.push({
          id: 'bathrooms-social',
          category: 'bathrooms',
          icon: 'bath',
          title: bathInfo.socialBathrooms === 1 ? 'Banheiro social' : 'Banheiros sociais',
          value: bathInfo.socialBathrooms,
          sublabel: 'Fora das suítes · com chuveiro',
        });
      }

      if (bathInfo.lavabos !== null && bathInfo.lavabos > 0) {
        cards.push({
          id: 'bathrooms-lavabos',
          category: 'bathrooms',
          icon: 'bath',
          title: bathInfo.lavabos === 1 ? 'Lavabo' : 'Lavabos',
          value: bathInfo.lavabos,
          sublabel: 'Fora das suítes · sem chuveiro',
        });
      }

      // Residual se houver diferença positiva entre total e a soma
      const accounted = bathInfo.suiteBathrooms + (bathInfo.socialBathrooms ?? 0) + (bathInfo.lavabos ?? 0);
      const residual = bathInfo.total - accounted;
      if (residual > 0) {
        if (options.isPublic) {
          cards.push({
            id: 'bathrooms-residual',
            category: 'bathrooms',
            icon: 'bath',
            title: residual === 1 ? 'Banheiro adicional' : 'Banheiros adicionais',
            value: residual,
            sublabel: 'tipo não informado',
          });
        } else {
          cards.push({
            id: 'bathrooms-residual',
            category: 'bathrooms',
            icon: 'bath',
            title: residual === 1 ? 'Banheiro não classificado' : 'Banheiros não classificados',
            value: residual,
            sublabel: 'Social ou lavabo a confirmar',
            badge: { label: 'A classificar', type: 'warning' },
            isResidual: true,
          });
        }
      }
    } else {
      // Dados antigos / sem classificação de social/lavabo:
      // Se bathrooms > suites, calculamos com segurança o residual não classificado
      const residual = bathInfo.total - bathInfo.suiteBathrooms;
      if (residual > 0) {
        if (options.isPublic) {
          if (bathInfo.suiteBathrooms > 0) {
            cards.push({
              id: 'bathrooms-unclassified',
              category: 'bathrooms',
              icon: 'bath',
              title: residual === 1 ? 'Banheiro adicional' : 'Banheiros adicionais',
              value: residual,
              sublabel: 'tipo não informado',
            });
          } else {
            cards.push({
              id: 'bathrooms-unclassified',
              category: 'bathrooms',
              icon: 'bath',
              title: residual === 1 ? 'Banheiro' : 'Banheiros',
              value: residual,
              sublabel: residual === 1 ? 'banheiro do imóvel' : 'total de banheiros',
            });
          }
        } else {
          cards.push({
            id: 'bathrooms-unclassified',
            category: 'bathrooms',
            icon: 'bath',
            title: residual === 1 ? 'Banheiro não classificado' : 'Banheiros não classificados',
            value: residual,
            sublabel: 'Social ou lavabo a confirmar',
            badge: { label: 'Não discriminado', type: 'warning' },
            isResidual: true,
          });
        }
      }
    }
  }

  // ==========================================
  // 4. VAGAS DE GARAGEM
  // ==========================================
  const parkInfo = resolveParking(p);
  if (parkInfo !== null) {
    const isCoverageUnknown = !parkInfo.hasCompleteClassification && parkInfo.total > 0;

    // Cartão: Vagas totais
    cards.push({
      id: 'parking-total',
      category: 'parking',
      icon: 'car',
      title: 'Vagas totais',
      value: parkInfo.total,
      sublabel: isCoverageUnknown ? 'cobertura não informada' : undefined,
    });

    if (parkInfo.hasCompleteClassification) {
      if (parkInfo.covered !== null && parkInfo.covered > 0) {
        cards.push({
          id: 'parking-covered',
          category: 'parking',
          icon: 'car',
          title: parkInfo.covered === 1 ? 'Vaga coberta' : 'Vagas cobertas',
          value: parkInfo.covered,
          sublabel: 'protegida',
        });
      }

      if (parkInfo.uncovered !== null && parkInfo.uncovered > 0) {
        cards.push({
          id: 'parking-uncovered',
          category: 'parking',
          icon: 'car',
          title: parkInfo.uncovered === 1 ? 'Vaga descoberta' : 'Vagas descobertas',
          value: parkInfo.uncovered,
          sublabel: 'ao ar livre',
        });
      }

      // Residual se houver
      const accountedPark = (parkInfo.covered ?? 0) + (parkInfo.uncovered ?? 0);
      const residualPark = parkInfo.total - accountedPark;
      if (residualPark > 0) {
        cards.push({
          id: 'parking-residual',
          category: 'parking',
          icon: 'car',
          title: residualPark === 1 ? 'Vaga sem cobertura classificada' : 'Vagas sem cobertura classificada',
          value: residualPark,
          sublabel: 'cobertura a confirmar',
          badge: { label: 'A classificar', type: 'warning' },
          isResidual: true,
        });
      }
    }
  }

  return cards;
}

export interface BedroomsDisplay {
  total: number;
  suites: number;
  otherBedrooms: number | null;
  hasCompleteClassification: boolean;
  summaryLabel: string;
}

export interface BathroomsDisplay {
  total: number;
  suiteBathrooms: number;
  socialBathrooms: number | null;
  lavabos: number | null;
  otherBathrooms: number | null;
  hasCompleteClassification: boolean;
  summaryLabel: string;
}

export interface ParkingDisplay {
  total: number;
  covered: number | null;
  uncovered: number | null;
  hasCompleteClassification: boolean;
  summaryLabel: string;
}

/**
 * Identifica se o tipo de imóvel é terreno / lote
 */
export function isLand(propertyType?: string | null): boolean {
  if (!propertyType) return false;
  const t = propertyType.toLowerCase().trim();
  return t === 'terreno' || t === 'lote' || t === 'área' || t === 'chácara' || t.includes('terreno');
}

/**
 * Identifica se o tipo de imóvel é comercial
 */
export function isCommercial(propertyType?: string | null): boolean {
  if (!propertyType) return false;
  const t = propertyType.toLowerCase().trim();
  return t.includes('comercial') || t === 'sala' || t === 'galpão' || t === 'loja' || t === 'prédio';
}

/**
 * Identifica se o tipo de imóvel é casa / sobrado
 */
export function isHouse(propertyType?: string | null): boolean {
  if (!propertyType) return false;
  const t = propertyType.toLowerCase().trim();
  return t.includes('casa') || t.includes('sobrado') || t.includes('geminad');
}

/**
 * Formata número de metragem para o padrão brasileiro
 */
export function formatAreaNumber(num: number): string {
  return Number.isInteger(num)
    ? num.toLocaleString('pt-BR')
    : num.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

/**
 * Seleciona a área principal conforme o tipo do imóvel (Seção 5)
 */
export function resolveMainArea(p: PropertyFeaturesInput): AreaDisplay | null {
  const { propertyType, privateArea, builtArea, totalArea, landArea } = p;

  if (isLand(propertyType)) {
    if (landArea && landArea > 0) {
      return { value: landArea, formatted: `${formatAreaNumber(landArea)} m²`, label: 'Área do Terreno' };
    }
    if (totalArea && totalArea > 0) {
      return { value: totalArea, formatted: `${formatAreaNumber(totalArea)} m²`, label: 'Área Total' };
    }
    return null;
  }

  if (isHouse(propertyType)) {
    if (builtArea && builtArea > 0) {
      return { value: builtArea, formatted: `${formatAreaNumber(builtArea)} m²`, label: 'Área Construída' };
    }
    // Compatibilidade histórica: se casa antiga tem privateArea preenchida, não chamar de "Área Construída"
    if (privateArea && privateArea > 0) {
      return {
        value: privateArea,
        formatted: `${formatAreaNumber(privateArea)} m²`,
        label: 'Área Privativa',
        isHistoricalFallback: true,
      };
    }
    if (totalArea && totalArea > 0) {
      return { value: totalArea, formatted: `${formatAreaNumber(totalArea)} m²`, label: 'Área Total' };
    }
    if (landArea && landArea > 0) {
      return { value: landArea, formatted: `${formatAreaNumber(landArea)} m²`, label: 'Área do Terreno' };
    }
    return null;
  }

  // Apartamentos, coberturas, lofts, studios e padrão geral
  if (privateArea && privateArea > 0) {
    return { value: privateArea, formatted: `${formatAreaNumber(privateArea)} m²`, label: 'Área Privativa' };
  }
  if (totalArea && totalArea > 0) {
    return { value: totalArea, formatted: `${formatAreaNumber(totalArea)} m²`, label: 'Área Total' };
  }
  if (builtArea && builtArea > 0) {
    return { value: builtArea, formatted: `${formatAreaNumber(builtArea)} m²`, label: 'Área Construída' };
  }
  if (landArea && landArea > 0) {
    return { value: landArea, formatted: `${formatAreaNumber(landArea)} m²`, label: 'Área do Terreno' };
  }

  return null;
}

/**
 * Retorna as áreas secundárias / complementares que não são a principal
 */
export function resolveSecondaryAreas(p: PropertyFeaturesInput, mainArea: AreaDisplay | null): AreaDisplay[] {
  const result: AreaDisplay[] = [];
  const { privateArea, builtArea, totalArea, landArea, boundaryArea, propertyType } = p;

  if (landArea && landArea > 0 && mainArea?.label !== 'Área do Terreno') {
    result.push({ value: landArea, formatted: `${formatAreaNumber(landArea)} m²`, label: 'Área do Terreno' });
  }

  if (builtArea && builtArea > 0 && mainArea?.label !== 'Área Construída') {
    result.push({ value: builtArea, formatted: `${formatAreaNumber(builtArea)} m²`, label: 'Área Construída' });
  }

  if (privateArea && privateArea > 0 && mainArea?.label !== 'Área Privativa') {
    result.push({ value: privateArea, formatted: `${formatAreaNumber(privateArea)} m²`, label: 'Área Privativa' });
  }

  if (totalArea && totalArea > 0 && mainArea?.label !== 'Área Total') {
    result.push({ value: totalArea, formatted: `${formatAreaNumber(totalArea)} m²`, label: 'Área Total' });
  }

  // H.11.4: boundaryArea (área estimada do polígono) não é exibida nos detalhes do imóvel salvo
  // para evitar divergência com a área cadastral informada pelo corretor. A geometria permanece salva.

  return result;
}

/**
 * Resolve quartos e suítes com fidelidade histórica (Seção 6)
 */
export function resolveBedrooms(p: PropertyFeaturesInput): BedroomsDisplay | null {
  if (isLand(p.propertyType)) return null;

  const total = p.bedrooms !== undefined && p.bedrooms !== null ? p.bedrooms : (p.suites ?? 0);
  const suites = p.suites ?? 0;

  // Se for comercial ou sem quartos cadastrados
  if (total === 0 && suites === 0 && isCommercial(p.propertyType)) {
    return null;
  }

  const hasCompleteClassification = p.otherBedrooms !== null && p.otherBedrooms !== undefined;
  const otherBedrooms = hasCompleteClassification ? p.otherBedrooms! : null;

  let summaryLabel = `${total} ${total === 1 ? 'quarto' : 'quartos'}`;
  if (suites > 0) {
    summaryLabel += ` (${suites} ${suites === 1 ? 'suíte' : 'suítes'})`;
  }

  return {
    total,
    suites,
    otherBedrooms,
    hasCompleteClassification,
    summaryLabel,
  };
}

/**
 * Resolve banheiros com fidelidade histórica (Seção 7)
 */
export function resolveBathrooms(p: PropertyFeaturesInput): BathroomsDisplay | null {
  if (isLand(p.propertyType)) return null;

  const total = p.bathrooms !== undefined && p.bathrooms !== null ? p.bathrooms : (p.suites ?? 0);
  const suiteBathrooms = p.suites ?? 0;

  if (total === 0 && suiteBathrooms === 0 && isCommercial(p.propertyType)) {
    return null;
  }

  const hasCompleteClassification =
    (p.socialBathrooms !== null && p.socialBathrooms !== undefined) ||
    (p.lavabos !== null && p.lavabos !== undefined);

  const socialBathrooms = p.socialBathrooms !== null && p.socialBathrooms !== undefined ? p.socialBathrooms : null;
  const lavabos = p.lavabos !== null && p.lavabos !== undefined ? p.lavabos : null;
  const otherBathrooms = p.otherBathrooms !== null && p.otherBathrooms !== undefined ? p.otherBathrooms : null;

  const summaryLabel = `${total} ${total === 1 ? 'banheiro' : 'banheiros'}`;

  return {
    total,
    suiteBathrooms,
    socialBathrooms,
    lavabos,
    otherBathrooms,
    hasCompleteClassification,
    summaryLabel,
  };
}

/**
 * Resolve vagas de garagem com fidelidade histórica (Seção 8)
 */
export function resolveParking(p: PropertyFeaturesInput): ParkingDisplay | null {
  if (isLand(p.propertyType)) return null;

  const total = p.parkingSpaces !== undefined && p.parkingSpaces !== null ? p.parkingSpaces : 0;

  if (total === 0 && isCommercial(p.propertyType)) {
    return null;
  }

  const hasCompleteClassification =
    (p.coveredParkingSpaces !== null && p.coveredParkingSpaces !== undefined) ||
    (p.uncoveredParkingSpaces !== null && p.uncoveredParkingSpaces !== undefined);

  const covered = p.coveredParkingSpaces !== null && p.coveredParkingSpaces !== undefined ? p.coveredParkingSpaces : null;
  const uncovered = p.uncoveredParkingSpaces !== null && p.uncoveredParkingSpaces !== undefined ? p.uncoveredParkingSpaces : null;

  const summaryLabel = `${total} ${total === 1 ? 'vaga' : 'vagas'}`;

  return {
    total,
    covered,
    uncovered,
    hasCompleteClassification,
    summaryLabel,
  };
}
