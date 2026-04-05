// ================================================================
// KCNC 2026 — Google Apps Script Backend
// Deploy: Web App → Execute as ME → Anyone
// ================================================================

const SPREADSHEET_ID = '1dW-1lAyRXolngpzFM82Seniikq7_H8lKl-VBM1gn90o'; // ← Spreadsheet ID

const HEADERS = {
  Tasks:    ['id','name','phase','owner','due','priority','status','note','createdAt','updatedAt'],
  Meetings: ['id','name','date','time','mode','loc','attendees','agenda','link','createdAt'],
  Docs:     ['id','name','cat','driveUrl','desc','createdAt','updatedAt'],
};

// ================================================================
// ENTRY POINTS
// ================================================================

// Mọi request từ website đều đi qua doPost (tránh vấn đề CORS & param của GET)
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    return respond(route(body));
  } catch(err) {
    return respond({ ok: false, error: 'Parse error: ' + err.message });
  }
}

// doGet chỉ dùng để test trên trình duyệt — đọc từ URL param
function doGet(e) {
  try {
    const p = e.parameter || {};
    // Nếu không có action → trả về status page
    if (!p.action) {
      return respond({ ok: true, status: 'KCNC 2026 API running', usage: 'POST with JSON body' });
    }
    return respond(route(p));
  } catch(err) {
    return respond({ ok: false, error: err.message });
  }
}

function respond(result) {
  const output = ContentService.createTextOutput(JSON.stringify(result));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function route(b) {
  const action = b.action;
  const sheet  = b.sheet;
  switch (action) {
    case 'getAll': return getAll(sheet);
    case 'upsert': return upsert(sheet, b.row);
    case 'delete': return deleteRow(sheet, b.id);
    case 'init':   return initAllSheets();
    case 'ping':   return { ok: true, message: 'pong', time: new Date().toISOString() };
    default:       return { ok: false, error: 'Unknown action: ' + action };
  }
}

// ================================================================
// TEST FUNCTIONS — chạy từ editor (chọn tên hàm → nhấn Run)
// ================================================================
function testInit()        { Logger.log(JSON.stringify(initAllSheets())); }
function testGetTasks()    { Logger.log(JSON.stringify(getAll('Tasks'))); }
function testGetMeetings() { Logger.log(JSON.stringify(getAll('Meetings'))); }
function testGetDocs()     { Logger.log(JSON.stringify(getAll('Docs'))); }
function testUpsert() {
  Logger.log(JSON.stringify(upsert('Tasks', {
    id: 'TEST001', name: 'Task mẫu', phase: '1', owner: 'BQL KCNC',
    due: '2026-04-30', priority: 'high', status: 'todo', note: 'Test OK',
  })));
}
function testPing() {
  // Giả lập POST call
  Logger.log(JSON.stringify(route({ action: 'ping' })));
}

// ================================================================
// OPERATIONS
// ================================================================
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
  const ss      = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh      = ss.getSheetByName(sheetName);
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
      sh.setColumnWidth(2, 260);
    }
    results.push(name + ' OK');
  });

  return { ok: true, sheets: results };
}
