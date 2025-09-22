document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');

    // !!! เปลี่ยนรหัสผ่านตรงนี้ !!!
    const devPassword = 'Dev200543'; 

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const enteredPassword = passwordInput.value;

        if (enteredPassword === devPassword) {
            // รหัสผ่านถูกต้อง บันทึกสถานะการล็อกอินและเปลี่ยนหน้า
            localStorage.setItem('isLoggedIn', 'true');
            window.location.href = 'index.html'; // ไปยังหน้าหลัก
        } else {
            // รหัสผ่านไม่ถูกต้อง แสดงข้อความเตือน
            errorMessage.classList.remove('hidden');
        }
    });
});
