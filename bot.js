const admin = require("firebase-admin");

// Firebase credentials zitawekwa Render Environment Variables baadaye.
// HATUTAWEKA serviceAccountKey.json kwenye GitHub.
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const REQUESTS_COLLECTION = "audio_requests";
const MEDIA_COLLECTION = "media";

// Angalia kama content tayari ipo Firebase
async function contentExists(contentId, title) {
  let snapshot;

  if (contentId) {
    snapshot = await db
      .collection(MEDIA_COLLECTION)
      .where("contentId", "==", contentId)
      .limit(1)
      .get();

    if (!snapshot.empty) return true;
  }

  if (title) {
    snapshot = await db
      .collection(MEDIA_COLLECTION)
      .where("title", "==", title)
      .limit(1)
      .get();

    if (!snapshot.empty) return true;
  }

  return false;
}

// Chakata requests
async function processRequests() {
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

    try {
      const exists = await contentExists(
        request.contentId,
        request.title
      );

      if (exists) {
        await doc.ref.update({
          status: "already_exists",
          checkedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log("Content tayari ipo Firebase:", request.title);
        continue;
      }

      await doc.ref.update({
        status: "processing",
        startedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log("Content haipo. Itaendelea kushughulikiwa:", request.title);

      // Download + Catbox + Firebase tutaongeza STEP inayofuata.

    } catch (error) {
      console.error("Request error:", error);

      await doc.ref.update({
        status: "failed",
        error: error.message,
        failedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  }
}

// Endesha kila sekunde 10
setInterval(processRequests, 10000);

console.log("MAKYAMA BOT V2 imeanza...");
processRequests();
