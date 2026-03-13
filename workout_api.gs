/**
 * API para Aplicativo de Treinos PWA (Google Sheets Backend)
 * 
 * Este script deve ser implantado como um "Web App" (App da Web).
 * Configurações de Implantação:
 * - Executar como: Você
 * - Quem pode acessar: Qualquer pessoa
 */

/**
 * Função GET: Carrega os treinos ou estatísticas de um aluno baseado no CPF.
 * URL Exemplo: .../exec?cpf=12345678900&action=getStats
 */
function doGet(e) {
  try {
    let cpf = e.parameter.cpf;
    const action = e.parameter.action; // 'getStats' ou padrão (getWorkouts)

    if (!cpf) {
      return jsonResponse({ error: "Parâmetro 'cpf' é obrigatório." }, 400);
    }
    
    cpf = normalizeCpf(cpf);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(cpf);

    if (!sheet) {
      return jsonResponse({ error: "Acesso indevido (CPF " + cpf + " não cadastrado)." }, 404);
    }

    // Se a ação for estatísticas
    if (action === 'getStats') {
      return getStudentStats(cpf, ss, sheet);
    }

    // Comportamento padrão: Retornar exercícios do dia
    return getStudentWorkouts(cpf, ss, sheet);

  } catch (err) {
    return jsonResponse({ error: err.toString() }, 500);
  }
}

/**
 * Lógica para buscar exercícios e progresso do dia.
 */
function getStudentWorkouts(cpf, ss, sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return jsonResponse({ error: "Nenhum dado de treino encontrado nesta aba." }, 404);
  }

  const todayStr = getNormalizedDate(new Date(), ss);
  const historySheet = getOrCreateHistorySheet(ss);
  historySheet.getRange("B:B").setNumberFormat("@");
  const historyData = historySheet.getDataRange().getDisplayValues();
  
  const completedToday = new Set();
  for (let i = 1; i < historyData.length; i++) {
      const row = historyData[i];
      const rowDateDisplay = String(row[0]).split(' ')[0];
      const rowCpf = normalizeCpf(row[1]);
      const rowEx = String(row[2]).trim().toUpperCase();
      const rowStatus = String(row[4]).trim().toUpperCase();

      if (rowDateDisplay === todayStr && rowCpf === cpf && rowStatus === "SIM") {
          completedToday.add(rowEx);
      }
  }

  const workouts = {};
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const exercicio = String(row[0]).trim();
    if (!exercicio) continue;

    const exercicioUpper = exercicio.toUpperCase();
    const gif = row[1];
    const tipo = String(row[2]).toUpperCase().trim();
    const instrucoes = row[3];
    const concluido = completedToday.has(exercicioUpper);

    const item = { exercicio, gif, tipo, instrucoes, concluido };
    if (!workouts[tipo]) workouts[tipo] = [];
    workouts[tipo].push(item);
  }

  return jsonResponse({ workouts });
}

/**
 * Lógica para calcular estatísticas (Streak, Total Mensal, Calendário).
 */
function getStudentStats(cpf, ss, sheet) {
  const historySheet = getOrCreateHistorySheet(ss);
  const historyData = historySheet.getDataRange().getDisplayValues();
  
  // Meta Semanal da Célula G1 (Padrão: 3)
  let weeklyGoal = sheet.getRange("G1").getValue();
  if (!weeklyGoal || isNaN(weeklyGoal)) weeklyGoal = 3;

  const trainedDays = new Set(); // Conjunto de datas únicas "dd/MM/yyyy"
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  let monthlyTotal = 0;

  for (let i = 1; i < historyData.length; i++) {
    const row = historyData[i];
    const rowCpf = normalizeCpf(row[1]);
    if (rowCpf !== cpf) continue;

    const rowFullDateStr = String(row[0]); // "dd/MM/yyyy HH:mm:ss"
    const rowDateStr = rowFullDateStr.split(' ')[0]; // "dd/MM/yyyy"
    
    if (String(row[4]).trim().toUpperCase() === "SIM") {
      trainedDays.add(rowDateStr);
    }
  }

  // Conta dias únicos no mês atual
  trainedDays.forEach(dateStr => {
    const parts = dateStr.split('/');
    const m = parseInt(parts[1]) - 1;
    const y = parseInt(parts[2]);
    if (m === currentMonth && y === currentYear) {
      monthlyTotal++;
    }
  });

  // Cálculo da Ofensiva (Streak)
  let streak = 0;
  let checkDate = new Date();
  checkDate.setHours(0, 0, 0, 0);

  // Se não treinou hoje, verifica se treinou ontem para manter a streak viva
  const todayStr = getNormalizedDate(checkDate, ss);
  if (!trainedDays.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (trainedDays.has(getNormalizedDate(checkDate, ss))) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return jsonResponse({
    streak: streak,
    monthlyTotal: monthlyTotal,
    weeklyGoal: weeklyGoal,
    calendarData: Array.from(trainedDays),
    monthName: getMonthName(currentMonth)
  });
}

/**
 * Função POST: Salva o progresso do treino no histórico centralizado.
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const cpf = normalizeCpf(payload.cpf);
    
    let exerciciosParaAtualizar = [];
    if (payload.exercicios && Array.isArray(payload.exercicios)) {
      exerciciosParaAtualizar = payload.exercicios;
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const historySheet = getOrCreateHistorySheet(ss);
    historySheet.getRange("B:B").setNumberFormat("@");
    
    const now = new Date();
    const timestamp = Utilities.formatDate(now, ss.getSpreadsheetTimeZone(), "dd/MM/yyyy HH:mm:ss");

    exerciciosParaAtualizar.forEach(item => {
      if (item.concluido) {
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
 * Helpers
 */
function normalizeCpf(cpf) {
  let s = String(cpf).replace(/\D/g, '');
  while (s.length < 11 && s.length > 0) s = '0' + s;
  return s;
}

function getOrCreateHistorySheet(ss) {
  let sheet = ss.getSheetByName("HISTORICO");
  if (!sheet) {
    sheet = ss.insertSheet("HISTORICO");
    sheet.appendRow(["DATA/HORA", "CPF", "EXERCICIO", "TREINO", "STATUS"]);
    sheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#f3f3f3");
    sheet.getRange("B:B").setNumberFormat("@");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getNormalizedDate(date, ss) {
  try {
    return Utilities.formatDate(date, ss.getSpreadsheetTimeZone(), "dd/MM/yyyy");
  } catch(e) { return ""; }
}

function getMonthName(m) {
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return months[m];
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
