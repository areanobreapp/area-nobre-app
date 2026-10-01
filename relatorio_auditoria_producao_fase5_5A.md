# Relatório de Auditoria de Prontidão para Produção — Fase 5.5A
**Projeto:** Área Nobre — Plataforma Imobiliária  
**Data da Auditoria:** Outubro de 2026  
**Natureza da Fase:** Exclusivamente Diagnóstica e Pericial (Sem modificações de código, dependências ou infraestrutura)

---

## Resumo Executivo

A auditoria de prontidão para produção da plataforma **Área Nobre** constatou que o produto atingiu um nível excepcional de maturidade funcional e lógica de negócio. Todas as capacidades essenciais de um marketplace imobiliário de alta performance — autenticação com papéis, gestão de perfis profissionais, isolamento de dados com IDOR protection, motor de Matching V2 com threshold global >=70%, busca por bairros, raio e tempo estimado de carro, basemap híbrido (vetorial e satélite), delimitação de terrenos e apresentação pública compartilhável — estão implementadas, testadas e operando perfeitamente em ambiente de desenvolvimento.

**No entanto, o projeto NÃO pode ser publicado em produção no seu estado atual.** 

Os principais fatores que impedem o Go-Live imediato não residem nas regras de negócio, mas sim em **acoplamentos ao ambiente local de desenvolvimento (localhost/desenvolvedor único)**:
1. **Falha de compilação em build de produção (`next build` / TypeScript TS5097)**: O arquivo `src/lib/auth.ts` contém uma importação com extensão explícita (`import { prisma } from './db.ts'`), que é tolerada em execução dinâmica de desenvolvimento, mas interrompe o processo oficial de build estático do Next.js.
2. **Dependência de Filesystem Local e Efêmero**: As imagens enviadas por corretores são salvas em `public/uploads` no disco rígido do servidor, e o banco de dados é um arquivo SQLite local (`prisma/dev.db`). Em qualquer plataforma de nuvem moderna (serverless como Vercel/AWS Lambda ou contêineres efêmeros), todo arquivo gravado em disco é destruído no próximo deploy ou reciclagem de instância, gerando perda irreversível de mídias e dados.
3. **Concorrência do SQLite**: O SQLite não foi projetado para acesso simultâneo de múltiplos corretores sob conexões HTTP assíncronas concorrentes de produção, sofrendo bloqueios de escrita (*database locked*).
4. **Fragilidades de Segurança de Transporte de Sessão**: Os cookies de autenticação (`areanobre_session`) possuem a flag `secure: false` fixada no código, o que expõe tokens em conexões abertas e pode ser rejeitado por navegadores sob HTTPS. Além disso, existe um botão de login demo público na tela de login que precisa ser condicionado ao ambiente.
5. **Falta de Inicialização do Git e Exclusão no `.gitignore`**: O repositório Git local não está inicializado e o arquivo `.gitignore` atual não ignora o banco SQLite (`prisma/dev.db`) nem as imagens (`public/uploads`), o que geraria vazamento de dados caso fosse feito um commit inicial inadvertido.

A boa notícia técnica é que **a arquitetura de código é limpa, modular e altamente desacoplada**. As interfaces de acesso ao banco (Prisma ORM) e ao roteamento geográfico (GeoBase) já foram construídas prontas para transição direta para PostgreSQL e Object Storage sem reescrever a inteligência da aplicação.

---

## 1. Inventário Técnico Real

A inspeção direta dos arquivos de manifesto, lockfiles e configurações do projeto revelou o seguinte inventário:

| Componente | Especificação Encontrada no Projeto | Arquivo de Evidência |
|---|---|---|
| **Runtime Node.js** | `v24.16.0` (LTS Current) | Ambiente operacional Windows / Winget |
| **Package Manager** | `npm` (Lockfile v3, `package-lock.json` de 53 KB) | `package-lock.json` |
| **Framework Web** | `Next.js 15.1.0` (App Router, Server Components e Route Handlers) | `package.json:18` |
| **Biblioteca de UI** | `React 19.0.0` e `react-dom 19.0.0` | `package.json:20-21` |
| **Linguagem / Tipagem** | `TypeScript 5.0.0` (`@types/node 22.0.0`, `@types/react 19.0.0`) | `package.json:29` |
| **ORM / Data Access** | `Prisma 6.19.3` (`@prisma/client 6.19.3`) | `package.json:13,19` |
| **Banco de Dados Atual**| `SQLite` (`file:./dev.db`) | `prisma/schema.prisma:6-7` |
| **Hash de Senhas** | `bcryptjs 3.0.3` (`@types/bcryptjs 2.4.6`) | `package.json:15,24` |
| **Autenticação / Token**| Nativo Node.js `crypto` (HMAC SHA-256) com Cookie HttpOnly | `src/lib/auth.ts:1,21` |
| **Cartografia / Mapas** | `Leaflet 1.9.4` (`@types/leaflet 1.9.22`) | `package.json:14,16` |
| **Ícones de Interface** | `lucide-react 1.48.0` | `package.json:17` |
| **Geometria / Shapefile**| `shpjs 6.2.0` (em `devDependencies`) | `package.json:28` |
| **Upload / Mídia** | Nativo Node.js (`fs/promises`, `FormData`, `crypto`) | `src/app/api/upload/route.ts` |
| **Motor de Testes** | Scripts autônomos em `.mjs` executados via Node.js (`npm test` aponta para Jest não instalado) | `package.json:10` |

### Scripts Disponíveis no `package.json`
- `"dev": "next dev"` — Executa servidor de desenvolvimento local.
- `"build": "next build"` — Compilação e checagem de tipos de produção.
- `"start": "next start"` — Executa bundle Next.js de produção compilado.
- `"lint": "next lint"` — Validação de regras ESLint do Next.js.
- `"test": "jest"` — *Observação de auditoria: o pacote `jest` não está listado nas dependências. Os testes reais do projeto são suítes Node autônomas como `test-phase5-4-shared-map.mjs`.*

---

## 2. Arquitetura Atual e Fluxo de Execução

```
[ Navegador do Cliente / Corretor ]
        │
        ├── (1) Requisição HTTP / Cookie 'areanobre_session' (HttpOnly, SameSite=Lax)
        ▼
[ Next.js 15 App Router ]
   ├── SSR / Server Components (Ex: src/app/page.tsx, /p/imovel/[publicId])
   │      │
   │      └── Consulta Direta ORM ──┐
   ├── Route Handlers / API REST     │
   │      │ (Ex: /api/properties)   │
   │      └── Verificação de Sessão ┤
   │                                ▼
   │                         [ Prisma Client 6 ]
   │                                │
   │                                ▼
   │                         [ SQLite: dev.db ] (Disco Local)
   │
   ├── Armazenamento de Arquivos (/api/upload)
   │      └── fs.writeFile -> public/uploads/ (Disco Local)
   │
   └── Integrações Server-Side Externas
          ├── GeoBase Mapas API (Forward Geocode, Reverse, CEP, Routing /distance)
          │      └── Cache em memória (routingCache) + Logger em memória (geoLogger)
          └── Provedores de Basemap (Leaflet client-side)
                 ├── OpenStreetMap (Vetor)
                 └── Esri World Imagery (Satélite)
```

### Divisão de Execução
- **Client-Side (Navegador):**
  - Componentes com `'use client'`: `HomeMap.tsx` (Leaflet DOM e renderização de markers), modais de filtro e compartilhamento, formulários de criação/edição e painel do administrador (`src/app/admin/page.tsx`).
  - Armazenamento de preferências no cliente: `localStorage` (`area_nobre_basemap_preference`).
- **Server-Side (SSR & Server Components):**
  - Renderização da Home (`/`), montagem de dados de ofertas ativas compartilhadas da rede.
  - Páginas públicas (`/p/imovel/[publicId]`), resolução de metadados Open Graph dinâmicos para WhatsApp e bots.
- **Route Handlers (API Serverless/Node):**
  - Endpoints em `src/app/api/*` para autenticação, consultas de dados, uploads e proxies de geolocalização.
- **Dependências de Servidor Stateful / Filesystem Persistente:**
  1. `public/uploads`: Armazenamento de fotos de imóveis e avatares diretamente no diretório do projeto.
  2. `prisma/dev.db`: Arquivo SQLite único sofrendo concorrência de leitura e escrita.
  3. `routingCache` e `geoLogger`: Objetos em memória RAM (`Map` e array de logs) que resetam a cada reinício de processo e não são compartilhados em instâncias múltiplas.

---

## 3. Banco de Dados Atual (SQLite & Prisma)

### Arquitetura de Modelos e Entidades
O arquivo `prisma/schema.prisma` define 10 modelos relacionais bem estruturados:
1. `User`: Identidade, hash de senha, papel (`BROKER` | `ADMIN`), status (`ACTIVE` | `INACTIVE`).
2. `BrokerProfile`: Identidade profissional (CRECI, WhatsApp, commercialName, avatarUrl, logoUrl).
3. `Client`: Dados pessoais do comprador/cliente do corretor (nome, telefone, notas).
4. `Property`: Imóveis cadastrados, características, localização, semântica comercial e `publicId`.
5. `PropertyImage`: Fotos de imóveis ordenadas com flag de capa (`isCover`).
6. `Search`: Demandas e critérios de clientes (preço, bairros, raio, tempo de carro, preferências).
7. `Match`: Oportunidades cruzadas entre Buscas e Imóveis/Tipologias com pontuação (0-100%) e explicação detalhada.
8. `Development`: Empreendimentos em lançamento / construção.
9. `DevelopmentImage`: Fotos e plantas do empreendimento.
10. `Typology`: Tipologias e unidades de lançamentos imobiliários.

### Métricas Físicas do Banco Atual (`prisma/dev.db`)
- **Tamanho no disco:** 245.760 bytes (~240 KB).
- **Backups manuais locais identificados no diretório `prisma/`:**
  - `dev.db.bak_phase5` (180 KB)
  - `dev.db.bak_phase5_2` (192 KB)
  - `dev.db.bak_phase5_2_1` (200 KB)
  - `dev.db.bak_phase5_3` (200 KB)
- **Contagem exata de registros em desenvolvimento:**
  - `User`: 8 usuários (Daiane, Administrador, corretores de teste e Márcia Reis).
  - `BrokerProfile`: 8 perfis vinculados.
  - `Client`: 15 clientes cadastrados.
  - `Property`: 14 imóveis.
  - `PropertyImage`: 9 imagens associadas.
  - `Search`: 13 buscas ativas/históricas.
  - `Match`: 32 matches calculados e persistidos.
  - `Development`: 3 empreendimentos.
  - `DevelopmentImage`: 2 imagens.
  - `Typology`: 6 tipologias.

### Campos Estruturados Serializados (JSON como String)
Como o SQLite não possui tipo `Json` nativo no Prisma por padrão, as seguintes colunas foram modeladas como `String` contendo JSON serializado:
- `Search.propertyTypes` (ex: `["Apartamento", "Casa"]`)
- `Search.cities` (ex: `["Criciúma"]`)
- `Search.neighborhoods` (ex: `["Centro", "Comerciário"]`)
- `Search.customPreferences` (objeto JSON livre)
- `Match.explanation` (objeto JSON com pontuação por critério)
- `Property.boundary` (GeoJSON Feature / Polygon em formato texto)

### Histórico de Migrações
- **Não existem migrações formais (`prisma/migrations` está ausente)**.
- Todas as alterações de schema até o momento foram aplicadas utilizando `prisma db push` ou scripts de bootstrap.
- **Risco:** O comando `prisma db push` não gera histórico versionado de alterações DDL, o que impede rollbacks previsíveis em pipelines de CI/CD automatizadas.

---

## 4. Avaliação de Migração Futura: SQLite $\rightarrow$ PostgreSQL

### Compatibilidade do Schema
O schema atual é **100% compatível com PostgreSQL**, necessitando de apenas pequenos ajustes conceituais:
1. **Provider:** Alteração de `provider = "sqlite"` para `provider = "postgresql"` e ajuste da `DATABASE_URL`.
2. **CUIDs:** O Prisma resolve `@default(cuid())` em nível de runtime na biblioteca do cliente Node.js, não dependendo de extensões nativas do banco (diferente de UUIDs de banco que requerem extensões pgcrypto/uuid-ossp).
3. **Valores Monetários (`price Float`):** Em SQLite, `Float` representa precisão dupla. No PostgreSQL, para evitar inconsistências de arredondamento de centavos em imóveis de alto padrão, a boa prática financeira recomenda avaliar no futuro a transição para `Decimal(12, 2)` ou manter `Float` (que mapeia para `DOUBLE PRECISION`) para compatibilidade direta imediata.
4. **Strings JSON:** Podem continuar operando como `String` no PostgreSQL sem quebrar nenhuma linha do código atual, ou serem promovidas para `Json` no Prisma em fase posterior.
5. **Índices de Performance Recomendados:**
   - Adicionar índices explícitos em `Property(responsibleBrokerId)`, `Property(status)`, `Search(responsibleBrokerId)`, `Development(responsibleBrokerId)`.

### Estratégia Recomendada para Preservação dos Dados de Desenvolvimento
Para não perder os imóveis da Daiane, os perfis profissionais cadastrados e os polígonos territoriais:
1. Criar um script Node de exportação simples (`export-data.ts`) que extrai todas as tabelas em ordem topológica de dependência para um arquivo JSON estruturado.
2. Apontar o Prisma para a nova instância PostgreSQL vazia e executar `npx prisma migrate dev --name init`.
3. Executar o script de importação (`import-data.ts`) que insere os registros mantendo exatamente os mesmos IDs primários (`id`), garantindo a preservação das relações, publicIds e hashes de senha.

---

## 5. Autenticação e Sessão

### Mecanismo de Token
- **Biblioteca:** Nativa do Node.js (`crypto.createHmac('sha256', SECRET)`), sem uso de pacotes externos pesados.
- **Assinatura:** `data.signature` codificada em Base64URL.
- **Proteção contra Timing Attacks:** Utiliza `crypto.timingSafeEqual` para comparação de assinaturas criptográficas (`src/lib/auth.ts:31`).
- **Validade do Token:** 7 dias (`exp: Date.now() + 7 * 24 * 60 * 60 * 1000`).

### Vulnerabilidades Identificadas na Configuração de Cookies
Em `src/app/api/auth/login/route.ts` (linhas 114 e 137) e `src/app/api/auth/register/route.ts` (linha 108):
```typescript
response.cookies.set({
  name: COOKIE_NAME,
  value: token,
  httpOnly: true,
  secure: false, // <-- ACHADO CRÍTICO
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60,
});
```
- **Problema:** A diretiva `secure: false` está fixada. Em ambiente de produção com HTTPS, o cookie pode ser transmitido em conexões não criptografadas e não aproveita a garantia estrita do protocolo.
- **Solução Futura:** Substituir por `secure: process.env.NODE_ENV === 'production'`.

### Segredo de Autenticação (`AUTH_SECRET`)
- Em `src/lib/auth.ts:6`: `const SECRET = process.env.AUTH_SECRET || 'area-nobre-secret-key-development-2026';`
- **Risco:** Caso a variável `AUTH_SECRET` não seja preenchida na hospedagem de produção, a aplicação usará a chave de fallback pública conhecida, permitindo a falsificação de tokens de sessão por atacantes.

### Proteção de Páginas e Endpoints
- **SSR e APIs:** Protegidos via chamadas server-side a `getCurrentUser()`. Se o usuário estiver com `status !== 'ACTIVE'`, o acesso é revogado imediatamente em tempo de execução.
- **Área Administrativa:** `src/app/admin/page.tsx` é um componente cliente (`'use client'`) que carrega a interface e depois consulta `/api/admin/users`. Caso o usuário não seja admin, o endpoint bloqueia com 403 e o cliente redireciona. Embora a API proteja os dados, o ideal em produção é adicionar um redirect SSR imediato no Server Component.

---

## 6. Bootstrap do Administrador

A lógica de bootstrap em `src/lib/bootstrap.ts` foi auditada:
- **Conta Alvo:** `areanobreapp@gmail.com`
- **Senha Inicial:** Lê `process.env.INITIAL_ADMIN_PASSWORD` com fallback documentado para desenvolvimento local.
- **Idempotência:** A função verifica primeiro se o usuário existe (`prisma.user.findUnique({ where: { email: adminEmail } })`). Se já existir, ela **não recria o usuário** e **não altera a senha** existente; apenas assegura que o papel é `ADMIN` e o status é `ACTIVE`.
- **Risco Operacional:** A função `runBootstrapMigration()` atualmente não é acionada automaticamente no início do Next.js; ela requer invocação explícita via script. Em produção, deve ser executada como um job de inicialização/seed isolado.

---

## 7. Uploads e Armazenamento de Arquivos

Esta é uma das áreas mais críticas para a viabilidade em produção:

| Aspecto | Implementação Atual | Risco em Produção |
|---|---|---|
| **Destino Físico** | `path.join(process.cwd(), 'public', 'uploads')` | **Bloqueador (P0):** Plataformas serverless (Vercel, AWS Lambda) possuem filesystem efêmero ou somente-leitura. Todo arquivo enviado é perdido no próximo cold start ou redeploy. |
| **Nomeação do Arquivo** | `${crypto.randomBytes(12).toString('hex')}${ext.toLowerCase()}` | Bom isolamento de colisões, sem exposição do nome original. |
| **Validação MIME** | `if (!file.type.startsWith('image/')) continue;` | **Inseguro:** Baseia-se apenas no cabeçalho informado pelo cliente (`Content-Type`), sem inspeção dos *magic bytes* do binário. |
| **Validação de Extensão** | `const ext = path.extname(file.name) \|\| '.jpg';` | **Risco:** Permite extensões arbitrárias (ex: `.svg`, `.html`, `.php`) caso o cliente envie `image/` no tipo MIME. |
| **Limite de Tamanho** | Inexistente em código | Risco de exaustão de memória RAM (*Denial of Service*) ao processar payloads grandes. |
| **Arquivos Órfãos** | Inexistente rotina de limpeza | Ao excluir um imóvel ou foto, o arquivo permanece indefinidamente em disco. |
| **Otimização de Imagens** | Nenhuma (salva o binário bruto enviado) | Fotos de câmeras modernas (10MB+) são servidas diretamente, degradando a velocidade do mapa no mobile. |

---

## 8. Cartografia e Basemaps

A camada de mapas ([src/lib/geo/basemaps.ts](file:///c:/Guilherme/Corretora%20Daiane/Antigravity%20APP%20corretor/src/lib/geo/basemaps.ts)) foi desacoplada com sucesso na Fase 4.3:

1. **Mapa Vetorial (Ruas):**
   - **Provedor:** OpenStreetMap (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`)
   - **Licença / Termos:** Open Database License (ODbL). A política de uso de tiles da OSM Foundation proíbe uso comercial massivo ou aplicações com tráfego intenso sem infraestrutura própria ou provedor terceirizado contratado.
   - **Atribuição:** Exibida corretamente no rodapé do Leaflet (`© OpenStreetMap contributors`).
2. **Mapa de Satélite:**
   - **Provedor Padrão:** Esri World Imagery (ArcGIS Online)
   - **URL:** `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`
   - **Atribuição:** Exibida detalhadamente (`Tiles © Esri — Source: Esri, i-cubed, USDA, USGS...`).
   - **Licença / Termos:** O uso gratuito dos tiles da Esri é restrito a avaliação, prototipação e fins não comerciais. Para um serviço imobiliário comercial com múltiplos corretores e acesso público, a Esri exige uma conta comercial / plano de desenvolvedor ArcGIS.
   - **Alternativa Desacoplada Pronta no Código:** O código já possui suporte desacoplado via `.env` para Mapbox (`NEXT_PUBLIC_MAPBOX_TOKEN`) ou endpoint XYZ customizado (`NEXT_PUBLIC_CUSTOM_SATELLITE_URL`).

---

## 9. Integração com a GeoBase Mapas

A integração com a GeoBase Mapas foi auditada em `src/lib/geo/geobase-provider.ts` e `src/lib/geo/routing.ts`:

- **Variável de Ambiente:** `GEOBASE_API_KEY` (privada, executada estritamente no backend Node.js; **nunca exposta ao navegador**).
- **Operações Utilizadas:**
  1. Geocodificação Direta (`/forward?q=...`)
  2. Geocodificação Reversa (`/reverse?lat=...&lon=...`)
  3. Consulta de CEP (`/cep/{cep}`)
  4. Roteamento Ponto a Ponto de Carro (`/routing/distance?origin_lat=...&origin_lon=...&dest_lat=...&dest_lon=...`)
- **Esclarecimento de Nomenclatura (Roteamento vs Isócronas):**
  - **Confirmação Técnica:** O código **NÃO utiliza isócronas** (não calcula polígonos de contorno nem geometrias complexas de tempo).
  - A implementação real é **Roteamento Ponto a Ponto na Rede Viária (Driving Car Routing)**. O sistema pré-filtra os imóveis usando um cálculo trigonométrico local ultra-rápido (Haversine) para descartar distâncias fisicamente impossíveis e só depois consulta o tempo real de tráfego na GeoBase para os candidatos plausíveis.
- **Cache e Otimização:** O arquivo `routing.ts` implementa um cache em memória (`routingCache`) indexado pelas coordenadas de origem e destino, evitando chamadas duplicadas para o mesmo trajeto.
- **Tratamento de Falhas e Timeout:**
  - Se a GeoBase retornar erro ou estiver fora do ar, o sistema não quebra: ele registra o erro no logger interno e retorna `success: false`, tratando a pontuação de tempo de carro como não atendida sem derrubar a tela do corretor.
  - *Oportunidade de melhoria:* Adicionar um `AbortController` com timeout explícito (ex: 5 segundos) no `fetch()` para evitar conexões presas caso a API externa sofra degradação de resposta.

---

## 10. Mapa Compartilhado, Multiusuário e IDOR

A auditoria confirmou que as salvaguardas da Fase 5.4 e de seu ajuste final estão sólidas:
- **Escopos:** `?scope=shared` (Home/Mapa) consulta a base de corretores com `status === 'ACTIVE'`. O modo `?scope=mine` (Painel) restringe estritamente a `responsibleBrokerId === session.userId`.
- **Sanitização de Ofertas de Terceiros:** Quando Daiane visualiza um imóvel da Márcia (e vice-versa), os campos `internalNotes`, `exchangeNotes`, `registryNumber` e `boundary` são forçados a `null` pelo backend.
- **Proteção contra IDOR (Insecure Direct Object Reference):**
  - Todas as operações de mutação (`PUT /api/properties/[id]`, `DELETE`, `PUT /api/developments/[id]`, `PUT /api/searches/[id]`) conferem se `responsibleBrokerId === session.userId` ou se o usuário é `ADMIN`.
  - Tentativas de alteração cruzada retornam `403 Forbidden`. Não foram identificadas brechas de escalada de privilégios entre corretores.
- **Usuários Inativos:** Se um corretor tiver `status = 'INACTIVE'`, a função `getCurrentUser()` bloqueia sua sessão imediatamente e suas ofertas deixam de ser incluídas nas queries compartilhadas.

---

## 11. Buscas e Proteção de Dados Pessoais (LGPD)

### Dados Coletados e Armazenados
- Na tabela `Client`: Nome do cliente, telefone, e-mail e notas pessoais da negociação.
- Na tabela `Search`: Critérios de compra, limites de preço, endereço de referência para tempo de carro e notas.

### Isolamento e Exposição
- **Isolamento Total:** Apenas o corretor responsável (`responsibleBrokerId`) consegue listar suas buscas e visualizar os dados de seus clientes.
- **Comportamento no Matching Compartilhado:** Quando um imóvel da Daiane dá Match com uma Busca da Márcia:
  - Daiane **NÃO** tem acesso ao nome, telefone ou identidade do cliente da Márcia.
  - Daiane visualiza apenas o percentual de compatibilidade e os critérios imobiliários do imóvel.
  - Márcia preserva total sigilo sobre sua carteira de compradores.
- **Recomendação de Privacidade:** Antes da abertura pública massiva, formalizar os Termos de Uso e Política de Privacidade da plataforma em conformidade com a LGPD (Lei 13.709/2018).

---

## 12. Páginas Públicas e Compartilhamento (/p/imovel/[publicId])

- **Entropia do Identificador:** O `publicId` é gerado via `crypto.randomBytes(8)` a partir de um alfabeto de 56 caracteres não ambíguos, gerando identificadores não sequenciais e impossíveis de enumerar por varredura (*anti-scraping*).
- **Controle de Exibição de Localização:**
  - `EXACT`: Exibe endereço completo e pin exato.
  - `APPROXIMATE`: Oculta rua, número e CEP; calcula e exibe apenas o centróide territorial do bairro.
  - `HIDDEN`: Oculta completamente o mapa e dados geográficos precisos.
- **Desativação / Revogação:** Se o imóvel for despublicado (`isPublic: false`) ou o corretor desativado (`status: INACTIVE`), a página renderiza uma tela neutra e elegante (`PublicRevokedView`), impedindo o vazamento de dados.
- **Robots / Indexação:** A página pública injeta `<meta name="robots" content="noindex, nofollow" />`, garantindo que links compartilhados no WhatsApp não sejam indexados pelo Google sem autorização prévia.

---

## 13. Open Graph e Imagens no WhatsApp

- **Geração de Metadados:** Implementada via `generateMetadata()` em `src/app/p/imovel/[publicId]/page.tsx`.
- **Fragilidade Identificada:**
  - O crawler do WhatsApp exige que a imagem de prévia (`og:image`) seja uma **URL absoluta com protocolo HTTPS** (ex: `https://areanobre.com.br/uploads/foto.jpg`).
  - Atualmente, as imagens locais são armazenadas como caminhos relativos (`/uploads/foto.jpg`). Se a URL base não for concatenada com `getAppBaseUrl()`, o card do WhatsApp aparecerá sem foto.
  - Além disso, a variável `APP_PUBLIC_URL` precisa estar configurada no servidor para que o domínio de produção substitua o fallback de `http://localhost:3000`.

---

## 14. Inventário de Variáveis de Ambiente e Segredos

| Nome da Variável | Escopo | Obrigatória em Produção? | Descrição |
|---|---|---|---|
| `DATABASE_URL` | Privada (Server) | **Sim (P0)** | String de conexão com o banco de dados (ex: PostgreSQL). |
| `AUTH_SECRET` | Privada (Server) | **Sim (P0)** | Chave criptográfica para assinatura de cookies HMAC-SHA256. |
| `GEOBASE_API_KEY` | Privada (Server) | **Sim (P1)** | Chave de autenticação da API GeoBase Mapas. |
| `GEOBASE_BASE_URL` | Privada (Server) | Opcional | Endpoint customizado da GeoBase (default: oficial). |
| `APP_PUBLIC_URL` | Privada/Pública | **Sim (P1)** | URL base do domínio público HTTPS para links e Open Graph. |
| `NEXT_PUBLIC_APP_URL` | Pública (Client) | Opcional | Espelho de `APP_PUBLIC_URL` acessível no navegador. |
| `INITIAL_ADMIN_PASSWORD` | Privada (Server) | **Sim (P1)** | Senha forte inicial para provisionamento do primeiro ADMIN. |
| `NEXT_PUBLIC_SATELLITE_PROVIDER` | Pública (Client) | Opcional | Provedor do satélite (`esri`, `mapbox` ou `custom`). |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Pública (Client) | Opcional | Token de acesso Mapbox caso seja selecionado. |
| `DAIANE_WHATSAPP_PHONE` | Privada (Server) | Opcional | Fallback de telefone caso o perfil não possua número. |

> [!CAUTION]
> **Segredos no Código / Fallbacks:**
> Foi identificado no código o fallback `area-nobre-secret-key-development-2026` em `auth.ts` e `AdminAreaNobre2026!` em `bootstrap.ts`. Em produção, a aplicação deve falhar a inicialização caso `AUTH_SECRET` e `DATABASE_URL` não sejam explicitamente fornecidos no ambiente.

---

## 15. Auditoria de Git e Repositório Local

- **Estado Atual:** O diretório do projeto **não é um repositório Git inicializado** (`fatal: not a git repository`).
- **Auditoria do `.gitignore`:**
  - O arquivo `.gitignore` atual ignora `node_modules`, `.next`, `.env`, logs e temporários.
  - **OMISSÃO GRAVE NO `.gitignore`:** O arquivo **NÃO ignora `prisma/*.db` nem `public/uploads/`**.
  - **Ação Imediata antes de `git init`:** É indispensável adicionar `prisma/*.db*` e `public/uploads/*` ao `.gitignore` para evitar que dados reais de clientes, senhas e fotos locais sejam enviados para um repositório remoto público ou privado no GitHub.

---

## 16. Logs e Exposição de Dados Sensíveis

- **Console Logs:** As mensagens de log no backend utilizam `console.log` e `console.error` convencionais.
- **Sanitização no `GeoLogger`:** O logger geográfico em `src/lib/geo/logger.ts` possui rotina de sanitização automática (`sanitizeQuery`) que substitui e-mails, telefones e strings hexadecimais longas por tokens mascarados (`[EMAIL]`, `[PHONE]`, `[KEY]`).
- **Risco em Produção:** Exceções não tratadas em Route Handlers podem eventualmente imprimir detalhes de queries Prisma no terminal do servidor. Recomenda-se desabilitar logs de debug em `NODE_ENV === 'production'`.

---

## 17. Observabilidade e Tratamento de Erros

- **Error Boundaries:** A pasta `src/app` **não possui** arquivos `error.tsx`, `global-error.tsx` ou `not-found.tsx`. Em caso de erro não capturado no SSR, o Next.js exibe a tela de erro padrão do framework.
- **Monitoramento:** Não há APM (Application Performance Monitoring) ou serviço de captura de exceções (como Sentry) configurado.
- **Health Check:** Não existe rota `/api/health` para monitoramento de *liveness/readiness* por balanceadores de carga.

---

## 18. Rate Limiting e Proteção contra Abuso

- **Estado Atual:** **Inexistente em todas as rotas.**
- **Pontos Vulneráveis:**
  1. `/api/auth/login`: Vulnerável a ataques de força bruta / credential stuffing.
  2. `/api/auth/register`: Vulnerável à criação automatizada de contas por bots.
  3. `/api/upload`: Vulnerável a preenchimento malicioso do disco de armazenamento.
  4. `/api/geo/routing` e `/api/geo/geocode`: Vulnerável a consumo indevido da cota de créditos da conta GeoBase.

---

## 19. Recuperação de Senha e E-mails Transacionais

- **Estado Atual:** **Inexistente.**
- Não há fluxo de esqueci minha senha, tokens com tempo de expiração ou serviço transacional (Resend, SendGrid, Postmark, SES).
- **Mitigação Atual:** O Administrador da Área Nobre tem a capacidade de redefinir senhas manualmente através do painel `/admin`. Para um piloto fechado com Daiane e Márcia, isso é suficiente; para escala comercial, a recuperação autônoma de senha é necessária.

---

## 20. Backup e Recuperação de Desastres

- **Estado Atual:** Inexistente de forma automatizada; existem apenas cópias estáticas de arquivo (`dev.db.bak_*`).
- **Requisitos de Produção:**
  - Backup diário automatizado do PostgreSQL com retenção de pelo menos 7 a 30 dias.
  - Habilitação de Point-in-Time Recovery (PITR) no banco gerenciado.
  - Versionamento de buckets de mídia no Object Storage para proteção contra exclusão acidental.

---

## 21. Isolamento de Ambientes (Dev vs Prod)

Atualmente não há separação de ambientes no projeto:
- O mesmo arquivo `.env` controla toda a execução.
- Em produção, será necessário manter bases separadas:
  - Banco de Produção (PostgreSQL em nuvem) vs Banco de Staging/Testes.
  - Bucket de Produção vs Bucket de Testes.
  - `AUTH_SECRET` de alta entropia exclusivo de produção.

---

## 22. Dependência de URLs e Domínio

- A aplicação possui suporte à resolução de URLs em `src/lib/public-sharing.ts:36-44`, priorizando `APP_PUBLIC_URL` e `NEXT_PUBLIC_APP_URL`.
- O fallback `http://localhost:3000` entra em ação se as variáveis não estiverem definidas.
- Nenhum outro endpoint possui URLs de host hardcoded.

---

## 23. Build e Execução de Produção

Durante a auditoria, executou-se a verificação de compilação estrita (`next build` / `tsc --noEmit`), que resultou em:

```
Failed to compile.
./src/lib/auth.ts:3:24
Type error: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

  1 | import crypto from 'crypto';
  2 | import bcrypt from 'bcryptjs';
> 3 | import { prisma } from './db.ts';
    |                        ^
```
- **Causa:** O compilador TypeScript do Next.js 15 em modo estrito proíbe extensões `.ts` em importações relativas (`./db.ts`), exigindo a omissão da extensão (`./db`).
- **Impacto:** O comando de build de produção falha até que essa linha seja ajustada.

---

## 24. Auditoria de Dependências e Vulnerabilidades

A execução de auditoria do npm (`npm audit`) detectou **5 vulnerabilidades** (1 moderada, 4 altas) herdadas de pacotes transitivos:
1. `deepmerge-ts <8.0.0` (Alta): Dependência transitiva de `@prisma/config` / `prisma 6.19.3` (risco de exaustão de pilha em objetos recursivos).
2. `postcss <=8.5.22` (Alta): Dependência transitiva do `next 15.1.0` (relacionada a sanitização de source maps).

Nenhuma das dependências diretas de produção apresenta vulnerabilidade crítica imediata explorável no contexto atual do código, mas recomenda-se acompanhar as atualizações estáveis de patch do Next.js e Prisma.

---

## 25. Requisitos de Infraestrutura para Produção

Um ambiente de produção funcional para a Área Nobre precisará atender aos seguintes requisitos técnicos:
1. **Ambiente de Execução Next.js:** Suporte a Node.js 20+ ou 24 LTS, com capacidade de Server-Side Rendering (SSR) e Route Handlers.
2. **PostgreSQL 15+ Persistente:** Com suporte a pool de conexões (essencial se o Next.js for hospedado em arquitetura serverless para não esgotar as conexões máximas do banco).
3. **Object Storage S3-Compatible:** Com distribuição pública via CDN (Cloudflare, CloudFront ou similar) e entrega de imagens otimizadas com cabeçalhos de cache longos (`Cache-Control: max-age=31536000, immutable`).
4. **HTTPS Obrigatório:** Certificado SSL/TLS válido para funcionamento seguro dos cookies de sessão e compatibilidade com APIs mobile.
5. **Gerenciador de Variáveis de Ambiente:** Armazenamento seguro de segredos criptográficos sem versionamento em código.

---

## 26. Mapeamento de Custos e Serviços Externos

| Serviço | Provedor / Cenário | Modelo de Custo Estimado |
|---|---|---|
| **Hospedagem da Aplicação** | Vercel, Railway ou Render | Nível gratuito disponível para pilotos; planos Pro a partir de US$ 5 a US$ 20/mês dependendo do tráfego. |
| **Banco de Dados PostgreSQL** | Supabase, Neon ou Railway | Nível gratuito disponível (Supabase/Neon); planos pagos a partir de US$ 5 a US$ 25/mês. |
| **Armazenamento de Imagens** | Cloudflare R2 ou AWS S3 | Cloudflare R2 oferece 10 GB gratuitos e **zero taxa de tráfego de saída (egress)**; custo praticamente nulo no início. |
| **API GeoBase Mapas** | GeoBase | Depende do plano contratado diretamente pela corretora (chamadas de routing/geocoding). |
| **Basemap Satélite** | Esri (ArcGIS) ou Mapbox | Depende do plano comercial escolhido caso exceda as cotas de avaliação. |
| **Domínio Próprio** | Registro.br | R$ 40,00 / ano para domínios `.com.br`. |
| **E-mails Transacionais** | Resend ou AWS SES | Até 3.000 e-mails/mês gratuitos no Resend; centavos no AWS SES. |

---

## 27. Classificação Consolidada de Riscos

### P0 — Bloqueadores de Produção (Impedem o Go-Live)
1. **Erro de Build TypeScript (TS5097):** `src/lib/auth.ts:3` importa `./db.ts` com extensão explícita, quebrando o `next build`.
2. **Filesystem Local para Uploads (`public/uploads`):** Destruição de imagens a cada deploy em ambientes serverless/efêmeros.
3. **Persistência em SQLite Local:** Bloqueios de escrita concorrente e ausência de persistência distribuída.
4. **Cookie Inseguro (`secure: false`):** Cookies de sessão sem a flag `secure` em produção HTTPS.
5. **Git Não Inicializado e `.gitignore` Incompleto:** Risco de commit inadvertido do banco SQLite e de mídias de clientes.

### P1 — Necessário antes dos Primeiros Usuários Reais
1. **Botão de Login Demo Público:** Atalho de preenchimento de credenciais da Daiane na tela de login (`/login`).
2. **URLs Relativas no Open Graph:** Metadados `og:image` de páginas públicas sem URL absoluta para visualização no WhatsApp.
3. **Ausência de Rate Limiting:** Risco de força bruta na autenticação e esgotamento da cota GeoBase.
4. **Validação de Upload Apenas por Cabeçalho:** Falta de checagem de tamanho máximo e inspeção de magic-bytes.
5. **Ausência de Backups Automatizados do Banco.**

### P2 — Pode ser Resolvido Logo Após Início Controlado
1. **Falta de Error Boundaries (`error.tsx`, `not-found.tsx`).**
2. **In-Memory Caches Efêmeros (Routing Cache / GeoLogger).**
3. **Falta de Índices de Foreign Key em `Property(responsibleBrokerId)`.**
4. **Ausência de Endpoint de Health Check (`/api/health`).**

### P3 — Evolução Futura
1. **Recuperação Autônoma de Senha por E-mail Transacional.**
2. **Migração de Colunas Serializadas para o Tipo Nativo `Json` do PostgreSQL.**
3. **Transição de `Float` para `Decimal` em Preços.**
4. **Integração com Ferramenta de Monitoramento de Exceções (Sentry).**

---

## 28. Matriz Go-Live

| Área | Estado Atual | Nível de Risco | Necessário antes de Produção? | Ação Técnica Recomendada |
|---|---|---|---|---|
| **Aplicação (Build)** | Erro TS5097 em `auth.ts` | **P0 (Crítico)** | **SIM** | Remover extensão `.ts` da importação de `./db`. |
| **Banco de Dados** | SQLite local (`dev.db`) | **P0 (Crítico)** | **SIM** | Provisionar PostgreSQL gerenciado e migrar dados. |
| **Uploads / Arquivos**| Gravação local em `public/uploads` | **P0 (Crítico)** | **SIM** | Integrar SDK de Object Storage S3-compatible (ex: Cloudflare R2 / S3). |
| **Cookies de Sessão** | `secure: false` hardcoded | **P0 (Crítico)** | **SIM** | Alterar para `secure: process.env.NODE_ENV === 'production'`. |
| **Git / Repositório** | Git não inicializado; `.gitignore` sem `dev.db` | **P0 (Crítico)** | **SIM** | Atualizar `.gitignore` e inicializar repositório Git. |
| **Segredos (Secrets)** | Chaves de fallback expostas em código | **P1 (Alto)** | **SIM** | Configurar variáveis de ambiente na hospedagem e bloquear inicialização sem chaves. |
| **Páginas Públicas** | URLs relativas no `og:image` | **P1 (Alto)** | **SIM** | Concatenar URL absoluta do domínio público nas tags Open Graph. |
| **Tela de Login** | Botão Demo público visível | **P1 (Alto)** | **SIM** | Condicionar exibição do botão a ambiente não-produtivo. |
| **Rate Limiting** | Inexistente | **P1 (Alto)** | **SIM** | Implementar rate limiting em rotas de auth e upload. |
| **GeoBase** | Roteamento e geocode funcionais | **P2 (Médio)** | NÃO | Adicionar timeout explícito no fetch e manter cache. |
| **Mapas / Basemaps** | OSM + Esri gratuitos em dev | **P2 (Médio)** | NÃO | Manter para piloto; avaliar licença comercial da Esri ou Mapbox para escala. |
| **E-mail / Senha** | Sem e-mail; reset manual via Admin | **P2 (Médio)** | NÃO (Para piloto) | Manter suporte via Admin no piloto; adicionar Resend em fase posterior. |
| **Observabilidade** | Console logs simples | **P2 (Médio)** | NÃO | Adicionar `/api/health` e páginas de erro customizadas (`error.tsx`). |
| **Privacidade / LGPD**| Isolamento de dados aprovado | **P2 (Médio)** | NÃO (Para piloto) | Elaborar Termos de Uso e Política de Privacidade antes da abertura pública. |

---

## 29. Alternativas de Arquitetura de Produção

Avaliamos 3 caminhos viáveis e modernos para hospedar a Área Nobre:

### Alternativa 1: Serverless PaaS Moderna (Vercel + Supabase/Neon + Cloudflare R2)
- **Aplicação:** Vercel (Edge Network + Serverless Functions Next.js nativas).
- **Banco de Dados:** Supabase PostgreSQL ou Neon (PostgreSQL gerenciado com pooler PgBouncer).
- **Armazenamento:** Cloudflare R2 (compatível com S3, sem taxas de tráfego de saída).
- **Domínio / SSL:** Gerenciado automaticamente pela Vercel com CDN global.
- **Vantagens:** Deploy contínuo a cada commit no Git, escalabilidade instantânea, zero gerenciamento de servidor Linux, certificados HTTPS automáticos, custo inicial zero/mínimo.
- **Desvantagens:** Requer adequar o handler de upload para enviar diretamente ao R2/S3 (não permite escrita em disco).
- **Adequação:** **Altíssima (Padrão ouro para Next.js).**

### Alternativa 2: Contêiner Gerenciado em PaaS (Railway ou Render)
- **Aplicação:** Railway / Render executando contêiner Node.js (`npm run start`).
- **Banco de Dados:** PostgreSQL Addon gerenciado na própria plataforma Railway/Render.
- **Armazenamento:** Cloudflare R2 ou AWS S3.
- **Vantagens:** Processo Node.js persistente e contínuo (o cache em memória `routingCache` e logs permanecem estáveis entre requisições), simplicidade de ter aplicação e banco no mesmo painel, preços fixos previsíveis.
- **Desvantagens:** Pouco menos otimizado para SSR global do que a rede de borda da Vercel; requer pagamento fixo mensal (~US$ 10 a US$ 20/mês).
- **Adequação:** **Muito Alta (Excelente para controle e previsibilidade).**

### Alternativa 3: VPS Própria Linux (Ubuntu + Docker Compose / Coolify + PostgreSQL)
- **Aplicação:** Servidor dedicado em nuvem (Hetzner, DigitalOcean ou AWS EC2) com Docker ou Coolify.
- **Banco de Dados:** Contêiner PostgreSQL local ou gerenciado.
- **Armazenamento:** MinIO local ou S3/R2 externo.
- **Vantagens:** Custo mínimo de computação, controle total da infraestrutura, banco e arquivos no mesmo servidor se desejado.
- **Desvantagens:** Alta carga operacional de manutenção (atualizações de SO, renovação de certificados SSL via Certbot, configuração manual de backups, monitoramento de disco e segurança).
- **Adequação:** **Baixa no momento (Complexidade desnecessária para o estágio atual).**

---

## 30. Respostas Objetivas Finais

### A. O projeto pode ser colocado em produção exatamente como está hoje? Por quê?
**Não.** O projeto quebrará no deploy pelos seguintes motivos técnicos imediatos:
1. O comando oficial de build de produção (`next build`) falha devido ao erro de tipo TypeScript TS5097 na importação de `./db.ts` em `src/lib/auth.ts`.
2. As imagens salvas localmente em `public/uploads` e o banco SQLite em `prisma/dev.db` serão destruídos e resetados a cada novo deploy ou reinício de contêiner em qualquer provedor de nuvem moderno.
3. Os cookies de autenticação estão configurados com `secure: false`, violando os padrões de segurança de transporte em HTTPS.

### B. Quais são os bloqueadores reais?
Os bloqueadores reais e inegociáveis (P0) são:
- Correção da importação no arquivo de autenticação para permitir compilação com sucesso (`next build`).
- Provisionamento de um banco de dados persistente multiusuário (PostgreSQL).
- Implementação de armazenamento de mídias em nuvem (Object Storage S3-compatible) para substituir o salvamento em disco local.
- Configuração do cookie de autenticação com a diretiva `secure: true` para ambiente de produção.
- Atualização do arquivo `.gitignore` para blindar o banco local e uploads antes de qualquer commit no Git.

### C. O que pode permanecer temporariamente como está para um piloto apenas com Daiane e Márcia?
Para uma operação assistida e controlada exclusivamente entre Daiane e Márcia:
- **Mapas e Basemaps:** Os tiles gratuitos do OpenStreetMap e Esri World Imagery podem ser mantidos sem contratação de plano comercial.
- **GeoBase:** O roteamento Ponto a Ponto de carro atual com pré-filtro Haversine e cache em memória atende com folga o volume das duas corretoras.
- **Recuperação de Senhas:** Não é necessário criar envio de e-mails transacionais agora; eventuais redefinições de senha podem ser feitas pelo Administrador no painel `/admin`.
- **Campos JSON serializados:** Podem permanecer como strings no PostgreSQL sem necessidade de reestruturação de schema.

### D. Quais decisões de infraestrutura precisam ser tomadas por nós antes de qualquer implementação?
Vocês precisam decidir:
1. **Modelo de Hospedagem da Aplicação:** Preferem a agilidade serverless da **Vercel** ou a simplicidade e previsibilidade de contêiner da **Railway/Render**?
2. **Provedor do Banco PostgreSQL:** Utilizarão **Supabase** (que inclui painel de dados e storage integrados), **Neon** ou o banco gerenciado da própria plataforma de hosting?
3. **Provedor de Armazenamento de Fotos:** **Cloudflare R2** (recomendado por custo zero de tráfego) ou o Storage do Supabase?
4. **Domínio:** Qual domínio oficial será apontado para a plataforma (ex: `areanobre.com.br` ou subdomínio)?

### E. Qual seria a ordem tecnicamente mais segura de implementação após aprovação?
Após a tomada de decisão das questões acima, a sequência de execução recomendada é:
1. **Passo 1 (Higiene de Código & Git):** Ajustar o `.gitignore`, corrigir a importação de `./db` em `auth.ts`, condicionar `secure: true` nos cookies em produção e inicializar o repositório Git local.
2. **Passo 2 (Banco de Dados PostgreSQL):** Provisionar a instância PostgreSQL, executar a migração inicial do Prisma e rodar o script de importação preservando integralmente os dados de Daiane e Márcia.
3. **Passo 3 (Storage de Fotos em Nuvem):** Adaptar o handler `/api/upload` para enviar fotos diretamente ao bucket S3/R2 e validar a exibição de URLs absolutas no WhatsApp e páginas públicas.
4. **Passo 4 (Configuração de Ambiente & Deploy de Staging):** Configurar as variáveis de ambiente de produção (`DATABASE_URL`, `AUTH_SECRET`, `GEOBASE_API_KEY`, `APP_PUBLIC_URL`), desativar o botão de demo e realizar o primeiro deploy em URL de homologação.
5. **Passo 5 (Homologação Final & Apontamento de Domínio):** Testar o fluxo completo de ponta a ponta na nuvem (login, cadastro, mapa compartilhado, upload, matching e páginas públicas) e realizar o chaveamento do domínio definitivo.

---
*Fim da Auditoria da Fase 5.5A. Nenhuma alteração foi realizada no código-fonte ou no banco de dados. O sistema permanece no seu estado original aguardando as deliberações da equipe.*
