/**
 * Google Apps Script - Encuesta IHSS
 * Entrega de Medicamentos a Domicilio – San Pedro Sula (Satisfacción)
 *
 * Instrucciones:
 * 1. Crea una hoja de cálculo en Google Sheets.
 * 2. Crea una hoja llamada "RESPUESTAS" para guardar cada envío.
 * 3. Crea una hoja llamada "Configuracion" para guardar título, subtítulo y preguntas (opcional).
 * 4. En el editor de Apps Script: Archivo > Implementar como aplicación web > Ejecutar como "Yo", Quién tiene acceso "Cualquier persona".
 * 5. Copia la URL de la aplicación web y pégala en index.html en la variable SCRIPT_URL.
 */

var SPREADSHEET_ID = '1_OY_-T661zZeUBkRe3zfS4Pc1INPjq1nPBMXqAsJ-NM';

function getSpreadsheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch (e) {}
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (e) {
    throw new Error('La hoja de cálculo no se encontró. Abra el script desde su hoja: Extensiones > Apps Script, y vuelva a desplegar la aplicación web.');
  }
}

// Encabezados fijos: se escriben solo en la primera respuesta (fila 1). Todas las columnas existen desde el inicio.
var ENCABEZADOS = [
  'fecha',
  'genero',
  'edad',
  'relacion',
  'es_derechohabiente',
  'residencia',
  'conoce',
  'claridad',
  'medio',
  'canal_pref',
  'uso',
  'razon_no',
  'calif_puntualidad',
  'calif_estado',
  'calif_info',
  'calif_confianza',
  'prioridad',
  'mejora_com',
  'sugerencia'
];

function doGet(e) {
  var result = { result: 'success', data: [], config: null };
  try {
    var ss = getSpreadsheet();
    var sheetResp = getOrCreateSheet(ss, 'RESPUESTAS');
    var sheetConfig = ss.getSheetByName('Configuracion');

    // Leer respuestas existentes (para dashboard)
    var data = readResponses(sheetResp);
    result.data = data;

    // Leer configuración si existe
    if (sheetConfig) {
      var config = readConfig(sheetConfig);
      if (config) result.config = config;
    }
  } catch (err) {
    result.result = 'error';
    result.message = err.toString();
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var result = { result: 'error', message: '' };
  try {
    var params = getPostParams(e);
    var action = (params && params.action) ? String(params.action).trim() : '';

    if (action === 'save_response') {
      var ss = getSpreadsheet();
      var sheetResp = getResponseSheet(ss);
      appendResponse(sheetResp, params);
      return respondHtml('success', null);
    } else if (action === 'save_config') {
      var ss = getSpreadsheet();
      var sheetConfig = getOrCreateSheet(ss, 'Configuracion');
      var configData = params.configData || '';
      if (configData) {
        saveConfig(sheetConfig, configData);
        result.result = 'success';
      }
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return respondHtml('error', err.toString());
  }
  return respondHtml('error', 'Acción no reconocida');
}

function respondHtml(status, message) {
  var payload = { encuesta: status, message: message || null };
  var json = JSON.stringify(payload).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  var html = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script type="application/json" id="p">' + json + '</script><script>try{var d=document.getElementById("p").textContent;window.parent.postMessage(JSON.parse(d),"*");}catch(e){}</script>' + (status === 'success' ? 'OK' : 'Error') + '</body></html>';
  return ContentService.createTextOutput(html).setMimeType(ContentService.MimeType.HTML);
}

function getResponseSheet(ss) {
  var sheet = ss.getSheetByName('RESPUESTAS');
  if (sheet) return sheet;
  var sheets = ss.getSheets();
  if (sheets.length > 0) return sheets[0];
  return ss.insertSheet('RESPUESTAS');
}

function getPostParams(e) {
  if (!e) return {};
  var params = e.parameter || {};
  if (e.postData && e.postData.contents) {
    var type = (e.postData.type || '').toLowerCase();
    var c = e.postData.contents;
    if (type.indexOf('application/x-www-form-urlencoded') !== -1) {
      var decoded = {};
      var pairs = c.split('&');
      for (var i = 0; i < pairs.length; i++) {
        var idx = pairs[i].indexOf('=');
        if (idx > 0) {
          var key = decodeURIComponent(pairs[i].substring(0, idx).replace(/\+/g, ' '));
          var val = decodeURIComponent(pairs[i].substring(idx + 1).replace(/\+/g, ' '));
          decoded[key] = val;
        }
      }
      return Object.keys(decoded).length > 0 ? decoded : params;
    }
    if (type.indexOf('application/json') !== -1) {
      try {
        return JSON.parse(c);
      } catch (x) {}
    }
  }
  return params;
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function readResponses(sheet) {
  var data = [];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return data;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rows = sheet.getRange(2, 1, lastRow, sheet.getLastColumn()).getValues();
  for (var i = 0; i < rows.length; i++) {
    var obj = { fecha: rows[i][0] ? rows[i][0].toString() : '' };
    for (var j = 1; j < headers.length; j++) {
      obj[headers[j]] = rows[i][j] != null ? String(rows[i][j]) : '';
    }
    data.push(obj);
  }
  return data;
}

function appendResponse(sheet, params) {
  if (!params) params = {};
  var lastRow = sheet.getLastRow();
  if (lastRow === 0) {
    sheet.getRange(1, 1, 1, ENCABEZADOS.length).setValues([ENCABEZADOS]);
    sheet.getRange(1, 1, 1, ENCABEZADOS.length)
      .setFontWeight('bold')
      .setBackground('#0D9488')
      .setFontColor('white');
  }
  var row = [];
  for (var i = 0; i < ENCABEZADOS.length; i++) {
    var col = ENCABEZADOS[i];
    if (col === 'fecha') {
      row.push(new Date().toISOString());
    } else {
      var val = params[col];
      row.push(val != null && String(val).trim() !== '' ? String(val).trim() : '');
    }
  }
  sheet.appendRow(row);
  SpreadsheetApp.flush();
}

function readConfig(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  try {
    var title = sheet.getRange('A2').getValue();
    var subtitle = sheet.getRange('B2').getValue();
    var questionsJson = sheet.getRange('C2').getValue();
    if (!title && !questionsJson) return null;
    var config = {
      title: title || 'Encuesta IHSS',
      subtitle: subtitle || '',
      questions: questionsJson ? JSON.parse(questionsJson) : []
    };
    return config;
  } catch (x) {
    return null;
  }
}

function saveConfig(sheet, configData) {
  var config = typeof configData === 'string' ? JSON.parse(configData) : configData;
  sheet.clear();
  sheet.getRange(1, 1, 1, 3).setValues([['title', 'subtitle', 'questions']]).setFontWeight('bold');
  sheet.getRange(2, 1).setValue(config.title || '');
  sheet.getRange(2, 2).setValue(config.subtitle || '');
  sheet.getRange(2, 3).setValue(JSON.stringify(config.questions || []));
}
