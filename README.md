# Guia: Backend Google Apps Script (Log Centralizado & Estatísticas)

Este projeto utiliza um modelo de **Histórico Centralizado**, garantindo que o sistema seja escalável, rápido e fácil de gerenciar pelo Personal Trainer. Além disso, conta com um Painel de Estatísticas moderno.

## 🚀 Como Deployar (Implantar)

1.  **Abra sua Planilha**: Vá ao Google Sheets e certifique-se de que os CPFs dos alunos sejam os nomes das abas.
2.  **Extensões**: No menu superior, clique em **Extensões > Apps Script**.
3.  **Colar o Código**: Apague tudo no editor e cole o conteúdo de [workout_api.gs](file:///Users/natanaelbrentano/treinosimples/workout_api.gs).
4.  **Implantar**:
    *   Clique em **Implantar > Nova implantação**.
    *   Tipo: **App da Web**.
    *   Executar como: **Você**.
    *   Quem pode acessar: **Qualquer pessoa**.
5.  **Autorizar**: Siga os passos na tela e copie a **URL do App da Web**.

---

## 📋 Estrutura da Planilha

### Abas dos Alunos (Nomeadas com o CPF)
O script lê as colunas de A a D. Use a **Célula G1** para definir a meta semanal.

| A (Exercício) | B (Link GIF/MP4) | C (Tipo) | D (Instruções) | ... | G1 (Meta Semanal) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Agachamento | [Link] | A | 4x12 pesados | | **4** |
| Supino | [Link] | B | 3x10 lento | | |

### Aba HISTORICO (Criada Automaticamente)
Onde todos os treinos concluídos são registrados verticalmente:
| DATA/HORA | CPF | EXERCICIO | TREINO | STATUS |
| :--- | :--- | :--- | :--- | :--- |
| 13/03/2026 10:15 | 123... | Agachamento | A | SIM |

---

## 🔌 Uso da API

URL Base: `https://script.google.com/macros/s/.../exec`

### 1. Carregar Treinos (GET)
`...?cpf=12345678900`
Retorna os exercícios agrupados por tipo (A, B, C...).

### 2. Carregar Estatísticas (GET)
`...?cpf=12345678900&action=getStats`
Retorna:
- `streak`: Ofensiva atual (dias seguidos).
- `monthlyTotal`: Total de treinos no mês atual.
- `weeklyGoal`: Meta definida na célula G1.
- `calendarData`: Lista de datas treinadas para o calendário estilo GitHub.

### 3. Salvar Treino (POST)
Envia o status de todos os treinos para o log central.

---

## 📱 Funcionalidades do PWA
- **Painel de Estatísticas**: Visualização estilo GitHub para consistência de hábitos.
- **Cálculo de Ofensiva**: Mantém o aluno motivado com o contador de dias seguidos.
- **Abas Dinâmicas**: Suporta automaticamente as categorias definidas na Coluna C.
- **Vídeo & GIF**: Reprodução automática para links `.mp4` na Coluna B.
- **CPF Seguro**: Suporte nativo para CPFs que começam com zero, tratando-os sempre como texto.

---

## 🛠️ Manutenção
Para mudar a meta de um aluno, basta alterar o número na **Célula G1** da aba dele. O App de Estatísticas atualizará a barra de progresso e as mensagens motivacionais automaticamente.
