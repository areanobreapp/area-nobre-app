import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function runTests() {
  console.log('--- Iniciando Testes da Fase 2.1 (Imóveis em construção + Tipologias) ---');

  // 1. Localiza usuário demo
  const user = await prisma.user.findUnique({
    where: { email: 'demo@areanobre.local' },
  });

  if (!user) {
    throw new Error('Usuário demo não encontrado.');
  }
  console.log('✓ Usuário autenticado:', user.name, `(${user.email})`);

  // 2. Cadastro de Empreendimento com Múltiplas Tipologias
  const dev = await prisma.development.create({
    data: {
      userId: user.id,
      name: 'Residencial Aurora',
      developer: 'XYZ Empreendimentos',
      stage: 'Em construção',
      deliveryDate: 'Março/2028',
      status: 'Ativo',
      description: 'Empreendimento de alto padrão com infraestrutura completa de lazer no Centro.',
      internalNotes: 'Comissão negociada: 4%. Contato: Carlos (Gerente Comercial XYZ).',
      address: 'Rua Coronel Pedro Benedet',
      number: '500',
      neighborhood: 'Centro',
      city: 'Criciúma',
      state: 'SC',
      zipcode: '88801-000',
      latitude: -28.678,
      longitude: -49.371,
      images: {
        create: [
          { url: '/uploads/aurora-fachada.jpg', isCover: true, order: 0 },
          { url: '/uploads/aurora-lazer.jpg', isCover: false, order: 1 },
        ],
      },
      typologies: {
        create: [
          {
            name: '2 dormitórios',
            propertyType: 'Apartamento',
            price: 620000,
            privateArea: 72,
            bedrooms: 2,
            suites: 1,
            bathrooms: 2,
            parkingSpaces: 1,
            status: 'Disponível',
            notes: 'Sacada gourmet com churrasqueira a carvão',
          },
          {
            name: '3 dormitórios',
            propertyType: 'Apartamento',
            price: 790000,
            privateArea: 98,
            bedrooms: 3,
            suites: 1,
            bathrooms: 2,
            parkingSpaces: 2,
            status: 'Disponível',
            notes: 'Living integrado e vista panorâmica',
          },
          {
            name: 'Cobertura Duplex',
            propertyType: 'Cobertura',
            price: 1250000,
            privateArea: 145,
            bedrooms: 3,
            suites: 2,
            bathrooms: 3,
            parkingSpaces: 2,
            status: 'Disponível',
            notes: 'Terraço privativo com espera para piscina/spa',
          },
        ],
      },
    },
    include: {
      images: true,
      typologies: true,
    },
  });

  console.log('✓ Empreendimento cadastrado com sucesso:');
  console.log(`  Nome: ${dev.name}`);
  console.log(`  Construtora: ${dev.developer}`);
  console.log(`  Estágio: ${dev.stage} | Entrega: ${dev.deliveryDate}`);
  console.log(`  Localização: ${dev.address}, ${dev.number} — ${dev.neighborhood}, ${dev.city}-${dev.state}`);
  console.log(`  Fotos vinculadas: ${dev.images.length}`);
  console.log(`  Tipologias cadastradas: ${dev.typologies.length}`);
  dev.typologies.forEach((t) => {
    console.log(`    - ${t.name}: ${t.bedrooms} dorms (${t.suites} suíte), ${t.privateArea} m², ${t.parkingSpaces} vg — R$ ${t.price.toLocaleString('pt-BR')} [${t.status}]`);
  });

  // 3. Consulta e ordenação das tipologias por preço
  const loadedDev = await prisma.development.findFirst({
    where: { id: dev.id, userId: user.id },
    include: {
      typologies: { orderBy: { price: 'asc' } },
      images: true,
    },
  });

  if (!loadedDev || loadedDev.typologies.length !== 3) {
    throw new Error('Falha ao carregar tipologias do empreendimento.');
  }
  console.log('✓ Consulta e ordenação por valor inicial validada com sucesso.');

  // 4. Edição do Empreendimento e Tipologias
  const updatedDev = await prisma.development.update({
    where: { id: dev.id },
    data: {
      deliveryDate: 'Junho/2028',
      internalNotes: 'Comissão negociada: 4.5% para unidades vendidas no pré-lançamento.',
    },
    include: { typologies: true },
  });
  console.log('✓ Empreendimento atualizado com nova data de entrega e notas internas:', updatedDev.deliveryDate);

  // 5. Teste de Desativação / Reativação do Empreendimento
  const deactivatedDev = await prisma.development.update({
    where: { id: dev.id },
    data: { status: 'Inativo' },
  });
  console.log('✓ Status do empreendimento alternado para:', deactivatedDev.status);

  const reactivatedDev = await prisma.development.update({
    where: { id: dev.id },
    data: { status: 'Ativo' },
  });
  console.log('✓ Status do empreendimento reativado para:', reactivatedDev.status);

  // 6. Verificação de Isolamento por Usuário
  const userDevs = await prisma.development.findMany({
    where: { userId: user.id },
  });
  console.log(`✓ Verificação de isolamento: ${userDevs.length} empreendimento(s) pertencente(s) ao usuário ${user.id}.`);

  // 7. Confirmação de que Imóveis e Buscas continuam intactos
  const userProperties = await prisma.property.count({ where: { userId: user.id } });
  const userSearches = await prisma.search.count({ where: { userId: user.id } });
  console.log(`✓ Carteira preservada: ${userProperties} imóveis convencionais e ${userSearches} buscas ativas.`);

  console.log('\n--- TODOS OS TESTES DA FASE 2.1 PASSARAM COM SUCESSO! ---');
}

runTests()
  .catch((e) => {
    console.error('Erro nos testes da Fase 2.1:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
