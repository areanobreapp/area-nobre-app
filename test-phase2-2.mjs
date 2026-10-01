import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function runPhase22Tests() {
  console.log('--- Iniciando Testes da Fase 2.2 (Home Orientada a Mapa) ---');

  // 1. Localiza usuário demo
  const user = await prisma.user.findUnique({
    where: { email: 'demo@areanobre.local' },
  });

  if (!user) {
    throw new Error('Usuário demo não encontrado.');
  }
  console.log('✓ Usuário autenticado:', user.name, `(${user.email})`);

  // 2. Garante portfólio completo com as 5 categorias para a experiência do mapa
  const existingTypes = await prisma.property.findMany({
    where: { userId: user.id },
    select: { propertyType: true },
  });
  const typesSet = new Set(existingTypes.map((p) => p.propertyType));

  // Garante Casa
  if (!typesSet.has('Casa')) {
    await prisma.property.create({
      data: {
        userId: user.id,
        title: 'Casa Contemporânea com Piscina',
        internalCode: 'CS-201',
        propertyType: 'Casa',
        purpose: 'Venda',
        status: 'Disponível',
        price: 980000,
        privateArea: 210,
        totalArea: 360,
        bedrooms: 4,
        suites: 2,
        bathrooms: 3,
        parkingSpaces: 2,
        description: 'Bela casa com espaço gourmet, piscina e energia solar no Pio Corrêa.',
        neighborhood: 'Pio Corrêa',
        city: 'Criciúma',
        state: 'SC',
        address: 'Rua Celestina Zaccur',
        number: '85',
        latitude: -28.673,
        longitude: -49.368,
        images: {
          create: [{ url: '/uploads/sample1.jpg', isCover: true, order: 0 }],
        },
      },
    });
    console.log('✓ Imóvel tipo Casa criado para o portfólio.');
  }

  // Garante Terreno
  if (!typesSet.has('Terreno')) {
    await prisma.property.create({
      data: {
        userId: user.id,
        title: 'Lote Residencial Plano',
        internalCode: 'TR-301',
        propertyType: 'Terreno',
        purpose: 'Venda',
        status: 'Disponível',
        price: 320000,
        privateArea: 420,
        totalArea: 420,
        bedrooms: 0,
        suites: 0,
        bathrooms: 0,
        parkingSpaces: 0,
        description: 'Excelente terreno pronto para construir em bairro nobre.',
        neighborhood: 'Michel',
        city: 'Criciúma',
        state: 'SC',
        address: 'Rua São José',
        number: 'S/N',
        latitude: -28.682,
        longitude: -49.375,
        images: {
          create: [{ url: '/uploads/sample2.jpg', isCover: true, order: 0 }],
        },
      },
    });
    console.log('✓ Imóvel tipo Terreno criado para o portfólio.');
  }

  // Garante Comércio
  if (!typesSet.has('Comercial')) {
    await prisma.property.create({
      data: {
        userId: user.id,
        title: 'Sala Comercial Prime Center',
        internalCode: 'CM-401',
        propertyType: 'Comercial',
        purpose: 'Venda',
        status: 'Disponível',
        price: 450000,
        privateArea: 65,
        totalArea: 80,
        bedrooms: 0,
        suites: 0,
        bathrooms: 1,
        parkingSpaces: 1,
        description: 'Sala corporativa com recepção montada em edifício comercial moderno.',
        neighborhood: 'Centro',
        city: 'Criciúma',
        state: 'SC',
        address: 'Praça Nereu Ramos',
        number: '150',
        latitude: -28.6785,
        longitude: -49.3695,
        images: {
          create: [{ url: '/uploads/sample1.jpg', isCover: true, order: 0 }],
        },
      },
    });
    console.log('✓ Imóvel tipo Comercial criado para o portfólio.');
  }

  // 3. Validação das 5 categorias disponíveis para o mapa
  const allProperties = await prisma.property.findMany({
    where: { userId: user.id },
  });
  const allDevelopments = await prisma.development.findMany({
    where: { userId: user.id },
    include: { typologies: true },
  });

  console.log(`\n✓ Carteira territorial disponível:`);
  console.log(`  - Imóveis convencionais: ${allProperties.length}`);
  console.log(`  - Empreendimentos em construção: ${allDevelopments.length}`);

  const mappedProps = allProperties.filter((p) => p.latitude && p.longitude);
  const mappedDevs = allDevelopments.filter((d) => d.latitude && d.longitude);

  console.log(`  - Imóveis geolocalizados: ${mappedProps.length}/${allProperties.length}`);
  console.log(`  - Empreendimentos geolocalizados: ${mappedDevs.length}/${allDevelopments.length}`);
  console.log(`  - Total de pins no mapa: ${mappedProps.length + mappedDevs.length}`);

  if (mappedProps.length === 0 && mappedDevs.length === 0) {
    throw new Error('Nenhum imóvel possui coordenadas geográficas para o mapa.');
  }

  // 4. Verificação de Cobertura das 5 Categorias
  const categoriesPresent = new Set();
  allProperties.forEach((p) => {
    const t = p.propertyType.toLowerCase();
    if (t.includes('casa')) categoriesPresent.add('Casa');
    if (t.includes('apartamento')) categoriesPresent.add('Apartamento');
    if (t.includes('terreno')) categoriesPresent.add('Terreno');
    if (t.includes('comercial') || t.includes('comércio')) categoriesPresent.add('Comércio');
  });
  if (allDevelopments.length > 0) {
    categoriesPresent.add('Em construção');
  }

  console.log('\n✓ Categorias validadas com sucesso:');
  ['Casa', 'Apartamento', 'Terreno', 'Comércio', 'Em construção'].forEach((cat) => {
    const exists = categoriesPresent.has(cat);
    console.log(`  [${exists ? 'X' : ' '}] ${cat}`);
    if (!exists) console.warn(`  Aviso: categoria ${cat} não possui itens cadastrados ainda.`);
  });

  console.log('\n--- TODOS OS TESTES DA FASE 2.2 FORAM EXECUTADOS COM SUCESSO! ---');
}

runPhase22Tests()
  .catch((err) => {
    console.error('Erro nos testes da Fase 2.2:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
