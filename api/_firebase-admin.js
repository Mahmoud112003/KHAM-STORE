
const {
    cert,
    getApps,
    initializeApp
} = require("firebase-admin/app");

const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

function getFirebaseAdmin() {
    let raw = process.env.FIREBASE_SERVICE_ACCOUNT;

    // Read Base64 automatically if direct JSON is missing
    if (!raw && process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        try {
            raw = Buffer.from(
                process.env.FIREBASE_SERVICE_ACCOUNT_BASE64.replace(/\s/g, ""),
                "base64"
            ).toString("utf8");
        } catch (error) {
            throw new Error("Firebase service account Base64 is invalid.");
        }
    }

    if (!raw) {
        throw new Error(
            "FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_BASE64 is missing."
        );
    }

    let serviceAccount;

    try {
        serviceAccount = JSON.parse(raw);
    } catch (error) {
        throw new Error("Firebase service account JSON is invalid.");
    }

    if (
        serviceAccount.project_id !== "kham-4ee7c" ||
        !serviceAccount.client_email ||
        !serviceAccount.private_key
    ) {
        throw new Error("Firebase service account credentials are incomplete.");
    }

    let app = getApps().find(
        item => item.name === "kham-notifications"
    );

    if (!app) {
        app = initializeApp({
            credential: cert({
                ...serviceAccount,
                private_key: serviceAccount.private_key.replace(/\\n/g, "\n")
            }),
            projectId: "kham-4ee7c"
        }, "kham-notifications");
    }

    return {
        auth: getAuth(app),
        db: getFirestore(app),
        messaging: getMessaging(app),
        FieldValue
    };
}

module.exports = { getFirebaseAdmin };
