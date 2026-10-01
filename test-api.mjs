// Teste automatizado de rotas HTTP / API da Fase 2
async function runApiTests() {
  console.log('--- Iniciando Testes de Rotas HTTP/API da Fase 2 ---');

  // 1. Login via API
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isDemo: true }),
  });

  console.log('Status login:', loginRes.status);
  const cookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [loginRes.headers.get('set-cookie')];
  console.log('Cookies recebidos:', cookies);
  const sessionCookie = (cookies[0] || '').split(';')[0];
  if (!sessionCookie) throw new Error('Não recebeu cookie de sessão.');
  console.log('✓ Login via API bem-sucedido. Cookie obtido:', sessionCookie);

  const headers = {
    'Cookie': sessionCookie,
    'Content-Type': 'application/json',
  };

  // 2. GET /api/auth/me
  const meRes = await fetch('http://localhost:3000/api/auth/me', { headers });
  const meData = await meRes.json();
  console.log('✓ /api/auth/me:', meData.user.name, `(${meData.user.email})`);

  // 3. GET /api/properties
  const propRes = await fetch('http://localhost:3000/api/properties', { headers });
  const propData = await propRes.json();
  console.log(`✓ /api/properties: ${propData.properties.length} imóvel(is) retornado(s).`);
  const firstProp = propData.properties[0];
  console.log('  Primeiro imóvel:', firstProp.title, `R$ ${firstProp.price.toLocaleString('pt-BR')}`);

  // 4. GET /api/properties com busca textual
  const searchPropRes = await fetch('http://localhost:3000/api/properties?search=Centro', { headers });
  const searchPropData = await searchPropRes.json();
  console.log(`✓ /api/properties?search=Centro: ${searchPropData.properties.length} imóvel(is) encontrado(s).`);

  // 5. GET /api/properties/[id]
  const singlePropRes = await fetch(`http://localhost:3000/api/properties/${firstProp.id}`, { headers });
  const singlePropData = await singlePropRes.json();
  console.log(`✓ /api/properties/${firstProp.id}: ${singlePropData.property.title} carregado com sucesso.`);

  // 6. GET /api/searches
  const searchRes = await fetch('http://localhost:3000/api/searches', { headers });
  const searchData = await searchRes.json();
  console.log(`✓ /api/searches: ${searchData.searches.length} busca(s) retornada(s).`);
  const firstSearch = searchData.searches[0];
  console.log('  Primeira busca:', firstSearch.name, `Cliente: ${firstSearch.client.name}`);

  // 7. GET /api/searches/[id]
  const singleSearchRes = await fetch(`http://localhost:3000/api/searches/${firstSearch.id}`, { headers });
  const singleSearchData = await singleSearchRes.json();
  console.log(`✓ /api/searches/${firstSearch.id}: ${singleSearchData.search.name} carregada com sucesso.`);

  // 8. PATCH /api/searches/[id] (Alternar status)
  const patchRes = await fetch(`http://localhost:3000/api/searches/${firstSearch.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ active: !firstSearch.active }),
  });
  const patchData = await patchRes.json();
  console.log(`✓ PATCH /api/searches/${firstSearch.id}: status alternado para active=${patchData.search.active}`);

  // Reverte para active true
  await fetch(`http://localhost:3000/api/searches/${firstSearch.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ active: true }),
  });

  console.log('\n--- TODOS OS TESTES DE API PASSARAM COM SUCESSO! ---');
}

runApiTests().catch((e) => {
  console.error('Erro nos testes de API:', e);
  process.exit(1);
});
