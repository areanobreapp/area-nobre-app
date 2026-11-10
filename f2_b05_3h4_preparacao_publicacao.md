# ÁREA NOBRE — FASE 2 | BLOCO 05
## F2.B05.3H.4 — Preparação Final do Git e Acesso à Vercel
### Relatório de Engenharia, Organização de Versionamento e Roteiro de Publicação

---

### 1. Resumo Executivo

Este documento consolida a preparação final para a publicação das entregas do **Bloco 05 (F2.B05.1B até F2.B05.3H.3)** no ambiente de homologação (`area-nobre-homolog`).

A auditoria cobriu a identificação do acesso Vercel, a separação metódica dos arquivos para versionamento, a análise de resiliência e segurança do agendador `pg_cron` com Supabase Vault, e a conferência de isolamento absoluto entre os ambientes DEV e comercial.

Em conformidade estrita com as diretrizes da etapa:
- **Nenhum commit foi executado.**
- **Nenhum push foi executado.**
- **Nenhum deploy foi disparado.**
- **Nenhuma extensão ou rotina agendada remota foi criada.**
- **O ambiente comercial permanece 100% intocado e isolado.**

---

### 2. Identificação e Diagnóstico de Acesso à Vercel

```mermaid
flowchart TD
    subgraph "Repositório GitHub Oficial"
        GH["areanobreapp/area-nobre-app.git"]
        BR["Branch: feature/compartilhamento-melhorias"]
        GH --> BR
    end

    subgraph "Vercel Oficial (Área Nobre)"
        VO["Equipe / Conta: areanobreapp"]
        P_HOMOLOG["Projeto: area-nobre-homolog\n(https://area-nobre-homolog.vercel.app)"]
        P_PROD["Projeto: area-nobre-app\n(https://area-nobre-app.vercel.app)"]
        VO --> P_HOMOLOG
        VO --> P_PROD
        BR -.->|Deploy Preview / Homolog| P_HOMOLOG
    end

    subgraph "Sessão Local Atual da CLI"
        LOCAL_CLI["Conta Local: fescopan-7549\nEscopo: guilherme-reis-projects1 (Hobby)"]
    end

    LOCAL_CLI -.->|Sem Vínculo| P_HOMOLOG
```

#### 2.1. Metadados do Projeto de Homologação Existente
- **Nome do Projeto**: `area-nobre-homolog`
- **URL Pública Oficial**: `https://area-nobre-homolog.vercel.app`
- **Proprietária na Vercel**: Equipe / Conta **`areanobreapp`**
- **Repositório Git Conectado**: `https://github.com/areanobreapp/area-nobre-app.git`
- **Branch de Trabalho**: `feature/compartilhamento-melhorias`
- **Ambiente de Destino**: *Preview / Staging* (Homologação)

#### 2.2. Procedimento de Autenticação Necessário
A sessão atual da Vercel CLI nesta máquina local pertence ao usuário pessoal `fescopan-7549` (`guilherme-reis-projects1`). Para que a CLI local possa interagir diretamente com o projeto `area-nobre-homolog` sem recorrer exclusivamente ao painel web, o desenvolvedor dispõe de duas alternativas:

1. **Autenticação Direta**:
   Executar no terminal local `npx vercel login` e autenticar com o e-mail ou credenciais da organização `areanobreapp` (`areanobreapp@gmail.com`).
2. **Convite de Membro na Vercel**:
   Acessar `vercel.com/areanobreapp/settings/members` e convidar o usuário `fescopan-7549` como membro da equipe oficial da Área Nobre.
3. **Deploy Contínuo via Git (Recomendado)**:
   Como o repositório GitHub `areanobreapp/area-nobre-app` já está vinculado ao projeto `area-nobre-homolog` na Vercel, o deploy de homologação ocorre de forma automática e segura assim que o `git push` for autorizado, dispensando a necessidade de comandos manuais da CLI Vercel na máquina local.

> [!IMPORTANT]
> **Preservação de Escopo**: O projeto `area-nobre-homolog` oficial existente na conta `areanobreapp` será preservado. Nenhum projeto paralelo será criado.

---

### 3. Preparação do Git e Separação de Arquivos

Auditaram-se todos os arquivos modificados e não rastreados desde o último commit (`94200b9`):

#### 3.1. Classificação dos Arquivos

| Categoria | Arquivos Envolvidos | Destino no Versionamento |
|---|---|---|
| **Schema e Migrações** | `prisma/schema.prisma`<br>`prisma/migrations/20261110005626_add_shared_physical_property_pricing/migration.sql`<br>`prisma/seed-dev.mjs` | **Versionar** (Commit 1) |
| **Núcleo de Negócio (Services)** | `src/lib/listing-slot-service.ts`<br>`src/lib/price-revision-service.ts`<br>`src/lib/waitlist-service.ts`<br>`src/lib/geo/property-grouping.ts`<br>`src/lib/auth.ts`<br>`src/lib/matching/normalizer.ts`<br>`src/lib/matching/service.ts` | **Versionar** (Commit 1 e 2) |
| **Rotas de API** | `src/app/api/properties/[id]/route.ts`<br>`src/app/api/properties/route.ts`<br>`src/app/api/properties/[id]/price/route.ts`<br>`src/app/api/properties/[id]/price-revisions/route.ts`<br>`src/app/api/properties/[id]/waitlist/route.ts`<br>`src/app/api/price-revisions/**`<br>`src/app/api/admin/disputes/**`<br>`src/app/api/waitlist/**`<br>`src/app/api/searches/[id]/route.ts`<br>`src/app/api/buildings/[id]/units/route.ts` | **Versionar** (Commit 2) |
| **Interfaces e Componentes** | `src/app/imoveis/[id]/page.tsx`<br>`src/app/imoveis/page.tsx`<br>`src/app/buscas/[id]/page.tsx`<br>`src/app/page.tsx`<br>`src/app/admin/page.tsx`<br>`src/components/HomeMap.tsx`<br>`src/components/SearchMatchesMap.tsx`<br>`src/components/PropertyForm.tsx`<br>`src/components/properties/**`<br>`src/components/admin/**` | **Versionar** (Commit 3) |
| **Infraestrutura** | `vercel.json` (higienizado sem cron incompatível) | **Versionar** (Commit 4) |
| **Documentação Técnica** | `f2_b05_*.md` (relatórios das etapas F2.B05.3G.1 até F2.B05.3H.4) | **Versionar** (Commit 4) |
| **Scripts e Testes Temporários** | `scratch/test_f2_b05_*.ts` | **Ignorados** via `.gitignore` |
| **Credenciais e Ambiente** | `.env`, `.env.local` | **Ignorados** via `.gitignore` |

#### 3.2. Proposta de Organização dos Commits (4 Commits Lógicos)
Para que o histórico Git da homologação seja limpo, legível e auditável:

- **Commit 1**: `feat(f2-b05): shared physical property pricing and transactional slot service`
  *(Schema, migração, ListingSlotService, PriceRevisionService, WaitlistService, Auth)*
- **Commit 2**: `feat(f2-b05): property slot, price revision, dispute and waitlist APIs`
  *(Todas as 18 novas rotas de API e integrações transacionais)*
- **Commit 3**: `feat(f2-b05): shared property UI, map grouping, search matches and broker selection`
  *(Componentes visuais, drawers, abas, badges de co-listagem e agrupamento geográfico)*
- **Commit 4**: `docs(f2-b05): add technical audit reports and staging vercel configuration`
  *(vercel.json e relatórios de homologação f2_b05_*.md)*

---

### 4. Segurança, Resiliência e Isolamento do Agendador

#### 4.1. Arquitetura `pg_cron` + `pg_net` + Supabase Vault
- **Armazenamento de Segredo com Zero Exposição**:
  O token `CRON_SECRET` será gravado no `supabase_vault` (extensão `0.3.1` já instalada no Supabase DEV).
  Nenhum script versionado ou log expõe o segredo.
- **Chamada Segura**:
  A cada 60 minutos, o `pg_cron` invoca a função `net.http_get`:
  - **URL Alvo Exclusiva**: `https://area-nobre-homolog.vercel.app/api/waitlist/process-expirations`
  - **Cabeçalho de Autenticação**: `Authorization: Bearer <recuperado via vault.decrypted_secrets>`
- **Tratamento de Falhas e Timeouts**:
  - `pg_net` opera de forma **totalmente assíncrona** (non-blocking). Se a rota demorar ou houver falha de rede temporária, o processo do banco de dados não sofre travamento.
  - A rota na Vercel utiliza **bloqueio pessimista PostgreSQL (`SELECT ... FOR UPDATE`)**, garantindo que mesmo se duas requisições chegarem simultaneamente, uma aguardará a outra, mantendo a integridade das 3 vagas e a ordem estrita da fila FIFO.
  - A rota é **estritamente idempotente**: chamadas repetidas sem novas ofertas vencidas retornam `processedCount: 0, promotedCount: 0` sem efeito colateral.

#### 4.2. Isolamento Absoluto dos Ambientes DEV e Comercial
- O banco Supabase DEV (`jdoezhmtwicxcthhedtb`) e a URL de homologação (`area-nobre-homolog.vercel.app`) operam em circuito fechado.
- O banco comercial (`udtqyoinwnalbvodejxj`) e o domínio comercial (`area-nobre-app.vercel.app`) não recebem nenhuma requisição, chamada de webhook ou alteração de schema.

---

### 5. Conferência Final de Integridade Local

- **Branch Ativa**: `feature/compartilhamento-melhorias`.
- **Compilação TypeScript**: `npx tsc --noEmit` $\rightarrow$ **0 erros** (exit code 0).
- **Build de Produção**: `npm run build` $\rightarrow$ **Sucesso absoluto** (exit code 0, 54 rotas de API e 29 páginas).
- **Status do Banco DEV**:
  - 9 migrações aplicadas (`Database schema is up to date!`).
  - 4 usuários originais e 3 anúncios originais 100% preservados.
  - 0 registros residuais em `PhysicalProperty` e `PropertyWaitlist`.

---

### 6. Roteiro de Publicação com Pontos de Aprovação Explícitos

A publicação deve seguir estritamente o roteiro em 5 etapas independentes abaixo. **Nenhuma ação deve ser iniciada sem sua aprovação prévia para a respectiva etapa**:

```mermaid
flowchart TD
    G1{"[Portão 1]\nAprovação do Commit"} -->|Autorizado| S1["Etapa 1: Execução dos Commits Locais"]
    S1 --> G2{"[Portão 2]\nAprovação do Push"}
    G2 -->|Autorizado| S2["Etapa 2: Git Push para origin/feature/compartilhamento-melhorias"]
    S2 --> G3{"[Portão 3]\nAprovação do Deploy"}
    G3 -->|Autorizado| S3["Etapa 3: Deploy Vercel (area-nobre-homolog) + Validação de Env Vars"]
    S3 --> G4{"[Portão 4]\nAprovação do Agendador"}
    G4 -->|Autorizado| S4["Etapa 4: Gravação do Segredo no Vault + Criação do Job pg_cron"]
    S4 --> G5{"[Portão 5]\nAprovação dos Testes"}
    G5 -->|Autorizado| S5["Etapa 5: Testes Ponta a Ponta Online na URL de Homologação"]
```

#### Etapa 1: Commit Local
- **Ação**: Adicionar os arquivos de código, schema, migrações, `vercel.json` e documentações, executando os commits organizados.
- **Portão de Aprovação 1**: Requer aprovação do usuário para executar `git commit`.

#### Etapa 2: Push para o Repositório Remoto
- **Ação**: Enviar a branch `feature/compartilhamento-melhorias` para `origin`.
- **Portão de Aprovação 2**: Requer aprovação do usuário para executar `git push`.

#### Etapa 3: Deploy no Projeto de Homologação Existente
- **Ação**: Acompanhar o build automático do projeto `area-nobre-homolog` na Vercel e validar que as variáveis de ambiente (`DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `JWT_SECRET`, `APP_PUBLIC_URL`) estão cadastradas.
- **Portão de Aprovação 3**: Requer aprovação do usuário para disparar/validar o deploy na Vercel.

#### Etapa 4: Configuração e Ativação do Agendador no Supabase DEV
- **Ação**: Habilitar as extensões `pg_cron` e `pg_net` no Supabase DEV, cadastrar o `cron_secret` no `supabase_vault` e agendar a rotina horária apontando para `https://area-nobre-homolog.vercel.app/api/waitlist/process-expirations`.
- **Portão de Aprovação 4**: Requer aprovação do usuário para aplicar os comandos SQL no Supabase DEV.

#### Etapa 5: Testes Online de Homologação
- **Ação**: Acessar `https://area-nobre-homolog.vercel.app` e validar os fluxos completos de 3 corretores, preço único compartilhado, fila de espera, convocação de 48h e mapa consolidado em ambiente web real.
- **Portão de Aprovação 5**: Requer aprovação do usuário para encerramento do Bloco 05.

