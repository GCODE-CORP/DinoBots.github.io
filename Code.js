// ============== ⚙️ การตั้งค่า ==============
// ❗️**สำคัญ:** แก้ไขค่า 2 ตัวแปรนี้ให้ตรงกับโปรเจกต์ของคุณ
const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1eR6ClXniPFfNRYOkbQTsslgd3bIOUF326uY5dqLOqd8/edit  "; //  << 🔗 วาง URL ของ Google Sheet ที่นี่
const SHEET_NAME = "Keywords"; // << 📝 ชื่อชีทที่เก็บคีย์เวิร์ด

// ❗️**สำคัญ:** ใส่ Channel Access Token ของคุณที่นี่
const CHANNEL_ACCESS_TOKEN = "5DxoEG4RKgfSFRvdQ424rQuDhDTcz13Yb3khnbABLZQnVtNawr7oP1Yehs1EOM/cCpuWL5Jsby3aaN/eYnsTvp4VHW4PXKw8A8lV1JHWqH3BqDeYB8Ued5OG/KkWoHzyHbAe84eZsdxk6lmaLzc0nAdB04t89/1O/w1cDnyilFU="; // << 🔑 วาง Channel Access Token ที่นี่

// ============== 🖥️ ส่วนแสดงผลหน้าเว็บ (Web App) ==============
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle("DinoBot Admin Panel")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============== 🤖 ส่วนจัดการ Webhook และ Logic ของบอท ==============
function doPost(e) {
  // --- ตรวจสอบว่าเป็นการส่งข้อมูลมาจากหน้า Admin หรือไม่ ---
  if (e.parameter) {
    // 1. จัดการ Action การ "ลบ"
    if (e.parameter.action === 'delete') {
      return deleteRowByKeyword(e.parameter.keyword);
    }
    
    // 2. ✨ **ส่วนที่เพิ่มเข้ามา: จัดการ Action การ "เพิ่ม"** ✨
    // เราจะเช็คว่าถ้ามีพารามิเตอร์ 'keyword' ส่งมา (แต่ไม่ใช่ action 'delete')
    // ให้ถือว่าเป็นการเพิ่มข้อมูลใหม่
    if (e.parameter.keyword) {
      return addNewKeyword(e.parameter);
    }
  }

  // --- 3. ส่วนจัดการ Webhook ที่มาจาก LINE (ถ้าไม่ใช่ Action จาก Admin) ---
  try {
    const events = JSON.parse(e.postData.contents).events;
    events.forEach(handleMessageEvent);
  } catch (error) {
    Logger.log("Error parsing webhook: " + error);
  }

  return createJsonResponse({ 'status': 'success', 'source': 'webhook' });
}

// ============== 🗂️ ส่วนจัดการข้อมูลใน Google Sheet ==============

/**
 * ✨ **ฟังก์ชันใหม่: สำหรับเพิ่มคีย์เวิร์ดลง Sheet** ✨
 */
function addNewKeyword(params) {
  try {
    const sheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(SHEET_NAME);
    
    // สร้างแถวข้อมูลใหม่ตามลำดับคอลัมน์ใน Sheet
    const newRow = [
      params.timestamp || new Date(), // A: Timestamp
      params.keyword,                 // B: Keyword
      params.type,                    // C: Type
      params.content,                 // D: Content
      params.altText || '',           // E: AltText
      params.active === 'true',       // F: Active
      Number(params.usageCount) || 0  // G: UsageCount
    ];
    
    sheet.appendRow(newRow);
    
    return createJsonResponse({ 'status': 'success', 'message': 'Keyword added successfully.' });
  } catch (error) {
    Logger.log("Error in addNewKeyword: " + error);
    return createJsonResponse({ 'status': 'error', 'message': error.message });
  }
}

/**
 * ฟังก์ชันสำหรับลบคีย์เวิร์ด (ถูกเรียกจากหน้า Admin)
 */
function deleteRowByKeyword(keywordToDelete) {
  try {
    const sheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      if ((data[i][1] || '').toString() === keywordToDelete) {
        sheet.deleteRow(i + 1);
        return createJsonResponse({ 'status': 'success', 'message': `Keyword '${keywordToDelete}' deleted.` });
      }
    }
    return createJsonResponse({ 'status': 'not_found', 'message': 'Keyword not found.' });
  } catch (e) {
    Logger.log("Error in deleteRowByKeyword: " + e);
    return createJsonResponse({ 'status': 'error', 'message': e.message });
  }
}

// ============== 💬 ส่วนจัดการการตอบกลับ LINE ==============
// (โค้ดส่วนนี้เหมือนเดิม ไม่ต้องแก้ไข)

function handleMessageEvent(event) {
    if (event.type !== "message" || event.message.type !== "text") return;
    
    const replyToken = event.replyToken;
    const userMessage = event.message.text.toLowerCase().trim();
    
    const sheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const keyword = (row[1] || '').toString().toLowerCase().trim();
        const isActive = row[5];
        if (keyword && userMessage.includes(keyword) && isActive) {
            const messageType = (row[2] || 'text').toString().trim();
            const content = (row[3] || '').toString().trim();
            const altText = (row[4] || 'มีข้อความส่งถึงคุณ').toString().trim();
            const replyMessage = createReplyMessage(messageType, content, altText);
            if (replyMessage) {
                sendReply(replyToken, [replyMessage]);
                break;
            }
        }
    }
}

function createReplyMessage(type, content, altText) {
    try {
        if (type === 'flex') return { "type": "flex", "altText": altText, "contents": JSON.parse(content) };
        if (type === 'image') return { "type": "image", "originalContentUrl": content, "previewImageUrl": content };
        return { "type": "text", "text": content };
    } catch (error) {
        Logger.log(`Error creating reply message (type: ${type}): ${error}`);
        return { "type": "text", "text": "ขออภัย, เกิดข้อผิดพลาดในการสร้างข้อความตอบกลับ" };
    }
}

function sendReply(replyToken, messages) {
    const url = 'https://api.line.me/v2/bot/message/reply';
    const options = {
        'method': 'post',
        'contentType': 'application/json',
        'payload': JSON.stringify({ 'replyToken': replyToken, 'messages': messages }),
        'headers': { 'Authorization': 'Bearer ' + CHANNEL_ACCESS_TOKEN }
    };
    try { UrlFetchApp.fetch(url, options); } catch (e) { Logger.log("Error sending reply: " + e); }
}

// ============== 🛠️ ฟังก์ชันเสริม ==============
function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
