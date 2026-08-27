const express = require("express");
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 10000;

// ==========================================
// FIREBASE REALTIME DATABASE
// ==========================================

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

// ==========================================
// HOME
// ==========================================

app.get("/", (req, res) => {
  res.json({
    status: "online",
    bot: "MAKYAMA BOT V2",
    database: "Firebase Realtime Database"
  });
});

// ==========================================
// HEALTH
// ==========================================

app.get("/health", async (req, res) => {
  try {
    await db.ref(REQUESTS_PATH).limitToFirst(1).once("value");

    res.json({
      status: "ok",
      firebase: "connected",
      database: "Realtime Database"
    });

  } catch (error) {

    console.error("❌ Health error:", error);

    res.status(500).json({
      status: "error",
      firebase: "connection_failed",
      message: error.message
    });
  }
});

// ==========================================
// CHECK MEDIA
// ==========================================

async function contentExists(contentId, title) {

  const snapshot = await db.ref(MEDIA_PATH).once("value");

  if (!snapshot.exists()) {
    return false;
  }

  let found = false;

  snapshot.forEach((child) => {

    const data = child.val() || {};

    const savedContentId =
      String(data.contentId || "").trim();

    const savedTitle =
      String(data.title || data.jina || "")
        .trim()
        .toLowerCase();

    if (
      contentId &&
      savedContentId === String(contentId).trim()
    ) {
      found = true;
    }

    if (
      title &&
      savedTitle === String(title).trim().toLowerCase()
    ) {
      found = true;
    }

  });

  return found;
}

// ==========================================
// DELETE REQUEST
// ==========================================

async function deleteRequest(requestId) {

  try {

    await db
      .ref(`${REQUESTS_PATH}/${requestId}`)
      .remove();

    console.log(
      "🗑️ Request imefutwa Firebase:",
      requestId
    );

  } catch (error) {

    console.error(
      "❌ Imeshindikana kufuta request:",
      requestId,
      error
    );

  }

}

// ==========================================
// PROCESS ONE REQUEST
// ==========================================

async function processOneRequest(requestId, request) {

  const title =
    request.title ||
    request.jina ||
    request.query ||
    "";

  const contentId =
    request.contentId ||
    "";

  console.log("");
  console.log("=================================");
  console.log("📥 REQUEST MPYA");
  console.log("ID:", requestId);
  console.log("QUERY:", title);
  console.log("=================================");

  try {

    // --------------------------------------
    // MARK PROCESSING
    // --------------------------------------

    await db
      .ref(`${REQUESTS_PATH}/${requestId}`)
      .update({
        status: "processing",
        startedAt: Date.now()
      });

    console.log("⏳ Status: processing");

    // --------------------------------------
    // CHECK IF ALREADY EXISTS
    // --------------------------------------

    const exists =
      await contentExists(contentId, title);

    if (exists) {

      console.log(
        "ℹ️ Content tayari ipo Firebase:",
        title
      );

      // Request ikishafanyiwa kazi -> FUTA
      await deleteRequest(requestId);

      return;
    }

    // --------------------------------------
    // HAPA NDIPO DOWNLOAD/SOURCE YA AUDIO
    // ITAUNGANISHWA
    // --------------------------------------

    console.log(
      "🔎 Content haipo:",
      title
    );

    console.log(
      "⚠️ Hakuna audio inayohifadhiwa Firebase."
    );

    console.log(
      "🔗 Firebase itahifadhi LINK pekee."
    );

    /*
      HAPA TUTAWEKA MFUMO WA KUTAFUTA AUDIO
      NA KUPATA DIRECT LINK.

      Mfano wa data utakayoweka kwenye media:

      {
        jina: "Mario Dunia",
        artist: "Artist",
        picha: "https://....jpg",
        linkAudio: "https://....mp3",
        contentId: "...",
        createdAt: Date.now()
      }

      Firebase haitahifadhi file la audio.
    */

    // --------------------------------------
    // KWA SASA REQUEST IMEFANYIWA PROCESS
    // --------------------------------------

    console.log(
      "⚠️ Request imefika BOT lakini source ya audio bado haijaunganishwa."
    );

    // Kwa sababu hatuna audio/link bado,
    // tunaacha processing ili isiweze kufutwa
    // kabla ya kupata link.

  } catch (error) {

    console.error(
      "❌ Error processing:",
      requestId
    );

    console.error(error);

    await db
      .ref(`${REQUESTS_PATH}/${requestId}`)
      .update({
        status: "error",
        error: error.message,
        updatedAt: Date.now()
      });

  }

}

// ==========================================
// PROCESS ALL REQUESTS
// ==========================================

async function processRequests() {

  try {

    console.log("🔎 Checking MAKYAMA requests...");

    const snapshot =
      await db
        .ref(REQUESTS_PATH)
        .once("value");

    if (!snapshot.exists()) {

      console.log(
        "ℹ️ Hakuna requests kwenye Firebase."
      );

      return;
    }

    const requests = [];

    snapshot.forEach((child) => {

      const request =
        child.val() || {};

      if (request.status === "pending") {

        requests.push({
          id: child.key,
          data: request
        });

      }

    });

    if (requests.length === 0) {

      console.log(
        "ℹ️ Hakuna request yenye status = pending."
      );

      return;
    }

    console.log(
      `📦 Requests pending: ${requests.length}`
    );

    // Process moja baada ya nyingine
    for (const item of requests) {

      await processOneRequest(
        item.id,
        item.data
      );

    }

  } catch (error) {

    console.error(
      "❌ Firebase error:"
    );

    console.error(error);

  }

}

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {

  console.log("");
  console.log("=================================");
  console.log(
    `🚀 MAKYAMA BOT V2 online kwenye port ${PORT}`
  );
  console.log("=================================");

  console.log(
    "🔥 Firebase Realtime Database:"
  );

  console.log(
    process.env.FIREBASE_DATABASE_URL ||
    "https://makyama-e5e89-default-rtdb.firebaseio.com/"
  );

  console.log("");

  // Run immediately
  processRequests();

});

// ==========================================
// CHECK EVERY 10 SECONDS
// ==========================================

setInterval(() => {

  processRequests();

}, 10000);
