// test-phase4-1.mjs - Validação Completa Automatizada da Fase 4.1
// Persistência Geográfica Real, Mapa + Resultados Visuais Simultâneos e Tratamento de Imagens

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

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

async function run() {
  console.log('======================================================================');
  console.log('TESTES AUTOMATIZADOS — FASE 4.1: PERSISTÊNCIA, MAPA + CARDS E IMAGENS');
  console.log('======================================================================\n');

  // 0. Autenticação Demo
  console.log('0. Autenticação');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isDemo: true }),
  });
  assert(loginRes.ok, 'Login do corretor demo realizado');
  const cookies = loginRes.headers.get('set-cookie');
  const authHeaders = {
    Cookie: cookies,
    'Content-Type': 'application/json',
  };

  // -------------------------------------------------------------------------
  // 1. TESTE DE PERSISTÊNCIA REAL DE COORDENADAS (Ciclo Completo)
  // -------------------------------------------------------------------------
  console.log('\n1. Teste de Persistência Geográfica Real');
  
  // 1.1 Simular geocodificação
  const fullAddressString = 'Rua Lauro Müller, 150, Centro, Criciúma - SC';
  const addressPayload = {
    address: 'Rua Lauro Müller',
    number: '150',
    neighborhood: 'Centro',
    city: 'Criciúma',
    state: 'SC',
    zipcode: '88801-100',
  };

  const geocodeRes = await fetch(`${BASE_URL}/api/geo/geocode`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ address: fullAddressString }),
  });
  const geocodeData = await geocodeRes.json();
  assert(geocodeRes.ok && geocodeData.success && geocodeData.results.length > 0, 'Geocodificação automática via GeoBase/Fallback bem-sucedida');
  const expectedLat = geocodeData.results[0].lat;
  const expectedLng = geocodeData.results[0].lng;
  console.log(`    Coordenadas obtidas: Lat ${expectedLat}, Lng ${expectedLng}`);
  assert(typeof expectedLat === 'number' && typeof expectedLng === 'number', 'Coordenadas são numéricas válidas');

  // 1.2 Salvar novo imóvel com as coordenadas confirmadas
  const newPropertyPayload = {
    title: 'Imóvel Teste Validação 4.1 - Coordenadas',
    propertyType: 'Apartamento',
    purpose: 'Venda',
    status: 'Disponível',
    price: 520000,
    bedrooms: 2,
    suites: 1,
    bathrooms: 2,
    parkingSpaces: 1,
    privateArea: 75,
    ...addressPayload,
    latitude: expectedLat,
    longitude: expectedLng,
  };

  const createRes = await fetch(`${BASE_URL}/api/properties`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(newPropertyPayload),
  });
  const createData = await createRes.json();
  assert(createRes.ok && createData.success, 'Imóvel salvo com sucesso via API');
  const createdId = createData.property.id;

  // 1.3 Consultar diretamente o banco de dados (Prisma/SQLite)
  const dbRecord = await prisma.property.findUnique({
    where: { id: createdId },
  });
  assert(dbRecord !== null, 'Registro localizado no banco de dados SQLite');
  assert(
    dbRecord.latitude === expectedLat && dbRecord.longitude === expectedLng,
    `Persistência física no SQLite confirmada (DB: Lat ${dbRecord.latitude}, Lng ${dbRecord.longitude})`
  );

  // 1.4 Simular reload da página (GET /api/properties/:id)
  const reloadRes = await fetch(`${BASE_URL}/api/properties/${createdId}`, {
    headers: authHeaders,
  });
  const reloadData = await reloadRes.json();
  assert(
    reloadData.property.latitude === expectedLat && reloadData.property.longitude === expectedLng,
    'Após reload da rota, latitude e longitude sobrevivem integralmente'
  );

  // 1.5 Simular visualização da Home Map
  const homePropsRes = await fetch(`${BASE_URL}/api/properties`, { headers: authHeaders });
  const homePropsData = await homePropsRes.json();
  const foundInHome = homePropsData.properties.find((p) => p.id === createdId);
  assert(Boolean(foundInHome), 'Imóvel retornado na listagem da Home');
  assert(
    typeof foundInHome.latitude === 'number' && typeof foundInHome.longitude === 'number',
    'Imóvel possui coordenadas válidas para alimentar o mapa da Home'
  );

  // 1.6 Failsafe de geocodificação no backend caso o cliente envie coordenadas vazias
  const autoGeocodePayload = {
    title: 'Imóvel Teste Failsafe Backend 4.1',
    propertyType: 'Casa',
    purpose: 'Venda',
    status: 'Disponível',
    price: 750000,
    address: 'Rua Coronel Pedro Benedet',
    number: '200',
    neighborhood: 'Centro',
    city: 'Criciúma',
    state: 'SC',
    zipcode: '88801-250',
    latitude: null, // sem coordenadas do cliente
    longitude: null,
  };
  const failsafeRes = await fetch(`${BASE_URL}/api/properties`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(autoGeocodePayload),
  });
  const failsafeData = await failsafeRes.json();
  assert(failsafeRes.ok && failsafeData.success, 'Failsafe de cadastro aceito');
  assert(
    typeof failsafeData.property.latitude === 'number' && failsafeData.property.latitude !== null,
    `Backend aplicou geocodificação de segurança automática (Lat: ${failsafeData.property.latitude})`
  );
  const failsafeId = failsafeData.property.id;

  // Limpeza dos registros de teste
  await prisma.property.delete({ where: { id: createdId } });
  await prisma.property.delete({ where: { id: failsafeId } });
  console.log('    Registros de teste excluídos do banco.');

  // -------------------------------------------------------------------------
  // 2. TESTE DE SIMULTANEIDADE MAPA + RESULTADOS VISUAIS (CARROSSEL)
  // -------------------------------------------------------------------------
  console.log('\n2. Teste de Simultaneidade Mapa + Cards de Resultados');

  // 2.1 Consulta de imóveis e empreendimentos da Home
  const allPropsRes = await fetch(`${BASE_URL}/api/properties`, { headers: authHeaders });
  const allProps = (await allPropsRes.json()).properties;
  const allDevsRes = await fetch(`${BASE_URL}/api/developments`, { headers: authHeaders });
  const allDevs = (await allDevsRes.json()).developments;

  console.log(`    Total disponível: ${allProps.length} imóveis, ${allDevs.length} empreendimentos`);

  const getCategoryForItem = (item) => {
    if (item.isDevelopment) return 'Em construção';
    const type = (item.propertyType || '').toLowerCase();
    if (type.includes('casa')) return 'Casa';
    if (type.includes('apartamento') || type.includes('cobertura') || type.includes('studio')) return 'Apartamento';
    if (type.includes('terreno') || type.includes('lote') || type.includes('rural')) return 'Terreno';
    if (type.includes('comercial') || type.includes('comércio') || type.includes('galpão') || type.includes('sala')) return 'Comércio';
    return 'Apartamento';
  };

  const allItems = [
    ...allProps.map((p) => ({ ...p, isDevelopment: false })),
    ...allDevs.map((d) => ({ ...d, isDevelopment: true })),
  ];

  // Simular lógica de filtro idêntica à HomeMap
  const testFilter = (typeFilter) => {
    const filtered = allItems.filter((item) => {
      if (typeFilter !== 'Todos' && getCategoryForItem(item) !== typeFilter) return false;
      return true;
    });

    const markersCount = filtered.filter((item) => item.latitude && item.longitude).length;
    const cardsCount = filtered.length;

    return { markersCount, cardsCount };
  };

  // Testar filtros padrão
  const filterTypes = ['Todos', 'Apartamento', 'Casa', 'Comércio', 'Em construção'];
  for (const f of filterTypes) {
    const { markersCount, cardsCount } = testFilter(f);
    assert(
      markersCount === cardsCount,
      `Filtro "${f}": sincronizado (Marcadores com pin: ${markersCount} == Cards: ${cardsCount})`
    );
  }

  // 2.2 Testar Busca e visualização de Matches no Mapa
  console.log('\n2.2 Contexto de Busca (SearchMatchesMap)');
  const searchesRes = await fetch(`${BASE_URL}/api/searches`, { headers: authHeaders });
  const searches = (await searchesRes.json()).searches;
  assert(searches.length > 0, `Buscas ativas encontradas: ${searches.length}`);

  const anaSearch = searches.find((s) => s.client?.name === 'Ana Souza') || searches[0];
  const searchDetailRes = await fetch(`${BASE_URL}/api/searches/${anaSearch.id}`, { headers: authHeaders });
  const searchDetail = await searchDetailRes.json();
  const matches = searchDetail.search.matches;
  assert(matches.length > 0, `Matches encontrados para "${anaSearch.name}": ${matches.length}`);

  // Verificar ordenação decrescente de compatibilidade (score)
  let isSorted = true;
  for (let i = 0; i < matches.length - 1; i++) {
    if (matches[i].score < matches[i + 1].score) {
      isSorted = false;
      break;
    }
  }
  assert(isSorted, `Matches estão ordenados do maior para o menor score (Top: ${matches[0].score}%)`);

  // Verificar presença de badge de compatibilidade e parsedExplanation
  const hasScores = matches.every((m) => typeof m.score === 'number' && m.score > 0);
  assert(hasScores, 'Todos os matches possuem score de compatibilidade numérico válido');
  const hasExplanations = matches.every((m) => Array.isArray(m.parsedExplanation));
  assert(hasExplanations, 'Todos os matches possuem estrutura de explicação ("Por que combina?")');

  // -------------------------------------------------------------------------
  // 3. TESTE DE TRATAMENTO DE IMAGENS E SINCRONIZAÇÃO DE CÓDIGO
  // -------------------------------------------------------------------------
  console.log('\n3. Teste de Tratamento de Imagens e Componentes de UI');

  const homeMapPath = path.resolve('src/components/HomeMap.tsx');
  const homeMapCode = fs.readFileSync(homeMapPath, 'utf8');

  // Verificar object-fit contain e cor neutra
  assert(
    homeMapCode.includes("objectFit: 'contain'") && homeMapCode.includes('#F3F4F6'),
    'HomeMap utiliza objectFit: contain com fundo neutro (#F3F4F6) nos cards do carrossel'
  );

  // Verificar sincronização bidirecional no HomeMap
  assert(
    homeMapCode.includes('scrollToCard') && homeMapCode.includes('handleCardClick'),
    'HomeMap possui funções scrollToCard (Pin -> Card) e handleCardClick (Card -> Pin)'
  );
  assert(
    homeMapCode.includes('home-card-'),
    'Cards do carrossel no HomeMap possuem IDs únicos ancorados para sincronização'
  );
  assert(
    homeMapCode.includes('flyTo') || homeMapCode.includes('setView'),
    'HomeMap centraliza marcador dinamicamente ao clicar no card'
  );

  // Verificar SearchMatchesMap
  const searchMapPath = path.resolve('src/components/SearchMatchesMap.tsx');
  const searchMapCode = fs.readFileSync(searchMapPath, 'utf8');

  assert(
    searchMapCode.includes("objectFit: 'contain'") && searchMapCode.includes('#F3F4F6'),
    'SearchMatchesMap utiliza objectFit: contain e fundo neutro (#F3F4F6)'
  );
  assert(
    searchMapCode.includes('match-card-') && (searchMapCode.includes('scrollToMatchCard') || searchMapCode.includes('scrollToCard')),
    'SearchMatchesMap possui ancoragem e scroll automático ao clicar no pin'
  );
  assert(
    searchMapCode.includes('onOpenExplanation') && searchMapCode.includes('compatível'),
    'SearchMatchesMap exibe badge de compatibilidade e botão analítico "Por que combina?"'
  );

  // Verificar tratamento de fotos em formulários e páginas
  const propFormCode = fs.readFileSync(path.resolve('src/components/PropertyForm.tsx'), 'utf8');
  assert(
    propFormCode.includes("objectFit: 'contain'"),
    'PropertyForm exibe upload/previews com object-fit contain'
  );

  const devFormCode = fs.readFileSync(path.resolve('src/components/DevelopmentForm.tsx'), 'utf8');
  assert(
    devFormCode.includes("objectFit: 'contain'"),
    'DevelopmentForm exibe previews com object-fit contain'
  );

  const propDetailCode = fs.readFileSync(path.resolve('src/app/imoveis/[id]/page.tsx'), 'utf8');
  assert(
    propDetailCode.includes("objectFit: 'contain'"),
    'Página de Detalhes do Imóvel exibe foto principal e galeria com object-fit contain'
  );

  const devDetailCode = fs.readFileSync(path.resolve('src/app/empreendimentos/[id]/page.tsx'), 'utf8');
  assert(
    devDetailCode.includes("objectFit: 'contain'"),
    'Página de Detalhes do Empreendimento exibe foto principal e tipologias com object-fit contain'
  );

  // -------------------------------------------------------------------------
  // 4. TESTE DE SSR E CARREGAMENTO DE PÁGINAS (Smoke Test em Runtime)
  // -------------------------------------------------------------------------
  console.log('\n4. Teste de Smoke Test em Runtime (SSR HTTP)');

  const pagesToTest = [
    { name: 'Home com Mapa', url: '/' },
    { name: 'Lista de Imóveis', url: '/imoveis' },
    { name: 'Lista de Empreendimentos', url: '/empreendimentos' },
    { name: 'Buscas & Demandas', url: '/buscas' },
    { name: 'Detalhe de Busca com Mapa de Matches', url: `/buscas/${anaSearch.id}` },
  ];

  for (const page of pagesToTest) {
    const res = await fetch(`${BASE_URL}${page.url}`, { headers: authHeaders });
    assert(
      res.ok && res.status === 200,
      `Página "${page.name}" (${page.url}) renderizou com HTTP 200 OK`
    );
  }

  // -------------------------------------------------------------------------
  // FINALIZAÇÃO
  // -------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log(`TOTAL DE TESTES DA FASE 4.1: ${passed} passaram, ${failed} falharam.`);
  console.log('======================================================================');

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch(async (e) => {
  console.error('Erro fatal durante a execução dos testes:', e);
  await prisma.$disconnect();
  process.exit(1);
});
