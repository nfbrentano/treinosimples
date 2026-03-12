/**
 * API para Aplicativo de Treinos PWA (Google Sheets Backend)
 * 
 * Este script deve ser implantado como um "Web App" (App da Web).
 * Configurações de Implantação:
 * - Executar como: Você
 * - Quem pode acessar: Qualquer pessoa
 */

/**
 * Função GET: Carrega os treinos de um aluno baseado no CPF.
 * URL Exemplo: .../exec?cpf=12345678900
 */
function doGet(e) {
  try {
    const cpf = e.parameter.cpf;
    if (!cpf) {
      return jsonResponse({ error: "Parâmetro 'cpf' é obrigatório." }, 400);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(cpf);

    if (!sheet) {
      return jsonResponse({ error: "Acesso indevido (CPF não cadastrado)." }, 404);
    }

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return jsonResponse({ error: "Nenhum dado de treino encontrado nesta aba." }, 404);
    }

    // Identifica ou cria a coluna de hoje
    const todayStr = getTodayDate();
    let dateColIndex = -1;
    const headerRow = data[0];

    // Procura a data de hoje a partir da Coluna D (índice 3)
    for (let i = 3; i < headerRow.length; i++) {
       const cellValue = headerRow[i];
       let colDateStr = "";
       
       if (cellValue instanceof Date) {
         colDateStr = Utilities.formatDate(cellValue, ss.getSpreadsheetTimeZone(), "dd/MM/yyyy");
       } else {
         colDateStr = String(cellValue);
       }

       if (colDateStr === todayStr) {
         dateColIndex = i;
         break;
       }
    }

    // Se não encontrou a data de hoje, adiciona uma nova coluna
    if (dateColIndex === -1) {
      dateColIndex = headerRow.length;
      sheet.getRange(1, dateColIndex + 1).setValue(todayStr);
      // Atualiza os dados locais para refletir a nova coluna (vazia por enquanto)
      headerRow[dateColIndex] = todayStr;
    }

    // Organiza os treinos por Tipo (A ou B)
    const result = {
      treinoA: [],
      treinoB: []
    };

    // Pula o cabeçalho (i=1)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const exercicio = row[0];
      const gif = row[1];
      const tipo = String(row[2]).toUpperCase();
      const status = row[dateColIndex];
      const concluido = (status === "Sim");

      const item = {
        exercicio: exercicio,
        gif: gif,
        concluido: concluido
      };

      if (tipo === "A") {
        result.treinoA.push(item);
      } else if (tipo === "B") {
        result.treinoB.push(item);
      }
    }

    return jsonResponse(result);

  } catch (err) {
    return jsonResponse({ error: err.toString() }, 500);
  }
}

/**
 * Função POST: Marca ou desmarca um exercício como concluído.
 * Payload JSON: { "cpf": "...", "exercicio": "...", "concluido": true, "data": "opcional" }
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const cpf = payload.cpf;
    const targetDate = payload.data || getTodayDate();
    
    // Lista de exercícios para atualizar
    let exerciciosParaAtualizar = [];
    
    if (payload.exercicios && Array.isArray(payload.exercicios)) {
      exerciciosParaAtualizar = payload.exercicios;
    } else if (payload.exercicio) {
      exerciciosParaAtualizar.push({
        nome: payload.exercicio,
        concluido: payload.concluido
      });
    }

    if (!cpf || exerciciosParaAtualizar.length === 0) {
      return jsonResponse({ error: "CPF e lista de exercícios são obrigatórios." }, 400);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(cpf);

    if (!sheet) {
      return jsonResponse({ error: "Aba do CPF não encontrada." }, 404);
    }

    const data = sheet.getDataRange().getValues();
    const headerRow = data[0];

    // 1. Achar a Coluna da Data
    let dateColIndex = -1;
    for (let i = 3; i < headerRow.length; i++) {
       const cellValue = headerRow[i];
       let colDateStr = "";
       
       if (cellValue instanceof Date) {
         colDateStr = Utilities.formatDate(cellValue, ss.getSpreadsheetTimeZone(), "dd/MM/yyyy");
       } else {
         colDateStr = String(cellValue);
       }

       if (colDateStr === targetDate) {
         dateColIndex = i;
         break;
       }
    }

    if (dateColIndex === -1) {
       dateColIndex = headerRow.length;
       sheet.getRange(1, dateColIndex + 1).setValue(targetDate);
    }

    // 2. Processar cada exercício
    const exerciseNamesInSheet = data.map(row => row[0]);
    
    exerciciosParaAtualizar.forEach(item => {
      const exerciseRowIndex = exerciseNamesInSheet.indexOf(item.nome);
      if (exerciseRowIndex !== -1) {
        const valueToSet = item.concluido ? "Sim" : "";
        sheet.getRange(exerciseRowIndex + 1, dateColIndex + 1).setValue(valueToSet);
      }
    });

    return jsonResponse({ success: true, message: "Status atualizado com sucesso." });

  } catch (err) {
    return jsonResponse({ error: err.toString() }, 500);
  }
}

/**
 * Helper: Formata a data de hoje como DD/MM/YYYY
 */
function getTodayDate() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Helper: Retorna a resposta no formato JSON com suporte a CORS.
 */
function jsonResponse(obj, status) {
  const output = ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  
  // O Google Apps Script Web App lida com CORS nativamente em redirecionamentos, 
  // mas ContentService retorna os headers corretos para consumo via fetch.
  return output;
}
