# Instruções para Inclusão dos Textos Legais Oficiais (Rascunhos 1.0)

Este diretório foi preparado para receber os textos integrais e oficiais dos documentos jurídicos da Área Nobre Tecnologia e Inteligência Ltda, conforme diretrizes da Etapa 1.3.1.

## Arquivos Esperados (Codificação UTF-8):

1. **Termos de Uso e Responsabilidade:**
   - Nome do arquivo: `termos-de-uso-v1.0.txt` (ou `.md`)
   - Tipo de documento: `TERMS_OF_USE`
   - Versão inicial: `1.0`

2. **Política de Privacidade (LGPD):**
   - Nome do arquivo: `politica-de-privacidade-v1.0.txt` (ou `.md`)
   - Tipo de documento: `PRIVACY_POLICY`
   - Versão inicial: `1.0`

## Requisitos de Importação:
- Os arquivos devem conter o texto integral com todas as cláusulas e parágrafos oficiais.
- O importador calcula o hash SHA-256 para assegurar integridade jurídica entre o arquivo físico e o registro do banco.
- Todos os documentos importados são gravados com status `DRAFT` (rascunho), sem vigência e sem exibição pública, até homologação e autorização de publicação oficial.

## Comando para Executar a Importação:
```bash
node scripts/import-legal-drafts.mjs
```
