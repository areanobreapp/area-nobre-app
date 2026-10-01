import { prisma } from './src/lib/db.ts';
import {
  generatePublicId,
  getAppBaseUrl,
  getPublicPropertyUrl,
  getShareWithClientWhatsAppUrl,
  getContactBrokerWhatsAppUrl,
  BROKER_CONFIG,
} from './src/lib/public-sharing.ts';
import { toPublicPropertyDTO } from './src/lib/public-property-dto.ts';
import { getTerritorialApproximateCenter } from './src/lib/geo/neighborhood-centroids.ts';

function assert(condition, message) {
  if (!condition) {
    console.error(`  ✕ FAIL: ${message}`);
    throw new Error(message);
  } else {
    console.log(`  ✓ PASS: ${message}`);
  }
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('TESTES OBRIGATÓRIOS FASE 5.3 — PÁGINA PÚBLICA, MAPA & COMPARTILHAMENTO');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      passed++;
    } catch (e) {
      // erro já impresso pelo assert
    }
  }

  // --- TESTE 1: IDENTIFICADORES PÚBLICOS E URLS ---
  console.log('--- TESTE 1: IDENTIFICADOR PÚBLICO E URLS ---');
  test('generatePublicId gera código alfanumérico seguro com 8 caracteres', () => {
    const id1 = generatePublicId();
    const id2 = generatePublicId();
    assert(typeof id1 === 'string' && id1.length === 8, `ID possui 8 caracteres: ${id1}`);
    assert(/^[a-zA-Z0-9]+$/.test(id1), `ID é alfanumérico seguro: ${id1}`);
    assert(id1 !== id2, `IDs sucessivos são distintos: ${id1} !== ${id2}`);
  });

  test('getAppBaseUrl respeita ambiente e getPublicPropertyUrl monta rota /p/imovel/[publicId]', () => {
    const base = getAppBaseUrl();
    assert(typeof base === 'string' && base.length > 0, `Base URL configurada: ${base}`);
    const url = getPublicPropertyUrl('X7K4M2A9');
    assert(url.includes('/p/imovel/X7K4M2A9'), `URL pública formatada: ${url}`);
  });

  test('WhatsApp para o cliente usa telefone do cliente e mensagem personalizada com URL', () => {
    const shareUrl = getPublicPropertyUrl('TEST1234');
    const waUrl = getShareWithClientWhatsAppUrl('(48) 99876-5432', 'Mariana Ferreira', shareUrl);
    assert(waUrl !== null, 'URL do WhatsApp gerada para cliente');
    assert(waUrl.includes('5548998765432'), `Número formatado: ${waUrl}`);
    assert(waUrl.includes('Mariana'), `Mensagem contém primeiro nome: ${waUrl}`);
    assert(waUrl.includes('TEST1234'), `Mensagem contém link da apresentação: ${waUrl}`);
    assert(!waUrl.includes('score') && !waUrl.includes('match'), 'Mensagem NÃO expõe inteligência interna de match');
  });

  test('WhatsApp da página pública direciona para o telefone profissional da Daiane Corrêa', () => {
    const shareUrl = getPublicPropertyUrl('TEST1234');
    const contactUrl = getContactBrokerWhatsAppUrl('Apartamento no Centro', shareUrl);
    assert(contactUrl.includes(BROKER_CONFIG.phone), `Direciona para telefone da Daiane (${BROKER_CONFIG.phone})`);
    assert(contactUrl.includes('Apartamento%20no%20Centro') || contactUrl.includes('Apartamento'), 'Mensagem cita o título do imóvel');
  });

  // --- TESTE 2: SANITIZAÇÃO RIGOROSA DE DADOS PRIVADOS (DTO) ---
  console.log('\n--- TESTE 2: SANITIZAÇÃO RIGOROSA DO DTO PÚBLICO (DADOS PRIVADOS) ---');
  const mockInternalEntity = {
    id: 'internal-uuid-secret-999',
    userId: 'user-corretor-private-id',
    title: 'Apartamento de Luxo Centro',
    propertyType: 'Apartamento',
    purpose: 'Venda',
    price: 850000,
    description: 'Belo apartamento bem localizado.',
    bedrooms: 3,
    suites: 1,
    otherBedrooms: 2,
    bathrooms: 2,
    otherBathrooms: 1,
    parkingSpaces: 2,
    privateArea: 115,
    totalArea: 160,
    landArea: null,
    floor: 7,
    city: 'Criciúma',
    state: 'SC',
    neighborhood: 'Centro',
    address: 'Rua Secreta do Proprietário',
    number: '777',
    complement: 'Apto 701',
    zipcode: '88801-000',
    latitude: -28.6775,
    longitude: -49.3695,
    // DADOS ESTRITAMENTE CONFIDENCIAIS:
    registryNumber: 'MATRICULA-12345-CARTORIO-1',
    internalNotes: 'Proprietário precisa vender com urgência por motivo de divórcio.',
    exchangeNotes: 'Aceita imóvel até R$ 300 mil ou camionete Hilux.',
    boundary: '{"type":"Polygon","coordinates":[[[-49.36,-28.67],[-49.36,-28.68],[-49.37,-28.67],[-49.36,-28.67]]]}',
    boundaryArea: 350.5,
    acceptsExchange: true,
    hasPool: true,
    hasGym: true,
    hasBarbecue: true,
    hasPartyHall: true,
    hasElevator: true,
    isPenthouse: false,
    hasPetSpace: null,
    furniture: 'Semi',
    publicId: 'PUB12345',
    publicLocationPrecision: 'APPROXIMATE',
    publishedAt: new Date(),
    images: [{ id: 'img-1', url: 'https://exemplo.com/foto1.jpg', isCover: true }],
  };

  test('DTO elimina estritamente matrícula, notas internas, observações de permuta e boundary', () => {
    const dto = toPublicPropertyDTO(mockInternalEntity, 'PROPERTY');

    assert(dto.publicId === 'PUB12345', 'publicId preservado no DTO');
    assert(dto['registryNumber'] === undefined, 'Matrícula (registryNumber) NÃO existe no DTO');
    assert(dto['internalNotes'] === undefined, 'Notas internas (internalNotes) NÃO existem no DTO');
    assert(dto['exchangeNotes'] === undefined, 'Notas da permuta (exchangeNotes) NÃO existem no DTO');
    assert(dto['boundary'] === undefined, 'Boundary privado do terreno NÃO existe no DTO');
    assert(dto['boundaryArea'] === undefined, 'Área do boundary privado NÃO existe no DTO');
    assert(dto['userId'] === undefined, 'ID interno do usuário NÃO existe no DTO');
    assert(dto['id'] === undefined, 'ID interno do banco NÃO existe no DTO');
    assert(dto.acceptsExchange === true, 'Sinalização pública de permuta (true) permitida');
  });

  // --- TESTE 3: MODOS DE PRIVACIDADE DE LOCALIZAÇÃO ---
  console.log('\n--- TESTE 3: MODOS DE PRIVACIDADE DE LOCALIZAÇÃO ---');
  test('Modo APPROXIMATE (Padrão) exibe bairro e cidade, mas omite rua, número e coordenadas exatas', () => {
    const approx = toPublicPropertyDTO({ ...mockInternalEntity, publicLocationPrecision: 'APPROXIMATE' }, 'PROPERTY');
    assert(approx.locationPrecision === 'APPROXIMATE', 'Precisão APPROXIMATE');
    assert(approx.neighborhood === 'Centro', 'Bairro visível: Centro');
    assert(approx.city === 'Criciúma', 'Cidade visível: Criciúma');
    assert(approx.address === null, 'Endereço/rua omitido em APPROXIMATE');
    assert(approx.number === null, 'Número omitido em APPROXIMATE');
    assert(approx.zipcode === null, 'CEP omitido em APPROXIMATE');
    assert(approx.latitude === null, 'Latitude omitida em APPROXIMATE');
    assert(approx.longitude === null, 'Longitude omitida em APPROXIMATE');
  });

  test('Modo HIDDEN oculta bairro, rua e coordenadas', () => {
    const hidden = toPublicPropertyDTO({ ...mockInternalEntity, publicLocationPrecision: 'HIDDEN' }, 'PROPERTY');
    assert(hidden.locationPrecision === 'HIDDEN', 'Precisão HIDDEN');
    assert(hidden.neighborhood === null, 'Bairro omitido em HIDDEN');
    assert(hidden.city === 'Criciúma', 'Cidade preservada para contexto regional');
    assert(hidden.address === null, 'Endereço omitido em HIDDEN');
    assert(hidden.latitude === null, 'Coordenadas omitidas em HIDDEN');
    assert(hidden.approximateCenter === null, 'Centroide territorial nulo em HIDDEN');
  });

  test('Modo EXACT exibe endereço e coordenadas somente após escolha explícita', () => {
    const exact = toPublicPropertyDTO({ ...mockInternalEntity, publicLocationPrecision: 'EXACT' }, 'PROPERTY');
    assert(exact.locationPrecision === 'EXACT', 'Precisão EXACT');
    assert(exact.address === 'Rua Secreta do Proprietário', 'Endereço visível em EXACT');
    assert(exact.number === '777', 'Número visível em EXACT');
    assert(exact.latitude === -28.6775, 'Latitude visível em EXACT');
    assert(exact.longitude === -49.3695, 'Longitude visível em EXACT');
    assert(exact.approximateCenter === null, 'approximateCenter nulo em EXACT pois coordenada real é usada');
  });

  // --- TESTE 4: DADOS ESPECÍFICOS POR TIPO DE IMÓVEL ---
  console.log('\n--- TESTE 4: DADOS ESPECÍFICOS POR TIPO DE IMÓVEL ---');
  test('Apartamento: Suítes, quartos adicionais, vagas, andar, comodidades', () => {
    const apt = toPublicPropertyDTO({
      ...mockInternalEntity,
      propertyType: 'Apartamento',
      floor: 8,
      suites: 1,
      otherBedrooms: 2,
      parkingSpaces: 2,
      hasElevator: true,
      hasPartyHall: true,
    }, 'PROPERTY');
    assert(apt.propertyType === 'Apartamento', 'Tipo Apartamento');
    assert(apt.floor === 8, 'Andar preservado');
    assert(apt.suites === 1 && apt.otherBedrooms === 2, 'Dormitórios estruturados');
    assert(apt.hasElevator === true && apt.hasPartyHall === true, 'Comodidades de apartamento');
  });

  test('Casa: Área útil, área do terreno, averbação (isRegistered)', () => {
    const casa = toPublicPropertyDTO({
      ...mockInternalEntity,
      propertyType: 'Casa',
      privateArea: 180,
      landArea: 420,
      isRegistered: true,
      floor: null,
    }, 'PROPERTY');
    assert(casa.propertyType === 'Casa', 'Tipo Casa');
    assert(casa.privateArea === 180, 'Área privativa: 180 m²');
    assert(casa.landArea === 420, 'Área do terreno: 420 m²');
    assert(casa.isRegistered === true, 'Casa averbada confirmada');
    assert(casa.floor === null, 'Andar não informado em casa');
  });

  test('Terreno: Área documental, esquina, condomínio, pavimentação', () => {
    const terreno = toPublicPropertyDTO({
      ...mockInternalEntity,
      propertyType: 'Terreno',
      landArea: 600,
      privateArea: null,
      bedrooms: 0,
      suites: 0,
      isCorner: true,
      inGatedCommunity: true,
      streetPaving: 'Asfalto',
    }, 'PROPERTY');
    assert(terreno.propertyType === 'Terreno', 'Tipo Terreno');
    assert(terreno.landArea === 600, 'Área do terreno: 600 m²');
    assert(terreno.isCorner === true, 'Terreno de esquina');
    assert(terreno.inGatedCommunity === true, 'Condomínio fechado');
    assert(terreno.streetPaving === 'Asfalto', 'Pavimentação em asfalto');
  });

  test('Comercial: Tipo de sala (Térrea vs Aérea), banheiros, vagas', () => {
    const com = toPublicPropertyDTO({
      ...mockInternalEntity,
      propertyType: 'Comercial',
      commercialType: 'Térrea',
      bathrooms: 2,
      parkingSpaces: 3,
    }, 'PROPERTY');
    assert(com.propertyType === 'Comercial', 'Tipo Comercial');
    assert(com.commercialType === 'Térrea', 'Sala comercial térrea');
    assert(com.bathrooms === 2 && com.parkingSpaces === 3, 'Banheiros e vagas de comercial');
  });

  test('Tipologia em Construção: Contexto de Empreendimento + Planta da Unidade', () => {
    const mockTypology = {
      id: 'typo-uuid-1',
      publicId: 'TYP12345',
      name: 'Planta Tipo 3 Suítes',
      propertyType: 'Apartamento',
      price: 920000,
      privateArea: 125,
      totalArea: 175,
      bedrooms: 3,
      suites: 3,
      parkingSpaces: 2,
      hasBarbecue: true,
      notes: 'Planta com living integrado e sacada gourmet.',
      publishedAt: new Date(),
      publicLocationPrecision: 'APPROXIMATE',
      development: {
        id: 'dev-uuid-1',
        name: 'Residencial Diamond Tower',
        developer: 'Construtora Fontana',
        stage: 'Em construção',
        deliveryDate: 'Dezembro/2027',
        description: 'Empreendimento de alto padrão no coração da Próspera.',
        neighborhood: 'Próspera',
        city: 'Criciúma',
        state: 'SC',
        hasPool: true,
        hasGym: true,
        hasPartyHall: true,
        hasElevator: true,
        hasDirectInstallments: true,
        images: [{ id: 'dev-img-1', url: 'https://exemplo.com/dev1.jpg', isCover: true }],
      },
    };

    const typoDto = toPublicPropertyDTO(mockTypology, 'TYPOLOGY');
    assert(typoDto.isDevelopmentOffer === true, 'Identificado como oferta de empreendimento');
    assert(typoDto.title.includes('Diamond Tower') && typoDto.title.includes('Planta Tipo 3 Suítes'), 'Título une empreendimento e tipologia');
    assert(typoDto.development?.developer === 'Construtora Fontana', 'Construtora identificada');
    assert(typoDto.development?.stage === 'Em construção', 'Fase da obra identificada');
    assert(typoDto.development?.deliveryDate === 'Dezembro/2027', 'Previsão de entrega identificada');
    assert(typoDto.development?.sharedAmenities?.hasPool === true, 'Comodidades compartilhadas herdadas do condomínio');
    assert(typoDto.suites === 3 && typoDto.privateArea === 125, 'Dados específicos da tipologia preservados');
  });

  // --- TESTE 5: CENTROIDE TERRITORIAL E PRIVACIDADE DO MAPA ---
  console.log('\n--- TESTE 5: CENTROIDE TERRITORIAL E PRIVACIDADE DO MAPA ---');
  test('Centroides territoriais mapeiam com precisão os bairros de Criciúma', () => {
    const centroCentroid = getTerritorialApproximateCenter('Centro', 'Criciúma');
    assert(centroCentroid !== null, 'Centroide do Centro encontrado');
    assert(Math.abs(centroCentroid.latitude - (-28.67881)) < 0.001, 'Latitude coerente com Centro');
    assert(Math.abs(centroCentroid.longitude - (-49.36953)) < 0.001, 'Longitude coerente com Centro');

    const prosperaCentroid = getTerritorialApproximateCenter('Próspera', 'Criciúma');
    assert(prosperaCentroid !== null, 'Centroide da Próspera encontrado');
    assert(Math.abs(prosperaCentroid.latitude - (-28.67933)) < 0.001, 'Latitude coerente com Próspera');

    const michelCentroid = getTerritorialApproximateCenter('Michel', 'Criciúma');
    assert(michelCentroid !== null, 'Centroide do Michel encontrado');
  });

  test('Em APPROXIMATE, DTO envia approximateCenter sem vazar coordenada exata do imóvel', () => {
    const approx = toPublicPropertyDTO(mockInternalEntity, 'PROPERTY');
    assert(approx.locationPrecision === 'APPROXIMATE', 'Precisão APPROXIMATE confirmada');
    assert(approx.latitude === null, 'Latitude exata é estritamente null');
    assert(approx.longitude === null, 'Longitude exata é estritamente null');
    assert(approx.approximateCenter !== null, 'approximateCenter está presente');
    assert(typeof approx.approximateCenter.latitude === 'number', 'approximateCenter.latitude é número válido');
    assert(typeof approx.approximateCenter.longitude === 'number', 'approximateCenter.longitude é número válido');
    // Confirma que a coordenada de centroide NÃO é igual à coordenada exata do imóvel
    assert(
      approx.approximateCenter.latitude !== mockInternalEntity.latitude ||
      approx.approximateCenter.longitude !== mockInternalEntity.longitude,
      'Coordenada aproximada do centroide difere da coordenada privada do imóvel'
    );
  });

  test('Mesmo em EXACT, boundary e notas internas nunca são expostos', () => {
    const exact = toPublicPropertyDTO({ ...mockInternalEntity, publicLocationPrecision: 'EXACT' }, 'PROPERTY');
    assert(exact.locationPrecision === 'EXACT', 'Precisão EXACT');
    assert(exact.latitude === mockInternalEntity.latitude, 'Latitude exata autorizada em EXACT');
    assert(exact.longitude === mockInternalEntity.longitude, 'Longitude exata autorizada em EXACT');
    assert(exact['boundary'] === undefined, 'Boundary privado NUNCA exposto em EXACT');
    assert(exact['internalNotes'] === undefined, 'Notas internas NUNCA expostas em EXACT');
    assert(exact['registryNumber'] === undefined, 'Matrícula NUNCA exposta em EXACT');
  });

  // --- TESTE 6: CICLO NO BANCO DE DADOS (CRIAÇÃO -> PUBLICAÇÃO -> REVOGAÇÃO -> REATIVAÇÃO) ---
  console.log('\n--- TESTE 6: CICLO NO BANCO DE DADOS (PUBLICAÇÃO -> ESTABILIDADE -> REVOGAÇÃO -> REATIVAÇÃO) ---');
  let testPropId = null;
  let testPublicId = null;

  try {
    const user = await prisma.user.findFirst();
    assert(user !== null, `Usuário corretor encontrado: ${user?.name}`);

    // Criação de imóvel novo inicialmente privado
    const createdProp = await prisma.property.create({
      data: {
        userId: user.id,
        title: 'Imóvel Teste Fase 5.3',
        propertyType: 'Apartamento',
        purpose: 'Venda',
        status: 'Disponível',
        price: 520000,
        privateArea: 80,
        bedrooms: 2,
        suites: 1,
        bathrooms: 2,
        parkingSpaces: 1,
        city: 'Criciúma',
        neighborhood: 'Michel',
        address: 'Rua Almirante Barroso',
        number: '123',
        isPublic: false,
        publicId: null,
        publicLocationPrecision: 'APPROXIMATE',
      },
    });
    testPropId = createdProp.id;
    assert(createdProp.isPublic === false, 'Imóvel criado como estritamente privado (isPublic=false)');
    assert(createdProp.publicId === null, 'publicId inicialmente null');

    // Publicação do imóvel (Simulação da ação "Criar link público")
    const generatedPubId = generatePublicId();
    const published = await prisma.property.update({
      where: { id: testPropId },
      data: {
        isPublic: true,
        publicId: generatedPubId,
        publishedAt: new Date(),
        publicLocationPrecision: 'APPROXIMATE',
      },
    });
    testPublicId = published.publicId;
    assert(published.isPublic === true, 'Imóvel marcado como público (isPublic=true)');
    assert(published.publicId === generatedPubId, `publicId persistido: ${published.publicId}`);
    assert(published.publishedAt !== null, 'Data de publicação registrada');

    // Estabilidade da URL (Simulação de múltiplos cliques em "Copiar Link")
    const reload1 = await prisma.property.findUnique({ where: { id: testPropId } });
    assert(reload1.publicId === generatedPubId, 'publicId permanece estável após reload');

    // Revogação / Desativação (Simulação de "Desativar link público")
    const revoked = await prisma.property.update({
      where: { id: testPropId },
      data: { isPublic: false },
    });
    assert(revoked.isPublic === false, 'isPublic alterado para false após revogação');
    assert(revoked.publicId === generatedPubId, 'publicId preservado para histórico e reativação');

    // Tentativa de consulta pública do imóvel revogado
    const revokedPublicQuery = await prisma.property.findUnique({ where: { publicId: testPublicId } });
    assert(revokedPublicQuery !== null && revokedPublicQuery.isPublic === false, 'Consulta detecta que anúncio está inativo');

    // Reativação do imóvel
    const reactivated = await prisma.property.update({
      where: { id: testPropId },
      data: { isPublic: true },
    });
    assert(reactivated.isPublic === true, 'Imóvel reativado com sucesso');
    assert(reactivated.publicId === generatedPubId, 'Reativação preservou o mesmo link estável para os clientes');

    // --- TESTE 7: CENÁRIO OPERACIONAL COMPLETO DE COMPARTILHAMENTO ---
    console.log('\n--- TESTE 7: CENÁRIO OPERACIONAL COMPLETO (MATCH -> COMPARTILHAR -> CLIENTE -> CORRETORA) ---');
    // Cliente Ana com busca e telefone
    const clientPhone = '(48) 99123-4567';
    const clientName = 'Ana Clara Silveira';

    // 1. Daiane gera link para Ana a partir do Match
    const publicUrl = getPublicPropertyUrl(testPublicId);
    const waUrlForClient = getShareWithClientWhatsAppUrl(clientPhone, clientName, publicUrl);
    assert(waUrlForClient !== null, 'URL gerada para a cliente Ana');
    assert(waUrlForClient.includes('5548991234567'), 'Destinatária do envio inicial é a cliente Ana');
    assert(waUrlForClient.includes('Ana'), 'Mensagem personalizada para Ana');
    assert(waUrlForClient.includes(testPublicId), 'Mensagem contém o link da apresentação');
    assert(!waUrlForClient.includes(BROKER_CONFIG.phone), 'Telefone da Daiane NÃO é o destinatário no envio para o cliente');

    // 2. Cliente Ana acessa a URL pública (sem autenticação)
    const publicQuery = await prisma.property.findUnique({
      where: { publicId: testPublicId },
      include: { images: true },
    });
    assert(publicQuery !== null && publicQuery.isPublic === true, 'Página pública encontra imóvel ativo');

    const publicPresentationDTO = toPublicPropertyDTO(publicQuery, 'PROPERTY');
    assert(publicPresentationDTO.publicId === testPublicId, 'DTO público entregue com sucesso');
    assert(publicPresentationDTO.title === 'Imóvel Teste Fase 5.3', 'Título correto na apresentação');
    assert(publicPresentationDTO.locationPrecision === 'APPROXIMATE', 'Privacidade padrão é aproximada');
    assert(publicPresentationDTO.approximateCenter !== null, 'Mapa territorial tem centroide para exibição');
    assert(publicPresentationDTO.latitude === null, 'Latitude exata protegida');

    // 3. Cliente Ana clica no botão "Falar com Daiane / Tenho interesse"
    const waUrlFromClientToBroker = getContactBrokerWhatsAppUrl(publicPresentationDTO.title, publicUrl);
    assert(waUrlFromClientToBroker.includes(BROKER_CONFIG.phone), 'Destinatária do contato é a corretora Daiane Corrêa');
    assert(waUrlFromClientToBroker.includes('55' + BROKER_CONFIG.phone), 'Número da Daiane com código do país formatado');
    assert(!waUrlFromClientToBroker.includes('5548991234567'), 'Telefone da cliente Ana NÃO é o destinatário da resposta');
    assert(waUrlFromClientToBroker.includes(testPublicId), 'Mensagem de interesse cita o link do imóvel');

  } finally {
    if (testPropId) {
      await prisma.property.delete({ where: { id: testPropId } });
      console.log('  ✓ Dados de teste limpos com sucesso no banco de dados.');
    }
  }

  console.log('\n====================================================');
  console.log(`TOTAL DE ASSERTIVAS: ${total} | SUCESSOS: ${passed} | FALHAS: ${total - passed}`);
  console.log('====================================================');

  if (passed === total) {
    console.log('\n🎉 TODOS OS TESTES OBRIGATÓRIOS DA FASE 5.3 PASSARAM COM SUCESSO!\n');
  } else {
    process.exit(1);
  }
}

runTestSuite()
  .catch((err) => {
    console.error('Falha geral no teste da Fase 5.3:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
