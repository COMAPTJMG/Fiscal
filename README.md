<div align="center">

# ⚖️ TJMG Fiscal PWA

**Sistema de Fiscalização Predial do Tribunal de Justiça de Minas Gerais**

[![Versão](https://img.shields.io/badge/versão-v79b-003580?style=for-the-badge)](https://comaptjmg.github.io/Fiscal/)
[![PWA](https://img.shields.io/badge/PWA-offline--first-16a34a?style=for-the-badge&logo=pwa)](https://comaptjmg.github.io/Fiscal/)
[![Supabase](https://img.shields.io/badge/Supabase-backend-3ecf8e?style=for-the-badge&logo=supabase)](https://supabase.com)
[![Licença](https://img.shields.io/badge/licença-privado-dc2626?style=for-the-badge)](/)

[**🔗 Acessar o Sistema**](https://comaptjmg.github.io/Fiscal/) · [**📋 Contrato CT-017/2026**](#contratos) · [**📖 Documentação**](#arquitetura)

</div>

---

## 📌 Sobre o Sistema

O **TJMG Fiscal** é um Progressive Web App (PWA) desenvolvido para apoiar a fiscalização e gestão da **manutenção predial** dos imóveis do Tribunal de Justiça de Minas Gerais. O sistema digitaliza e centraliza o processo de inspeção técnica, geração de relatórios e controle contratual das empresas prestadoras de serviço em todas as **7 regiões administrativas** do TJMG.

### Contexto institucional

| Campo | Detalhe |
|---|---|
| **Órgão** | Tribunal de Justiça de Minas Gerais — TJMG |
| **Setor** | Coordenadoria de Manutenção Predial — COMAPT |
| **Referência normativa** | NBR 5674 (Manutenção de Edificações), Lei 14.133/2021 |
| **Contratos fiscalizados** | CT 017/2026 · CT 025/2026 · CT 019/2026 · CT 018/2026 · CT 392/2022 · CT 138/2023 · CT 421/2022 |
| **Empresa principal** | RENOVA ENGENHARIA (região Norte) |

---

## 🗺️ Regiões e Contratos

```
NORTE       → CT 017/2026 — RENOVA ENGENHARIA
CENTRAL     → CT 025/2026
LESTE       → CT 019/2026
ZONA DA MATA→ CT 018/2026
TRIÂNGULO   → CT 392/2022
SUL         → CT 138/2023
SUDOESTE    → CT 421/2022
```

---

## ✨ Funcionalidades

### 📋 Relatórios de Inspeção

| Tipo | Sigla | Descrição |
|---|---|---|
| Manutenção Periódica | RITMP | Inspeção trimestral/semestral por grupo A/B/C |
| Emergencial | RITE | Atendimento a chamados urgentes (OSE) |
| Programada | RITP | Execução de atividades programadas |
| Fachada | — | Inspeção visual de fachadas por face |
| SPDA | — | Para-raios: inspeção visual + medições de resistência |
| Laudos / Prontuários | — | Documentação técnica, laudos e diagramas |
| Subestação | Anexo B.1 | Inspeção e checklist de subestações elétricas |
| Abertura de OS | OSP | Abertura formal de Ordem de Serviço Programada |

### 🏛️ Perfis de Acesso

- **Fiscal** — cria, preenche e finaliza relatórios de sua região
- **Coordenador** — visão de todas as inspeções, dashboard, exportação em massa
- **Administrador** — gerência de usuários, acesso completo

### 📱 Recursos Mobile-First

- ✅ **Offline-first** — funciona sem internet, sincroniza ao reconectar
- ✅ **Ditado por voz** (🎙️) em todos os campos longos
- ✅ **Anotação em fotos** (seta, círculo, texto) diretamente no app
- ✅ **Swipe** nos rascunhos — deslizar para excluir ou duplicar
- ✅ **Busca global** unificada por edificação, comarca e OS
- ✅ **Web Share API** — compartilhar relatório via WhatsApp/e-mail em 1 toque
- ✅ **Instalável** como app nativo (Add to Home Screen)

### 📊 Gestão e Controle

- 📊 **Dashboard coordenador** — KPIs, conformidade, top fiscais
- 🗺️ **Mapa interativo** (Leaflet) com 115 comarcas de MG
- 📈 **Cálculo IMR** — Índice de Medição de Resultado ponderado por tipo
- 🏛️ **Prontuário por edificação** (NBR 5674) com histórico completo
- 📅 **Agenda** de próximas vistorias obrigatórias (60 dias)
- 📊 **Comparativo** de conformidade entre vistorias da mesma edificação

### 📄 Documentos Gerados Automaticamente

- `HTML` e `PDF` por relatório ou em massa (ZIP)
- **NOT-INA** — Notificação de Inadequação (com numeração sequencial)
- **ROC** — Registro de Ocorrência Contratual
- **Boletim de Medição** com cálculo de IMR e glosa

---

## 🏗️ Arquitetura

### Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Frontend** | Vanilla JS (ES5/ES6), sem framework, sem bundler |
| **Persistência local** | `localStorage` (boot rápido) + IndexedDB (store primário) |
| **Backend** | Supabase (PostgreSQL + Edge Functions) |
| **Autosave** | Ciclo de 5 segundos com hash determinístico |
| **Sync** | Edge Function `tjmg-sync` (GET /pull · POST /push) |
| **Deploy** | GitHub Pages |
| **Service Worker** | Cache-first para assets, network-first para dados |
| **Design** | Sistema próprio `design.css` — DM Sans, tokens CSS, safe-area |

### Estrutura de Arquivos

```
📦 Fiscal/
├── 🏠 index.html              # Shell PWA + funções utilitárias
├── ⚙️  config.js               # Constantes, versão, credenciais
├── 📊  data.js                 # MATS (1070), ATVs (48), PCI_DATA (161), EDIFICACOES
├── 🗃️  state.js                # Estado global S, F, US + URLs Supabase
├── 🔧  utils.js                # Helpers: voz, swipe, GC fotos, IMR, agendas
├── 💾  db.js                   # IndexedDB + autosave + monitor de sessão
├── 📸  photo-store.js          # Fotos offline (IndexedDB)
├── 🔄  sync.js                 # Pull/push Supabase + blacklist de deleções
├── 🔐  auth.js                 # Login PIN, dashboard coordenador, exportações
├── 🧭  router.js               # Navegação SPA + bottom nav (5 abas)
├── 📝  report-html.js          # Geração do relatório HTML
├── 📄  report-pdf.js           # Exportação PDF via iframe
├── 👔  admin.js                # Painel admin, gestão de usuários
├── 📋  form.js                 # Formulário completo de inspeção
├── 🗺️  map.js                  # Mapa Leaflet com marcadores por comarca
├── 📍  coords.js               # Coordenadas geográficas das 115 comarcas MG
├── 📈  imr.js                  # Cálculo IMR ponderado + Boletim de Medição
├── 🏛️  prontuario-edif.js      # Prontuário por edificação (NBR 5674)
├── ✏️  photo-annotate.js       # Anotação em canvas sobre fotos
├── 🔍  audit.js                # Log de auditoria local + Supabase
├── 🎨  design.css              # Sistema de design mobile-first TJMG
├── ⚡  sw.js                   # Service Worker (cache key tjmg-v79b)
├── 📱  manifest.json           # PWA manifest
└── 🗄️  00_SCHEMA_v79b_AUTH_RLS.sql  # Schema Supabase + RLS + Auth
```

### Ordem de Carregamento (obrigatória)

```
config.js → data.js → state.js → photo-store.js → sync.js → db.js
  → utils.js → report-html.js → report-pdf.js → router.js → auth.js
  → admin.js → form.js → coords.js → map.js → imr.js
  → prontuario-edif.js → photo-annotate.js → audit.js
```

> **Regra de dependência:** nunca importar `state.js` em `data.js` ou `config.js`. Dependências somente na direção `config → data → state → demais`.

---

## 🗄️ Banco de Dados (Supabase)

**Projeto:** `rrlhtnwdokqbtkwrlsfa`

### Tabelas Principais

| Tabela | Descrição |
|---|---|
| `inspections` | Payload completo de cada inspeção (JSONB) |
| `app_users` | Usuários do app com PIN e dados de região |
| `audit_log` | Log de ações sensíveis (exportar, deletar, login) |
| `push_subscriptions` | Subscrições Web Push por usuário |
| `imr_snapshots` | Histórico mensal de IMR por região |

### Funções RPC

| Função | Descrição |
|---|---|
| `upsert_inspections(rows JSONB)` | Upsert em lote com merge por `updated_at` |
| `criar_auth_para_app_user(id)` | Migra fiscal para Supabase Auth |

### Row Level Security (RLS)

- **Fiscal autenticado** vê apenas inspeções da própria região
- **Coordenador/Admin** tem acesso irrestrito
- **service_role** usado pelas Edge Functions para bypass seguro
- **anon** mantido para compatibilidade com o app antes da migração para Auth

---

## 👥 Usuários

| ID | Nome | Região | Polo |
|---|---|---|---|
| u1 | Edenias Gonzaga Leão | NORTE | Montes Claros |
| u2 | Túlio Heleno L. Lobato | NORTE | Montes Claros |
| u3 | Jarém Guarany Gomes Jr. | CENTRAL | Contagem |
| u4 | Luís Cláudio F. Cunha | CENTRAL | Betim |
| u5 | Márcia Gomes Alvarenga | LESTE | Gov. Valadares |
| u6 | Guilherme A. Alencar | LESTE | Ipatinga |
| u7 | Rui Cassiano R. Lima | LESTE | Itabira |
| u8 | José Agostinho H. R. Assunção | ZONA_MATA | Juiz de Fora |
| u9 | Thiago Abreu | ZONA_MATA | Juiz de Fora |
| u10 | Alisson Cruz Pereira | TRIANGULO | — |
| u11 | Flávio Ferreira Ribeiro | TRIANGULO | — |
| u12 | Raphael Alan Ferreira | SUL | — |
| u13 | Diego Henrique C. Oliveira | SUL | — |
| u14 | Vanderlúcio de Jesus Ferreira | SUDOESTE | — |
| u15 | Taciano de Paula Costa Bastos | SUDOESTE | — |

---

## 🔐 Segurança

> ⚠️ **Ação pendente:** migrar credenciais admin/coord de `config.js` para Supabase Auth + definir `SYNC_SECRET` na Edge Function.

### Passos para produção segura

1. **Executar** `00_SCHEMA_v79b_AUTH_RLS.sql` no SQL Editor do Supabase
2. **Descomente o Bloco 15** do SQL para migrar os 15 fiscais para Supabase Auth
3. **Definir** `SYNC_SECRET` em Supabase → Edge Functions → Secrets:
   ```bash
   openssl rand -base64 32
   ```
4. **Atualizar** `SYNC_SECRET` em `state.js` com o mesmo valor
5. **Revogar** credenciais hardcoded em `config.js` após migração

---

## 📦 Dados Mestres

| Dado | Qtd | Fonte | Arquivo |
|---|---|---|---|
| **MATS** — materiais e serviços | 1.070 itens | Anexo H do contrato | `data.js` |
| **ATVs** — atividades de manutenção | 48 atividades | Anexo B do contrato | `data.js` |
| **PCI_DATA** — controle de extintores | 161 registros | Região Norte | `data.js` |
| **EDIFICACOES** — imóveis do TJMG | 169 registros | Todas as 7 regiões | `data.js` |
| **COMARCA_COORDS** — coordenadas geográficas | 115 comarcas | IBGE / OpenStreetMap | `coords.js` |

---

## 🚀 Deploy e Configuração

### Pré-requisitos

- Conta no [Supabase](https://supabase.com) com projeto configurado
- GitHub Pages habilitado no repositório

### Variáveis de ambiente (em `state.js`)

```js
var SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
var SUPABASE_ANON_KEY = 'sua-anon-key';
var EDGE_SYNC_URL = 'https://SEU-PROJETO.supabase.co/functions/v1/tjmg-sync';
var SYNC_SECRET = 'seu-segredo-forte';  // ⚠ obrigatório em produção
```

### Atualizar versão (sempre sincronizar 3 arquivos)

```js
// config.js
var APP_VERSION = 'v80';

// sw.js
const V = 'tjmg-v80';

// manifest.json
"start_url": "./index.html?v=80"
```

---

## 📐 Cálculo IMR

O **Índice de Medição de Resultado** é calculado conforme o CT-017/2026, com pesos por tipo de serviço:

| Tipo | Peso |
|---|---|
| Manutenção Periódica | 40% |
| Manutenção Programada | 30% |
| Emergencial (OSE) | 20% |
| Subestação | 5% |
| Prontuários | 3% |
| Fachada + SPDA | 2% |

### Faixas de glosa

| IMR | Classificação | Glosa |
|---|---|---|
| ≥ 90% | Ótimo | 0% |
| 80–90% | Bom | 5% |
| 70–80% | Regular | 10% |
| 60–70% | Insuficiente | 15% |
| < 60% | Crítico | 20% |

---

## 🔄 Changelog

| Versão | Principais mudanças |
|---|---|
| **v79b** | Mapa Leaflet (115 comarcas), IMR, prontuário NBR 5674, anotação em foto, log de auditoria, SQL Auth+RLS |
| **v79** | 23 melhorias: voz, swipe, agenda, busca global, ZIP export, NOT-INA, ROC, comparativo, Web Share, Background Sync |
| **v78** | Design system mobile-first, seleção múltipla (fiscal/coord/admin), modularização Fase 5 (admin.js + form.js), dashboard coord |
| **v71** | Versão inicial em produção — 8 tipos de relatório, sync Supabase, 15 fiscais |

---

## 📎 Links Úteis

- 🔗 [Sistema em produção](https://comaptjmg.github.io/Fiscal/)
- 🗃️ [Dashboard Emergencial (Google Sheets)](https://script.google.com/a/macros/tjmg.jus.br/s/AKfycbw6mdSZgqgx6QXzaJHicq-kOkfFiHgIuwyIpkJ5AceVNhPx3407DPA6S4aLImPD6iyz/exec)
- 🧯 [Controle PCI Norte](https://script.google.com/a/macros/tjmg.jus.br/s/AKfycbyZqfhmkI2HzZ_y8Y6UzIWvmPmKD_v3M-vC7za-N68M2fb1Wxx6qFUM-jKUedbU-LT3/exec)
- 📋 [Formulário OSE (Google Forms)](https://docs.google.com/forms/d/e/1FAIpQLSdFA3STupTnP3qFWX_3MXYhWXBl04VEBp4JbaPpfjIkT2QsDg/viewform)

---

<div align="center">

**TJMG Fiscal v79b** — Coordenadoria de Manutenção Predial  
Tribunal de Justiça de Minas Gerais · 2026

*Desenvolvido internamente pela equipe COMAPT/TJMG*

</div>
