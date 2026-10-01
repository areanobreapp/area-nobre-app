// test-phase5-4-shared-map.mjs
// Testes automatizados do Ajuste Final da Fase 5.4:
// Mapa Compartilhado entre Corretores, Filtro "Todos | Meus Imóveis",
// Autoria, Privacidade e Autorização

import assert from 'node:assert';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';
const SECRET = process.env.AUTH_SECRET || 'area-nobre-secret-key-development-2026';

function signPayload(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function createSessionCookie(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const token = signPayload(payload);
  return `areanobre_session=${token}`;
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, headers: res.headers, text, json };
}

async function main() {
  console.log('--- INICIANDO TESTES DO AJUSTE FINAL DA FASE 5.4: MAPA COMPARTILHADO ---');

  // 1. Setup de Usuários para os Testes: Daiane e Márcia
  const passwordHash = await bcrypt.hash('senha123', 10);

  // Daiane
  const daiane = await prisma.user.upsert({
    where: { email: 'demo@areanobre.local' },
    update: { status: 'ACTIVE', role: 'BROKER', passwordHash },
    create: {
      name: 'Daiane Corrêa',
      email: 'demo@areanobre.local',
      passwordHash,
      role: 'BROKER',
      status: 'ACTIVE',
    },
  });

  await prisma.brokerProfile.upsert({
    where: { userId: daiane.id },
    update: {
      commercialName: 'Daiane Corrêa Imóveis',
      creci: '54321-F',
      phone: '5548999999999',
    },
    create: {
      userId: daiane.id,
      commercialName: 'Daiane Corrêa Imóveis',
      creci: '54321-F',
      phone: '5548999999999',
    },
  });

  // Márcia
  const marcia = await prisma.user.upsert({
    where: { email: 'marcia@areanobre.local' },
    update: { status: 'ACTIVE', role: 'BROKER' },
    create: {
      name: 'Márcia Santos',
      email: 'marcia@areanobre.local',
      passwordHash,
      role: 'BROKER',
      status: 'ACTIVE',
    },
  });

  await prisma.brokerProfile.upsert({
    where: { userId: marcia.id },
    update: {
      commercialName: 'Márcia Imóveis Selecionados',
      creci: '12345-F',
      phone: '5548988888888',
      tagline: 'Excelência em cada metro quadrado',
    },
    create: {
      userId: marcia.id,
      commercialName: 'Márcia Imóveis Selecionados',
      creci: '12345-F',
      phone: '5548988888888',
      tagline: 'Excelência em cada metro quadrado',
    },
  });

  // Corretor Inativo para Teste K
  const inativo = await prisma.user.upsert({
    where: { email: 'inativo@areanobre.local' },
    update: { status: 'INACTIVE', role: 'BROKER' },
    create: {
      name: 'Corretor Desativado',
      email: 'inativo@areanobre.local',
      passwordHash,
      role: 'BROKER',
      status: 'INACTIVE',
    },
  });

  // Cria Imóvel da Márcia com notas confidenciais e boundary
  let imovelMarcia = await prisma.property.findFirst({
    where: { title: 'Cobertura Exclusiva Márcia Centro' },
  });
  if (!imovelMarcia) {
    imovelMarcia = await prisma.property.create({
      data: {
        title: 'Cobertura Exclusiva Márcia Centro',
        propertyType: 'Apartamento',
        purpose: 'Venda',
        status: 'Disponível',
        price: 1500000,
        bedrooms: 4,
        suites: 3,
        bathrooms: 4,
        parkingSpaces: 3,
        privateArea: 240,
        city: 'Criciúma',
        neighborhood: 'Centro',
        address: 'Rua Coronel Pedro Benedet, 300',
        latitude: -28.6780,
        longitude: -49.3710,
        registryNumber: 'MATR-998877-CONFIDENCIAL',
        internalNotes: 'Proprietário aceita negociar até R$ 1.400.000 à vista. Não divulgar.',
        exchangeNotes: 'Aceita imóvel até 40% em Criciúma.',
        boundary: '{"type":"Polygon","coordinates":[[[-49.3712,-28.6782],[-49.3708,-28.6782],[-49.3708,-28.6778],[-49.3712,-28.6778],[-49.3712,-28.6782]]]}',
        boundaryArea: 450,
        userId: marcia.id,
        responsibleBrokerId: marcia.id,
      },
    });
  }

  // Cria Empreendimento da Márcia
  let devMarcia = await prisma.development.findFirst({
    where: { name: 'Residencial Márcia Prime' },
  });
  if (!devMarcia) {
    devMarcia = await prisma.development.create({
      data: {
        name: 'Residencial Márcia Prime',
        developer: 'Construtora Prime',
        stage: 'Lançamento',
        status: 'Ativo',
        city: 'Criciúma',
        neighborhood: 'Pio Corrêa',
        latitude: -28.6810,
        longitude: -49.3650,
        userId: marcia.id,
        responsibleBrokerId: marcia.id,
        typologies: {
          create: [
            {
              name: 'Tipo A - 3 Suítes',
              propertyType: 'Apartamento',
              price: 980000,
              bedrooms: 3,
              suites: 3,
              bathrooms: 4,
              parkingSpaces: 2,
              status: 'Disponível',
              notes: 'Comissão diferenciada 7% direta com o diretor.',
            },
          ],
        },
      },
    });
  }

  // Cria Imóvel do Corretor Inativo
  let imovelInativo = await prisma.property.findFirst({
    where: { title: 'Imóvel Fantasma Corretor Inativo' },
  });
  if (!imovelInativo) {
    imovelInativo = await prisma.property.create({
      data: {
        title: 'Imóvel Fantasma Corretor Inativo',
        propertyType: 'Casa',
        purpose: 'Venda',
        status: 'Disponível',
        price: 500000,
        bedrooms: 3,
        suites: 1,
        bathrooms: 2,
        parkingSpaces: 2,
        city: 'Criciúma',
        neighborhood: 'Michel',
        latitude: -28.6850,
        longitude: -49.3750,
        userId: inativo.id,
        responsibleBrokerId: inativo.id,
      },
    });
  }

  // Garante que a Daiane possui pelo menos 1 imóvel
  const imovelDaiane = await prisma.property.findFirst({
    where: { responsibleBrokerId: daiane.id },
  });
  assert(imovelDaiane, 'Daiane deve possuir pelo menos 1 imóvel cadastrado.');

  console.log('✓ Setup de usuários e registros operacionais concluído.');

  // Tokens e Sessões
  const cookieDaiane = createSessionCookie(daiane);
  const cookieMarcia = createSessionCookie(marcia);

  // -------------------------------------------------------------
  // TESTE A: Visão compartilhada no mapa para a Daiane
  // -------------------------------------------------------------
  console.log('\n--- Teste A: Visão compartilhada da Daiane ---');
  const resSharedDaiane = await request('/api/properties?scope=shared', {
    headers: { Cookie: cookieDaiane },
  });
  assert.strictEqual(resSharedDaiane.status, 200);
  const sharedPropsDaiane = resSharedDaiane.json.properties;
  
  const hasDaianePropInShared = sharedPropsDaiane.some(p => p.responsibleBrokerId === daiane.id || p.userId === daiane.id);
  const hasMarciaPropInShared = sharedPropsDaiane.some(p => p.responsibleBrokerId === marcia.id || p.userId === marcia.id);
  assert(hasDaianePropInShared, 'Daiane deve ver seus próprios imóveis na visão compartilhada.');
  assert(hasMarciaPropInShared, 'Daiane deve ver o imóvel da Márcia na visão compartilhada.');
  console.log(`✓ Teste A passou: Daiane vê base compartilhada com ${sharedPropsDaiane.length} imóveis.`);

  // -------------------------------------------------------------
  // TESTE B: Visão compartilhada inversa para a Márcia
  // -------------------------------------------------------------
  console.log('\n--- Teste B: Visão compartilhada inversa da Márcia ---');
  const resSharedMarcia = await request('/api/properties?scope=shared', {
    headers: { Cookie: cookieMarcia },
  });
  assert.strictEqual(resSharedMarcia.status, 200);
  const sharedPropsMarcia = resSharedMarcia.json.properties;

  const hasMarciaPropInMarciaView = sharedPropsMarcia.some(p => p.responsibleBrokerId === marcia.id || p.userId === marcia.id);
  const hasDaianePropInMarciaView = sharedPropsMarcia.some(p => p.responsibleBrokerId === daiane.id || p.userId === daiane.id);
  assert(hasMarciaPropInMarciaView, 'Márcia deve ver seus próprios imóveis na visão compartilhada.');
  assert(hasDaianePropInMarciaView, 'Márcia deve ver os imóveis da Daiane na visão compartilhada.');
  console.log(`✓ Teste B passou: Márcia vê base compartilhada com ${sharedPropsMarcia.length} imóveis.`);

  // -------------------------------------------------------------
  // TESTE C: Filtro "Meus imóveis"
  // -------------------------------------------------------------
  console.log('\n--- Teste C: Filtro "Meus imóveis" ---');
  const resMineDaiane = await request('/api/properties?scope=mine', {
    headers: { Cookie: cookieDaiane },
  });
  assert.strictEqual(resMineDaiane.status, 200);
  const myPropsDaiane = resMineDaiane.json.properties;

  const allBelongToDaiane = myPropsDaiane.every(p => p.responsibleBrokerId === daiane.id || p.userId === daiane.id);
  assert(allBelongToDaiane, 'Todos os imóveis sob escopo "mine" devem pertencer à Daiane.');
  const marciaInMine = myPropsDaiane.some(p => p.responsibleBrokerId === marcia.id || p.userId === marcia.id);
  assert(!marciaInMine, 'Imóveis da Márcia NÃO devem constar sob o escopo "mine" da Daiane.');
  console.log(`✓ Teste C passou: Daiane filtrou com sucesso seus ${myPropsDaiane.length} imóveis exclusivos.`);

  // -------------------------------------------------------------
  // TESTE D: Retorno para "Todos os imóveis"
  // -------------------------------------------------------------
  console.log('\n--- Teste D: Retorno para "Todos os imóveis" ---');
  const resAllAgain = await request('/api/properties?scope=shared', {
    headers: { Cookie: cookieDaiane },
  });
  assert.strictEqual(resAllAgain.status, 200);
  assert(resAllAgain.json.properties.length > myPropsDaiane.length, 'Retornar para Todos restaura as ofertas de outros corretores.');
  console.log('✓ Teste D passou: Base completa restaurada.');

  // -------------------------------------------------------------
  // TESTE E: Autoria e Identidade do Corretor Responsável
  // -------------------------------------------------------------
  console.log('\n--- Teste E: Identidade do Corretor Responsável ---');
  const marciaPropViewedByDaiane = sharedPropsDaiane.find(p => p.id === imovelMarcia.id);
  assert(marciaPropViewedByDaiane, 'Imóvel da Márcia deve estar presente.');
  assert(marciaPropViewedByDaiane.responsibleBroker, 'Objeto responsibleBroker deve estar presente no imóvel.');
  assert.strictEqual(marciaPropViewedByDaiane.responsibleBroker.name, 'Márcia Santos');
  assert.strictEqual(marciaPropViewedByDaiane.responsibleBroker.profile.commercialName, 'Márcia Imóveis Selecionados');
  assert.strictEqual(marciaPropViewedByDaiane.responsibleBroker.profile.creci, '12345-F');
  console.log('✓ Teste E passou: Identidade profissional de Márcia exposta de forma elegante e correta.');

  // -------------------------------------------------------------
  // TESTE F: Privacidade e Sanitização de Campos Confidenciais
  // -------------------------------------------------------------
  console.log('\n--- Teste F: Privacidade e Sanitização ---');
  assert.strictEqual(marciaPropViewedByDaiane.internalNotes, null, 'Notas internas da Márcia devem ser nulas para Daiane.');
  assert.strictEqual(marciaPropViewedByDaiane.exchangeNotes, null, 'Notas de permuta da Márcia devem ser nulas para Daiane.');
  assert.strictEqual(marciaPropViewedByDaiane.registryNumber, null, 'Matrícula da Márcia deve ser nula para Daiane.');
  assert.strictEqual(marciaPropViewedByDaiane.boundary, null, 'Boundary privado da Márcia deve ser nulo para Daiane.');

  // Detalhe via API GET /api/properties/:id
  const resDetailDaiane = await request(`/api/properties/${imovelMarcia.id}`, {
    headers: { Cookie: cookieDaiane },
  });
  assert.strictEqual(resDetailDaiane.status, 200);
  assert.strictEqual(resDetailDaiane.json.isOwner, false, 'Daiane não deve ser identificada como proprietária do imóvel da Márcia.');
  assert.strictEqual(resDetailDaiane.json.property.internalNotes, null, 'Notas internas sanitizadas no endpoint de detalhe.');
  assert.strictEqual(resDetailDaiane.json.property.registryNumber, null, 'Matrícula sanitizada no endpoint de detalhe.');
  console.log('✓ Teste F passou: Campos confidenciais protegidos rigorosamente.');

  // -------------------------------------------------------------
  // TESTE G: Autorização e Bloqueio de IDOR
  // -------------------------------------------------------------
  console.log('\n--- Teste G: Autorização e IDOR ---');
  const resEditAttempt = await request(`/api/properties/${imovelMarcia.id}`, {
    method: 'PUT',
    headers: { Cookie: cookieDaiane },
    body: JSON.stringify({ price: 1000 }),
  });
  assert.strictEqual(resEditAttempt.status, 403, 'Tentativa de edição de imóvel de outro corretor deve retornar HTTP 403 Forbidden.');

  const resDeleteAttempt = await request(`/api/properties/${imovelMarcia.id}`, {
    method: 'DELETE',
    headers: { Cookie: cookieDaiane },
  });
  assert.strictEqual(resDeleteAttempt.status, 403, 'Tentativa de exclusão de imóvel de outro corretor deve retornar HTTP 403 Forbidden.');
  console.log('✓ Teste G passou: Edição e exclusão bloqueadas no backend com HTTP 403.');

  // -------------------------------------------------------------
  // TESTE H & I: Matching Multiusuário e Preservação de Score
  // -------------------------------------------------------------
  console.log('\n--- Teste H & I: Matching e Score ---');
  // Cria busca para Daiane compatível com o imóvel da Márcia via POST /api/searches
  const resCreateSearch = await request('/api/searches', {
    method: 'POST',
    headers: { Cookie: cookieDaiane },
    body: JSON.stringify({
      clientName: 'Comprador Investidor VIP',
      clientPhone: '5548977777777',
      name: 'Cliente Alta Renda Daiane',
      propertyTypes: ['Apartamento'],
      purpose: 'Venda',
      minPrice: 1000000,
      maxPrice: 2000000,
      minBedrooms: 3,
      neighborhoods: ['Centro'],
      cities: ['Criciúma'],
    }),
  });
  assert.strictEqual(resCreateSearch.status, 200, 'POST /api/searches deve retornar HTTP 200.');
  const searchId = resCreateSearch.json.search.id;

  const resMatches = await request(`/api/searches/${searchId}`, {
    headers: { Cookie: cookieDaiane },
  });
  assert.strictEqual(resMatches.status, 200);
  const matches = resMatches.json.search?.matches || [];
  const matchMarcia = matches.find(m => m.propertyId === imovelMarcia.id);
  assert(matchMarcia, 'Busca da Daiane deve encontrar o imóvel compatível da Márcia.');
  assert(matchMarcia.score >= 70, `Score deve atender o threshold >= 70% (atual: ${matchMarcia.score}%).`);
  console.log(`✓ Teste H & I passou: Match multiusuário gerado com score puro de ${matchMarcia.score}%.`);

  // Limpa busca de teste
  await prisma.search.delete({ where: { id: searchId } });

  // -------------------------------------------------------------
  // TESTE J: Empreendimentos e Tipologias Compartilhados
  // -------------------------------------------------------------
  console.log('\n--- Teste J: Empreendimentos Compartilhados ---');
  const resSharedDevs = await request('/api/developments?scope=shared', {
    headers: { Cookie: cookieDaiane },
  });
  assert.strictEqual(resSharedDevs.status, 200);
  const sharedDevs = resSharedDevs.json.developments;
  const devMarciaInShared = sharedDevs.find(d => d.id === devMarcia.id);
  assert(devMarciaInShared, 'Empreendimento da Márcia deve constar na visão compartilhada da Daiane.');
  assert(devMarciaInShared.responsibleBroker, 'responsibleBroker deve estar presente no empreendimento.');
  assert.strictEqual(devMarciaInShared.typologies[0].notes, null, 'Notas internas da tipologia devem ser sanitizadas para outro corretor.');
  console.log('✓ Teste J passou: Empreendimentos compartilhados e notas de tipologia sanitizadas.');

  // -------------------------------------------------------------
  // TESTE K: Corretor Inativo Não Aparece no Mapa Compartilhado
  // -------------------------------------------------------------
  console.log('\n--- Teste K: Usuários Inativos ---');
  const hasInactiveProp = sharedPropsDaiane.some(p => p.id === imovelInativo.id);
  assert(!hasInactiveProp, 'Imóveis de corretor INACTIVE NÃO podem aparecer na base compartilhada do mapa.');
  console.log('✓ Teste K passou: Imóveis de corretores desativados permanecem fora do mapa compartilhado.');

  // Limpeza de registros de teste temporários
  await prisma.property.delete({ where: { id: imovelInativo.id } });
  await prisma.development.delete({ where: { id: devMarcia.id } });
  await prisma.property.delete({ where: { id: imovelMarcia.id } });
  await prisma.user.delete({ where: { id: inativo.id } });
  await prisma.user.delete({ where: { id: marcia.id } });

  console.log('\n🎉 TODOS OS TESTES DO AJUSTE FINAL DA FASE 5.4 PASSARAM COM SUCESSO! 🎉\n');
}

main().catch((err) => {
  console.error('❌ Falha nos testes:', err);
  process.exit(1);
});
