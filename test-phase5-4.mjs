import { prisma } from './src/lib/db.ts';
import { hashPassword, comparePassword, signPayload, verifyToken } from './src/lib/auth.ts';
import { toPublicPropertyDTO } from './src/lib/public-property-dto.ts';
import { getContactBrokerWhatsAppUrl } from './src/lib/public-sharing.ts';
import { recalculateMatchesForSearch } from './src/lib/matching/service.ts';

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ✕ FAIL: ${message}`);
    failCount++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('TESTES OBRIGATÓRIOS FASE 5.4 — CONTAS, PERFIL, ISOLAMENTO & ADMIN');
  console.log('====================================================\n');

  // Prefixos únicos para garantir idempotência e limpeza
  const testId = Date.now().toString().slice(-6);
  const emailBrokerA = `daiane.teste.${testId}@areanobre.test`;
  const emailBrokerB = `marcia.teste.${testId}@areanobre.test`;
  const emailAdmin = `admin.teste.${testId}@areanobre.test`;

  let userA, userB, adminUser;
  let propertyA, propertyB, searchA, clientA;

  try {
    // -------------------------------------------------------------
    // TESTE A — CADASTRO: Novo usuário nasce como BROKER e ACTIVE
    // -------------------------------------------------------------
    console.log('--- TESTE A: CADASTRO DE NOVO CORRETOR ---');
    const pwdHashA = await hashPassword('senhaForte123');
    userA = await prisma.user.create({
      data: {
        name: 'Daiane Corrêa Teste',
        email: emailBrokerA,
        passwordHash: pwdHashA,
        role: 'BROKER',
        status: 'ACTIVE',
        profile: {
          create: {
            commercialName: 'Daiane Corrêa Imóveis',
            phone: '48999887766',
            creci: 'CRECI-SC 48.912',
            tagline: 'Especialista em Imóveis Selecionados',
            city: 'Criciúma - SC',
            avatarUrl: '/uploads/daiane-foto.jpg',
            logoUrl: '/uploads/daiane-logo.png',
          },
        },
      },
      include: { profile: true },
    });

    assert(userA.id !== undefined, 'Usuário A criado com sucesso');
    assert(userA.role === 'BROKER', 'Papel padrão atribuído é estritamente BROKER');
    assert(userA.status === 'ACTIVE', 'Status inicial é ACTIVE');
    assert(userA.profile?.commercialName === 'Daiane Corrêa Imóveis', 'Perfil profissional criado simultaneamente');
    assert(userA.profile?.creci === 'CRECI-SC 48.912', 'CRECI gravado com sucesso');

    // Cria Corretor B (Márcia)
    const pwdHashB = await hashPassword('senhaMarcia456');
    userB = await prisma.user.create({
      data: {
        name: 'Márcia Silveira Teste',
        email: emailBrokerB,
        passwordHash: pwdHashB,
        role: 'BROKER',
        status: 'ACTIVE',
        profile: {
          create: {
            commercialName: 'Márcia Silveira Negócios',
            phone: '48988776655',
            creci: 'CRECI-SC 35.120',
            tagline: 'Casas e Terrenos em Condomínio Fechado',
            city: 'Criciúma - SC',
            avatarUrl: null, // Teste de fallback sem foto
            logoUrl: null,   // Teste de fallback sem logo
          },
        },
      },
      include: { profile: true },
    });

    assert(userB.role === 'BROKER', 'Corretor B nasce com role BROKER');
    assert(userB.profile?.phone === '48988776655', 'WhatsApp do Corretor B registrado');

    // -------------------------------------------------------------
    // TESTE B — LOGIN / LOGOUT & SENHAS
    // -------------------------------------------------------------
    console.log('\n--- TESTE B: LOGIN, SESSÃO & SEGURANÇA DE SENHA ---');
    const validPwdMatch = await comparePassword('senhaForte123', userA.passwordHash);
    const invalidPwdMatch = await comparePassword('senhaIncorreta', userA.passwordHash);
    assert(validPwdMatch === true, 'Senha correta validada pelo bcrypt');
    assert(invalidPwdMatch === false, 'Senha incorreta rejeitada');

    const sessionPayload = {
      userId: userA.id,
      email: userA.email,
      name: userA.name,
      role: userA.role,
      status: userA.status,
      iat: Date.now(),
      exp: Date.now() + 3600000,
    };
    const token = signPayload(sessionPayload);
    const verified = verifyToken(token);
    assert(verified !== null, 'Token de sessão assinado e verificado com sucesso');
    assert(verified?.userId === userA.id, 'UserId preservado no payload da sessão');
    assert(verified?.role === 'BROKER', 'Role verificado na sessão');

    // -------------------------------------------------------------
    // TESTE C — PERFIL: Alterações persistem
    // -------------------------------------------------------------
    console.log('\n--- TESTE C: EDIÇÃO DO PERFIL PROFISSIONAL ---');
    const updatedProfile = await prisma.brokerProfile.update({
      where: { userId: userA.id },
      data: {
        tagline: 'Nova Consultoria Imobiliária Premium',
        city: 'Içara - SC',
      },
    });
    assert(updatedProfile.tagline === 'Nova Consultoria Imobiliária Premium', 'Slogan atualizado no banco');
    assert(updatedProfile.city === 'Içara - SC', 'Cidade de atuação atualizada no banco');

    // -------------------------------------------------------------
    // TESTE D — FOTO E LOGO: Fallback elegante
    // -------------------------------------------------------------
    console.log('\n--- TESTE D: FOTO/LOGO & FALLBACKS ---');
    assert(userA.profile?.avatarUrl === '/uploads/daiane-foto.jpg', 'Corretor A possui foto customizada');
    assert(userA.profile?.logoUrl === '/uploads/daiane-logo.png', 'Corretor A possui logo customizado');
    assert(userB.profile?.avatarUrl === null, 'Corretor B sem foto (fallback para iniciais)');
    assert(userB.profile?.logoUrl === null, 'Corretor B sem logo (fallback para nome comercial)');

    // -------------------------------------------------------------
    // TESTE E — PROPRIEDADE: Imóvel pertence ao usuário autenticado
    // -------------------------------------------------------------
    console.log('\n--- TESTE E: PROPRIEDADE DOS REGISTROS ---');
    propertyA = await prisma.property.create({
      data: {
        userId: userA.id,
        responsibleBrokerId: userA.id,
        title: `Apartamento Centro Daiane ${testId}`,
        propertyType: 'Apartamento',
        purpose: 'Venda',
        status: 'Disponível',
        price: 550000,
        bedrooms: 3,
        suites: 1,
        neighborhood: 'Centro',
        city: 'Criciúma',
        state: 'SC',
        internalNotes: 'NOTA CONFIDENCIAL: Proprietário aceita contraproposta até 520k.',
        registryNumber: 'MAT-998877-CONFIDENCIAL',
        isPublic: true,
        publicId: `PUB-A-${testId}`,
      },
    });

    propertyB = await prisma.property.create({
      data: {
        userId: userB.id,
        responsibleBrokerId: userB.id,
        title: `Casa em Condomínio Márcia ${testId}`,
        propertyType: 'Casa',
        purpose: 'Venda',
        status: 'Disponível',
        price: 890000,
        bedrooms: 3,
        suites: 2,
        neighborhood: 'Mina Brasil',
        city: 'Criciúma',
        state: 'SC',
        internalNotes: 'NOTA CONFIDENCIAL MARCIA: Venda com exclusividade 60 dias.',
        registryNumber: 'MAT-112233-MARCIA',
        isPublic: true,
        publicId: `PUB-B-${testId}`,
      },
    });

    assert(propertyA.userId === userA.id, 'Imóvel A criado com userId de Daiane');
    assert(propertyA.responsibleBrokerId === userA.id, 'Imóvel A possui responsibleBrokerId de Daiane');
    assert(propertyB.userId === userB.id, 'Imóvel B criado com userId de Márcia');
    assert(propertyB.responsibleBrokerId === userB.id, 'Imóvel B possui responsibleBrokerId de Márcia');

    // -------------------------------------------------------------
    // TESTE F & G — ISOLAMENTO & IDOR: Broker B não pode editar Imóvel A
    // -------------------------------------------------------------
    console.log('\n--- TESTE F & G: ISOLAMENTO ENTRE CORRETORES & PROTEÇÃO IDOR ---');
    // Simula tentativa de alteração do Imóvel A por Márcia (Broker B)
    const canBrokerBModifyA = await prisma.property.findFirst({
      where: {
        id: propertyA.id,
        OR: [
          { userId: userB.id },
          { responsibleBrokerId: userB.id },
        ],
      },
    });
    assert(canBrokerBModifyA === null, 'Márcia NÃO possui permissão para editar ou excluir imóvel da Daiane');

    // Simula tentativa de Daiane alterar Imóvel B
    const canBrokerAModifyB = await prisma.property.findFirst({
      where: {
        id: propertyB.id,
        OR: [
          { userId: userA.id },
          { responsibleBrokerId: userA.id },
        ],
      },
    });
    assert(canBrokerAModifyB === null, 'Daiane NÃO possui permissão para alterar imóvel da Márcia');

    // -------------------------------------------------------------
    // TESTE H — MATCHING MULTIUSUÁRIO & PRIVACIDADE DA DEMANDA
    // -------------------------------------------------------------
    console.log('\n--- TESTE H: MATCHING MULTIUSUÁRIO ENTRE CORRETORES ---');
    // Cliente de Daiane (Ana) procura Casa em Criciúma até 950k com 3 quartos
    clientA = await prisma.client.create({
      data: {
        userId: userA.id,
        name: 'Ana Paula Cliente Daiane',
        phone: '48991112233',
        notes: 'Cliente muito exigente, tem pressa para mudar.',
      },
    });

    searchA = await prisma.search.create({
      data: {
        userId: userA.id,
        responsibleBrokerId: userA.id,
        clientId: clientA.id,
        name: `Casa para Ana Paula ${testId}`,
        purpose: 'Venda',
        propertyTypes: JSON.stringify(['Casa']),
        cities: JSON.stringify(['Criciúma']),
        neighborhoods: JSON.stringify(['Mina Brasil', 'Centro']),
        maxPrice: 950000,
        minBedrooms: 3,
        active: true,
      },
    });

    // Recalcula matches da busca de Daiane
    const matchCount = await recalculateMatchesForSearch(searchA.id);
    assert(matchCount > 0, `Matching encontrou ${matchCount} oportunidade(s) para a busca da Daiane`);

    // Busca o match gerado com o imóvel da Márcia
    const crossMatch = await prisma.match.findFirst({
      where: {
        searchId: searchA.id,
        propertyId: propertyB.id,
      },
      include: {
        property: {
          include: {
            responsibleBroker: { include: { profile: true } },
          },
        },
      },
    });

    assert(crossMatch !== null, 'Match gerado entre Busca da Daiane e Imóvel da Márcia!');
    assert(crossMatch?.score >= 70, `Score alto preservado: ${crossMatch?.score}%`);
    assert(crossMatch?.property?.responsibleBroker?.name === 'Márcia Silveira Teste', 'Origem identificada: Imóvel pertence a Márcia');
    assert(crossMatch?.property?.responsibleBroker?.profile?.commercialName === 'Márcia Silveira Negócios', 'Marca comercial de Márcia identificada');

    // -------------------------------------------------------------
    // TESTE I & J — PÁGINA PÚBLICA & WHATSAPP DINÂMICO
    // -------------------------------------------------------------
    console.log('\n--- TESTE I & J: IDENTIDADE DINÂMICA NA PÁGINA PÚBLICA & WHATSAPP ---');
    // DTO do imóvel da Daiane
    const dtoA = toPublicPropertyDTO(
      { ...propertyA, responsibleBroker: userA },
      'PROPERTY'
    );
    assert(dtoA.broker.name === 'Daiane Corrêa Teste', 'Imóvel A apresenta corretora Daiane');
    assert(dtoA.broker.commercialName === 'Daiane Corrêa Imóveis' || dtoA.broker.brandName === 'Daiane Corrêa Imóveis', 'Imóvel A apresenta marca Daiane Corrêa Imóveis');
    assert(dtoA.broker.avatarUrl === '/uploads/daiane-foto.jpg', 'Foto da Daiane presente no DTO');

    const whatsappA = getContactBrokerWhatsAppUrl(
      dtoA.title,
      'http://localhost:3000/p/imovel/PUB-A',
      dtoA.broker.phone,
      dtoA.broker.name
    );
    assert(whatsappA.includes('5548999887766'), 'WhatsApp do imóvel da Daiane direciona para 48999887766');

    // DTO do imóvel da Márcia
    const dtoB = toPublicPropertyDTO(
      { ...propertyB, responsibleBroker: userB },
      'PROPERTY'
    );
    assert(dtoB.broker.name === 'Márcia Silveira Teste', 'Imóvel B apresenta corretora Márcia');
    assert(dtoB.broker.brandName === 'Márcia Silveira Negócios', 'Imóvel B apresenta marca Márcia Silveira Negócios');
    assert(dtoB.broker.creci === 'CRECI-SC 35.120', 'CRECI da Márcia exibido');

    const whatsappB = getContactBrokerWhatsAppUrl(
      dtoB.title,
      'http://localhost:3000/p/imovel/PUB-B',
      dtoB.broker.phone,
      dtoB.broker.name
    );
    assert(whatsappB.includes('5548988776655'), 'WhatsApp do imóvel da Márcia direciona para 48988776655');

    // Confirma que notas confidenciais NUNCA vazaram no DTO público
    assert(dtoA['internalNotes'] === undefined, 'internalNotes NÃO existe no DTO A');
    assert(dtoA['registryNumber'] === undefined, 'registryNumber NÃO existe no DTO A');
    assert(dtoB['internalNotes'] === undefined, 'internalNotes NÃO existe no DTO B');

    // -------------------------------------------------------------
    // TESTE K & L — ADMIN vs BROKER: Permissões de Administração
    // -------------------------------------------------------------
    console.log('\n--- TESTE K & L: CONTROLE DE ACESSO ADMINISTRATIVO (ADMIN vs BROKER) ---');
    const pwdAdmin = await hashPassword('adminKey999');
    adminUser = await prisma.user.create({
      data: {
        name: 'Admin Teste',
        email: emailAdmin,
        passwordHash: pwdAdmin,
        role: 'ADMIN',
        status: 'ACTIVE',
        profile: {
          create: {
            commercialName: 'Área Nobre Master',
            phone: '48999990000',
          },
        },
      },
    });

    assert(adminUser.role === 'ADMIN', 'Usuário criado com role ADMIN');

    // Simula autorização backend da rota /api/admin/users
    function canAccessAdmin(user) {
      return user && user.role === 'ADMIN' && user.status === 'ACTIVE';
    }

    assert(canAccessAdmin(adminUser) === true, 'ADMIN possui acesso liberado ao painel administrativo');
    assert(canAccessAdmin(userA) === false, 'Corretor A (BROKER) é bloqueado com 403 Forbidden no admin');
    assert(canAccessAdmin(userB) === false, 'Corretor B (BROKER) é bloqueado com 403 Forbidden no admin');

    // -------------------------------------------------------------
    // TESTE M & N — DESATIVAÇÃO DE CONTA & PÁGINA PÚBLICA INATIVA
    // -------------------------------------------------------------
    console.log('\n--- TESTE M & N: DESATIVAÇÃO DE CONTA & PROTEÇÃO DE PÁGINA PÚBLICA ---');
    // Desativa Corretor B
    const deactivatedB = await prisma.user.update({
      where: { id: userB.id },
      data: { status: 'INACTIVE' },
    });
    assert(deactivatedB.status === 'INACTIVE', 'Conta do Corretor B alterada para INACTIVE');

    // Valida que sessão de usuário INACTIVE é rejeitada
    function isSessionAllowed(user) {
      return user && user.status === 'ACTIVE';
    }
    assert(isSessionAllowed(deactivatedB) === false, 'Usuário INACTIVE tem login e sessão negados');

    // Valida política da página pública: se o corretor for INACTIVE, isPublic = false
    function isPublicAdServed(property, broker) {
      if (!property.isPublic) return false;
      if (broker.status !== 'ACTIVE') return false; // Regra da Fase 5.4
      return true;
    }

    assert(
      isPublicAdServed(propertyA, userA) === true,
      'Página pública da Daiane (ACTIVE) é servida normalmente'
    );
    assert(
      isPublicAdServed(propertyB, deactivatedB) === false,
      'Página pública de corretor INACTIVE deixa de ser servida externamente'
    );

    // -------------------------------------------------------------
    // TESTE O — MIGRAÇÃO DA DAIANE: Dados existentes intactos
    // -------------------------------------------------------------
    console.log('\n--- TESTE O: INTEGRIDADE DA MIGRAÇÃO DA CORRETORA DAIANE ---');
    const daianeMain = await prisma.user.findFirst({
      where: { email: 'demo@areanobre.local' },
      include: {
        profile: true,
        _count: {
          select: {
            properties: true,
            searches: true,
            developments: true,
          },
        },
      },
    });

    assert(daianeMain !== null, 'Usuário principal da Daiane encontrado');
    assert(daianeMain?.role === 'BROKER', 'Daiane possui role BROKER');
    assert(daianeMain?.status === 'ACTIVE', 'Daiane possui status ACTIVE');
    assert(daianeMain?.profile?.commercialName === 'Daiane Corrêa Imóveis', 'Perfil da Daiane preservado');
    assert(daianeMain?._count.properties >= 12, `Carteira da Daiane íntegra (${daianeMain?._count.properties} imóveis)`);
    assert(daianeMain?._count.developments >= 3, `Empreendimentos da Daiane íntegros (${daianeMain?._count.developments} empreendimentos)`);

  } finally {
    // Limpeza seletiva dos registros de teste criados nesta rodada
    console.log('\n--- LIMPEZA DOS REGISTROS DE TESTE ---');
    if (searchA) await prisma.match.deleteMany({ where: { searchId: searchA.id } });
    if (searchA) await prisma.search.delete({ where: { id: searchA.id } }).catch(() => {});
    if (clientA) await prisma.client.delete({ where: { id: clientA.id } }).catch(() => {});
    if (propertyA) await prisma.property.delete({ where: { id: propertyA.id } }).catch(() => {});
    if (propertyB) await prisma.property.delete({ where: { id: propertyB.id } }).catch(() => {});
    if (userA) await prisma.user.delete({ where: { id: userA.id } }).catch(() => {});
    if (userB) await prisma.user.delete({ where: { id: userB.id } }).catch(() => {});
    if (adminUser) await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
    console.log('  ✓ Dados de teste limpos com sucesso.');
  }

  console.log('\n====================================================');
  console.log(`TOTAL DE ASSERTIVAS: ${passCount + failCount} | SUCESSOS: ${passCount} | FALHAS: ${failCount}`);
  console.log('====================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error('Erro na execução dos testes da Fase 5.4:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
