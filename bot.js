const express = require("express");
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 10000;

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(express.json({ limit: "1mb" }));

// ==========================================
// FIREBASE
// ==========================================

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT haijawekwa kwenye Render!");
  process.exit(1);
}

let serviceAccount;

try {
  serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT
  );
} catch (error) {
  console.error(
    "❌ FIREBASE_SERVICE_ACCOUNT si JSON sahihi!"
  );
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
// ALLOWED URL CHECK
// ==========================================

function validateAudioUrl(audioUrl) {

  if (!audioUrl) {
    return {
      valid: false,
      reason: "AUDIO_URL_MISSING"
    };
  }

  if (typeof audioUrl !== "string") {
    return {
      valid: false,
      reason: "AUDIO_URL_MUST_BE_STRING"
    };
  }

  audioUrl = audioUrl.trim();

  if (!audioUrl) {
    return {
      valid: false,
      reason: "AUDIO_URL_EMPTY"
    };
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(audioUrl);
  } catch (error) {
    return {
      valid: false,
      reason: "INVALID_AUDIO_URL"
    };
  }

  // HTTP/HTTPS pekee
  if (
    parsedUrl.protocol !== "http:" &&
    parsedUrl.protocol !== "https:"
  ) {
    return {
      valid: false,
      reason: "ONLY_HTTP_HTTPS_ALLOWED"
    };
  }

  // Zuia localhost
  const hostname =
    parsedUrl.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  ) {
    return {
      valid: false,
      reason: "LOCALHOST_NOT_ALLOWED"
    };
  }

  // Zuia private IP ranges za kawaida
  const privateIpPatterns = [
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./
  ];

  for (const pattern of privateIpPatterns) {
    if (pattern.test(hostname)) {
      return {
        valid: false,
        reason: "PRIVATE_IP_NOT_ALLOWED"
      };
    }
  }

  return {
    valid: true,
    url: parsedUrl.toString()
  };
}

// ==========================================
// HOME
// ==========================================

app.get("/", (req, res) => {

  res.json({
    status: "online",
    bot: "MAKYAMA BOT V2",
    database: "Firebase Realtime Database",
    version: "2.1"
  });
});

// ==========================================
// HEALTH
// ==========================================

app.get("/health", async (req, res) => {

  try {

    await db
      .ref(REQUESTS_PATH)
      .limitToFirst(1)
      .once("value");

    res.json({
      status: "ok",
      firebase: "connected"
    });

  } catch (error) {

    console.error(
      "❌ Health error:",
      error
    );

    res.status(500).json({
      status: "error",
      firebase: "error",
      message: error.message
    });
  }
});

// ==========================================
// GET ONE REQUEST
// ==========================================

app.get(
  "/request/:requestId",
  async (req, res) => {

    try {

      const requestId =
        req.params.requestId;

      const snapshot =
        await db
          .ref(
            `${REQUESTS_PATH}/${requestId}`
          )
          .once("value");

      if (!snapshot.exists()) {

        return res.status(404).json({
          success: false,
          message: "Request haipo."
        });
      }

      res.json({
        success: true,
        requestId,
        data: snapshot.val()
      });

    } catch (error) {

      console.error(
        "❌ Request error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// ==========================================
// ADD AUDIO SOURCE TO REQUEST
// ==========================================

app.post(
  "/source/:requestId",
  async (req, res) => {

    try {

      const requestId =
        req.params.requestId;

      const audioUrl =
        req.body.linkAudio ||
        req.body.audioUrl ||
        req.body.downloadUrl ||
        "";

      const validation =
        validateAudioUrl(audioUrl);

      if (!validation.valid) {

        return res.status(400).json({
          success: false,
          message:
            "Audio URL haikubaliki.",
          reason:
            validation.reason
        });
      }

      const requestRef =
        db.ref(
          `${REQUESTS_PATH}/${requestId}`
        );

      const snapshot =
        await requestRef.once("value");

      if (!snapshot.exists()) {

        return res.status(404).json({
          success: false,
          message: "Request haipo."
        });
      }

      const request =
        snapshot.val() || {};

      await requestRef.update({

        linkAudio:
          validation.url,

        audioUrl:
          validation.url,

        downloadUrl:
          validation.url,

        status: "pending",

        message:
          "Audio source imewekwa. Inasubiri processing.",

        updatedAt:
          Date.now()
      });

      console.log("");
      console.log(
        "🔗 AUDIO SOURCE IMEWEKWA"
      );
      console.log(
        "Request:",
        requestId
      );
      console.log(
        "Title:",
        request.title ||
        request.jina ||
        request.query ||
        "Unknown"
      );
      console.log(
        "URL:",
        validation.url
      );

      res.json({

        success: true,

        message:
          "Audio source imeongezwa.",

        requestId,

        audioUrl:
          validation.url
      });

    } catch (error) {

      console.error(
        "❌ Source error:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          error.message
      });
    }
  }
);

// ==========================================
// CHECK MEDIA
// ==========================================

async function contentExists(
  contentId,
  title
) {

  const snapshot =
    await db
      .ref(MEDIA_PATH)
      .once("value");

  if (!snapshot.exists()) {
    return false;
  }

  let found = false;

  snapshot.forEach((child) => {

    const data =
      child.val() || {};

    const savedId =
      String(
        data.contentId || ""
      ).trim();

    const savedTitle =
      String(
        data.title ||
        data.jina ||
        ""
      )
        .trim()
        .toLowerCase();

    if (
      contentId &&
      savedId ===
        String(contentId).trim()
    ) {
      found = true;
    }

    if (
      title &&
      savedTitle ===
        String(title)
          .trim()
          .toLowerCase()
    ) {
      found = true;
    }
  });

  return found;
}

// ==========================================
// DELETE REQUEST
// ==========================================

async function deleteRequest(
  requestId
) {

  await db
    .ref(
      `${REQUESTS_PATH}/${requestId}`
    )
    .remove();

  console.log(
    "🗑️ Request imefutwa:",
    requestId
  );
}

// ==========================================
// SAVE MEDIA
// ==========================================

async function saveMedia(
  request
) {

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

  const audioUrl =
    request.linkAudio ||
    request.audioUrl ||
    request.downloadUrl ||
    "";

  // -------------------------------
  // CHECK URL
  // -------------------------------

  const validation =
    validateAudioUrl(audioUrl);

  if (!validation.valid) {

    return {
      success: false,
      reason: validation.reason
    };
  }

  // -------------------------------
  // MEDIA DATA
  // -------------------------------

  const mediaData = {

    jina: title,

    title: title,

    artist: artist,

    picha: cover,

    cover: cover,

    linkAudio:
      validation.url,

    audioUrl:
      validation.url,

    downloadUrl:
      validation.url,

    contentId:
      contentId,

    views: 0,

    createdAt:
      Date.now()
  };

  // -------------------------------
  // SAVE
  // -------------------------------

  const newMedia =
    await db
      .ref(MEDIA_PATH)
      .push(mediaData);

  console.log("");
  console.log(
    "================================="
  );
  console.log(
    "✅ MEDIA IMEHIFADHIWA"
  );
  console.log(
    "================================="
  );

  console.log(
    "🎵 Title:",
    title
  );

  console.log(
    "👤 Artist:",
    artist
  );

  console.log(
    "🔗 Audio URL:",
    validation.url
  );

  console.log(
    "🆔 Media ID:",
    newMedia.key
  );

  return {

    success: true,

    mediaId:
      newMedia.key
  };
}

// ==========================================
// PROCESS ONE REQUEST
// ==========================================

async function processOneRequest(
  requestId,
  request
) {

  const title =
    request.title ||
    request.jina ||
    request.query ||
    "";

  const contentId =
    request.contentId ||
    "";

  console.log("");
  console.log(
    "================================="
  );

  console.log(
    "📥 REQUEST MPYA"
  );

  console.log(
    "ID:",
    requestId
  );

  console.log(
    "QUERY:",
    title
  );

  console.log(
    "================================="
  );

  try {

    // --------------------------------------
    // MARK PROCESSING
    // --------------------------------------

    await db
      .ref(
        `${REQUESTS_PATH}/${requestId}`
      )
      .update({

        status:
          "processing",

        startedAt:
          request.startedAt ||
          Date.now(),

        updatedAt:
          Date.now()
      });

    console.log(
      "⏳ Status: processing"
    );

    // --------------------------------------
    // CHECK EXISTING MEDIA
    // --------------------------------------

    const exists =
      await contentExists(
        contentId,
        title
      );

    if (exists) {

      console.log(
        "ℹ️ Media tayari ipo:",
        title
      );

      await deleteRequest(
        requestId
      );

      return;
    }

    // --------------------------------------
    // GET AUDIO URL
    // --------------------------------------

    const audioUrl =
      request.linkAudio ||
      request.audioUrl ||
      request.downloadUrl ||
      "";

    // --------------------------------------
    // SOURCE HAIPO
    // --------------------------------------

    if (!audioUrl) {

      console.log(
        "⚠️ Direct audio URL haijawekwa."
      );

      await db
        .ref(
          `${REQUESTS_PATH}/${requestId}`
        )
        .update({

          status:
            "waiting_source",

          message:
            "Weka direct audio URL yenye ruhusa kupitia /source/:requestId.",

          updatedAt:
            Date.now()
        });

      return;
    }

    // --------------------------------------
    // VALIDATE AUDIO URL
    // --------------------------------------

    const validation =
      validateAudioUrl(audioUrl);

    if (!validation.valid) {

      console.log(
        "❌ Audio URL imekataliwa:",
        validation.reason
      );

      await db
        .ref(
          `${REQUESTS_PATH}/${requestId}`
        )
        .update({

          status:
            "error",

          message:
            "Audio URL haikubaliki.",

          reason:
            validation.reason,

          updatedAt:
            Date.now()
        });

      return;
    }

    // --------------------------------------
    // SAVE MEDIA
    // --------------------------------------

    const result =
      await saveMedia(request);

    if (!result.success) {

      await db
        .ref(
          `${REQUESTS_PATH}/${requestId}`
        )
        .update({

          status:
            "error",

          message:
            result.reason,

          updatedAt:
            Date.now()
        });

      return;
    }

    // --------------------------------------
    // COMPLETE
    // --------------------------------------

    await db
      .ref(
        `${REQUESTS_PATH}/${requestId}`
      )
      .update({

        status:
          "completed",

        mediaId:
          result.mediaId,

        message:
          "Media imehifadhiwa successfully.",

        completedAt:
          Date.now(),

        updatedAt:
          Date.now()
      });

    console.log("");
    console.log(
      "🎉 REQUEST IMEKAMILIKA"
    );

    console.log(
      "🎵:",
      title
    );

    console.log(
      "🆔 Media:",
      result.mediaId
    );

    // --------------------------------------
    // DELETE AFTER SUCCESS
    // --------------------------------------

    await deleteRequest(
      requestId
    );

  } catch (error) {

    console.error("");
    console.error(
      "❌ ERROR PROCESSING REQUEST"
    );

    console.error(
      "Request:",
      requestId
    );

    console.error(error);

    try {

      await db
        .ref(
          `${REQUESTS_PATH}/${requestId}`
        )
        .update({

          status:
            "error",

          error:
            error.message,

          updatedAt:
            Date.now()
        });

    } catch (firebaseError) {

      console.error(
        "❌ Firebase update error:",
        firebaseError
      );
    }
  }
}

// ==========================================
// PROCESS ALL PENDING REQUESTS
// ==========================================

let processing = false;

async function processRequests() {

  if (processing) {
    return;
  }

  processing = true;

  try {

    console.log(
      "🔎 Checking MAKYAMA requests..."
    );

    const snapshot =
      await db
        .ref(REQUESTS_PATH)
        .once("value");

    if (!snapshot.exists()) {

      console.log(
        "ℹ️ Hakuna requests."
      );

      return;
    }

    const requests = [];

    snapshot.forEach(
      (child) => {

        const data =
          child.val() || {};

        if (
          data.status ===
          "pending"
        ) {

          requests.push({

            id:
              child.key,

            data:
              data
          });
        }
      }
    );

    if (
      requests.length === 0
    ) {

      console.log(
        "ℹ️ Hakuna pending requests."
      );

      return;
    }

    console.log(
      `📦 Pending requests: ${requests.length}`
    );

    // --------------------------------------
    // PROCESS ONE BY ONE
    // --------------------------------------

    for (
      const item of requests
    ) {

      await processOneRequest(
        item.id,
        item.data
      );
    }

  } catch (error) {

    console.error(
      "❌ Firebase processing error:"
    );

    console.error(error);

  } finally {

    processing = false;
  }
}

// ==========================================
// GET MEDIA LIST
// ==========================================

app.get(
  "/media",
  async (req, res) => {

    try {

      const snapshot =
        await db
          .ref(MEDIA_PATH)
          .once("value");

      if (!snapshot.exists()) {

        return res.json({
          success: true,
          count: 0,
          media: []
        });
      }

      const media = [];

      snapshot.forEach(
        (child) => {

          media.push({

            id:
              child.key,

            ...child.val()
          });
        }
      );

      res.json({

        success: true,

        count:
          media.length,

        media:
          media
      });

    } catch (error) {

      console.error(
        "❌ Media error:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          error.message
      });
    }
  }
);

// ==========================================
// START SERVER
// ==========================================

app.listen(
  PORT,
  () => {

    console.log("");
    console.log(
      "================================="
    );

    console.log(
      `🚀 MAKYAMA BOT V2 online`
    );

    console.log(
      `🌐 Port: ${PORT}`
    );

    console.log(
      "================================="
    );

    console.log(
      "🔥 Firebase:"
    );

    console.log(
      process.env.FIREBASE_DATABASE_URL ||
      "https://makyama-e5e89-default-rtdb.firebaseio.com/"
    );

    console.log("");

    // Start first check
    processRequests();
  }
);

// ==========================================
// CHECK EVERY 10 SECONDS
// ==========================================

setInterval(
  () => {

    processRequests();

  },
  10000
);
