const express = require("express");
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 10000;

// ==========================================
// FIREBASE
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
      firebase: "connected"
    });
  } catch (error) {
    console.error("❌ Health error:", error);

    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

// ==========================================
// CHECK MEDIA
// ==========================================

async function contentExists(contentId, title) {
  const snapshot = await db.ref(MEDIA_PATH).once("value");

  if (!snapshot.exists()) return false;

  let found = false;

  snapshot.forEach((child) => {
    const data = child.val() || {};

    const savedId = String(data.contentId || "").trim();

    const savedTitle = String(
      data.title || data.jina || ""
    )
      .trim()
      .toLowerCase();

    if (
      contentId &&
      savedId === String(contentId).trim()
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
  await db
    .ref(`${REQUESTS_PATH}/${requestId}`)
    .remove();

  console.log("🗑️ Request imefutwa:", requestId);
}

// ==========================================
// SAVE MEDIA
// ==========================================

async function saveMedia(request) {

  const title =
    request.title ||
    request.jina ||
    request.query ||
    "Untitled";

  const artist =
    request.artist ||
    "MAKYAMA";

  const cover =
    request.cover ||
    request.picha ||
    "";

  const contentId =
    request.contentId ||
    "";

  // Direct URL inayotolewa na source
  const audioUrl =
    request.linkAudio ||
    request.audioUrl ||
    request.downloadUrl ||
    "";

  if (!audioUrl) {
    return {
      success: false,
      reason: "NO_AUDIO_URL"
    };
  }

  // Hakikisha ni URL
  let parsedUrl;

  try {
    parsedUrl = new URL(audioUrl);
  } catch (error) {
    return {
      success: false,
      reason: "INVALID_AUDIO_URL"
    };
  }

  // Tunahifadhi LINK PEKEE
  const mediaData = {
    jina: title,
    artist: artist,
    picha: cover,
    linkAudio: parsedUrl.toString(),
    contentId: contentId,
    views: 0,
    createdAt: Date.now()
  };

  const newMedia =
    await db.ref(MEDIA_PATH).push(mediaData);

  console.log("✅ Media imehifadhiwa:");
  console.log("🎵 Title:", title);
  console.log("🔗 Link:", parsedUrl.toString());
  console.log("🆔 Media ID:", newMedia.key);

  return {
    success: true,
    mediaId: newMedia.key
  };
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
    // CHECK EXISTING MEDIA
    // --------------------------------------

    const exists =
      await contentExists(contentId, title);

    if (exists) {

      console.log(
        "ℹ️ Wimbo tayari upo:",
        title
      );

      // Tayari umefanyiwa kazi
      await deleteRequest(requestId);

      return;
    }

    // --------------------------------------
    // GET DIRECT AUDIO URL
    // --------------------------------------

    const audioUrl =
      request.linkAudio ||
      request.audioUrl ||
      request.downloadUrl ||
      "";

    if (!audioUrl) {

      console.log(
        "⚠️ Direct audio URL haijawekwa."
      );

      await db
        .ref(`${REQUESTS_PATH}/${requestId}`)
        .update({
          status: "waiting_source",
          message:
            "Weka linkAudio/audioUrl yenye ruhusa.",
          updatedAt: Date.now()
        });

      return;
    }

    // --------------------------------------
    // SAVE LINK ONLY
    // --------------------------------------

    const result =
      await saveMedia(request);

    if (!result.success) {

      await db
        .ref(`${REQUESTS_PATH}/${requestId}`)
        .update({
          status: "error",
          message: result.reason,
          updatedAt: Date.now()
        });

      return;
    }

    // --------------------------------------
    // REQUEST IMEKAMILIKA
    // FUTA REQUEST
    // --------------------------------------

    console.log(
      "🎉 Request imekamilika:",
      title
    );

    await deleteRequest(requestId);

  } catch (error) {

    console.error(
      "❌ Error processing request:",
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
// PROCESS ALL PENDING REQUESTS
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

      const data =
        child.val() || {};

      if (data.status === "pending") {

        requests.push({
          id: child.key,
          data: data
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

  processRequests();
});

// ==========================================
// CHECK EVERY 10 SECONDS
// ==========================================

setInterval(() => {
  processRequests();
}, 10000);
