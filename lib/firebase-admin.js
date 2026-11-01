
const {
  cert,
  getApps,
  initializeApp
} = require("firebase-admin/app");

const {
  getAuth
} = require("firebase-admin/auth");

const {
  getFirestore
} = require("firebase-admin/firestore");

const {
  getMessaging
} = require("firebase-admin/messaging");

function getFirebaseAdmin() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is missing.");
  }

  let serviceAccount;

  try {
    serviceAccount = JSON.parse(raw);
  } catch {
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
    (item) => item.name === "kham-notifications"
  );

  if (!app) {
    app = initializeApp(
      {
        credential: cert({
          ...serviceAccount,
          private_key: serviceAccount.private_key.replace(/\\n/g, "\n")
        }),
        projectId: "kham-4ee7c"
      },
      "kham-notifications"
    );
  }

  return {
    auth: getAuth(app),
    db: getFirestore(app),
    messaging: getMessaging(app)
  };
}

module.exports = { getFirebaseAdmin };