import { prisma } from './src/lib/db.ts';
import { calculateMatch } from './src/lib/matching/engine.ts';
import { MATCH_CONFIG, MATCH_THRESHOLD, isMatch } from './src/lib/matching/config.ts';
import { recalculateMatchesForSearch } from './src/lib/matching/service.ts';
import { parseSearchCriteria, normalizeProperty } from './src/lib/matching/normalizer.ts';
import {
  isPlausibleTravelTimeCandidate,
  getDrivingDistanceAndDuration,
  getRoutingMetrics,
  clearRoutingCache,
  resetRoutingMetrics,
} from './src/lib/geo/routing.ts';

async function runTests() {
  console.log('====================================================');
  console.log('TESTES OBRIGATÓRIOS FASE 5.2.1 — TEMPO DE DESLOCAMENTO (CARRO)');
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

  // Ponto de Origem: Praça Nereu Ramos, Criciúma - SC
  const origin = {
    lat: -28.6775,
    lon: -49.3700,
  };

  // ========================================================
  // TESTE A: DENTRO DO TEMPO
  // ========================================================
  console.log('--- TESTE A: CANDIDATO DENTRO DO TEMPO ---');
  const searchA = {
    id: 'search-test-a',
    userId: 'test-user',
    purpose: 'Venda',
    propertyTypes: ['Apartamento'],
    cities: ['Criciúma'],
    neighborhoods: [],
    minPrice: 0,
    maxPrice: 600000,
    minBedrooms: 2,
    minSuites: 0,
    minParkingSpaces: 1,
    minArea: 0,
    locationStrategy: 'TRAVEL_TIME',
    searchLatitude: origin.lat,
    searchLongitude: origin.lon,
    maxTravelTimeMinutes: 15,
    travelMode: 'DRIVING',
    active: true,
  };

  const offerWithinTime = {
    id: 'prop-within',
    offerType: 'PROPERTY',
    propertyType: 'Apartamento',
    purpose: 'Venda',
    city: 'Criciúma',
    neighborhood: 'Centro',
    latitude: -28.6750,
    longitude: -49.3680,
    price: 450000,
    bedrooms: 2,
    suites: 1,
    parkingSpaces: 1,
    privateArea: 75,
    active: true,
    travelDurationSeconds: 480, // 8 minutos de carro
    travelDistanceMeters: 4200,
  };

  const resultA = calculateMatch(searchA, offerWithinTime);
  assert(resultA.eligible === true, 'Candidato com 8 min (limite 15 min) é elegível');
  assert(resultA.score >= MATCH_THRESHOLD, `Score é ${resultA.score}% (>= ${MATCH_THRESHOLD}%)`);
  assert(isMatch(resultA.score, resultA.eligible), 'Constitui Match válido');

  const locExplanationA = resultA.explanation.find((e) => e.category === 'location');
  assert(locExplanationA && locExplanationA.status === 'positive', 'Explicação territorial positiva');
  assert(locExplanationA.pointsAwarded === 25, 'Recebeu 25 pontos integrais de localização');
  assert(locExplanationA.detail.includes('Tempo estimado de carro: 8 min — limite de 15 min'), 'Detalhe informa tempo e limite');
  assert(locExplanationA.detail.includes('Estimativa baseada na rede viária; não considera trânsito em tempo real.'), 'Contém disclaimer oficial de trânsito');

  // ========================================================
  // TESTE B: EXATAMENTE NO LIMITE
  // ========================================================
  console.log('\n--- TESTE B: CANDIDATO EXATAMENTE NO LIMITE ---');
  const offerExactlyOnLimit = {
    ...offerWithinTime,
    id: 'prop-limit',
    travelDurationSeconds: 15 * 60, // 15 minutos exatos
  };

  const resultB = calculateMatch(searchA, offerExactlyOnLimit);
  assert(resultB.eligible === true, 'Candidato com exatamente 15 min é elegível');
  assert(resultB.score >= MATCH_THRESHOLD, `Score no limite é ${resultB.score}%`);
  assert(isMatch(resultB.score, resultB.eligible), 'Constitui Match válido no limite exato');

  // ========================================================
  // TESTE C: ACIMA DO LIMITE
  // ========================================================
  console.log('\n--- TESTE C: CANDIDATO ACIMA DO LIMITE ---');
  const offerAboveLimit = {
    ...offerWithinTime,
    id: 'prop-above',
    travelDurationSeconds: 16 * 60, // 16 minutos (limite 15 min)
  };

  const resultC = calculateMatch(searchA, offerAboveLimit);
  assert(resultC.eligible === false, 'Candidato com 16 min (limite 15 min) é inelegível (Hard Filter)');
  assert(resultC.score === 0, 'Score zerado pelo Hard Filter territorial');
  assert(!isMatch(resultC.score, resultC.eligible), 'Não constitui Match');
  assert(resultC.reasons.some((r) => r.includes('Tempo de deslocamento excedido')), 'Motivo lista tempo excedido');

  // ========================================================
  // TESTE D: SEM COORDENADAS
  // ========================================================
  console.log('\n--- TESTE D: CANDIDATO SEM COORDENADAS ---');
  const offerNoCoords = {
    ...offerWithinTime,
    id: 'prop-no-coords',
    latitude: null,
    longitude: null,
    travelDurationSeconds: null,
  };

  const resultD = calculateMatch(searchA, offerNoCoords);
  assert(resultD.eligible === false, 'Candidato sem coordenadas é inelegível na busca por tempo');
  assert(resultD.score === 0, 'Score 0');
  assert(resultD.reasons.some((r) => r.includes('sem coordenadas')), 'Motivo lista ausência de coordenadas');

  // ========================================================
  // TESTE E: FALHA GEOBASE / SEM DURAÇÃO CALCULADA
  // ========================================================
  console.log('\n--- TESTE E: FALHA GEOBASE / ROTA INDISPONÍVEL ---');
  const offerFailedRoute = {
    ...offerWithinTime,
    id: 'prop-failed-route',
    travelDurationSeconds: null, // Provedor falhou ou retornou inválido
  };

  const resultE = calculateMatch(searchA, offerFailedRoute);
  assert(resultE.eligible === false, 'Oferta cuja rota falhou é tratada de forma segura como inelegível');
  assert(resultE.score === 0, 'Score seguro 0');
  assert(resultE.reasons.some((r) => r.includes('Tempo de deslocamento indisponível')), 'Informa indisponibilidade viária');

  // ========================================================
  // TESTE F: CACHE CENTRALIZADO
  // ========================================================
  console.log('\n--- TESTE F: CACHE CENTRALIZADO ---');
  clearRoutingCache();
  resetRoutingMetrics();

  // Primeira chamada: vai para a GeoBase
  const route1 = await getDrivingDistanceAndDuration(
    origin.lat,
    origin.lon,
    -28.6750,
    -49.3680
  );
  assert(route1.success === true, 'Primeira consulta de rota bem-sucedida');
  assert(route1.fromCache === false, 'Primeira chamada veio da API (fromCache: false)');

  // Segunda chamada com as mesmas coordenadas normalizadas: DEVE vir do cache
  const route2 = await getDrivingDistanceAndDuration(
    origin.lat,
    origin.lon,
    -28.6750,
    -49.3680
  );
  assert(route2.success === true, 'Segunda consulta idêntica bem-sucedida');
  assert(route2.fromCache === true, 'Segunda consulta atendida pelo Cache em memória');
  assert(route2.durationSeconds === route1.durationSeconds, 'Duração consistente entre chamada e cache');

  const metricsF = getRoutingMetrics();
  assert(metricsF.cacheHits >= 1, `Métricas registram cache hit (hits: ${metricsF.cacheHits})`);
  assert(metricsF.apiCallsMade === 1, `Apenas 1 chamada HTTP feita à GeoBase (calls: ${metricsF.apiCallsMade})`);

  // ========================================================
  // TESTE G: PRÉ-FILTRO LOCAL CONSERVADOR
  // ========================================================
  console.log('\n--- TESTE G: PRÉ-FILTRO LOCAL CONSERVADOR ---');
  // Coordenada em Florianópolis (~150 km de Criciúma)
  const farLat = -27.5954;
  const farLon = -48.5480;

  // Para 15 minutos a 120km/h (+25% margem = 2.500m/min * 15 = 37,5 km)
  // Florianópolis (~150 km) DEVE ser rejeitado pelo pré-filtro sem chamar a GeoBase
  const isPlausibleFar = isPlausibleTravelTimeCandidate(origin.lat, origin.lon, farLat, farLon, 15);
  assert(isPlausibleFar === false, 'Destino a 150 km rejeitado pelo pré-filtro local para 15 min');

  // Coordenada próxima (Bairro Michel, Criciúma ~ 1,5 km)
  const closeLat = -28.6820;
  const closeLon = -49.3780;
  const isPlausibleClose = isPlausibleTravelTimeCandidate(origin.lat, origin.lon, closeLat, closeLon, 15);
  assert(isPlausibleClose === true, 'Destino próximo a 1,5 km aprovado pelo pré-filtro');

  // ========================================================
  // TESTE H: PERSISTÊNCIA NO BANCO DE DADOS
  // ========================================================
  console.log('\n--- TESTE H: PERSISTÊNCIA NO BANCO DE DADOS ---');
  const user = await prisma.user.findFirst();
  assert(Boolean(user), `Usuário encontrado no banco: ${user?.email}`);

  let testClient = await prisma.client.findFirst({ where: { userId: user.id } });
  if (!testClient) {
    testClient = await prisma.client.create({
      data: {
        userId: user.id,
        name: 'Cliente Teste Fase 5.2.1',
        phone: '48999991234',
      },
    });
  }

  // Cria uma busca com TRAVEL_TIME
  const createdSearch = await prisma.search.create({
    data: {
      userId: user.id,
      clientId: testClient.id,
      name: 'Busca 15 Min Carro Teste',
      purpose: 'Venda',
      propertyTypes: JSON.stringify(['Apartamento']),
      cities: JSON.stringify(['Criciúma']),
      neighborhoods: JSON.stringify([]),
      maxPrice: 800000,
      active: true,
      locationStrategy: 'TRAVEL_TIME',
      searchLatitude: origin.lat,
      searchLongitude: origin.lon,
      maxTravelTimeMinutes: 15,
      travelMode: 'DRIVING',
    },
  });

  assert(Boolean(createdSearch.id), 'Busca criada no banco com sucesso');

  // Recarrega do banco
  const reloadedSearch = await prisma.search.findUnique({
    where: { id: createdSearch.id },
  });

  assert(reloadedSearch.locationStrategy === 'TRAVEL_TIME', 'locationStrategy = "TRAVEL_TIME" persistido');
  assert(reloadedSearch.maxTravelTimeMinutes === 15, 'maxTravelTimeMinutes = 15 persistido');
  assert(reloadedSearch.travelMode === 'DRIVING', 'travelMode = "DRIVING" persistido');
  assert(Math.abs(reloadedSearch.searchLatitude - origin.lat) < 0.0001, 'searchLatitude persistido');
  assert(Math.abs(reloadedSearch.searchLongitude - origin.lon) < 0.0001, 'searchLongitude persistido');

  // Normalização
  const parsedCriteria = parseSearchCriteria(reloadedSearch);
  assert(parsedCriteria.locationStrategy === 'TRAVEL_TIME', 'normalizer identifica TRAVEL_TIME');
  assert(parsedCriteria.maxTravelTimeMinutes === 15, 'normalizer extrai maxTravelTimeMinutes');

  // ========================================================
  // TESTE I: RECALCULAR MATCHES PARA A BUSCA
  // ========================================================
  console.log('\n--- TESTE I: RECALCULO DE MATCHES VIA SERVICE ---');
  const matchCount = await recalculateMatchesForSearch(createdSearch.id);
  console.log(`  Matches calculados para a busca por tempo: ${matchCount}`);

  const matchesInDb = await prisma.match.findMany({
    where: { searchId: createdSearch.id },
  });

  assert(matchesInDb.length === matchCount, 'Matches persistidos batem com contagem retornada');
  for (const m of matchesInDb) {
    assert(m.score >= MATCH_THRESHOLD, `Match id ${m.id} tem score ${m.score} >= ${MATCH_THRESHOLD}`);
    const explanation = JSON.parse(m.explanation);
    const locItem = explanation.find((e) => e.category === 'location');
    assert(Boolean(locItem), 'Match contém item de localização na explicação');
    assert(locItem.detail.includes('Estimativa baseada na rede viária; não considera trânsito em tempo real.'),
      'Explicação contém disclaimer de trânsito viário');
  }

  // ========================================================
  // TESTE J: MUDANÇA DE ESTRATÉGIA SEM DADOS RESIDUAIS
  // ========================================================
  console.log('\n--- TESTE J: TRANSIÇÃO DE ESTRATÉGIA ---');
  // Altera para RADIUS
  const updatedToRadius = await prisma.search.update({
    where: { id: createdSearch.id },
    data: {
      locationStrategy: 'RADIUS',
      searchRadiusMeters: 3000,
    },
  });
  const criteriaRadius = parseSearchCriteria(updatedToRadius);
  assert(criteriaRadius.locationStrategy === 'RADIUS', 'Estratégia alterada para RADIUS');

  // Altera para NEIGHBORHOODS
  const updatedToNeigh = await prisma.search.update({
    where: { id: createdSearch.id },
    data: {
      locationStrategy: 'NEIGHBORHOODS',
      neighborhoods: JSON.stringify(['Centro', 'Pio Corrêa']),
    },
  });
  const criteriaNeigh = parseSearchCriteria(updatedToNeigh);
  assert(criteriaNeigh.locationStrategy === 'NEIGHBORHOODS', 'Estratégia alterada para NEIGHBORHOODS');

  // Limpeza
  await prisma.match.deleteMany({ where: { searchId: createdSearch.id } });
  await prisma.search.delete({ where: { id: createdSearch.id } });
  console.log('  Registro de teste limpo com sucesso.');

  console.log('\n====================================================');
  console.log(`RESULTADO DOS TESTES: ${passed} / ${total} PASSARAM`);
  console.log('====================================================');

  if (passed === total) {
    console.log('🎉 TODOS OS TESTES DA FASE 5.2.1 PASSARAM COM SUCESSO!\n');
  } else {
    console.error('❌ ALGUNS TESTES FALHARAM.\n');
    process.exit(1);
  }
}

runTests()
  .catch((err) => {
    console.error('Erro fatal nos testes:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
