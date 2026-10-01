// test-e2e-phase3.mjs - End-to-End API and Recalculation Verification for Fase 3

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
  console.log('====================================================');
  console.log('TESTES END-TO-END — FASE 3 (API & RECÁLCULO EM TEMPO REAL)');
  console.log('====================================================\n');

  // 1. Login
  console.log('1. Autenticação do usuário Daiane Corrêa');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isDemo: true }),
  });
  assert(loginRes.ok, 'Login efetuado com sucesso');
  const cookies = loginRes.headers.get('set-cookie');
  assert(Boolean(cookies), 'Cookie de sessão recebido');

  const authHeaders = {
    Cookie: cookies,
    'Content-Type': 'application/json',
  };

  // 2. Busca lista de demandas (Buscas)
  console.log('\n2. Consulta de Buscas (/api/searches)');
  const searchesRes = await fetch(`${BASE_URL}/api/searches`, { headers: authHeaders });
  const searchesData = await searchesRes.json();
  assert(searchesData.success === true, 'Buscas retornadas com sucesso');
  assert(searchesData.searches.length > 0, `Total de ${searchesData.searches.length} buscas cadastradas`);

  const anaSearch = searchesData.searches.find((s) => s.client?.name === 'Ana Souza');
  assert(Boolean(anaSearch), 'Busca da cliente Ana Souza encontrada');

  // 3. Detalhes da Busca com Matches (Busca -> Oferta)
  console.log(`\n3. Detalhes da Busca da Ana Souza (/api/searches/${anaSearch.id})`);
  const anaSearchDetailRes = await fetch(`${BASE_URL}/api/searches/${anaSearch.id}`, { headers: authHeaders });
  const anaSearchDetail = await anaSearchDetailRes.json();
  assert(anaSearchDetail.success === true, 'Detalhes da busca carregados');
  const anaMatches = anaSearchDetail.search.matches;
  assert(Array.isArray(anaMatches) && anaMatches.length > 0, `Matches encontrados: ${anaMatches.length}`);

  console.log('  Matches retornados para Ana Souza:');
  anaMatches.forEach((m) => {
    const offerTitle = m.property?.title || `${m.typology?.development?.name} — ${m.typology?.name}`;
    console.log(`    - [${m.score}%] ${offerTitle} (${m.offerType})`);
  });

  const hasPropertyMatch = anaMatches.some((m) => m.offerType === 'PROPERTY');
  const hasTypologyMatch = anaMatches.some((m) => m.offerType === 'TYPOLOGY');
  assert(hasPropertyMatch, 'Contém match com Imóvel Convencional (Pronto)');
  assert(hasTypologyMatch, 'Contém match com Tipologia de Empreendimento (Em construção)');

  const topMatch = anaMatches[0];
  assert(topMatch.score >= 90, `Top match possui score alto (obtido: ${topMatch.score}%)`);
  assert(Array.isArray(topMatch.parsedExplanation) && topMatch.parsedExplanation.length > 0, 'Explicações analíticas estruturadas presentes');

  // 4. Detalhes do Imóvel com Matches (Oferta -> Busca)
  console.log('\n4. Detalhes de Imóvel com Buscas Compatíveis (/api/properties)');
  const propsRes = await fetch(`${BASE_URL}/api/properties`, { headers: authHeaders });
  const propsData = await propsRes.json();
  assert(propsData.properties.length > 0, 'Imóveis listados');
  const prop1 = propsData.properties.find((p) => p.title.includes('Centro com Varanda'));
  assert(Boolean(prop1), 'Imóvel no Centro com Varanda localizado');

  const prop1DetailRes = await fetch(`${BASE_URL}/api/properties/${prop1.id}`, { headers: authHeaders });
  const prop1Detail = await prop1DetailRes.json();
  const propMatches = prop1Detail.property.matches;
  assert(Array.isArray(propMatches) && propMatches.length > 0, `Imóvel possui ${propMatches.length} buscas compatíveis`);
  const matchWithAna = propMatches.find((m) => m.search?.client?.name === 'Ana Souza');
  assert(Boolean(matchWithAna), 'Identificou busca da Ana Souza para este imóvel');
  assert(matchWithAna.score === 100, `Score de match perfeito é 100% (obtido: ${matchWithAna.score}%)`);

  // 5. Detalhes de Empreendimento com Matches por Tipologia
  console.log('\n5. Empreendimento com Matches por Tipologia (/api/developments)');
  const devsRes = await fetch(`${BASE_URL}/api/developments`, { headers: authHeaders });
  const devsData = await devsRes.json();
  const devAurora = devsData.developments.find((d) => d.name.includes('Aurora'));
  assert(Boolean(devAurora), 'Residencial Aurora localizado');

  const devAuroraDetailRes = await fetch(`${BASE_URL}/api/developments/${devAurora.id}`, { headers: authHeaders });
  const devAuroraDetail = await devAuroraDetailRes.json();
  const typologies = devAuroraDetail.development.typologies;
  assert(typologies.length > 0, `Residencial Aurora possui ${typologies.length} tipologias`);

  let totalDevMatches = 0;
  typologies.forEach((t) => {
    totalDevMatches += t.matches?.length || 0;
    console.log(`    - Tipologia "${t.name}": ${t.matches?.length || 0} match(es)`);
  });
  assert(totalDevMatches > 0, `Total de ${totalDevMatches} matches identificados no empreendimento`);

  // 6. Teste de Recálculo Dinâmico ao Editar Busca
  console.log('\n6. Teste de Recálculo Dinâmico (Edição de Busca)');
  const originalMaxPrice = anaSearch.maxPrice;
  console.log(`  Elevando teto da busca de ${originalMaxPrice} para 800.000...`);

  const updateSearchRes = await fetch(`${BASE_URL}/api/searches/${anaSearch.id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      maxPrice: 800000,
    }),
  });
  assert(updateSearchRes.ok, 'Busca atualizada com sucesso');

  // Consulta novamente a busca para verificar scores recalculados
  const recheckedSearchRes = await fetch(`${BASE_URL}/api/searches/${anaSearch.id}`, { headers: authHeaders });
  const recheckedSearch = await recheckedSearchRes.json();
  const aurora3BedsMatch = recheckedSearch.search.matches.find((m) =>
    m.typology?.name?.includes('3 dormitórios')
  );
  assert(Boolean(aurora3BedsMatch), 'Tipologia 3 dormitórios encontrada nos matches');
  // Com teto de 800k, a tipologia de 730k agora fica 100% dentro do orçamento!
  assert(
    aurora3BedsMatch.score === 100,
    `Com teto maior (800k), Residencial Aurora 3 dorms (730k) deve subir para 100% (obtido: ${aurora3BedsMatch.score}%)`
  );

  // Restaura o teto original (700.000)
  console.log(`  Restaurando teto da busca para ${originalMaxPrice}...`);
  await fetch(`${BASE_URL}/api/searches/${anaSearch.id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      maxPrice: originalMaxPrice,
    }),
  });

  const restoredSearchRes = await fetch(`${BASE_URL}/api/searches/${anaSearch.id}`, { headers: authHeaders });
  const restoredSearch = await restoredSearchRes.json();
  const aurora3BedsRestored = restoredSearch.search.matches.find((m) =>
    m.typology?.name?.includes('3 dormitórios')
  );
  assert(
    aurora3BedsRestored.score === 91,
    `Com teto restaurado (700k), Residencial Aurora (730k) volta para 91% (obtido: ${aurora3BedsRestored.score}%)`
  );

  // 7. Teste de Criação e Desativação de Oferta com Limpeza de Matches
  console.log('\n7. Teste de Ciclo de Vida: Cadastro e Exclusão de Imóvel');
  const tempPropRes = await fetch(`${BASE_URL}/api/properties`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Apartamento Temporário Teste Match',
      propertyType: 'Apartamento',
      purpose: 'Venda',
      price: 650000,
      bedrooms: 3,
      suites: 1,
      bathrooms: 2,
      parkingSpaces: 2,
      privateArea: 85,
      city: 'Criciúma',
      neighborhood: 'Centro',
      status: 'Disponível',
    }),
  });
  const tempPropData = await tempPropRes.json();
  assert(tempPropRes.ok, 'Imóvel temporário cadastrado');

  // Verifica se o match foi gerado automaticamente para a Ana Souza
  const tempPropDetailRes = await fetch(`${BASE_URL}/api/properties/${tempPropData.property.id}`, { headers: authHeaders });
  const tempPropDetail = await tempPropDetailRes.json();
  assert(tempPropDetail.property.matches?.length > 0, 'Matches recalculados automaticamente na criação do imóvel');

  // Exclui o imóvel temporário
  const deleteRes = await fetch(`${BASE_URL}/api/properties/${tempPropData.property.id}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  assert(deleteRes.ok, 'Imóvel temporário excluído com sucesso');

  console.log('\n====================================================');
  console.log(`RESULTADO DOS TESTES E2E: ${passed} passaram, ${failed} falharam.`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
