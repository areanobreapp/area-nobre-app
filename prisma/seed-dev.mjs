import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// ==============================================================================
// 1. TRAVAS RÍGIDAS DE SEGURANÇA CONTRA PRODUÇÃO
// ==============================================================================
const DEV_PROJECT_REF = 'jdoezhmtwicxcthhedtb';
const PROD_PROJECT_REF = 'udtqyoinwnalbvodejxj';

function validateEnvironment() {
  const dbUrl = process.env.DATABASE_URL || '';
  const directUrl = process.env.DIRECT_URL || '';
  const supabaseUrl = process.env.SUPABASE_URL || '';

  console.log('--- VERIFICANDO TRAVAS DE SEGURANÇA DO AMBIENTE ---');

  if (!dbUrl.includes(DEV_PROJECT_REF)) {
    throw new Error(`ABORTANDO: DATABASE_URL não aponta para o projeto de desenvolvimento (${DEV_PROJECT_REF}).`);
  }
  if (!directUrl.includes(DEV_PROJECT_REF)) {
    throw new Error(`ABORTANDO: DIRECT_URL não aponta para o projeto de desenvolvimento (${DEV_PROJECT_REF}).`);
  }
  if (!supabaseUrl.includes(DEV_PROJECT_REF)) {
    throw new Error(`ABORTANDO: SUPABASE_URL não aponta para o projeto de desenvolvimento (${DEV_PROJECT_REF}).`);
  }
  if (dbUrl.includes(PROD_PROJECT_REF) || directUrl.includes(PROD_PROJECT_REF) || supabaseUrl.includes(PROD_PROJECT_REF)) {
    throw new Error(`ABORTANDO: Detectada referência do banco de PRODUÇÃO (${PROD_PROJECT_REF})!`);
  }

  console.log('✓ Travas de segurança validadas: Conexão estritamente restrita a area-nobre-dev.');
}

async function main() {
  validateEnvironment();

  console.log('\n--- VERIFICANDO BANCO DE DESENVOLVIMENTO ---');
  const existingUsersCount = await prisma.user.count();
  const existingPropsCount = await prisma.property.count();
  console.log(`Estado atual: ${existingUsersCount} usuário(s), ${existingPropsCount} imóvel(is) cadastrado(s).`);

  // Gera senhas de teste seguras e registra apenas em arquivo local não-versionado
  const passA = 'TesteA_' + crypto.randomBytes(6).toString('hex');
  const passB = 'TesteB_' + crypto.randomBytes(6).toString('hex');
  const hashA = await bcrypt.hash(passA, 10);
  const hashB = await bcrypt.hash(passB, 10);

  // --------------------------------------------------------------------------
  // 2. CORRETOR TESTE A (Responsável pelo Imóvel)
  // --------------------------------------------------------------------------
  console.log('\n--- CADASTRANDO CORRETOR TESTE A ---');
  let userA = await prisma.user.findUnique({
    where: { email: 'corretor.a@teste.invalid' },
    include: { profile: true },
  });

  if (!userA) {
    userA = await prisma.user.create({
      data: {
        name: 'Corretor Teste A',
        email: 'corretor.a@teste.invalid',
        passwordHash: hashA,
        role: 'BROKER',
        status: 'ACTIVE',
        profile: {
          create: {
            commercialName: 'Imobiliária Demonstração A',
            creci: 'TESTE-A — NÃO VÁLIDO',
            phone: '00000000000',
            tagline: 'Perfil de demonstração e homologação exclusivo de desenvolvimento.',
            bio: 'Conta fictícia criada para homologação do Pacote 01 da Área Nobre.',
            city: 'Criciúma - SC',
            avatarUrl: '/images/teste/corretor-a.svg',
          },
        },
      },
      include: { profile: true },
    });
    console.log(`✓ Corretor Teste A criado com ID: ${userA.id}`);
  } else {
    // Atualiza perfil garantindo dados de teste
    await prisma.brokerProfile.upsert({
      where: { userId: userA.id },
      create: {
        userId: userA.id,
        commercialName: 'Imobiliária Demonstração A',
        creci: 'TESTE-A — NÃO VÁLIDO',
        phone: '00000000000',
        tagline: 'Perfil de demonstração e homologação exclusivo de desenvolvimento.',
        city: 'Criciúma - SC',
        avatarUrl: '/images/teste/corretor-a.svg',
      },
      update: {
        commercialName: 'Imobiliária Demonstração A',
        creci: 'TESTE-A — NÃO VÁLIDO',
        phone: '00000000000',
        tagline: 'Perfil de demonstração e homologação exclusivo de desenvolvimento.',
        city: 'Criciúma - SC',
        avatarUrl: '/images/teste/corretor-a.svg',
      },
    });
    console.log(`✓ Corretor Teste A já existente verificado (ID: ${userA.id})`);
  }

  // --------------------------------------------------------------------------
  // 3. CORRETOR TESTE B (Corretor Parceiro para Futuros Testes)
  // --------------------------------------------------------------------------
  console.log('\n--- CADASTRANDO CORRETOR TESTE B ---');
  let userB = await prisma.user.findUnique({
    where: { email: 'corretor.b@teste.invalid' },
    include: { profile: true },
  });

  if (!userB) {
    userB = await prisma.user.create({
      data: {
        name: 'Corretor Teste B',
        email: 'corretor.b@teste.invalid',
        passwordHash: hashB,
        role: 'BROKER',
        status: 'ACTIVE',
        profile: {
          create: {
            commercialName: 'Imobiliária Demonstração B',
            creci: 'TESTE-B — NÃO VÁLIDO',
            phone: '00000000000',
            tagline: 'Perfil de demonstração para testes de compartilhamento e corretor parceiro.',
            bio: 'Conta fictícia secundária criada para homologação do Pacote 01 da Área Nobre.',
            city: 'Criciúma - SC',
            avatarUrl: '/images/teste/corretor-b.svg',
          },
        },
      },
      include: { profile: true },
    });
    console.log(`✓ Corretor Teste B criado com ID: ${userB.id}`);
  } else {
    await prisma.brokerProfile.upsert({
      where: { userId: userB.id },
      create: {
        userId: userB.id,
        commercialName: 'Imobiliária Demonstração B',
        creci: 'TESTE-B — NÃO VÁLIDO',
        phone: '00000000000',
        tagline: 'Perfil de demonstração para testes de compartilhamento e corretor parceiro.',
        city: 'Criciúma - SC',
        avatarUrl: '/images/teste/corretor-b.svg',
      },
      update: {
        commercialName: 'Imobiliária Demonstração B',
        creci: 'TESTE-B — NÃO VÁLIDO',
        phone: '00000000000',
        tagline: 'Perfil de demonstração para testes de compartilhamento e corretor parceiro.',
        city: 'Criciúma - SC',
        avatarUrl: '/images/teste/corretor-b.svg',
      },
    });
    console.log(`✓ Corretor Teste B já existente verificado (ID: ${userB.id})`);
  }

  // --------------------------------------------------------------------------
  // 4. IMÓVEL RESIDENCIAL FICTÍCIO DE TESTE
  // --------------------------------------------------------------------------
  console.log('\n--- CADASTRANDO IMÓVEL FICTÍCIO DE TESTE ---');
  const propertyPublicId = 'teste-ponto-16';

  let property = await prisma.property.findUnique({
    where: { publicId: propertyPublicId },
    include: { images: true },
  });

  const propertyData = {
    userId: userA.id,
    responsibleBrokerId: userA.id,
    publicId: propertyPublicId,
    title: 'Apartamento Demonstração — 3 Suítes',
    propertyType: 'Apartamento',
    purpose: 'Venda',
    status: 'Disponível',
    price: 1450000,
    privateArea: 160,
    bedrooms: 3,
    suites: 3,
    bathrooms: 4,
    parkingSpaces: 2,
    floor: 8,
    isPublic: true,
    publishedAt: new Date(),
    publicLocationPrecision: 'APPROXIMATE',
    city: 'Criciúma',
    state: 'SC',
    neighborhood: 'Centro',
    address: 'Rua de Demonstração, 100',
    description: 'Apartamento de teste em andar alto com 3 suítes, living amplo integrado, sacada gourmet e 2 vagas de garagem.\n\nImóvel fictício criado exclusivamente para homologação e testes visuais do layout de apresentação pública da Área Nobre (Ponto 16). Não representa uma oferta real.',
    hasPool: true,
    hasGym: true,
    hasBarbecue: true,
    hasPartyHall: true,
    hasElevator: true,
  };

  if (!property) {
    property = await prisma.property.create({
      data: propertyData,
      include: { images: true },
    });
    console.log(`✓ Imóvel de teste criado com ID: ${property.id}`);
  } else {
    property = await prisma.property.update({
      where: { id: property.id },
      data: propertyData,
      include: { images: true },
    });
    console.log(`✓ Imóvel de teste atualizado com sucesso (ID: ${property.id})`);
  }

  // Imagens locais do Imóvel de Teste
  console.log('--- ATUALIZANDO IMAGENS LOCAIS DE TESTE ---');
  await prisma.propertyImage.deleteMany({
    where: { propertyId: property.id },
  });

  await prisma.propertyImage.createMany({
    data: [
      {
        propertyId: property.id,
        url: '/images/teste/imovel-living.svg',
        isCover: true,
        order: 0,
      },
      {
        propertyId: property.id,
        url: '/images/teste/imovel-suite.svg',
        isCover: false,
        order: 1,
      },
      {
        propertyId: property.id,
        url: '/images/teste/imovel-sacada.svg',
        isCover: false,
        order: 2,
      },
    ],
  });
  console.log('✓ 3 imagens locais de demonstração associadas.');

  // Salva credenciais geradas em arquivo local não-versionado
  const credsContent = `# CREDENCIAIS DE TESTE - AMBIENTE DE DESENVOLVIMENTO
# Gerado automaticamente em ${new Date().toISOString()}
CORRETOR_A_EMAIL="corretor.a@teste.invalid"
CORRETOR_A_PASS="${passA}"
CORRETOR_B_EMAIL="corretor.b@teste.invalid"
CORRETOR_B_PASS="${passB}"
PUBLIC_URL="http://localhost:3000/p/imovel/${propertyPublicId}"
`;
  fs.writeFileSync(path.join(process.cwd(), '.test-credentials.local'), credsContent, 'utf8');

  console.log('\n=============================================================');
  console.log('SEED DE DESENVOLVIMENTO CONCLUÍDO COM SUCESSO');
  console.log('=============================================================');
  console.log(`Imóvel público: http://localhost:3000/p/imovel/${propertyPublicId}`);
  console.log('Credenciais salvas no arquivo não-versionado: .test-credentials.local\n');
}

main()
  .catch((err) => {
    console.error('ERRO NO SEED DE TESTE:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

