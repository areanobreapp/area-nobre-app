/**
 * Centralized Matching Configuration for Área Nobre — V2
 * 
 * Centraliza todas as regras de pontuação, pesos, tolerâncias
 * e critérios por tipo de imóvel do algoritmo determinístico.
 */

export const MATCH_CONFIG = {
  // Pesos Base dos Critérios Principais (Categoria B - representam ~80 a 90% do score)
  WEIGHTS: {
    LOCATION: 25,     // Localização / Bairro
    PRICE: 25,        // Preço e aderência orçamentária
    BEDROOMS: 12,     // Dormitórios
    SUITES: 8,        // Suítes
    PARKING: 10,      // Vagas de garagem
    AREA: 10,         // Área privativa / útil / terreno
    OTHER: 5,         // Completude cadastral / fotos / atratividade
  },

  // Pesos das Preferências Avançadas (Categoria C - somam ao denominador apenas se informadas na busca)
  PREFERENCE_WEIGHTS: {
    POOL: 5,             // Piscina
    GYM: 5,              // Academia
    BARBECUE: 4,         // Churrasqueira
    PARTY_HALL: 4,       // Salão de festas
    ELEVATOR: 5,         // Elevador
    PET_SPACE: 3,        // Espaço pet
    PENTHOUSE: 4,        // Cobertura
    FURNITURE: 4,        // Mobília
    CORNER: 4,           // Esquina
    GATED_COMMUNITY: 5,  // Condomínio fechado
    ALLOTMENT: 3,        // Loteamento
    STREET_PAVING: 4,    // Pavimentação da rua
    COMMERCIAL_TYPE: 5,  // Térrea / Aérea
    EXCHANGE: 3,         // Permuta
    REGISTERED: 4,       // Averbada
  },

  // Tolerâncias de Preço (Categoria A e B)
  PRICE: {
    // Até 5% acima do teto: penalidade suave (mantém alta relevância)
    SMALL_OVER_BUDGET_RATIO: 0.05,
    // Entre 5% e 10% acima do teto: penalidade moderada (margem de negociação)
    LARGE_OVER_BUDGET_RATIO: 0.10,
    // Acima de 10% do teto: hard filter (elimina oferta do resultado)
    HARD_FILTER_OVER_BUDGET_RATIO: 0.10,
    // Pontuação parcial para até 5% acima:
    SMALL_OVER_POINTS: 16,
    // Pontuação parcial para 5% a 10% acima:
    LARGE_OVER_POINTS: 8,
  },

  // Penalidades para Defasagem em Dormitórios, Suítes e Vagas
  ROOMS: {
    // 1 dormitório a menos que o solicitado
    BEDROOM_DEFICIT_1_POINTS: 5,
    // 1 suíte a menos que a solicitada
    SUITE_DEFICIT_1_POINTS: 3,
    // 1 vaga a menos que a solicitada
    PARKING_DEFICIT_1_POINTS: 3,
  },

  // Localização
  LOCATION: {
    // Bairro bate exatamente com os desejados (ou cliente não filtrou bairro)
    EXACT_NEIGHBORHOOD_POINTS: 25,
    // Mesma cidade, porém bairro diferente dos preferidos
    DIFFERENT_NEIGHBORHOOD_SAME_CITY_POINTS: 10,
    // Ponto dentro do raio geográfico desejado
    INSIDE_RADIUS_POINTS: 25,
    // Penalidade para fora do raio quando não estrito
    OUT_OF_RADIUS_PENALTY: 10,
    // Raio geográfico como Hard Filter eliminatório quando configurado
    HARD_FILTER_RADIUS: true,
  },

  // Área
  AREA: {
    // Atende ou supera a área mínima
    FULL_AREA_POINTS: 10,
    // Área até 10% abaixo do mínimo solicitado (ex: 65m² vs 70m²)
    NEAR_AREA_POINTS: 5,
    // Área não informada
    UNSPECIFIED_AREA_POINTS: 5,
  },

  // Definição Centralizada de Match (Fase 5.2): Score >= 70% é Match; < 70% não é Match
  MATCH_THRESHOLD: 70,
  RELEVANT_THRESHOLD: 70,
} as const;

export const MATCH_THRESHOLD = MATCH_CONFIG.MATCH_THRESHOLD;

/**
 * Função centralizada para determinar se um resultado de matching constitui um "Match"
 * Regra: eligible === true E score final >= MATCH_THRESHOLD (70)
 */
export function isMatch(score: number, eligible: boolean = true): boolean {
  return eligible && score >= MATCH_THRESHOLD;
}

