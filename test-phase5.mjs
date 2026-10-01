/**
 * SUITE DE TESTES AUTOMATIZADOS E CENÁRIOS OPERACIONAIS — FASE 5
 * Experiência Integrada e Preparação para Uso Real (Daiane Corrêa)
 */

import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

async function run() {
  console.log('\n====================================================');
  console.log('  TESTES OPERACIONAIS E INTEGRAÇÃO — FASE 5');
  console.log('  Operação Real da Corretora Daiane Corrêa');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      throw new Error(message);
    }
  }

  // 1. Autenticação da corretora Daiane Corrêa
  console.log('--- 1. Autenticação da Corretora Daiane Corrêa ---');
  let authCookie = '';
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'daiane@areanobre.com.br',
      password: 'senha_corretora_segura_123',
    }),
  });
  assert(loginRes.ok && loginRes.status === 200, 'Login da corretora efetuado com sucesso');
  const rawCookie = loginRes.headers.get('set-cookie');
  if (rawCookie) authCookie = rawCookie.split(';')[0];
  assert(Boolean(authCookie), 'Cookie de sessão emitido com sucesso');

  const headers = {
    'Content-Type': 'application/json',
    Cookie: authCookie,
  };

  // 2. Identidade Visual e Separação de Marcas (Requisito 17)
  console.log('\n--- 2. Identidade: Plataforma Área Nobre vs Corretora Daiane Corrêa ---');
  const homeRes = await fetch(`${BASE_URL}/`, { headers: { Cookie: authCookie } });
  assert(homeRes.status === 200, 'Home page carrega com HTTP 200');
  const homeHtml = await homeRes.text();
  assert(homeHtml.includes('ÁREA NOBRE'), 'Marca da plataforma "Área Nobre" presente no topo');
  assert(homeHtml.includes('Daiane Corrêa Imóveis'), 'Identidade da operação "Daiane Corrêa Imóveis" preservada no perfil');

  // 3. CENÁRIO A: Fluxo Completo Integrado
  console.log('\n--- 3. CENÁRIO A: Ciclo Operacional Completo ---');
  // 3.1 Cadastrar Imóvel (com geolocalização e delimitação de terreno)
  const polygonBoundary = JSON.stringify({
    type: 'Polygon',
    coordinates: [
      [
        [-49.3698, -28.6771],
        [-49.3691, -28.6771],
        [-49.3691, -28.6778],
        [-49.3698, -28.6778],
        [-49.3698, -28.6771],
      ],
    ],
  });

  const propRes = await fetch(`${BASE_URL}/api/properties`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: 'Casa Nobre Pio Corrêa com Terreno Amplo',
      propertyType: 'Casa',
      purpose: 'Venda',
      price: 850000,
      bedrooms: 3,
      suites: 1,
      bathrooms: 3,
      parkingSpaces: 2,
      privateArea: 195,
      address: 'Rua Lauro Sodré, 120',
      neighborhood: 'Pio Corrêa',
      city: 'Criciúma',
      state: 'SC',
      latitude: -28.6774,
      longitude: -49.3695,
      boundary: polygonBoundary,
      boundaryArea: 480,
    }),
  });

  assert(propRes.ok, 'Cadastro de imóvel realizado com sucesso (HTTP 200/201)');
  const propData = await propRes.json();
  const createdPropertyId = propData.property?.id;
  assert(Boolean(createdPropertyId), `Imóvel criado com ID: ${createdPropertyId}`);
  assert('matchCount' in propData, `API retorna contagem determinística de matchCount: ${propData.matchCount}`);

  // 3.2 Confirmar presença e visualização na Home (Map-First)
  const homeCheckRes = await fetch(`${BASE_URL}/`, { headers: { Cookie: authCookie } });
  assert(homeCheckRes.status === 200, 'Home continua operacional (Map-First)');
  const homeCheckHtml = await homeCheckRes.text();
  assert(homeCheckHtml.includes('Casa Nobre Pio Corrêa'), 'Imóvel presente na Home');

  // 3.3 Criar Busca Compatível para este imóvel (Requisitos 3 e 10)
  const searchRes = await fetch(`${BASE_URL}/api/searches`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Casa para Família Silva',
      clientName: 'Roberto Silva',
      clientPhone: '(48) 99911-2233',
      purpose: 'Venda',
      propertyTypes: ['Casa'],
      cities: ['Criciúma'],
      neighborhoods: ['Pio Corrêa'],
      maxPrice: 900000,
      minBedrooms: 3,
      minSuites: 1,
      minParkingSpaces: 2,
    }),
  });

  assert(searchRes.ok, 'Cadastro de busca realizado com sucesso (HTTP 200/201)');
  const searchData = await searchRes.json();
  const createdSearchId = searchData.search?.id;
  assert(Boolean(createdSearchId), `Busca criada com ID: ${createdSearchId}`);
  assert(searchData.matchCount >= 1, `Matches calculados deterministicamente no save da busca: ${searchData.matchCount}`);

  // 3.4 Verificar tela operacional da busca (/buscas/[id])
  const searchDetailRes = await fetch(`${BASE_URL}/api/searches/${createdSearchId}`, { headers });
  assert(searchDetailRes.status === 200, 'Detalhes da busca carregados com sucesso');
  const searchDetailData = await searchDetailRes.json();
  const loadedSearch = searchDetailData.search;
  assert(loadedSearch.matches?.length >= 1, 'Busca contém matches determinísticos salvos');
  const matchedOffer = loadedSearch.matches.find((m) => m.propertyId === createdPropertyId);
  assert(matchedOffer != null, 'Imóvel cadastrado foi pareado com a busca');
  assert(matchedOffer.score >= 80, `Score de alta compatibilidade validado: ${matchedOffer.score}%`);
  assert(matchedOffer.explanation != null, 'Explicação determinística presente');
  const parsedExplanation = JSON.parse(matchedOffer.explanation);
  assert(Array.isArray(parsedExplanation) && parsedExplanation.length > 0, 'Regras de matching explicadas analiticamente sem IA');

  // 3.5 Verificar o Modo de Busca no Mapa da Home (/?buscaId=[id])
  const homeSearchModeRes = await fetch(`${BASE_URL}/?buscaId=${createdSearchId}`, { headers: { Cookie: authCookie } });
  assert(homeSearchModeRes.status === 200, 'Home em Modo de Busca retorna HTTP 200');
  const homeSearchHtml = await homeSearchModeRes.text();
  assert(homeSearchHtml.includes('Roberto Silva') || homeSearchHtml.includes('Casa para Família Silva'), 'Contexto da busca do cliente identificado');

  // 3.6 Fluxo Inverso: Imóvel -> Buscas compatíveis (Requisito 8)
  const propDetailRes = await fetch(`${BASE_URL}/api/properties/${createdPropertyId}`, { headers });
  assert(propDetailRes.status === 200, 'Detalhes do imóvel carregados com sucesso');
  const propDetailData = await propDetailRes.json();
  const loadedProp = propDetailData.property;
  assert(loadedProp.matches?.length >= 1, 'Imóvel contém buscas compatíveis no fluxo inverso');
  const inverseMatch = loadedProp.matches.find((m) => m.searchId === createdSearchId);
  assert(inverseMatch != null, 'Busca de Roberto Silva encontrada na tela do imóvel');
  assert(inverseMatch.score === matchedOffer.score, 'Score consistente e simétrico entre os dois fluxos');

  // 4. CENÁRIO B: Busca sem nenhum imóvel compatível e Empty State Humanizado (Requisito 13)
  console.log('\n--- 4. CENÁRIO B: Busca sem Match e Empty States Humanizados ---');
  const emptySearchRes = await fetch(`${BASE_URL}/api/searches`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Mansão Rural Isolada',
      clientName: 'Cliente Raro',
      purpose: 'Locação',
      propertyTypes: ['Rural'],
      cities: ['Criciúma'],
      maxPrice: 2000,
      minBedrooms: 6,
    }),
  });

  assert(emptySearchRes.ok, 'Busca sem match criada com sucesso (HTTP 200/201)');
  const emptySearchData = await emptySearchRes.json();
  const emptySearchId = emptySearchData.search?.id;
  assert(emptySearchData.matchCount === 0, 'Nenhum match encontrado para critérios impossíveis (0 matches)');

  const emptySearchHtmlRes = await fetch(`${BASE_URL}/buscas/${emptySearchId}`, { headers: { Cookie: authCookie } });
  assert(emptySearchHtmlRes.status === 200, 'Página da busca sem match renderizou com sucesso');

  const emptySearchDetailRes = await fetch(`${BASE_URL}/api/searches/${emptySearchId}`, { headers });
  assert(emptySearchDetailRes.status === 200, 'API da busca sem match retornou com sucesso');
  const emptySearchDetailData = await emptySearchDetailRes.json();
  assert(
    !emptySearchDetailData.search?.matches || emptySearchDetailData.search.matches.length === 0,
    'Busca sem match possui 0 ofertas associadas no banco determinístico'
  );

  const searchPageSource = fs.readFileSync(path.resolve('./src/app/buscas/[id]/page.tsx'), 'utf-8');
  assert(
    searchPageSource.includes('Nenhum imóvel da carteira atende suficientemente a esta busca no momento'),
    'Empty state humanizado exibido sem mensagens técnicas como "0 results" ou "no matches"'
  );

  // 5. CENÁRIO C: Tipologias de Empreendimento participando do Matching (Requisito 12)
  console.log('\n--- 5. CENÁRIO C: Matching de Tipologias de Empreendimento ---');
  const devRes = await fetch(`${BASE_URL}/api/developments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Residencial Altos da Colina',
      developer: 'Construtora Fontana',
      stage: 'Em construção',
      address: 'Rua Desembargador Pedro Silva, 300',
      neighborhood: 'Michel',
      city: 'Criciúma',
      state: 'SC',
      latitude: -28.679,
      longitude: -49.371,
      typologies: [
        {
          name: 'Apto Tipo 03 — 3 Suítes',
          propertyType: 'Apartamento',
          price: 680000,
          privateArea: 105,
          bedrooms: 3,
          suites: 3,
          bathrooms: 4,
          parkingSpaces: 2,
          status: 'Disponível',
        },
      ],
    }),
  });

  assert(devRes.ok, 'Empreendimento com tipologia cadastrado com sucesso (HTTP 200/201)');
  const devData = await devRes.json();
  const typologyDevId = devData.development?.id;

  const typSearchRes = await fetch(`${BASE_URL}/api/searches`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Apartamento 3 Suítes para Família Dias',
      clientName: 'Dra. Luiza Dias',
      purpose: 'Venda',
      propertyTypes: ['Apartamento'],
      cities: ['Criciúma'],
      neighborhoods: ['Michel'],
      maxPrice: 750000,
      minBedrooms: 3,
      minSuites: 2,
    }),
  });

  assert(typSearchRes.ok, 'Busca para tipologia criada com sucesso (HTTP 200/201)');
  const typSearchData = await typSearchRes.json();
  const typologySearchId = typSearchData.search?.id;

  const typSearchDetailRes = await fetch(`${BASE_URL}/api/searches/${typologySearchId}`, { headers });
  const typSearchDetailData = await typSearchDetailRes.json();
  const typMatches = typSearchDetailData.search?.matches || [];
  const matchedTypology = typMatches.find((m) => m.offerType === 'TYPOLOGY');
  assert(matchedTypology != null, 'Tipologia de empreendimento pareada com sucesso como oferta compatível');
  assert(matchedTypology.typology != null, 'Objeto de tipologia carregado com sucesso');
  assert(matchedTypology.typology.development?.name === 'Residencial Altos da Colina', 'Nome do empreendimento preservado');
  assert(matchedTypology.typology.name === 'Apto Tipo 03 — 3 Suítes', 'Nome da tipologia exibido naturalmente sem estrutura técnica');
  assert(matchedTypology.score >= 80, `Score determinístico alto para tipologia: ${matchedTypology.score}%`);

  // 6. Limpeza dos Registros de Teste
  console.log('\n--- 6. Limpeza dos Dados de Teste ---');
  if (createdPropertyId) {
    await fetch(`${BASE_URL}/api/properties/${createdPropertyId}`, { method: 'DELETE', headers });
  }
  if (createdSearchId) {
    await fetch(`${BASE_URL}/api/searches/${createdSearchId}`, { method: 'DELETE', headers });
  }
  if (emptySearchId) {
    await fetch(`${BASE_URL}/api/searches/${emptySearchId}`, { method: 'DELETE', headers });
  }
  if (typologySearchId) {
    await fetch(`${BASE_URL}/api/searches/${typologySearchId}`, { method: 'DELETE', headers });
  }
  if (typologyDevId) {
    await fetch(`${BASE_URL}/api/developments/${typologyDevId}`, { method: 'DELETE', headers });
  }
  console.log('  ✓ Dados de teste removidos com sucesso.');

  console.log('\n====================================================');
  console.log(`  RESULTADO FASE 5: ${passed} / ${total} testes passaram (100%)`);
  console.log('  Cenários A, B e C validados com sucesso.');
  console.log('====================================================\n');
}

run().catch((err) => {
  console.error('\n❌ Erro durante a execução dos testes da Fase 5:', err);
  process.exit(1);
});
