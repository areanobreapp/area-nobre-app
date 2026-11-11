/**
 * ÁREA NOBRE — Motor de Simulação, Validação e Auditoria de Ingestão de Edifícios
 * 
 * Etapa E: Preparação técnica, idempotência, detecção de multi-torres sem fusão,
 * enriquecimento seguro de CEPs e plano de reversão auditável.
 * 
 * Regra: NENHUMA escrita no banco de dados é realizada durante a simulação.
 * 
 * Uso:
 *   node scripts/simulate-criciuma-import.mjs [--dry-run] [--export-json] [--export-report]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iter } from 'but-unzip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Normalização padronizada do Área Nobre
function normalizeBuildingName(rawName) {
  if (!rawName) return '';
  let normalized = rawName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  let previous = '';
  while (previous !== normalized) {
    previous = normalized;
    normalized = normalized.replace(/^(edificio|ed\.|ed|residencial|condominio|cond\.|cond)\s+/i, '');
  }
  normalized = normalized.replace(/[^a-z0-9\s]/g, ' ');
  return normalized.replace(/\s+/g, ' ').trim();
}

function normalizeAddressStreet(address) {
  if (!address) return '';
  let str = address
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  let previous = '';
  while (previous !== str) {
    previous = str;
    str = str.replace(/^(rua|r\.|avenida|av\.|alameda|al\.|travessa|tv\.|rodovia|rod\.|estrada|est\.)\s+/i, '');
  }
  return str.replace(/[^a-z0-9]/g, '');
}

function cleanStreetName(rawLogradouro) {
  if (!rawLogradouro) return { streetId: null, streetName: '', fullName: '' };
  const trimmed = rawLogradouro.trim();
  const match = trimmed.match(/^(\d+)\s*-\s*(.+)$/);
  if (match) {
    const streetId = match[1];
    let streetName = match[2].trim();
    streetName = streetName
      .toLowerCase()
      .split(' ')
      .map(w => {
        if (['de', 'da', 'do', 'das', 'dos', 'e'].includes(w)) return w;
        return w.charAt(0).toUpperCase() + w.slice(1);
      })
      .join(' ');
    const fullName = streetName.startsWith('Rua') || streetName.startsWith('Avenida') || streetName.startsWith('Av.') || streetName.startsWith('Rodovia')
      ? streetName 
      : `Rua ${streetName}`;
    return { streetId, streetName, fullName };
  }
  return { streetId: null, streetName: trimmed, fullName: trimmed };
}

function formatCep(rawCep) {
  if (!rawCep) return null;
  const digits = String(rawCep).replace(/\D/g, '').padStart(8, '0');
  if (digits.length !== 8) return null;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

// Detecção heurística de blocos, torres ou nomes truncados
function detectTowerOrBlock(rawName) {
  const trimmed = (rawName || '').trim();
  const towerMatch = trimmed.match(/(?:torre|bloco|ed\s+res\s+vivendas\s+de\s+espanha\s*-\s*torre|conjunto\s+habitacional\s+pro-morar\s+esperan[cç]a\s+bloco)\s*([a-z0-9]+)?/i);
  const isTruncated = /[-–(]\s*$/.test(trimmed);
  return {
    inferredTower: towerMatch ? (towerMatch[1] ? `Torre/Bloco ${towerMatch[1]}` : 'Multi-Torre') : null,
    isTruncated,
  };
}

// Extração segura do XML da planilha
function parseSharedStrings(xml) {
  const strings = [];
  const siMatches = xml.matchAll(/<si>(.*?)<\/si>/gs);
  for (const match of siMatches) {
    const siContent = match[1];
    const tMatches = [...siContent.matchAll(/<t[^>]*>(.*?)<\/t>/gs)];
    if (tMatches.length > 0) {
      strings.push(tMatches.map(m => m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')).join(''));
    } else {
      strings.push('');
    }
  }
  return strings;
}

function parseSheetRows(xml, sharedStrings) {
  const rows = [];
  const rowMatches = xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>(.*?)<\/row>/gs);

  for (const rMatch of rowMatches) {
    const rowNum = parseInt(rMatch[1], 10);
    const rowXml = rMatch[2];
    const cells = {};

    const cellMatches = rowXml.matchAll(/<c[^>]*r="([A-Z]+)\d+"([^>]*)>(?:<v>(.*?)<\/v>)?<\/c>/gs);
    for (const cMatch of cellMatches) {
      const col = cMatch[1];
      const attrs = cMatch[2] || '';
      const rawVal = cMatch[3] !== undefined ? cMatch[3] : '';
      const isString = attrs.includes('t="s"');

      if (isString) {
        const sIndex = parseInt(rawVal, 10);
        cells[col] = sharedStrings[sIndex] || '';
      } else {
        cells[col] = rawVal;
      }
    }
    rows.push({ rowNum, cells });
  }
  return rows;
}

// Mapeamento referencial das macro-regiões de CEP em Criciúma
function estimateMacroNeighborhoodByCep(cepFormatted) {
  if (!cepFormatted) return 'Região Não Identificada';
  const prefix5 = cepFormatted.replace(/\D/g, '').slice(0, 5);
  // Regiões consolidadas do plano diretor de Criciúma
  if (prefix5 >= '88801' && prefix5 <= '88803') return 'Centro / Comerciário / Michel / Pio Corrêa';
  if (prefix5 === '88804') return 'São Luiz / Cruzeiro do Sul / Mina do Mato';
  if (prefix5 === '88805') return 'Vila Zuleima / Maria Céu / Naspolini';
  if (prefix5 === '88806') return 'Universitário / Santa Augusta / Pinheirinho';
  if (prefix5 === '88808' || prefix5 === '88809') return 'Próspera / Ceará / Argentina / Brasília';
  if (prefix5 >= '88810' && prefix5 <= '88812') return 'Rio Maina / Wosocris / Coloninha';
  if (prefix5 >= '88813' && prefix5 <= '88815') return 'Santa Luzia / Nova Esperança / São Sebastião';
  if (prefix5 >= '88816' && prefix5 <= '88819') return 'Quarta Linha / Sangão / Morro Estevão';
  return 'Criciúma (Geral)';
}

async function runMasterSimulation() {
  console.log('='.repeat(80));
  console.log(' ÁREA NOBRE — ETAPA E: MOTOR DE SIMULAÇÃO E PREPARAÇÃO DE IMPORTAÇÃO');
  console.log(' Cadastro Mestre de Edifícios e Condomínios');
  console.log(' Escopo: Criciúma / SC | Fonte: Prefeitura Municipal');
  console.log('='.repeat(80));

  const xlsxPath = path.join(PROJECT_ROOT, 'referenciais', 'concominios-criciuma.xlsx');
  if (!fs.existsSync(xlsxPath)) {
    console.error(`[ERRO CRÍTICO] Arquivo original não localizado em: ${xlsxPath}`);
    process.exit(1);
  }

  const fileBytes = fs.readFileSync(xlsxPath);
  console.log(`\n[1/6] Planilha original carregada: ${xlsxPath} (${(fileBytes.length / 1024).toFixed(1)} KB)`);

  let sheetXml = '';
  let stringsXml = '';

  for (const entry of iter(fileBytes)) {
    if (entry.filename === 'xl/worksheets/sheet1.xml') {
      const data = await entry.read();
      sheetXml = Buffer.from(data).toString('utf8');
    } else if (entry.filename === 'xl/sharedStrings.xml') {
      const data = await entry.read();
      stringsXml = Buffer.from(data).toString('utf8');
    }
  }

  const sharedStrings = parseSharedStrings(stringsXml);
  const allRows = parseSheetRows(sheetXml, sharedStrings);
  console.log(`[2/6] Leitura XML concluída: ${allRows.length} linhas brutas, ${sharedStrings.length} termos de texto.`);

  // Higienização e montagem dos registros
  let headerRepeatsCount = 0;
  let emptyRowsCount = 0;
  const processedRecords = [];

  for (let i = 1; i < allRows.length; i++) {
    const { rowNum, cells } = allRows[i];
    const colA = (cells['A'] || '').trim();
    const colB = (cells['B'] || '').trim();
    const colC = (cells['C'] || '').trim();
    const colD = (cells['D'] || '').trim();
    const colE = (cells['E'] || '').trim();
    const colF = (cells['F'] || '').trim();

    if (colA === 'Condomínio' || colC === 'Tipo' || colD === 'Logradouro') {
      headerRepeatsCount++;
      continue;
    }
    if (!colA && !colB && !colD) {
      emptyRowsCount++;
      continue;
    }

    const { streetId, streetName, fullName } = cleanStreetName(colD);
    const formattedCep = formatCep(colF);
    const normalizedName = normalizeBuildingName(colB);
    const { inferredTower, isTruncated } = detectTowerOrBlock(colB);

    // Auditoria de inconsistências
    const inconsistencies = [];
    if (!colE || colE === '0' || colE.toLowerCase() === 's/n') {
      inconsistencies.push({ type: 'WARNING', field: 'number', message: 'Número predial ausente ou não numérico (S/N ou 0).' });
    }
    if (isTruncated) {
      inconsistencies.push({ type: 'INFO', field: 'name', message: 'Nome aparentemente truncado no relatório da prefeitura (termina em traço ou parêntese).' });
    }
    if (normalizedName.length < 3) {
      inconsistencies.push({ type: 'CRITICAL', field: 'name', message: 'Nome normalizado excessivamente curto para correspondência segura.' });
    }

    const record = {
      source: 'PREFEITURA_CRICIUMA',
      sourceBatch: 'CRICIUMA_PREF_2026_01',
      city: 'Criciúma',
      state: 'SC',
      externalId: colA,
      name: colB,
      normalizedName,
      condoType: (colC || 'Vertical').toUpperCase(),
      rawLogradouro: colD,
      municipalStreetId: streetId,
      address: fullName,
      number: colE || 'S/N',
      zipcode: formattedCep,
      inferredMacroNeighborhood: estimateMacroNeighborhoodByCep(formattedCep),
      inferredTower,
      isMultiTowerMember: false,
      complexAddressKey: `${normalizeAddressStreet(fullName)}#${colE ? colE.trim() : 'sn'}`,
      inconsistencies,
      dataValidationStatus: inconsistencies.some(i => i.type === 'CRITICAL') 
        ? 'SUSPICIOUS' 
        : inconsistencies.length > 0 ? 'PENDING_REVIEW' : 'VALIDATED',
      geoValidationStatus: 'UNVERIFIED',
      geoConfidence: null,
      latitude: null,
      longitude: null,
      rowNum,
    };

    processedRecords.push(record);
  }

  console.log(`[3/6] Higienização concluída:`);
  console.log(`      - Registros válidos extraídos: ${processedRecords.length} / 1.256 esperados`);
  console.log(`      - Cabeçalhos de paginação descartados: ${headerRepeatsCount}`);
  console.log(`      - Linhas vazias descartadas: ${emptyRowsCount}`);

  // Análise de Multi-Torres sem fusão destrutiva
  console.log(`\n[4/6] Análise e preservação de Multi-Torres:`);
  const addressGroups = new Map();
  for (const r of processedRecords) {
    if (!addressGroups.has(r.complexAddressKey)) {
      addressGroups.set(r.complexAddressKey, []);
    }
    addressGroups.get(r.complexAddressKey).push(r);
  }

  const multiTowerComplexes = [];
  for (const [addrKey, list] of addressGroups.entries()) {
    if (list.length > 1) {
      multiTowerComplexes.push({ addressKey: addrKey, count: list.length, items: list });
      for (const item of list) {
        item.isMultiTowerMember = true;
      }
    }
  }

  console.log(`      - Endereços compartilhados (mesmo logradouro e número): ${multiTowerComplexes.length} endereços`);
  console.log(`      - Total de blocos/torres individuais preservados: ${multiTowerComplexes.reduce((acc, c) => acc + c.count, 0)} registros`);
  console.log(`      - REGRA DE OURO: Nenhum bloco foi fundido! Cada registro mantém seu externalId municipal original.`);

  // Estatísticas de Bairros e CEPs
  console.log(`\n[5/6] Auditoria de CEPs e Projeção de Bairros:`);
  const cepSet = new Set(processedRecords.map(r => r.zipcode));
  const macroDist = new Map();
  for (const r of processedRecords) {
    const macro = r.inferredMacroNeighborhood;
    macroDist.set(macro, (macroDist.get(macro) || 0) + 1);
  }

  console.log(`      - Total de CEPs únicos mapeados: ${cepSet.size}`);
  console.log(`      - Distribuição por Macro-Região de Criciúma:`);
  for (const [macro, count] of [...macroDist.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`         * ${macro}: ${count} edifícios (${((count / processedRecords.length) * 100).toFixed(1)}%)`);
  }

  // Auditoria de Idempotência e Inconsistências
  const criticalIssues = processedRecords.filter(r => r.inconsistencies.some(i => i.type === 'CRITICAL'));
  const warningIssues = processedRecords.filter(r => r.inconsistencies.some(i => i.type === 'WARNING'));
  const infoIssues = processedRecords.filter(r => r.inconsistencies.some(i => i.type === 'INFO'));

  console.log(`\n[6/6] Auditoria de Integridade e Prévia de Ingestão:`);
  console.log(`      - Total de registros prontos para importação: ${processedRecords.length}`);
  console.log(`      - Registros com status VALIDATED (100% limpos): ${processedRecords.filter(r => r.dataValidationStatus === 'VALIDATED').length}`);
  console.log(`      - Registros com status PENDING_REVIEW (número s/n ou aviso): ${processedRecords.filter(r => r.dataValidationStatus === 'PENDING_REVIEW').length}`);
  console.log(`      - Registros com status SUSPICIOUS (crítico): ${criticalIssues.length}`);
  console.log(`      - Advertências de número S/N ou 0: ${warningIssues.length}`);
  console.log(`      - Títulos com traço/parêntese truncado na prefeitura: ${infoIssues.length}`);

  // Simulação do Plano de Reversão
  const rollbackSql = `
-- ==============================================================================
-- PLANO DE REVERSÃO SEGURO (ROLLBACK) — LOTE: CRICIUMA_PREF_2026_01
-- ==============================================================================
-- Este script desfaz a importação preservando integralmente quaisquer edifícios
-- que já tenham sido vinculados a Imóveis (Property), Unidades (BuildingUnit)
-- ou Identidades Físicas (PhysicalProperty):

-- 1. Desativar registros vinculados antes de qualquer intervenção (caso haja vínculos)
UPDATE "Building"
SET "status" = 'INACTIVE'
WHERE "source" = 'PREFEITURA_CRICIUMA'
  AND "sourceBatch" = 'CRICIUMA_PREF_2026_01'
  AND (
    "id" IN (SELECT DISTINCT "buildingId" FROM "Property" WHERE "buildingId" IS NOT NULL)
    OR "id" IN (SELECT DISTINCT "buildingId" FROM "PhysicalProperty" WHERE "buildingId" IS NOT NULL)
    OR "id" IN (SELECT DISTINCT "buildingId" FROM "BuildingUnit" WHERE "buildingId" IS NOT NULL)
  );

-- 2. Excluir com segurança exclusivamente os edifícios 100% órfãos deste lote
DELETE FROM "Building"
WHERE "source" = 'PREFEITURA_CRICIUMA'
  AND "sourceBatch" = 'CRICIUMA_PREF_2026_01'
  AND "id" NOT IN (SELECT DISTINCT "buildingId" FROM "Property" WHERE "buildingId" IS NOT NULL)
  AND "id" NOT IN (SELECT DISTINCT "buildingId" FROM "PhysicalProperty" WHERE "buildingId" IS NOT NULL)
  AND "id" NOT IN (SELECT DISTINCT "buildingId" FROM "BuildingUnit" WHERE "buildingId" IS NOT NULL);
`.trim();

  // Exportações locais de segurança
  if (process.argv.includes('--export-json')) {
    const exportJsonPath = path.join(PROJECT_ROOT, 'scratch', 'criciuma_master_buildings.json');
    fs.mkdirSync(path.dirname(exportJsonPath), { recursive: true });
    fs.writeFileSync(exportJsonPath, JSON.stringify(processedRecords, null, 2), 'utf8');
    console.log(`\n[OK] Extrato JSON estruturado gerado em: ${exportJsonPath}`);
  }

  const exportReportPath = path.join(PROJECT_ROOT, 'scratch', 'criciuma_import_audit_summary.json');
  const auditSummary = {
    batchId: 'CRICIUMA_PREF_2026_01',
    timestamp: new Date().toISOString(),
    sourceFile: 'referenciais/concominios-criciuma.xlsx',
    totalRecords: processedRecords.length,
    validatedCount: processedRecords.filter(r => r.dataValidationStatus === 'VALIDATED').length,
    pendingReviewCount: processedRecords.filter(r => r.dataValidationStatus === 'PENDING_REVIEW').length,
    suspiciousCount: criticalIssues.length,
    multiTowerComplexesCount: multiTowerComplexes.length,
    multiTowerTotalBlocks: multiTowerComplexes.reduce((acc, c) => acc + c.count, 0),
    uniqueCepsCount: cepSet.size,
    rollbackPlanSql: rollbackSql,
  };
  fs.writeFileSync(exportReportPath, JSON.stringify(auditSummary, null, 2), 'utf8');

  console.log(`[OK] Relatório de auditoria gerado em: ${exportReportPath}`);
  console.log('\n[SIMULAÇÃO CONCLUÍDA COM SUCESSO - NENHUM DADO REMOTO FOI MODIFICADO]');
  return auditSummary;
}

runMasterSimulation().catch(err => {
  console.error('[FALHA NO MOTOR DE SIMULAÇÃO]:', err);
  process.exit(1);
});
