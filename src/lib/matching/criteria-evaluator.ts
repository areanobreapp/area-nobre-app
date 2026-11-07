import { NormalizedOffer, SearchCriteria } from './types';

export type CriterionStatus = 'CONFIRMED' | 'PENDING' | 'REJECTED';

export interface CriterionEvaluation {
  criterion: string;
  label: string;
  requiredMin: number;
  knownValue: number | null;
  status: CriterionStatus;
  explanation: string;
  pendingReason?: string | null;
}

export interface InconsistencyIssue {
  field: string;
  message: string;
}

export interface CriteriaEvaluationResult {
  status: 'CONFIRMED' | 'PENDING' | 'REJECTED';
  criteriaEvaluations: CriterionEvaluation[];
  inconsistencies: InconsistencyIssue[];
  summary: string;
}

export interface EvaluationOptions {
  /**
   * Permite passar os dados brutos da oferta caso estejam disponíveis,
   * permitindo diferenciar se um campo derivado (ex: otherBedrooms)
   * estava originalmente cadastrado no banco ou se foi inferido.
   */
  rawOffer?: any;
}

/**
 * Detecta contradições numéricas internas nos dados da oferta.
 */
export function detectOfferInconsistencies(offer: NormalizedOffer): InconsistencyIssue[] {
  const issues: InconsistencyIssue[] = [];

  // 1. Suítes > Quartos totais
  if (offer.suites > offer.bedrooms) {
    issues.push({
      field: 'suites',
      message: `Número de suítes (${offer.suites}) excede o total de quartos (${offer.bedrooms}).`,
    });
  }

  // 2. Vagas cobertas + descobertas > Vagas totais
  if (offer.coveredParkingSpaces != null && offer.uncoveredParkingSpaces != null) {
    const sumCovered = offer.coveredParkingSpaces + offer.uncoveredParkingSpaces;
    if (sumCovered > offer.parkingSpaces) {
      issues.push({
        field: 'parkingSpaces',
        message: `Soma de vagas cobertas (${offer.coveredParkingSpaces}) e descobertas (${offer.uncoveredParkingSpaces}) resulta em ${sumCovered}, excedendo as vagas totais (${offer.parkingSpaces}).`,
      });
    }
  }

  // 3. Banheiros: suítes + sociais + lavabos > banheiros totais
  if (offer.socialBathrooms != null && offer.lavabos != null) {
    const sumBathrooms = offer.suites + offer.socialBathrooms + offer.lavabos;
    if (sumBathrooms > offer.bathrooms) {
      issues.push({
        field: 'bathrooms',
        message: `Soma de suítes (${offer.suites}) + banheiros sociais (${offer.socialBathrooms}) + lavabos (${offer.lavabos}) resulta em ${sumBathrooms}, excedendo os banheiros totais (${offer.bathrooms}).`,
      });
    }
  }

  // 4. Metragens ou contagens negativas
  const numericFields: Array<[string, number | null | undefined]> = [
    ['bedrooms', offer.bedrooms],
    ['suites', offer.suites],
    ['bathrooms', offer.bathrooms],
    ['socialBathrooms', offer.socialBathrooms],
    ['lavabos', offer.lavabos],
    ['parkingSpaces', offer.parkingSpaces],
    ['coveredParkingSpaces', offer.coveredParkingSpaces],
    ['uncoveredParkingSpaces', offer.uncoveredParkingSpaces],
    ['privateArea', offer.privateArea],
    ['builtArea', offer.builtArea],
    ['landArea', offer.landArea],
  ];

  for (const [name, val] of numericFields) {
    if (val != null && val < 0) {
      issues.push({
        field: name,
        message: `Campo ${name} possui valor negativo inválido (${val}).`,
      });
    }
  }

  return issues;
}

/**
 * Avalia experimentalmente a compatibilidade de critérios eliminatórios
 * entre Busca e Oferta (Imóvel ou Tipologia), distinguindo:
 * - CONFIRMED: Todos os critérios exigidos foram atendidos com dados conhecidos.
 * - PENDING: Faltam informações para confirmar um ou mais critérios, sem rejeição comprovada.
 * - REJECTED: Pelo menos um critério exigido é comprovadamente incompatível.
 */
export function evaluateCriteria(
  search: SearchCriteria,
  offer: NormalizedOffer,
  options?: EvaluationOptions
): CriteriaEvaluationResult {
  const evaluations: CriterionEvaluation[] = [];
  const inconsistencies = detectOfferInconsistencies(offer);

  const isTerreno =
    (offer.propertyType || '').toLowerCase().includes('terren') ||
    (offer.propertyType || '').toLowerCase().includes('lote') ||
    search.propertyTypes.some((t) => t.toLowerCase().includes('terren') || t.toLowerCase().includes('lote'));

  // ==========================================
  // 1. QUARTOS E SUÍTES (Critérios independentes)
  // ==========================================
  if (!isTerreno) {
    // 1.1 Quartos totais (minBedrooms)
    if (search.minBedrooms != null && search.minBedrooms > 0) {
      const known = offer.bedrooms;
      if (known >= search.minBedrooms) {
        evaluations.push({
          criterion: 'minBedrooms',
          label: 'Quartos totais',
          requiredMin: search.minBedrooms,
          knownValue: known,
          status: 'CONFIRMED',
          explanation: `Possui ${known} quarto(s), atendendo ao mínimo exigido de ${search.minBedrooms}.`,
        });
      } else {
        evaluations.push({
          criterion: 'minBedrooms',
          label: 'Quartos totais',
          requiredMin: search.minBedrooms,
          knownValue: known,
          status: 'REJECTED',
          explanation: `Possui ${known} quarto(s), abaixo do mínimo exigido de ${search.minBedrooms}.`,
        });
      }
    }

    // 1.2 Suítes (minSuites)
    if (search.minSuites != null && search.minSuites > 0) {
      const known = offer.suites;
      if (known >= search.minSuites) {
        evaluations.push({
          criterion: 'minSuites',
          label: 'Suítes',
          requiredMin: search.minSuites,
          knownValue: known,
          status: 'CONFIRMED',
          explanation: `Possui ${known} suíte(s), atendendo ao mínimo exigido de ${search.minSuites}.`,
        });
      } else {
        evaluations.push({
          criterion: 'minSuites',
          label: 'Suítes',
          requiredMin: search.minSuites,
          knownValue: known,
          status: 'REJECTED',
          explanation: `Possui ${known} suíte(s), abaixo do mínimo exigido de ${search.minSuites}.`,
        });
      }
    }

    // 1.3 Dormitórios sem suíte (minOtherBedrooms)
    if (search.minOtherBedrooms != null && search.minOtherBedrooms > 0) {
      // Verificar se a oferta possui cadastro original explícito ou se foi derivado historicamente
      const hasRawOtherBedrooms =
        options?.rawOffer?.otherBedrooms !== undefined && options?.rawOffer?.otherBedrooms !== null;

      if (hasRawOtherBedrooms) {
        const known = Number(options!.rawOffer.otherBedrooms);
        if (known >= search.minOtherBedrooms) {
          evaluations.push({
            criterion: 'minOtherBedrooms',
            label: 'Dormitórios sem suíte',
            requiredMin: search.minOtherBedrooms,
            knownValue: known,
            status: 'CONFIRMED',
            explanation: `Possui ${known} dormitório(s) sem suíte confirmado(s), atendendo ao mínimo exigido de ${search.minOtherBedrooms}.`,
          });
        } else {
          evaluations.push({
            criterion: 'minOtherBedrooms',
            label: 'Dormitórios sem suíte',
            requiredMin: search.minOtherBedrooms,
            knownValue: known,
            status: 'REJECTED',
            explanation: `Possui ${known} dormitório(s) sem suíte, abaixo do mínimo exigido de ${search.minOtherBedrooms}.`,
          });
        }
      } else {
        // Sem cadastro original explícito: verificar se é matematicamente impossível
        if (offer.bedrooms < search.minOtherBedrooms) {
          evaluations.push({
            criterion: 'minOtherBedrooms',
            label: 'Dormitórios sem suíte',
            requiredMin: search.minOtherBedrooms,
            knownValue: null,
            status: 'REJECTED',
            explanation: `Imóvel possui apenas ${offer.bedrooms} quarto(s) totais, sendo impossível atender ao mínimo de ${search.minOtherBedrooms} dormitório(s) sem suíte.`,
          });
        } else {
          // Tratar como PENDING (sem assumir valor derivado como confirmado)
          evaluations.push({
            criterion: 'minOtherBedrooms',
            label: 'Dormitórios sem suíte',
            requiredMin: search.minOtherBedrooms,
            knownValue: null,
            status: 'PENDING',
            explanation: `Exigência de ${search.minOtherBedrooms} dormitório(s) sem suíte. Cadastro possui apenas quartos totais (${offer.bedrooms}) e suítes (${offer.suites}).`,
            pendingReason: 'Necessário confirmar a distribuição real dos dormitórios no imóvel.',
          });
        }
      }
    }
  }

  // ==========================================
  // 2. BANHEIROS (Critérios independentes)
  // ==========================================
  if (!isTerreno) {
    // 2.1 Banheiro Social (minSocialBathrooms)
    if (search.minSocialBathrooms != null && search.minSocialBathrooms > 0) {
      if (offer.socialBathrooms != null) {
        if (offer.socialBathrooms >= search.minSocialBathrooms) {
          evaluations.push({
            criterion: 'minSocialBathrooms',
            label: 'Banheiros sociais',
            requiredMin: search.minSocialBathrooms,
            knownValue: offer.socialBathrooms,
            status: 'CONFIRMED',
            explanation: `Possui ${offer.socialBathrooms} banheiro(s) social(is), atendendo ao mínimo de ${search.minSocialBathrooms}.`,
          });
        } else {
          evaluations.push({
            criterion: 'minSocialBathrooms',
            label: 'Banheiros sociais',
            requiredMin: search.minSocialBathrooms,
            knownValue: offer.socialBathrooms,
            status: 'REJECTED',
            explanation: `Possui ${offer.socialBathrooms} banheiro(s) social(is), abaixo do mínimo de ${search.minSocialBathrooms}.`,
          });
        }
      } else {
        // socialBathrooms é null (desconhecido). Verificar se total de banheiros comprova incompatibilidade
        const nonSuiteBathrooms = Math.max(0, offer.bathrooms - offer.suites);
        if (offer.bathrooms < search.minSocialBathrooms || nonSuiteBathrooms < search.minSocialBathrooms) {
          evaluations.push({
            criterion: 'minSocialBathrooms',
            label: 'Banheiros sociais',
            requiredMin: search.minSocialBathrooms,
            knownValue: null,
            status: 'REJECTED',
            explanation: `Imóvel possui ${offer.bathrooms} banheiro(s) total(is) e ${offer.suites} suíte(s), restando no máximo ${nonSuiteBathrooms} banheiro(s) fora das suítes, insuficiente para o mínimo de ${search.minSocialBathrooms} banheiro(s) social(is).`,
          });
        } else {
          evaluations.push({
            criterion: 'minSocialBathrooms',
            label: 'Banheiros sociais',
            requiredMin: search.minSocialBathrooms,
            knownValue: null,
            status: 'PENDING',
            explanation: `Exigência de ${search.minSocialBathrooms} banheiro(s) social(is). O imóvel possui ${offer.bathrooms} banheiros totais, mas a classificação detalhada não está informada.`,
            pendingReason: 'Confirmar se o imóvel possui banheiro social individualizado.',
          });
        }
      }
    }

    // 2.2 Lavabo (minLavabos)
    if (search.minLavabos != null && search.minLavabos > 0) {
      if (offer.lavabos != null) {
        if (offer.lavabos >= search.minLavabos) {
          evaluations.push({
            criterion: 'minLavabos',
            label: 'Lavabos',
            requiredMin: search.minLavabos,
            knownValue: offer.lavabos,
            status: 'CONFIRMED',
            explanation: `Possui ${offer.lavabos} lavabo(s), atendendo ao mínimo exigido de ${search.minLavabos}.`,
          });
        } else {
          evaluations.push({
            criterion: 'minLavabos',
            label: 'Lavabos',
            requiredMin: search.minLavabos,
            knownValue: offer.lavabos,
            status: 'REJECTED',
            explanation: `Possui ${offer.lavabos} lavabo(s), abaixo do mínimo exigido de ${search.minLavabos}.`,
          });
        }
      } else {
        // lavabo desconhecido
        if (offer.bathrooms < search.minLavabos) {
          evaluations.push({
            criterion: 'minLavabos',
            label: 'Lavabos',
            requiredMin: search.minLavabos,
            knownValue: null,
            status: 'REJECTED',
            explanation: `Imóvel possui ${offer.bathrooms} banheiro(s) total(is), insuficiente para o mínimo de ${search.minLavabos} lavabo(s).`,
          });
        } else {
          evaluations.push({
            criterion: 'minLavabos',
            label: 'Lavabos',
            requiredMin: search.minLavabos,
            knownValue: null,
            status: 'PENDING',
            explanation: `Exigência de ${search.minLavabos} lavabo(s). Cadastro não informa se o imóvel possui lavabo.`,
            pendingReason: 'Confirmar se o imóvel possui lavabo para visitas.',
          });
        }
      }
    }

    // 2.3 Critério Legado: Banheiros fora das suítes (minOtherBathrooms)
    if (search.minOtherBathrooms != null && search.minOtherBathrooms > 0) {
      const known = offer.otherBathrooms;
      if (known >= search.minOtherBathrooms) {
        evaluations.push({
          criterion: 'minOtherBathrooms',
          label: 'Banheiros fora das suítes (legado)',
          requiredMin: search.minOtherBathrooms,
          knownValue: known,
          status: 'CONFIRMED',
          explanation: `Possui ${known} banheiro(s) fora das suítes, atendendo ao critério histórico de no mínimo ${search.minOtherBathrooms}.`,
        });
      } else {
        evaluations.push({
          criterion: 'minOtherBathrooms',
          label: 'Banheiros fora das suítes (legado)',
          requiredMin: search.minOtherBathrooms,
          knownValue: known,
          status: 'REJECTED',
          explanation: `Possui ${known} banheiro(s) fora das suítes, abaixo do mínimo histórico de ${search.minOtherBathrooms}.`,
        });
      }
    }
  }

  // ==========================================
  // 3. VAGAS DE GARAGEM (Critérios independentes)
  // ==========================================
  // 3.1 Vagas Totais (minParkingSpaces)
  if (search.minParkingSpaces != null && search.minParkingSpaces > 0) {
    const known = offer.parkingSpaces;
    if (known >= search.minParkingSpaces) {
      evaluations.push({
        criterion: 'minParkingSpaces',
        label: 'Vagas totais',
        requiredMin: search.minParkingSpaces,
        knownValue: known,
        status: 'CONFIRMED',
        explanation: `Possui ${known} vaga(s) de garagem, atendendo ao mínimo de ${search.minParkingSpaces}.`,
      });
    } else {
      evaluations.push({
        criterion: 'minParkingSpaces',
        label: 'Vagas totais',
        requiredMin: search.minParkingSpaces,
        knownValue: known,
        status: 'REJECTED',
        explanation: `Possui ${known} vaga(s) de garagem, abaixo do mínimo de ${search.minParkingSpaces}.`,
      });
    }
  }

  // 3.2 Vagas Cobertas (minCoveredParkingSpaces)
  if (search.minCoveredParkingSpaces != null && search.minCoveredParkingSpaces > 0) {
    if (offer.coveredParkingSpaces != null) {
      if (offer.coveredParkingSpaces >= search.minCoveredParkingSpaces) {
        evaluations.push({
          criterion: 'minCoveredParkingSpaces',
          label: 'Vagas cobertas',
          requiredMin: search.minCoveredParkingSpaces,
          knownValue: offer.coveredParkingSpaces,
          status: 'CONFIRMED',
          explanation: `Possui ${offer.coveredParkingSpaces} vaga(s) coberta(s), atendendo ao mínimo exigido de ${search.minCoveredParkingSpaces}.`,
        });
      } else {
        evaluations.push({
          criterion: 'minCoveredParkingSpaces',
          label: 'Vagas cobertas',
          requiredMin: search.minCoveredParkingSpaces,
          knownValue: offer.coveredParkingSpaces,
          status: 'REJECTED',
          explanation: `Possui ${offer.coveredParkingSpaces} vaga(s) coberta(s), abaixo do mínimo exigido de ${search.minCoveredParkingSpaces}.`,
        });
      }
    } else {
      // Cobertura desconhecida (null): checar relação com vagas totais
      if (offer.parkingSpaces < search.minCoveredParkingSpaces) {
        evaluations.push({
          criterion: 'minCoveredParkingSpaces',
          label: 'Vagas cobertas',
          requiredMin: search.minCoveredParkingSpaces,
          knownValue: null,
          status: 'REJECTED',
          explanation: `Imóvel possui apenas ${offer.parkingSpaces} vaga(s) total(is), insuficiente para atender à exigência de ${search.minCoveredParkingSpaces} vaga(s) coberta(s).`,
        });
      } else {
        evaluations.push({
          criterion: 'minCoveredParkingSpaces',
          label: 'Vagas cobertas',
          requiredMin: search.minCoveredParkingSpaces,
          knownValue: null,
          status: 'PENDING',
          explanation: `Exigência de ${search.minCoveredParkingSpaces} vaga(s) coberta(s). O imóvel possui ${offer.parkingSpaces} vaga(s) total(is), mas o cadastro não especifica se são cobertas.`,
          pendingReason: 'Confirmar quantas vagas são cobertas.',
        });
      }
    }
  }

  // 3.3 Vagas Descobertas (minUncoveredParkingSpaces)
  if (search.minUncoveredParkingSpaces != null && search.minUncoveredParkingSpaces > 0) {
    if (offer.uncoveredParkingSpaces != null) {
      if (offer.uncoveredParkingSpaces >= search.minUncoveredParkingSpaces) {
        evaluations.push({
          criterion: 'minUncoveredParkingSpaces',
          label: 'Vagas descobertas',
          requiredMin: search.minUncoveredParkingSpaces,
          knownValue: offer.uncoveredParkingSpaces,
          status: 'CONFIRMED',
          explanation: `Possui ${offer.uncoveredParkingSpaces} vaga(s) descoberta(s), atendendo ao mínimo de ${search.minUncoveredParkingSpaces}.`,
        });
      } else {
        evaluations.push({
          criterion: 'minUncoveredParkingSpaces',
          label: 'Vagas descobertas',
          requiredMin: search.minUncoveredParkingSpaces,
          knownValue: offer.uncoveredParkingSpaces,
          status: 'REJECTED',
          explanation: `Possui ${offer.uncoveredParkingSpaces} vaga(s) descoberta(s), abaixo do mínimo de ${search.minUncoveredParkingSpaces}.`,
        });
      }
    } else {
      if (offer.parkingSpaces < search.minUncoveredParkingSpaces) {
        evaluations.push({
          criterion: 'minUncoveredParkingSpaces',
          label: 'Vagas descobertas',
          requiredMin: search.minUncoveredParkingSpaces,
          knownValue: null,
          status: 'REJECTED',
          explanation: `Imóvel possui apenas ${offer.parkingSpaces} vaga(s) total(is), insuficiente para atender à exigência de ${search.minUncoveredParkingSpaces} vaga(s) descoberta(s).`,
        });
      } else {
        evaluations.push({
          criterion: 'minUncoveredParkingSpaces',
          label: 'Vagas descobertas',
          requiredMin: search.minUncoveredParkingSpaces,
          knownValue: null,
          status: 'PENDING',
          explanation: `Exigência de ${search.minUncoveredParkingSpaces} vaga(s) descoberta(s). O imóvel possui ${offer.parkingSpaces} vaga(s) total(is), mas o cadastro não especifica se são descobertas.`,
          pendingReason: 'Confirmar quantas vagas são descobertas.',
        });
      }
    }
  }

  // ==========================================
  // 4. METRAGENS / ÁREAS (Critérios independentes)
  // ==========================================
  // 4.1 Área Útil / Privativa (minArea)
  if (search.minArea != null && search.minArea > 0) {
    if (isTerreno) {
      const effLandArea = offer.landArea ?? offer.privateArea ?? offer.totalArea;
      if (effLandArea != null) {
        if (effLandArea >= search.minArea) {
          evaluations.push({
            criterion: 'minArea',
            label: 'Área do terreno',
            requiredMin: search.minArea,
            knownValue: effLandArea,
            status: 'CONFIRMED',
            explanation: `Possui ${effLandArea} m² de terreno, atendendo ao mínimo de ${search.minArea} m².`,
          });
        } else {
          evaluations.push({
            criterion: 'minArea',
            label: 'Área do terreno',
            requiredMin: search.minArea,
            knownValue: effLandArea,
            status: 'REJECTED',
            explanation: `Possui ${effLandArea} m² de terreno, abaixo do mínimo de ${search.minArea} m².`,
          });
        }
      } else {
        evaluations.push({
          criterion: 'minArea',
          label: 'Área do terreno',
          requiredMin: search.minArea,
          knownValue: null,
          status: 'PENDING',
          explanation: `Exigência de ${search.minArea} m² de terreno. Área do lote não informada.`,
          pendingReason: 'Confirmar metragem documental do terreno.',
        });
      }
    } else {
      if (offer.privateArea != null) {
        if (offer.privateArea >= search.minArea) {
          evaluations.push({
            criterion: 'minArea',
            label: 'Área privativa / útil',
            requiredMin: search.minArea,
            knownValue: offer.privateArea,
            status: 'CONFIRMED',
            explanation: `Possui ${offer.privateArea} m² privativos, atendendo ao mínimo de ${search.minArea} m².`,
          });
        } else {
          evaluations.push({
            criterion: 'minArea',
            label: 'Área privativa / útil',
            requiredMin: search.minArea,
            knownValue: offer.privateArea,
            status: 'REJECTED',
            explanation: `Possui ${offer.privateArea} m² privativos, abaixo do mínimo de ${search.minArea} m².`,
          });
        }
      } else {
        evaluations.push({
          criterion: 'minArea',
          label: 'Área privativa / útil',
          requiredMin: search.minArea,
          knownValue: null,
          status: 'PENDING',
          explanation: `Exigência de ${search.minArea} m² privativos. Metragem privativa não especificada no cadastro.`,
          pendingReason: 'Confirmar área privativa da unidade.',
        });
      }
    }
  }

  // 4.2 Área Construída (minBuiltArea)
  if (search.minBuiltArea != null && search.minBuiltArea > 0) {
    if (offer.builtArea != null) {
      if (offer.builtArea >= search.minBuiltArea) {
        evaluations.push({
          criterion: 'minBuiltArea',
          label: 'Área construída',
          requiredMin: search.minBuiltArea,
          knownValue: offer.builtArea,
          status: 'CONFIRMED',
          explanation: `Possui ${offer.builtArea} m² de área construída, atendendo ao mínimo de ${search.minBuiltArea} m².`,
        });
      } else {
        evaluations.push({
          criterion: 'minBuiltArea',
          label: 'Área construída',
          requiredMin: search.minBuiltArea,
          knownValue: offer.builtArea,
          status: 'REJECTED',
          explanation: `Possui ${offer.builtArea} m² de área construída, abaixo do mínimo de ${search.minBuiltArea} m².`,
        });
      }
    } else {
      evaluations.push({
        criterion: 'minBuiltArea',
        label: 'Área construída',
        requiredMin: search.minBuiltArea,
        knownValue: null,
        status: 'PENDING',
        explanation: `Exigência de ${search.minBuiltArea} m² de área construída. Área construída não informada no cadastro.`,
        pendingReason: 'Confirmar metragem construída averbada ou real do imóvel.',
      });
    }
  }

  // 4.3 Área do Terreno (minLandArea)
  if (search.minLandArea != null && search.minLandArea > 0) {
    if (offer.landArea != null) {
      if (offer.landArea >= search.minLandArea) {
        evaluations.push({
          criterion: 'minLandArea',
          label: 'Área do terreno',
          requiredMin: search.minLandArea,
          knownValue: offer.landArea,
          status: 'CONFIRMED',
          explanation: `Possui ${offer.landArea} m² de terreno documental, atendendo ao mínimo de ${search.minLandArea} m².`,
        });
      } else {
        evaluations.push({
          criterion: 'minLandArea',
          label: 'Área do terreno',
          requiredMin: search.minLandArea,
          knownValue: offer.landArea,
          status: 'REJECTED',
          explanation: `Possui ${offer.landArea} m² de terreno documental, abaixo do mínimo de ${search.minLandArea} m².`,
        });
      }
    } else {
      evaluations.push({
        criterion: 'minLandArea',
        label: 'Área do terreno',
        requiredMin: search.minLandArea,
        knownValue: null,
        status: 'PENDING',
        explanation: `Exigência de ${search.minLandArea} m² de terreno documental. Área do lote não informada.`,
        pendingReason: 'Confirmar metragem de terreno na matrícula.',
      });
    }
  }

  // ==========================================
  // 5. DETERMINAÇÃO DO STATUS GERAL E PRECEDÊNCIA
  // ==========================================
  // Regra 1: Qualquer REJECTED -> REJECTED geral
  const hasRejected = evaluations.some((e) => e.status === 'REJECTED');
  if (hasRejected) {
    const rejectedList = evaluations
      .filter((e) => e.status === 'REJECTED')
      .map((e) => e.label)
      .join(', ');
    return {
      status: 'REJECTED',
      criteriaEvaluations: evaluations,
      inconsistencies,
      summary: `Incompatível comprovadamente nos critérios: ${rejectedList}.`,
    };
  }

  // Regra 2: Qualquer PENDING ou Inconsistência -> PENDING geral
  const hasPending = evaluations.some((e) => e.status === 'PENDING');
  if (hasPending || inconsistencies.length > 0) {
    const reasons: string[] = [];
    if (hasPending) {
      const pendingList = evaluations
        .filter((e) => e.status === 'PENDING')
        .map((e) => e.label)
        .join(', ');
      reasons.push(`Informações pendentes de confirmação: ${pendingList}`);
    }
    if (inconsistencies.length > 0) {
      reasons.push(`Inconsistências detectadas nos dados do imóvel: ${inconsistencies.map((i) => i.message).join(' ')}`);
    }

    return {
      status: 'PENDING',
      criteriaEvaluations: evaluations,
      inconsistencies,
      summary: `Possível compatibilidade — verificar informações. ${reasons.join(' | ')}`,
    };
  }

  // Regra 3: Caso contrário -> CONFIRMED geral
  return {
    status: 'CONFIRMED',
    criteriaEvaluations: evaluations,
    inconsistencies: [],
    summary: 'Compatibilidade confirmada em todos os critérios avaliados.',
  };
}
