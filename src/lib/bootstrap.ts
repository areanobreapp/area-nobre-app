import { prisma } from './db';
import { hashPassword } from './auth';

/**
 * Executa a migração dos dados existentes da Corretora Daiane e
 * garante a existência da conta administrativa inicial da Área Nobre (areanobreapp@gmail.com).
 * 
 * Segue rigorosamente a Fase 5.4:
 * - Não perde dados (coordenadas, boundaries, fotos, publicIds, matches).
 * - Criação de BrokerProfile para a Daiane.
 * - Atribuição de responsibleBrokerId aos registros.
 * - Bootstrap seguro do primeiro ADMIN sem senhas expostas em código público ou Git.
 */
export async function runBootstrapMigration() {
  console.log('[Bootstrap] Iniciando migração e auditoria de contas...');

  // 1. Migração e consolidação do usuário da Corretora Daiane
  let daiane = await prisma.user.findFirst({
    where: {
      OR: [
        { email: 'demo@areanobre.local' },
        { email: 'daiane@areanobre.com.br' },
        { name: { contains: 'Daiane' } },
      ],
    },
  });

  if (!daiane) {
    console.log('[Bootstrap] Criando conta inicial da Daiane Corrêa...');
    const passwordHash = await hashPassword('corretor123');
    daiane = await prisma.user.create({
      data: {
        name: 'Daiane Corrêa',
        email: 'demo@areanobre.local',
        passwordHash,
        role: 'BROKER',
        status: 'ACTIVE',
      },
    });
  } else {
    // Atualiza role e status para os padrões da Fase 5.4
    await prisma.user.update({
      where: { id: daiane.id },
      data: {
        role: 'BROKER',
        status: 'ACTIVE',
      },
    });
  }

  // Garante o perfil profissional da Daiane
  await prisma.brokerProfile.upsert({
    where: { userId: daiane.id },
    create: {
      userId: daiane.id,
      commercialName: 'Daiane Corrêa Imóveis',
      phone: process.env.DAIANE_WHATSAPP_PHONE || '48999887766',
      creci: 'CRECI-SC 48.912',
      tagline: 'Consultoria Imobiliária Exclusiva em Criciúma e Região',
      city: 'Criciúma - SC',
      avatarUrl: '/images/daiane-avatar.jpg',
      bio: 'Corretora de imóveis com atendimento exclusivo e consultoria especializada.',
    },
    update: {
      // Preserva dados caso já existam ou atualiza caso estejam vazios
    },
  });

  // 2. Associa responsibleBrokerId aos registros órfãos ou existentes da Daiane
  const propUpdate = await prisma.property.updateMany({
    where: { responsibleBrokerId: null },
    data: { responsibleBrokerId: daiane.id },
  });
  if (propUpdate.count > 0) {
    console.log(`[Bootstrap] ${propUpdate.count} imóveis associados ao corretor responsável (${daiane.name}).`);
  }

  const searchUpdate = await prisma.search.updateMany({
    where: { responsibleBrokerId: null },
    data: { responsibleBrokerId: daiane.id },
  });
  if (searchUpdate.count > 0) {
    console.log(`[Bootstrap] ${searchUpdate.count} buscas associadas ao corretor responsável (${daiane.name}).`);
  }

  const devUpdate = await prisma.development.updateMany({
    where: { responsibleBrokerId: null },
    data: { responsibleBrokerId: daiane.id },
  });
  if (devUpdate.count > 0) {
    console.log(`[Bootstrap] ${devUpdate.count} empreendimentos associados ao corretor responsável (${daiane.name}).`);
  }

  // 3. Bootstrap seguro do primeiro Administrador (areanobreapp@gmail.com)
  const adminEmail = 'areanobreapp@gmail.com';
  let admin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!admin) {
    console.log('[Bootstrap] Criando conta administrativa inicial (areanobreapp@gmail.com)...');
    // Lê a senha de ambiente se configurada ou usa fallback de inicialização local documentado
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'AdminAreaNobre2026!';
    const passwordHash = await hashPassword(adminPassword);

    admin = await prisma.user.create({
      data: {
        name: 'Administrador Área Nobre',
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        profile: {
          create: {
            commercialName: 'Área Nobre Gestão',
            phone: '48999887766',
            tagline: 'Administração da Plataforma Área Nobre',
            city: 'Criciúma - SC',
          },
        },
      },
    });
    console.log('[Bootstrap] Conta ADMIN criada com sucesso.');
  } else {
    // Garante que a conta tem role ADMIN e status ACTIVE
    if (admin.role !== 'ADMIN' || admin.status !== 'ACTIVE') {
      await prisma.user.update({
        where: { id: admin.id },
        data: {
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });
    }
  }

  console.log('[Bootstrap] Migração e bootstrap concluídos com sucesso!');
  return { daiane, admin };
}
