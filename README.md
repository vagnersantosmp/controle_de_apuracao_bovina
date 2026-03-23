# 🥩 Açougue Control - Sistema de Apuração e Gestão de Perdas

Um sistema web completo, responsivo e seguro focado no **gerenciamento de quebras, controle de perdas e visibilidade analítica** para grandes redes de açougues e supermercados.

Desenvolvido para transformar dados soltos em **inteligência de negócios (Business Intelligence)**, o sistema permite que a diretoria e os gerentes de prevenção compreendam exatamente onde, como e por que o desperdício de matéria-prima está ocorrendo, loja a loja e corte a corte.

---

## 🎯 Benefícios para a Empresa (Business Value)
Esta aplicação foi projetada do zero para focar no lucro operacional e na redução agressiva de custos (Save):

*   **Redução Imediata de Perdas (ROI Claro):** Ao criar um "Ranking de Perdas por Loja", o sistema gera gamificação e auditoria automática. Se a loja A perde 10% no Acém e a Loja B perde 2%, a empresa sabe exatamente onde atuar.
*   **Decisões Baseadas em Dados (Data-Driven):** Chega de achismos. O Dashboard mostra a evolução das perdas no tempo, permitindo cruzar eventos (ex: mudança de fornecedor ou equipe) com os índices de quebra.
*   **Padronização e Prevenção:** Com a exigência de justificar e lançar as apurações, inibe-se desvios, furtos e preparos amadores nas bancadas.
*   **Relatórios Automáticos para a Diretoria:** O gerador nativo de PDFs exporta apresentações prontas para reunião de conselho em 1 clique, poupando horas de trabalho manual em planilhas.

---

## ✨ Funcionalidades Principais

*   🔐 **Autenticação Padrão Bancário:** Login, recuperação de senha e gestão de usuários;
*   🛡️ **Sistema de Permissões (RBAC):** 
    *   **Lojas:** Só podem lançar as próprias quebras de carne e ver seu próprio histórico.
    *   **Administradores / Prevenção / Diretoria:** Têm visão global (Dashboard panorâmico da rede inteira).
*   📊 **Dashboard Analítico Multi-Filtros:**
    *   Filtros cruzados e dinâmicos (por Loja, por Corte, por Período de Datas Personalizado).
    *   Gráficos dinâmicos de Top 10 Cortes mais desperdiçados.
    *   Ranking das piores e melhores Lojas em eficiência.
    *   Gráfico Donut de classes de perda (Gordura, Osso, Sebo, etc).
*   🖨️ **Gerador Automático de Relatórios PDF:**
    *   Painel que adapta a interface em relatórios modulares A4 (Retrato ou Paisagem) perfeitos para impressão nativa.
*   ✏️ **Controle de Apurações:** Registro de pesagem inicial, recortes e cálculo automático da porcentagem gasta.

---

## 💻 Arquitetura e Tecnologias (Tech Stack)

A aplicação foi encomendada e construída usando o que existe de mais moderno no ecossistema JavaScript/TypeScript, focando em performance absurda e manutenibilidade a longo prazo.

**Frontend (Client-Side):**
*   **[React 18](https://react.dev/):** Biblioteca principal para renderização de interface reativa e performática.
*   **[TypeScript](https://www.typescriptlang.org/):** Tipagem estática rigorosa que previne bugs antes mesmo do código rodar.
*   **[Vite](https://vitejs.dev/):** Ferramenta de build de altíssima velocidade (Hot Module Replacement instantâneo).
*   **[Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/):** Design System robusto, moderno, com suporte nativo a Modo Escuro (Dark Mode).
*   **[React Query (TanStack)](https://tanstack.com/query/latest):** Cache Inteligente de requisições, `staleTime` global, invalidação de estados, reduzindo chamadas ao servidor.
*   **[Recharts](https://recharts.org/):** O motor de renderização de gráficos em tempo real (SVG-based).

**Backend As A Service (BaaS):**
*   **[Supabase](https://supabase.com/):** O backend de código aberto escalável (Baseado em PostgreSQL).
*   **PostgreSQL RLS (Row Level Security):** Regras de segurança gravadas direto no banco de dados. Um operador de loja NUNCA consegue ver os dados de outra loja, mesmo se tentasse invadir o código do navegador, garantindo segurança militar contra vazamento interno.
*   **RPCs (Remote Procedure Calls):** Algoritmos de média e ranqueamento rodam direto no servidor PostgreSQL para não sobrecarregar a internet do usuário de loja.

---

## 🚀 Como Executar Localmente (Para Desenvolvedores)

1. Clone este repositório:
```bash
git clone https://github.com/SEU-USUARIO/acougue-control.git
```

2. Instale as dependências:
```bash
npm install
```

3. Crie e preencha as chaves de ambiente:
Você deve renomear ou criar um arquivo `.env` na raiz do projeto com as credenciais do seu banco de dados Supabase:
```env
VITE_SUPABASE_URL=Sua_URL_Supabase
VITE_SUPABASE_ANON_KEY=Sua_Chave_Anon_Supabase
```

4. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

---
*Orgulhosamente planejado e desenvolvido por **Vagner Santos**. Focado em gerar valor e inteligência corporativa através de código estruturado e design profissional.*
