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
      return jsonResponse(getStudentStats(cpf, ss, sheet));
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

function getStudentStats(cpf, ss, sheet) {
  const historySheet = getOrCreateHistorySheet(ss);
  const historyRawData = historySheet.getDataRange().getValues(); // Usa valores reais (objetos Date)
  
  // Meta Semanal da Célula G1 ou G2 (Padrão: 3)
  // Alguns usuários colocam o rótulo em G1 e o número em G2
  let valG1 = sheet.getRange("G1").getValue();
  let valG2 = sheet.getRange("G2").getValue();
  let weeklyGoal = 3;

  function parseGoal(val) {
    if (val instanceof Date) return val.getDate();
    let num = parseInt(val);
    return isNaN(num) ? null : num;
  }

  weeklyGoal = parseGoal(valG1) || parseGoal(valG2) || 3;
  if (isNaN(weeklyGoal) || !weeklyGoal) weeklyGoal = 3;

  const uniqueTrainedDates = new Set(); // Conjunto de chaves "yyyy-mm-dd"
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  let monthlyTotal = 0;

  for (let i = 1; i < historyRawData.length; i++) {
    const row = historyRawData[i];
    const rowCpf = normalizeCpf(row[1]);
    if (rowCpf !== cpf) continue;

    // Garante que temos um objeto Date válido
    let rowDate = row[0];
    if (!(rowDate instanceof Date)) {
      // Tenta converter se for string (legado)
      rowDate = new Date(String(row[0]).replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1'));
    }
    
    if (isNaN(rowDate.getTime())) continue;

    // Chave única para o dia (para deduplicar treinos no mesmo dia)
    const dateKey = Utilities.formatDate(rowDate, "GMT-3", "yyyy-MM-dd");
    const concluido = String(row[4]).trim().toUpperCase() === "SIM";

    if (concluido) {
      uniqueTrainedDates.add(dateKey);
      
      // Conta treinos apenas do mês/ano atual
      if (rowDate.getMonth() === currentMonth && rowDate.getFullYear() === currentYear) {
        // Para o total do mês, ainda precisamos deduplicar por dia
        // Então calcularemos o total mensal a partir do Set final para ser mais seguro
      }
    }
  }

  // Prepara datas para o calendário (formato dd/MM/yyyy que o frontend espera)
  const calendarData = [];
  let weeklyTotal = 0;
  
  // Calcula o início da semana atual (Domingo)
  const sunday = new Date(now);
  const dayOfWeek = sunday.getDay(); // 0 (Dom) a 6 (Sab)
  const diff = sunday.getDate() - dayOfWeek; // Ajusta para Domingo
  sunday.setDate(diff);
  sunday.setHours(0, 0, 0, 0);

  uniqueTrainedDates.forEach(dateKey => {
    const parts = dateKey.split('-');
    const formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
    calendarData.push(formatted);
    
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));

    // Conta treinos apenas do mês/ano atual para o total mensal
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      monthlyTotal++;
    }

    // Treinos na semana atual (Domingo a Sábado)
    if (d >= sunday) {
      weeklyTotal++;
    }
  });

  // Cálculo da Ofensiva (Streak)
  let streak = 0;
  let checkDate = new Date();
  checkDate.setHours(0, 0, 0, 0);

  // Helper para comparar no formato yyyy-MM-dd
  const toKey = (d) => Utilities.formatDate(d, "GMT-3", "yyyy-MM-dd");

  // Se não treinou hoje, verifica se treinou ontem para manter a streak viva
  if (!uniqueTrainedDates.has(toKey(checkDate))) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (uniqueTrainedDates.has(toKey(checkDate))) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return {
    streak,
    monthlyTotal,
    weeklyTotal,
    weeklyGoal,
    monthName: getMonthName(currentMonth),
    calendarData
  };
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
