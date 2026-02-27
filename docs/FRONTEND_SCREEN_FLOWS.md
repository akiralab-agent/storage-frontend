# Frontend: Fluxos de Telas (Leads e Tenants)

Este documento descreve como organizar as telas no frontend para operar o funil:

- CRUD de Leads
- Conversao de Lead para Tenant
- CRUD de Tenants

## Visao geral de navegacao

1. `Login`
2. `Selecao de Facility`
3. `Dashboard Comercial` (atalhos para Leads, Tenants, Units)
4. `Leads` (lista/kanban + CRUD)
5. `Lead Detalhe` (edicao + historico)
6. `Converter Lead` (wizard)
7. `Tenants` (lista + CRUD)
8. `Tenant Detalhe 360`

## Fluxo 1: CRUD de Leads -> Conversao -> CRUD de Tenants

### Tela 1: Lista de Leads

Objetivo:

- visualizar pipeline e filtrar leads.

Componentes:

- busca (`q`)
- filtros (`stage`, `owner_id`)
- botao `Novo Lead`
- tabela ou kanban por stage
- acao rapida `Converter`

API:

- `GET /api/v1/leads/` com `X-Facility-ID`

### Tela 2: Criar Lead

Objetivo:

- cadastrar oportunidade.

Campos minimos recomendados:

- `first_name`
- `last_name`
- `email`
- `phone_primary`
- `source`
- `stage`
- `owner` (opcional)

API:

- `POST /api/v1/leads/`

Pos-acao:

- voltar para lista com toast `Lead criado`.

### Tela 3: Editar Lead

Objetivo:

- atualizar estagio e dados de contato.

API:

- `GET /api/v1/leads/{id}/`
- `PATCH /api/v1/leads/{id}/`
- `DELETE /api/v1/leads/{id}/` (com confirmacao)

Regras UX:

- se `stage = WON` e nao convertido, mostrar CTA `Converter para Inquilino`.
- se ja convertido (`converted_tenant`), exibir link para Tenant.

### Tela 4: Wizard de Conversao de Lead

Objetivo:

- transformar lead em tenant e contrato draft.

Passos:

1. `Dados do Inquilino`
2. `Selecao de Unidade`
3. `Termos do Contrato`
4. `Confirmacao`

APIs:

- `GET /api/v1/inventory/units/` (listar unidades da facility)
- `POST /api/v1/leads/{id}/convert/`

Payload de conversao:

- bloco `tenant`
- bloco `contract` (`unit`, `move_in`, `move_out`, `terms`)

Pos-acao:

- navegar para `Tenant Detalhe 360` com `tenant.id` retornado.

### Tela 5: Lista de Tenants

Objetivo:

- gerenciar base de inquilinos ativos/historicos.

API:

- `GET /api/v1/tenants/`
- `POST /api/v1/tenants/` (quando criar direto sem lead)

### Tela 6: Editar Tenant

Objetivo:

- atualizar cadastro.

API:

- `GET /api/v1/tenants/{id}/`
- `PATCH /api/v1/tenants/{id}/`
- `DELETE /api/v1/tenants/{id}/`

### Tela 7: Tenant 360

Objetivo:

- operacao diaria do inquilino.

Tabs:

- `contracts`
- `invoices`
- `payments`
- `access`
- `tickets`
- `audit_logs`

API:

- `GET /api/v1/tenants/{id}/360/`

## Fluxo 2: Criacao de Leads (operacao comercial)

Este fluxo foca em velocidade de cadastro e acompanhamento.

### Tela A: Captura Rapida

Cenarios:

- atendimento telefonico
- recepcao
- campanha/manual

UI:

- modal simples com 5 campos (nome, telefone, email, origem, unidade de interesse opcional)
- submit em 1 clique

API:

- `POST /api/v1/leads/` com `stage=NEW`

### Tela B: Triagem de Leads Novos

UI:

- coluna `NEW` destacada
- acao em lote: atribuir owner, mudar para `CONTACTED`

API:

- `GET /api/v1/leads/?stage=NEW`
- `PATCH /api/v1/leads/{id}/`

### Tela C: Qualificacao

UI:

- checklist comercial (orcamento, prazo, tipo de unidade)
- timeline de contato
- proximo follow-up

API:

- `PATCH /api/v1/leads/{id}/` (`stage=QUALIFIED`/`PROPOSAL`)

### Tela D: Fechamento

UI:

- botoes:
  - `Marcar como WON`
  - `Marcar como LOST`
  - `Converter agora`

API:

- `PATCH /api/v1/leads/{id}/`
- `POST /api/v1/leads/{id}/convert/` (se WON)

## Fluxo 3: Criacao direta de Tenant (sem Lead)

Use quando o comercial nao precisa pipeline.

1. Tela `Tenants` -> botao `Novo Tenant`
2. Form de cadastro completo
3. Salvar tenant (`POST /api/v1/tenants/`)
4. Abrir `Tenant 360`
5. Opcional: fluxo de cobranca/acesso em modais laterais

## Estados de tela recomendados

Para todas as listas:

- `loading`
- `empty` (sem resultados)
- `error` (mensagem e retry)

Para formularios:

- validacao por campo
- resumo de erro no topo
- bloqueio de submit enquanto request em andamento

## Regras transversais obrigatorias

1. Sempre enviar:

- `Authorization: Bearer <token>`

2. Em rotas facility-scoped, sempre enviar:

- `X-Facility-ID: <facilityIdSelecionada>`

3. Tratar erros:

- `401`: renovar token
- `403 facility_required`: selecionar facility
- `403 permission`: esconder/disable acoes
- `400`: renderizar erros de validacao por campo

## Mapa de rotas frontend (sugestao)

- `/login`
- `/select-facility`
- `/dashboard`
- `/leads`
- `/leads/new`
- `/leads/:id`
- `/leads/:id/convert`
- `/tenants`
- `/tenants/new`
- `/tenants/:id`
- `/tenants/:id/360`
