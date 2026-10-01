# RELATÓRIO FASE 5.5B — PREPARAÇÃO PARA PRODUÇÃO E HOMOLOGAÇÃO
**Projeto:** Área Nobre — Plataforma de Oportunidades Imobiliárias  
**Data:** 01/10/2026  
**Status da Execução:** **FASE 5.5B PAUSADA — AGUARDANDO CONFIGURAÇÃO EXTERNA**

---

## 1. RESUMO EXECUTIVO

Em conformidade com a auditoria prévia da Fase 5.5A e com a arquitetura aprovada (Next.js na Vercel + Supabase PostgreSQL + Supabase Storage + GitHub Privado + Autenticação Própria JWT/bcrypt + GeoBase server-side), foram executadas integralmente todas as etapas locais de higiene, resolução de bloqueadores de build, segurança de cookies e isolamento, arquitetura de storage e migrações versionadas.

A fase atinge neste momento o **Checkpoint Humano (Seções 2, 20, 21 e 28)**, no qual é necessária a intervenção do usuário para provisionamento das contas externas (GitHub, Supabase e Vercel), sem exposição de secrets ou credenciais.

---

## 2. CHECKPOINT INICIAL & BACKUP DOS DADOS LOCAIS (PRÉ-ALTERAÇÃO)

Antes de qualquer alteração de código ou infraestrutura, foi executado o script de inventário e contingência ([scratch/inventory-and-backup.mjs](file:///c:/Guilherme/Corretora%20Daiane/Antigravity%20APP%20corretor/scratch/inventory-and-backup.mjs)), gerando backup seguro não versionado na pasta `backups/pre-phase5-5b/`:

- **Banco SQLite Original:** `dev.db` (245.760 bytes) copiado com integridade para `backups/pre-phase5-5b/dev.db`.
- **Inventário Estruturado:** Exportado em `backups/pre-phase5-5b/inventory.json`.
- **Mídias Locais em Disco:** 3 arquivos em `public/uploads/` inventariados com hashes SHA256 e copiados para `backups/pre-phase5-5b/uploads/`.
- **Contabilização de Registros de Origem:**
  - Usuários (`User`): 8
  - Perfis Profissionais (`BrokerProfile`): 8
  - Clientes (`Client`): 15
  - Imóveis (`Property`): 14
    - Imóveis com Coordenadas: 12
    - Imóveis com Boundaries Poligonais: 5
    - Imóveis com PublicId Único: 4
  - Imagens de Imóveis (`PropertyImage`): 9
  - Empreendimentos (`Development`): 3 (todos com coordenadas)
  - Imagens de Empreendimentos (`DevelopmentImage`): 2
  - Tipologias (`Typology`): 6
  - Buscas Salvas (`Search`): 13
  - Matches (`Match`): 32
- **Identificação de Usuários Chave:**
  - Daiane Corrêa (`demo@areanobre.local` e `daiane.teste.662169@areanobre.test`) — BROKER, ACTIVE.
  - Administrador Área Nobre (`areanobreapp@gmail.com`) — ADMIN, ACTIVE.
  - Marcia Reis (`marciaereis@gmail.com` e `marciaereis65@gmail.com`) — BROKER, ACTIVE.
  - Márcia Silveira Teste (`marcia.teste.662169@areanobre.test`) — BROKER, INACTIVE (teste de inativação).

---

## 3. HIGIENE DE GIT E PRIMEIRO COMMIT SEGURO

1. **Correção Rígida do [.gitignore](file:///c:/Guilherme/Corretora%20Daiane/Antigravity%20APP%20corretor/.gitignore):**
   - Bloqueio estrito de arquivos de ambiente: `.env`, `.env.local`, `.env.*.local`, `*.pem`, `*.key`.
   - Bloqueio estrito de bancos SQLite locais: `prisma/*.db`, `prisma/*.db-journal`, `*.db`, `*.sqlite`.
   - Bloqueio estrito de uploads locais: `public/uploads/*` (mantendo apenas o arquivo `.gitkeep` para persistir a estrutura).
   - Bloqueio estrito de backups locais: `backups/`, `*.bak`, `*.backup`, `scratch/`, `logs/`.
2. **Auditoria Pré-Commit:**
   - Comandos `git status` e `git diff --cached --name-only` auditados minuciosamente.
   - Confirmado: nenhum banco de dados, nenhuma credencial e nenhum arquivo de mídia privada foi incluído na área de stage.
3. **Inicialização do Repositório Git:**
   - Ramo padrão definido como `main`.
   - Commit inicial estruturado: `5fff975 chore(hygiene): inicializacao git, ajuste de build, cookies seguros e higiene de producao`.

---

## 4. RESOLUÇÃO DE BLOQUEADORES DE BUILD & TYPECHECK

1. **Correção de Importação TypeScript:**
   - Em [src/lib/auth.ts](file:///c:/Guilherme/Corretora%20Daiane/Antigravity%20APP%20corretor/src/lib/auth.ts), a linha `import { prisma } from './db.ts';` foi corrigida para `import { prisma } from './db';`.
   - Verificadas todas as outras importações no repositório; nenhuma outra extensão `.ts`/`.tsx` indevida persistia.
2. **Typecheck Limpo:**
   - Execução de `tsc --noEmit` completada com **0 erros**.
3. **Build de Produção Next.js:**
   - Execução de `next build` com sucesso em 4.3 segundos.
   - Todas as 28 rotas (estáticas e dinâmicas) foram geradas e compiladas perfeitamente, incluindo as páginas de apresentação pública `/p/imovel/[publicId]`, rotas administrativas `/admin`, autenticação e mapas.

---

## 5. SEGURANÇA DE COOKIES E REMOÇÃO DA EXPERIÊNCIA DEMO EM PRODUÇÃO

1. **Cookies de Sessão Seguros:**
   - Em [src/app/api/auth/login/route.ts](file:///c:/Guilherme/Corretora%20Daiane/Antigravity%20APP%20corretor/src/app/api/auth/login/route.ts) e [src/app/api/auth/register/route.ts](file:///c:/Guilherme/Corretora%20Daiane/Antigravity%20APP%20corretor/src/app/api/auth/register/route.ts), o atributo `secure: false` foi substituído por:
     ```ts
     secure: process.env.NODE_ENV === 'production'
     ```
   - Mantidos rigorosamente: `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, `maxAge: 7 dias`.
   - Comportamento em desenvolvimento: suporta HTTP (`localhost:3000`).
   - Comportamento em produção/homologação: exige estritamente HTTPS.
2. **Remoção de Bypass Demo na Produção:**
   - O botão "Entrar como Daiane (Demo)" e o facilitador de preenchimento automático foram condicionados a `{process.env.NODE_ENV !== 'production' && (...)}` em [src/app/login/page.tsx](file:///c:/Guilherme/Corretora%20Daiane/Antigravity%20APP%20corretor/src/app/login/page.tsx). Em produção, a tela exibe exclusivamente os campos profissionais de e-mail e senha.
   - Na API de login ([src/app/api/auth/login/route.ts](file:///c:/Guilherme/Corretora%20Daiane/Antigravity%20APP%20corretor/src/app/api/auth/login/route.ts)), se uma requisição tentar enviar `isDemo=true` ou `?demo=1` em ambiente de produção (`NODE_ENV === 'production'`), ela é rejeitada imediatamente com HTTP 403 Forbidden ("Acesso demonstrativo desativado em produção").
   - Preservada a invalidação imediata de contas `INACTIVE`.

---

## 6. ARQUITETURA DE STORAGE (SUPABASE STORAGE) & UPLOAD SEGURO

1. **Módulo de Storage Unificado ([src/lib/storage.ts](file:///c:/Guilherme/Corretora%20Daiane/Antigravity%20APP%20corretor/src/lib/storage.ts)):**
   - Integração com `@supabase/supabase-js`.
   - Organização hierárquica e determinística dos arquivos:
     - `properties/{propertyId}/{uuid}.jpg`
     - `developments/{developmentId}/{uuid}.jpg`
     - `profiles/{userId}/avatar/{uuid}.jpg`
     - `profiles/{userId}/logo/{uuid}.jpg`
     - `uploads/{userId}/{uuid}.jpg` (fallback geral autenticado)
   - Fallback gracioso: quando `SUPABASE_URL` ou chaves não estão configuradas (desenvolvimento local offline), o sistema grava localmente em `public/uploads/` sem falhas.
2. **Segurança Server-Side nos Uploads ([src/app/api/upload/route.ts](file:///c:/Guilherme/Corretora%20Daiane/Antigravity%20APP%20corretor/src/app/api/upload/route.ts)):**
   - **Validação de Magic Bytes:** Não confia no cabeçalho enviado pelo cliente; valida os primeiros bytes do buffer (JPEG: `FF D8 FF`, PNG: `89 50 4E 47`, WEBP: `RIFF...WEBP`).
   - **Tamanho Máximo:** Limitado a 10 MB por arquivo.
   - **Extensões Permitidas:** `.jpg`, `.jpeg`, `.png`, `.webp`.
   - **Autorização contra IDOR:**
     - Corretor tentando enviar mídia para imóvel de outro corretor -> **HTTP 403 Forbidden**.
     - Corretor tentando enviar mídia para empreendimento de outro corretor -> **HTTP 403 Forbidden**.
     - Corretor tentando alterar foto/logo de outro corretor -> **HTTP 403 Forbidden**.
     - ADMIN possui permissão de gestão global.
3. **Estratégia de Acesso ao Storage:**
   - O bucket `area-nobre-media` no Supabase Storage é definido como **público** para permitir entrega de fotos por CDN, visualização sem login nas apresentações públicas compartilhadas (`/p/imovel/[publicId]`), avatar/logo do corretor e renderização em crawlers do WhatsApp / Open Graph.
   - Arquivos futuros que demandem sigilo documental (ex: contratos, escrituras, matrículas digitalizadas) deverão utilizar bucket privado separado com URLs assinadas temporárias.
4. **URLs Absolutas em Páginas Públicas e Open Graph:**
   - Em [src/app/p/imovel/[publicId]/page.tsx](file:///c:/Guilherme/Corretora%20Daiane/Antigravity%20APP%20corretor/src/app/p/imovel/%5BpublicId%5D/page.tsx), a geração de metadados converte qualquer URL relativa de imagem para URL absoluta HTTPS via `getAppBaseUrl()` baseada na variável `APP_PUBLIC_URL`.

---

## 7. BANCO DE DADOS POSTGRESQL & MIGRATIONS VERSIONADAS

1. **Estratégia de Conexão Supabase / Supavisor:**
   - Suporte nativo ao Connection Pooling do Supabase (Supavisor na porta 6543) para Next.js Serverless via `DATABASE_URL`.
   - Suporte à conexão direta (porta 5432) via `DIRECT_URL` para execução de migrations pelo Prisma CLI.
2. **Baseline Migration Gerada:**
   - Abandonado `prisma db push` para produção.
   - Criada a migration inicial versionada [prisma/migrations/0_init/migration.sql](file:///c:/Guilherme/Corretora%20Daiane/Antigravity%20APP%20corretor/prisma/migrations/0_init/migration.sql) (11.220 bytes, 335 linhas) contendo todo o DDL PostgreSQL:
     - Tabelas: `User`, `BrokerProfile`, `Client`, `Property`, `PropertyImage`, `Search`, `Match`, `Development`, `DevelopmentImage`, `Typology`.
     - Chaves primárias, constraints únicas (`User.email`, `BrokerProfile.userId`, `Property.publicId`, `Typology.publicId`), tipos precisos (`DOUBLE PRECISION`, `TIMESTAMP(3)`, `BOOLEAN`, `INTEGER`) e foreign keys com integridade referencial (`ON DELETE CASCADE` e `SET NULL`).
3. **Scripts de Migração e Validação Prontos:**
   - [scratch/migrate-data-sqlite-to-postgres.mjs](file:///c:/Guilherme/Corretora%20Daiane/Antigravity%20APP%20corretor/scratch/migrate-data-sqlite-to-postgres.mjs): Script parametrizado via `TARGET_DATABASE_URL` que importa todos os registros do backup verificado em ordem estrita de integridade e recalcula a integridade comparativa.
   - [scratch/migrate-media-to-supabase.mjs](file:///c:/Guilherme/Corretora%20Daiane/Antigravity%20APP%20corretor/scratch/migrate-media-to-supabase.mjs): Script que envia os arquivos de upload existentes para o bucket `area-nobre-media` no Supabase Storage e atualiza as referências de URLs nas tabelas do PostgreSQL.

---

## 8. SUÍTES DE TESTES E REGRESSÃO

Executadas as suítes completas de testes automatizados via `npm test`:

- **Fase 5.4 (Contas, Perfil, Isolamento, IDOR, Admin, Desativação, Regressão da Carteira da Daiane):**
  - **54 testes executados | 54 sucessos | 0 falhas**.
- **Fase 5.3 (Página Pública, DTO Sanitizado, Centroides, WhatsApp, Ciclo de Publicação):**
  - **16 testes executados | 16 sucessos | 0 falhas**.
- **Total:** **70 assertivas validadas com 100% de sucesso**.

---

## 9. DOCUMENTAÇÃO DAS VARIÁVEIS DE AMBIENTE ([.env.example](file:///c:/Guilherme/Corretora%20Daiane/Antigravity%20APP%20corretor/.env.example))

Nenhum secret é versionado. A documentação estabelece:

| Variável | Finalidade | Ambiente de Uso |
| :--- | :--- | :--- |
| `DATABASE_URL` | Conexão com PostgreSQL Supabase via pooler (porta 6543, pgbouncer=true) | Vercel (Preview / Prod) |
| `DIRECT_URL` | Conexão direta com PostgreSQL Supabase (porta 5432) para migrations | Vercel / CLI de migrations |
| `SUPABASE_URL` | URL base do projeto Supabase (`https://xxx.supabase.co`) | Vercel / Backend |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço secreta para operações de Storage | Vercel (Environment Variables) |
| `SUPABASE_STORAGE_BUCKET` | Nome do bucket público (`area-nobre-media`) | Vercel / Local |
| `AUTH_SECRET` | Chave secreta HMAC-SHA256 para assinatura do cookie de sessão | Vercel / Local |
| `APP_PUBLIC_URL` | URL pública HTTPS da aplicação para links de compartilhamento e Open Graph | Vercel / Local |
| `GEOBASE_API_KEY` | Chave de autenticação na API do GeoBase (server-side) | Vercel / Local |
| `NEXT_PUBLIC_APP_NAME` | Nome de exibição da aplicação ("Área Nobre") | Vercel / Local |
| `NEXT_PUBLIC_SATELLITE_PROVIDER` | Provedor de satélite (`esri`) | Vercel / Local |

---

## 10. CHECKPOINT HUMANO — INSTRUÇÕES OBJETIVAS PARA O USUÁRIO

Para prosseguir para o deploy e homologação em nuvem, são necessárias 3 configurações externas realizadas pelo usuário. **NUNCA cole secrets ou senhas nesta conversa.**

### Passo 1: Repositório GitHub Privado
1. Acesse sua conta no GitHub (ou crie em [github.com](https://github.com)).
2. Crie um novo repositório com visibilidade **Private** (Privado) com o nome desejado (ex: `area-nobre-app`). **Não** inicialize com README ou .gitignore (eles já existem no projeto local).
3. No terminal do seu projeto local, vincule o repositório remoto e envie o código:
   ```bash
   git remote add origin https://github.com/SEU_USUARIO/area-nobre-app.git
   git push -u origin main
   ```

### Passo 2: Projeto no Supabase (Banco PostgreSQL + Storage)
1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto.
   - Escolha a região mais próxima (recomendado: `sa-east-1` São Paulo, Brasil).
   - Defina uma senha forte para o banco de dados (guarde-a em seu gerenciador de senhas).
2. Obtenha as Connection Strings em **Project Settings > Database**:
   - Copie a **Connection string (URI) no modo Transaction Pooler (porta 6543)** -> esta será sua `DATABASE_URL`.
   - Copie a **Connection string (URI) no modo Direct / Session (porta 5432)** -> esta será sua `DIRECT_URL`.
3. Obtenha as credenciais em **Project Settings > API**:
   - Copie o **Project URL** -> `SUPABASE_URL`.
   - Copie a chave **service_role (secret)** -> `SUPABASE_SERVICE_ROLE_KEY`.
4. Crie o bucket de Storage em **Storage > New Bucket**:
   - Nome: `area-nobre-media`
   - Marque a opção **Public bucket = ON** (necessário para apresentação pública de imóveis e WhatsApp).

### Passo 3: Projeto na Vercel (Hospedagem Next.js)
1. Acesse [vercel.com](https://vercel.com) e importe o repositório privado do GitHub.
2. Em **Environment Variables**, cadastre as variáveis listadas na Seção 9 com seus respectivos valores.
3. No primeiro deploy de homologação, utilize o domínio temporário fornecido pela Vercel (ex: `area-nobre-homolog.vercel.app`) e defina a variável `APP_PUBLIC_URL` com este domínio.

---

## 11. PRÓXIMO PASSO APÓS A CONFIGURAÇÃO EXTERNA

Assim que você concluir os passos 1 e 2 (ou quando tiver configurado o repositório GitHub e o projeto Supabase), avise aqui no chat para executarmos:
1. Aplicação da migration inicial no banco PostgreSQL do Supabase (`npx prisma migrate deploy`).
2. Execução do script de migração de dados e mídias (`migrate-data-sqlite-to-postgres.mjs` e `migrate-media-to-supabase.mjs`).
3. Validação final de homologação via HTTPS.
