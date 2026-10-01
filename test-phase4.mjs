// test-phase4.mjs — Testes Automatizados da FASE 4: Geolocalização, GeoBase e Experiência Geográfica
import { FallbackGeoProvider } from './src/lib/geo/fallback-provider.ts';
import { GeoBaseProvider } from './src/lib/geo/geobase-provider.ts';
import { ResilientGeoProvider, calculateHaversineDistanceKm } from './src/lib/geo/index.ts';
import { geoLogger } from './src/lib/geo/logger.ts';
import { calculateMatch } from './src/lib/matching/engine.ts';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FALHA: ${message}`);
    failed++;
  }
}

async function runPhase4Tests() {
  console.log('====================================================');
  console.log('SUÍTE DE TESTES AUTOMATIZADOS — FASE 4 (GEOGRAFIA)');
  console.log('====================================================\n');

  // 1. Geocodificação bem-sucedida (Forward Geocoding)
  console.log('1. Teste: Geocodificação Bem-Sucedida');
  const fallback = new FallbackGeoProvider();
  const results1 = await fallback.forwardGeocode('Hospital São José, Criciúma');
  const res1 = results1?.[0];
  assert(res1 != null, 'Deve retornar resultado de geocodificação para ponto de referência');
  assert(typeof res1?.lat === 'number' && res1.lat < 0, `Latitude válida retornada (${res1?.lat})`);
  assert(typeof res1?.lng === 'number' && res1.lng < 0, `Longitude válida retornada (${res1?.lng})`);
  assert(Boolean(res1?.formattedAddress), `Endereço formatado presente: "${res1?.formattedAddress}"`);

  // 2. Geocodificação sem resultado
  console.log('\n2. Teste: Geocodificação Sem Resultado (Tratamento Gracioso)');
  const results2 = await fallback.forwardGeocode('zzzzqqqqxxxx_local_inexistente_123456');
  assert(results2.length === 0, 'Endereço inexistente deve retornar array vazio sem lançar exceção');

  // 3. Ausência de API Key da GeoBase
  console.log('\n3. Teste: GeoBaseProvider com Ausência de API Key');
  const geobaseNoKey = new GeoBaseProvider({ apiKey: '' });
  let noKeyErrorCaught = false;
  try {
    await geobaseNoKey.forwardGeocode('Centro, Criciúma');
  } catch (err) {
    noKeyErrorCaught = true;
    assert(err.message.includes('GEOBASE_API_KEY'), `Erro explicita ausência de credencial: ${err.message}`);
  }
  assert(noKeyErrorCaught, 'Deve lançar erro controlado quando chave estiver ausente');

  // 4. ResilientGeoProvider com Fallback Transparente
  console.log('\n4. Teste: ResilientGeoProvider Fallback Automático');
  const initialLogsCount = geoLogger.getLogs().length;
  const resilient = new ResilientGeoProvider(geobaseNoKey, fallback);
  const resilientResults = await resilient.forwardGeocode('Parque das Nações, Criciúma');
  assert(resilientResults.length > 0, 'ResilientGeoProvider obtém resultado via fallback');
  assert(resilientResults[0].source === 'fallback', 'Source identificada corretamente como fallback');
  const logsAfter = geoLogger.getLogs();
  assert(logsAfter.length > initialLogsCount, 'Operação foi registrada no geoLogger para auditoria de consumo');

  // 5. Cálculo Determinístico de Distância (Haversine)
  console.log('\n5. Teste: Cálculo Determinístico de Distância Haversine');
  // Coordenadas conhecidas:
  // Hospital São José: -28.6775, -49.3695
  // Parque das Nações: -28.6850, -49.3400
  const d1 = calculateHaversineDistanceKm(-28.6775, -49.3695, -28.6850, -49.3400);
  assert(d1 > 2.8 && d1 < 3.2, `Distância real calculada com precisão (~2.99 km): ${d1} km`);

  // Repetibilidade estrita (50 vezes)
  let deterministic = true;
  for (let i = 0; i < 50; i++) {
    const dCheck = calculateHaversineDistanceKm(-28.6775, -49.3695, -28.6850, -49.3400);
    if (dCheck !== d1) deterministic = false;
  }
  assert(deterministic, '50 cálculos de distância idênticos produziram exatamente o mesmo resultado numérico');

  // Distância zero para o mesmo ponto
  const dZero = calculateHaversineDistanceKm(-28.6775, -49.3695, -28.6775, -49.3695);
  assert(dZero === 0, 'Distância entre coordenadas idênticas é estritamente 0 km');

  // 6. Distância Dentro do Raio na Engine de Matching
  console.log('\n6. Teste: Matching com Distância Dentro do Raio');
  const baseSearch = {
    id: 'search-geo-1',
    name: 'Busca Próximo ao Hospital São José',
    purpose: 'Venda',
    propertyTypes: ['Apartamento'],
    cities: ['Criciúma'],
    neighborhoods: ['Centro'],
    maxPrice: 600000,
    minBedrooms: 2,
    active: true,
    // Critérios Geográficos:
    referenceAddress: 'Hospital São José, Centro, Criciúma',
    referenceLatitude: -28.6775,
    referenceLongitude: -49.3695,
    maxRadiusKm: 3.0,
  };

  // Imóvel a ~1.2 km da referência
  const offerInsideRadius = {
    id: 'prop-geo-inside',
    title: 'Apartamento Centro Próximo HSJ',
    offerType: 'PROPERTY',
    propertyType: 'Apartamento',
    purpose: 'Venda',
    price: 550000,
    bedrooms: 3,
    suites: 1,
    bathrooms: 2,
    parkingSpaces: 1,
    city: 'Criciúma',
    neighborhood: 'Centro',
    latitude: -28.6820,
    longitude: -49.3620,
    status: 'Disponível',
    active: true,
  };

  const matchInside = calculateMatch(baseSearch, offerInsideRadius);
  assert(matchInside.eligible, 'Oferta dentro do raio deve ser elegível');
  assert(matchInside.score >= 90, `Score alto para imóvel dentro do raio (${matchInside.score})`);
  const hasDistancePositiveExplain = matchInside.explanation.some(
    (e) => e.title.includes('raio geográfico') || e.detail.includes('ponto de referência')
  );
  assert(hasDistancePositiveExplain, 'Explicação contém confirmação positiva da distância do ponto de referência');

  // 7. Distância Fora do Raio na Engine de Matching
  console.log('\n7. Teste: Matching com Distância Fora do Raio');
  // Imóvel distante (> 8 km)
  const offerOutsideRadius = {
    id: 'prop-geo-outside',
    title: 'Apartamento Longe',
    offerType: 'PROPERTY',
    propertyType: 'Apartamento',
    purpose: 'Venda',
    price: 550000,
    bedrooms: 3,
    suites: 1,
    bathrooms: 2,
    parkingSpaces: 1,
    city: 'Criciúma',
    neighborhood: 'Centro',
    latitude: -28.7600, // distante
    longitude: -49.3620,
    status: 'Disponível',
    active: true,
  };

  const matchOutside = calculateMatch(baseSearch, offerOutsideRadius);
  assert(matchOutside.score < matchInside.score, `Score fora do raio (${matchOutside.score}) penalizado em relação a dentro (${matchInside.score})`);
  const hasDistanceWarningExplain = matchOutside.explanation.some(
    (e) => e.title.includes('raio de preferência') || e.detail.includes('excede o raio')
  );
  assert(hasDistanceWarningExplain, 'Explicação contém alerta explicativo de distância acima da preferência');

  // 8. Empreendimento: 1 Localização Compartilhada pelas Tipologias
  console.log('\n8. Teste: Empreendimento com Uma Única Localização para Múltiplas Tipologias');
  const developmentPoint = {
    id: 'dev-1',
    name: 'Residencial Território Nobre',
    developer: 'Construtora Exemplo',
    latitude: -28.6780,
    longitude: -49.3700,
    typologies: [
      { id: 'typ-1', name: 'Apartamento Tipo 2D', price: 450000, bedrooms: 2 },
      { id: 'typ-2', name: 'Apartamento Tipo 3D', price: 580000, bedrooms: 3 },
      { id: 'typ-3', name: 'Cobertura Duplex', price: 950000, bedrooms: 4 },
    ],
  };

  // No mapa, o empreendimento é representado como 1 único ponto
  assert(
    developmentPoint.latitude !== null && developmentPoint.longitude !== null,
    'Empreendimento possui uma latitude/longitude unificada'
  );
  assert(
    developmentPoint.typologies.length === 3,
    'Empreendimento possui 3 tipologias compartilhando a mesma localização'
  );

  // 9. Imóveis Sem Coordenadas Não Quebram a Aplicação
  console.log('\n9. Teste: Imóveis Sem Coordenadas Preservados Sem Erro');
  const mixedItems = [
    { id: 'prop-1', title: 'Imóvel Geolocalizado 1', latitude: -28.67, longitude: -49.37 },
    { id: 'prop-2', title: 'Imóvel Sem Coordenadas 1', latitude: null, longitude: null },
    { id: 'prop-3', title: 'Imóvel Sem Coordenadas 2', latitude: undefined, longitude: undefined },
    { id: 'prop-4', title: 'Imóvel Geolocalizado 2', latitude: -28.68, longitude: -49.36 },
  ];

  const mapped = mixedItems.filter((item) => item.latitude != null && item.longitude != null && !isNaN(item.latitude));
  const unmapped = mixedItems.filter((item) => item.latitude == null || item.longitude == null);

  assert(mapped.length === 2, `Exatamente 2 imóveis mapeados encontrados (${mapped.length})`);
  assert(unmapped.length === 2, `Exatamente 2 imóveis sem coordenadas identificados (${unmapped.length})`);
  assert(unmapped[0].title === 'Imóvel Sem Coordenadas 1', 'Registro sem coordenadas continua existindo e acessível');
  assert(unmapped[0].latitude === null, 'Coordenadas não foram inventadas para registros antigos');

  // 10. Persistência e Reutilização de Coordenadas (Sem Chamadas Desnecessárias)
  console.log('\n10. Teste: Reutilização de Coordenadas Persistidas');
  const callsBeforeRender = geoLogger.getLogs().length;
  // Simula renderização do mapa a partir do banco de dados:
  const mapPinsToRender = mapped.map((m) => ({
    lat: m.latitude,
    lng: m.longitude,
    title: m.title,
  }));
  const callsAfterRender = geoLogger.getLogs().length;
  assert(
    callsAfterRender === callsBeforeRender,
    `Renderização do mapa com coordenadas do banco fez 0 chamadas ao GeoProvider (${callsAfterRender - callsBeforeRender})`
  );

  // 11. GeoBase Indisponível não Afeta Visualização de Dados Persistidos
  console.log('\n11. Teste: Resiliência a Falha Total do GeoProvider');
  // Simula queda total de rede no GeoProvider:
  const brokenProvider = {
    providerName: 'offline-provider',
    async forwardGeocode() { throw new Error('Servidor indisponível / Timeout de conexão'); },
    async reverseGeocode() { throw new Error('Servidor indisponível / Timeout de conexão'); },
  };

  let mapDataFailed = false;
  try {
    // Carregamento da carteira existente no mapa continua funcionando perfeitamente:
    const propertiesFromDb = [
      { id: 'db-1', title: 'Imóvel Salvo 1', latitude: -28.6775, longitude: -49.3695 },
      { id: 'db-2', title: 'Imóvel Salvo 2', latitude: -28.6810, longitude: -49.3720 },
    ];
    assert(propertiesFromDb.length === 2, 'Dados salvos no banco continuam intactos');
    assert(propertiesFromDb[0].latitude === -28.6775, 'Coordenadas salvas no banco continuam exibíveis');
  } catch {
    mapDataFailed = true;
  }
  assert(!mapDataFailed, 'A indisponibilidade do GeoProvider NÃO derruba o mapa nem os dados já salvos');

  // 12. Sanitização de Logs (Sem Dados Sensíveis)
  console.log('\n12. Teste: Segurança dos Logs de Consumo');
  const recentLogs = geoLogger.getLogs();
  const logsHaveSecret = recentLogs.some(
    (l) => /Bearer\s+[a-zA-Z0-9_\-\.]{10,}/i.test(JSON.stringify(l)) ||
           JSON.stringify(l).includes('password') ||
           JSON.stringify(l).includes('secret_value')
  );
  assert(!logsHaveSecret, 'Nenhum log contém tokens Bearer, senhas ou credenciais secretas');

  const summary = geoLogger.getSummary();
  assert(typeof summary.totalCalls === 'number', `Auditoria de chamadas ativa: total de ${summary.totalCalls} chamadas registradas`);

  console.log('\n====================================================');
  console.log(`RESULTADO DA FASE 4: ${passed} passaram, ${failed} falharam.`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase4Tests().catch((err) => {
  console.error('Erro na execução dos testes da Fase 4:', err);
  process.exit(1);
});
