// test-phase3.mjs - Automated Verification for Fase 3 Matching Engine

import { calculateMatch } from './src/lib/matching/engine.ts';
import { MATCH_CONFIG } from './src/lib/matching/config.ts';
import { normalizeProperty, normalizeTypology, parseSearchCriteria } from './src/lib/matching/normalizer.ts';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAILED: ${message}`);
    failed++;
  }
}

console.log('====================================================');
console.log('SUÍTE DE TESTES AUTOMATIZADOS — FASE 3 (MATCHING)');
console.log('====================================================\n');

// Base test search
const baseSearch = {
  id: 'search-1',
  userId: 'user-1',
  clientId: 'client-1',
  name: 'Apartamento Centro 3 Dorms',
  purpose: 'Venda',
  propertyTypes: ['Apartamento'],
  cities: ['Criciúma'],
  neighborhoods: ['Centro'],
  minPrice: 500000,
  maxPrice: 700000,
  minBedrooms: 3,
  minSuites: 1,
  minParkingSpaces: 2,
  minArea: 80,
  active: true,
};

// Base test offer
const baseOffer = {
  id: 'prop-1',
  offerType: 'PROPERTY',
  propertyId: 'prop-1',
  title: 'Apartamento Alto Padrão - Centro',
  propertyType: 'Apartamento',
  purpose: 'Venda',
  status: 'Disponível',
  price: 650000,
  bedrooms: 3,
  suites: 1,
  bathrooms: 2,
  parkingSpaces: 2,
  privateArea: 85,
  totalArea: 110,
  city: 'Criciúma',
  neighborhood: 'Centro',
  address: 'Rua Coronel Pedro Benedet, 100',
  latitude: -28.678,
  longitude: -49.370,
  imageUrl: null,
  stage: 'Pronto',
  developer: null,
  developmentName: null,
  active: true,
};

// 1. Match Perfeito
console.log('1. Teste: Match Perfeito');
const res1 = calculateMatch(baseSearch, baseOffer);
assert(res1.eligible === true, 'Deve ser elegível');
assert(res1.score === 100, `Score deve ser 100 (obtido: ${res1.score})`);
assert(res1.explanation.length > 0, 'Deve gerar lista explicativa');

// 2. Bairro Diferente
console.log('\n2. Teste: Bairro Diferente (Mesma Cidade)');
const offerDiffNeigh = { ...baseOffer, neighborhood: 'Comerciário' };
const res2 = calculateMatch(baseSearch, offerDiffNeigh);
assert(res2.eligible === true, 'Deve ser elegível');
assert(res2.score === 85, `Score deve ser 85 (penalização de 15 pontos no bairro, obtido: ${res2.score})`);
assert(
  res2.explanation.some((e) => e.category === 'location' && e.status === 'warning'),
  'Explicação deve indicar aviso de bairro alternativo'
);

// 3. Pouco Acima do Orçamento (<= 5%)
console.log('\n3. Teste: Pouco Acima do Orçamento (<= 5%)');
const offerSlightlyOver = { ...baseOffer, price: 720000 }; // 2.85% acima do teto de 700k
const res3 = calculateMatch(baseSearch, offerSlightlyOver);
assert(res3.eligible === true, 'Deve continuar elegível como oportunidade');
assert(res3.score === 91, `Score deve ser 91 (obtido: ${res3.score})`);
assert(
  res3.explanation.some((e) => e.category === 'price' && e.status === 'warning' && e.detail.includes('contraproposta')),
  'Explicação deve alertar sobre valor ligeiramente acima do orçamento'
);

// 4. Muito Acima do Orçamento
console.log('\n4. Teste: Muito Acima do Orçamento');
const offerOver10Pct = { ...baseOffer, price: 800000 }; // > 10%
const res4 = calculateMatch(baseSearch, offerOver10Pct);
assert(res4.eligible === false, 'Acima de 10% do teto deve ser eliminado por hard filter');
assert(res4.score === 0, `Score deve ser 0 (obtido: ${res4.score})`);

const offer7to10Pct = { ...baseOffer, price: 750000 }; // ~7.1% acima
const res4b = calculateMatch(baseSearch, offer7to10Pct);
assert(res4b.eligible === true, 'Entre 5% e 10% ainda é elegível com penalização maior');
assert(res4b.score === 83, `Score entre 5% e 10% deve ser 83 (obtido: ${res4b.score})`);

// 5. Dormitórios Insuficientes
console.log('\n5. Teste: Dormitórios Insuficientes');
const offer2Beds = { ...baseOffer, bedrooms: 2 }; // 1 a menos
const res5 = calculateMatch(baseSearch, offer2Beds);
assert(res5.score === 90, `1 dorm a menos penaliza 10 pontos: score 90 (obtido: ${res5.score})`);
assert(
  res5.explanation.some((e) => e.category === 'bedrooms' && e.status === 'warning'),
  'Explicação deve indicar aviso de déficit de dormitório'
);

const offer1Bed = { ...baseOffer, bedrooms: 1 }; // 2 a menos
const res5b = calculateMatch(baseSearch, offer1Bed);
assert(res5b.score === 85, `2 dorms a menos penaliza 15 pontos: score 85 (obtido: ${res5b.score})`);

// 6. Suítes Insuficientes
console.log('\n6. Teste: Suítes Insuficientes');
const search2Suites = { ...baseSearch, minSuites: 2 };
const offer1Suite = { ...baseOffer, suites: 1 };
const res6 = calculateMatch(search2Suites, offer1Suite);
assert(res6.score === 93, `1 suíte a menos penaliza 7 pontos: score 93 (obtido: ${res6.score})`);

// 7. Vagas Insuficientes
console.log('\n7. Teste: Vagas Insuficientes');
const offer1Parking = { ...baseOffer, parkingSpaces: 1 };
const res7 = calculateMatch(baseSearch, offer1Parking);
assert(res7.score === 93, `1 vaga a menos penaliza 7 pontos: score 93 (obtido: ${res7.score})`);

// 8. Área Abaixo do Mínimo
console.log('\n8. Teste: Área Abaixo do Mínimo');
const offerNearArea = { ...baseOffer, privateArea: 75 }; // min 80 -> 75 is >= 90% (72)
const res8 = calculateMatch(baseSearch, offerNearArea);
assert(res8.score === 95, `Área próxima penaliza 5 pontos: score 95 (obtido: ${res8.score})`);

const offerFarArea = { ...baseOffer, privateArea: 60 }; // < 90%
const res8b = calculateMatch(baseSearch, offerFarArea);
assert(res8b.score === 90, `Área muito abaixo penaliza 10 pontos: score 90 (obtido: ${res8b.score})`);

// 9. Critério Opcional Vazio
console.log('\n9. Teste: Critérios Opcionais Não Informados na Busca');
const searchOpen = {
  ...baseSearch,
  neighborhoods: [],
  minBedrooms: 0,
  minSuites: 0,
  minParkingSpaces: 0,
  minArea: null,
};
const res9 = calculateMatch(searchOpen, baseOffer);
assert(res9.score === 100, `Critérios não preenchidos não devem penalizar: score 100 (obtido: ${res9.score})`);

// 10. Finalidade Incompatível
console.log('\n10. Teste: Finalidade Incompatível');
const searchRent = { ...baseSearch, purpose: 'Locação' };
const res10 = calculateMatch(searchRent, baseOffer);
assert(res10.eligible === false, 'Finalidade diferente deve ser eliminada por hard filter');
assert(res10.score === 0, `Score deve ser 0 (obtido: ${res10.score})`);

// 11. Tipo Obrigatório Incompatível
console.log('\n11. Teste: Tipo de Imóvel Incompatível');
const searchHouse = { ...baseSearch, propertyTypes: ['Casa'] };
const res11 = calculateMatch(searchHouse, baseOffer);
assert(res11.eligible === false, 'Tipo diferente do solicitado deve ser eliminado');
assert(res11.score === 0, `Score deve ser 0 (obtido: ${res11.score})`);

// 12. Cidade Obrigatória Incompatível
console.log('\n12. Teste: Cidade Incompatível');
const offerAnotherCity = { ...baseOffer, city: 'Içara' };
const res12 = calculateMatch(baseSearch, offerAnotherCity);
assert(res12.eligible === false, 'Cidade diferente das solicitadas deve ser eliminada');
assert(res12.score === 0, `Score deve ser 0 (obtido: ${res12.score})`);

// 13. Imóvel Convencional Normalizado
console.log('\n13. Teste: Imóvel Convencional Normalizado');
const rawProperty = {
  id: 'prop-norm',
  title: 'Casa no Morro Estêvão',
  propertyType: 'Casa',
  purpose: 'Venda',
  status: 'Disponível',
  price: 900000,
  bedrooms: 4,
  suites: 2,
  bathrooms: 3,
  parkingSpaces: 3,
  privateArea: 250,
  totalArea: 400,
  city: 'Criciúma',
  neighborhood: 'Morro Estêvão',
  images: [{ url: '/img1.jpg', isCover: true }],
};
const normProp = normalizeProperty(rawProperty);
assert(normProp.offerType === 'PROPERTY', 'Tipo de oferta deve ser PROPERTY');
assert(normProp.title === 'Casa no Morro Estêvão', 'Título preservado');
assert(normProp.active === true, 'Imóvel disponível deve ser ativo');

// 14. Tipologia de Empreendimento Normalizada
console.log('\n14. Teste: Tipologia de Empreendimento Normalizada');
const rawDev = {
  id: 'dev-1',
  name: 'Residencial Aurora',
  developer: 'Construtora Fontana',
  stage: 'Em construção',
  status: 'Ativo',
  city: 'Criciúma',
  neighborhood: 'Centro',
  address: 'Rua São José, 500',
  images: [{ url: '/dev-cover.jpg', isCover: true }],
};
const rawTypo = {
  id: 'typo-1',
  name: 'Planta Tipo A (3 dormitórios)',
  propertyType: 'Apartamento',
  price: 680000,
  bedrooms: 3,
  suites: 1,
  bathrooms: 2,
  parkingSpaces: 2,
  privateArea: 94,
  status: 'Disponível',
};
const normTypo = normalizeTypology(rawTypo, rawDev);
assert(normTypo.offerType === 'TYPOLOGY', 'Tipo de oferta deve ser TYPOLOGY');
assert(normTypo.title.includes('Residencial Aurora'), 'Título inclui nome do empreendimento');
assert(normTypo.stage === 'Em construção', 'Estágio do empreendimento preservado');
assert(normTypo.city === 'Criciúma', 'Cidade herdada do empreendimento');
assert(normTypo.neighborhood === 'Centro', 'Bairro herdado do empreendimento');

const res14 = calculateMatch(baseSearch, normTypo);
assert(res14.eligible === true, 'Tipologia compatível deve ser elegível na mesma engine');
assert(res14.score === 100, `Score da tipologia perfeita deve ser 100 (obtido: ${res14.score})`);

// 15. Empreendimento com Múltiplas Tipologias (Diferenciação de Scores)
console.log('\n15. Teste: Empreendimento com Múltiplas Tipologias');
const rawTypo2Beds = {
  id: 'typo-2',
  name: 'Planta Tipo B (2 dormitórios)',
  propertyType: 'Apartamento',
  price: 520000,
  bedrooms: 2,
  suites: 1,
  bathrooms: 1,
  parkingSpaces: 1,
  privateArea: 68,
  status: 'Disponível',
};
const normTypo2Beds = normalizeTypology(rawTypo2Beds, rawDev);
const res15_3beds = calculateMatch(baseSearch, normTypo);
const res15_2beds = calculateMatch(baseSearch, normTypo2Beds);

assert(res15_3beds.score === 100, `Tipologia 3 dorms atinge 100 (obtido: ${res15_3beds.score})`);
assert(res15_2beds.score < 100, `Tipologia 2 dorms tem score menor por defasagem (obtido: ${res15_2beds.score})`);
assert(res15_3beds.score !== res15_2beds.score, 'Múltiplas tipologias devem produzir resultados distintos e independentes');

// 16. Oferta Inativa
console.log('\n16. Teste: Oferta Inativa');
const inactiveOffer = { ...baseOffer, active: false };
const res16 = calculateMatch(baseSearch, inactiveOffer);
assert(res16.eligible === false, 'Oferta inativa não pode aparecer como oportunidade');
assert(res16.score === 0, `Score deve ser 0 (obtido: ${res16.score})`);

// 17. Busca Inativa
console.log('\n17. Teste: Busca Inativa');
const inactiveSearch = { ...baseSearch, active: false };
const res17 = calculateMatch(inactiveSearch, baseOffer);
assert(res17.eligible === false, 'Busca inativa não pode gerar oportunidade');
assert(res17.score === 0, `Score deve ser 0 (obtido: ${res17.score})`);

// 18. Determinismo Estrito (Execução Repetida)
console.log('\n18. Teste: Determinismo Estrito');
const scores = [];
for (let i = 0; i < 50; i++) {
  const r = calculateMatch(baseSearch, offerSlightlyOver);
  scores.push(r.score);
}
const allEqual = scores.every((s) => s === scores[0]);
assert(allEqual === true, `50 execuções idênticas devem produzir exatamente o mesmo score (${scores[0]})`);

console.log('\n====================================================');
console.log(`RESULTADO FINAL: ${passed} passaram, ${failed} falharam.`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
