import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function runTests() {
  console.log('--- Iniciando Testes da Fase 2 ---');

  // 1. Localiza usuário demo
  const user = await prisma.user.findUnique({
    where: { email: 'demo@areanobre.local' },
  });

  if (!user) {
    throw new Error('Usuário demo não encontrado. Rode o login primeiro.');
  }
  console.log('✓ Usuário autenticado:', user.name, `(${user.email})`);

  // 2. Criação de Imóvel
  const property = await prisma.property.create({
    data: {
      userId: user.id,
      title: 'Apartamento no Centro com Varanda',
      internalCode: 'AP-101',
      propertyType: 'Apartamento',
      purpose: 'Venda',
      status: 'Disponível',
      price: 720000,
      privateArea: 95,
      totalArea: 120,
      bedrooms: 3,
      suites: 1,
      bathrooms: 2,
      parkingSpaces: 2,
      description: 'Lindo apartamento com sacada e vista panorâmica.',
      address: 'Rua Coronel Pedro Benedet',
      number: '350',
      neighborhood: 'Centro',
      city: 'Criciúma',
      state: 'SC',
      zipcode: '88801-000',
      latitude: -28.6775,
      longitude: -49.3705,
      images: {
        create: [
          { url: '/uploads/sample1.jpg', isCover: true, order: 0 },
          { url: '/uploads/sample2.jpg', isCover: false, order: 1 }
        ]
      }
    },
    include: { images: true }
  });
  console.log('✓ Imóvel cadastrado com sucesso:', property.title, `ID: ${property.id}`, `R$ ${property.price}`);
  console.log('  Fotos vinculadas:', property.images.length);

  // 3. Edição do Imóvel
  const updatedProperty = await prisma.property.update({
    where: { id: property.id },
    data: {
      price: 710000,
      internalNotes: 'Proprietário aceita negociar valor à vista.'
    }
  });
  console.log('✓ Imóvel atualizado (preço e notas):', updatedProperty.price, updatedProperty.internalNotes);

  // 4. Criação de Cliente e Busca
  let client = await prisma.client.findFirst({
    where: { userId: user.id, name: 'Ana Souza' }
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        userId: user.id,
        name: 'Ana Souza',
        phone: '(48) 99888-7777',
      }
    });
  }
  console.log('✓ Cliente vinculado:', client.name, client.phone);

  const search = await prisma.search.create({
    data: {
      userId: user.id,
      clientId: client.id,
      name: 'Apartamento para Ana Souza',
      purpose: 'Venda',
      propertyTypes: JSON.stringify(['Apartamento']),
      cities: JSON.stringify(['Criciúma']),
      neighborhoods: JSON.stringify(['Centro', 'Comerciário']),
      maxPrice: 750000,
      minBedrooms: 3,
      minSuites: 1,
      minParkingSpaces: 2,
      minArea: 85,
      notes: 'Preferência por andar alto no Centro.',
      active: true,
    },
    include: { client: true }
  });
  console.log('✓ Busca cadastrada com sucesso:', search.name, `Cliente: ${search.client.name}`, `Orçamento máx: R$ ${search.maxPrice}`);

  // 5. Teste de Alternância de Status da Busca (Active/Inactive)
  const toggledSearch = await prisma.search.update({
    where: { id: search.id },
    data: { active: false }
  });
  console.log('✓ Status de alerta da busca alternado para:', toggledSearch.active ? 'Ativo' : 'Pausado');

  const reActivatedSearch = await prisma.search.update({
    where: { id: search.id },
    data: { active: true }
  });
  console.log('✓ Status de alerta da busca reativado para:', reActivatedSearch.active ? 'Ativo' : 'Pausado');

  // 6. Verificação de Isolamento por Usuário
  const userProperties = await prisma.property.findMany({
    where: { userId: user.id }
  });
  const userSearches = await prisma.search.findMany({
    where: { userId: user.id }
  });
  console.log(`✓ Verificação de isolamento: ${userProperties.length} imóvel(is) e ${userSearches.length} busca(s) pertencentes ao usuário ${user.id}.`);

  console.log('\n--- TODOS OS TESTES DA FASE 2 PASSARAM COM SUCESSO! ---');
}

runTests()
  .catch((e) => {
    console.error('Erro nos testes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
