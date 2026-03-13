# Guia: Backend Google Apps Script (Log Centralizado)

Este projeto utiliza um modelo de **Histórico Centralizado**, garantindo que o sistema seja escalável, rápido e fácil de gerenciar pelo Personal Trainer.

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
O script lê as colunas de A a D. Não é necessário criar colunas de data aqui.

| A (Exercício) | B (Link GIF/MP4) | C (Tipo) | D (Instruções) |
| :--- | :--- | :--- | :--- |
| Agachamento | [Link] | A | 4x12 pesados |
| Supino | [Link] | B | 3x10 lento |
| Smith Machine | [Link] | C | 3x15 reps |

### Aba HISTORICO (Criada Automaticamente)
Onde todos os treinos concluídos são registrados verticalmente:
| DATA/HORA | CPF | EXERCICIO | TREINO | STATUS |
| :--- | :--- | :--- | :--- | :--- |
| 12/03/2026 21:30 | 123... | Agachamento | A | SIM |

---

## 🔌 Uso da API

URL Base: `https://script.google.com/macros/s/AKfycbwnj6G5k-AxCVeWng252LJJhGgVm551llXwT3JiiZil3l_KTo-1vczNdnec9xnWFeFADQ/exec`

### 1. Carregar Treinos (GET)
`...?cpf=12345678900`
O sistema agrupa os exercícios por tipo (A, B, C...) e verifica na aba `HISTORICO` o que já foi feito **hoje**.

### 2. Salvar Treino (POST)
Envia o status de todos os treinos para o log central.
```json
{
  "cpf": "12345678900",
  "exercicios": [
    { "nome": "Agachamento", "tipo": "A", "concluido": true },
    { "nome": "Supino", "tipo": "B", "concluido": false }
  ]
}
```

---

## 📱 Funcionalidades do PWA
- **Abas Dinâmicas**: Suporta de A a E automaticamente baseado na Coluna C.
- **Vídeo & GIF**: Reprodução automática para links `.mp4` na Coluna B.
- **Modo Offline**: O progresso é salvo no celular (`LocalStorage`) e sincronizado ao clicar em "Salvar".
- **Histórico Escalável**: O Personal Trainer pode gerar relatórios de todos os alunos filtrando uma única aba.

---

## 🛠️ Manutenção
Se você adicionar um novo exercício ou mudar o treino de um aluno, basta editar a aba correspondente ao CPF dele. O aplicativo refletirá a mudança na próxima vez que for carregado.
