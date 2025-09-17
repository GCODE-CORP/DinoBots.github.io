// ============== ⚙️ การตั้งค่า ==============
// ❗️**สำคัญ:** แก้ไขค่า 4 ตัวแปรนี้ให้ตรงกับโปรเจกต์ของคุณ
const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1eR6ClXniPFfNRYOkbQTsslgd3bIOUF326uY5dqLOqd8/edit  "; //  << 🔗 วาง URL ของ Google Sheet ที่นี่
const KEYWORD_SHEET_NAME = "Keywords";
const ADMIN_SHEET_NAME = "Admins";
const CHANNEL_ACCESS_TOKEN = "5DxoEG4RKgfSFRvdQ424rQuDhDTcz13Yb3khnbABLZQnVtNawr7oP1Yehs1EOM/cCpuWL5Jsby3aaN/eYnsTvp4VHW4PXKw8A8lV1JHWqH3BqDeYB8Ued5OG/KkWoHzyHbAe84eZsdxk6lmaLzc0nAdB04t89/1O/w1cDnyilFU="; // << 🔑 วาง Channel Access Token ที่นี่

// ============== 🖥️ ส่วนแสดงผลหน้าเว็บ (Web App) ==============
function doGet(e) {
  if (e.parameter.action === 'getAdmins') {
    return getAdmins();
  }
  if (e.parameter.action === 'getKeywords') {
    return getKeywords();
  }
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle("DinoBot Admin Panel")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============== 🤖 ส่วนจัดการ Logic หลัก ==============
function doPost(e) {
  try {
    const params = e.parameter;

    // --- ตรวจสอบ Action ที่ถูกส่งมาจากหน้า Admin Panel ---
    if (params.source === 'admin_panel') {
      switch (params.action) {
        case 'login': return handleLogin(params);
        case 'addAdmin': return addAdmin(params);
        case 'deleteAdmin': return deleteAdmin(params);
        case 'addKeyword': return addNewKeyword(params);
        case 'deleteKeyword': return deleteRowByKeyword(params.keyword);
        default: return createJsonResponse({ status: 'error', message: 'Unknown admin action' });
      }
    }

    // --- ส่วนจัดการ Webhook ที่มาจาก LINE (ถ้าไม่ใช่ Action จาก Admin) ---
    const events = JSON.parse(e.postData.contents).events;
    events.forEach(handleMessageEvent);
    return createJsonResponse({ status: 'success', source: 'webhook' });

  } catch (error) {
    Logger.log("Critical Error in doPost: " + error.toString());
    return createJsonResponse({ status: 'error', message: "Server Error: " + error.toString() });
  }
}

// ============== 👤 ส่วนจัดการแอดมิน ==============
function getAdmins() {
  try {
    const sheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(ADMIN_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    const admins = data.map(row => ({
      id: row[0], name: row[1], password: row[2], active: row[3], lastLogin: row[4]
    }));
    return createJsonResponse({ status: 'success', data: admins });
  } catch (e) {
    return createJsonResponse({ status: 'error', message: e.message });
  }
}

function handleLogin(params) {
  try {
    const sheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(ADMIN_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const name = (data[i][1] || '').toString().trim();
      const password = (data[i][2] || '').toString();
      const isActive = data[i][3];

      if (name === params.username && password === params.password) {
        if (isActive === true) {
          sheet.getRange(i + 1, 5).setValue(new Date());
          return createJsonResponse({ status: 'success', user: { name: name } });
        } else {
          return createJsonResponse({ status: 'error', message: 'User is inactive.' });
        }
      }
    }
    return createJsonResponse({ status: 'error', message: 'Invalid username or password.' });
  } catch (e) {
    return createJsonResponse({ status: 'error', message: e.message });
  }
}

function addAdmin(params) {
  try {
    const sheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(ADMIN_SHEET_NAME);
    const lastRow = sheet.getLastRow();
    const newId = lastRow > 0 ? sheet.getRange(lastRow, 1).getValue() + 1 : 1;
    sheet.appendRow([newId, params.name, params.password, true, '']);
    return createJsonResponse({ status: 'success' });
  } catch (e) {
    return createJsonResponse({ status: 'error', message: e.message });
  }
}

function deleteAdmin(params) {
  try {
    const sheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(ADMIN_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const adminIdToDelete = parseInt(params.id, 10);
    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][0] === adminIdToDelete) {
        sheet.deleteRow(i + 1);
        return createJsonResponse({ status: 'success' });
      }
    }
    return createJsonResponse({ status: 'not_found' });
  } catch (e) {
    return createJsonResponse({ status: 'error', message: e.message });
  }
}

// ============== 🔑 ส่วนจัดการคีย์เวิร์ด ==============
function getKeywords() {
  try {
    const sheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(KEYWORD_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    const keywords = data.map(row => ({
      id: row[0].toString(), keyword: row[1], type: row[2], content: row[3],
      altText: row[4], active: row[5], usageCount: row[6]
    }));
    return createJsonResponse({ status: 'success', data: keywords });
  } catch (e) {
    return createJsonResponse({ status: 'error', message: e.message });
  }
}

function addNewKeyword(params) {
  try {
    const sheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(KEYWORD_SHEET_NAME);
    sheet.appendRow([ new Date(), params.keyword, params.type, params.content, params.altText || '', true, 0 ]);
    return createJsonResponse({ status: 'success' });
  } catch (e) {
    return createJsonResponse({ status: 'error', message: e.message });
  }
}

function deleteRowByKeyword(keywordToDelete) {
  try {
    const sheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(KEYWORD_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      if ((data[i][1] || '').toString() === keywordToDelete) {
        sheet.deleteRow(i + 1);
        return createJsonResponse({ status: 'success' });
      }
    }
    return createJsonResponse({ status: 'not_found' });
  } catch (e) {
    return createJsonResponse({ status: 'error', message: e.message });
  }
}

// ============== 💬 ส่วนจัดการการตอบกลับ LINE ==============
function handleMessageEvent(event) {
    // ... (Your existing handleMessageEvent, createReplyMessage, sendReply functions) ...
}

function createReplyMessage(type, content, altText) {
    // ...
}

function sendReply(replyToken, messages) {
    // ...
}

// ============== 🛠️ ฟังก์ชันเสริม ==============
function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
