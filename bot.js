// ============================================================
// MAKYAMA GLOBAL OPPORTUNITIES BOT
// V10 - CLEAN / REAL DATA VERSION
// ============================================================
//
// GLOBAL:
// - Grants
// - Jobs
// - Scholarships
// - Internships
// - Work Opportunities
// - Events
// - News
//
// RULES:
// - Grants.gov => POSTED ONLY
// - No fake publication dates
// - No fake source records
// - Expired opportunities removed
// - Real URLs only
// - Existing records preserved
// - Firebase Admin compatible
// - Node.js 22 compatible
//
// ============================================================

"use strict";

const axios = require("axios");
const admin = require("firebase-admin");
const cheerio = require("cheerio");

// ============================================================
// CONFIG
// ============================================================

const PORT = process.env.PORT || 10000;

const MAX_GRANTS = Number(process.env.MAX_GRANTS || 100);
const MAX_ITEMS_PER_SOURCE = Number(
  process.env.MAX_ITEMS_PER_SOURCE || 50
);

const REQUEST_TIMEOUT = Number(
  process.env.REQUEST_TIMEOUT || 30000
);

const USER_AGENT =
  process.env.USER_AGENT ||
  "MAKYAMA Global Opportunities Bot/10.0";

// ============================================================
// HTTP CLIENT
// ============================================================

const http = axios.create({
  timeout: REQUEST_TIMEOUT,
  headers: {
    "User-Agent": USER_AGENT,
    Accept: "application/json, text/html, */*"
  },
  validateStatus: status => status >= 200 && status < 400
});

// ============================================================
// FIREBASE INITIALIZATION
// ============================================================

function initFirebase() {
  if (admin.apps && admin.apps.length > 0) {
    return admin.app();
  }

  let serviceAccount = null;

  // ----------------------------------------------------------
  // Option 1: FIREBASE_SERVICE_ACCOUNT JSON
  // ----------------------------------------------------------

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT
      );
    } catch (error) {
      console.error(
        "❌ FIREBASE_SERVICE_ACCOUNT JSON is invalid:",
        error.message
      );
    }
  }

  // ----------------------------------------------------------
  // Option 2: individual environment variables
  // ----------------------------------------------------------

  if (!serviceAccount) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (
      projectId &&
      clientEmail &&
      privateKey
    ) {
      serviceAccount = {
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n")
      };
    }
  }

  // ----------------------------------------------------------
  // Initialize
  // ----------------------------------------------------------

  if (serviceAccount) {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  // ----------------------------------------------------------
  // Optional: GOOGLE_APPLICATION_CREDENTIALS
  // ----------------------------------------------------------

  return admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

let firebaseApp;

try {
  firebaseApp = initFirebase();
  console.log("🔥 Firebase initialized");
} catch (error) {
  console.error("❌ Firebase initialization failed");
  console.error(error.message);
  process.exit(1);
}

const db = admin.firestore();

// ============================================================
// COLLECTION
// ============================================================

const COLLECTION =
  process.env.FIRESTORE_COLLECTION ||
  "opportunities";

// ============================================================
// EXPRESS SERVER
// ============================================================

const express = require("express");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    bot: "MAKYAMA Global Opportunities",
    version: "10.0",
    time: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    firebase: true,
    time: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

// ============================================================
// UTILS
// ============================================================

function cleanText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/\s+/g, " ")
    .trim();
}

function cleanHtml(value) {
  if (!value) return "";

  return cheerio
    .load(String(value))
    .text()
    .replace(/\s+/g, " ")
    .trim();
}

function safeUrl(value) {
  if (!value) return "";

  try {
    const url = new URL(String(value));

    if (
      url.protocol !== "http:" &&
      url.protocol !== "https:"
    ) {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
}

function parseDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function isoDate(value) {
  const date = parseDate(value);

  if (!date) return null;

  return date.toISOString();
}

function isExpired(closeDate) {
  if (!closeDate) return false;

  const date = parseDate(closeDate);

  if (!date) return false;

  return date.getTime() < Date.now();
}

function normalizeCountry(country) {
  const value = cleanText(country);

  if (!value) {
    return "International";
  }

  return value;
}

function normalizeCategory(category) {
  const value = cleanText(category);

  if (!value) {
    return "Other";
  }

  return value;
}

function makeId(item) {
  if (item.externalId) {
    return String(item.externalId);
  }

  if (item.url) {
    return Buffer.from(item.url)
      .toString("base64")
      .replace(/[/+=]/g, "")
      .slice(0, 80);
  }

  return Buffer.from(
    `${item.source}|${item.title}`
  )
    .toString("base64")
    .replace(/[/+=]/g, "")
    .slice(0, 80);
}

// ============================================================
// NORMALIZE OPPORTUNITY
// ============================================================

function normalizeOpportunity(item) {
  const title = cleanText(item.title);

  if (!title) {
    return null;
  }

  const url = safeUrl(item.url);

  if (!url) {
    console.log(
      `⚠️ Skipping "${title}" because URL is missing/invalid`
    );

    return null;
  }

  const published =
    isoDate(item.published) ||
    isoDate(item.openDate) ||
    null;

  const closeDate =
    isoDate(item.closeDate) ||
    null;

  const normalized = {
    title,
    category: normalizeCategory(item.category),
    country: normalizeCountry(item.country),
    source: cleanText(item.source) || "Unknown",
    url,

    description:
      cleanText(item.description) ||
      "",

    published,

    closeDate,

    status:
      cleanText(item.status) ||
      "active",

    externalId:
      cleanText(item.externalId) ||
      "",

    agency:
      cleanText(item.agency) ||
      "",

    funding:
      cleanText(item.funding) ||
      "",

    eligibility:
      cleanText(item.eligibility) ||
      "",

    lastChecked:
      new Date().toISOString()
  };

  normalized.id = makeId(normalized);

  return normalized;
}

// ============================================================
// SAVE TO FIRESTORE
// ============================================================

async function saveOpportunity(item) {
  const normalized = normalizeOpportunity(item);

  if (!normalized) {
    return {
      saved: false,
      reason: "invalid"
    };
  }

  // ----------------------------------------------------------
  // NEVER save expired opportunities
  // ----------------------------------------------------------

  if (isExpired(normalized.closeDate)) {
    console.log(
      `⏭️ EXPIRED: ${normalized.title}`
    );

    return {
      saved: false,
      reason: "expired"
    };
  }

  const ref = db
    .collection(COLLECTION)
    .doc(normalized.id);

  const existing = await ref.get();

  // ----------------------------------------------------------
  // Preserve original published date
  // ----------------------------------------------------------

  if (existing.exists) {
    const old = existing.data();

    if (
      old &&
      old.published &&
      !normalized.published
    ) {
      normalized.published = old.published;
    }

    if (
      old &&
      old.published &&
      normalized.published
    ) {
      const oldDate = parseDate(old.published);
      const newDate = parseDate(normalized.published);

      if (
        oldDate &&
        newDate &&
        oldDate.getTime() < newDate.getTime()
      ) {
        normalized.published = old.published;
      }
    }

    normalized.createdAt =
      old.createdAt ||
      new Date().toISOString();

    normalized.updatedAt =
      new Date().toISOString();

    await ref.set(
      normalized,
      { merge: true }
    );

    console.log(
      `🔄 UPDATED: ${normalized.title}`
    );
  } else {
    normalized.createdAt =
      new Date().toISOString();

    normalized.updatedAt =
      new Date().toISOString();

    await ref.set(normalized);

    console.log(
      `🆕 NEW: ${normalized.title}`
    );
  }

  console.log(
    `   Category: ${normalized.category}`
  );

  console.log(
    `   Country: ${normalized.country}`
  );

  console.log(
    `   Published: ${
      normalized.published || "Unknown"
    }`
  );

  console.log(
    `   Source: ${normalized.source}`
  );

  return {
    saved: true,
    id: normalized.id
  };
}

// ============================================================
// GRANTS.GOV
// ============================================================
//
// Official API:
// https://api.grants.gov/v1/api/search2
//
// search2 does not require authentication.
// We explicitly request:
// oppStatuses = posted
//
// ============================================================

async function fetchGrantsGov() {
  console.log("🇺🇸 Checking Grants.gov...");

  let results = [];

  try {
    const payload = {
      rows: MAX_GRANTS,

      keyword: "",

      oppStatuses: "posted",

      startRecordNum: 0,

      eligibilities: "",

      fundingCategories: "",

      fundingInstruments: "",

      agencies: "",

      aln: ""
    };

    const response = await http.post(
      "https://api.grants.gov/v1/api/search2",
      payload,
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    const data =
      response.data &&
      response.data.data
        ? response.data.data
        : response.data;

    const opportunities =
      data &&
      Array.isArray(data.oppHits)
        ? data.oppHits
        : [];

    console.log(
      `📦 Grants.gov returned: ${opportunities.length}`
    );

    for (const opp of opportunities) {
      // ------------------------------------------------------
      // ONLY POSTED
      // ------------------------------------------------------

      const status =
        cleanText(opp.oppStatus)
          .toLowerCase();

      if (status !== "posted") {
        continue;
      }

      const id =
        opp.id ||
        opp.number;

      const title =
        cleanText(opp.title);

      if (!id || !title) {
        continue;
      }

      const closeDate =
        opp.closeDate ||
        null;

      // ------------------------------------------------------
      // Do not save closed opportunities
      // ------------------------------------------------------

      if (isExpired(closeDate)) {
        continue;
      }

      const url =
        `https://www.grants.gov/search-results-detail/${id}`;

      const item = {
        externalId:
          `grants.gov:${id}`,

        title,

        category:
          "Grant",

        country:
          "United States",

        source:
          "Grants.gov",

        url,

        description:
          cleanText(
            opp.description ||
            opp.synopsis ||
            ""
          ),

        published:
          opp.postDate ||
          opp.postedDate ||
          opp.openDate ||
          null,

        openDate:
          opp.openDate ||
          null,

        closeDate,

        status:
          "active",

        agency:
          opp.agencyName ||
          opp.agencyCode ||
          "",

        funding:
          Array.isArray(opp.alnist)
            ? opp.alnist.join(", ")
            : ""
      };

      results.push(item);
    }

    console.log(
      `✅ Grants.gov active: ${results.length}`
    );

  } catch (error) {
    console.error(
      "❌ Grants.gov error:",
      error.message
    );
  }

  return results;
}

// ============================================================
// GENERIC WEBSITE READER
// ============================================================

async function fetchHtml(url) {
  try {
    const response = await http.get(url, {
      responseType: "text"
    });

    return response.data || "";
  } catch (error) {
    console.error(
      `❌ Failed to fetch ${url}:`,
      error.message
    );

    return "";
  }
}

// ============================================================
// EXTRACT LINKS FROM WEBSITE
// ============================================================

function extractLinks(
  html,
  baseUrl
) {
  if (!html) return [];

  const $ = cheerio.load(html);

  const links = [];

  $("a[href]").each(
    (_, element) => {
      const href =
        $(element).attr("href");

      const text =
        cleanText($(element).text());

      if (!href || !text) {
        return;
      }

      try {
        const absolute =
          new URL(
            href,
            baseUrl
          ).toString();

        links.push({
          text,
          url: absolute
        });
      } catch {}
    }
  );

  return links;
}

// ============================================================
// GENERIC SOURCE SCANNER
// ============================================================
//
// IMPORTANT:
// We only save links that look like actual opportunities.
// We DO NOT create fake records just because the homepage
// exists.
//
// ============================================================

async function scanSource(config) {
  console.log(
    `🌐 Checking ${config.name}...`
  );

  const results = [];

  const html =
    await fetchHtml(config.url);

  if (!html) {
    console.log(
      `📦 ${config.name}: 0`
    );

    return results;
  }

  const links =
    extractLinks(
      html,
      config.url
    );

  for (
    const link of links.slice(
      0,
      MAX_ITEMS_PER_SOURCE
    )
  ) {
    const lower =
      `${link.text} ${link.url}`
        .toLowerCase();

    const looksRelevant =
      config.keywords.some(
        keyword =>
          lower.includes(
            keyword.toLowerCase()
          )
      );

    if (!looksRelevant) {
      continue;
    }

    // --------------------------------------------------------
    // IMPORTANT:
    // Homepage links do not automatically mean new records.
    // Use current page URL as the opportunity URL only if it
    // points to a distinct page.
    // --------------------------------------------------------

    if (
      link.url === config.url ||
      link.url.endsWith("#")
    ) {
      continue;
    }

    results.push({
      externalId:
        `${config.source}:${link.url}`,

      title:
        link.text,

      category:
        config.category,

      country:
        config.country,

      source:
        config.source,

      url:
        link.url,

      description:
        "",

      // ------------------------------------------------------
      // DO NOT invent publication date.
      // ------------------------------------------------------

      published:
        null,

      closeDate:
        null,

      status:
        "active"
    });
  }

  console.log(
    `📦 ${config.name}: ${results.length}`
  );

  return results;
}

// ============================================================
// INTERNATIONAL SOURCES
// ============================================================

const INTERNATIONAL_SOURCES = [

  {
    name:
      "United Nations Careers",

    url:
      "https://careers.un.org/",

    category:
      "Work Opportunities",

    country:
      "International",

    source:
      "UN Careers",

    keywords: [
      "job",
      "jobs",
      "career",
      "careers",
      "vacancy",
      "vacancies",
      "position",
      "positions"
    ]
  },

  {
    name:
      "World Bank Careers",

    url:
      "https://www.worldbank.org/en/about/careers",

    category:
      "Work Opportunities",

    country:
      "International",

    source:
      "World Bank Careers",

    keywords: [
      "job",
      "career",
      "vacancy",
      "position"
    ]
  },

  {
    name:
      "UNICEF Careers",

    url:
      "https://jobs.unicef.org/",

    category:
      "Work Opportunities",

    country:
      "International",

    source:
      "UNICEF Careers",

    keywords: [
      "job",
      "jobs",
      "vacancy",
      "position",
      "career"
    ]
  },

  {
    name:
      "WHO Careers",

    url:
      "https://www.who.int/careers",

    category:
      "Work Opportunities",

    country:
      "International",

    source:
      "WHO Careers",

    keywords: [
      "job",
      "jobs",
      "vacancy",
      "position",
      "career"
    ]
  },

  {
    name:
      "African Union Careers",

    url:
      "https://au.int/en/jobs",

    category:
      "Work Opportunities",

    country:
      "Africa",

    source:
      "African Union Careers",

    keywords: [
      "job",
      "jobs",
      "vacancy",
      "position",
      "career"
    ]
  }
];

// ============================================================
// TANZANIA SOURCES
// ============================================================

const TANZANIA_SOURCES = [

  {
    name:
      "HESLB Official Website",

    url:
      "https://www.heslb.go.tz/",

    category:
      "Education",

    country:
      "Tanzania",

    source:
      "HESLB Tanzania",

    keywords: [
      "loan",
      "scholarship",
      "application",
      "education",
      "guidelines",
      "announcement",
      "news"
    ]
  },

  {
    name:
      "Ajira / PSRS",

    url:
      "https://www.ajiraportal.go.tz/",

    category:
      "Work Opportunities",

    country:
      "Tanzania",

    source:
      "Ajira / PSRS",

    keywords: [
      "job",
      "jobs",
      "vacancy",
      "vacancies",
      "advertisement",
      "recruitment",
      "announcement"
    ]
  },

  {
    name:
      "Public Service Recruitment Secretariat",

    url:
      "https://www.psrs.go.tz/",

    category:
      "Work Opportunities",

    country:
      "Tanzania",

    source:
      "Ajira / PSRS",

    keywords: [
      "job",
      "jobs",
      "vacancy",
      "vacancies",
      "recruitment",
      "announcement"
    ]
  }
];

// ============================================================
// GLOBAL NEWS / EVENTS
// ============================================================

const GLOBAL_SOURCES = [

  {
    name:
      "United Nations",

    url:
      "https://www.un.org/en/events",

    category:
      "Event",

    country:
      "International",

    source:
      "United Nations",

    keywords: [
      "event",
      "events",
      "meeting",
      "conference"
    ]
  },

  {
    name:
      "WHO News",

    url:
      "https://www.who.int/news",

    category:
      "News",

    country:
      "International",

    source:
      "World Health Organization",

    keywords: [
      "news",
      "press",
      "announcement",
      "release"
    ]
  },

  {
    name:
      "World Bank News",

    url:
      "https://www.worldbank.org/en/news",

    category:
      "News",

    country:
      "International",

    source:
      "World Bank",

    keywords: [
      "news",
      "press",
      "announcement",
      "release"
    ]
  },

  {
    name:
      "African Union News",

    url:
      "https://au.int/en/news",

    category:
      "News",

    country:
      "Africa",

    source:
      "African Union",

    keywords: [
      "news",
      "press",
      "announcement",
      "release"
    ]
  }
];

// ============================================================
// RUN SOURCE GROUP
// ============================================================

async function processSourceGroup(
  sources
) {
  let total = 0;

  for (const source of sources) {
    try {
      const items =
        await scanSource(source);

      for (const item of items) {
        const result =
          await saveOpportunity(item);

        if (result.saved) {
          total++;
        }
      }
    } catch (error) {
      console.error(
        `❌ ${source.name}:`,
        error.message
      );
    }
  }

  return total;
}

// ============================================================
// REMOVE EXPIRED OPPORTUNITIES
// ============================================================

async function removeExpiredOpportunities() {
  console.log(
    "🧹 Checking expired opportunities..."
  );

  let removed = 0;

  const snapshot =
    await db
      .collection(COLLECTION)
      .get();

  for (
    const doc of snapshot.docs
  ) {
    const data = doc.data();

    if (
      data &&
      data.closeDate &&
      isExpired(data.closeDate)
    ) {
      await doc.ref.delete();

      removed++;

      console.log(
        `🗑️ Removed expired: ${
          data.title || doc.id
        }`
      );
    }
  }

  console.log(
    `🧹 Removed ${removed} expired opportunities.`
  );

  return removed;
}

// ============================================================
// NORMALIZE EXISTING DATABASE
// ============================================================

async function normalizeExistingDatabase() {
  console.log(
    "🌍 Normalizing existing database..."
  );

  const snapshot =
    await db
      .collection(COLLECTION)
      .get();

  let batch =
    db.batch();

  let count = 0;

  for (
    const doc of snapshot.docs
  ) {
    const data =
      doc.data();

    if (!data) {
      continue;
    }

    const update = {};

    // --------------------------------------------------------
    // Category
    // --------------------------------------------------------

    if (!data.category) {
      update.category =
        "Other";
    }

    // --------------------------------------------------------
    // Country
    // --------------------------------------------------------

    if (!data.country) {
      update.country =
        "International";
    }

    // --------------------------------------------------------
    // Source
    // --------------------------------------------------------

    if (!data.source) {
      update.source =
        "Unknown";
    }

    // --------------------------------------------------------
    // Status
    // --------------------------------------------------------

    if (!data.status) {
      update.status =
        "active";
    }

    // --------------------------------------------------------
    // IMPORTANT:
    // Never set published = now just because it is missing.
    // --------------------------------------------------------

    if (
      Object.keys(update).length > 0
    ) {
      update.updatedAt =
        new Date().toISOString();

      batch.update(
        doc.ref,
        update
      );

      count++;

      if (count >= 400) {
        await batch.commit();

        batch =
          db.batch();

        count = 0;
      }
    }
  }

  if (count > 0) {
    await batch.commit();
  }

  console.log(
    "✅ Existing data normalized."
  );
}

// ============================================================
// CHECK URLS
// ============================================================

async function checkOpportunityUrls() {
  console.log(
    "🔗 Checking opportunity URLs..."
  );

  const snapshot =
    await db
      .collection(COLLECTION)
      .get();

  let checked = 0;

  for (
    const doc of snapshot.docs
  ) {
    const data =
      doc.data();

    if (!data || !data.url) {
      continue;
    }

    checked++;

    try {
      const response =
        await http.head(
          data.url,
          {
            timeout: 10000
          }
        );

      const status =
        response.status;

      if (
        status >= 400
      ) {
        console.log(
          `⚠️ URL ${status}: ${
            data.title
          }`
        );
      }
    } catch {
      // Some websites reject HEAD.
      // Do not delete records just because
      // HEAD is blocked.
    }

    // Avoid hammering websites.
    if (
      checked >= 100
    ) {
      break;
    }
  }

  console.log(
    "🔗 URL check complete."
  );
}

// ============================================================
// MAIN BOT
// ============================================================

async function runBot() {
  const started =
    new Date();

  console.log("");
  console.log(
    "============================================================"
  );
  console.log(
    "🚀 MAKYAMA GLOBAL OPPORTUNITIES BOT V10"
  );
  console.log(
    "============================================================"
  );
  console.log(
    `🕐 Started: ${started.toISOString()}`
  );
  console.log("");

  let newItems = 0;

  // ----------------------------------------------------------
  // 1. Grants.gov
  // ----------------------------------------------------------

  const grants =
    await fetchGrantsGov();

  for (
    const item of grants
  ) {
    try {
      const result =
        await saveOpportunity(item);

      if (result.saved) {
        newItems++;
      }
    } catch (error) {
      console.error(
        "❌ Grants save error:",
        error.message
      );
    }
  }

  // ----------------------------------------------------------
  // 2. International
  // ----------------------------------------------------------

  console.log(
    "🌐 Checking International Opportunities..."
  );

  const internationalCount =
    await processSourceGroup(
      INTERNATIONAL_SOURCES
    );

  newItems +=
    internationalCount;

  // ----------------------------------------------------------
  // 3. Tanzania
  // ----------------------------------------------------------

  console.log(
    "🇹🇿 Checking Tanzania sources..."
  );

  const tanzaniaCount =
    await processSourceGroup(
      TANZANIA_SOURCES
    );

  newItems +=
    tanzaniaCount;

  // ----------------------------------------------------------
  // 4. News / Events
  // ----------------------------------------------------------

  console.log(
    "📰 Checking Global News & Events..."
  );

  const globalCount =
    await processSourceGroup(
      GLOBAL_SOURCES
    );

  newItems +=
    globalCount;

  // ----------------------------------------------------------
  // 5. Normalize
  // ----------------------------------------------------------

  await normalizeExistingDatabase();

  // ----------------------------------------------------------
  // 6. Remove expired
  // ----------------------------------------------------------

  await removeExpiredOpportunities();

  // ----------------------------------------------------------
  // 7. URL checks
  // ----------------------------------------------------------

  await checkOpportunityUrls();

  // ----------------------------------------------------------
  // DONE
  // ----------------------------------------------------------

  const finished =
    new Date();

  console.log("");

  console.log(
    "============================================================"
  );

  console.log(
    "🎉 BOT FINISHED SUCCESSFULLY"
  );

  console.log(
    `New/updated items: ${newItems}`
  );

  console.log(
    `Finished: ${finished.toISOString()}`
  );

  console.log(
    "============================================================"
  );

  console.log("");
}

// ============================================================
// ERROR HANDLER
// ============================================================

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "❌ UNHANDLED REJECTION:"
    );

    console.error(error);

    process.exitCode = 1;
  }
);

process.on(
  "uncaughtException",
  error => {
    console.error(
      "❌ UNCAUGHT EXCEPTION:"
    );

    console.error(error);

    process.exit(1);
  }
);

// ============================================================
// START
// ============================================================

runBot()
  .catch(error => {
    console.error("");
    console.error(
      "❌ BOT FAILED"
    );
    console.error(
      error
    );
    console.error("");

    process.exit(1);
  });
