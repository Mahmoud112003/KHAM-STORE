
import {
    app,
    auth,
    getMessaging,
    getToken,
    onMessage,
    isSupported,
    vapidKey
} from "./firebase-config.js";

let foregroundListenerStarted = false;

async function startForegroundListener(messaging, registration) {
    if (foregroundListenerStarted) return;

    onMessage(messaging, async (payload) => {
        console.log("Foreground FCM message received:", payload);

        const data = payload.data || {};

        const title = data.title || "KHAM — طلب جديد";

        const body = data.body ||
            `طلب جديد من ${data.customerName || "عميل"}`
            + (data.total ? ` بقيمة ${data.total}` : "")
            + (data.orderId ? ` — رقم الطلب: ${data.orderId}` : "");

        try {
            await registration.showNotification(title, {
                body,
                icon: "/favicon.ico",
                tag: data.orderId || `kham-order-${Date.now()}`,
                requireInteraction: true,
                data: {
                    url: data.url || "/admin.html"
                }
            });
        } catch (error) {
            console.error("Could not display foreground notification:", error);
        }
    });

    foregroundListenerStarted = true;
}

export async function enableNotifications() {
    try {
        if (!("serviceWorker" in navigator) || !("Notification" in window)) {
            throw new Error("المتصفح لا يدعم الإشعارات.");
        }

        if (!(await isSupported())) {
            throw new Error("Firebase Messaging غير مدعوم.");
        }

        if (!auth.currentUser) {
            throw new Error("سجّل دخول الأدمن أولاً.");
        }

        const permission = await Notification.requestPermission();

        if (permission !== "granted") {
            throw new Error("لم تسمح بالإشعارات.");
        }

        const registration = await navigator.serviceWorker.register(
            "/firebase-messaging-sw.js",
            { scope: "/" }
        );

        await navigator.serviceWorker.ready;

        const messaging = getMessaging(app);

        const token = await getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration: registration
        });

        if (!token) {
            throw new Error("تعذر استخراج FCM Token.");
        }

        const idToken = await auth.currentUser.getIdToken();

        const response = await fetch("/api/register-push-device", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${idToken}`
            },
            body: JSON.stringify({ token })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || "فشل تسجيل الجهاز على السيرفر.");
        }

        await startForegroundListener(messaging, registration);

        return {
            success: true,
            message: "تم تفعيل الإشعارات وتسجيل الجهاز بنجاح."
        };

    } catch (error) {
        console.error("Notification setup failed:", error);

        return {
            success: false,
            message: error.message || "تعذر تفعيل الإشعارات."
        };
    }
}
