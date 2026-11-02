
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

    let stage = "start";

    try {
        stage = "authorization";

        const authorization = req.headers.authorization || "";
        const match = authorization.match(/^Bearer\s+(.+)$/i);

        if (!match) {
            return res.status(401).json({
                success: false,
                error: "Authentication required",
                stage
            });
        }

        stage = "firebase_admin_init";

        const { auth, db } = getFirebaseAdmin();

        stage = "verify_admin_token";

        const decoded = await auth.verifyIdToken(match[1]);

        if (decoded.uid !== ADMIN_UID) {
            return res.status(403).json({
                success: false,
                error: "Admin access required",
                stage
            });
        }

        stage = "validate_fcm_token";

        const { token } = req.body || {};

        if (
            typeof token !== "string" ||
            token.length < 40 ||
            token.length > 4096
        ) {
            return res.status(400).json({
                success: false,
                error: "Invalid FCM token",
                stage
            });
        }

        stage = "save_firestore";

        const tokenId = createHash("sha256")
            .update(token)
            .digest("hex");

        await db.collection("adminPushDevices").doc(tokenId).set({
            token,
            uid: decoded.uid,
            updatedAt: new Date(),
            userAgent: String(
                req.headers["user-agent"] || ""
            ).slice(0, 300)
        }, { merge: true });

        console.log("Push device registered successfully:", tokenId);

        return res.status(200).json({
            success: true,
            message: "Device registered successfully"
        });

    } catch (error) {
        console.error("Push registration failure:", {
            stage,
            code: error.code || null,
            message: error.message || String(error)
        });

        return res.status(500).json({
            success: false,
            error: "Device registration failed",
            stage
        });
    }
};
