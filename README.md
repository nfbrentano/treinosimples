# Walkthrough: Backend Google Apps Script

Concluí a implementação do seu backend! Agora, você pode conectar sua planilha ao seu aplicativo PWA.

## 🚀 Como Deployar (Implantar)

1.  **Abra sua Planilha**: Vá ao Google Sheets e crie uma nova planilha.
2.  **Extensões**: No menu superior, clique em **Extensões > Apps Script**.
3.  **Colar o Código**: Apague o conteúdo do arquivo `Código.gs` e cole o conteúdo de [workout_api.gs](file:///Users/natanaelbrentano/.gemini/antigravity/brain/568d54f6-5bd4-4f2a-8c16-ab0294c2c2a0/workout_api.gs).
4.  **Implantar**:
    *   Clique no botão azul **Implantar > Nova implantação**.
    *   Tipo: **App da Web**.
    *   Descrição: `Backend Treino PWA`.
    *   Executar como: **Você (seu e-mail)**.
    *   Quem pode acessar: **Qualquer pessoa** (Essencial para o PWA).
5.  **Autorizar**: Clique em "Implantar" e siga os passos na tela para autorizar o script.
6.  **URL**: Copie a **URL do App da Web** gerada. Ela será algo como `https://script.google.com/macros/s/.../exec`.

---

## 📋 Estrutura da Planilha

Certifique-se de que a aba do aluno tenha o nome do seu CPF (ex: `12345678900`) e siga este layout:

| A (Exercício) | B (Link GIF) | C (Tipo) | D (Data 1) | ... |
| :--- | :--- | :--- | :--- | :--- |
| Agachamento | [Link] | A | Sim | |
| Supino | [Link] | B | | |

> [!NOTE]
> O script cria automaticamente a coluna com a data de hoje se ela não existir.

---

## 🔌 Uso da API

### 1. Carregar Treinos (GET)
Use esta URL para buscar os treinos do dia:
`SUA_URL_AQUI/exec?cpf=12345678900`

**Resposta de Exemplo:**
```json
{
  "treinoA": [
    { "exercicio": "Agachamento", "gif": "...", "concluido": true }
  ],
  "treinoB": [...]
}
```

### 2. Marcar como Concluído (POST)
Envie um JSON no corpo da requisição:
```json
{
  "cpf": "12345678900",
  "exercicio": "Agachamento",
  "concluido": true
}
```

---

## 🛠️ O que foi feito
- [x] **doGet**: Lê a aba do CPF, valida se existe e retorna JSON agrupado por Treino A/B.
- [x] **doPost**: Atualiza a célula correspondente ao exercício e data com "Sim" ou limpa o valor.
- [x] **Automação de Datas**: O script identifica a data atual e cria colunas conforme necessário.
- [x] **CORS & JSON**: Respostas formatadas corretamente para consumo web.
