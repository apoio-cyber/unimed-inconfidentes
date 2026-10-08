# Exclusão de beneficiário · Unimed Inconfidentes

Página web que gera o **Termo de comunicação de exclusão de beneficiário (AN.VEN.COM.008)** da Unimed Inconfidentes já preenchido, para colaboradores desligados da Cucinare Pro Alimentação Ltda (CNPJ 04.596.502/0068-95).

- Todo o processamento acontece no navegador: nenhum dado do colaborador é enviado para servidores.
- Ao anexar o TRCT em PDF (com texto), lê automaticamente nome, CPF, endereço e motivo do desligamento. PDF escaneado/foto → preenchimento manual.

## Regras aplicadas
- Contratante fixo, como no modelo.
- Nome completo (sem abreviações), CPF, endereço e telefone obrigatórios.
- Pergunta 1: sempre **Não**. Pergunta 2: em branco. Pergunta 3: pelo TRCT ou escolha manual. Perguntas 4 e 5: sempre **Não**.
- Data: Ouro Preto, dia/mês/ano do preenchimento.
- A empresa imprime, assina e carimba o termo e envia junto com o termo de rescisão.

Modelo em `modelos/termo-exclusao.pdf` (gerado a partir do .doc da operadora, ajustado para caber em 1 página).
