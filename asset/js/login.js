// 1. استيراد دالة تسجيل الدخول والـ auth من ملف إعدادات الفايربيز
import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const loginForm = document.getElementById("login-form");
const errorMessage = document.getElementById("login-error");

// دالة مساعدة للتحقق من حالة الدخول القديمة (لو لسه محتاجها كـ fallback)
function getAdminLoggedIn() {
    return localStorage.getItem("adminLoggedIn") === "true";
}

function setAdminLoggedIn(status) {
    localStorage.setItem("adminLoggedIn", status ? "true" : "false");
}

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
                    errorMessage.textContent = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
                } else if (error.code === "auth/network-request-failed") {
                    errorMessage.textContent = "عفواً، فشل الاتصال بالشبكة. تحقق من الإنترنت.";
                } else {
                    errorMessage.textContent = "حدث خطأ أثناء تسجيل الدخول. حاول مجدداً.";
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