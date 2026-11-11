# ÁREA NOBRE — CONFIGURAÇÃO DE AUTENTICAÇÃO ISOLADA
## Etapa A.2 — Vercel CLI Exclusiva do Área Nobre

**Data:** 10 de Novembro de 2026  
**Diretório de Configuração Isolado:** `C:\Users\user\.vercel-areanobre`  
**Status:** CONCLUÍDO COM SUCESSO

---

### 1. Resumo Executivo

A etapa **A.2** foi executada com êxito, estabelecendo uma sessão dedicada e permanente da **Vercel CLI** para o projeto **Área Nobre**, completamente isolada da sessão global da Fescopan.

Todos os objetivos de segurança foram atingidos:
- **Zero impacto na Fescopan:** A sessão global padrão em `%APPDATA%\com.vercel.cli\Data` permaneceu intacta e logada como `fescopan-7549`.
- **Zero impacto no Antigravity/Gemini:** A conta Google/Gemini paga que atende as janelas do Antigravity permaneceu ativa e intocada.
- **Autenticação Oficial Concluída:** A sessão isolada foi autenticada como `areanobreapp-3526` sob a equipe oficial `areanobre1` (Areanobre).
- **Projetos Auditados:** Confirmou-se o acesso direto aos projetos `area-nobre-homolog` e `area-nobre-app`.
- **Banco de Homologação Confirmado:** A variável `SUPABASE_URL` do projeto `area-nobre-homolog` foi inspecionada diretamente e comprovou o apontamento exclusivo ao banco **Supabase DEV** (`jdoezhmtwicxcthhedtb`), afastando qualquer risco sobre o banco comercial.

---

### 2. Resultados da Validação Técnica

#### 2.1. Sessão Isolada do Área Nobre
Comando: `npx vercel --global-config "C:\Users\user\.vercel-areanobre" whoami`
```text
Vercel CLI 65.14.0
areanobreapp-3526
```

Comando: `npx vercel --global-config "C:\Users\user\.vercel-areanobre" teams ls`
```text
id             Team name     Plan      
areanobre1     Areanobre     hobby     
```

#### 2.2. Projetos Acessíveis na Equipe Oficial
Comando: `npx vercel --global-config "C:\Users\user\.vercel-areanobre" project ls --scope areanobre1`
```text
> Projects found under areanobre1
  Project Name         Latest Production URL                   Updated   Node Version   Status   
  area-nobre-homolog   https://area-nobre-homolog.vercel.app   23h       26.x                    
  area-nobre-app       https://area-nobre-app.vercel.app       3d        24.x                    
```

#### 2.3. Auditoria do Projeto de Homologação (`area-nobre-homolog`)
1. **Branch e Target de Produção do Projeto:**
   - O projeto `area-nobre-homolog` está configurado para direcionar a branch `feature/compartilhamento-melhorias` como target de produção para o domínio `https://area-nobre-homolog.vercel.app`.
2. **Ambiente e Banco de Dados (Inspecionado via CLI):**
   - `APP_ENV`: `"homologation"`
   - `NEXT_PUBLIC_APP_ENV`: `"homologation"`
   - `SUPABASE_STORAGE_BUCKET`: `"area-nobre-media"`
   - `SUPABASE_URL`: `https://jdoezhmtwicxcthhedtb.supabase.co`
   - **Identificador DEV:** `jdoezhmtwicxcthhedtb` (**Confirmado**).
   - **Identificador Comercial:** `udtqyoinwnalbvodejxj` (**Ausente do ambiente de homologação**).

#### 2.4. Comprovação da Preservação da Fescopan
Executando a Vercel CLI no modo padrão do sistema (sem `--global-config`):
Comando: `npx vercel whoami`
```text
Vercel CLI 65.14.0
fescopan-7549
```
Comando: `npx vercel project ls`
```text
> Projects found under guilherme-reis-projects1
  fescopan-simulador-arranjos   https://fescopan-simulador-arranjos.vercel.app
```
- **Conclusão:** A máquina local agora dispõe de **duas sessões Vercel simultâneas e independentes**. A Fescopan utiliza a sessão nativa do Windows e o Área Nobre utiliza o diretório isolado.

---

### 3. Comandos Seguros para Operações Futuras

Para qualquer operação futura na Vercel para o Área Nobre, deve-se sempre incluir a flag `--global-config "C:\Users\user\.vercel-areanobre"`.

Exemplos práticos:

| Ação Desejada | Comando Seguro |
|---|---|
| **Ver projetos** | `npx vercel --global-config "$env:USERPROFILE\.vercel-areanobre" project ls --scope areanobre1` |
| **Listar variáveis de homologação** | `npx vercel --global-config "$env:USERPROFILE\.vercel-areanobre" env ls --project area-nobre-homolog --scope areanobre1` |
| **Inspecionar último deploy** | `npx vercel --global-config "$env:USERPROFILE\.vercel-areanobre" ls area-nobre-homolog --scope areanobre1` |
| **Ver logs em tempo real** | `npx vercel --global-config "$env:USERPROFILE\.vercel-areanobre" logs area-nobre-homolog --scope areanobre1` |

> [!TIP]
> **Atalho opcional na sessão do terminal:**  
> Caso queira evitar digitar `--global-config` repetidamente na sessão do PowerShell aberta para o Área Nobre, basta definir na janela atual:  
> `$env:VERCEL_GLOBAL_CONFIG = "$env:USERPROFILE\.vercel-areanobre"`  
> A Vercel CLI utilizará essa variável automaticamente naquela janela do terminal sem afetar outras janelas ou a configuração global da Fescopan.

---

### 4. Declaração de Conformidade e Encerramento

- Nenhum arquivo do repositório foi alterado (nenhum commit gerado).
- Nenhum push ou deploy foi realizado.
- Nenhum banco de dados sofreu alteração.
- O isolamento completo foi atingido e comprovado tecnicamente.
- O projeto Área Nobre está agora totalmente habilitado para avançar com segurança para as próximas etapas de homologação.

