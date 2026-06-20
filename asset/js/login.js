const loginForm = document.getElementById("login-form");
const errorMessage = document.getElementById("login-error");

// بيانات الدخول الافتراضية
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "kham123";

// التحقق آولًا: الجمسع مسجل بالفعل
if (getAdminLoggedIn()) {
    window.location.href = "admin.html";
}

// معالجة إرسال فورم الدخول
if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const username = document.getElementById("login-username").value.trim();
        const password = document.getElementById("login-password").value.trim();

        // المصادقة على البيانات
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            // شر سرر الدخول
            setAdminLoggedIn(true);
            window.location.href = "admin.html";
            return;
        }

        // خطأ عرض

        if (errorMessage) {
            errorMessage.textContent = "اسم المستخدم او كلمة المرور غير صحيحة.";
        }
    });
}
