// ตรวจสอบสถานะการล็อกอินก่อนเริ่มทำงาน
const isLoggedIn = localStorage.getItem('isLoggedIn');
if (isLoggedIn !== 'true') {
    window.location.href = 'login.html';
} else {
    // ลบสถานะการล็อกอินทันทีเมื่อโหลดหน้าหลัก เพื่อบังคับให้ล็อกอินใหม่ทุกครั้ง
    localStorage.removeItem('isLoggedIn');
}

document.addEventListener('DOMContentLoaded', () => {
    const keywordInput = document.getElementById('keywordInput');
    const responseType = document.getElementById('responseType');
    const responseContent = document.getElementById('responseContent');
    const addKeywordBtn = document.getElementById('addKeywordBtn');
    const keywordTableBody = document.getElementById('keywordTableBody');
    const statusContainer = document.getElementById('status-container');
    const googleSheetsIdInput = document.getElementById('googleSheetsId');

    // Make sure to replace with your deployed Google Apps Script URL
    const webAppUrl = 'https://script.google.com/macros/s/AKfycbyt6m9d77juVjSrW9BkbwBXIYQYo_F9xbM-WBf5VW5psz235QGHjt9EZcbkU4tlZuae1A/exec';
    
    // --- LocalStorage System ---
    function saveSheetIdToLocalStorage() {
        const sheetsId = googleSheetsIdInput.value.trim();
        if (sheetsId) {
            localStorage.setItem('dinoBotSheetId', sheetsId);
        }
    }

    function loadSheetIdFromLocalStorage() {
        const storedId = localStorage.getItem('dinoBotSheetId');
        if (storedId) {
            googleSheetsIdInput.value = storedId;
        }
    }
    // --- End LocalStorage System ---

    // Function to show a custom notification
    function showNotification(message, isSuccess = true) {
        const notification = document.createElement('div');
        notification.className = `
            p-4 rounded-md shadow-lg text-white font-medium
            transform transition-all duration-300 ease-out translate-x-full
        `;
        const bgColor = isSuccess ? 'bg-green-500' : 'bg-red-500';
        const icon = isSuccess ? 'fas fa-check-circle' : 'fas fa-times-circle';

        notification.innerHTML = `
            <div class="flex items-center">
                <i class="${icon} mr-2"></i>
                <span>${message}</span>
            </div>
        `;
        notification.classList.add(bgColor);
        statusContainer.appendChild(notification);

        setTimeout(() => {
            notification.classList.remove('translate-x-full');
            notification.classList.add('translate-x-0');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('translate-x-0');
            notification.classList.add('translate-x-full');
            notification.addEventListener('transitionend', () => {
                notification.remove();
            });
        }, 5000);
    }

    // Function to fetch data from Google Sheets
    async function fetchDataFromSheets() {
        const sheetsId = googleSheetsIdInput.value.trim();
        if (!sheetsId) {
            return;
        }
        
        showNotification('กำลังดึงข้อมูลจาก Google Sheets...', true);
        const urlWithParams = `${webAppUrl}?action=get&sheetId=${sheetsId}`;

        try {
            const response = await fetch(urlWithParams);
            const data = await response.json();
            
            if (data.status === 'success') {
                renderTable(data.data);
                showNotification('ดึงข้อมูลสำเร็จ!', true);
            } else {
                renderTable([]);
                showNotification(`เกิดข้อผิดพลาด: ${data.message}`, false);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            renderTable([]);
            showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อดึงข้อมูล ❌', false);
        }
    }
    
    // Function to render the keyword table
    function renderTable(keywords) {
        keywordTableBody.innerHTML = '';
        if (keywords.length === 0) {
            keywordTableBody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">ไม่พบข้อมูลคีย์เวิร์ด</td></tr>';
            return;
        }

        keywords.forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">${item.keyword}</td>
                <td class="px-6 py-4 whitespace-nowrap">${item.type}</td>
                <td class="px-6 py-4 max-w-xs truncate">${item.content}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button class="text-indigo-600 hover:text-indigo-900 mr-2 edit-btn" data-index="${index}">
                        <i class="fas fa-edit"></i>
                        แก้ไข
                    </button>
                    <button class="text-red-600 hover:text-red-900 delete-btn" data-index="${index}">
                        <i class="fas fa-trash-alt"></i>
                        ลบ
                    </button>
                </td>
            `;
            keywordTableBody.appendChild(row);
        });
    }

    // Function to handle save/update button logic
    addKeywordBtn.addEventListener('click', () => {
        const keyword = keywordInput.value.trim();
        const type = responseType.value;
        const content = responseContent.value.trim();

        if (keyword && content) {
            const sheetsId = googleSheetsIdInput.value.trim();
            if (!sheetsId) {
                showNotification('กรุณาใส่ Google Sheets ID', false);
                return;
            }
            
            const action = addKeywordBtn.dataset.action || 'add';
            const index = addKeywordBtn.dataset.index;
            
            const payload = {
                action: action,
                sheetId: sheetsId,
                keyword: keyword,
                type: type,
                content: content,
                index: index ? parseInt(index) + 2 : null
            };

            fetch(webAppUrl, {
                method: 'POST',
                body: JSON.stringify(payload)
            })
            .then(response => response.json())
            .then(data => {
                if(data.status === 'success'){
                    showNotification(data.message, true);
                    keywordInput.value = '';
                    responseContent.value = '';
                    addKeywordBtn.textContent = 'เพิ่ม';
                    addKeywordBtn.dataset.action = 'add';
                    fetchDataFromSheets();
                } else {
                    showNotification(data.message, false);
                }
            })
            .catch(error => {
                showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ ❌', false);
                console.error('Error:', error);
            });
        } else {
            showNotification('กรุณากรอกข้อมูลคีย์เวิร์ดและเนื้อหาคำตอบ ⚠️', false);
        }
    });

    keywordTableBody.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('delete-btn') || target.closest('.delete-btn')) {
            const index = target.closest('button').dataset.index;
            const sheetsId = googleSheetsIdInput.value.trim();
            if (!sheetsId) {
                showNotification('กรุณาใส่ Google Sheets ID', false);
                return;
            }

            if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบคีย์เวิร์ดนี้?')) {
                const payload = {
                    action: 'delete',
                    sheetId: sheetsId,
                    index: parseInt(index) + 2
                };

                fetch(webAppUrl, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        showNotification(data.message, true);
                        fetchDataFromSheets();
                    } else {
                        showNotification(data.message, false);
                    }
                })
                .catch(error => {
                    showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ ❌', false);
                    console.error('Error:', error);
                });
            }
        } else if (target.classList.contains('edit-btn') || target.closest('.edit-btn')) {
            const index = target.closest('button').dataset.index;
            const row = target.closest('tr');
            const keyword = row.cells[0].textContent;
            const type = row.cells[1].textContent;
            const content = row.cells[2].textContent;

            keywordInput.value = keyword;
            responseType.value = type;
            responseContent.value = content;
            
            addKeywordBtn.textContent = 'บันทึกการแก้ไข';
            addKeywordBtn.dataset.action = 'update';
            addKeywordBtn.dataset.index = index;
            
            showNotification('แก้ไขข้อมูลในช่องด้านบน แล้วกด "บันทึกการแก้ไข"', true);
        }
    });

    // Save Sheet ID whenever the input field changes
    googleSheetsIdInput.addEventListener('input', () => {
        saveSheetIdToLocalStorage();
        fetchDataFromSheets();
    });

    // Initial load and render
    loadSheetIdFromLocalStorage();
    fetchDataFromSheets();
});


