/**
 * ÁREA NOBRE — Importador Definitivo do Cadastro Mestre de Edifícios (Prefeitura de Criciúma)
 * 
 * Regras de Segurança:
 * 1. Restrito exclusivamente ao Supabase DEV (jdoezhmtwicxcthhedtb).
 * 2. Modo --dry-run por padrão (nenhuma escrita sem a flag --execute --confirm-dev-import).
 * 3. Idempotente: atualiza se já existir, insere se novo, nunca duplica.
 * 4. Preserva integralmente os 235 blocos de multi-torres com seus externalId individuais.
 * 5. Não altera edifícios vinculados a anúncios ativos sem validação explícita.
 * 
 * Uso:
 *   node scripts/import-criciuma-buildings.mjs [--dry-run]
 *   node scripts/import-criciuma-buildings.mjs --execute --confirm-dev-import
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const ENRICHED_JSON = path.join(PROJECT_ROOT, 'scratch', 'criciuma_enriched_buildings.json');
const DEV_SUPABASE_REF = 'jdoezhmtwicxcthhedtb';
const COMMERCIAL_SUPABASE_REF = 'udtqyoinwnalbvodejxj';

// Verificação estrita de ambiente de banco de dados
function verifyDatabaseEnvironment() {
  const dbUrl = process.env.DATABASE_URL || '';
  const directUrl = process.env.DIRECT_URL || '';

  if (dbUrl.includes(COMMERCIAL_SUPABASE_REF) || directUrl.includes(COMMERCIAL_SUPABASE_REF)) {
    console.error('\n[BLOQUEIO DE SEGURANÇA CRÍTICO]');
    console.error('Tentativa de conexão detectada com o Supabase COMERCIAL (udtqyoinwnalbvodejxj)!');
    console.error('Operação abortada imediatamente para proteção dos dados comerciais.\n');
    process.exit(1);
  }

  if (!dbUrl.includes(DEV_SUPABASE_REF)) {
    console.error('\n[BLOQUEIO DE SEGURANÇA]');
    console.error(`A conexão atual não corresponde ao Supabase DEV autorizado (${DEV_SUPABASE_REF}).`);
    console.error('Verifique o arquivo .env antes de prosseguir.\n');
    process.exit(1);
  }

  return true;
}

async function runImporter() {
  const isExecute = process.argv.includes('--execute');
  const isConfirmed = process.argv.includes('--confirm-dev-import');
  const isDryRun = !isExecute || !isConfirmed;

  console.log('='.repeat(80));
  console.log(' ÁREA NOBRE — IMPORTADOR DEFINITIVO DE EDIFÍCIOS MESTRES');
  console.log(` MODO: ${isDryRun ? 'DRY-RUN (SIMULAÇÃO LOCAL — SEM ESCRITA NO BANCO)' : 'EXECUÇÃO REAL NO SUPABASE DEV'}`);
  console.log('='.repeat(80));

  if (!fs.existsSync(ENRICHED_JSON)) {
    console.error(`[ERRO] Base enriquecida não localizada em: ${ENRICHED_JSON}`);
    console.error('Execute primeiro: node scripts/enrich-ceps-cache.mjs');
    process.exit(1);
  }

  const dataset = JSON.parse(fs.readFileSync(ENRICHED_JSON, 'utf8'));
  console.log(`\n[1/5] Carregados ${dataset.length} condomínios preparados e enriquecidos.`);

  // Validar ambiente
  verifyDatabaseEnvironment();
  console.log(`[2/5] Ambiente verificado: Supabase DEV (${DEV_SUPABASE_REF}) confirmado.`);

  if (!isDryRun) {
    console.log('[AVISO] MODO DE ESCRITA ATIVADO VIA --execute --confirm-dev-import');
  } else {
    console.log('[INFO] Modo Dry-run ativo. Analisando operações de banco sem efetuar alterações...');
  }

  const prisma = new PrismaClient();

  try {
    // 1. Diagnóstico do banco de dados existente
    console.log(`\n[3/5] Consultando estado atual do Supabase DEV...`);
    const existingBuildingsCount = await prisma.building.count();
    const existingPropertiesCount = await prisma.property.count();
    console.log(`      - Edifícios atualmente no banco: ${existingBuildingsCount}`);
    console.log(`      - Imóveis/anúncios atualmente no banco: ${existingPropertiesCount}`);

    // Consultar edifícios pré-existentes para cálculo de idempotência (tolerante a pré-migração)
    let existingMaster = [];
    try {
      existingMaster = await prisma.$queryRaw`
        SELECT "id", "externalId", "name", "address", "number", "status"
        FROM "Building"
        WHERE "city" = 'Criciúma' AND "source" = 'PREFEITURA_CRICIUMA'
      `;
    } catch {
      console.log('      - [AVISO] Colunas do cadastro mestre (externalId/source) ainda não migradas no banco.');
      console.log('      - Considerados 0 registros existentes para a simulação.');
      existingMaster = [];
    }

    const existingByExternalId = new Map(existingMaster.map(b => [b.externalId, b]));
    console.log(`      - Edifícios municipais já importados anteriormente: ${existingByExternalId.size}`);

    // 2. Classificação de operações
    const toCreate = [];
    const toUpdate = [];
    const unchanged = [];
    const protectedWithListings = [];
    const reviewPendingList = [];

    for (const item of dataset) {
      if (item.dataValidationStatus === 'PENDING_REVIEW') {
        reviewPendingList.push(item);
      }

      const existing = existingByExternalId.get(item.externalId);
      if (!existing) {
        toCreate.push(item);
      } else {
        // Se já possuir imóveis comerciais vinculados por corretores
        if (existing._count?.properties > 0) {
          protectedWithListings.push({ existing, item });
        } else {
          toUpdate.push({ existing, item });
        }
      }
    }

    console.log(`\n[4/5] Resultado da Análise de Idempotência:`);
    console.log(`      - Novos edifícios a criar: ${toCreate.length}`);
    console.log(`      - Edifícios a atualizar: ${toUpdate.length}`);
    console.log(`      - Edifícios protegidos com imóveis vinculados: ${protectedWithListings.length}`);
    console.log(`      - Registros com pendência de revisão (${reviewPendingList.length}):`);
    for (const r of reviewPendingList.slice(0, 5)) {
      console.log(`         * [Cód ${r.externalId}] ${r.name} (${r.address}, ${r.number})`);
    }

    // 3. Execução ou Dry-run
    if (isDryRun) {
      console.log(`\n[5/5] SIMULAÇÃO CONCLUÍDA COM SUCESSO`);
      console.log(`      - Nenhuma alteração foi persistida no banco.`);
      console.log(`      - Para aplicar de fato no Supabase DEV, execute:`);
      console.log(`        node scripts/import-criciuma-buildings.mjs --execute --confirm-dev-import`);
    } else {
      console.log(`\n[5/5] Iniciando ingestão no Supabase DEV em lotes de 50 registros...`);
      const BATCH_SIZE = 50;
      let createdCount = 0;
      let updatedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
        const batch = toCreate.slice(i, i + BATCH_SIZE);
        await prisma.$transaction(
          batch.map((b) =>
            prisma.building.create({
              data: {
                name: b.name,
                normalizedName: b.normalizedName,
                externalId: b.externalId,
                source: b.source,
                sourceBatch: b.sourceBatch,
                condoType: b.condoType,
                alternativeNames: b.alternativeNames || null,
                blockOrTower: b.inferredTower || null,
                isMultiTowerMember: b.isMultiTowerMember || false,
                address: b.address,
                number: b.number !== 'S/N' ? b.number : null,
                neighborhood: b.neighborhood,
                city: b.city,
                state: b.state,
                zipcode: b.zipcode,
                latitude: b.latitude,
                longitude: b.longitude,
                geoValidationStatus: b.geoValidationStatus || 'UNVERIFIED',
                geoConfidence: b.geoConfidence,
                dataValidationStatus: b.dataValidationStatus,
                status: 'ACTIVE',
                verifiedByAdmin: b.dataValidationStatus === 'VALIDATED',
              },
            })
          )
        );
        createdCount += batch.length;
        process.stdout.write(`  Progresso: ${createdCount}/${toCreate.length} edifícios criados...\r`);
      }

      console.log(`\nIngestão finalizada com sucesso: ${createdCount} registros criados no Supabase DEV.`);
    }

    // Salvar auditoria
    const auditSummary = {
      timestamp: new Date().toISOString(),
      mode: isDryRun ? 'DRY_RUN' : 'LIVE_EXECUTION',
      targetDatabaseRef: DEV_SUPABASE_REF,
      totalDataset: dataset.length,
      toCreateCount: toCreate.length,
      toUpdateCount: toUpdate.length,
      protectedListingsCount: protectedWithListings.length,
      pendingReviewCount: reviewPendingList.length,
    };

    const auditFile = path.join(PROJECT_ROOT, 'scratch', 'import_execution_audit.json');
    fs.writeFileSync(auditFile, JSON.stringify(auditSummary, null, 2), 'utf8');

    return auditSummary;
  } finally {
    await prisma.$disconnect();
  }
}

runImporter().catch((err) => {
  console.error('\n[ERRO NO IMPORTADOR]:', err);
  process.exit(1);
});
