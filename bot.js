const express = require("express");
const admin = require("firebase-admin");
const Parser = require("rss-parser");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: "1mb" }));

// ======================================================
// FIREBASE
// ======================================================

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

const parser = new Parser({
  timeout: 30000,
  headers: {
    "User-Agent": "MAKYAMA-Opportunities-Bot/1.0"
  }
});

// ======================================================
// SETTINGS
// ======================================================

const OPPORTUNITIES_PATH = "opportunities";

// Kila dakika 30
const BOT_INTERVAL = 30 * 60 * 1000;

// ======================================================
// VERIFIED RSS SOURCES
// ======================================================

const RSS_SOURCES = [

  // ------------------------------------------
  // GRANTS.GOV
  // ------------------------------------------

  {
    name: "Grants.gov",
    category: "Grant",
    country: "United States / International",
    url:
      "https://www.grants.gov/rss/GG_OppModByCategory.xml"
  },

  // ------------------------------------------
  // NIH
  // ------------------------------------------

  {
    name: "NIH Funding",
    category: "Grant",
    country: "United States / International",
    url:
      "https://grants.nih.gov/grants/guide/newsfeed/fundingopps.xml"
  },

  // ------------------------------------------
  // NSF FUNDING
  // ------------------------------------------

  {
    name: "NSF Funding",
    category: "Grant",
    country: "United States / International",
    url:
      "https://www.nsf.gov/rss/rss_www_funding_pgm_annc_inf.xml"
  },

  // ------------------------------------------
  // NSF UPCOMING DEADLINES
  // ------------------------------------------

  {
    name: "NSF Upcoming Deadlines",
    category: "Grant",
    country: "United States / International",
    url:
      "https://www.nsf.gov/rss/rss_www_funding_upcoming.xml"
  },

  // ------------------------------------------
  // GLOBAL REMOTE JOBS
  // ------------------------------------------

  {
    name: "Career Nest",
    category: "Remote Job",
    country: "Worldwide",
    url:
      "https://careernest.cloud/api/feed.xml?limit=100"
  }
];

// ======================================================
// TEXT CLEANER
// ======================================================

function cleanText(value) {

  if (!value) {
    return "";
  }

  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// ======================================================
// VALID URL
// ======================================================

function validUrl(value) {

  if (!value) {
    return false;
  }

  try {

    const url = new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );

  } catch {

    return false;
  }
}

// ======================================================
// CREATE DATABASE ID
// ======================================================

function createId(title, url) {

  const raw =
    `${title}-${url}`
      .toLowerCase();

  return raw
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 180);
}

// ======================================================
// DATE PARSER
// ======================================================

function parseDate(value) {

  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

// ======================================================
// DEADLINE EXTRACTOR
// ======================================================
//
// RSS nyingine hazina field ya deadline.
// Tunajaribu kuitafuta kwenye text.
//

function extractDeadline(item) {

  const values = [

    item.deadline,

    item.deadlineDate,

    item.applicationDeadline,

    item.closeDate,

    item.closingDate,

    item.dueDate,

    item.content,

    item.contentSnippet,

    item.summary,

    item.description
  ];

  for (const value of values) {

    if (!value) {
      continue;
    }

    const text =
      cleanText(value);

    // YYYY-MM-DD
    let match =
      text.match(
        /\b(20\d{2})[-\/](0?[1-9]|1[0-2])[-\/](0?[1-9]|[12]\d|3[01])\b/
      );

    if (match) {

      const date =
        new Date(
          `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}T23:59:59Z`
        );

      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    // Month DD, YYYY
    match =
      text.match(
        /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+([0-3]?\d),?\s+(20\d{2})\b/i
      );

    if (match) {

      const date =
        new Date(
          `${match[1]} ${match[2]}, ${match[3]} 23:59:59 UTC`
        );

      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    // DD Month YYYY
    match =
      text.match(
        /\b([0-3]?\d)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i
      );

    if (match) {

      const date =
        new Date(
          `${match[2]} ${match[1]}, ${match[3]} 23:59:59 UTC`
        );

      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }

  return null;
}

// ======================================================
// GET DESCRIPTION
// ======================================================

function getDescription(item) {

  return cleanText(
    item.contentSnippet ||
    item.summary ||
    item.description ||
    item.content ||
    ""
  );
}

// ======================================================
// DETECT CATEGORY
// ======================================================

function detectCategory(
  title,
  description,
  sourceCategory
) {

  const text =
    `${title} ${description}`
      .toLowerCase();

  if (
    text.includes("scholarship") ||
    text.includes("studentship")
  ) {
    return "Scholarship";
  }

  if (
    text.includes("internship") ||
    text.includes("intern ")
  ) {
    return "Internship";
  }

  if (
    text.includes("fellowship")
  ) {
    return "Fellowship";
  }

  if (
    text.includes("grant") ||
    text.includes("funding")
  ) {
    return "Grant";
  }

  if (
    text.includes("competition") ||
    text.includes("contest")
  ) {
    return "Competition";
  }

  if (
    text.includes("job") ||
    text.includes("career") ||
    text.includes("developer") ||
    text.includes("engineer")
  ) {
    return "Job";
  }

  if (
    text.includes("hackathon")
  ) {
    return "Hackathon";
  }

  return sourceCategory || "Opportunity";
}

// ======================================================
// DETECT FUNDING
// ======================================================

function detectFunding(
  title,
  description
) {

  const text =
    `${title} ${description}`
      .toLowerCase();

  if (
    text.includes("fully funded")
  ) {
    return "Fully Funded";
  }

  if (
    text.includes("funded")
  ) {
    return "Funded";
  }

  if (
    text.includes("stipend")
  ) {
    return "Stipend";
  }

  if (
    text.includes("grant")
  ) {
    return "Grant";
  }

  return "";
}

// ======================================================
// SAVE OPPORTUNITY
// ======================================================

async function saveOpportunity(
  item,
  source
) {

  const title =
    cleanText(item.title);

  const url =
    item.link ||
    item.guid ||
    "";

  if (!title) {
    return;
  }

  if (!validUrl(url)) {

    console.log(
      "⚠️ Invalid URL:",
      title
    );

    return;
  }

  const id =
    createId(
      title,
      url
    );

  const ref =
    db.ref(
      `${OPPORTUNITIES_PATH}/${id}`
    );

  const existing =
    await ref.once("value");

  // ------------------------------------------
  // DUPLICATE
  // ------------------------------------------

  if (existing.exists()) {

    return;
  }

  const description =
    getDescription(item);

  const deadline =
    extractDeadline(item);

  const category =
    detectCategory(
      title,
      description,
      source.category
    );

  const funding =
    detectFunding(
      title,
      description
    );

  const data = {

    title,

    description,

    category,

    country:
      source.country ||
      "Worldwide",

    funding,

    deadline,

    officialUrl:
      url,

    source:
      source.name,

    publishedAt:
      parseDate(
        item.isoDate ||
        item.pubDate
      ),

    addedAt:
      Date.now(),

    status:
      "active"
  };

  await ref.set(data);

  console.log("");
  console.log(
    "✅ NEW OPPORTUNITY"
  );

  console.log(
    "Title:",
    title
  );

  console.log(
    "Category:",
    category
  );

  console.log(
    "Source:",
    source.name
  );
}

// ======================================================
// FETCH RSS SOURCE
// ======================================================

async function fetchRSSSource(
  source
) {

  console.log("");
  console.log(
    "📡 Checking:",
    source.name
  );

  try {

    const feed =
      await parser.parseURL(
        source.url
      );

    const items =
      feed.items || [];

    console.log(
      `📦 ${items.length} items`
    );

    for (
      const item of items
    ) {

      await saveOpportunity(
        item,
        source
      );
    }

  } catch (error) {

    console.error(
      `❌ RSS ERROR: ${source.name}`
    );

    console.error(
      error.message
    );
  }
}

// ======================================================
// DELETE EXPIRED
// ======================================================

async function deleteExpiredOpportunities() {

  console.log("");
  console.log(
    "🧹 Cleaning expired opportunities..."
  );

  const snapshot =
    await db
      .ref(OPPORTUNITIES_PATH)
      .once("value");

  if (!snapshot.exists()) {

    console.log(
      "ℹ️ Nothing to clean."
    );

    return;
  }

  const now =
    Date.now();

  const deletions = [];

  snapshot.forEach(
    (child) => {

      const data =
        child.val() || {};

      if (!data.deadline) {
        return;
      }

      const deadline =
        new Date(
          data.deadline
        ).getTime();

      if (
        !isNaN(deadline) &&
        deadline < now
      ) {

        deletions.push({
          id: child.key,
          title: data.title
        });
      }
    }
  );

  for (
    const item of deletions
  ) {

    await db
      .ref(
        `${OPPORTUNITIES_PATH}/${item.id}`
      )
      .remove();

    console.log(
      "🗑️ Deleted:",
      item.title
    );
  }

  console.log(
    `🧹 Removed ${deletions.length} expired opportunities.`
  );
}

// ======================================================
// CLEAN OLD DATA WITHOUT DEADLINE
// ======================================================
//
// Hatuifuti opportunities zisizo na deadline.
// Zinaweza kuwa jobs ambazo zinaendelea.
// Hivyo tunaziweka.
//

// ======================================================
// RUN BOT
// ======================================================

let botRunning = false;

async function runBot() {

  if (botRunning) {

    console.log(
      "⏳ Bot bado ina-run..."
    );

    return;
  }

  botRunning = true;

  console.log("");
  console.log(
    "=========================================="
  );

  console.log(
    "🤖 MAKYAMA GLOBAL OPPORTUNITY BOT"
  );

  console.log(
    "=========================================="
  );

  console.log(
    "Time:",
    new Date().toISOString()
  );

  try {

    // ----------------------------------------
    // 1. DELETE EXPIRED
    // ----------------------------------------

    await deleteExpiredOpportunities();

    // ----------------------------------------
    // 2. FETCH RSS SOURCES
    // ----------------------------------------

    for (
      const source of RSS_SOURCES
    ) {

      await fetchRSSSource(
        source
      );
    }

    console.log("");
    console.log(
      "✅ BOT FINISHED"
    );

  } catch (error) {

    console.error(
      "❌ BOT ERROR:",
      error
    );

  } finally {

    botRunning = false;
  }
}

// ======================================================
// API — GET ALL OPPORTUNITIES
// ======================================================

app.get(
  "/opportunities",
  async (req, res) => {

    try {

      const snapshot =
        await db
          .ref(OPPORTUNITIES_PATH)
          .once("value");

      const opportunities = [];

      if (snapshot.exists()) {

        snapshot.forEach(
          (child) => {

            opportunities.push({

              id:
                child.key,

              ...child.val()

            });
          }
        );
      }

      // Newest first
      opportunities.sort(
        (a, b) =>
          (b.addedAt || 0) -
          (a.addedAt || 0)
      );

      res.json({

        success: true,

        count:
          opportunities.length,

        opportunities

      });

    } catch (error) {

      console.error(
        "❌ GET opportunities error:",
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

// ======================================================
// API — GET ONE
// ======================================================

app.get(
  "/opportunities/:id",
  async (req, res) => {

    try {

      const snapshot =
        await db
          .ref(
            `${OPPORTUNITIES_PATH}/${req.params.id}`
          )
          .once("value");

      if (!snapshot.exists()) {

        return res.status(404).json({

          success: false,

          message:
            "Opportunity haipo."

        });
      }

      res.json({

        success: true,

        id:
          req.params.id,

        opportunity:
          snapshot.val()

      });

    } catch (error) {

      console.error(
        "❌ GET ONE error:",
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

// ======================================================
// API — MANUAL BOT RUN
// ======================================================

app.post(
  "/bot/run",
  async (req, res) => {

    try {

      await runBot();

      res.json({

        success: true,

        message:
          "Bot ime-run."

      });

    } catch (error) {

      res.status(500).json({

        success: false,

        message:
          error.message

      });
    }
  }
);

// ======================================================
// HEALTH
// ======================================================

app.get(
  "/health",
  async (req, res) => {

    try {

      await db
        .ref(OPPORTUNITIES_PATH)
        .limitToFirst(1)
        .once("value");

      res.json({

        status:
          "ok",

        firebase:
          "connected",

        bot:
          botRunning
            ? "processing"
            : "ready",

        sources:
          RSS_SOURCES.length

      });

    } catch (error) {

      res.status(500).json({

        status:
          "error",

        firebase:
          "error",

        message:
          error.message

      });
    }
  }
);

// ======================================================
// HOME
// ======================================================

app.get(
  "/",
  (req, res) => {

    res.json({

      status:
        "online",

      bot:
        "MAKYAMA GLOBAL OPPORTUNITY BOT",

      version:
        "3.0",

      database:
        "Firebase Realtime Database",

      opportunitiesPath:
        OPPORTUNITIES_PATH,

      sources:
        RSS_SOURCES.length,

      interval:
        "30 minutes"

    });
  }
);

// ======================================================
// START SERVER
// ======================================================

app.listen(
  PORT,
  () => {

    console.log("");
    console.log(
      "=========================================="
    );

    console.log(
      "🚀 MAKYAMA BOT ONLINE"
    );

    console.log(
      "=========================================="
    );

    console.log(
      "Port:",
      PORT
    );

    console.log(
      "Sources:",
      RSS_SOURCES.length
    );

    console.log(
      "Database:",
      process.env.FIREBASE_DATABASE_URL ||
      "Firebase default database"
    );

    console.log(
      "Interval:",
      "30 minutes"
    );

    console.log(
      "=========================================="
    );

    // Run immediately
    runBot();

    // Run every 30 minutes
    setInterval(
      runBot,
      BOT_INTERVAL
    );
  }
);
