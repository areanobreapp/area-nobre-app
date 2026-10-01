async function testE2E() {
  console.log('--- Iniciando Testes End-to-End HTTP da Fase 2.1 ---');
  const baseUrl = 'http://localhost:3000';

  // 1. Login com conta Demo
  console.log('1. Realizando login demo...');
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isDemo: true }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) throw new Error(`Falha no login: ${JSON.stringify(loginData)}`);

  // Extrai cookie de sessão
  const setCookie = loginRes.headers.get('set-cookie');
  if (!setCookie) throw new Error('Cookie de sessão não recebido no login.');
  const sessionCookie = setCookie.split(';')[0];
  console.log('✓ Login bem-sucedido! Cookie de sessão:', sessionCookie.substring(0, 30) + '...');

  const authHeaders = {
    'Cookie': sessionCookie,
    'Content-Type': 'application/json',
  };

  // 2. Teste SSR da Home (/)
  console.log('\n2. Testando SSR da Home com Mapa (/)...');
  const homeRes = await fetch(`${baseUrl}/`, { headers: { Cookie: sessionCookie } });
  const homeHtml = await homeRes.text();
  if (homeRes.status !== 200) {
    throw new Error(`Falha ao acessar Home: HTTP ${homeRes.status}`);
  }
  if (!homeHtml.includes('Daiane Corrêa Imóveis')) {
    throw new Error('Identidade "Daiane Corrêa Imóveis" não encontrada no HTML do Header da Home.');
  }
  if (!homeHtml.includes('Carregando carteira no território') && !homeHtml.includes('Carteira Imobiliária')) {
    throw new Error('Componente do mapa não encontrado no HTML da Home.');
  }
  console.log('✓ Home com Mapa renderizou perfeitamente com status HTTP 200 OK e identidade Daiane Corrêa Imóveis.');


  // 3. Teste SSR da Listagem (/empreendimentos)
  console.log('\n3. Testando SSR da página de Empreendimentos (/empreendimentos)...');
  const listRes = await fetch(`${baseUrl}/empreendimentos`, { headers: { Cookie: sessionCookie } });
  const listHtml = await listRes.text();
  if (!listHtml.includes('Imóveis em construção')) {
    throw new Error('Título "Imóveis em construção" não encontrado em /empreendimentos.');
  }
  console.log('✓ Página /empreendimentos renderizou com sucesso (HTTP', listRes.status, ')');

  // 4. API: Listagem de Empreendimentos
  console.log('\n4. Testando GET /api/developments...');
  const devListRes = await fetch(`${baseUrl}/api/developments`, { headers: authHeaders });
  const devListData = await devListRes.json();
  if (!devListRes.ok) throw new Error(`Erro ao listar empreendimentos: ${JSON.stringify(devListData)}`);
  console.log(`✓ Empreendimentos retornados pela API: ${devListData.developments.length}`);

  // 5. API: Criação de Novo Empreendimento com Múltiplas Tipologias
  console.log('\n5. Testando POST /api/developments (Criando Edifício Horizon)...');
  const newDevPayload = {
    name: 'Edifício Horizon',
    developer: 'Vanguard Empreendimentos',
    stage: 'Lançamento',
    deliveryDate: 'Dezembro/2029',
    status: 'Ativo',
    description: 'Lançamento exclusivo com vista para a serra e acabamento de alto padrão.',
    internalNotes: 'Comissão negociada: 4.5% + bônus de lançamento.',
    address: 'Rua Celestina Zaccur',
    number: '120',
    neighborhood: 'Pio Corrêa',
    city: 'Criciúma',
    state: 'SC',
    zipcode: '88811-500',
    latitude: -28.675,
    longitude: -49.365,
    images: ['/uploads/horizon1.jpg', '/uploads/horizon2.jpg'],
    typologies: [
      {
        name: 'Planta 01 — 2 Quartos',
        propertyType: 'Apartamento',
        price: 580000,
        privateArea: 68,
        bedrooms: 2,
        suites: 1,
        bathrooms: 2,
        parkingSpaces: 1,
        status: 'Disponível',
        notes: 'Churrasqueira integrada',
      },
      {
        name: 'Planta 02 — 3 Suítes',
        propertyType: 'Apartamento',
        price: 890000,
        privateArea: 110,
        bedrooms: 3,
        suites: 3,
        bathrooms: 3,
        parkingSpaces: 2,
        status: 'Disponível',
        notes: 'Amplo living e sacada panorâmica',
      },
    ],
  };

  const createRes = await fetch(`${baseUrl}/api/developments`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(newDevPayload),
  });
  const createData = await createRes.json();
  if (!createRes.ok) throw new Error(`Erro ao criar empreendimento: ${JSON.stringify(createData)}`);
  const createdId = createData.development.id;
  console.log(`✓ Empreendimento criado com sucesso! ID: ${createdId}`);
  console.log(`  Tipologias cadastradas: ${createData.development.typologies.length}`);

  // 6. API: Detalhes do Empreendimento
  console.log(`\n6. Testando GET /api/developments/${createdId}...`);
  const getDetailRes = await fetch(`${baseUrl}/api/developments/${createdId}`, { headers: authHeaders });
  const getDetailData = await getDetailRes.json();
  if (!getDetailRes.ok) throw new Error(`Erro ao obter detalhes: ${JSON.stringify(getDetailData)}`);
  console.log(`✓ Detalhes obtidos: ${getDetailData.development.name} — ${getDetailData.development.stage}`);
  console.log(`  Construtora: ${getDetailData.development.developer}`);

  // 7. Teste da página de detalhes (/empreendimentos/[id])
  console.log(`\n7. Testando rota da página de Detalhes (/empreendimentos/${createdId})...`);
  const pageDetailRes = await fetch(`${baseUrl}/empreendimentos/${createdId}`, { headers: { Cookie: sessionCookie } });
  if (pageDetailRes.status !== 200) {
    throw new Error(`Falha ao acessar página de detalhes: HTTP ${pageDetailRes.status}`);
  }
  console.log('✓ Página de detalhes respondeu com status HTTP 200 OK!');


  // 8. API: Edição do Empreendimento (PUT)
  console.log(`\n8. Testando PUT /api/developments/${createdId}...`);
  const updatePayload = {
    ...newDevPayload,
    deliveryDate: 'Outubro/2029',
    typologies: [
      ...newDevPayload.typologies,
      {
        name: 'Planta 03 — Cobertura',
        propertyType: 'Cobertura',
        price: 1450000,
        privateArea: 160,
        bedrooms: 4,
        suites: 3,
        bathrooms: 4,
        parkingSpaces: 3,
        status: 'Disponível',
        notes: 'Piscina aquecida privativa',
      },
    ],
  };
  const updateRes = await fetch(`${baseUrl}/api/developments/${createdId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify(updatePayload),
  });
  const updateData = await updateRes.json();
  if (!updateRes.ok) throw new Error(`Erro ao atualizar empreendimento: ${JSON.stringify(updateData)}`);
  console.log(`✓ Empreendimento atualizado! Nova previsão: ${updateData.development.deliveryDate}`);
  console.log(`  Total de tipologias após edição: ${updateData.development.typologies.length}`);

  // 9. API: Desativação (PATCH status)
  console.log(`\n9. Testando PATCH /api/developments/${createdId} (Desativação)...`);
  const patchRes = await fetch(`${baseUrl}/api/developments/${createdId}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ status: 'Inativo' }),
  });
  const patchData = await patchRes.json();
  if (!patchRes.ok) throw new Error(`Erro ao desativar: ${JSON.stringify(patchData)}`);
  console.log(`✓ Status alternado para: ${patchData.development.status}`);

  // 10. Revalidação das APIs da Fase 2 (Imóveis e Buscas)
  console.log('\n10. Revalidando APIs de Imóveis e Buscas existentes...');
  const propRes = await fetch(`${baseUrl}/api/properties`, { headers: authHeaders });
  const propData = await propRes.json();
  if (!propRes.ok) throw new Error('Falha ao listar imóveis da Fase 2.');
  console.log(`✓ GET /api/properties funcionando! Total: ${propData.properties.length} imóveis.`);

  const searchRes = await fetch(`${baseUrl}/api/searches`, { headers: authHeaders });
  const searchData = await searchRes.json();
  if (!searchRes.ok) throw new Error('Falha ao listar buscas da Fase 2.');
  console.log(`✓ GET /api/searches funcionando! Total: ${searchData.searches.length} buscas.`);

  console.log('\n=============================================================');
  console.log('--- TODOS OS TESTES END-TO-END DA FASE 2.1 FORAM APROVADOS! ---');
  console.log('=============================================================');
}

testE2E().catch((err) => {
  console.error('\n❌ ERRO NO TESTE E2E:', err);
  process.exit(1);
});
