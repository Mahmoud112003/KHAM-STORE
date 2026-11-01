
const { createHash } = require("node:crypto");
const { getFirebaseAdmin } = require("./_firebase-admin");

const ADMIN_UID = "UYC7sTnExQds6M1o4PP5joixLNL2";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    // Verify authorization header
    const authorization = req.headers.authorization || "";
    const match = authorization.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      return res.status(401).json({
        error: "Authentication required"
      });
    }

    // Initialize Firebase Admin
    const { auth, db } = getFirebaseAdmin();

    // Verify Firebase ID token
    const decoded = await auth.verifyIdToken(match[1], true);

    if (decoded.uid !== ADMIN_UID) {
      return res.status(403).json({
        error: "Admin access required"
      });
    }

    // Validate FCM token
    const { token } = req.body || {};

    if (
      typeof token !== "string" ||
      token.length < 40 ||
      token.length > 4096
    ) {
      return res.status(400).json({
        error: "Invalid FCM token"
      });
    }

    // Generate hashed device ID
    const tokenId = createHash("sha256")
      .update(token)
      .digest("hex");

    // Save device token in Firestore
    await db.collection("adminPushDevices")
      .doc(tokenId)
      .set({
        token,
        uid: decoded.uid,
        updatedAt: new Date(),
        userAgent: String(
          req.headers["user-agent"] || ""
        ).slice(0, 300)
      }, {
        merge: true
      });

    return res.status(200).json({
      success: true
    });

  } catch (error) {
    // Log full error details in Vercel
    console.error("Device registration failed:", {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    return res.status(500).json({
      error: "Device registration failed"
    });
  }
};
