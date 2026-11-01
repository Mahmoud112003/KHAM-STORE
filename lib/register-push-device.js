
const { createHash } = require("node:crypto");
const { getFirebaseAdmin } = require("../lib/firebase-admin");

const ADMIN_UID = "UYC7sTnExQds6M1o4PP5joixLNL2";

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const authorization = req.headers.authorization || "";
    const match = authorization.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { auth, db } = getFirebaseAdmin();

    const decoded = await auth.verifyIdToken(match[1], true);

    if (decoded.uid !== ADMIN_UID) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { token } = req.body || {};

    if (typeof token !== "string" || token.length < 20) {
      return res.status(400).json({ error: "Invalid FCM token" });
    }

    const tokenId = createHash("sha256")
      .update(token)
      .digest("hex");

    await db.collection("adminPushDevices").doc(tokenId).set({
      token,
      uid: decoded.uid,
      updatedAt: new Date()
    }, { merge: true });

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("Device registration failed:", error.code || error.name);
    return res.status(500).json({
      error: "Device registration failed"
    });
  }
};
