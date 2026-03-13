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
    let cpf = e.parameter.cpf;
    if (!cpf) {
      return jsonResponse({ error: "Parâmetro 'cpf' é obrigatório." }, 400);
    }
    
    // Normaliza o CPF para string de 11 dígitos (reconstrói zeros à esquerda se necessário)
    cpf = normalizeCpf(cpf);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(cpf);

    if (!sheet) {
      return jsonResponse({ error: "Acesso indevido (CPF " + cpf + " não cadastrado)." }, 404);
    }

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return jsonResponse({ error: "Nenhum dado de treino encontrado nesta aba." }, 404);
    }

    // Identifica o histórico de hoje
    const todayStr = getNormalizedDate(new Date(), ss);
    const historySheet = getOrCreateHistorySheet(ss);
    
    // Garante que a coluna de CPF no historico seja texto
    historySheet.getRange("B:B").setNumberFormat("@");
    
    const historyData = historySheet.getDataRange().getDisplayValues(); // Usa display values para não perder zeros à esquerda
    
    // Filtra exercícios concluídos hoje para este CPF
    const completedToday = new Set();
    for (let i = 1; i < historyData.length; i++) {
        const row = historyData[i];
        // Col 0: Data/Hora, Col 1: CPF, Col 2: Exercicio, Col 3: Treino, Col 4: Status
        const rowDateDisplay = String(row[0]).split(' ')[0]; // Pega apenas a parte da data (dd/MM/yyyy)
        const rowCpf = normalizeCpf(row[1]);
        const rowEx = String(row[2]).trim().toUpperCase();
        const rowStatus = String(row[4]).trim().toUpperCase();

        if (rowDateDisplay === todayStr && rowCpf === cpf && rowStatus === "SIM") {
            completedToday.add(rowEx);
        }
    }

    // Organiza os treinos por Tipo (A, B, C, D, E...)
    const workouts = {};

    // Pula o cabeçalho (i=1)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const exercicio = String(row[0]).trim();
      if (!exercicio) continue; // Pula linhas vazias

      const exercicioUpper = exercicio.toUpperCase();
      const gif = row[1];
      const tipo = String(row[2]).toUpperCase().trim();
      const instrucoes = row[3]; // Coluna D
      const concluido = completedToday.has(exercicioUpper);

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
 * Função POST: Salva o progresso do treino no histórico centralizado.
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const cpf = normalizeCpf(payload.cpf);
    
    // Lista de exercícios para atualizar
    let exerciciosParaAtualizar = [];
    if (payload.exercicios && Array.isArray(payload.exercicios)) {
      exerciciosParaAtualizar = payload.exercicios;
    } else if (payload.exercicio) {
      exerciciosParaAtualizar.push({
        nome: payload.exercicio,
        tipo: payload.tipo,
        concluido: payload.concluido
      });
    }

    if (!cpf || exerciciosParaAtualizar.length === 0) {
      return jsonResponse({ error: "CPF e lista de exercícios são obrigatórios." }, 400);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const historySheet = getOrCreateHistorySheet(ss);
    
    // Enforce Plain Text every time to be ultra-safe
    historySheet.getRange("B:B").setNumberFormat("@");
    
    const now = new Date();
    const timestamp = Utilities.formatDate(now, ss.getSpreadsheetTimeZone(), "dd/MM/yyyy HH:mm:ss");

    // Adiciona cada exercício concluído ao histórico
    exerciciosParaAtualizar.forEach(item => {
      if (item.concluido) {
        // Usa appendRow mas garante que os valores sejam tratados como strings
        // O prefixo ' força o Sheets a manter como texto
        historySheet.appendRow([
          timestamp,
          "'" + cpf, 
          item.nome || item.exercicio,
          item.tipo || "N/A",
          "SIM"
        ]);
      }
    });

    return jsonResponse({ success: true, message: "Treino enviado ao Personal Trainer" });

  } catch (err) {
    return jsonResponse({ error: err.toString() }, 500);
  }
}

/**
 * Helper: Normaliza o CPF para sempre ter 11 dígitos (string).
 */
function normalizeCpf(cpf) {
  let s = String(cpf).replace(/\D/g, '');
  while (s.length < 11 && s.length > 0) {
    s = '0' + s;
  }
  return s;
}

/**
 * Helper: Garante que a aba HISTORICO existe com o cabeçalho correto.
 */
function getOrCreateHistorySheet(ss) {
  let sheet = ss.getSheetByName("HISTORICO");
  if (!sheet) {
    sheet = ss.insertSheet("HISTORICO");
    sheet.appendRow(["DATA/HORA", "CPF", "EXERCICIO", "TREINO", "STATUS"]);
    sheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#f3f3f3");
    
    // Formata a coluna B (CPF) como Texto Simples
    sheet.getRange("B:B").setNumberFormat("@");
    
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Helper: Formata uma data para o padrão dd/MM/yyyy usando a timezone da planilha.
 */
function getNormalizedDate(date, ss) {
  try {
    return Utilities.formatDate(date, ss.getSpreadsheetTimeZone(), "dd/MM/yyyy");
  } catch(e) {
    return "";
  }
}

/**
 * Helper: Retorna a resposta no formato JSON.
 */
function jsonResponse(obj, status) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
