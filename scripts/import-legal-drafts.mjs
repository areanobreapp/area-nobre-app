import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuração dos documentos esperados para rascunhos 1.0
const DRAFTS_DIR = path.resolve('docs/legal-drafts');
const EXPECTED_DOCUMENTS = [
  {
    type: 'TERMS_OF_USE',
    version: '1.0',
    title: 'Termos de Uso e Responsabilidade da Plataforma Área Nobre',
    fileNames: ['termos-de-uso-v1.0.txt', 'termos-de-uso-v1.0.md'],
  },
  {
    type: 'PRIVACY_POLICY',
    version: '1.0',
    title: 'Política de Privacidade e Proteção de Dados (LGPD) — Área Nobre',
    fileNames: ['politica-de-privacidade-v1.0.txt', 'politica-de-privacidade-v1.0.md'],
  },
  {
    type: 'PROPERTY_AUTHORIZATION',
    version: '1.0',
    title: 'Declaração de Autorização para Divulgação de Imóvel — Área Nobre',
    fileNames: [
      'declaracao-autorizacao-imovel-v1.0-revisada.txt',
      'declaracao-autorizacao-imovel-v1.0-revisada.md',
      'declaracao-autorizacao-imovel-v1.0.txt',
      'declaracao-autorizacao-imovel-v1.0.md',
    ],
  },
];

function calculateSha256(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

async function verifyEnvironment() {
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.includes('udtqyoinwnalbvodejxj')) {
    throw new Error('PROIBIDO: Execução bloqueada em ambiente de produção (udtqyoinwnalbvodejxj).');
  }
}

export async function importDrafts({ allowUpdate = false } = {}) {
  await verifyEnvironment();
  console.log('=== IMPORTADOR SEGURO DE RASCUNHOS LEGAIS (ETAPA 1.3.1) ===');
  console.log('Diretório de rascunhos:', DRAFTS_DIR);

  const results = [];
  let foundAny = false;

  for (const docConfig of EXPECTED_DOCUMENTS) {
    let filePath = null;
    for (const name of docConfig.fileNames) {
      const candidate = path.join(DRAFTS_DIR, name);
      if (fs.existsSync(candidate)) {
        filePath = candidate;
        break;
      }
    }

    if (!filePath) {
      console.log(`\n[-] ${docConfig.type} (${docConfig.version}): Arquivo não encontrado.`);
      console.log(`    Esperado em: ${docConfig.fileNames.map(f => path.join('docs/legal-drafts', f)).join(' ou ')}`);
      results.push({
        type: docConfig.type,
        version: docConfig.version,
        status: 'FILE_NOT_FOUND',
        message: 'Arquivo de texto integral não localizado.',
      });
      continue;
    }

    foundAny = true;
    const rawContent = fs.readFileSync(filePath, 'utf8');

    if (!rawContent || rawContent.trim().length === 0) {
      console.warn(`[!] ${docConfig.type}: Arquivo está vazio (${filePath}). Ignorando.`);
      results.push({
        type: docConfig.type,
        version: docConfig.version,
        status: 'EMPTY_FILE',
        file: filePath,
        message: 'Arquivo vazio.',
      });
      continue;
    }

    const fileHash = calculateSha256(rawContent);
    console.log(`\n[+] Processando ${docConfig.type} v${docConfig.version}`);
    console.log(`    Arquivo: ${path.basename(filePath)} (${rawContent.length} caracteres)`);
    console.log(`    Hash SHA-256 (origem): ${fileHash}`);

    // Verificar se já existe registro no banco DEV
    const existing = await prisma.legalDocument.findUnique({
      where: {
        type_version: {
          type: docConfig.type,
          version: docConfig.version,
        },
      },
    });

    if (existing) {
      const existingHash = calculateSha256(existing.content);
      console.log(`    Status atual no banco: ${existing.status} (ID: ${existing.id})`);
      console.log(`    Hash SHA-256 (banco):  ${existingHash}`);

      if (existing.status !== 'DRAFT') {
        console.warn(`    [!] O documento está com status "${existing.status}". Imutabilidade jurídica impede sobrescrita.`);
        results.push({
          type: docConfig.type,
          version: docConfig.version,
          status: 'LOCKED_BY_STATUS',
          dbId: existing.id,
          fileHash,
          dbHash: existingHash,
          message: `Documento está com status ${existing.status} e não pode ser alterado.`,
        });
        continue;
      }

      if (fileHash === existingHash) {
        console.log('    ✓ Conteúdo idêntico ao já existente no banco. Nenhuma ação necessária.');
        results.push({
          type: docConfig.type,
          version: docConfig.version,
          status: 'UNCHANGED',
          dbId: existing.id,
          hash: fileHash,
          message: 'Conteúdo idêntico e íntegro.',
        });
        continue;
      }

      if (!allowUpdate) {
        console.warn('    [!] Divergência detectada entre o arquivo e o rascunho no banco. Sobrescrita silenciosa evitada.');
        results.push({
          type: docConfig.type,
          version: docConfig.version,
          status: 'DIVERGENCE_DETECTED',
          dbId: existing.id,
          fileHash,
          dbHash: existingHash,
          message: 'Conteúdo divergente. Use allowUpdate para atualizar o rascunho.',
        });
        continue;
      }

      // Atualiza o rascunho existente
      const updated = await prisma.legalDocument.update({
        where: { id: existing.id },
        data: {
          title: docConfig.title,
          content: rawContent,
          status: 'DRAFT',
          publishedAt: null,
          effectiveDate: null,
        },
      });

      const verifyHash = calculateSha256(updated.content);
      console.log('    ✓ Rascunho atualizado com sucesso. Hash verificado:', verifyHash);
      results.push({
        type: docConfig.type,
        version: docConfig.version,
        status: 'UPDATED',
        dbId: updated.id,
        hash: verifyHash,
        message: 'Rascunho atualizado e validado.',
      });
      continue;
    }

    // Cria novo registro como DRAFT
    const created = await prisma.legalDocument.create({
      data: {
        type: docConfig.type,
        version: docConfig.version,
        title: docConfig.title,
        content: rawContent,
        status: 'DRAFT',
        publishedAt: null,
        effectiveDate: null,
      },
    });

    // Leitura pós-gravação para certificar integridade
    const readBack = await prisma.legalDocument.findUnique({ where: { id: created.id } });
    const readBackHash = calculateSha256(readBack.content);

    if (readBackHash !== fileHash) {
      throw new Error(`Falha de integridade: Hash lido do banco (${readBackHash}) difere do arquivo (${fileHash})!`);
    }

    console.log(`    ✓ Rascunho inserido com sucesso (ID: ${created.id}).`);
    console.log(`    ✓ Integridade confirmada: Hash verificado = ${readBackHash}`);

    results.push({
      type: docConfig.type,
      version: docConfig.version,
      status: 'INSERTED_AS_DRAFT',
      dbId: created.id,
      hash: readBackHash,
      message: 'Rascunho criado com sucesso em status DRAFT.',
    });
  }

  console.log('\n=== RESUMO DA OPERAÇÃO ===');
  console.log(JSON.stringify(results, null, 2));

  return { foundAny, results };
}

// Execução direta via CLI
if (process.argv[1]?.endsWith('import-legal-drafts.mjs')) {
  importDrafts({ allowUpdate: process.argv.includes('--update') })
    .catch((err) => {
      console.error('\n❌ Erro durante a execução do importador:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

