// ============================================================
// MAKYAMA GLOBAL OPPORTUNITIES BOT V11
// ============================================================
// FIXES:
// - Firestore NOT_FOUND handling
// - NO "//" Firestore paths
// - Safe document IDs
// - Grants.gov
// - Jobs / Careers
// - Scholarships
// - Grants
// - Internships
// - Events / News
// - Tanzania sources
// - International sources
// - Expired opportunities filtered
// - Source failures do NOT crash the bot
// - Firestore save failures do NOT crash the bot
// - HTTP server for Render
// ============================================================

"use strict";

const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const crypto = require("crypto");
const admin = require("firebase-admin");

const app = express();

const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.status(200).json({
    ok: true,
    name: "MAKYAMA GLOBAL OPPORTUNITIES BOT",
    version: "11.0.0",
    status: "running",
    time: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    status: "healthy",
    time: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

// ============================================================
// FIREBASE INITIALIZATION
// ============================================================

let db = null;
let firestoreAvailable = false;

function initFirebase() {
  try {
    if (admin.apps.length) {
      db = admin.firestore();
      firestoreAvailable = true;
      console.log("🔥 Firebase already initialized");
      return;
    }

    let serviceAccount = null;

    // --------------------------------------------------------
    // OPTION 1: FIREBASE_SERVICE_ACCOUNT JSON
    // --------------------------------------------------------
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(
          process.env.FIREBASE_SERVICE_ACCOUNT
        );
      } catch (e) {
        console.error(
          "❌ FIREBASE_SERVICE_ACCOUNT JSON invalid:",
          e.message
        );
      }
    }

    // --------------------------------------------------------
    // OPTION 2: FIREBASE_PRIVATE_KEY + other variables
    // --------------------------------------------------------
    if (!serviceAccount && process.env.FIREBASE_PROJECT_ID) {
      serviceAccount = {
        project_id: process.env.FIREBASE_PROJECT_ID,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: (
          process.env.FIREBASE_PRIVATE_KEY || ""
        ).replace(/\\n/g, "\n")
      };
    }

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });

      db = admin.firestore();
      firestoreAvailable = true;

      console.log("🔥 Firebase initialized");
      return;
    }

    // --------------------------------------------------------
    // OPTION 3: GOOGLE_APPLICATION_CREDENTIALS
    // --------------------------------------------------------
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });

    db = admin.firestore();
    firestoreAvailable = true;

    console.log("🔥 Firebase initialized using ADC");

  } catch (error) {
    firestoreAvailable = false;
    db = null;

    console.error(
      "⚠️ Firebase initialization failed:",
      error.message
    );

    console.log(
      "⚠️ Bot itaendelea bila Firestore."
    );
  }
}

initFirebase();

// ============================================================
// CONSTANTS
// ============================================================

const BOT_VERSION = "11.0.0";

const COLLECTIONS = {
  opportunities: "opportunities",
  grants: "grants",
  jobs: "jobs",
  scholarships: "scholarships",
  internships: "internships",
  events: "events",
  news: "news"
};

// ============================================================
// HELPERS
// ============================================================

function cleanText(value) {
  if (value === undefined || value === null) return "";

  return String(value)
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value) {
  if (!value) return "";

  try {
    return cheerio
      .load(String(value))
      .text()
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return cleanText(value);
  }
}

function normalizeUrl(url) {
  if (!url) return "";

  try {
    const parsed = new URL(String(url).trim());

    parsed.hash = "";

    return parsed.toString();
  } catch {
    return String(url).trim();
  }
}

// ============================================================
// SAFE FIRESTORE DOCUMENT ID
// ============================================================
//
// IMPORTANT:
// Never use:
// firestore.doc(url)
// or:
// collection.doc(url)
//
// because URL contains "/".
//
// Example:
// https://www.un.org/en/jobs
//
// becomes:
//
// un-org-en-jobs-xxxxxxxx
// ============================================================

function safeDocId(value) {
  const raw = cleanText(value);

  let id = raw
    .replace(/^https?:\/\//i, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  if (!id) {
    id = "item";
  }

  if (id.length > 120) {
    id = id.substring(0, 120);
  }

  const hash = crypto
    .createHash("sha1")
    .update(raw || Math.random().toString())
    .digest("hex")
    .substring(0, 12);

  return `${id}-${hash}`;
}

// ============================================================
// IMPORTANT FIRESTORE PATH VALIDATION
// ============================================================

function validCollectionName(name) {
  return (
    typeof name === "string" &&
    name.length > 0 &&
    !name.includes("/")
  );
}

function getDocRef(collectionName, item) {
  if (!db || !firestoreAvailable) {
    return null;
  }

  if (!validCollectionName(collectionName)) {
    throw new Error(
      `Invalid Firestore collection: ${collectionName}`
    );
  }

  const sourceUrl =
    item.sourceUrl ||
    item.url ||
    item.link ||
    item.applicationUrl ||
    item.applyUrl ||
    item.title ||
    crypto.randomUUID();

  const id = safeDocId(sourceUrl);

  return db.collection(collectionName).doc(id);
}

// ============================================================
// FIRESTORE SAVE
// ============================================================

async function saveItem(collectionName, item) {
  if (!firestoreAvailable || !db) {
    return false;
  }

  try {
    const ref = getDocRef(collectionName, item);

    if (!ref) return false;

    const data = {
      ...item,

      collection: collectionName,

      title: cleanText(item.title),

      organization: cleanText(
        item.organization ||
        item.organisation ||
        item.company ||
        item.provider ||
        ""
      ),

      country: cleanText(
        item.country || "International"
      ),

      category: cleanText(
        item.category || "Opportunity"
      ),

      source: cleanText(
        item.source || ""
      ),

      sourceUrl: normalizeUrl(
        item.sourceUrl ||
        item.url ||
        item.link ||
        ""
      ),

      applicationUrl: normalizeUrl(
        item.applicationUrl ||
        item.applyUrl ||
        item.sourceUrl ||
        item.url ||
        ""
      ),

      publishedAt:
        item.publishedAt ||
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString(),

      botVersion: BOT_VERSION
    };

    // --------------------------------------------------------
    // USE SET + MERGE
    // NOT UPDATE
    // --------------------------------------------------------

    await ref.set(data, {
      merge: true
    });

    return true;

  } catch (error) {

    console.error(
      `❌ ${collectionName} save error:`,
      error.code || "",
      error.message || error
    );

    // DO NOT CRASH BOT
    return false;
  }
}

// ============================================================
// SAVE MANY
// ============================================================

async function saveMany(collectionName, items) {

  if (!Array.isArray(items) || !items.length) {
    return 0;
  }

  let saved = 0;

  for (const item of items) {

    const ok = await saveItem(
      collectionName,
      item
    );

    if (ok) {
      saved++;
    }

    // small delay
    await sleep(30);
  }

  return saved;
}

// ============================================================
// FIRESTORE TEST
// ============================================================

async function testFirestore() {

  if (!db || !firestoreAvailable) {
    console.log(
      "⚠️ Firestore unavailable"
    );

    return false;
  }

  try {

    const testRef = db
      .collection("_system")
      .doc("makyama_bot");

    await testRef.set(
      {
        bot: "MAKYAMA",
        version: BOT_VERSION,
        updatedAt: new Date().toISOString()
      },
      {
        merge: true
      }
    );

    console.log(
      "✅ Firestore connection OK"
    );

    return true;

  } catch (error) {

    console.error(
      "❌ Firestore connection failed:",
      error.code || "",
      error.message || error
    );

    firestoreAvailable = false;

    return false;
  }
}

// ============================================================
// FETCH
// ============================================================

async function fetchPage(url, options = {}) {

  try {

    const response = await axios.get(
      url,
      {
        timeout: options.timeout || 20000,

        maxRedirects: 5,

        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; MAKYAMA-BOT/11.0; +https://makyama-bot-v2.onrender.com)",

          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

          ...(
            options.headers || {}
          )
        },

        validateStatus: () => true
      }
    );

    if (response.status < 200 ||
        response.status >= 400) {

      throw new Error(
        `HTTP ${response.status}`
      );
    }

    return response.data;

  } catch (error) {

    console.error(
      `❌ Failed to fetch ${url}:`,
      error.message
    );

    return null;
  }
}

// ============================================================
// SLEEP
// ============================================================

function sleep(ms) {
  return new Promise(
    resolve => setTimeout(resolve, ms)
  );
}

// ============================================================
// DATE HELPERS
// ============================================================

function parseDate(value) {

  if (!value) return null;

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return null;
  }

  return d;
}

function isExpired(value) {

  const date = parseDate(value);

  if (!date) return false;

  return date.getTime() <
    Date.now();
}

// ============================================================
// NORMALIZE ITEM
// ============================================================

function normalizeItem(item) {

  const output = {
    title: cleanText(item.title),

    description:
      cleanText(
        stripHtml(
          item.description || ""
        )
      ),

    organization:
      cleanText(
        item.organization ||
        item.organisation ||
        item.company ||
        item.provider ||
        ""
      ),

    country:
      cleanText(
        item.country ||
        "International"
      ),

    category:
      cleanText(
        item.category ||
        "Opportunity"
      ),

    type:
      cleanText(
        item.type ||
        item.category ||
        "Opportunity"
      ),

    source:
      cleanText(
        item.source ||
        ""
      ),

    sourceUrl:
      normalizeUrl(
        item.sourceUrl ||
        item.url ||
        item.link ||
        ""
      ),

    applicationUrl:
      normalizeUrl(
        item.applicationUrl ||
        item.applyUrl ||
        item.sourceUrl ||
        item.url ||
        ""
      ),

    publishedAt:
      item.publishedAt ||
      null,

    deadline:
      item.deadline ||
      null,

    remote:
      Boolean(item.remote),

    tags:
      Array.isArray(item.tags)
        ? item.tags
        : [],

    status:
      "active"
  };

  if (output.deadline &&
      isExpired(output.deadline)) {

    output.status = "expired";
  }

  return output;
}

// ============================================================
// GRANTS.GOV
// ============================================================

async function fetchGrantsGov() {

  console.log(
    "🇺🇸 Checking Grants.gov..."
  );

  const url =
    "https://api.grants.gov/v1/api/search2";

  try {

    const response =
      await axios.post(
        url,
        {
          keyword:
            "",

          oppStatuses:
            "forecasted|posted",

          rows:
            100,

          startRecordNum:
            0
        },
        {
          timeout: 30000,

          headers: {
            "Content-Type":
              "application/json",

            "User-Agent":
              "MAKYAMA-BOT/11.0"
          }
        }
      );

    const data =
      response.data || {};

    const results =
      data.oppHits ||
      data.data?.oppHits ||
      data.data?.results ||
      [];

    console.log(
      `📦 Grants.gov returned: ${results.length}`
    );

    const items = [];

    for (const x of results) {

      const title =
        x.oppTitle ||
        x.title ||
        "";

      const id =
        x.opportunityNumber ||
        x.oppNumber ||
        x.id ||
        "";

      const link =
        id
          ? `https://www.grants.gov/search-results-detail/${id}`
          : "";

      const status =
        cleanText(
          x.oppStatus ||
          x.status ||
          ""
        ).toLowerCase();

      // ------------------------------------------------------
      // ONLY POSTED
      // ------------------------------------------------------

      if (
        status &&
        !status.includes("posted")
      ) {
        continue;
      }

      const item =
        normalizeItem({

          title,

          description:
            x.description ||
            x.synopsis ||
            "",

          organization:
            x.agencyName ||
            x.agency ||
            "",

          country:
            "United States",

          category:
            "Grant",

          type:
            "Grant",

          source:
            "Grants.gov",

          sourceUrl:
            link,

          applicationUrl:
            link,

          publishedAt:
            x.postDate ||
            x.openDate ||
            null,

          deadline:
            x.closeDate ||
            null,

          tags:
            [
              "USA",
              "Grants",
              "Grants.gov"
            ]
        });

      if (
        item.title &&
        item.status !== "expired"
      ) {
        items.push(item);
      }
    }

    console.log(
      `✅ Grants.gov active: ${items.length}`
    );

    return items;

  } catch (error) {

    console.error(
      "❌ Grants.gov failed:",
      error.message
    );

    return [];
  }
}

// ============================================================
// GENERIC RSS
// ============================================================

async function fetchRSS(
  sourceName,
  sourceUrl,
  category,
  country
) {

  console.log(
    `🌐 Checking ${sourceName}...`
  );

  const xml =
    await fetchPage(
      sourceUrl,
      {
        timeout: 30000,
        headers: {
          Accept:
            "application/rss+xml, application/xml, text/xml, */*"
        }
      }
    );

  if (!xml) {

    console.log(
      `📦 ${sourceName}: 0`
    );

    return [];
  }

  try {

    const $ =
      cheerio.load(
        xml,
        {
          xml: true
        }
      );

    const items = [];

    $("item").each(
      (_, element) => {

        const title =
          cleanText(
            $(element)
              .find("title")
              .first()
              .text()
          );

        const description =
          cleanText(
            $(element)
              .find("description")
              .first()
              .text()
          );

        const link =
          normalizeUrl(
            $(element)
              .find("link")
              .first()
              .text()
          );

        const pubDate =
          cleanText(
            $(element)
              .find("pubDate")
              .first()
              .text()
          );

        const item =
          normalizeItem({

            title,

            description,

            organization:
              sourceName,

            country,

            category,

            type:
              category,

            source:
              sourceName,

            sourceUrl:
              link,

            applicationUrl:
              link,

            publishedAt:
              pubDate
                ? new Date(pubDate)
                    .toISOString()
                : null
          });

        if (
          item.title &&
          item.sourceUrl
        ) {
          items.push(item);
        }
      }
    );

    console.log(
      `📦 ${sourceName}: ${items.length}`
    );

    return items;

  } catch (error) {

    console.error(
      `❌ ${sourceName}:`,
      error.message
    );

    return [];
  }
}

// ============================================================
// HTML SOURCE
// ============================================================

async function fetchHTMLSource(
  sourceName,
  sourceUrl,
  category,
  country
) {

  console.log(
    `🌐 Checking ${sourceName}...`
  );

  const html =
    await fetchPage(
      sourceUrl,
      {
        timeout: 30000
      }
    );

  if (!html) {

    console.log(
      `📦 ${sourceName}: 0`
    );

    return [];
  }

  try {

    const $ =
      cheerio.load(html);

    const items = [];

    // --------------------------------------------------------
    // Try article blocks
    // --------------------------------------------------------

    $("article, .post, .news-item, .job, .card, li")
      .each(
        (_, element) => {

          const title =
            cleanText(
              $(element)
                .find("h1,h2,h3,h4,.title,.entry-title")
                .first()
                .text()
            );

          const href =
            $(element)
              .find("a")
              .first()
              .attr("href") ||
            "";

          const absolute =
            makeAbsoluteUrl(
              href,
              sourceUrl
            );

          const description =
            cleanText(
              $(element)
                .text()
            );

          if (
            title &&
            absolute
          ) {

            const item =
              normalizeItem({

                title,

                description,

                organization:
                  sourceName,

                country,

                category,

                type:
                  category,

                source:
                  sourceName,

                sourceUrl:
                  absolute,

                applicationUrl:
                  absolute,

                publishedAt:
                  new Date()
                    .toISOString()
              });

            items.push(item);
          }
        }
      );

    // --------------------------------------------------------
    // Limit duplicates
    // --------------------------------------------------------

    const unique =
      uniqueByUrl(items)
        .slice(0, 100);

    console.log(
      `📦 ${sourceName}: ${unique.length}`
    );

    return unique;

  } catch (error) {

    console.error(
      `❌ ${sourceName}:`,
      error.message
    );

    return [];
  }
}

// ============================================================
// ABSOLUTE URL
// ============================================================

function makeAbsoluteUrl(
  href,
  base
) {

  if (!href) return "";

  try {

    return new URL(
      href,
      base
    ).toString();

  } catch {

    return "";
  }
}

// ============================================================
// UNIQUE BY URL
// ============================================================

function uniqueByUrl(items) {

  const map =
    new Map();

  for (const item of items) {

    const key =
      normalizeUrl(
        item.sourceUrl ||
        item.applicationUrl ||
        item.title
      );

    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return Array.from(
    map.values()
  );
}

// ============================================================
// UNITED NATIONS
// ============================================================

async function fetchUN() {

  return fetchHTMLSource(
    "United Nations",
    "https://www.un.org/en/",
    "News",
    "International"
  );
}

// ============================================================
// WHO
// ============================================================

async function fetchWHO() {

  return fetchRSS(
    "WHO News",
    "https://www.who.int/rss-feeds/news-english.xml",
    "News",
    "International"
  );
}

// ============================================================
// WORLD BANK
// ============================================================

async function fetchWorldBank() {

  return fetchRSS(
    "World Bank News",
    "https://www.worldbank.org/en/news/all?format=rss",
    "News",
    "International"
  );
}

// ============================================================
// AFRICAN UNION
// ============================================================

async function fetchAfricanUnion() {

  return fetchHTMLSource(
    "African Union News",
    "https://au.int/en/news",
    "News",
    "Africa"
  );
}

// ============================================================
// UNICEF CAREERS
// ============================================================

async function fetchUNICEF() {

  return fetchHTMLSource(
    "UNICEF Careers",
    "https://jobs.unicef.org/",
    "Jobs",
    "International"
  );
}

// ============================================================
// WHO CAREERS
// ============================================================

async function fetchWHOCareers() {

  return fetchHTMLSource(
    "WHO Careers",
    "https://www.who.int/careers",
    "Jobs",
    "International"
  );
}

// ============================================================
// WORLD BANK CAREERS
// ============================================================

async function fetchWorldBankCareers() {

  return fetchHTMLSource(
    "World Bank Careers",
    "https://www.worldbank.org/en/about/careers",
    "Jobs",
    "International"
  );
}

// ============================================================
// UN CAREERS
// ============================================================

async function fetchUNCareers() {

  return fetchHTMLSource(
    "United Nations Careers",
    "https://careers.un.org/",
    "Jobs",
    "International"
  );
}

// ============================================================
// TANZANIA - HESLB
// ============================================================

async function fetchHESLB() {

  return fetchHTMLSource(
    "HESLB Official Website",
    "https://www.heslb.go.tz/",
    "Scholarship",
    "Tanzania"
  );
}

// ============================================================
// TANZANIA - AJIRA
// ============================================================

async function fetchAjira() {

  return fetchHTMLSource(
    "Ajira Portal",
    "https://www.ajiraportal.go.tz/",
    "Jobs",
    "Tanzania"
  );
}

// ============================================================
// TANZANIA - PSRS
// ============================================================

async function fetchPSRS() {

  return fetchHTMLSource(
    "Public Service Recruitment Secretariat",
    "https://www.psrs.go.tz/",
    "Jobs",
    "Tanzania"
  );
}

// ============================================================
// ALL SOURCES
// ============================================================

async function collectAll() {

  console.log("");
  console.log(
    "============================================================"
  );
  console.log(
    "🌍 COLLECTING GLOBAL OPPORTUNITIES"
  );
  console.log(
    "============================================================"
  );

  const all = [];

  // ----------------------------------------------------------
  // GRANTS
  // ----------------------------------------------------------

  try {

    const grants =
      await fetchGrantsGov();

    all.push(...grants);

  } catch (e) {

    console.error(
      "❌ Grants section failed:",
      e.message
    );
  }

  // ----------------------------------------------------------
  // INTERNATIONAL OPPORTUNITIES
  // ----------------------------------------------------------

  console.log(
    "🌐 Checking International Opportunities..."
  );

  const internationalSources = [

    fetchUNCareers(),

    fetchWorldBankCareers(),

    fetchUNICEF(),

    fetchWHOCareers(),

    fetchAfricanUnion()
  ];

  const international =
    await Promise.allSettled(
      internationalSources
    );

  for (
    const result of international
  ) {

    if (
      result.status === "fulfilled" &&
      Array.isArray(result.value)
    ) {
      all.push(
        ...result.value
      );
    }
  }

  // ----------------------------------------------------------
  // TANZANIA
  // ----------------------------------------------------------

  console.log(
    "🇹🇿 Checking Tanzania sources..."
  );

  const tanzaniaSources = [

    fetchHESLB(),

    fetchAjira(),

    fetchPSRS()
  ];

  const tanzania =
    await Promise.allSettled(
      tanzaniaSources
    );

  for (
    const result of tanzania
  ) {

    if (
      result.status === "fulfilled" &&
      Array.isArray(result.value)
    ) {

      all.push(
        ...result.value
      );
    }
  }

  // ----------------------------------------------------------
  // NEWS
  // ----------------------------------------------------------

  console.log(
    "📰 Checking Global News & Events..."
  );

  const newsSources = [

    fetchUN(),

    fetchWHO(),

    fetchWorldBank(),

    fetchAfricanUnion()
  ];

  const news =
    await Promise.allSettled(
      newsSources
    );

  for (
    const result of news
  ) {

    if (
      result.status === "fulfilled" &&
      Array.isArray(result.value)
    ) {

      all.push(
        ...result.value
      );
    }
  }

  // ----------------------------------------------------------
  // NORMALIZE
  // ----------------------------------------------------------

  const normalized =
    all
      .map(normalizeItem)
      .filter(
        item =>
          item.title &&
          item.status !== "expired"
      );

  // ----------------------------------------------------------
  // UNIQUE
  // ----------------------------------------------------------

  const unique =
    uniqueByUrl(
      normalized
    );

  console.log("");
  console.log(
    `📊 TOTAL COLLECTED: ${unique.length}`
  );

  return unique;
}

// ============================================================
// SAVE BY CATEGORY
// ============================================================

async function saveAll(items) {

  if (!items.length) {

    console.log(
      "⚠️ Nothing to save."
    );

    return;
  }

  console.log(
    "💾 Saving opportunities..."
  );

  let totalSaved = 0;

  for (
    const item of items
  ) {

    let collection =
      COLLECTIONS.opportunities;

    const category =
      cleanText(
        item.category
      ).toLowerCase();

    if (
      category.includes("grant")
    ) {
      collection =
        COLLECTIONS.grants;

    } else if (
      category.includes("job")
    ) {
      collection =
        COLLECTIONS.jobs;

    } else if (
      category.includes("scholar")
    ) {
      collection =
        COLLECTIONS.scholarships;

    } else if (
      category.includes("intern")
    ) {
      collection =
        COLLECTIONS.internships;

    } else if (
      category.includes("event")
    ) {
      collection =
        COLLECTIONS.events;

    } else if (
      category.includes("news")
    ) {
      collection =
        COLLECTIONS.news;
    }

    const ok =
      await saveItem(
        collection,
        item
      );

    if (ok) {
      totalSaved++;
    }

    // Also maintain unified collection
    await saveItem(
      COLLECTIONS.opportunities,
      item
    );

    await sleep(20);
  }

  console.log(
    `✅ SAVED: ${totalSaved}/${items.length}`
  );
}

// ============================================================
// DATABASE NORMALIZATION
// ============================================================

async function normalizeDatabase() {

  if (!db || !firestoreAvailable) {

    console.log(
      "⚠️ Skipping database normalization: Firestore unavailable"
    );

    return;
  }

  try {

    console.log(
      "🌍 Normalizing existing database..."
    );

    const snapshot =
      await db
        .collection(
          COLLECTIONS.opportunities
        )
        .limit(500)
        .get();

    let count = 0;

    for (
      const doc of snapshot.docs
    ) {

      const data =
        doc.data() || {};

      const normalized =
        normalizeItem(data);

      if (
        normalized.status ===
        "expired"
      ) {

        await doc.ref.set(
          {
            status:
              "expired",

            updatedAt:
              new Date().toISOString()
          },
          {
            merge: true
          }
        );

      } else {

        await doc.ref.set(
          {
            ...normalized,

            updatedAt:
              new Date().toISOString()
          },
          {
            merge: true
          }
        );
      }

      count++;
    }

    console.log(
      `✅ Database normalized: ${count}`
    );

  } catch (error) {

    console.error(
      "❌ Database normalization failed:",
      error.code || "",
      error.message || error
    );

    // IMPORTANT:
    // Do not kill bot.
  }
}

// ============================================================
// REMOVE EXPIRED
// ============================================================

async function removeExpired() {

  if (!db || !firestoreAvailable) {
    return;
  }

  try {

    console.log(
      "🧹 Checking expired opportunities..."
    );

    const snapshot =
      await db
        .collection(
          COLLECTIONS.opportunities
        )
        .limit(500)
        .get();

    let removed = 0;

    for (
      const doc of snapshot.docs
    ) {

      const data =
        doc.data() || {};

      if (
        data.deadline &&
        isExpired(
          data.deadline
        )
      ) {

        await doc.ref.delete();

        removed++;
      }
    }

    console.log(
      `🧹 Removed expired: ${removed}`
    );

  } catch (error) {

    console.error(
      "❌ Expired cleanup failed:",
      error.code || "",
      error.message || error
    );
  }
}

// ============================================================
// MAIN
// ============================================================

let running = false;

async function runBot() {

  if (running) {

    console.log(
      "⏳ Previous run still active."
    );

    return;
  }

  running = true;

  console.log("");
  console.log(
    "============================================================"
  );
  console.log(
    `🚀 MAKYAMA GLOBAL OPPORTUNITIES BOT V${BOT_VERSION}`
  );
  console.log(
    "============================================================"
  );
  console.log(
    `🕐 Started: ${new Date().toISOString()}`
  );

  try {

    // --------------------------------------------------------
    // FIRESTORE TEST
    // --------------------------------------------------------

    await testFirestore();

    // --------------------------------------------------------
    // COLLECT
    // --------------------------------------------------------

    const items =
      await collectAll();

    // --------------------------------------------------------
    // SAVE
    // --------------------------------------------------------

    await saveAll(items);

    // --------------------------------------------------------
    // NORMALIZE
    // --------------------------------------------------------

    await normalizeDatabase();

    // --------------------------------------------------------
    // CLEAN
    // --------------------------------------------------------

    await removeExpired();

    console.log("");
    console.log(
      "============================================================"
    );
    console.log(
      "✅ BOT RUN COMPLETED"
    );
    console.log(
      "============================================================"
    );

  } catch (error) {

    console.error("");
    console.error(
      "❌ BOT ERROR"
    );

    console.error(
      error.stack ||
      error.message ||
      error
    );

    // IMPORTANT:
    // Do not throw again.
    // Render process should stay alive.

  } finally {

    running = false;
  }
}

// ============================================================
// START
// ============================================================

setTimeout(
  () => {
    runBot().catch(
      error =>
        console.error(
          "Unhandled bot error:",
          error
        )
    );
  },
  5000
);

// ============================================================
// RUN EVERY 30 MINUTES
// ============================================================

setInterval(
  () => {

    runBot().catch(
      error =>
        console.error(
          "Scheduled bot error:",
          error
        )
    );

  },
  30 * 60 * 1000
);

// ============================================================
// PROCESS SAFETY
// ============================================================

process.on(
  "unhandledRejection",
  error => {

    console.error(
      "⚠️ UNHANDLED REJECTION:",
      error
    );
  }
);

process.on(
  "uncaughtException",
  error => {

    console.error(
      "⚠️ UNCAUGHT EXCEPTION:",
      error
    );
  }
);
