
importScripts(
    "https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"
);

importScripts(
    "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
    apiKey: "AIzaSyC0ArX-oPNeBdxjc10W6dKHciFvgUeeAag",
    authDomain: "kham-4ee7c.firebaseapp.com",
    projectId: "kham-4ee7c",
    storageBucket: "kham-4ee7c.firebasestorage.app",
    messagingSenderId: "1069184239130",
    appId: "1:1069184239130:web:cf2ae86bd6bdb9549333a3",
    measurementId: "G-W1K5P5TSDK"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log("Background FCM message:", payload);

    const data = payload.data || {};

    const title = data.title || "KHAM — طلب جديد";

    const body = data.body ||
        `طلب جديد من ${data.customerName || "عميل"}`
        + (data.total ? ` بقيمة ${data.total}` : "")
        + (data.orderId ? ` — رقم الطلب: ${data.orderId}` : "");

    return self.registration.showNotification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: data.orderId || `kham-order-${Date.now()}`,
        renotify: true,
        requireInteraction: true,
        data: {
            url: data.url || "/admin.html"
        }
    });
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const targetUrl = new URL(
        event.notification.data?.url || "/admin.html",
        self.location.origin
    ).href;

    event.waitUntil(
        clients.matchAll({
            type: "window",
            includeUncontrolled: true
        }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url.startsWith(self.location.origin) && "focus" in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }

            return clients.openWindow(targetUrl);
        })
    );
});
