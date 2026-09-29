// 1. استيراد دالة تسجيل الدخول والـ auth من ملف إعدادات الفايربيز
import { auth } from './firebase-config.js';
import { getAdminLoggedIn, setAdminLoggedIn } from './store.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const loginForm = document.getElementById("login-form");
const errorMessage = document.getElementById("login-error");

// التحقق أولاً: لو الأدمن مسجل بالفعل ينقله تلقائياً لصفحة التحكم
if (getAdminLoggedIn()) {
    window.location.href = "admin.html";
}

// معالجة إرسال فورم الدخول
if (loginForm) {
    // تحويل الحدث إلى async للتعامل مع طلب الفايربيز أونلاين
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const btn = loginForm.querySelector("button[type='submit']");
        const originalBtnText = btn ? btn.innerText : "تسجيل الدخول";

        // هنا بنقرأ المدخلات (يفضل الأدمن يدخل بالبريد الإلكتروني المربوط بالفايربيز)
        const email = document.getElementById("login-username").value.trim();
        const password = document.getElementById("login-password").value.trim();

        if (errorMessage) errorMessage.textContent = ""; // تصفير رسالة الخطأ السابقة

        // تغيير حالة الزرار أثناء التحقق
        if (btn) {
            btn.innerText = "جاري التحقق...";
            btn.disabled = true;
        }

        try {
            // 2. تسجيل الدخول الفعلي عبر Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // حفظ حالة الدخول محلياً للأمان والـ Navigations القديم
            setAdminLoggedIn(true);

            // التوجيه لصفحة لوحة التحكم
            window.location.href = "admin.html";

        } catch (error) {
            console.error("Login Error:", error);

            // عرض رسالة خطأ واضحة في حالة فشل البيانات
            if (errorMessage) {
                if (error.code === "auth/invalid-email" || error.code === "auth/invalid-credential") {
                    errorMessage.textContent = window.getText ? window.getText('invalidLogin') : 'The email or password is incorrect.';
                } else if (error.code === "auth/network-request-failed") {
                    errorMessage.textContent = window.getText ? window.getText('networkError') : 'Network request failed. Please check your connection.';
                } else {
                    errorMessage.textContent = window.getText ? window.getText('genericLoginError') : 'An error occurred while signing in. Please try again.';
                }
            }
        } finally {
            // إعادة الزرار لوضعه الطبيعي في حال حدوث خطأ
            if (btn) {
                btn.innerText = originalBtnText;
                btn.disabled = false;
            }
        }
    });
}