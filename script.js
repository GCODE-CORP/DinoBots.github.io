// --- Configuration ---
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwPzuK1bxht_cvFPRwmzAbsJOLPiBk5r4TPS8s5W9S17wQYpAQgo4VlEpqMfstXmbk/exec';
const myLiffId = "2008138486-Oz4Z75Qn";
const SUPER_ADMIN_UID = "Uf6c342f0263f3532f814b6c318991a03"; // **สำคัญ: เปลี่ยนค่านี้เป็น User ID ของคุณ**

// --- Global Data Storage ---
let usersData = [];
let keywordsData = [];
let settingsData = {};
let adminsData = [];
let filteredUsers = [];
let selectedKeyword = null;
let currentUser = null;

// --- Core Functions for API Communication ---
async function fetchData(sheetName) {
    try {
        const response = await fetch(`${WEB_APP_URL}?sheet=${sheetName}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error);
        }
        return result.data;
    } catch (error) {
        console.error(`Error fetching data from ${sheetName}:`, error);
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด!',
            text: `ไม่สามารถโหลดข้อมูลจากชีต ${sheetName} ได้: ${error.message}`,
            confirmButtonText: 'ตกลง'
        });
        return null;
    }
}

async function postData(sheetName, action, data) {
    try {
        const response = await fetch(`${WEB_APP_URL}?sheet=${sheetName}&action=${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error);
        }
        return result.result;
    } catch (error) {
        console.error(`Error posting data to ${sheetName} with action ${action}:`, error);
        Swal.fire({
            icon: 'error',
            title: 'บันทึกข้อมูลไม่สำเร็จ!',
            text: `เกิดข้อผิดพลาด: ${error.message}`,
            confirmButtonText: 'ตกลง'
        });
        return null;
    }
}

// --- Initialization and Data Fetching ---
window.addEventListener('load', () => {
    initializeLiff();
});

function initializeLiff() {
    liff.init({ liffId: myLiffId })
        .then(() => {
            if (liff.isLoggedIn()) {
                liff.getProfile()
                    .then(profile => {
                        currentUser = profile;
                        checkAdminAccess(profile.userId);
                    })
                    .catch(err => {
                        console.error("Error getting LIFF profile:", err);
                        Swal.fire('เกิดข้อผิดพลาด!', 'ไม่สามารถดึงข้อมูลโปรไฟล์ได้', 'error');
                    });
            } else {
                liff.login();
            }
        })
        .catch((err) => {
            console.error("LIFF initialization failed:", err);
            Swal.fire('เกิดข้อผิดพลาด!', 'ไม่สามารถเชื่อมต่อกับ LINE ได้', 'error');
        });
}

async function checkAdminAccess(uid) {
    adminsData = await fetchData('Admins');
    const isAdmin = adminsData.some(admin => admin.user_id === uid && admin.status === 'active');
    
    if (isAdmin) {
        document.getElementById('liff-loading').classList.add('hidden');
        document.getElementById('dashboard-content').classList.remove('hidden');
        document.getElementById('liff-user-name').textContent = currentUser.displayName;
        if (uid === SUPER_ADMIN_UID) {
            document.getElementById('adminManagementBtn').classList.remove('hidden');
        }
        initDashboard();
    } else {
        document.getElementById('liff-loading').classList.add('hidden');
        document.getElementById('access-denied').classList.remove('hidden');
    }
}

function handleLogout() {
    liff.logout();
    window.location.reload();
}

async function initDashboard() {
    console.log('Fetching all data...');
    document.getElementById('totalUsers').textContent = '...';
    document.getElementById('totalKeywords').textContent = '...';
    document.getElementById('welcomeMessage').textContent = '...';
    document.getElementById('botStatus').textContent = '...';

    await Promise.all([
        fetchAndRenderUsers(),
        fetchAndRenderKeywords(),
        fetchAndRenderSettings(),
        fetchAndRenderAdmins()
    ]);
    console.log('All data loaded.');
}

async function refreshData() {
    console.log('Refreshing all data...');
    await Promise.all([
        fetchAndRenderUsers(),
        fetchAndRenderKeywords(),
        fetchAndRenderSettings(),
        fetchAndRenderAdmins()
    ]);
    Swal.fire({
        icon: 'success',
        title: 'สำเร็จ!',
        text: 'รีเฟรชข้อมูลเรียบร้อยแล้ว',
        timer: 2000,
        showConfirmButton: false
    });
}

async function fetchAndRenderUsers() {
    usersData = await fetchData('Users');
    if (usersData) {
        filteredUsers = usersData;
        renderUsersTable();
        updateStats();
    }
}

async function fetchAndRenderKeywords() {
    keywordsData = await fetchData('Keywords');
    if (keywordsData) {
        renderKeywordsList();
        updateStats();
    }
}

async function fetchAndRenderSettings() {
    const settingsArray = await fetchData('Settings');
    if (settingsArray) {
        settingsData = settingsArray.reduce((acc, item) => {
            acc[item.setting_name] = item.setting_value;
            return acc;
        }, {});
        document.getElementById('welcomeMessage').textContent = settingsData.welcome_message || 'ยังไม่มีข้อความต้อนรับ';
        document.getElementById('botStatus').textContent = settingsData.bot_status === 'online' ? 'ออนไลน์' : 'ออฟไลน์';
        updateStats();
    }
}

async function fetchAndRenderAdmins() {
    adminsData = await fetchData('Admins');
    if (adminsData) {
        renderAdminsTable();
    }
}

function updateStats() {
    document.getElementById('totalUsers').textContent = usersData ? usersData.length.toLocaleString() : '0';
    document.getElementById('totalKeywords').textContent = keywordsData ? keywordsData.length.toLocaleString() : '0';
    document.getElementById('totalMessages').textContent = 'N/A';
}

// --- UI Rendering Functions ---
function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (filteredUsers && filteredUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">ไม่พบข้อมูลผู้ใช้</td></tr>';
        return;
    }
    filteredUsers.forEach(user => {
        const statusBadge = getStatusBadge(user.status);
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `<td class="px-6 py-4 whitespace-nowrap"><div class="flex items-center"><div class="ml-4"><div class="text-sm font-medium text-gray-900">${user.display_name}</div><div class="text-sm text-gray-500">ID: ${user.user_id}</div></div></div></td><td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDateTime(user.join_date)}</td><td class="px-6 py-4 whitespace-nowrap text-sm font-medium"><div class="flex space-x-2"><button onclick="viewUserProfile('${user.user_id}')" class="text-blue-600 hover:text-blue-900">ดูข้อมูล</button></div></td>`;
        tbody.appendChild(row);
    });
}

function renderKeywordsList() {
    const keywordsList = document.getElementById('keywordsList');
    if (!keywordsList) return;
    keywordsList.innerHTML = '';
    if (keywordsData && keywordsData.length === 0) {
        keywordsList.innerHTML = '<p class="text-center text-gray-500 py-4">ยังไม่มีคีย์เวิร์ด</p>';
        return;
    }
    keywordsData.forEach(keywordData => {
        const keywordElement = document.createElement('div');
        keywordElement.className = 'p-4 border border-gray-200 rounded-lg';
        let preview = '';
        if (keywordData.response_type === 'text') {
            preview = keywordData.response_content;
        } else if (keywordData.response_type === 'url') {
            preview = `<a href="${keywordData.response_content}" class="text-blue-500 hover:underline" target="_blank">${keywordData.response_content}</a>`;
        } else if (keywordData.response_type === 'flex_message') {
            try {
                const flexData = JSON.parse(keywordData.response_content);
                const tempContainer = document.createElement('div');
                tempContainer.className = 'flex-message-card';
                renderFlexPreview(flexData, tempContainer);
                preview = tempContainer.outerHTML;
            } catch (e) {
                preview = '❌ JSON ไม่ถูกต้อง';
            }
        }
        keywordElement.innerHTML = `<div class="flex items-center justify-between mb-2"><span class="font-medium text-gray-800">${keywordData.keyword}</span><div class="flex space-x-2"><button onclick="editKeyword('${keywordData.keyword}')" class="text-blue-600 hover:text-blue-700 text-sm">แก้ไข</button><button onclick="deleteKeyword('${keywordData.keyword}')" class="text-red-600 hover:text-red-700 text-sm">ลบ</button></div></div><p class="text-sm text-gray-600">ประเภท: ${keywordData.response_type === 'text' ? 'Text' : keywordData.response_type === 'url' ? 'URL' : 'Flex Message'}</p><div class="text-sm text-gray-500 mt-1">${preview}</div>`;
        keywordsList.appendChild(keywordElement);
    });
}

function renderAdminsTable() {
    const tbody = document.getElementById('adminsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (adminsData && adminsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">ไม่พบข้อมูลแอดมิน</td></tr>';
        return;
    }
    adminsData.forEach(admin => {
        const isSuperAdmin = admin.user_id === SUPER_ADMIN_UID;
        const statusBadge = isSuperAdmin ? '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Super Admin</span>' : getStatusBadge(admin.status);
        const actionButtons = isSuperAdmin 
            ? '<span>-</span>' 
            : `<button onclick="toggleAdminStatus('${admin.user_id}', '${admin.status}')" class="text-yellow-600 hover:text-yellow-900">${admin.status === 'active' ? 'ปิด' : 'เปิด'}</button><button onclick="deleteAdmin('${admin.user_id}')" class="text-red-600 hover:text-red-900 ml-2">ลบ</button>`;
        
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `<td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-gray-900">${admin.display_name || 'N/A'}</div></td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${admin.user_id}</td><td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td><td class="px-6 py-4 whitespace-nowrap text-sm font-medium"><div class="flex space-x-2">${actionButtons}</div></td>`;
        tbody.appendChild(row);
    });
}

function renderFlexPreview(flexData, container) {
    container.innerHTML = '';
    let html = '';
    if (flexData.type === 'bubble') {
        html = renderBubblePreview(flexData);
    } else if (flexData.type === 'carousel') {
        html = renderCarouselPreview(flexData);
    } else {
        html = `<div class="text-center text-gray-400 py-8"><div class="text-4xl mb-2">📱</div><p>ประเภท: ${flexData.type}</p><p class="text-xs mt-1">ตัวอย่างไม่รองรับ</p></div>`;
    }
    container.innerHTML = html;
}

function renderBubblePreview(bubble) {
    let html = '<div class="border rounded-lg overflow-hidden shadow-sm">';
    if (bubble.hero && bubble.hero.type === 'image') {
        html += `<div class="w-full h-32 bg-gray-200 rounded-t-lg overflow-hidden"><img src="${bubble.hero.url}" alt="Hero" class="w-full h-full object-cover"></div>`;
    }
    if (bubble.body) {
        html += '<div class="p-4">';
        html += renderBoxContents(bubble.body.contents);
        html += '</div>';
    }
    if (bubble.footer) {
        html += '<div class="p-4 pt-0">';
        html += renderBoxContents(bubble.footer.contents);
        html += '</div>';
    }
    html += '</div>';
    return html;
}

function renderCarouselPreview(carousel) {
    if (!carousel.contents || carousel.contents.length === 0) return `<div class="text-center text-gray-400 py-8"><p>Carousel ว่าง</p></div>`;
    let html = '<div class="flex space-x-2 overflow-x-auto pb-2">';
    carousel.contents.slice(0, 3).forEach(bubble => {
        html += `<div class="flex-shrink-0 w-48">${renderBubblePreview(bubble)}</div>`;
    });
    if (carousel.contents.length > 3) html += '<div class="flex-shrink-0 w-12 flex items-center justify-center text-gray-400">...</div>';
    html += '</div>';
    return html;
}

function renderBoxContents(contents) {
    if (!contents) return '';
    let html = '';
    contents.forEach(content => {
        if (content.type === 'text') {
            const size = content.size === 'xl' ? 'text-lg' : content.size === 'lg' ? 'text-base' : 'text-sm';
            const weight = content.weight === 'bold' ? 'font-bold' : 'font-normal';
            const color = content.color || '#333333';
            html += `<p class="${size} ${weight} mb-2" style="color: ${color}">${content.text}</p>`;
        } else if (content.type === 'button') {
            const buttonColor = content.color || '#00B900';
            html += `<button class="w-full py-2 px-4 rounded-lg text-white font-medium text-sm mb-2" style="background-color: ${buttonColor}">${content.action?.label || 'Button'}</button>`;
        } else if (content.type === 'separator') {
            html += '<hr class="my-2 border-gray-200">';
        } else if (content.type === 'spacer') {
            html += '<div class="my-2"></div>';
        }
    });
    return html;
}

// --- Event Handlers and UI Logic ---
function getStatusBadge(status) {
    const badges = { active: '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">ใช้งานอยู่</span>', inactive: '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">ไม่ใช้งาน</span>', blocked: '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">ถูกบล็อก</span>' };
    return badges[status] || '<span>-</span>';
}

function hideSection(id) { document.getElementById(id).style.display = 'none'; }
function showSection(id) {
    const sections = ['usersSection', 'keywordsSection', 'settingsSection', 'adminsSection'];
    sections.forEach(secId => document.getElementById(secId).style.display = 'none');
    document.getElementById(id).style.display = 'block';
}

function viewUsers() { showSection('usersSection'); }
function manageKeywords() { showSection('keywordsSection'); }
function botSettings() {
    showSection('settingsSection');
    document.getElementById('welcomeMessageInput').value = settingsData.welcome_message || '';
    document.getElementById('botStatusInput').value = settingsData.bot_status || 'online';
}
function manageAdmins() {
    showSection('adminsSection');
    fetchAndRenderAdmins();
}

function addKeyword() {
    selectedKeyword = null;
    document.getElementById('keywordFormTitle').textContent = 'เพิ่มคีย์เวิร์ด';
    clearForm();
}

async function saveKeyword() {
    const keyword = document.getElementById('keywordInput').value.trim();
    const response_type = document.getElementById('responseType').value;
    let response_content;

    if (!keyword) { Swal.fire('ข้อมูลไม่ครบ', 'กรุณาใส่คีย์เวิร์ด', 'warning'); return; }

    if (response_type === 'text') {
        response_content = document.getElementById('textContent').value.trim();
        if (!response_content) { Swal.fire('ข้อมูลไม่ครบ', 'กรุณาใส่ข้อความตอบกลับ', 'warning'); return; }
    } else if (response_type === 'url') {
        response_content = document.getElementById('urlContent').value.trim();
        if (!response_content) { Swal.fire('ข้อมูลไม่ครบ', 'กรุณาใส่ URL', 'warning'); return; }
    } else if (response_type === 'flex_message') {
        response_content = document.getElementById('flex_messageContent').value.trim();
        try { JSON.parse(response_content); } catch (e) { Swal.fire('ข้อมูลไม่ถูกต้อง', 'JSON ที่ใส่มาไม่ถูกต้อง', 'warning'); return; }
        if (!response_content) { Swal.fire('ข้อมูลไม่ครบ', 'กรุณาใส่ JSON', 'warning'); return; }
    }

    const keywordData = { keyword, response_type, response_content };
    let result;

    if (selectedKeyword) {
        const originalKeyword = selectedKeyword.keyword;
        result = await postData('Keywords', 'update', { ...keywordData, originalKeyword });
    } else {
        result = await postData('Keywords', 'add', keywordData);
    }

    if (result) {
        Swal.fire('สำเร็จ!', result, 'success');
        clearForm();
        fetchAndRenderKeywords();
    }
}

function editKeyword(keyword) {
    const keywordData = keywordsData.find(k => k.keyword === keyword);
    if (!keywordData) return;
    selectedKeyword = keywordData;
    document.getElementById('keywordFormTitle').textContent = 'แก้ไขคีย์เวิร์ด';
    document.getElementById('keywordInput').value = keywordData.keyword;
    document.getElementById('responseType').value = keywordData.response_type;
    toggleResponseFields();
    if (keywordData.response_type === 'text') {
        document.getElementById('textContent').value = keywordData.response_content;
    } else if (keywordData.response_type === 'url') {
        document.getElementById('urlContent').value = keywordData.response_content;
    } else if (keywordData.response_type === 'flex_message') {
        document.getElementById('flex_messageContent').value = keywordData.response_content;
        updateJSONPreview();
    }
}

async function deleteKeyword(keyword) {
    Swal.fire({
        title: 'ยืนยันการลบ?',
        text: `คุณต้องการลบคีย์เวิร์ด "${keyword}" หรือไม่?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ใช่, ลบเลย',
        cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const postResult = await postData('Keywords', 'delete', { keyword });
            if (postResult) {
                Swal.fire('ลบสำเร็จ!', postResult, 'success');
                fetchAndRenderKeywords();
            }
        }
    });
}

async function addAdmin() {
    const newAdminUID = document.getElementById('newAdminUID').value.trim();
    if (!newAdminUID) { Swal.fire('ข้อมูลไม่ครบ', 'กรุณาใส่ User ID ของแอดมินใหม่', 'warning'); return; }
    
    // ดึงข้อมูลชื่อผู้ใช้จาก LINE API
    try {
        const profile = await liff.getProfile(newAdminUID);
        const newAdminData = { user_id: newAdminUID, display_name: profile.displayName, status: 'active' };
        const postResult = await postData('Admins', 'add', newAdminData);

        if (postResult) {
            Swal.fire('สำเร็จ!', postResult, 'success');
            document.getElementById('newAdminUID').value = '';
            fetchAndRenderAdmins();
        }
    } catch (e) {
        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถดึงข้อมูล User ID นี้ได้', 'error');
    }
}

async function toggleAdminStatus(uid, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const postResult = await postData('Admins', 'update', { user_id: uid, status: newStatus });
    
    if (postResult) {
        Swal.fire('สำเร็จ!', postResult, 'success');
        fetchAndRenderAdmins();
    }
}

async function deleteAdmin(uid) {
    Swal.fire({
        title: 'ยืนยันการลบแอดมิน?',
        text: `คุณต้องการลบแอดมิน User ID "${uid}" หรือไม่?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ใช่, ลบเลย',
        cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const postResult = await postData('Admins', 'delete', { user_id: uid });
            if (postResult) {
                Swal.fire('ลบสำเร็จ!', postResult, 'success');
                fetchAndRenderAdmins();
            }
        }
    });
}

async function saveSettings() {
    const welcomeMessage = document.getElementById('welcomeMessageInput').value.trim();
    const botStatus = document.getElementById('botStatusInput').value;

    const welcomeResult = await postData('Settings', 'update', {
        setting_name: 'welcome_message',
        setting_value: welcomeMessage
    });

    const statusResult = await postData('Settings', 'update', {
        setting_name: 'bot_status',
        setting_value: botStatus
    });

    if (welcomeResult && statusResult) {
        Swal.fire('สำเร็จ!', 'บันทึกการตั้งค่าเรียบร้อยแล้ว', 'success');
        fetchAndRenderSettings();
    }
}

function clearForm() {
    document.getElementById('keywordForm').reset();
    selectedKeyword = null;
    document.getElementById('keywordFormTitle').textContent = 'เพิ่มคีย์เวิร์ด';
    toggleResponseFields();
}

function toggleResponseFields() {
    const responseType = document.getElementById('responseType').value;
    const textResponse = document.getElementById('textResponse');
    const urlResponse = document.getElementById('urlResponse');
    const flexResponse = document.getElementById('flex_messageResponse');
    if (textResponse) textResponse.style.display = 'none';
    if (urlResponse) urlResponse.style.display = 'none';
    if (flexResponse) flexResponse.style.display = 'none';
    const selectedResponseElement = document.getElementById(`${responseType}Response`);
    if (selectedResponseElement) {
        selectedResponseElement.style.display = 'block';
    }
}

function formatJSON() {
    const textarea = document.getElementById('flex_messageContent');
    try {
        const parsed = JSON.parse(textarea.value);
        textarea.value = JSON.stringify(parsed, null, 2);
        showJSONStatus('✨ จัดรูปแบบเรียบร้อย', 'text-green-600');
    } catch (error) {
        showJSONStatus('❌ JSON ไม่ถูกต้อง: ' + error.message, 'text-red-600');
    }
}

function validateJSON() {
    const textarea = document.getElementById('flex_messageContent');
    try {
        JSON.parse(textarea.value);
        showJSONStatus('✅ JSON ถูกต้อง', 'text-green-600');
    } catch (error) {
        showJSONStatus('❌ JSON ไม่ถูกต้อง: ' + error.message, 'text-red-600');
    }
}

function showJSONStatus(message, className) {
    const status = document.getElementById('jsonStatus');
    status.textContent = message;
    status.className = 'mt-2 text-sm ' + className;
    setTimeout(() => { status.textContent = '', status.className = 'mt-2 text-sm'; }, 3000);
}

function updateJSONPreview() {
    const textarea = document.getElementById('flex_messageContent');
    const preview = document.getElementById('jsonFlexPreview');
    try {
        const flexData = JSON.parse(textarea.value);
        renderFlexPreview(flexData, preview);
    } catch (error) {
        preview.innerHTML = `<div class="text-center text-red-400 py-8"><div class="text-4xl mb-2">❌</div><p class="text-sm">JSON ไม่ถูกต้อง</p></div>`;
    }
}

function filterUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    const statusFilter = document.getElementById('userStatusFilter').value;
    filteredUsers = usersData.filter(user => {
        const matchesSearch = user.display_name.toLowerCase().includes(searchTerm);
        const matchesStatus = !statusFilter || user.status === statusFilter;
        return matchesSearch && matchesStatus;
    });
    renderUsersTable();
}

function viewUserProfile(userId) {
    const user = usersData.find(u => u.user_id === userId);
    if (!user) {
        Swal.fire('ไม่พบข้อมูล', 'ไม่พบข้อมูลผู้ใช้ที่เลือก', 'error');
        return;
    }
    const statusBadge = getStatusBadge(user.status);
    const userProfileContent = document.getElementById('userProfileContent');
    userProfileContent.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
                <div class="flex items-center space-x-4">
                    <div class="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        ${user.display_name ? user.display_name.charAt(0) : 'N/A'}
                    </div>
                    <div>
                        <h4 class="text-xl font-semibold text-gray-800">${user.display_name || 'N/A'}</h4>
                        <p class="text-gray-500">User ID: ${user.user_id}</p>
                    </div>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h5 class="font-semibold text-gray-700 mb-3">ข้อมูลทั่วไป</h5>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-gray-600">สถานะ:</span>
                            ${statusBadge}
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">เข้าร่วมเมื่อ:</span>
                            <span class="text-gray-800">${formatDateTime(user.join_date)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('userProfileModal').classList.remove('hidden');
    document.getElementById('userProfileModal').classList.add('flex');
}

function closeUserProfileModal() {
    document.getElementById('userProfileModal').classList.add('hidden');
    document.getElementById('userProfileModal').classList.remove('flex');
}

function formatDateTime(isoString) {
    if (!isoString) return 'ไม่ระบุ';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) {
            return isoString;
        }
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        return new Intl.DateTimeFormat('th-TH', options).format(date);
    } catch (e) {
        return isoString;
    }
}

// --- Other Functions ---
function handleLogout() { Swal.fire('การออกจากระบบถูกปิดใช้งานในโหมดพัฒนา', '', 'info'); }
function exportUsers() { Swal.fire('ฟังก์ชัน Export กำลังอยู่ระหว่างการพัฒนา', '', 'info'); }

// Expose functions to the global scope
window.initDashboard = initDashboard;
window.refreshData = refreshData;
window.viewUsers = viewUsers;
window.manageKeywords = manageKeywords;
window.botSettings = botSettings;
window.manageAdmins = manageAdmins;
window.hideSection = hideSection;
window.addKeyword = addKeyword;
window.saveKeyword = saveKeyword;
window.editKeyword = editKeyword;
window.deleteKeyword = deleteKeyword;
window.clearForm = clearForm;
window.toggleResponseFields = toggleResponseFields;
window.formatJSON = formatJSON;
window.validateJSON = validateJSON;
window.updateJSONPreview = updateJSONPreview;
window.saveSettings = saveSettings;
window.filterUsers = filterUsers;
window.handleLogout = handleLogout;
window.exportUsers = exportUsers;
window.viewUserProfile = viewUserProfile;
window.closeUserProfileModal = closeUserProfileModal;
window.renderFlexPreview = renderFlexPreview;
window.renderBubblePreview = renderBubblePreview;
window.renderCarouselPreview = renderCarouselPreview;
window.renderBoxContents = renderBoxContents;
window.addAdmin = addAdmin;
window.toggleAdminStatus = toggleAdminStatus;
window.deleteAdmin = deleteAdmin;
