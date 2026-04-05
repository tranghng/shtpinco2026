// ================================================================
// KCNC 2026 — Google Apps Script Backend
// Deploy: Web App → Execute as ME → Only myself
// ================================================================

const SPREADSHEET_ID = '1dW-1lAyRXolngpzFM82Seniikq7_H8lKl-VBM1gn90o'; // ← Spreadsheet ID

const HEADERS = {
  Tasks:    ['id','name','phase','owner','due','priority','status','note','createdAt','updatedAt'],
  Meetings: ['id','name','date','time','mode','loc','attendees','agenda','link','createdAt'],
  Docs:     ['id','name','cat','driveUrl','desc','createdAt','updatedAt'],
};

// ── ROUTING ───────────────────────────────────────────────────────
function doGet(e)  { return respond(route(e.parameter || {}, {})); }
function doPost(e) {
  const body = e.postData ? JSON.parse(e.postData.contents || '{}') : {};
  return respond(route(e.parameter || {}, body));
}

function respond(result) {
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function route(p, b) {
  try {
    const action = p.action || b.action;
    const sheet  = p.sheet  || b.sheet;
    switch (action) {
      case 'getAll': return getAll(sheet);
      case 'upsert': return upsert(sheet, b.row);
      case 'delete': return deleteRow(sheet, b.id);
      case 'init':   return initAllSheets();
      default:       return { ok: false, error: 'Unknown action: ' + action };
    }
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── OPERATIONS ────────────────────────────────────────────────────
function getAll(sheetName) {
  const sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sh) return { ok: false, error: 'Sheet not found: ' + sheetName };

  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return { ok: true, rows: [] };

  const headers = data[0];
  const rows = data.slice(1)
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? String(row[i]) : ''; });
      return obj;
    })
    .filter(r => r.id);

  return { ok: true, rows };
}

function upsert(sheetName, rowData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(sheetName);
  if (!sh) return { ok: false, error: 'Sheet not found: ' + sheetName };

  const headers = HEADERS[sheetName];
  if (!headers) return { ok: false, error: 'No headers for: ' + sheetName };

  const allData = sh.getDataRange().getValues();
  let foundRow  = -1;
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][0]) === String(rowData.id)) { foundRow = i + 1; break; }
  }

  const now = new Date().toISOString();
  if (!rowData.createdAt) rowData.createdAt = now;
  rowData.updatedAt = now;

  const rowArr = headers.map(h => {
    const v = rowData[h];
    return Array.isArray(v) ? JSON.stringify(v) : (v !== undefined ? String(v) : '');
  });

  foundRow > 0
    ? sh.getRange(foundRow, 1, 1, rowArr.length).setValues([rowArr])
    : sh.appendRow(rowArr);

  return { ok: true, id: rowData.id };
}

function deleteRow(sheetName, id) {
  const sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sh) return { ok: false, error: 'Sheet not found: ' + sheetName };

  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sh.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Row not found: ' + id };
}

// ── INIT (chạy 1 lần) ─────────────────────────────────────────────
function initAllSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const results = [];

  Object.entries(HEADERS).forEach(([name, headers]) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);

    if (!sh.getRange(1, 1).getValue()) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      sh.getRange(1, 1, 1, headers.length)
        .setBackground('#1a73e8').setFontColor('#ffffff').setFontWeight('bold');
      sh.setFrozenRows(1);
      sh.setColumnWidth(2, 260); // cột name
    }
    results.push(name + ' ✓');
  });

  return { ok: true, sheets: results };
}
