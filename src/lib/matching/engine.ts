import { MATCH_CONFIG } from './config';
import { NormalizedOffer, SearchCriteria, MatchResult, MatchExplanationItem } from './types';

function formatMoney(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  const formatted = km % 1 === 0 ? km.toFixed(0) : km.toFixed(1).replace('.', ',');
  return `${formatted} km`;
}

/**
 * Motor determinístico de matching — Versão 2 (Fase 5.0.1)
 * 
 * Avalia compatibilidade entre Busca (Demanda) e Oferta (Imóvel ou Tipologia)
 * com suporte adaptativo por tipo, normalização por critérios informados,
 * tratamento rigoroso de null vs false e preferências tri-state.
 */
export function calculateMatch(
  search: SearchCriteria,
  offer: NormalizedOffer
): MatchResult {
  const explanation: MatchExplanationItem[] = [];
  const reasons: string[] = [];

  // ==========================================
  // 1. HARD FILTERS (Critérios de Elegibilidade)
  // ==========================================

  // 1.1 Status ativo da busca
  if (!search.active) {
    return {
      eligible: false,
      score: 0,
      reasons: ['A busca do cliente está inativa.'],
      explanation: [
        {
          category: 'other',
          status: 'negative',
          title: 'Busca Inativa',
          detail: 'Esta busca foi desativada pelo corretor.',
          pointsAwarded: 0,
          maxPoints: 0,
        },
      ],
    };
  }

  // 1.2 Status disponível da oferta
  if (!offer.active) {
    return {
      eligible: false,
      score: 0,
      reasons: ['A oferta não está com status Disponível/Ativo.'],
      explanation: [
        {
          category: 'other',
          status: 'negative',
          title: 'Oferta Indisponível',
          detail: 'O imóvel ou tipologia não está atualmente ativo e disponível para comercialização.',
          pointsAwarded: 0,
          maxPoints: 0,
        },
      ],
    };
  }

  // 1.3 Finalidade (Venda vs Locação)
  const normSearchPurpose = (search.purpose || 'Venda').trim().toLowerCase();
  const normOfferPurpose = (offer.purpose || 'Venda').trim().toLowerCase();
  if (normSearchPurpose !== normOfferPurpose) {
    reasons.push(
      `Finalidade incompatível: cliente busca ${search.purpose}, mas a oferta é para ${offer.purpose}.`
    );
  }

  // 1.4 Tipo do Imóvel
  const offerTypeLower = (offer.propertyType || '').trim().toLowerCase();
  if (search.propertyTypes && search.propertyTypes.length > 0) {
    const typeMatches = search.propertyTypes.some((t) => {
      const tLower = t.trim().toLowerCase();
      if (tLower === offerTypeLower) return true;
      if (tLower === 'em construção' || tLower === 'em construcao' || tLower === 'na planta') {
        if (offer.offerType === 'TYPOLOGY' || (offer.stage && offer.stage.toLowerCase().includes('constru'))) {
          return true;
        }
      }
      if (tLower === 'comercial' && (offerTypeLower.includes('comerc') || offerTypeLower.includes('sala'))) return true;
      if (tLower === 'apartamento' && offerTypeLower.includes('apart')) return true;
      if (tLower === 'casa' && offerTypeLower.includes('casa')) return true;
      if (tLower === 'terreno' && (offerTypeLower.includes('terren') || offerTypeLower.includes('lote'))) return true;
      return false;
    });

    if (!typeMatches) {
      reasons.push(
        `Tipo de imóvel incompatível: cliente busca [${search.propertyTypes.join(', ')}], oferta é ${offer.propertyType}.`
      );
    }
  }

  // 1.5 Raio Geográfico, Tempo de Deslocamento e Localização
  const isRadiusStrategy =
    search.locationStrategy === 'RADIUS' &&
    search.searchLatitude != null &&
    search.searchLongitude != null &&
    search.searchRadiusMeters != null &&
    search.searchRadiusMeters > 0;

  const isTravelTimeStrategy =
    search.locationStrategy === 'TRAVEL_TIME' &&
    search.searchLatitude != null &&
    search.searchLongitude != null &&
    search.maxTravelTimeMinutes != null &&
    search.maxTravelTimeMinutes > 0;

  let radiusDistMeters: number | null = null;

  if (isRadiusStrategy) {
    if (offer.latitude == null || offer.longitude == null) {
      reasons.push(
        'Oferta sem coordenadas geográficas: não é possível garantir elegibilidade dentro do raio desejado.'
      );
    } else {
      const distKm = haversineDistanceKm(
        search.searchLatitude!,
        search.searchLongitude!,
        offer.latitude,
        offer.longitude
      );
      radiusDistMeters = Math.round(distKm * 1000);
      if (radiusDistMeters > search.searchRadiusMeters!) {
        reasons.push(
          `Fora do raio desejado: o imóvel está a ${formatDistance(radiusDistMeters)} do ponto de referência, excedendo o raio estipulado de ${formatDistance(search.searchRadiusMeters!)}.`
        );
      }
    }
  } else if (isTravelTimeStrategy) {
    if (offer.latitude == null || offer.longitude == null) {
      reasons.push(
        'Oferta sem coordenadas geográficas: não é possível calcular o tempo de deslocamento até o ponto de referência.'
      );
    } else if (offer.travelDurationSeconds == null) {
      reasons.push(
        'Tempo de deslocamento indisponível ou não pôde ser calculado pela rede viária.'
      );
    } else if (offer.travelDurationSeconds > search.maxTravelTimeMinutes! * 60) {
      const durationMin = Math.round(offer.travelDurationSeconds / 60);
      reasons.push(
        `Tempo de deslocamento excedido: tempo estimado de carro é de ${durationMin} min, superando o limite de ${search.maxTravelTimeMinutes} min.`
      );
    }
  } else if (search.cities && search.cities.length > 0) {
    // Cidade (aplicado como Hard Filter quando não utiliza estratégia por raio ou tempo)
    const offerCityLower = (offer.city || '').trim().toLowerCase();
    const cityMatches = search.cities.some(
      (c) => c.trim().toLowerCase() === offerCityLower
    );
    if (!cityMatches) {
      reasons.push(
        `Cidade incompatível: oferta em ${offer.city || 'cidade não informada'}, cliente busca em [${search.cities.join(
          ', '
        )}].`
      );
    }
  }

  // 1.6 Teto orçamentário rígido (Tolerância máxima de 10%)
  const maxPriceWithTolerance =
    search.maxPrice * (1 + MATCH_CONFIG.PRICE.HARD_FILTER_OVER_BUDGET_RATIO);
  if (offer.price > maxPriceWithTolerance) {
    reasons.push(
      `Preço (${formatMoney(offer.price)}) excede a tolerância máxima de 10% sobre o teto do cliente (${formatMoney(
        search.maxPrice
      )}).`
    );
  }

  // 1.7 Critérios marcados como NECESSÁRIO na Busca (Eliminatórios se explicitamente desatendidos)
  if (search.elevatorPref === 'NECESSARIO' && offer.hasElevator === false) {
    reasons.push('Elevador obrigatório não atendido: a busca exige elevador e o imóvel/condomínio não possui.');
  }
  if (search.poolPref === 'NECESSARIO' && offer.hasPool === false) {
    reasons.push('Piscina obrigatória não atendida: a busca exige piscina e o imóvel/condomínio não possui.');
  }
  if (search.gymPref === 'NECESSARIO' && offer.hasGym === false) {
    reasons.push('Academia obrigatória não atendida: a busca exige academia e o imóvel/condomínio não possui.');
  }
  if (search.barbecuePref === 'NECESSARIO' && offer.hasBarbecue === false) {
    reasons.push('Churrasqueira obrigatória não atendida: a busca exige churrasqueira e o imóvel não possui.');
  }
  if (search.cornerPref === 'NECESSARIO' && offer.isCorner === false) {
    reasons.push('Posição de esquina obrigatória não atendida: a busca exige terreno de esquina.');
  }
  if (search.gatedCommunityPref === 'NECESSARIO' && offer.inGatedCommunity === false) {
    reasons.push('Condomínio fechado obrigatório não atendido: a busca exige terreno em condomínio fechado.');
  }
  if (search.isRegisteredPref === 'NECESSARIO' && offer.isRegistered === false) {
    reasons.push('Averbação obrigatória não atendida: a busca exige casa averbada para financiamento.');
  }

  // Se algum Hard Filter falhar, o match é inelegível e retorna score 0
  if (reasons.length > 0) {
    return {
      eligible: false,
      score: 0,
      reasons,
      explanation: reasons.map((r) => {
        let category: any = 'other';
        let title = 'Critério Obrigatório Não Atendido';
        const rLow = r.toLowerCase();
        if (rLow.includes('elevador')) { category = 'structure'; title = '✕ Elevador Obrigatório Não Atendido'; }
        else if (rLow.includes('piscina')) { category = 'amenity'; title = '✕ Piscina Obrigatória Não Atendida'; }
        else if (rLow.includes('academia')) { category = 'amenity'; title = '✕ Academia Obrigatória Não Atendida'; }
        else if (rLow.includes('churrasqueira')) { category = 'amenity'; title = '✕ Churrasqueira Obrigatória Não Atendida'; }
        else if (rLow.includes('preço')) { category = 'price'; title = '✕ Orçamento Excedido'; }
        else if (rLow.includes('tipo')) { category = 'type'; title = '✕ Tipo Incompatível'; }
        else if (rLow.includes('finalidade')) { category = 'purpose'; title = '✕ Finalidade Incompatível'; }
        else if (rLow.includes('tempo de deslocamento') || rLow.includes('deslocamento')) { category = 'location'; title = '✕ Tempo de Deslocamento Excedido'; }
        else if (rLow.includes('raio') || rLow.includes('coordenadas') || rLow.includes('região')) { category = 'location'; title = '✕ Fora do Raio Desejado'; }
        else if (rLow.includes('cidade')) { category = 'location'; title = '✕ Cidade Incompatível'; }
        return {
          category,
          status: 'negative',
          title,
          detail: r,
          pointsAwarded: 0,
          maxPoints: 0,
        };
      }),
    };
  }

  // ==========================================
  // 2. SOFT CRITERIA (Critérios Flexíveis V2)
  // ==========================================
  let earnedPoints = 0;
  let maxPossiblePoints = 0;

  // Informação positiva de Tipo
  explanation.push({
    category: 'type',
    status: 'positive',
    title: offer.propertyType,
    detail: `Tipo compatível com o perfil desejado pelo cliente (${offer.stage || 'Pronto'}).`,
    pointsAwarded: 0,
    maxPoints: 0,
  });

  const isTerreno =
    offerTypeLower.includes('terren') ||
    offerTypeLower.includes('lote') ||
    search.propertyTypes.some((t) => t.toLowerCase().includes('terren') || t.toLowerCase().includes('lote'));

  const isComercial =
    offerTypeLower.includes('comerc') ||
    offerTypeLower.includes('sala') ||
    search.propertyTypes.some((t) => t.toLowerCase().includes('comerc'));

  // ------------------------------------------
  // 2.1 Localização / Bairro (25 Pontos Base)
  // ------------------------------------------
  const locMax: number = MATCH_CONFIG.WEIGHTS.LOCATION;
  maxPossiblePoints += locMax;
  let locEarned: number = locMax;

  if (isRadiusStrategy && radiusDistMeters !== null) {
    locEarned = locMax;
    explanation.push({
      category: 'location',
      status: 'positive',
      title: 'Localização dentro do raio desejado',
      detail: `✓ A ${formatDistance(radiusDistMeters)} do ponto desejado — dentro do raio de ${formatDistance(search.searchRadiusMeters!)}.`,
      pointsAwarded: locEarned,
      maxPoints: locMax,
    });
  } else if (isTravelTimeStrategy && offer.travelDurationSeconds != null) {
    locEarned = locMax;
    const durationMin = Math.round(offer.travelDurationSeconds / 60);
    const distKm =
      offer.travelDistanceMeters != null
        ? (offer.travelDistanceMeters / 1000).toFixed(1).replace('.', ',')
        : null;
    const distSnippet = distKm ? ` · ${distKm} km pela rede viária` : '';
    explanation.push({
      category: 'location',
      status: 'positive',
      title: `🚗 ${durationMin} min de carro`,
      detail: `✓ Tempo estimado de carro: ${durationMin} min — limite de ${search.maxTravelTimeMinutes} min${distSnippet}. Estimativa baseada na rede viária; não considera trânsito em tempo real.`,
      pointsAwarded: locEarned,
      maxPoints: locMax,
    });
  } else {
    const offerNeighLower = (offer.neighborhood || '').trim().toLowerCase();

    if (search.neighborhoods && search.neighborhoods.length > 0) {
      const neighMatch = search.neighborhoods.some(
        (n) => n.trim().toLowerCase() === offerNeighLower
      );

      if (neighMatch) {
        locEarned = locMax;
        explanation.push({
          category: 'location',
          status: 'positive',
          title: `Bairro desejado: ${offer.neighborhood}`,
          detail: `Imóvel situado exatamente em um dos bairros preferidos do cliente.`,
          pointsAwarded: locEarned,
          maxPoints: locMax,
        });
      } else {
        locEarned = MATCH_CONFIG.LOCATION.DIFFERENT_NEIGHBORHOOD_SAME_CITY_POINTS;
        explanation.push({
          category: 'location',
          status: 'warning',
          title: `Bairro alternativo: ${offer.neighborhood || 'Outro bairro'}`,
          detail: `Localizado na mesma cidade (${offer.city}), mas diferente das preferências diretas (${search.neighborhoods.join(', ')}).`,
          pointsAwarded: locEarned,
          maxPoints: locMax,
        });
      }
    } else {
      locEarned = locMax;
      explanation.push({
        category: 'location',
        status: 'positive',
        title: `Localização: ${offer.neighborhood ? `${offer.neighborhood}, ` : ''}${offer.city}`,
        detail: `Atende à abrangência municipal solicitada pelo cliente.`,
        pointsAwarded: locEarned,
        maxPoints: locMax,
      });
    }

    // Raio geográfico opcional (legado / fallback quando não em estratégia RADIUS)
    if (
      search.maxRadiusKm &&
      search.referenceLatitude &&
      search.referenceLongitude &&
      offer.latitude &&
      offer.longitude
    ) {
      const dist = haversineDistanceKm(
        search.referenceLatitude,
        search.referenceLongitude,
        offer.latitude,
        offer.longitude
      );

      if (dist <= search.maxRadiusKm) {
        explanation.push({
          category: 'location',
          status: 'positive',
          title: 'Dentro do raio geográfico',
          detail: `A ${dist.toFixed(1)} km do ponto de referência do cliente (limite: ${search.maxRadiusKm} km).`,
          pointsAwarded: 0,
          maxPoints: 0,
        });
      } else {
        locEarned = Math.max(0, locEarned - MATCH_CONFIG.LOCATION.OUT_OF_RADIUS_PENALTY);
        explanation.push({
          category: 'location',
          status: 'warning',
          title: 'Fora do raio de preferência',
          detail: `A ${dist.toFixed(1)} km do ponto de referência (excede o raio de ${search.maxRadiusKm} km).`,
          pointsAwarded: 0,
          maxPoints: 0,
        });
      }
    }
  }
  earnedPoints += locEarned;

  // ------------------------------------------
  // 2.2 Preço e Orçamento (25 Pontos Base)
  // ------------------------------------------
  const priceMax: number = MATCH_CONFIG.WEIGHTS.PRICE;
  maxPossiblePoints += priceMax;
  let priceEarned: number = priceMax;

  if (offer.price <= search.maxPrice) {
    if (search.minPrice && offer.price < search.minPrice * 0.85) {
      priceEarned = 20;
      explanation.push({
        category: 'price',
        status: 'warning',
        title: `Valor abaixo da faixa mínima (${formatMoney(offer.price)})`,
        detail: `Preço inferior ao padrão inicial de ${formatMoney(search.minPrice)} definido pelo cliente.`,
        pointsAwarded: priceEarned,
        maxPoints: priceMax,
      });
    } else {
      priceEarned = priceMax;
      explanation.push({
        category: 'price',
        status: 'positive',
        title: `Dentro do orçamento (${formatMoney(offer.price)})`,
        detail: `Valor confortável dentro do teto de ${formatMoney(search.maxPrice)}.`,
        pointsAwarded: priceEarned,
        maxPoints: priceMax,
      });
    }
  } else if (offer.price <= search.maxPrice * (1 + MATCH_CONFIG.PRICE.SMALL_OVER_BUDGET_RATIO)) {
    priceEarned = MATCH_CONFIG.PRICE.SMALL_OVER_POINTS;
    const diff = offer.price - search.maxPrice;
    const diffPct = Math.round((diff / search.maxPrice) * 100);
    explanation.push({
      category: 'price',
      status: 'warning',
      title: `${formatMoney(diff)} (${diffPct}%) ligeiramente acima do orçamento`,
      detail: `Preço de ${formatMoney(offer.price)} está próximo do teto (${formatMoney(search.maxPrice)}), passível de contraproposta.`,
      pointsAwarded: priceEarned,
      maxPoints: priceMax,
    });
  } else {
    priceEarned = MATCH_CONFIG.PRICE.LARGE_OVER_POINTS;
    const diff = offer.price - search.maxPrice;
    const diffPct = Math.round((diff / search.maxPrice) * 100);
    explanation.push({
      category: 'price',
      status: 'warning',
      title: `${formatMoney(diff)} (${diffPct}%) acima do orçamento`,
      detail: `Preço de ${formatMoney(offer.price)} requer negociação frente ao teto de ${formatMoney(search.maxPrice)}.`,
      pointsAwarded: priceEarned,
      maxPoints: priceMax,
    });
  }
  earnedPoints += priceEarned;

  // ------------------------------------------
  // 2.3 Dormitórios e Suítes (Para Casa, Apartamento, Em Construção)
  // Não aplicável a Terrenos ou Comerciais
  // ------------------------------------------
  if (!isTerreno && !isComercial) {
    // Dormitórios
    const bedMax: number = MATCH_CONFIG.WEIGHTS.BEDROOMS;
    maxPossiblePoints += bedMax;
    let bedEarned: number = bedMax;

    if (!search.minBedrooms || search.minBedrooms <= 0) {
      bedEarned = bedMax;
      explanation.push({
        category: 'bedrooms',
        status: 'positive',
        title: `${offer.bedrooms} dormitório(s)`,
        detail: `Dormitórios não especificados como restrição mínima.`,
        pointsAwarded: bedEarned,
        maxPoints: bedMax,
      });
    } else if (offer.bedrooms >= search.minBedrooms) {
      bedEarned = bedMax;
      explanation.push({
        category: 'bedrooms',
        status: 'positive',
        title: `${offer.bedrooms} dormitório(s)`,
        detail: `Atende plenamente ao mínimo solicitado de ${search.minBedrooms} dormitório(s).`,
        pointsAwarded: bedEarned,
        maxPoints: bedMax,
      });
    } else if (offer.bedrooms === search.minBedrooms - 1) {
      bedEarned = MATCH_CONFIG.ROOMS.BEDROOM_DEFICIT_1_POINTS;
      explanation.push({
        category: 'bedrooms',
        status: 'warning',
        title: `${offer.bedrooms} dormitório(s); cliente busca pelo menos ${search.minBedrooms}`,
        detail: `Déficit de 1 quarto em relação ao desejado pelo cliente.`,
        pointsAwarded: bedEarned,
        maxPoints: bedMax,
      });
    } else {
      bedEarned = 0;
      explanation.push({
        category: 'bedrooms',
        status: 'negative',
        title: `${offer.bedrooms} dormitório(s); abaixo do mínimo de ${search.minBedrooms}`,
        detail: `Déficit de ${search.minBedrooms - offer.bedrooms} quartos.`,
        pointsAwarded: bedEarned,
        maxPoints: bedMax,
      });
    }
    earnedPoints += bedEarned;

    // Suítes
    const suiteMax: number = MATCH_CONFIG.WEIGHTS.SUITES;
    maxPossiblePoints += suiteMax;
    let suiteEarned: number = suiteMax;

    if (!search.minSuites || search.minSuites <= 0) {
      suiteEarned = suiteMax;
      if (offer.suites > 0) {
        explanation.push({
          category: 'suites',
          status: 'positive',
          title: `${offer.suites} suíte(s)`,
          detail: `Diferencial positivo para a proposta.`,
          pointsAwarded: suiteEarned,
          maxPoints: suiteMax,
        });
      }
    } else if (offer.suites >= search.minSuites) {
      suiteEarned = suiteMax;
      explanation.push({
        category: 'suites',
        status: 'positive',
        title: `${offer.suites} suíte(s)`,
        detail: `Atende ao mínimo de ${search.minSuites} suíte(s) solicitada(s).`,
        pointsAwarded: suiteEarned,
        maxPoints: suiteMax,
      });
    } else if (offer.suites === search.minSuites - 1) {
      suiteEarned = MATCH_CONFIG.ROOMS.SUITE_DEFICIT_1_POINTS;
      explanation.push({
        category: 'suites',
        status: 'warning',
        title: `${offer.suites} suíte(s); cliente busca pelo menos ${search.minSuites}`,
        detail: `Déficit de 1 suíte em relação ao desejado.`,
        pointsAwarded: suiteEarned,
        maxPoints: suiteMax,
      });
    } else {
      suiteEarned = 0;
      explanation.push({
        category: 'suites',
        status: 'negative',
        title: `Nenhuma suíte; cliente busca pelo menos ${search.minSuites}`,
        detail: `Não possui as suítes solicitadas.`,
        pointsAwarded: suiteEarned,
        maxPoints: suiteMax,
      });
    }
    earnedPoints += suiteEarned;
  }

  // ------------------------------------------
  // 2.4 Vagas de Garagem (Não aplicável a Terrenos sem especificação)
  // ------------------------------------------
  if (!isTerreno || search.minParkingSpaces > 0) {
    const parkMax: number = MATCH_CONFIG.WEIGHTS.PARKING;
    maxPossiblePoints += parkMax;
    let parkEarned: number = parkMax;

    if (!search.minParkingSpaces || search.minParkingSpaces <= 0) {
      parkEarned = parkMax;
      if (offer.parkingSpaces > 0) {
        explanation.push({
          category: 'parking',
          status: 'positive',
          title: `${offer.parkingSpaces} vaga(s) de garagem`,
          detail: `Disponibilidade de vagas sem restrição mínima prévia.`,
          pointsAwarded: parkEarned,
          maxPoints: parkMax,
        });
      }
    } else if (offer.parkingSpaces >= search.minParkingSpaces) {
      parkEarned = parkMax;
      explanation.push({
        category: 'parking',
        status: 'positive',
        title: `${offer.parkingSpaces} vaga(s) de garagem`,
        detail: `Atende ao mínimo de ${search.minParkingSpaces} vaga(s) solicitada(s).`,
        pointsAwarded: parkEarned,
        maxPoints: parkMax,
      });
    } else if (offer.parkingSpaces === search.minParkingSpaces - 1) {
      parkEarned = MATCH_CONFIG.ROOMS.PARKING_DEFICIT_1_POINTS;
      explanation.push({
        category: 'parking',
        status: 'warning',
        title: `${offer.parkingSpaces} vaga(s); cliente busca pelo menos ${search.minParkingSpaces}`,
        detail: `Déficit de 1 vaga de garagem.`,
        pointsAwarded: parkEarned,
        maxPoints: parkMax,
      });
    } else {
      parkEarned = 0;
      explanation.push({
        category: 'parking',
        status: 'negative',
        title: `Sem vagas; cliente busca pelo menos ${search.minParkingSpaces}`,
        detail: `Não atende ao requisito de estacionamento.`,
        pointsAwarded: parkEarned,
        maxPoints: parkMax,
      });
    }
    earnedPoints += parkEarned;
  }

  // ------------------------------------------
  // 2.5 Área (Área Útil para Imóveis; Área do Terreno para Terrenos)
  // ------------------------------------------
  const areaMax: number = MATCH_CONFIG.WEIGHTS.AREA;
  maxPossiblePoints += areaMax;
  let areaEarned: number = areaMax;

  if (isTerreno) {
    const effectiveLandArea = offer.landArea || offer.privateArea || offer.totalArea;
    const requiredArea = search.minLandArea || search.minArea;

    if (!requiredArea || requiredArea <= 0) {
      areaEarned = areaMax;
      if (effectiveLandArea) {
        explanation.push({
          category: 'area',
          status: 'positive',
          title: `${effectiveLandArea} m² de terreno`,
          detail: `Metragem do lote informada no cadastro.`,
          pointsAwarded: areaEarned,
          maxPoints: areaMax,
        });
      }
    } else if (!effectiveLandArea) {
      areaEarned = MATCH_CONFIG.AREA.UNSPECIFIED_AREA_POINTS;
      explanation.push({
        category: 'area',
        status: 'warning',
        title: `Área do terreno não informada`,
        detail: `Cliente busca no mínimo ${requiredArea} m². Necessário confirmar metragem documental.`,
        pointsAwarded: areaEarned,
        maxPoints: areaMax,
      });
    } else if (effectiveLandArea >= requiredArea) {
      areaEarned = MATCH_CONFIG.AREA.FULL_AREA_POINTS;
      explanation.push({
        category: 'area',
        status: 'positive',
        title: `${effectiveLandArea} m² de terreno`,
        detail: `Atende ao mínimo solicitado pelo cliente (${requiredArea} m²).`,
        pointsAwarded: areaEarned,
        maxPoints: areaMax,
      });
    } else if (effectiveLandArea >= requiredArea * 0.90) {
      areaEarned = MATCH_CONFIG.AREA.NEAR_AREA_POINTS;
      explanation.push({
        category: 'area',
        status: 'warning',
        title: `${effectiveLandArea} m² de terreno (próximo do mínimo)`,
        detail: `Levemente abaixo dos ${requiredArea} m² solicitados.`,
        pointsAwarded: areaEarned,
        maxPoints: areaMax,
      });
    } else {
      areaEarned = 0;
      explanation.push({
        category: 'area',
        status: 'negative',
        title: `${effectiveLandArea} m² de terreno (abaixo do mínimo)`,
        detail: `Área do terreno abaixo dos ${requiredArea} m² solicitados.`,
        pointsAwarded: areaEarned,
        maxPoints: areaMax,
      });
    }
  } else {
    // Casa / Apartamento / Comercial
    if (!search.minArea || search.minArea <= 0) {
      areaEarned = areaMax;
      if (offer.privateArea) {
        explanation.push({
          category: 'area',
          status: 'positive',
          title: `${offer.privateArea} m² privativos`,
          detail: `Metragem confortável informada no cadastro.`,
          pointsAwarded: areaEarned,
          maxPoints: areaMax,
        });
      }
    } else if (!offer.privateArea) {
      areaEarned = MATCH_CONFIG.AREA.UNSPECIFIED_AREA_POINTS;
      explanation.push({
        category: 'area',
        status: 'warning',
        title: `Área privativa não especificada na oferta`,
        detail: `Cliente busca no mínimo ${search.minArea} m². Necessário confirmar metragem exata.`,
        pointsAwarded: areaEarned,
        maxPoints: areaMax,
      });
    } else if (offer.privateArea >= search.minArea) {
      areaEarned = MATCH_CONFIG.AREA.FULL_AREA_POINTS;
      explanation.push({
        category: 'area',
        status: 'positive',
        title: `${offer.privateArea} m² privativos`,
        detail: `Atende ao mínimo solicitado pelo cliente (${search.minArea} m²).`,
        pointsAwarded: areaEarned,
        maxPoints: areaMax,
      });
    } else if (offer.privateArea >= search.minArea * 0.90) {
      areaEarned = MATCH_CONFIG.AREA.NEAR_AREA_POINTS;
      explanation.push({
        category: 'area',
        status: 'warning',
        title: `${offer.privateArea} m² privativos (próximo do mínimo)`,
        detail: `Levemente abaixo dos ${search.minArea} m² solicitados, com boa distribuição.`,
        pointsAwarded: areaEarned,
        maxPoints: areaMax,
      });
    } else {
      areaEarned = 0;
      explanation.push({
        category: 'area',
        status: 'negative',
        title: `${offer.privateArea} m² privativos (abaixo do mínimo)`,
        detail: `Área abaixo do mínimo de ${search.minArea} m² solicitado pelo cliente.`,
        pointsAwarded: areaEarned,
        maxPoints: areaMax,
      });
    }
  }
  earnedPoints += areaEarned;

  // ------------------------------------------
  // 2.6 Outras Compatibilidades / Cadastro (5 Pontos Base)
  // ------------------------------------------
  const otherMax = MATCH_CONFIG.WEIGHTS.OTHER;
  maxPossiblePoints += otherMax;
  earnedPoints += otherMax;
  explanation.push({
    category: 'other',
    status: 'positive',
    title: 'Cadastro estruturado',
    detail: offer.offerType === 'TYPOLOGY'
      ? `Empreendimento ${offer.developmentName} (${offer.developer || 'Construtora parceira'}).`
      : 'Imóvel com dados cadastrais verificados na carteira.',
    pointsAwarded: otherMax,
    maxPoints: otherMax,
  });

  // ------------------------------------------
  // 2.7 PREFERÊNCIAS AVANÇADAS (Categoria C)
  // Somente incluídas no denominador e na pontuação SE informadas na Busca
  // Normalização estrita por critérios informados (Requisito 12)
  // ------------------------------------------

  // Helper para preferências booleanas
  const evalBooleanPref = (
    pref: string | null | undefined,
    offerVal: boolean | null | undefined,
    weight: number,
    label: string,
    category: MatchExplanationItem['category'] = 'amenity'
  ) => {
    if (!pref || pref === 'INDIFERENTE') return;

    maxPossiblePoints += weight;
    if (offerVal === true) {
      earnedPoints += weight;
      explanation.push({
        category,
        status: 'positive',
        title: `✓ Possui ${label}`,
        detail: `Atende à preferência de ${label} indicada na busca.`,
        pointsAwarded: weight,
        maxPoints: weight,
      });
    } else if (offerVal === null || offerVal === undefined) {
      // Valor desconhecido / não informado: não penaliza indevidamente como false (Requisito 16)
      const neutralPoints = Math.round(weight * 0.5);
      earnedPoints += neutralPoints;
      explanation.push({
        category,
        status: 'warning',
        title: `△ ${label} a confirmar`,
        detail: `Informação de ${label} não especificada no cadastro da oferta.`,
        pointsAwarded: neutralPoints,
        maxPoints: weight,
      });
    } else {
      // Explicitamente false
      explanation.push({
        category,
        status: 'warning',
        title: `△ Não possui ${label}`,
        detail: `Oferta não dispõe de ${label} desejada pelo cliente.`,
        pointsAwarded: 0,
        maxPoints: weight,
      });
    }
  };

  // Piscina
  evalBooleanPref(search.poolPref, offer.hasPool, MATCH_CONFIG.PREFERENCE_WEIGHTS.POOL, 'piscina');

  // Academia
  evalBooleanPref(search.gymPref, offer.hasGym, MATCH_CONFIG.PREFERENCE_WEIGHTS.GYM, 'academia');

  // Churrasqueira
  evalBooleanPref(search.barbecuePref, offer.hasBarbecue, MATCH_CONFIG.PREFERENCE_WEIGHTS.BARBECUE, 'churrasqueira');

  // Elevador
  evalBooleanPref(search.elevatorPref, offer.hasElevator, MATCH_CONFIG.PREFERENCE_WEIGHTS.ELEVATOR, 'elevador', 'structure');

  // Salão de festas
  evalBooleanPref(search.partyHallPref, offer.hasPartyHall, MATCH_CONFIG.PREFERENCE_WEIGHTS.PARTY_HALL, 'salão de festas');

  // Espaço Pet
  evalBooleanPref(search.petSpacePref, offer.hasPetSpace, MATCH_CONFIG.PREFERENCE_WEIGHTS.PET_SPACE, 'espaço pet');

  // Cobertura
  evalBooleanPref(search.penthousePref, offer.isPenthouse, MATCH_CONFIG.PREFERENCE_WEIGHTS.PENTHOUSE, 'cobertura', 'structure');

  // Averbada (Casa)
  evalBooleanPref(search.isRegisteredPref, offer.isRegistered, MATCH_CONFIG.PREFERENCE_WEIGHTS.REGISTERED, 'averbação (financiável)', 'structure');

  // Permuta
  if (search.acceptsExchangePref && search.acceptsExchangePref !== 'INDIFERENTE') {
    const exchWeight = MATCH_CONFIG.PREFERENCE_WEIGHTS.EXCHANGE;
    maxPossiblePoints += exchWeight;
    if (offer.acceptsExchange === true) {
      earnedPoints += exchWeight;
      explanation.push({
        category: 'negotiation',
        status: 'positive',
        title: '✓ Aceita permuta',
        detail: offer.exchangeNotes ? `Condição: ${offer.exchangeNotes}` : 'Proprietário aberto a negociação por permuta.',
        pointsAwarded: exchWeight,
        maxPoints: exchWeight,
      });
    } else if (offer.acceptsExchange === null) {
      const neutral = Math.round(exchWeight * 0.5);
      earnedPoints += neutral;
      explanation.push({
        category: 'negotiation',
        status: 'warning',
        title: '△ Permuta sob consulta',
        detail: 'Disponibilidade de permuta não informada no cadastro.',
        pointsAwarded: neutral,
        maxPoints: exchWeight,
      });
    } else {
      explanation.push({
        category: 'negotiation',
        status: 'warning',
        title: '△ Não aceita permuta',
        detail: 'Oferta não aceita permuta como parte de pagamento.',
        pointsAwarded: 0,
        maxPoints: exchWeight,
      });
    }
  }

  // Mobília
  if (search.furniturePref && search.furniturePref !== 'INDIFERENTE') {
    const furnWeight = MATCH_CONFIG.PREFERENCE_WEIGHTS.FURNITURE;
    maxPossiblePoints += furnWeight;
    const prefUpper = search.furniturePref.toUpperCase();
    const offerUpper = (offer.furniture || '').toUpperCase();

    if (offerUpper === prefUpper || (prefUpper === 'SEMI' && offerUpper === 'COMPLETA')) {
      earnedPoints += furnWeight;
      explanation.push({
        category: 'amenity',
        status: 'positive',
        title: `✓ Mobília: ${offer.furniture}`,
        detail: `Atende ao padrão de mobília solicitado (${offer.furniture}).`,
        pointsAwarded: furnWeight,
        maxPoints: furnWeight,
      });
    } else if (!offer.furniture) {
      const neutral = Math.round(furnWeight * 0.5);
      earnedPoints += neutral;
      explanation.push({
        category: 'amenity',
        status: 'warning',
        title: '△ Mobília a verificar',
        detail: 'Situação de mobília não informada no cadastro da oferta.',
        pointsAwarded: neutral,
        maxPoints: furnWeight,
      });
    } else {
      explanation.push({
        category: 'amenity',
        status: 'warning',
        title: `△ Mobília: ${offer.furniture}`,
        detail: `Padrão de mobília diferente do preferido (${search.furniturePref}).`,
        pointsAwarded: 0,
        maxPoints: furnWeight,
      });
    }
  }

  // Terreno: Esquina
  evalBooleanPref(search.cornerPref, offer.isCorner, MATCH_CONFIG.PREFERENCE_WEIGHTS.CORNER, 'terreno de esquina', 'structure');

  // Terreno: Condomínio Fechado
  evalBooleanPref(search.gatedCommunityPref, offer.inGatedCommunity, MATCH_CONFIG.PREFERENCE_WEIGHTS.GATED_COMMUNITY, 'condomínio fechado', 'structure');

  // Terreno: Loteamento
  evalBooleanPref(search.allotmentPref, offer.inAllotment, MATCH_CONFIG.PREFERENCE_WEIGHTS.ALLOTMENT, 'loteamento planejado', 'structure');

  // Terreno: Pavimentação
  if (search.streetPavingPref && search.streetPavingPref !== 'INDIFERENTE') {
    const paveWeight = MATCH_CONFIG.PREFERENCE_WEIGHTS.STREET_PAVING;
    maxPossiblePoints += paveWeight;
    const pUpper = search.streetPavingPref.toUpperCase();
    const oUpper = (offer.streetPaving || '').toUpperCase();

    if (oUpper === pUpper) {
      earnedPoints += paveWeight;
      explanation.push({
        category: 'structure',
        status: 'positive',
        title: `✓ Rua pavimentada com ${offer.streetPaving}`,
        detail: `Pavimentação coincide com a preferência do cliente.`,
        pointsAwarded: paveWeight,
        maxPoints: paveWeight,
      });
    } else if (!offer.streetPaving) {
      const neutral = Math.round(paveWeight * 0.5);
      earnedPoints += neutral;
      explanation.push({
        category: 'structure',
        status: 'warning',
        title: '△ Pavimentação a confirmar',
        detail: 'Tipo de calçamento da rua não informado no cadastro.',
        pointsAwarded: neutral,
        maxPoints: paveWeight,
      });
    } else {
      explanation.push({
        category: 'structure',
        status: 'warning',
        title: `△ Rua em ${offer.streetPaving}`,
        detail: `Calçamento diferente do preferido pelo cliente (${search.streetPavingPref}).`,
        pointsAwarded: 0,
        maxPoints: paveWeight,
      });
    }
  }

  // Comercial: Tipo de Sala (Térrea vs Aérea)
  if (search.commercialTypePref && search.commercialTypePref !== 'INDIFERENTE') {
    const comWeight = MATCH_CONFIG.PREFERENCE_WEIGHTS.COMMERCIAL_TYPE;
    maxPossiblePoints += comWeight;
    const cUpper = search.commercialTypePref.toUpperCase();
    const oUpper = (offer.commercialType || '').toUpperCase();

    if (oUpper === cUpper) {
      earnedPoints += comWeight;
      explanation.push({
        category: 'structure',
        status: 'positive',
        title: `✓ Sala Comercial ${offer.commercialType}`,
        detail: `Localização da sala compatível com a preferência (${offer.commercialType}).`,
        pointsAwarded: comWeight,
        maxPoints: comWeight,
      });
    } else if (!offer.commercialType) {
      const neutral = Math.round(comWeight * 0.5);
      earnedPoints += neutral;
      explanation.push({
        category: 'structure',
        status: 'warning',
        title: '△ Posição da sala a confirmar',
        detail: 'Não informado se a sala é térrea ou aérea.',
        pointsAwarded: neutral,
        maxPoints: comWeight,
      });
    } else {
      explanation.push({
        category: 'structure',
        status: 'warning',
        title: `△ Sala ${offer.commercialType}`,
        detail: `Posição diferente da desejada pelo cliente (${search.commercialTypePref}).`,
        pointsAwarded: 0,
        maxPoints: comWeight,
      });
    }
  }

  // ==========================================
  // 3. SOMA TOTAL NORMALIZADA E SCORE DETERMINÍSTICO
  // ==========================================
  const finalScore = maxPossiblePoints > 0
    ? Math.min(100, Math.max(0, Math.round((earnedPoints / maxPossiblePoints) * 100)))
    : 0;

  return {
    eligible: true,
    score: finalScore,
    reasons: [],
    explanation,
  };
}

export const calculateMatchV2 = calculateMatch;

