
const { createHash } = require("node:crypto");
const { getFirebaseAdmin } = require("./_firebase-admin");

const ADMIN_UID = "UYC7sTnExQds6M1o4PP5joixLNL2";

module.exports = async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");

    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({
            success: false,
            error: "Method not allowed"
        });
    }

    try {
        const {
            orderId,
            eventId,
            customerName,
            total
        } = req.body || {};

        // Validate order reference
        if (
            typeof orderId !== "string" ||
            !/^KHM\d{1,4}$/.test(orderId) ||
            typeof eventId !== "string" ||
            !/^KHM\d{1,4}-\d{10,}$/.test(eventId)
        ) {
            return res.status(400).json({
                success: false,
                error: "Invalid order reference"
            });
        }

        // Initialize Firebase Admin
        const { db, messaging, FieldValue } = getFirebaseAdmin();

        // Prevent duplicate notifications
        const eventKey = createHash("sha256")
            .update(eventId)
            .digest("hex");

        const eventRef = db
            .collection("orderPushEvents")
            .doc(eventKey);

        const claimed = await db.runTransaction(async (transaction) => {
            const existing = await transaction.get(eventRef);

            if (existing.exists) return false;

            transaction.create(eventRef, {
                orderId,
                createdAt: FieldValue.serverTimestamp()
            });

            return true;
        });

        if (!claimed) {
            return res.status(200).json({
                success: true,
                duplicate: true
            });
        }

        // Get registered admin devices
        const devices = await db
            .collection("adminPushDevices")
            .where("uid", "==", ADMIN_UID)
            .get();

        const deviceDocs = devices.docs;

        const tokens = deviceDocs
            .map((doc) => doc.get("token"))
            .filter(Boolean);

        if (!tokens.length) {
            return res.status(200).json({
                success: true,
                sent: 0,
                reason: "No registered devices"
            });
        }

        // Notification title
        const title = "KHAM — طلب جديد";

        // Notification body
        const body =
            `طلب جديد من ${customerName || "عميل"}`
            + (total ? ` بقيمة ${total}` : "")
            + ` — رقم الطلب: ${orderId}`;

        // Send notification
        const result = await messaging.sendEachForMulticast({
            notification: {
                title,
                body
            },

            data: {
                title,
                body,
                orderId,
                customerName: String(customerName || "عميل"),
                total: String(total || ""),
                url: "/admin.html"
            },

            webpush: {
                headers: {
                    Urgency: "high"
                },
                notification: {
                    icon: "/favicon.ico",
                    badge: "/favicon.ico",
                    tag: orderId,
                    renotify: true,
                    requireInteraction: true
                },
                fcmOptions: {
                    link: "https://kham-store.vercel.app/admin.html"
                }
            },

            tokens
        });

        console.log("FCM SEND RESULTS:", {
            orderId,
            successCount: result.successCount,
            failureCount: result.failureCount,
            responses: result.responses.map((item) => ({
                success: item.success,
                code: item.error?.code || null,
                message: item.error?.message || null
            }))
        });

        // Remove invalid device tokens
        const invalidIds = [];

        result.responses.forEach((item, index) => {
            if (
                !item.success &&
                [
                    "messaging/registration-token-not-registered",
                    "messaging/invalid-registration-token"
                ].includes(item.error?.code)
            ) {
                invalidIds.push(deviceDocs[index].id);
            }
        });

        if (invalidIds.length) {
            await Promise.all(
                invalidIds.map((id) =>
                    db.collection("adminPushDevices").doc(id).delete()
                )
            );
        }

        return res.status(200).json({
            success: true,
            sent: result.successCount,
            failed: result.failureCount,
            orderId
        });

    } catch (error) {
        console.error("Order push failed details:", error);
        console.error("Error stack:", error?.stack);

        return res.status(500).json({
            success: false,
            error: "Notification could not be sent"
        });
    }
};
