// Global variable for spreadsheet and sheet names.
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const SHEETS = {
  USERS: 'Users',
  KEYWORDS: 'Keywords',
  SETTINGS: 'Settings',
  ADMINS: 'Admins'
};
// **สำคัญ: แทนที่ด้วย Channel Access Token ของคุณ**
const CHANNEL_ACCESS_TOKEN = "Fr6zv1l6vQGISKDyRBa964VdGcWuKvi1SOz1c6oaebEF5qBU7/uqqqpFcCagi41BCpuWL5Jsby3aaN/eYnsTvp4VHW4PXKw8A8lV1JHWqH08aWfHlA83xrhcNY2kJsl8c2WYgGxeEzwqnYQNIGPd9gdB04t89/1O/w1cDnyilFU=";
const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";

// --- Main API Functions ---

function doGet(e) {
  const sheetName = e.parameter.sheet;

  if (!sheetName) {
    return createResponse({ success: false, error: 'Missing sheet name parameter.' }, 400);
  }

  try {
    const sheet = getSheetByName(sheetName);
    const data = getAllData(sheet);
    return createResponse({ success: true, data: data });
  } catch (error) {
    return createResponse({ success: false, error: error.message }, 500);
  }
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    
    if (postData && postData.events) {
      return doPost_LINE(e);
    }
  } catch (error) {
    // Continue for dashboard requests
  }

  const sheetName = e.parameter.sheet;
  const action = e.parameter.action;

  if (!sheetName || !action) {
    return createResponse({ success: false, error: 'Missing sheet name or action parameter.' }, 400);
  }

  try {
    const sheet = getSheetByName(sheetName);
    const postData = JSON.parse(e.postData.contents);
    
    let result;
    if (sheetName === SHEETS.KEYWORDS && action === 'add') {
      result = addKeyword(sheet, postData);
    } else if (sheetName === SHEETS.KEYWORDS && action === 'update') {
      result = updateKeyword(sheet, postData);
    } else if (sheetName === SHEETS.KEYWORDS && action === 'delete') {
      result = deleteKeyword(sheet, postData);
    } else if (sheetName === SHEETS.SETTINGS && action === 'update') {
      result = updateSetting(sheet, postData);
    } else {
      return createResponse({ success: false, error: 'Invalid sheet or action.' }, 400);
    }

    return createResponse({ success: true, result: result });
  } catch (error) {
    return createResponse({ success: false, error: error.message }, 500);
  }
}

function doPost_LINE(e) {
  const events = JSON.parse(e.postData.contents).events;

  events.forEach(event => {
    if (event.type === 'message' && event.message.type === 'text') {
      const userMessage = event.message.text;
      const replyToken = event.replyToken;
      handleBotReply(userMessage, replyToken);
    } else if (event.type === 'follow') {
      const replyToken = event.replyToken;
      const uid = event.source.userId;
      handleFollow(replyToken, uid);
    }
  });
  
  return ContentService.createTextOutput(JSON.stringify({ success: true }));
}

function handleBotReply(userMessage, replyToken) {
  const keywordSheet = getSheetByName(SHEETS.KEYWORDS);
  const keywordsData = getAllData(keywordSheet);
  
  const matchedKeyword = keywordsData.find(k => k.keyword === userMessage);

  if (matchedKeyword) {
    let replyMessage;
    if (matchedKeyword.response_type === 'text') {
      replyMessage = {
        type: "text",
        text: matchedKeyword.response_content
      };
    } else if (matchedKeyword.response_type === 'url') {
      const urlContent = matchedKeyword.response_content;
      if (isImageUrl(urlContent)) {
        replyMessage = {
          type: "image",
          originalContentUrl: urlContent,
          previewImageUrl: urlContent
        };
      } else {
        replyMessage = {
          type: "text",
          text: `คลิกที่นี่เพื่อดูข้อมูล: ${urlContent}`
        };
      }
    } else if (matchedKeyword.response_type === 'flex_message') {
      replyMessage = {
        type: "flex",
        altText: "Flex Message จาก DinoBot",
        contents: JSON.parse(matchedKeyword.response_content)
      };
    }
    sendLineReply(replyToken, [replyMessage]);
  }
}

function handleFollow(replyToken, uid) {
  const settingsSheet = getSheetByName(SHEETS.SETTINGS);
  const settingsData = getAllData(settingsSheet);
  const welcomeMessage = settingsData.find(s => s.setting_name === 'welcome_message');
  
  const usersSheet = getSheetByName(SHEETS.USERS);
  usersSheet.appendRow([uid, 'New User', 'active', new Date().toISOString()]);
  
  const replyMessage = {
    type: "text",
    text: welcomeMessage.setting_value || "สวัสดีครับ ยินดีต้อนรับสู่ DinoBot!"
  };
  sendLineReply(replyToken, [replyMessage]);
}

function sendLineReply(replyToken, messages) {
  UrlFetchApp.fetch(LINE_REPLY_URL, {
    'headers': {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer ' + CHANNEL_ACCESS_TOKEN,
    },
    'method': 'post',
    'payload': JSON.stringify({
      replyToken: replyToken,
      messages: messages,
    }),
  });
}

function isImageUrl(url) {
  return (url.match(/\.(jpeg|jpg|gif|png|webp)$/) != null);
}

// --- Helper Functions ---

function getSheetByName(sheetName) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found.`);
  }
  return sheet;
}

function getAllData(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return [];
  }
  const headers = data.shift().map(header => header.toLowerCase());
  return data.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
}

function addKeyword(sheet, keywordData) {
  sheet.appendRow([
    keywordData.keyword,
    keywordData.response_type,
    keywordData.response_content
  ]);
  return 'Keyword added successfully.';
}

function updateKeyword(sheet, keywordData) {
  const data = sheet.getDataRange().getValues();
  const keywordToUpdate = keywordData.originalKeyword;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === keywordToUpdate) {
      sheet.getRange(i + 1, 1, 1, 3).setValues([
        [keywordData.keyword, keywordData.response_type, keywordData.response_content]
      ]);
      return 'Keyword updated successfully.';
    }
  }
  throw new Error(`Keyword "${keywordToUpdate}" not found.`);
}

function deleteKeyword(sheet, keywordData) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === keywordData.keyword) {
      sheet.deleteRow(i + 1);
      return 'Keyword deleted successfully.';
    }
  }
  throw new Error(`Keyword "${keywordData.keyword}" not found.`);
}

function updateSetting(sheet, settingData) {
  const data = sheet.getDataRange().getValues();
  const settingToUpdate = settingData.setting_name;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === settingToUpdate) {
      sheet.getRange(i + 1, 2).setValue(settingData.setting_value);
      return 'Setting updated successfully.';
    }
  }
  throw new Error(`Setting "${settingToUpdate}" not found.`);
}

function createResponse(content) {
  const response = ContentService.createTextOutput(JSON.stringify(content));
  response.setMimeType(ContentService.MimeType.JSON);
  return response;
}
