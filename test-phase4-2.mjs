import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('====================================================');
  console.log('  SUITE DE TESTES AUTOMATIZADOS — FASE 4.2');
  console.log('  Camada Territorial IBGE & Delimitação de Terrenos');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
    }
  }

  // ----------------------------------------------------
  // TESTE 1: Arquivos estáticos territoriais do IBGE
  // ----------------------------------------------------
  console.log('\n--- 1. Validação dos Arquivos Estáticos Territoriais do IBGE ---');
  const munPath = path.resolve('public/data/geo/criciuma-municipio.geojson');
  const bairrosPath = path.resolve('public/data/geo/criciuma-bairros.geojson');

  assert(fs.existsSync(munPath), 'Arquivo criciuma-municipio.geojson existe localmente');
  assert(fs.existsSync(bairrosPath), 'Arquivo criciuma-bairros.geojson existe localmente');

  const munData = JSON.parse(fs.readFileSync(munPath, 'utf8'));
  const bairrosData = JSON.parse(fs.readFileSync(bairrosPath, 'utf8'));

  assert(munData.type === 'FeatureCollection', 'Limite municipal é um FeatureCollection GeoJSON válido');
  assert(munData.features.length >= 1, `Limite municipal possui feições (${munData.features.length})`);
  assert(munData.features[0].geometry.type === 'Polygon' || munData.features[0].geometry.type === 'MultiPolygon', 'Geometria municipal é Polygon/MultiPolygon');

  assert(bairrosData.type === 'FeatureCollection', 'Malha de bairros é um FeatureCollection GeoJSON válido');
  assert(bairrosData.features.length === 98, `Malha de bairros possui exatamente 98 feições reais do IBGE (encontrado: ${bairrosData.features.length})`);

  const sampleBairro = bairrosData.features.find(f => f.properties.name === 'Centro');
  assert(Boolean(sampleBairro), 'Bairro "Centro" de Criciúma está presente');
  assert(Boolean(sampleBairro?.properties?.id), 'Bairro possui identificador oficial IBGE');
  assert(sampleBairro?.properties?.city === 'Criciúma', 'Bairro pertence oficialmente a Criciúma');

  // Teste de requisição HTTP estática local
  const httpMun = await fetch(`${BASE_URL}/data/geo/criciuma-municipio.geojson`);
  const httpBairros = await fetch(`${BASE_URL}/data/geo/criciuma-bairros.geojson`);
  assert(httpMun.ok && httpMun.status === 200, 'Endpoint /data/geo/criciuma-municipio.geojson responde HTTP 200');
  assert(httpBairros.ok && httpBairros.status === 200, 'Endpoint /data/geo/criciuma-bairros.geojson responde HTTP 200');

  // ----------------------------------------------------
  // TESTE 2: Autenticação de Teste
  // ----------------------------------------------------
  console.log('\n--- 2. Autenticação e Sessão ---');
  let authCookie = '';
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      isDemo: true,
    }),
  });
  if (loginRes.ok) {
    const rawCookie = loginRes.headers.get('set-cookie');
    if (rawCookie) authCookie = rawCookie.split(';')[0];
  }
  assert(Boolean(authCookie), 'Sessão da corretora autenticada com sucesso');

  const headers = {
    'Content-Type': 'application/json',
    Cookie: authCookie,
  };

  // ----------------------------------------------------
  // TESTE 3: Imóvel SEM boundary continua funcionando normalmente
  // ----------------------------------------------------
  console.log('\n--- 3. Imóvel SEM Boundary (Continua 100% Normal) ---');
  const propWithoutBoundary = {
    title: 'Terreno Teste Sem Boundary - Fase 4.2',
    internalCode: 'TEST-NO-BOUND',
    propertyType: 'Terreno',
    purpose: 'Venda',
    status: 'Disponível',
    price: 350000,
    totalArea: 450,
    address: 'Rua São José',
    number: '100',
    neighborhood: 'Centro',
    city: 'Criciúma',
    state: 'SC',
    latitude: -28.6780,
    longitude: -49.3710,
    images: [],
  };

  const createRes1 = await fetch(`${BASE_URL}/api/properties`, {
    method: 'POST',
    headers,
    body: JSON.stringify(propWithoutBoundary),
  });
  assert(createRes1.ok, 'Criação de imóvel sem boundary retorna HTTP 200');
  const createData1 = await createRes1.json();
  const id1 = createData1.property?.id;
  assert(Boolean(id1), `Imóvel criado com ID: ${id1}`);
  assert(createData1.property.boundary === null, 'Campo boundary é null');
  assert(createData1.property.boundaryArea === null, 'Campo boundaryArea é null');
  assert(createData1.property.latitude === -28.6780, 'Latitude original preservada');
  assert(createData1.property.longitude === -49.3710, 'Longitude original preservada');

  // ----------------------------------------------------
  // TESTE 4: Imóvel COM boundary (Salva -> Reload -> Geometria Permanece)
  // ----------------------------------------------------
  console.log('\n--- 4. Imóvel COM Boundary (Salva -> Reload -> Geometria Permanece) ---');
  const testPolygonGeoJson = {
    type: 'Polygon',
    coordinates: [[
      [-49.3715, -28.6785],
      [-49.3712, -28.6785],
      [-49.3712, -28.6782],
      [-49.3715, -28.6782],
      [-49.3715, -28.6785]
    ]]
  };
  const testPolygonString = JSON.stringify(testPolygonGeoJson);
  const testAreaM2 = 980; // Área aproximada calculada no mapa

  const propWithBoundary = {
    title: 'Terreno Comercial com Delimitação - Fase 4.2',
    internalCode: 'TEST-WITH-BOUND',
    propertyType: 'Terreno',
    purpose: 'Venda',
    status: 'Disponível',
    price: 850000,
    totalArea: 1000, // Área documental informada diferente da delimitada!
    address: 'Avenida Centenário',
    number: '2500',
    neighborhood: 'Centro',
    city: 'Criciúma',
    state: 'SC',
    latitude: -28.6783,
    longitude: -49.3713,
    boundary: testPolygonString,
    boundaryArea: testAreaM2,
    images: [],
  };

  const createRes2 = await fetch(`${BASE_URL}/api/properties`, {
    method: 'POST',
    headers,
    body: JSON.stringify(propWithBoundary),
  });
  assert(createRes2.ok, 'Criação de imóvel com boundary retorna HTTP 200');
  const createData2 = await createRes2.json();
  const id2 = createData2.property?.id;
  assert(Boolean(id2), `Imóvel criado com ID: ${id2}`);

  // Reload do imóvel para testar persistência
  const reloadRes2 = await fetch(`${BASE_URL}/api/properties/${id2}`, { headers });
  assert(reloadRes2.ok, 'Recuperação do imóvel via GET retorna HTTP 200');
  const reloadData2 = await reloadRes2.json();
  const loadedProp2 = reloadData2.property;

  assert(Boolean(loadedProp2.boundary), 'Boundary foi persistido e retornado após reload');
  assert(loadedProp2.boundaryArea === 980, `Área delimitada persistida corretamente (esperado: 980, obtido: ${loadedProp2.boundaryArea})`);
  assert(loadedProp2.totalArea === 1000, `Área informada documental mantida estritamente separada (esperado: 1000, obtido: ${loadedProp2.totalArea})`);
  assert(loadedProp2.latitude === -28.6783, 'Latitude geocodificada não foi sobrescrita');
  assert(loadedProp2.longitude === -49.3713, 'Longitude geocodificada não foi sobrescrita');

  // Verifica que o JSON salvo no banco é um polígono válido
  const parsedLoadedBoundary = JSON.parse(loadedProp2.boundary);
  assert(parsedLoadedBoundary.type === 'Polygon', 'GeoJSON salvo possui type Polygon válido');
  assert(parsedLoadedBoundary.coordinates[0].length === 5, 'Anel fechado com 5 vértices (4 únicos + fechamento)');

  // ----------------------------------------------------
  // TESTE 5: Edição de Boundary (Atualização permanece após reload)
  // ----------------------------------------------------
  console.log('\n--- 5. Edição de Boundary (Atualização permanece após reload) ---');
  const updatedPolygonGeoJson = {
    type: 'Polygon',
    coordinates: [[
      [-49.3716, -28.6786],
      [-49.3711, -28.6786],
      [-49.3711, -28.6781],
      [-49.3716, -28.6781],
      [-49.3716, -28.6786]
    ]]
  };
  const updatedPolygonString = JSON.stringify(updatedPolygonGeoJson);
  const updatedAreaM2 = 1450;

  const updateRes = await fetch(`${BASE_URL}/api/properties/${id2}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      boundary: updatedPolygonString,
      boundaryArea: updatedAreaM2,
    }),
  });
  assert(updateRes.ok, 'Edição de boundary via PUT retorna HTTP 200');

  // Reload para conferir se alteração persiste
  const reloadResAfterUpdate = await fetch(`${BASE_URL}/api/properties/${id2}`, { headers });
  const reloadDataAfterUpdate = await reloadResAfterUpdate.json();
  const updatedProp = reloadDataAfterUpdate.property;

  assert(updatedProp.boundaryArea === 1450, `Área atualizada persistida (esperado: 1450, obtido: ${updatedProp.boundaryArea})`);
  const parsedUpdated = JSON.parse(updatedProp.boundary);
  assert(parsedUpdated.coordinates[0][0][0] === -49.3716, 'Novas coordenadas salvas com precisão');

  // ----------------------------------------------------
  // TESTE 6: Exclusão de Boundary (Volta a funcionar somente com Pin)
  // ----------------------------------------------------
  console.log('\n--- 6. Exclusão de Boundary (Volta a funcionar somente com Pin) ---');
  const removeBoundaryRes = await fetch(`${BASE_URL}/api/properties/${id2}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      boundary: null,
      boundaryArea: null,
    }),
  });
  assert(removeBoundaryRes.ok, 'Remoção de boundary via PUT retorna HTTP 200');

  const reloadResAfterRemove = await fetch(`${BASE_URL}/api/properties/${id2}`, { headers });
  const reloadDataAfterRemove = await reloadResAfterRemove.json();
  const propAfterRemove = reloadDataAfterRemove.property;

  assert(propAfterRemove.boundary === null, 'Boundary agora é null');
  assert(propAfterRemove.boundaryArea === null, 'BoundaryArea agora é null');
  assert(propAfterRemove.latitude === -28.6783, 'Pin geocodificado permanece ativo e inalterado');
  assert(propAfterRemove.longitude === -49.3713, 'Pin geocodificado permanece ativo e inalterado');

  // ----------------------------------------------------
  // TESTE 7: Verificação do Matching Engine
  // ----------------------------------------------------
  console.log('\n--- 7. Matching Engine Não Sofre Alteração ---');
  const matchesRes = await fetch(`${BASE_URL}/api/searches`, { headers });
  assert(matchesRes.ok, 'Listagem de buscas da carteira responde HTTP 200');
  const matchesData = await matchesRes.json();
  assert(Array.isArray(matchesData.searches), 'Buscas continuam íntegras e ativas');

  // Limpeza dos imóveis de teste
  await fetch(`${BASE_URL}/api/properties/${id1}`, { method: 'DELETE', headers });
  await fetch(`${BASE_URL}/api/properties/${id2}`, { method: 'DELETE', headers });
  console.log('  ✓ [CLEANUP] Imóveis de teste removidos');

  console.log('\n====================================================');
  console.log(`  RESULTADO: ${passed} / ${total} testes passaram (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Erro na execução da suíte de testes:', err);
  process.exit(1);
});
