/**
 * TEST SUITE — FASE 5.0.1: MODELO DE DADOS POR TIPO DE IMÓVEL + MATCHING V2
 * 
 * Testes obrigatórios do Requisito 21:
 * 1. Apartamento A (ótimo preço/local/quartos, sem piscina) vs Apartamento B (pior preço/local, com piscina/academia/churrasqueira)
 *    -> Apt A deve superar Apt B quando opcionais são desejáveis.
 * 2. Campo Necessário (Busca exige elevador -> sem elevador não pode ser compatível/excelente).
 * 3. Campo Indiferente (Busca não informa piscina -> piscina não altera score nem penaliza).
 * 4. Campo Desconhecido (Imóvel possui piscina = null -> não interpreta como false).
 * 5. Cenário Terreno (Faixa de preço, área mínima, esquina desejável, asfalto desejável).
 * 6. Cenário Comercial (Térrea/aérea, área, banheiros, vagas, preço/localização).
 * 7. Cenário Em Construção (Matching contra tipologia com herança de comodidades do empreendimento).
 * 8. Semântica de dormitórios e banheiros (suítes + outros quartos / banheiros).
 */

import { calculateMatch } from './src/lib/matching/engine.ts';
import { normalizeProperty, normalizeTypology, parseSearchCriteria } from './src/lib/matching/normalizer.ts';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('='.repeat(70));
console.log('SUÍTE DE TESTES: FASE 5.0.1 — MATCHING ENGINE V2 & DADOS ADAPTATIVOS');
console.log('='.repeat(70));

// ============================================================================
// CENÁRIO 1: APARTAMENTO A vs APARTAMENTO B (REQUISITO 21.1)
// ============================================================================
console.log('\n[Cenário 1] Apartamento A (sem piscina, ótimo preço/local) vs Apartamento B (com piscina/academia/churrasqueira, pior preço/local)');
{
  const searchCriteria = parseSearchCriteria({
    id: 'search-1',
    purpose: 'Venda',
    propertyTypes: ['Apartamento'],
    cities: ['Criciúma'],
    neighborhoods: ['Centro'],
    maxPrice: 600000,
    minBedrooms: 2,
    minSuites: 1,
    minParkingSpaces: 1,
    minArea: 70,
    wantsPool: 'DESEJAVEL',
    wantsGym: 'DESEJAVEL',
    wantsBarbecue: 'DESEJAVEL',
  });

  // Apartamento A: Centro, R$ 550.000, 3 quartos (1 suíte), 1 vaga, 80m², SEM piscina/academia/churrasqueira
  const aptA = normalizeProperty({
    id: 'apt-a',
    title: 'Apartamento A no Centro',
    purpose: 'Venda',
    propertyType: 'Apartamento',
    status: 'Disponível',
    city: 'Criciúma',
    neighborhood: 'Centro',
    price: 550000,
    suites: 1,
    otherBedrooms: 2,
    bedrooms: 3,
    otherBathrooms: 1,
    bathrooms: 2,
    parkingSpaces: 1,
    privateArea: 80,
    hasPool: false,
    hasGym: false,
    hasBarbecue: false,
  });

  // Apartamento B: Bairro distante (Quarta Linha), R$ 640.000 (acima do orçamento mas na tolerância de 10%),
  // apenas 1 quarto (abaixo do pedido), 1 vaga, mas TEM piscina, academia e churrasqueira
  const aptB = normalizeProperty({
    id: 'apt-b',
    title: 'Apartamento B com Lazer Completo',
    purpose: 'Venda',
    propertyType: 'Apartamento',
    status: 'Disponível',
    city: 'Criciúma',
    neighborhood: 'Quarta Linha',
    price: 640000,
    suites: 0,
    otherBedrooms: 1,
    bedrooms: 1,
    otherBathrooms: 1,
    bathrooms: 1,
    parkingSpaces: 1,
    privateArea: 60,
    hasPool: true,
    hasGym: true,
    hasBarbecue: true,
  });

  const matchA = calculateMatch(searchCriteria, aptA);
  const matchB = calculateMatch(searchCriteria, aptB);

  console.log(`    Score Apt A: ${matchA.score}% (Eligible: ${matchA.eligible})`);
  console.log(`    Score Apt B: ${matchB.score}% (Eligible: ${matchB.eligible})`);

  assert(matchA.eligible === true, 'Apt A deve ser elegível');
  assert(matchB.eligible === true, 'Apt B está na margem de tolerância');
  assert(matchA.score > matchB.score, `Apt A (${matchA.score}%) supera Apt B (${matchB.score}%) com folga`);
  assert(matchA.score >= 80, `Apt A tem score alto (>= 80%): obteve ${matchA.score}%`);
  assert(matchB.score <= 65, `Apt B tem score rebaixado por falhas estruturais (<= 65%): obteve ${matchB.score}%`);
}

// ============================================================================
// CENÁRIO 2: CAMPO NECESSÁRIO (REQUISITO 21.2)
// ============================================================================
console.log('\n[Cenário 2] Campo Necessário: Busca exige elevador');
{
  const searchCriteria = parseSearchCriteria({
    id: 'search-2',
    purpose: 'Venda',
    propertyTypes: ['Apartamento'],
    cities: ['Criciúma'],
    neighborhoods: ['Centro'],
    maxPrice: 800000,
    minBedrooms: 2,
    wantsElevator: 'NECESSARIO',
    wantsPool: 'DESEJAVEL',
    wantsGym: 'DESEJAVEL',
  });

  // Imóvel sem elevador
  const aptSemElevador = normalizeProperty({
    id: 'apt-sem-elevador',
    title: 'Apartamento Sem Elevador',
    purpose: 'Venda',
    propertyType: 'Apartamento',
    status: 'Disponível',
    city: 'Criciúma',
    neighborhood: 'Centro',
    price: 700000,
    bedrooms: 3,
    suites: 1,
    hasElevator: false,
    hasPool: true,
    hasGym: true,
  });

  // Imóvel com elevador
  const aptComElevador = normalizeProperty({
    id: 'apt-com-elevador',
    title: 'Apartamento Com Elevador',
    purpose: 'Venda',
    propertyType: 'Apartamento',
    status: 'Disponível',
    city: 'Criciúma',
    neighborhood: 'Centro',
    price: 700000,
    bedrooms: 3,
    suites: 1,
    hasElevator: true,
    hasPool: false,
    hasGym: false,
  });

  const matchSem = calculateMatch(searchCriteria, aptSemElevador);
  const matchCom = calculateMatch(searchCriteria, aptComElevador);

  console.log(`    Score Sem Elevador: ${matchSem.score}% (Eligible: ${matchSem.eligible})`);
  console.log(`    Score Com Elevador: ${matchCom.score}% (Eligible: ${matchCom.eligible})`);

  assert(matchSem.eligible === false, 'Imóvel sem elevador exigido é marcado como NÃO elegível');
  assert(matchSem.score === 0, 'Score do imóvel sem elevador obrigatório é zerado');
  const failureExplanation = matchSem.explanation.find(e => e.category === 'structure' && (e.status === 'negative' || e.title.includes('Elevador')));
  assert(Boolean(failureExplanation), 'Explicação destaca que elevador era requisito obrigatório');
  assert(matchCom.eligible === true && matchCom.score >= 80, `Imóvel com elevador atende com score alto (${matchCom.score}%)`);
}

// ============================================================================
// CENÁRIO 3: CAMPO INDIFERENTE (REQUISITO 21.3)
// ============================================================================
console.log('\n[Cenário 3] Campo Indiferente: Busca não especifica piscina (wantsPool = INDIFERENTE)');
{
  const searchCriteria = parseSearchCriteria({
    id: 'search-3',
    purpose: 'Venda',
    propertyTypes: ['Apartamento'],
    cities: ['Criciúma'],
    neighborhoods: ['Centro'],
    maxPrice: 500000,
    minBedrooms: 2,
    wantsPool: 'INDIFERENTE',
  });

  const aptComPiscina = normalizeProperty({
    id: 'apt-piscina-sim',
    purpose: 'Venda',
    propertyType: 'Apartamento',
    status: 'Disponível',
    city: 'Criciúma',
    neighborhood: 'Centro',
    price: 500000,
    bedrooms: 2,
    hasPool: true,
  });

  const aptSemPiscina = normalizeProperty({
    id: 'apt-piscina-nao',
    purpose: 'Venda',
    propertyType: 'Apartamento',
    status: 'Disponível',
    city: 'Criciúma',
    neighborhood: 'Centro',
    price: 500000,
    bedrooms: 2,
    hasPool: false,
  });

  const matchCom = calculateMatch(searchCriteria, aptComPiscina);
  const matchSem = calculateMatch(searchCriteria, aptSemPiscina);

  console.log(`    Score com piscina: ${matchCom.score}%`);
  console.log(`    Score sem piscina: ${matchSem.score}%`);

  assert(matchCom.score === matchSem.score, `Scores idênticos (${matchCom.score}% vs ${matchSem.score}%) pois piscina é indiferente`);
  const hasPoolPenalty = matchSem.explanation.some(e => e.category === 'amenity' && e.status === 'negative' && e.title.toLowerCase().includes('piscina'));
  assert(!hasPoolPenalty, 'Ausência de piscina não gera penalização quando a busca é indiferente');
}

// ============================================================================
// CENÁRIO 4: CAMPO DESCONHECIDO (NULL vs FALSE) (REQUISITO 21.4)
// ============================================================================
console.log('\n[Cenário 4] Campo Desconhecido: Imóvel com hasPool = null');
{
  const searchCriteria = parseSearchCriteria({
    id: 'search-4',
    purpose: 'Venda',
    propertyTypes: ['Apartamento'],
    cities: ['Criciúma'],
    neighborhoods: ['Centro'],
    maxPrice: 600000,
    minBedrooms: 2,
    wantsPool: 'DESEJAVEL',
  });

  // Imóvel legado com hasPool = null (não informado)
  const aptNull = normalizeProperty({
    id: 'apt-null',
    purpose: 'Venda',
    propertyType: 'Apartamento',
    status: 'Disponível',
    city: 'Criciúma',
    neighborhood: 'Centro',
    price: 550000,
    bedrooms: 2,
    hasPool: null,
  });

  // Imóvel expressamente sem piscina hasPool = false
  const aptFalse = normalizeProperty({
    id: 'apt-false',
    purpose: 'Venda',
    propertyType: 'Apartamento',
    status: 'Disponível',
    city: 'Criciúma',
    neighborhood: 'Centro',
    price: 550000,
    bedrooms: 2,
    hasPool: false,
  });

  const matchNull = calculateMatch(searchCriteria, aptNull);
  const matchFalse = calculateMatch(searchCriteria, aptFalse);

  console.log(`    Score com hasPool=null:  ${matchNull.score}%`);
  console.log(`    Score com hasPool=false: ${matchFalse.score}%`);

  assert(matchNull.score >= matchFalse.score, 'hasPool = null não é penalizado severamente como false direto');
  const poolExpNull = matchNull.explanation.find(e => e.category === 'amenity' && e.title.toLowerCase().includes('piscina'));
  assert(poolExpNull && poolExpNull.status === 'warning', 'hasPool = null gera status "warning" com aviso "A confirmar no cadastro"');
}

// ============================================================================
// CENÁRIO 5: TERRENO (REQUISITO 21.5)
// ============================================================================
console.log('\n[Cenário 5] Cenário Terreno: Preço, área mínima, esquina desejável, asfalto desejável');
{
  const searchTerrain = parseSearchCriteria({
    id: 'search-5',
    purpose: 'Venda',
    propertyTypes: ['Terreno'],
    cities: ['Criciúma'],
    neighborhoods: ['Pio Corrêa'],
    maxPrice: 400000,
    minLandArea: 350,
    wantsCorner: 'DESEJAVEL',
    preferredStreetPaving: 'Asfalto',
  });

  // Terreno ideal: Pio Corrêa, R$ 380k, 420m², esquina, asfalto
  const terrenoIdeal = normalizeProperty({
    id: 'terreno-ideal',
    purpose: 'Venda',
    propertyType: 'Terreno',
    status: 'Disponível',
    city: 'Criciúma',
    neighborhood: 'Pio Corrêa',
    price: 380000,
    landArea: 420,
    isCorner: true,
    streetPaving: 'Asfalto',
  });

  // Terreno simples: meio de quadra, rua de lajota
  const terrenoSimples = normalizeProperty({
    id: 'terreno-simples',
    purpose: 'Venda',
    propertyType: 'Terreno',
    status: 'Disponível',
    city: 'Criciúma',
    neighborhood: 'Pio Corrêa',
    price: 380000,
    landArea: 360,
    isCorner: false,
    streetPaving: 'Lajota',
  });

  const matchIdeal = calculateMatch(searchTerrain, terrenoIdeal);
  const matchSimples = calculateMatch(searchTerrain, terrenoSimples);

  console.log(`    Score Terreno Ideal:   ${matchIdeal.score}%`);
  console.log(`    Score Terreno Simples: ${matchSimples.score}%`);

  assert(matchIdeal.score >= 90, `Terreno ideal atinge score de excelência (>= 90%): ${matchIdeal.score}%`);
  assert(matchIdeal.score > matchSimples.score, `Terreno de esquina + asfalto supera terreno simples (${matchIdeal.score}% > ${matchSimples.score}%)`);
  assert(matchSimples.score >= 70, `Terreno simples ainda é bom match por atender preço, local e metragem: ${matchSimples.score}%`);
}

// ============================================================================
// CENÁRIO 6: COMERCIAL (REQUISITO 21.6)
// ============================================================================
console.log('\n[Cenário 6] Cenário Comercial: Térrea/aérea, área, banheiros, vagas, preço/local');
{
  const searchComercial = parseSearchCriteria({
    id: 'search-6',
    purpose: 'Locação',
    propertyTypes: ['Comercial'],
    cities: ['Criciúma'],
    neighborhoods: ['Centro'],
    maxPrice: 4000,
    minArea: 50,
    minParkingSpaces: 1,
    preferredCommercialType: 'Térrea',
  });

  const salaTerrea = normalizeProperty({
    id: 'sala-terrea',
    purpose: 'Locação',
    propertyType: 'Comercial',
    status: 'Disponível',
    city: 'Criciúma',
    neighborhood: 'Centro',
    price: 3500,
    privateArea: 65,
    otherBathrooms: 2,
    bathrooms: 2,
    parkingSpaces: 2,
    commercialType: 'Térrea',
  });

  const salaAerea = normalizeProperty({
    id: 'sala-aerea',
    purpose: 'Locação',
    propertyType: 'Comercial',
    status: 'Disponível',
    city: 'Criciúma',
    neighborhood: 'Centro',
    price: 3500,
    privateArea: 65,
    otherBathrooms: 1,
    bathrooms: 1,
    parkingSpaces: 1,
    commercialType: 'Aérea',
  });

  const matchTerrea = calculateMatch(searchComercial, salaTerrea);
  const matchAerea = calculateMatch(searchComercial, salaAerea);

  console.log(`    Score Sala Térrea: ${matchTerrea.score}%`);
  console.log(`    Score Sala Aérea:  ${matchAerea.score}%`);

  assert(matchTerrea.score >= 85, `Sala térrea atinge score alto (>= 85%): ${matchTerrea.score}%`);
  assert(matchTerrea.score > matchAerea.score, `Sala térrea supera sala aérea conforme preferência informada`);
}

// ============================================================================
// CENÁRIO 7: EM CONSTRUÇÃO / TIPOLOGIAS (REQUISITO 21.7)
// ============================================================================
console.log('\n[Cenário 7] Cenário Em Construção: Tipologia com herança de comodidades do empreendimento');
{
  const searchEmConstrucao = parseSearchCriteria({
    id: 'search-7',
    purpose: 'Venda',
    propertyTypes: ['Em construção', 'Apartamento'],
    cities: ['Criciúma'],
    neighborhoods: ['Centro'],
    maxPrice: 750000,
    minBedrooms: 3,
    minSuites: 1,
    wantsPool: 'DESEJAVEL',
    wantsGym: 'DESEJAVEL',
    wantsPartyHall: 'DESEJAVEL',
  });

  // Empreendimento com comodidades compartilhadas no condomínio
  const empreendimento = {
    id: 'dev-1',
    name: 'Residencial Diamond Palace',
    city: 'Criciúma',
    neighborhood: 'Centro',
    status: 'Em obras',
    hasPool: true,
    hasGym: true,
    hasPartyHall: true,
    hasElevator: true,
    hasPetSpace: true,
    active: true,
  };

  // Tipologia específica de 3 dormitórios
  const rawTypology = {
    id: 'typo-1',
    name: 'Tipo 01 - 3 Dormitórios',
    developmentId: 'dev-1',
    price: 680000,
    bedrooms: 3,
    suites: 1,
    otherBedrooms: 2,
    otherBathrooms: 1,
    bathrooms: 2,
    parkingSpaces: 2,
    privateArea: 95,
    hasBarbecue: true,
    active: true,
  };

  const normalizedTypo = normalizeTypology(rawTypology, empreendimento);
  const matchTypo = calculateMatch(searchEmConstrucao, normalizedTypo);

  console.log(`    Score Tipologia com Empreendimento: ${matchTypo.score}% (Eligible: ${matchTypo.eligible})`);

  assert(normalizedTypo.hasPool === true, 'Tipologia herda hasPool = true do empreendimento');
  assert(normalizedTypo.hasGym === true, 'Tipologia herda hasGym = true do empreendimento');
  assert(normalizedTypo.hasPartyHall === true, 'Tipologia herda hasPartyHall = true do empreendimento');
  assert(matchTypo.score >= 90, `Tipologia alcança alta compatibilidade (>= 90%): ${matchTypo.score}%`);
  const poolItem = matchTypo.explanation.find(e => e.category === 'amenity' && e.title.toLowerCase().includes('piscina'));
  assert(poolItem && poolItem.status === 'positive', 'Piscina herdada do empreendimento pontua como sucesso na tipologia');
}

// ============================================================================
// CENÁRIO 8: SEMÂNTICA DE DORMITÓRIOS E BANHEIROS (REQUISITO 2)
// ============================================================================
console.log('\n[Cenário 8] Semântica de dormitórios e banheiros (suítes + outros quartos / banheiros)');
{
  const rawProperty = {
    id: 'prop-semantica',
    purpose: 'Venda',
    propertyType: 'Casa',
    status: 'Disponível',
    city: 'Criciúma',
    neighborhood: 'Michel',
    price: 700000,
    suites: 2,
    otherBedrooms: 2, // Total 4 dormitórios
    otherBathrooms: 1, // Total 3 banheiros (2 suítes + 1 social)
    active: true,
  };

  const normalized = normalizeProperty(rawProperty);

  assert(normalized.suites === 2, 'Suítes = 2');
  assert(normalized.otherBedrooms === 2, 'Outros quartos = 2');
  assert(normalized.bedrooms === 4, 'Total calculado dormitórios = 4');
  assert(normalized.otherBathrooms === 1, 'Outros banheiros = 1');
  assert(normalized.bathrooms === 3, 'Total calculado banheiros = 3 (2 das suítes + 1 outro)');
}

console.log('\n' + '='.repeat(70));
console.log(`RESULTADO FINAL DA SUÍTE FASE 5.0.1: ${passed} passaram, ${failed} falharam.`);
console.log('='.repeat(70));

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
