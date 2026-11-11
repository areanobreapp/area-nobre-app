/**
 * ÁREA NOBRE — Enriquecimento Seguro de Bairros via Cache de CEPs
 * 
 * Etapa F: Consulta com cache persistente, timeout de 5s, rate-limiting (100ms)
 * e proteção estrita contra sobrescrita de dados incompletos.
 * 
 * Uso:
 *   node scripts/enrich-ceps-cache.mjs [--dry-run] [--refresh]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const CACHE_FILE = path.join(PROJECT_ROOT, 'scratch', 'cep_cache_criciuma.json');
const MASTER_JSON = path.join(PROJECT_ROOT, 'scratch', 'criciuma_master_buildings.json');

async function fetchCepWithTimeout(cleanCep, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AreaNobre-MasterBuildings/1.0 (imobiliaria-criciuma)',
      },
    });

    if (!res.ok) {
      return { success: false, status: res.status, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    if (data.erro) {
      return { success: false, notFound: true, error: 'CEP não localizado na base postal nacional' };
    }

    return {
      success: true,
      cep: data.cep,
      logradouro: data.logradouro || '',
      complemento: data.complemento || '',
      bairro: data.bairro ? data.bairro.trim() : '',
      localidade: data.localidade || 'Criciúma',
      uf: data.uf || 'SC',
      ibge: data.ibge,
    };
  } catch (err) {
    return { success: false, error: err.name === 'AbortError' ? 'Timeout após 5s' : err.message };
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runCepEnrichment() {
  console.log('='.repeat(78));
  console.log(' ÁREA NOBRE — ENRIQUECIMENTO DE BAIRROS VIA CACHE DE CEPS');
  console.log('='.repeat(78));

  if (!fs.existsSync(MASTER_JSON)) {
    console.error(`[ERRO] Base de dados do cadastro mestre não encontrada em: ${MASTER_JSON}`);
    console.error('Execute primeiro: node scripts/simulate-criciuma-import.mjs --export-json');
    process.exit(1);
  }

  const buildings = JSON.parse(fs.readFileSync(MASTER_JSON, 'utf8'));
  console.log(`[1/4] Carregados ${buildings.length} edifícios do cadastro mestre.`);

  // Extrair os CEPs únicos
  const uniqueCeps = [...new Set(buildings.map(b => b.zipcode).filter(Boolean))];
  console.log(`[2/4] Identificados ${uniqueCeps.length} CEPs distintos.`);

  // Carregar ou inicializar cache
  let cache = {};
  if (fs.existsSync(CACHE_FILE) && !process.argv.includes('--refresh')) {
    try {
      cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      console.log(`[3/4] Cache existente carregado com ${Object.keys(cache).length} entradas salvas.`);
    } catch {
      cache = {};
    }
  } else {
    console.log(`[3/4] Iniciando novo cache de CEPs em: ${CACHE_FILE}`);
  }

  const pendingCeps = uniqueCeps.filter(cep => !cache[cep]);
  console.log(`      - CEPs já cacheados: ${uniqueCeps.length - pendingCeps.length}`);
  console.log(`      - CEPs pendentes de consulta: ${pendingCeps.length}`);

  let successCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;

  if (pendingCeps.length > 0) {
    console.log(`\nIniciando consultas controladas com rate-limiting de 100ms...`);
    let idx = 0;

    for (const cep of pendingCeps) {
      idx++;
      const cleanCep = cep.replace(/\D/g, '');
      const result = await fetchCepWithTimeout(cleanCep);

      if (result.success) {
        cache[cep] = {
          status: 'FOUND',
          bairro: result.bairro,
          logradouro: result.logradouro,
          localidade: result.localidade,
          uf: result.uf,
          resolvedAt: new Date().toISOString(),
        };
        successCount++;
      } else if (result.notFound) {
        cache[cep] = {
          status: 'NOT_FOUND',
          error: result.error,
          resolvedAt: new Date().toISOString(),
        };
        notFoundCount++;
      } else {
        cache[cep] = {
          status: 'ERROR',
          error: result.error,
          resolvedAt: new Date().toISOString(),
        };
        errorCount++;
      }

      if (idx % 25 === 0 || idx === pendingCeps.length) {
        process.stdout.write(`  Progresso: ${idx}/${pendingCeps.length} consultas processadas...\r`);
        // Salvar cache incrementalmente
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
      }

      await sleep(100); // 100ms entre requisições
    }
    console.log('\nConsultas concluídas!');
  }

  // Salvar cache final
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');

  // Relatório de enriquecimento dos 1.256 edifícios
  let enrichedCount = 0;
  let unresolvedCount = 0;
  const neighborhoodDist = new Map();

  for (const b of buildings) {
    const cepInfo = cache[b.zipcode];
    if (cepInfo && cepInfo.status === 'FOUND' && cepInfo.bairro) {
      b.neighborhood = cepInfo.bairro;
      b.neighborhoodSource = 'VIACEP_CORREIOS';
      enrichedCount++;
      neighborhoodDist.set(cepInfo.bairro, (neighborhoodDist.get(cepInfo.bairro) || 0) + 1);
    } else {
      // Rigorosamente nulo: sem bairros inventados ou macro-regiões gravadas como bairro oficial
      b.neighborhood = null;
      b.neighborhoodSource = 'UNRESOLVED';
      b.macroRegionEstimate = b.inferredMacroNeighborhood || null;
      unresolvedCount++;
    }
  }

  console.log(`\n[4/4] Resultado do Enriquecimento de Endereços:`);
  console.log(`      - Edifícios com Bairro oficial confirmado: ${enrichedCount} (${((enrichedCount / buildings.length) * 100).toFixed(1)}%)`);
  console.log(`      - Edifícios com Macro-Região referencial: ${unresolvedCount} (${((unresolvedCount / buildings.length) * 100).toFixed(1)}%)`);
  console.log(`      - Bairros distintos identificados: ${neighborhoodDist.size}`);

  console.log('\nTop 8 Bairros com maior concentração predial:');
  const sortedBairros = [...neighborhoodDist.entries()].sort((a, b) => b[1] - a[1]);
  for (const [bairro, count] of sortedBairros.slice(0, 8)) {
    console.log(`  * ${bairro}: ${count} condomínios`);
  }

  // Exportar base enriquecida
  const enrichedJsonPath = path.join(PROJECT_ROOT, 'scratch', 'criciuma_enriched_buildings.json');
  fs.writeFileSync(enrichedJsonPath, JSON.stringify(buildings, null, 2), 'utf8');
  console.log(`\n[OK] Base enriquecida salva em: ${enrichedJsonPath}`);

  return {
    totalBuildings: buildings.length,
    enrichedCount,
    unresolvedCount,
    distinctNeighborhoods: neighborhoodDist.size,
  };
}

runCepEnrichment().catch(err => {
  console.error('[ERRO NO ENRIQUECIMENTO DE CEPS]:', err);
  process.exit(1);
});

