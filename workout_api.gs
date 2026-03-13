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
    const todayStr = getNormalizedDate(new Date(), ss);
    let dateColIndex = -1;
    const headerRowDisplay = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getDisplayValues()[0];

    // Procura a data de hoje a partir da Coluna E (índice 4)
    for (let i = 4; i < headerRowDisplay.length; i++) {
       const colDateStr = headerRowDisplay[i].trim();
       if (colDateStr === todayStr) {
         dateColIndex = i;
         break;
       }
    }

    // Se não encontrou a data de hoje, adiciona uma nova coluna
    if (dateColIndex === -1) {
      dateColIndex = headerRowDisplay.length;
      if (dateColIndex < 4) dateColIndex = 4; // Garante que comece no mínimo em E
      sheet.getRange(1, dateColIndex + 1).setValue(todayStr); // Salva como string dd/MM/yyyy
    }

    // Organiza os treinos por Tipo (A, B, C, D, E...)
    const workouts = {};

    // Pula o cabeçalho (i=1)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const exercicio = String(row[0]).trim();
      if (!exercicio) continue; // Pula linhas vazias

      const gif = row[1];
      const tipo = String(row[2]).toUpperCase().trim();
      const instrucoes = row[3]; // Coluna D
      const status = row[dateColIndex];
      const concluido = (status === "Sim");

      const item = {
        exercicio: exercicio,
        gif: gif,
        tipo: tipo,
        instrucoes: instrucoes,
        concluido: concluido
      };

      if (!workouts[tipo]) {
        workouts[tipo] = [];
      }
      workouts[tipo].push(item);
    }

    return jsonResponse({ workouts: workouts });

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
    const headerRowDisplay = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getDisplayValues()[0];
    const todayStr = getNormalizedDate(new Date(), ss);
    const targetDateStr = payload.data || todayStr;

    // 1. Achar a Coluna da Data (Iniciando na Coluna E/índice 4)
    let dateColIndex = -1;
    for (let i = 4; i < headerRowDisplay.length; i++) {
       const colDateStr = headerRowDisplay[i].trim();
       if (colDateStr === targetDateStr) {
         dateColIndex = i;
         break;
       }
    }

    if (dateColIndex === -1) {
       dateColIndex = headerRowDisplay.length;
       if (dateColIndex < 4) dateColIndex = 4;
       sheet.getRange(1, dateColIndex + 1).setValue(targetDateStr);
    }

    // 2. Limpar a coluna inteira para essa data (row 2 em diante)
    if (data.length > 1) {
      sheet.getRange(2, dateColIndex + 1, data.length - 1, 1).clearContent();
    }

    // 3. Processar cada exercício: buscar por Nome (Col A) e Tipo (Col C)
    // Cria chaves "NOME|TIPO" para todas as linhas
    const rowKeys = data.map(row => `${String(row[0]).trim().toUpperCase()}|${String(row[2]).trim().toUpperCase()}`);
    
    exerciciosParaAtualizar.forEach(item => {
      if (item.concluido) {
        const targetName = String(item.nome || item.exercicio).trim().toUpperCase();
        const targetType = String(item.tipo).trim().toUpperCase();
        const targetKey = `${targetName}|${targetType}`;
        
        const exerciseRowIndex = rowKeys.indexOf(targetKey);
        if (exerciseRowIndex !== -1) {
          sheet.getRange(exerciseRowIndex + 1, dateColIndex + 1).setValue("Sim");
        }
      }
    });

    return jsonResponse({ success: true, message: "Treino enviado ao Personal Trainer" });

  } catch (err) {
    return jsonResponse({ error: err.toString() }, 500);
  }
}

/**
 * Helper: Formata uma data para o padrão dd/MM/yyyy usando a timezone da planilha.
 */
function getNormalizedDate(date, ss) {
  return Utilities.formatDate(date, ss.getSpreadsheetTimeZone(), "dd/MM/yyyy");
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
