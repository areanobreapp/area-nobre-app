# ÁREA NOBRE — FASE 2 | BLOCO 05
## F2.B05.3H.2 — Preparação Controlada da Homologação
### Relatório Técnico de Prontidão Operacional, Infraestrutura e Roteiro de Publicação

---

### 1. Resumo Executivo

Este documento estabelece o diagnóstico de prontidão técnica, de infraestrutura e de versionamento para a publicação controlada de todas as entregas do **Bloco 05 (F2.B05.1B até F2.B05.3H.1)** no ambiente de homologação (`area-nobre-homolog`).

A checagem foi realizada em modo estritamente de leitura, sem aplicação de commits, pushes, deploys, migrações no banco ou modificação de variáveis remotas.

O sistema encontra-se **tecnicamente pronto para homologação**, com 100% de compilação TypeScript, build de produção Next.js validado, banco DEV íntegro com zero migrações pendentes e regras de segurança e isolamento atestadas.

---

### 2. Estado do Git e Inventário de Alterações

- **Branch Atual**: `feature/compartilhamento-melhorias`
- **Relação com Remoto**: Branch local adiantada em **2 commits** em relação a `origin/feature/compartilhamento-melhorias`.

#### 2.1. Commits Locais Não Publicados (2 commits)
1. `94200b9 feat(f2-b05): implement residential building management` (F2.B05.2 — Gestão e catálogo de edifícios).
2. `d966fec feat(f2-b05): add physical property and building data models` (F2.B05.1B — Modelagem inicial de unidades e identidade física).

#### 2.2. Arquivos Modificados Não Comitados (17 arquivos)
Estes arquivos contêm as implementações consolidadas de regras de negócio, limites de vagas, preço compartilhado, mapa e interfaces:
- `prisma/schema.prisma` (entidades `PhysicalPropertyPriceHistory`, `PriceRevisionRequest`, `PropertyWaitlist`, `PropertyDispute`).
- `src/app/admin/page.tsx` (integração dos painéis de edifícios, disputas e fila de espera).
- `src/app/api/buildings/[id]/units/route.ts` (listagem e criação de unidades de condomínio).
- `src/app/api/properties/[id]/route.ts` (integração transacional de slots, preço único e sucessão).
- `src/app/api/properties/route.ts` (alocação transacional de vagas em novos cadastros e bloqueio no 4º corretor).
- `src/app/api/searches/[id]/route.ts` (consolidação de matches de busca por imóvel físico).
- `src/app/buscas/[id]/page.tsx` (renderização agrupada de resultados de busca sem duplicação).
- `src/app/imoveis/[id]/page.tsx` (interface com drawer/tabs de co-corretores, histórico e revisão de preço).
- `src/app/imoveis/page.tsx` (banner de convocação de 48h e badges de co-listagem).
- `src/app/page.tsx` (integração do mapa da home com consolidação de unidades).
- `src/components/HomeMap.tsx` (agrupamento no mapa principal com preço canônico).
- `src/components/PropertyForm.tsx` (bloqueio visual de 3 vagas e seleção de edifícios/unidades).
- `src/components/SearchMatchesMap.tsx` (mapa de compatibilidade consolidado).
- `src/components/properties/BuildingSelector.tsx` (seletor padronizado de edifícios).
- `src/lib/auth.ts` (remoção definitiva de backdoors de simulação de autenticação).
- `src/lib/matching/normalizer.ts` (normalização de preço utilizando o preço canônico compartilhado).
- `src/lib/matching/service.ts` (cálculo de compatibilidade com preço compartilhado oficial).

#### 2.3. Arquivos Não Rastreados / Novos (Untracked)
- **Serviços Centrais do Backend**:
  - `src/lib/listing-slot-service.ts` (gestão transacional de slots, preço e sucessão).
  - `src/lib/price-revision-service.ts` (mediação de revisão de preços e contestações).
  - `src/lib/waitlist-service.ts` (gestão da fila FIFO de 4º corretor e ofertas de 48h).
  - `src/lib/geo/property-grouping.ts` (lógica agnóstica de consolidação no mapa e buscas).
- **Novas Rotas de API**:
  - `src/app/api/admin/disputes/` e `src/app/api/admin/disputes/[id]/resolve/`
  - `src/app/api/price-revisions/` (abertura, aceite, recusa e escalação para disputa)
  - `src/app/api/properties/[id]/price-revisions/`
  - `src/app/api/properties/[id]/price/` (atualização direta por anúncio principal)
  - `src/app/api/properties/[id]/waitlist/`
  - `src/app/api/waitlist/` (listagem, ofertas ativas, aceite, recusa, cancelamento, notificação e expirações)
- **Novos Componentes React**:
  - `src/components/admin/AdminWaitlistManager.tsx`
  - `src/components/admin/DisputesManager.tsx`
  - `src/components/properties/PriceRevisionsManager.tsx`
  - `src/components/properties/WaitlistManager.tsx`
  - `src/components/properties/WaitlistOfferBanner.tsx`
- **Configuração e Banco**:
  - `vercel.json` (configuração do agendador Vercel Cron).
  - `prisma/migrations/20261110005626_add_shared_physical_property_pricing/migration.sql`
- **Relatórios Técnicos Markdown**:
  - `f2_b05_3g1_interfaces_preco_compartilhado.md`
  - `f2_b05_3g2_interfaces_revisao_preco.md`
  - `f2_b05_3g3_interfaces_lista_espera.md`
  - `f2_b05_3g4_agrupamento_mapa_buscas.md`
  - `f2_b05_3h_auditoria_integrada.md`
  - `f2_b05_3h1_seguranca_expiracoes.md`

#### 2.4. Higiene e Segurança de Arquivos
- **Nenhum segredo no Git**: Arquivos `.env*`, credenciais locais e certificados estão estritamente ignorados pelo `.gitignore`.
- **Nenhum arquivo de teste ou temporário rastreado**: Diretórios `scratch/`, `.next/`, `node_modules/` e `.system_generated/` estão devidamente ignorados.

---

### 3. Conferência da Vercel e da Infraestrutura

A inspeção em modo de leitura via Vercel CLI revelou o seguinte cenário de infraestrutura:

| Item | Situação Diagnosticada | Impacto / Observação |
|---|---|---|
| **Escopo da Conta** | `guilherme-reis-projects1` (`fescopan-7549`) | Conta pessoal do desenvolvedor. |
| **Plano da Conta** | **Hobby (Gratuito)** | **Fator Crítico para Agendamento**: Planos Hobby limitam cron jobs a **no máximo uma execução diária**. |
| **Projeto `area-nobre-homolog`** | Não listado no escopo atual da CLI | O projeto de homologação ainda não foi criado nesta conta ou reside na conta principal da Área Nobre / cliente. |
| **Variável `CRON_SECRET`** | Pendente de cadastro no painel Vercel | Necessária para que o endpoint `/api/waitlist/process-expirations` autorize as chamadas agendadas. |

---

### 4. Auditoria do Agendador de Expirações

#### 4.1. Limitação do Vercel Cron no Plano Hobby
O arquivo `vercel.json` contém a definição horária padrão:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/waitlist/process-expirations",
      "schedule": "0 * * * *"
    }
  ]
}
```
Se o deploy for realizado em uma conta Vercel no plano **Hobby**, a Vercel rejeitará a frequência horária com o erro:
`"A cron schedule in the hobby plan cannot run more frequently than once a day."`

#### 4.2. Solução Recomendada: Supabase `pg_cron` (Sem Custo e Nativa)
Para que o ambiente de homologação execute a varredura a cada 60 minutos sem depender de plano pago da Vercel, a melhor alternativa técnica é utilizar a extensão nativa `pg_cron` e `pg_net` já presentes no Supabase DEV:
```sql
-- Executar no SQL Editor do Supabase DEV (após deploy da homologação)
select cron.schedule(
  'process-waitlist-expirations-hourly',
  '0 * * * *',
  $$
  select net.http_get(
    url:='https://area-nobre-homolog.vercel.app/api/waitlist/process-expirations',
    headers:=jsonb_build_object(
      'Authorization', 'Bearer <CRON_SECRET>'
    )
  );
  $$
);
```

#### 4.3. Segurança e Robustez da Rota Agendada
- A rota `/api/waitlist/process-expirations` implementa **comparação em tempo constante (`crypto.timingSafeEqual`)**, prevenindo ataques de temporização.
- Totalmente **idempotente**: execuções repetidas sem ofertas vencidas encerram em poucos milissegundos com zero alterações.
- **Lock pessimista (`SELECT ... FOR UPDATE`)**: impede condições de corrida mesmo se houver chamadas simultâneas.

---

### 5. Conferência do Banco de Dados e Migrações

- **Conexão**: Aponta exclusivamente para o **Supabase DEV** (`jdoezhmtwicxcthhedtb.supabase.co`).
- **Ambiente Comercial**: Preservado e intocado (`udtqyoinwnalbvodejxj` não é referenciado).
- **Status das Migrações Prisma**:
  ```
  9 migrations found in prisma/migrations
  Database schema is up to date!
  ```
  Todas as 9 migrações já foram aplicadas com sucesso no Supabase DEV. **Não existem migrações pendentes**.
- **Integridade dos Registros Originais**:
  - `User`: 4 registros (os 4 usuários originais intactos).
  - `Property`: 3 registros (os 3 anúncios originais intactos).
  - `PhysicalProperty`: 0 registros residuais.
  - `PropertyWaitlist`: 0 registros residuais.

---

### 6. Validação do Código e Build Local

1. **Checagem de Tipos TypeScript**:
   - Comando: `npx tsc --noEmit`
   - Resultado: **0 erros** (exit code 0).
2. **Build de Produção**:
   - Comando: `npm run build`
   - Resultado: **Sucesso absoluto** (exit code 0).
   - 54 rotas de API e 29 páginas estáticas e dinâmicas geradas e otimizadas.
3. **Suite de Testes de Regra de Negócio**:
   - 33 de 33 asserções aprovadas com 100% de sucesso.

---

### 7. Matriz de Pendências e Riscos

| Risco / Pendência | Gravidade | Mitigação Técnica Planejada |
|---|---|---|
| **Deploy falhar no Vercel Hobby devido ao cron horário** | Médio | Se a conta Vercel de homologação for Hobby, ajustar temporariamente o `vercel.json` para diário (`0 4 * * *`) e habilitar o agendador horário via Supabase `pg_cron`. Se a conta for Pro, o `vercel.json` atual funcionará imediatamente. |
| **Ausência da variável `CRON_SECRET`** | Baixo | Cadastrar a variável nas configurações de ambiente do projeto na Vercel antes de iniciar o primeiro deploy. |
| **Inclusão acidental de relatórios ou scripts no Git** | Baixo | Adicionar os arquivos `.md` de documentação e scripts de seed/verificação de forma intencional ou mantê-los organizados em diretório de documentação. |

---

### 8. Roteiro Exato Recomendado para a Publicação

Quando autorizada a publicação da homologação, seguir rigorosamente os passos abaixo:

#### Passo 1: Organização e Commit no Git Local
Executar o commit unificado de todas as alterações do Bloco 05:
```bash
git add prisma/schema.prisma prisma/migrations/
git add src/
git add vercel.json
git add *.md
git commit -m "feat(f2-b05): implement 3-broker slot limits, shared pricing, waitlist and grouping"
```

#### Passo 2: Publicação no Repositório Remoto (Push)
```bash
git push origin feature/compartilhamento-melhorias
```

#### Passo 3: Configuração do Projeto na Vercel (`area-nobre-homolog`)
1. No painel da Vercel, conectar o projeto à branch `feature/compartilhamento-melhorias` (ou criar PR para branch de homologação, se aplicável).
2. Cadastrar as variáveis de ambiente essenciais para homologação:
   - `DATABASE_URL`: Connection string pooler do Supabase DEV (porta 6543).
   - `DIRECT_URL`: Connection string direta do Supabase DEV (porta 5432).
   - `SUPABASE_URL`: `https://jdoezhmtwicxcthhedtb.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: Chave de serviço do Supabase DEV.
   - `CRON_SECRET`: Chave secreta de alta entropia para proteção do agendador.
   - `APP_PUBLIC_URL`: URL oficial do ambiente (ex: `https://area-nobre-homolog.vercel.app`).
   - `JWT_SECRET`: Chave para tokens de sessão.

#### Passo 4: Deploy e Validação Pós-Publicação
1. Disparar o deploy na Vercel e acompanhar os logs de build.
2. Realizar testes de ponta a ponta na URL gerada:
   - Cadastro e vinculação de edifício / unidade.
   - Teste de alocação de 3 slots e bloqueio no 4º.
   - Teste da fila de espera e notificação de 48 horas.
   - Verificação visual do mapa e busca consolidada.

