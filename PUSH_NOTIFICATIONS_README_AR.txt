KHAM STORE — ملفات إشعارات الأوردرات

التعديلات:
- إضافة api/_firebase-admin.js لتهيئة Firebase Admin من متغير Vercel السري.
- إضافة api/register-push-device.js لتسجيل جهاز الأدمن بأمان بعد التحقق من Firebase ID token.
- إضافة api/notify-new-order.js لإرسال إشعار إلى أجهزة الأدمن المسجلة ومنع تكرار eventId.
- تحديث firebase-messaging-sw.js لاستقبال إشعار الخلفية وفتح لوحة الأدمن عند الضغط.
- تحديث asset/js/checkout.js حتى لا يعرض نجاحاً كاذباً ولا يمسح السلة إذا فشل حفظ الطلب على SheetDB. يطلب الإشعار بعد نجاح SheetDB فقط.
- الاحتفاظ بملفات Firebase/VAPID وزر التفعيل الموجودة في نسخة المشروع المرسلة.

ملاحظات:
1. الأرشيف يحتوي ملفات الموقع كاملة من Clothing(5).zip بعد التعديلات.
2. تم استبعاد .env.local وأي .env و.git و.vercel وnode_modules. لا توجد مفاتيح Service Account داخل الأرشيف.
3. يجب أن يحتوي متغير Vercel باسم FIREBASE_SERVICE_ACCOUNT على JSON كامل لحساب خدمة Firebase من مشروع kham-4ee7c، ويكون Secret ومفعلاً لبيئة Production.
4. لم يتم تنفيذ اختبار حي على Firebase أو SheetDB من داخل هذه البيئة. يلزم اختبار بعد النشر.
5. إشعار الطلب endpoint عام لأن عملية الشراء عامة؛ لا ترسل إليه بيانات حساسة. أضف rate limiting/App Check أو انقل الإرسال إلى backend موثوق قبل الاعتماد التجاري الكامل.
6. بعد النشر افتح /admin.html على Chrome في هاتف الأدمن، سجّل الدخول، اضغط زر تفعيل الإشعارات واسمح بها، ثم اختبر طلباً تجريبياً.
