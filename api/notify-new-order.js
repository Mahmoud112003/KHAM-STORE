
const { createHash } = require("node:crypto");
const { getFirebaseAdmin } = require("./_firebase-admin");

const ADMIN_UID = "UYC7sTnExQds6M1o4PP5joixLNL2";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { orderId, eventId, customerName, total } = req.body || {};

    // Validate order reference
    if (
      typeof orderId !== "string" ||
      !/^KHM\d{1,4}$/.test(orderId) ||
      typeof eventId !== "string" ||
      !/^KHM\d{1,4}-\d{10,}$/.test(eventId)
    ) {
      return res.status(400).json({ error: "Invalid order reference" });
    }

    // Initialize Firebase Admin
    const { db, messaging, FieldValue } = getFirebaseAdmin();

    // Prevent duplicate notifications
    const eventKey = createHash("sha256")
      .update(eventId)
      .digest("hex");

    const eventRef = db.collection("orderPushEvents").doc(eventKey);

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

    // Send data-only FCM message
    const result = await messaging.sendEachForMulticast({
      data: {
        title: "KHAM — New order",
        body: `Order #${orderId}${
          customerName
            ? ` • ${String(customerName).slice(0, 45)}`
            : ""
        }${
          total
            ? ` • ${String(total).slice(0, 25)}`
            : ""
        }`,
        orderId,
        url: "/admin.html"
      },
      tokens
    });

    // Print FCM results to diagnose delivery failures
    console.log(
      "FCM SEND RESULTS:",
      result.responses.map((item) => ({
        success: item.success,
        code: item.error?.code,
        message: item.error?.message
      }))
    );

    // Remove invalid device tokens
    const invalidIds = [];

    result.responses.forEach((item, index) => {
      if (
        !item.success &&
        [
          "messaging/registration-token-not-registered",
          "messaging/invalid-registration-token"
        ].includes(item.error && item.error.code)
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
      failed: result.failureCount
    });

  } catch (error) {
    console.error("Order push failed details:", error);
    console.error("Error stack:", error?.stack);

    return res.status(500).json({
      error: "Notification could not be sent"
    });
  }
};
