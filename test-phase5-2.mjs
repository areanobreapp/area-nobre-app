import { prisma } from './src/lib/db.ts';
import { calculateMatch, formatDistance } from './src/lib/matching/engine.ts';
import { MATCH_CONFIG, MATCH_THRESHOLD, isMatch } from './src/lib/matching/config.ts';
import { normalizeBrazilianPhone, getWhatsAppUrl } from './src/lib/whatsapp.ts';
import { recalculateMatchesForSearch } from './src/lib/matching/service.ts';
import { parseSearchCriteria, normalizeProperty } from './src/lib/matching/normalizer.ts';

async function runTests() {
  console.log('====================================================');
  console.log('TESTES OBRIGATÓRIOS FASE 5.2 — ÁREA NOBRE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✕ FAIL: ${message}`);
      process.exitCode = 1;
    }
  }

  // ========================================================
  // TESTE 1: WHATSAPP E NORMALIZAÇÃO DE TELEFONE (Req. 10, 11, 21)
  // ========================================================
  console.log('--- TESTE 1: NORMALIZAÇÃO DE TELEFONE E WHATSAPP ---');

  // 1. Telefone brasileiro formatado com parênteses e hífen
  const phoneFormatted = normalizeBrazilianPhone('(48) 99999-1234');
  assert(phoneFormatted === '5548999991234', `Telefone formatado "(48) 99999-1234" -> "${phoneFormatted}"`);

  const urlFormatted = getWhatsAppUrl('(48) 99999-1234');
  assert(urlFormatted === 'https://wa.me/5548999991234', `URL WhatsApp formatada -> "${urlFormatted}"`);

  // 2. Telefone sem formatação (apenas dígitos)
  const phonePlain = normalizeBrazilianPhone('48999991234');
  assert(phonePlain === '5548999991234', `Telefone sem formatação "48999991234" -> "${phonePlain}"`);

  // 3. Telefone com +55 já incluído
  const phonePlus55 = normalizeBrazilianPhone('+55 (48) 99999-1234');
  assert(phonePlus55 === '5548999991234', `Telefone com +55 "+55 (48) 99999-1234" -> "${phonePlus55}"`);

  // 4. Telefone fixo brasileiro (10 dígitos)
  const phoneLandline = normalizeBrazilianPhone('(48) 3433-1234');
  assert(phoneLandline === '554834331234', `Telefone fixo "(48) 3433-1234" -> "${phoneLandline}"`);

  // 5. Ausência de telefone (null / undefined / vazio)
  assert(normalizeBrazilianPhone(null) === null, 'Telefone null retorna null');
  assert(normalizeBrazilianPhone(undefined) === null, 'Telefone undefined retorna null');
  assert(normalizeBrazilianPhone('') === null, 'Telefone vazio "" retorna null');
  assert(getWhatsAppUrl(null) === null, 'getWhatsAppUrl(null) retorna null');

  // 6. Telefone inválido (menos de 10 dígitos ou repetidos)
  assert(normalizeBrazilianPhone('12345') === null, 'Telefone curto "12345" retorna null');
  assert(normalizeBrazilianPhone('0000000000') === null, 'Telefone trivial "0000000000" retorna null');
  assert(normalizeBrazilianPhone('abc-def') === null, 'Texto sem dígitos retorna null');

  // 7. Confirmação de que nenhum dado interno da Busca é enviado automaticamente
  const pureUrl = getWhatsAppUrl('(48) 99999-1234');
  assert(!pureUrl.includes('price') && !pureUrl.includes('search') && !pureUrl.includes('match'),
    'Link do WhatsApp não expõe dados internos da busca');

  // ========================================================
  // TESTE 2: THRESHOLD CENTRALIZADO DE 70% (Req. 13, 14, 20)
  // ========================================================
  console.log('\n--- TESTE 2: THRESHOLD CENTRALIZADO DE 70% ---');

  assert(MATCH_THRESHOLD === 70, `MATCH_THRESHOLD centralizado é 70 (atual: ${MATCH_THRESHOLD})`);
  assert(MATCH_CONFIG.MATCH_THRESHOLD === 70, `MATCH_CONFIG.MATCH_THRESHOLD é 70`);

  // Validações obrigatórias: 69, 69.99, 70, 70.01, 100
  assert(isMatch(69, true) === false, 'Score 69 elegível -> NÃO Match');
  assert(isMatch(69.99, true) === false, 'Score 69.99 elegível -> NÃO Match');
  assert(isMatch(70, true) === true, 'Score 70 elegível -> MATCH');
  assert(isMatch(70.01, true) === true, 'Score 70.01 elegível -> MATCH');
  assert(isMatch(100, true) === true, 'Score 100 elegível -> MATCH');
  assert(isMatch(75, false) === false, 'Score 75 com eligible=false (hard filter) -> NÃO Match');
  assert(isMatch(100, false) === false, 'Score 100 com eligible=false -> NÃO Match');

  // ========================================================
  // TESTE 3: BUSCA POR RAIO — OFERTAS A, B, C, D (Req. 5, 6, 9, 19)
  // ========================================================
  console.log('\n--- TESTE 3: MATCHING GEOGRÁFICO POR RAIO ---');

  // Ponto de referência X: Praça Nereu Ramos, Criciúma - SC
  const pointX = {
    lat: -28.6775,
    lng: -49.3700,
    radiusMeters: 2000, // 2 km
  };

  const baseSearchCriteria = {
    id: 'test-search-radius',
    userId: 'test-user',
    purpose: 'Venda',
    propertyTypes: ['Apartamento'],
    cities: ['Criciúma'],
    neighborhoods: [],
    minPrice: 300000,
    maxPrice: 600000,
    minBedrooms: 2,
    minSuites: 1,
    minParkingSpaces: 1,
    minArea: 70,
    active: true,
    locationStrategy: 'RADIUS',
    searchLatitude: pointX.lat,
    searchLongitude: pointX.lng,
    searchRadiusMeters: pointX.radiusMeters,
  };

  // Coordenadas calculadas rigorosamente a partir de pointX:
  // 1 grau lat ≈ 111.139 km = 111,139 m
  const deltaLat500m = -500 / 111139; // ~ -0.004499
  const deltaLat1900m = -1900 / 111139; // ~ -0.017096
  const deltaLat2100m = -2100 / 111139; // ~ -0.018895

  // Oferta A: ~ 500 m do ponto X
  const offerA = {
    id: 'offer-a-500m',
    title: 'Apto A - 500m',
    propertyType: 'Apartamento',
    purpose: 'Venda',
    status: 'Disponível',
    active: true,
    city: 'Criciúma',
    neighborhood: 'Centro',
    price: 450000,
    bedrooms: 2,
    suites: 1,
    parkingSpaces: 1,
    privateArea: 75,
    latitude: pointX.lat + deltaLat500m,
    longitude: pointX.lng,
    offerType: 'PROPERTY',
  };

  // Oferta B: ~ 1,9 km do ponto X (dentro de 2 km)
  const offerB = {
    id: 'offer-b-1900m',
    title: 'Apto B - 1.9km',
    propertyType: 'Apartamento',
    purpose: 'Venda',
    status: 'Disponível',
    active: true,
    city: 'Criciúma',
    neighborhood: 'Michel',
    price: 480000,
    bedrooms: 2,
    suites: 1,
    parkingSpaces: 1,
    privateArea: 80,
    latitude: pointX.lat + deltaLat1900m,
    longitude: pointX.lng,
    offerType: 'PROPERTY',
  };

  // Oferta C: ~ 2,1 km do ponto X (fora de 2 km)
  const offerC = {
    id: 'offer-c-2100m',
    title: 'Apto C - 2.1km',
    propertyType: 'Apartamento',
    purpose: 'Venda',
    status: 'Disponível',
    active: true,
    city: 'Criciúma',
    neighborhood: 'Próspera',
    price: 420000,
    bedrooms: 2,
    suites: 1,
    parkingSpaces: 1,
    privateArea: 75,
    latitude: pointX.lat + deltaLat2100m,
    longitude: pointX.lng,
    offerType: 'PROPERTY',
  };

  // Oferta D: Sem coordenadas geográficas
  const offerD = {
    id: 'offer-d-nocoords',
    title: 'Apto D - Sem Coordenadas',
    propertyType: 'Apartamento',
    purpose: 'Venda',
    status: 'Disponível',
    active: true,
    city: 'Criciúma',
    neighborhood: 'Centro',
    price: 400000,
    bedrooms: 2,
    suites: 1,
    parkingSpaces: 1,
    privateArea: 75,
    latitude: null,
    longitude: null,
    offerType: 'PROPERTY',
  };

  // Testando Oferta A (500m)
  const matchA = calculateMatch(baseSearchCriteria, offerA);
  assert(matchA.eligible === true, `Oferta A (500 m) é geograficamente ELEGÍVEL (Score: ${matchA.score}%)`);
  assert(matchA.score >= MATCH_THRESHOLD, `Oferta A (500 m) atinge threshold de Match (Score: ${matchA.score}% >= ${MATCH_THRESHOLD}%)`);
  const expA = matchA.explanation.find((e) => e.category === 'location');
  assert(expA && expA.detail.includes('500 m'), `Oferta A explicação de distância exata: "${expA?.detail}"`);

  // Testando Oferta B (1,9 km)
  const matchB = calculateMatch(baseSearchCriteria, offerB);
  assert(matchB.eligible === true, `Oferta B (1,9 km) é geograficamente ELEGÍVEL (Score: ${matchB.score}%)`);
  assert(matchB.score >= MATCH_THRESHOLD, `Oferta B (1,9 km) atinge threshold de Match (Score: ${matchB.score}% >= ${MATCH_THRESHOLD}%)`);
  const expB = matchB.explanation.find((e) => e.category === 'location');
  assert(expB && expB.detail.includes('1,9 km'), `Oferta B explicação de distância exata: "${expB?.detail}"`);

  // Testando Oferta C (2,1 km)
  const matchC = calculateMatch(baseSearchCriteria, offerC);
  assert(matchC.eligible === false, `Oferta C (2,1 km) é INELEGÍVEL pelo hard filter de raio (Score: ${matchC.score}%)`);
  assert(matchC.score === 0, `Oferta C fora do raio retorna score 0`);
  assert(matchC.reasons.some((r) => r.includes('Fora do raio') || r.includes('excedendo o raio')),
    `Oferta C razão de exclusão contém raio: "${matchC.reasons[0]}"`);

  // Testando Oferta D (sem coordenadas)
  const matchD = calculateMatch(baseSearchCriteria, offerD);
  assert(matchD.eligible === false, `Oferta D (sem coordenadas) é INELEGÍVEL quando busca exige raio (Score: ${matchD.score}%)`);
  assert(matchD.score === 0, `Oferta D sem coordenadas retorna score 0`);
  assert(matchD.reasons.some((r) => r.includes('sem coordenadas')),
    `Oferta D razão de exclusão aponta ausência de coordenadas: "${matchD.reasons[0]}"`);

  // ========================================================
  // TESTE 4: FORMATAÇÃO DE DISTÂNCIA (Req. 9)
  // ========================================================
  console.log('\n--- TESTE 4: FORMATAÇÃO DE DISTÂNCIAS ---');
  assert(formatDistance(500) === '500 m', `formatDistance(500) -> "500 m"`);
  assert(formatDistance(820) === '820 m', `formatDistance(820) -> "820 m"`);
  assert(formatDistance(1000) === '1 km', `formatDistance(1000) -> "1 km"`);
  assert(formatDistance(1900) === '1,9 km', `formatDistance(1900) -> "1,9 km"`);
  assert(formatDistance(2000) === '2 km', `formatDistance(2000) -> "2 km"`);
  assert(formatDistance(2100) === '2,1 km', `formatDistance(2100) -> "2,1 km"`);

  // ========================================================
  // TESTE 5: PERSISTÊNCIA NO BANCO DE DADOS (Req. 4, 19)
  // Save -> Reload -> Recalcular Matching
  // ========================================================
  console.log('\n--- TESTE 5: PERSISTÊNCIA NO BANCO DE DADOS (SAVE -> RELOAD -> RECALCULAR) ---');

  const daianeUser = await prisma.user.findFirst();
  assert(Boolean(daianeUser), `Usuário encontrado: ${daianeUser?.name}`);

  // Cria cliente de teste com telefone brasileiro formatado
  const clientTest = await prisma.client.create({
    data: {
      userId: daianeUser.id,
      name: 'Cliente Teste Fase 5.2',
      phone: '(48) 99876-5432',
    },
  });
  assert(Boolean(clientTest.id), `Cliente de teste criado com telefone ${clientTest.phone}`);

  // Cria imóvel de teste a 800m do ponto de teste
  const propertyTest = await prisma.property.create({
    data: {
      userId: daianeUser.id,
      title: 'Apartamento Teste Fase 5.2 - Dentro do Raio',
      purpose: 'Venda',
      propertyType: 'Apartamento',
      price: 490000,
      city: 'Criciúma',
      neighborhood: 'Pio Corrêa',
      address: 'Rua de Teste, 100',
      bedrooms: 3,
      suites: 1,
      bathrooms: 2,
      parkingSpaces: 2,
      privateArea: 90,
      latitude: pointX.lat - (800 / 111139), // 800 m ao sul
      longitude: pointX.lng,
      status: 'Disponível',
    },
  });
  assert(Boolean(propertyTest.id), `Imóvel criado a 800m do ponto de referência`);

  // Cria busca persistente com estratégia RADIUS
  const searchTest = await prisma.search.create({
    data: {
      userId: daianeUser.id,
      clientId: clientTest.id,
      name: 'Busca Raio 2km - Teste Fase 5.2',
      purpose: 'Venda',
      propertyTypes: JSON.stringify(['Apartamento']),
      cities: JSON.stringify(['Criciúma']),
      neighborhoods: JSON.stringify([]),
      minPrice: 300000,
      maxPrice: 600000,
      minBedrooms: 2,
      minSuites: 1,
      minParkingSpaces: 1,
      active: true,
      locationStrategy: 'RADIUS',
      searchLatitude: pointX.lat,
      searchLongitude: pointX.lng,
      searchRadiusMeters: pointX.radiusMeters,
      referenceAddress: 'Praça Nereu Ramos, Criciúma',
    },
  });
  assert(Boolean(searchTest.id), `Busca criada com locationStrategy='RADIUS' e raio=2000m`);

  // Reload do banco de dados
  const reloadedSearch = await prisma.search.findUnique({
    where: { id: searchTest.id },
  });
  assert(reloadedSearch?.locationStrategy === 'RADIUS', `Reload confirmou locationStrategy='${reloadedSearch?.locationStrategy}'`);
  assert(reloadedSearch?.searchLatitude === pointX.lat, `Reload confirmou searchLatitude=${reloadedSearch?.searchLatitude}`);
  assert(reloadedSearch?.searchLongitude === pointX.lng, `Reload confirmou searchLongitude=${reloadedSearch?.searchLongitude}`);
  assert(reloadedSearch?.searchRadiusMeters === 2000, `Reload confirmou searchRadiusMeters=${reloadedSearch?.searchRadiusMeters}`);

  // Recálculo formal de matches para a busca
  const matchesCount = await recalculateMatchesForSearch(searchTest.id);
  assert(matchesCount > 0, `Recálculo da busca gerou ${matchesCount} match(es)`);

  const createdMatches = await prisma.match.findMany({
    where: { searchId: searchTest.id },
  });

  const propertyMatch = createdMatches.find((m) => m.propertyId === propertyTest.id);
  assert(Boolean(propertyMatch), `O imóvel a 800m foi detectado como Match no banco`);
  assert(propertyMatch && propertyMatch.score >= MATCH_THRESHOLD,
    `Score do imóvel no banco é ${propertyMatch?.score}% (>= ${MATCH_THRESHOLD}%)`);

  // Verifica que todos os matches gravados no banco respeitam rigorosamente MATCH_THRESHOLD >= 70
  const anySub70 = createdMatches.some((m) => m.score < MATCH_THRESHOLD);
  assert(!anySub70, `Nenhum match com score < ${MATCH_THRESHOLD}% foi persistido no banco`);

  // Limpeza dos dados de teste
  await prisma.match.deleteMany({ where: { searchId: searchTest.id } });
  await prisma.search.delete({ where: { id: searchTest.id } });
  await prisma.property.delete({ where: { id: propertyTest.id } });
  await prisma.client.delete({ where: { id: clientTest.id } });
  console.log('  ✓ Dados de teste limpos com sucesso.');

  console.log('\n====================================================');
  console.log(`TOTAL DE ASSERTIVAS: ${total} | SUCESSOS: ${passed} | FALHAS: ${total - passed}`);
  console.log('====================================================\n');

  if (passed === total) {
    console.log('🎉 TODOS OS TESTES OBRIGATÓRIOS DA FASE 5.2 PASSARAM COM SUCESSO!');
  } else {
    process.exit(1);
  }
}

runTests()
  .catch((err) => {
    console.error('Erro na execução dos testes:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
