# ÁREA NOBRE — FASE 2 | BLOCO 05
## F2.B05.3H.1 — Correções de Segurança e Automação Pré-Homologação
### Relatório Técnico de Implementação, Testes e Conformidade

---

### 1. Resumo Executivo

Em conformidade com a diretriz da etapa **F2.B05.3H.1**, foram corrigidos exclusivamente os dois apontamentos de severidade alta diagnosticados na auditoria integrada F2.B05.3H:
- **ACH-02**: Proteção estrita da rota de convocação da lista de espera contra acessos não autorizados por corretores comuns ou terceiros.
- **ACH-01**: Implementação do mecanismo automatizado de processamento de ofertas expiradas com suporte a agendador horário, proteção por segredo de ambiente (`CRON_SECRET`), compatibilidade com Vercel Cron (método `GET`) e isolamento contra condições de corrida via locks pessimistas no banco de dados.

Todas as regras comerciais preexistentes, os limites de 3 corretores, o preço compartilhado único e a integridade da base Supabase DEV foram integralmente preservados.

---

### 2. Arquivos Modificados e Criados

| Arquivo | Natureza | Descrição da Alteração |
|---|---|---|
| [`src/app/api/waitlist/[id]/notify/route.ts`](file:///c:/Guilherme/Corretora%20Daiane/area-nobre-dev/src/app/api/waitlist/[id]/notify/route.ts) | Modificação | Adicionada checagem estrita de papel administrativo (`user.role === 'ADMIN'`). Retorna HTTP 401 para não autenticados / sessões inválidas e HTTP 403 para corretores comuns. |
| [`src/app/api/waitlist/process-expirations/route.ts`](file:///c:/Guilherme/Corretora%20Daiane/area-nobre-dev/src/app/api/waitlist/process-expirations/route.ts) | Modificação | Adicionado suporte a requisições `GET` (exigido pelo Vercel Cron) e `POST` (painel `/admin`). Implementada autorização dupla: via `CRON_SECRET` com comparação *timing-safe* e via sessão autenticada de `ADMIN`. |
| [`src/lib/waitlist-service.ts`](file:///c:/Guilherme/Corretora%20Daiane/area-nobre-dev/src/lib/waitlist-service.ts) | Modificação | Reforçado o método `processExpiredOffers` com lock pessimista exclusivo PostgreSQL (`SELECT ... FOR UPDATE`) sobre as ofertas expiradas, ordenação determinística dos IDs afetados e execução transacional idempotente. |
| [`vercel.json`](file:///c:/Guilherme/Corretora%20Daiane/area-nobre-dev/vercel.json) | Criação | Configuração oficial do Vercel Cron para execução periódica da rota `/api/waitlist/process-expirations` a cada hora (`0 * * * *`). |
| [`scratch/test_f2_b05_3h1_security_expirations.ts`](file:///c:/Guilherme/Corretora%20Daiane/area-nobre-dev/scratch/test_f2_b05_3h1_security_expirations.ts) | Criação (Teste) | Suite de testes automatizados com 33 asserções validando autorização, expiração, fila FIFO, concorrência simultânea e integridade do banco. |

---

### 3. Detalhamento Técnico das Correções

#### 3.1. ACH-02 — Proteção da Convocação (`POST /api/waitlist/[id]/notify`)
- **Problema anterior**: A rota permitia que qualquer usuário autenticado (mesmo corretores comuns) disparasse o cronômetro de 48 horas de convocações pendentes de outros corretores.
- **Implementação**:
  ```ts
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  if (user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Acesso negado. Apenas administradores podem disparar convocações da lista de espera.' },
      { status: 403 }
    );
  }
  ```
- **Garantias**:
  - Sessão não autenticada: HTTP 401.
  - Sessão adulterada ou token expirado: HTTP 401.
  - Corretor comum: HTTP 403 (nenhuma alteração de estado).
  - Administrador autenticado: autorização concedida.
  - O método `dispatchOfferNotification` valida que a oferta está estritamente em status `PENDING_NOTIFICATION`, impedindo duplo disparo em ofertas já `OFFERED`.

#### 3.2. ACH-01 — Processamento de Expirações e Automação Horária
- **Problema anterior**: O processamento de expirações só respondia ao método `POST`, dependia de acionamento manual no painel `/admin` e não estava protegido por segredo de cron.
- **Implementação**:
  - A rota [`/api/waitlist/process-expirations`](file:///c:/Guilherme/Corretora%20Daiane/area-nobre-dev/src/app/api/waitlist/process-expirations/route.ts) agora atende a `GET` e `POST`.
  - Função `authorizeCronOrAdmin` valida:
    1. Se `process.env.CRON_SECRET` estiver configurado, aceita `Authorization: Bearer <CRON_SECRET>` ou `x-cron-secret: <CRON_SECRET>`. A comparação utiliza `crypto.timingSafeEqual` para blindagem contra ataques de temporização (*timing attacks*).
    2. Alternativamente, aceita sessão autenticada de usuário com `role === 'ADMIN'` (mantendo compatibilidade com o botão do painel administrativo).
    3. Rejeita qualquer outra requisição com HTTP 401 ou 403.
  - No banco de dados, `processExpiredOffers` adquire lock pessimista de linha:
    ```sql
    SELECT id, "physicalPropertyId"
    FROM "PropertyWaitlist"
    WHERE status = 'OFFERED'
      AND "expiresAt" <= ${now}
    FOR UPDATE;
    ```
  - As ofertas vencidas são atualizadas para `EXPIRED` na mesma transação e os imóveis físicos afetados têm o método `processSlotAvailability` invocado, promovendo o próximo corretor da fila FIFO para `PENDING_NOTIFICATION`.

---

### 4. Estratégia de Agendamento e Compatibilidade Vercel / Supabase

#### 4.1. Vercel Cron (Configurado em `vercel.json`)
O arquivo `vercel.json` foi configurado na raiz do projeto:
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

> [!IMPORTANT]
> **Compatibilidade de Planos Vercel**:
> - **Plano Vercel Pro**: Suporta agendamento a cada hora (`0 * * * *`) e até frequências menores (por minuto). O Vercel Cron envia automaticamente requisições `GET` com o cabeçalho `Authorization: Bearer <CRON_SECRET>` quando a variável `CRON_SECRET` está configurada no painel da Vercel.
> - **Plano Vercel Hobby (Gratuito)**: A Vercel limita a frequência de cron jobs a **no máximo uma execução diária** (ex: `0 4 * * *`). Caso o ambiente de homologação esteja em uma conta Vercel Hobby, a expressão `0 * * * *` gerará aviso ou rejeição no deploy.

#### 4.2. Alternativa sem restrição de plano: Supabase `pg_cron`
Caso o ambiente de homologação opere sob conta Vercel Hobby, pode-se ativar a extensão `pg_cron` e `pg_net` diretamente no Supabase de homologação (sem necessidade de upgrades de plano):
```sql
-- Agendamento horário no Supabase (Homologação)
select cron.schedule(
  'process-waitlist-expirations-hourly',
  '0 * * * *',
  $$
  select net.http_get(
    url:='https://<dominio-de-homologacao>/api/waitlist/process-expirations',
    headers:=jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    )
  );
  $$
);
```

#### 4.3. Alternativa via GitHub Actions (Workflows Agendados)
Também é possível disparar o endpoint via GitHub Actions com agendamento `cron: '0 * * * *'`, executando `curl -X GET -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" https://<dominio-homolog>/api/waitlist/process-expirations`.

---

### 5. Resultados dos Testes Automatizados

A suite [`scratch/test_f2_b05_3h1_security_expirations.ts`](file:///c:/Guilherme/Corretora%20Daiane/area-nobre-dev/scratch/test_f2_b05_3h1_security_expirations.ts) foi executada contra a base DEV com **100% de aprovação (33/33 asserções)**:

```
========================================================================
TEST SUITE: F2.B05.3H.1 — SEGURANÇA E AUTOMAÇÃO PRÉ-HOMOLOGAÇÃO
========================================================================

--- 1. SETUP DE DADOS DE TESTE ---
  [OK] Setup concluído com sucesso.

--- 2. CENÁRIO 1: TESTES DE AUTORIZAÇÃO EM /api/waitlist/[id]/notify (ACH-02) ---
  [PASS] 1.1 Não autenticado em /notify retorna HTTP 401
  [PASS] 1.2 Sessão adulterada/inválida retorna HTTP 401
  [PASS] 1.3 Despacho de oferta formal bem-sucedido
  [PASS] 1.4 Status transicionado para OFFERED
  [PASS] 1.5 notifiedAt registrado com timestamp atual
  [PASS] 1.6 expiresAt registrado (+48 horas corridas)
  [PASS] 1.7 Prazo de expiração é exatamente 48 horas corridas
  [PASS] 1.8 Disparo duplicado em oferta já OFFERED é rejeitado
  [OK] Cenário 1 concluído.

--- 3. CENÁRIO 2: AUTORIZAÇÃO EM /api/waitlist/process-expirations (ACH-01) ---
  [PASS] 2.1 GET não autorizado retorna HTTP 401
  [PASS] 2.2 POST não autorizado retorna HTTP 401
  [PASS] 2.3 Token CRON_SECRET incorreto retorna HTTP 401
  [PASS] 2.4 GET com CRON_SECRET válido retorna HTTP 200
  [PASS] 2.5 Identificado como acionado por CRON
  [PASS] 2.6 POST com x-cron-secret válido retorna HTTP 200
  [PASS] 2.7 Identificado como acionado por CRON via x-cron-secret
  [OK] Cenário 2 concluído.

--- 4. CENÁRIO 3: REGRAS DE EXPIRAÇÃO, VAGA E PROMOÇÃO FIFO ---
  [PASS] 3.1 Broker 4 bloqueado por capacidade cheia (SLOTS_FULL)
  [PASS] 3.2 Broker 4 ingressa na fila (Posição 1)
  [PASS] 3.3 Broker 5 ingressa na fila (Posição 2)
  [PASS] 3.4 Broker 4 promovido para PENDING_NOTIFICATION ao liberar vaga
  [PASS] 3.5 PENDING_NOTIFICATION não possui contagem de expiração iniciada (expiresAt nulo)
  [PASS] 3.6 Broker 5 permanece como WAITING na fila
  [PASS] 3.7 Convocação formal do Broker 4 disparada
  [PASS] 3.8 Oferta dentro do prazo de 48h NÃO é expirada
  [PASS] 3.9 Oferta com prazo vencido é expirada com sucesso
  [PASS] 3.10 Próximo corretor elegível (Broker 5) promovido automaticamente
  [PASS] 3.11 Inscrição do Broker 4 marcada como EXPIRED
  [PASS] 3.12 Broker 5 recebeu a vaga reservada (PENDING_NOTIFICATION)
  [PASS] 3.13 Execução repetida é 100% idempotente (0 processados, 0 promovidos)
  [OK] Cenário 3 concluído.

--- 5. CENÁRIO 4: CONCORRÊNCIA E LOCK PESSIMISTA ---
  [PASS] 4.1 Em 3 execuções concorrentes simultâneas, a oferta é processada exatamente 1 única vez
  [OK] Cenário 4 concluído.

--- 6. TEARDOWN E LIMPEZA DE DADOS DE TESTE ---
  [OK] Limpeza concluída com sucesso.

--- 7. VERIFICAÇÃO DE INTEGRIDADE DA BASE DEV ---
  [PASS] 7.1 Base DEV possui exatamente 4 usuários originais
  [PASS] 7.2 Base DEV possui exatamente 3 anúncios originais
  [PASS] 7.3 Base DEV possui 0 inscrições na lista de espera (resíduos limpos)
  [PASS] 7.4 Base DEV possui 0 registros de PhysicalProperty (resíduos limpos)
========================================================================
RESULTADO DA SUITE: 33/33 APROVADOS (0 FALHAS)
========================================================================
```

---

### 6. Verificações de Compilação e Build de Produção

1. **Checagem de Tipagem TypeScript**:
   - Comando: `npx tsc --noEmit`
   - Resultado: **0 erros** (exit code 0).
2. **Build de Produção Next.js**:
   - Comando: `npm run build`
   - Resultado: **Compilação bem-sucedida** (exit code 0).
   - 54 rotas de API e 29 páginas renderizadas/otimizadas sem falhas.

---

### 7. Integridade do Banco e Estado do Git

- **Supabase DEV (`jdoezhmtwicxcthhedtb`)**:
  - `User`: 4 registros (os 4 usuários originais preservados).
  - `Property`: 3 registros (os 3 anúncios originais preservados).
  - `PhysicalProperty`: 0 registros residuais de teste.
  - `PropertyWaitlist`: 0 registros residuais de teste.
- **Git**:
  - Branch ativa: `feature/compartilhamento-melhorias`.
  - Nenhum commit realizado (`git commit`).
  - Nenhum envio remoto realizado (`git push`).
  - Nenhum deploy executado.

---

### 8. Configurações Pendentes para Homologação

Para que o ambiente de homologação execute o agendador de expirações sem intervenção manual:
1. **Cadastrar Variável de Ambiente**:
   - Nome: `CRON_SECRET`
   - Valor: String aleatória de alta entropia (ex: gerada via `node -e "console.log(crypto.randomBytes(32).toString('hex'))"`).
   - Configurar no painel da Vercel (Project Settings $\rightarrow$ Environment Variables) para o ambiente de *Preview* / *Homologação*.
2. **Verificar Plano da Vercel**:
   - Se Vercel Pro: o arquivo `vercel.json` já fará o disparo automático a cada 60 minutos sem configurações adicionais.
   - Se Vercel Hobby: utilizar o agendador Supabase `pg_cron` ou workflow do GitHub Actions conforme documentado na Seção 4.

