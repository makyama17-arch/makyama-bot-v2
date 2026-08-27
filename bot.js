const express = require("express");
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 10000;

// Firebase
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error("FIREBASE_SERVICE_ACCOUNT haijawekwa!");
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const REQUESTS_COLLECTION = "audio_requests";
const MEDIA_COLLECTION = "media";

// Render Web Service inahitaji port
app.get("/", (req, res) => {
  res.json({
    status: "online",
    bot: "MAKYAMA BOT V2"
  });
});

// Angalia kama content ipo tayari Firebase
async function contentExists(contentId, title) {
  if (contentId) {
    const result = await db
      .collection(MEDIA_COLLECTION)
      .where("contentId", "==", contentId)
      .limit(1)
      .get();

    if (!result.empty) {
      return true;
    }
  }

  if (title) {
    const result = await db
      .collection(MEDIA_COLLECTION)
      .where("title", "==", title)
      .limit(1)
      .get();

    if (!result.empty) {
      return true;
    }
  }

  return false;
}

// Shughulikia requests
async function processRequests() {
  try {
    const snapshot = await db
      .collection(REQUESTS_COLLECTION)
      .where("status", "==", "pending")
      .limit(5)
      .get();

    if (snapshot.empty) {
      console.log("Hakuna request mpya.");
      return;
    }

    for (const doc of snapshot.docs) {
      const request = doc.data();

      console.log("Request:", request.title);

      const exists = await contentExists(
        request.contentId,
        request.title
      );

      if (exists) {
        await doc.ref.update({
          status: "already_exists",
          checkedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log("Tayari ipo Firebase:", request.title);
        continue;
      }

      await doc.ref.update({
        status: "processing",
        startedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log("Content haipo:", request.title);
      console.log("Download/Catbox itaongezwa hatua inayofuata.");
    }

  } catch (error) {
    console.error("Firebase error:", error);
  }
}

// Web server
app.listen(PORT, () => {
  console.log(`MAKYAMA BOT V2 online kwenye port ${PORT}`);
  processRequests();
});

// Kagua Firebase kila sekunde 10
setInterval(processRequests, 10000);
