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
// DOWNLOAD PROXY
// ==========================================
// Hii inafanya direct audio URL ipitie Render.
// Inatumika kwa audio ambazo una ruhusa ya kuzisambaza.
// ==========================================

app.get("/download", async (req, res) => {
  try {
    const url = String(req.query.url || "").trim();

    if (!url) {
      return res.status(400).send("Audio URL haipo.");
    }

    // Ruhusu HTTPS pekee
    let parsed;

    try {
      parsed = new URL(url);
    } catch {
      return res.status(400).send("Audio URL si sahihi.");
    }

    if (parsed.protocol !== "https:") {
      return res.status(400).send("HTTPS URL pekee inaruhusiwa.");
    }

    console.log("⬇️ Download request:", url);

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).send(
        "Faili la audio halijapatikana."
      );
    }

    const contentType =
      response.headers.get("content-type") ||
      "application/octet-stream";

    const contentLength =
      response.headers.get("content-length");

    const fileName =
      decodeURIComponent(
        parsed.pathname.split("/").pop() || "Makyama_Audio.mp3"
      ).replace(/[^a-zA-Z0-9._-]/g, "_");

    res.setHeader("Content-Type", contentType);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );

    res.setHeader(
      "Cache-Control",
      "no-store"
    );

    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }

    // Stream moja kwa moja kwa mteja
    if (response.body) {
      const reader = response.body.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          res.write(Buffer.from(value));
        }

        res.end();

      } catch (streamError) {
        console.error("❌ Download stream error:", streamError);

        if (!res.headersSent) {
          res.status(500).send("Download imeshindikana.");
        } else {
          res.end();
        }
      }

    } else {
      const buffer = Buffer.from(
        await response.arrayBuffer()
      );

      res.end(buffer);
    }

  } catch (error) {
    console.error("❌ Download error:", error);

    if (!res.headersSent) {
      res.status(500).send("Download imeshindikana.");
    }
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
// ADD MEDIA
// ==========================================

async function addMedia(data) {
  const ref = await db
    .ref(MEDIA_PATH)
    .push(data);

  console.log(
    "🎵 Media imeongezwa Firebase:",
    ref.key
  );

  return ref.key;
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
    // CHECK EXISTING
    // --------------------------------------

    const exists =
      await contentExists(contentId, title);

    if (exists) {

      console.log(
        "ℹ️ Content tayari ipo Firebase:",
        title
      );

      await deleteRequest(requestId);

      return;
    }

    // --------------------------------------
    // DIRECT AUDIO URL
    // --------------------------------------
    // Request inaweza kuwa na linkAudio ikiwa
    // wewe/admin umeweka direct audio link halali.
    // --------------------------------------

    const audioUrl =
      request.linkAudio ||
      request.audioUrl ||
      request.downloadUrl ||
      "";

    const cover =
      request.cover ||
      request.picha ||
      "";

    const artist =
      request.artist ||
      "MAKYAMA";

    if (!audioUrl) {

      await db
        .ref(`${REQUESTS_PATH}/${requestId}`)
        .update({
          status: "waiting_source",
          message:
            "Direct audio URL haijawekwa. Weka linkAudio/audioUrl yenye ruhusa.",
          updatedAt: Date.now()
        });

      console.log(
        "⚠️ Hakuna direct audio URL:",
        title
      );

      return;
    }

    // --------------------------------------
    // CHECK URL
    // --------------------------------------

    let parsed;

    try {
      parsed = new URL(audioUrl);
    } catch {

      await db
        .ref(`${REQUESTS_PATH}/${requestId}`)
        .update({
          status: "error",
          error: "Audio URL si sahihi.",
          updatedAt: Date.now()
        });

      return;
    }

    if (parsed.protocol !== "https:") {

      await db
        .ref(`${REQUESTS_PATH}/${requestId}`)
        .update({
          status: "error",
          error: "Audio URL lazima iwe HTTPS.",
          updatedAt: Date.now()
        });

      return;
    }

    // --------------------------------------
    // SAVE LINK ONLY
    // --------------------------------------

    const mediaData = {
      jina: title,
      artist: artist,
      picha: cover,
      linkAudio: audioUrl,
      contentId: contentId,
      views: 0,
      createdAt: Date.now()
    };

    await addMedia(mediaData);

    console.log(
      "✅ Audio link imehifadhiwa:",
      audioUrl
    );

    // --------------------------------------
    // REQUEST IMEKAMILIKA -> FUTA
    // --------------------------------------

    await deleteRequest(requestId);

    console.log(
      "🎉 REQUEST IMEKAMILIKA:",
      title
    );

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
