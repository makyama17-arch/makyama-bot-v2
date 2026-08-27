const express = require("express");
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 10000;

// ===============================
// FIREBASE REALTIME DATABASE
// ===============================

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT haijawekwa kwenye Render!");
  process.exit(1);
}

let serviceAccount;

try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (error) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT si JSON sahihi!");
  console.error(error);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    process.env.FIREBASE_DATABASE_URL ||
    "https://makyama-e5e89-default-rtdb.firebaseio.com/"
});

const db = admin.database();

const REQUESTS_PATH = "requests";
const MEDIA_PATH = "media";

// ===============================
// HOME
// ===============================

app.get("/", (req, res) => {
  res.json({
    status: "online",
    bot: "MAKYAMA BOT V2",
    database: "Realtime Database"
  });
});

// ===============================
// HEALTH CHECK
// ===============================

app.get("/health", async (req, res) => {
  try {
    await db.ref(".info/connected").once("value");

    res.json({
      status: "ok",
      firebase: "connected",
      database: "Realtime Database"
    });
  } catch (error) {
    console.error("Health check error:", error);

    res.status(500).json({
      status: "error",
      firebase: "connection_failed",
      message: error.message
    });
  }
});

// ===============================
// CHECK IF CONTENT EXISTS
// ===============================

async function contentExists(contentId, title) {
  try {
    const snapshot = await db.ref(MEDIA_PATH).once("value");

    if (!snapshot.exists()) {
      return false;
    }

    let found = false;

    snapshot.forEach((child) => {
      const data = child.val() || {};

      // Check contentId
      if (
        contentId &&
        String(data.contentId || "").trim() ===
          String(contentId).trim()
      ) {
        found = true;
      }

      // Check title
      if (
        title &&
        String(data.title || data.jina || "")
          .trim()
          .toLowerCase() === String(title).trim().toLowerCase()
      ) {
        found = true;
      }
    });

    return found;
  } catch (error) {
    console.error("❌ Error checking media:", error);
    throw error;
  }
}

// ===============================
// PROCESS REQUESTS
// ===============================

async function processRequests() {
  try {
    console.log("🔎 Checking MAKYAMA requests...");

    const snapshot = await db.ref(REQUESTS_PATH).once("value");

    if (!snapshot.exists()) {
      console.log("ℹ️ Hakuna requests kwenye Firebase.");
      return;
    }

    let processed = 0;

    snapshot.forEach(async (child) => {
      const requestId = child.key;
      const request = child.val() || {};

      // Only process pending requests
      if (request.status !== "pending") {
        return;
      }

      processed++;

      console.log("📥 Request:", request.title || request.jina || requestId);

      const title = request.title || request.jina || "";
      const contentId = request.contentId || "";

      try {
        // Check whether content already exists
        const exists = await contentExists(contentId, title);

        if (exists) {
          await db.ref(`${REQUESTS_PATH}/${requestId}`).update({
            status: "already_exists",
            checkedAt: Date.now()
          });

          console.log("✅ Tayari ipo Firebase:", title);
          return;
        }

        // Mark as processing
        await db.ref(`${REQUESTS_PATH}/${requestId}`).update({
          status: "processing",
          startedAt: Date.now()
        });

        console.log("⏳ Content haipo:", title);
        console.log("📦 Download/Catbox itaongezwa hatua inayofuata.");

      } catch (error) {
        console.error(
          "❌ Error processing request:",
          requestId,
          error
        );

        await db.ref(`${REQUESTS_PATH}/${requestId}`).update({
          status: "error",
          error: error.message,
          updatedAt: Date.now()
        });
      }
    });

    if (processed === 0) {
      console.log("ℹ️ Hakuna request yenye status = pending.");
    }

  } catch (error) {
    console.error("❌ Firebase error:", error);
  }
}

// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {
  console.log(
    `🚀 MAKYAMA BOT V2 online kwenye port ${PORT}`
  );

  console.log(
    "🔥 Using Firebase Realtime Database:"
  );

  console.log(
    process.env.FIREBASE_DATABASE_URL ||
      "https://makyama-e5e89-default-rtdb.firebaseio.com/"
  );

  // Run immediately
  processRequests();
});

// ===============================
// CHECK EVERY 10 SECONDS
// ===============================

setInterval(() => {
  processRequests();
}, 10000);
