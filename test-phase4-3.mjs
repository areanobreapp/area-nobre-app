import http from 'http';
import fs from 'fs';
import path from 'path';

console.log('====================================================');
console.log('TEST SUITE: FASE 4.3 — MAPA HÍBRIDO (VETORIAL + SATÉLITE)');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
  }
}

// Helper para requisições HTTP
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? import('https') : Promise.resolve(http);
    client.then((mod) => {
      mod.get(url, { headers: { 'User-Agent': 'AreaNobre/1.0 (Testing)' } }, (res) => {
        let data = [];
        res.on('data', (chunk) => data.push(chunk));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            buffer: Buffer.concat(data),
          });
        });
      }).on('error', reject);
    });
  });
}

// Conversão lat/lng para slippy tile x, y
function latLngToTile(lat, lng, zoom) {
  const n = Math.pow(2, zoom);
  const latRad = (lat * Math.PI) / 180;
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y, z: zoom };
}

async function runTests() {
  console.log('--- TEST 1: Verificação dos Módulos da Camada de Basemaps ---');
  const basemapsPath = path.resolve('src/lib/geo/basemaps.ts');
  assert(fs.existsSync(basemapsPath), 'Módulo src/lib/geo/basemaps.ts existe');

  const basemapContent = fs.readFileSync(basemapsPath, 'utf-8');
  assert(basemapContent.includes('export type BaseMapType'), 'Exporta BaseMapType');
  assert(basemapContent.includes('export interface BaseMapConfig'), 'Exporta BaseMapConfig');
  assert(basemapContent.includes('getBaseMapConfig'), 'Exporta getBaseMapConfig()');
  assert(basemapContent.includes('createBaseMapTileLayer'), 'Exporta createBaseMapTileLayer()');
  assert(basemapContent.includes('getStoredBaseMapPreference'), 'Exporta getStoredBaseMapPreference()');
  assert(basemapContent.includes('setStoredBaseMapPreference'), 'Exporta setStoredBaseMapPreference()');
  assert(basemapContent.includes('area_nobre_basemap_preference'), 'Chave de localStorage correta definida');
  assert(basemapContent.includes('server.arcgisonline.com'), 'Provedor Esri configurado como padrão robusto e legal');
  assert(basemapContent.includes('process.env.NEXT_PUBLIC_SATELLITE_PROVIDER'), 'Arquitetura desacoplada via variáveis de ambiente');

  console.log('\n--- TEST 2: Verificação do Componente de Alternância Visual (BaseMapToggle) ---');
  const togglePath = path.resolve('src/components/BaseMapToggle.tsx');
  assert(fs.existsSync(togglePath), 'Componente src/components/BaseMapToggle.tsx existe');
  const toggleContent = fs.readFileSync(togglePath, 'utf-8');
  assert(toggleContent.includes('activeBaseMap'), 'Recebe prop activeBaseMap');
  assert(toggleContent.includes('onChange'), 'Recebe prop onChange');
  assert(toggleContent.includes('Mapa'), 'Possui opção textual "Mapa"');
  assert(toggleContent.includes('Satélite'), 'Possui opção textual "Satélite"');
  assert(toggleContent.includes('aria-pressed'), 'Acessibilidade WCAG com aria-pressed');
  assert(!toggleContent.includes('leaflet-control-layers'), 'Não utiliza seletor antigo destoante do Leaflet');

  console.log('\n--- TEST 3: Integração no Editor de Delimitação (ParcelBoundaryModal) ---');
  const boundaryModalPath = path.resolve('src/components/ParcelBoundaryModal.tsx');
  const boundaryModalContent = fs.readFileSync(boundaryModalPath, 'utf-8');
  assert(boundaryModalContent.includes('BaseMapToggle'), 'ParcelBoundaryModal importa e renderiza BaseMapToggle');
  assert(boundaryModalContent.includes('createBaseMapTileLayer'), 'ParcelBoundaryModal usa createBaseMapTileLayer');
  assert(boundaryModalContent.includes('activeBaseMap'), 'ParcelBoundaryModal gerencia activeBaseMap');
  assert(boundaryModalContent.includes('bringToBack'), 'Camada de satélite colocada em bringToBack para não sobrepor polígono');
  assert(boundaryModalContent.includes('fillOpacity: isSat ? 0.18 : 0.25'), 'Polígono ajustado para baixa opacidade sobre satélite');
  assert(boundaryModalContent.includes('box-shadow: 0 0 0 2px rgba(0,0,0,0.5)'), 'Vértices com duplo anel de contraste para máxima visibilidade');

  console.log('\n--- TEST 4: Integração no Mapa Principal (HomeMap) ---');
  const homeMapPath = path.resolve('src/components/HomeMap.tsx');
  const homeMapContent = fs.readFileSync(homeMapPath, 'utf-8');
  assert(homeMapContent.includes('BaseMapToggle'), 'HomeMap importa e renderiza BaseMapToggle');
  assert(homeMapContent.includes('createBaseMapTileLayer'), 'HomeMap usa createBaseMapTileLayer');
  assert(homeMapContent.includes('activeBaseMap'), 'HomeMap gerencia activeBaseMap reativamente');
  assert(homeMapContent.includes('setShowTerritory'), 'HomeMap preserva controle independente Território ON/OFF');
  assert(homeMapContent.includes('parcelsLayerRef'), 'HomeMap preserva camada de delimitações territoriais');
  assert(homeMapContent.includes('markersLayerRef'), 'HomeMap preserva camada de marcadores/pins');

  console.log('\n--- TEST 5: Integração no Localizador (LocationPickerModal) ---');
  const locModalPath = path.resolve('src/components/LocationPickerModal.tsx');
  const locModalContent = fs.readFileSync(locModalPath, 'utf-8');
  assert(locModalContent.includes('BaseMapToggle'), 'LocationPickerModal importa e renderiza BaseMapToggle');
  assert(locModalContent.includes('createBaseMapTileLayer'), 'LocationPickerModal usa createBaseMapTileLayer');
  assert(locModalContent.includes('activeBaseMap'), 'LocationPickerModal gerencia activeBaseMap');

  console.log('\n--- TEST 6: Resposta Real dos Tiles de Imagem Aérea / Satélite em Criciúma ---');
  // Coordenadas centrais de Criciúma (Praça Nereu Ramos / Centro)
  const criciumaLat = -28.6775;
  const criciumaLng = -49.3705;

  const testZooms = [14, 16, 17, 18];
  for (const z of testZooms) {
    const tile = latLngToTile(criciumaLat, criciumaLng, z);
    // Esri tile URL: {z}/{y}/{x}
    const esriUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${tile.z}/${tile.y}/${tile.x}`;
    try {
      const res = await fetchUrl(esriUrl);
      const isOk = res.statusCode === 200 && res.buffer.length > 2000;
      assert(isOk, `Tile Esri Satélite z=${z} (x=${tile.x}, y=${tile.y}): HTTP ${res.statusCode} (${(res.buffer.length / 1024).toFixed(1)} KB)`);
    } catch (err) {
      assert(false, `Falha ao buscar tile Esri z=${z}: ${err.message}`);
    }
  }

  console.log('\n--- TEST 7: Resposta dos Tiles Vetoriais (OpenStreetMap) ---');
  const osmTile = latLngToTile(criciumaLat, criciumaLng, 16);
  const osmUrl = `https://tile.openstreetmap.org/${osmTile.z}/${osmTile.x}/${osmTile.y}.png`;
  try {
    const res = await fetchUrl(osmUrl);
    const isOk = res.statusCode === 200 && res.buffer.length > 1000;
    assert(isOk, `Tile OpenStreetMap z=16: HTTP ${res.statusCode} (${(res.buffer.length / 1024).toFixed(1)} KB)`);
  } catch (err) {
    assert(false, `Falha ao buscar tile OpenStreetMap: ${err.message}`);
  }

  console.log('\n--- TEST 8: Verificação de Independência Território ON/OFF vs Mapa/Satélite ---');
  // Validando a lógica no HomeMap onde tanto showTerritory quanto activeBaseMap são variáveis ortogonais
  const territoryIndependent = 
    homeMapContent.includes('[showTerritory, mapZoom, activeBaseMap]') &&
    homeMapContent.includes('Território {showTerritory ? \'ON\' : \'OFF\'}');
  assert(territoryIndependent, 'Território ON/OFF é 100% independente do Basemap ativo');

  console.log('\n====================================================');
  console.log(`TOTAL DE TESTES: ${totalTests}`);
  console.log(`TESTES APROVADOS: ${passedTests}`);
  console.log(`STATUS: ${passedTests === totalTests ? 'TODOS OS TESTES PASSARAM COM SUCESSO! ✓' : 'ALGUNS TESTES FALHARAM! ✗'}`);
  console.log('====================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
