// ============================================================
// MAKYAMA GLOBAL OPPORTUNITIES BOT V7
// Global Opportunities + Jobs + Scholarships + Grants + Events
// ============================================================

const express = require("express");
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 10000;

// ============================================================
// FIREBASE
// ============================================================

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT is missing!");
  process.exit(1);
}

let serviceAccount;

try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (e) {
  console.error("❌ Invalid FIREBASE_SERVICE_ACCOUNT JSON");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    process.env.FIREBASE_DATABASE_URL ||
    "https://makyama-e5e89-default-rtdb.firebaseio.com/"
});

const db = admin.database();

// ============================================================
// SERVER
// ============================================================

app.get("/", (req, res) => {
  res.json({
    status: "online",
    name: "MAKYAMA Global Opportunities Bot",
    version: "7.0.0",
    message: "Bot is running successfully"
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "MAKYAMA BOT",
    time: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log("==========================================");
  console.log("🚀 MAKYAMA GLOBAL OPPORTUNITIES BOT V7");
  console.log("==========================================");
  console.log("Port:", PORT);
  console.log("Interval: 30 minutes");
  console.log("Default language: English");
  console.log("Mode: GLOBAL");
  console.log("==========================================");
});

// ============================================================
// CONSTANTS
// ============================================================

const CHECK_INTERVAL = 30 * 60 * 1000;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36";

// ============================================================
// FETCH
// ============================================================

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json,text/plain,*/*",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return await response.json();
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return await response.text();
}

// ============================================================
// URL VALIDATION
// ============================================================

function validURL(value) {
  if (!value || typeof value !== "string") return false;

  try {
    const url = new URL(value.trim());

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !!url.hostname
    );
  } catch {
    return false;
  }
}

function cleanURL(value) {
  if (!value || typeof value !== "string") return "";

  const url = value.trim();

  return validURL(url) ? url : "";
}

// ============================================================
// COUNTRY NORMALIZATION
// ============================================================

const COUNTRY_MAP = {
  usa: "United States",
  "united states": "United States",
  "united states of america": "United States",
  us: "United States",

  uk: "United Kingdom",
  "united kingdom": "United Kingdom",
  britain: "United Kingdom",

  tz: "Tanzania",
  tanzania: "Tanzania",
  "united republic of tanzania": "Tanzania",

  ke: "Kenya",
  kenya: "Kenya",

  ug: "Uganda",
  uganda: "Uganda",

  rw: "Rwanda",
  rwanda: "Rwanda",

  burundi: "Burundi",

  ghana: "Ghana",
  nigeria: "Nigeria",
  southafrica: "South Africa",
  "south africa": "South Africa",

  ethiopia: "Ethiopia",
  et: "Ethiopia",

  canada: "Canada",
  australia: "Australia",
  germany: "Germany",
  france: "France",
  italy: "Italy",
  spain: "Spain",
  portugal: "Portugal",
  netherlands: "Netherlands",
  belgium: "Belgium",
  switzerland: "Switzerland",
  sweden: "Sweden",
  norway: "Norway",
  denmark: "Denmark",
  finland: "Finland",
  ireland: "Ireland",
  india: "India",
  pakistan: "Pakistan",
  bangladesh: "Bangladesh",
  china: "China",
  japan: "Japan",
  "south korea": "South Korea",
  singapore: "Singapore",
  malaysia: "Malaysia",
  indonesia: "Indonesia",
  brazil: "Brazil",
  mexico: "Mexico",
  argentina: "Argentina",
  chile: "Chile",
  egypt: "Egypt",
  morocco: "Morocco",
  ghana: "Ghana"
};

function normalizeCountry(country) {
  if (!country) return "International";

  let value = String(country).trim();

  const key = value.toLowerCase();

  if (COUNTRY_MAP[key]) {
    return COUNTRY_MAP[key];
  }

  return value;
}

// ============================================================
// COUNTRY FROM LOCATION TEXT
// ============================================================

function detectCountry(text) {
  if (!text) return "International";

  const value = String(text).toLowerCase();

  for (const [key, country] of Object.entries(COUNTRY_MAP)) {
    if (value.includes(key)) {
      return country;
    }
  }

  return "International";
}

// ============================================================
// CATEGORY NORMALIZATION
// ============================================================

function normalizeCategory(category) {
  if (!category) return "Opportunity";

  const value = String(category).toLowerCase();

  if (
    value.includes("scholar") ||
    value.includes("fellowship") ||
    value.includes("education")
  ) {
    return "Scholarship";
  }

  if (
    value.includes("grant") ||
    value.includes("funding") ||
    value.includes("award")
  ) {
    return "Grant";
  }

  if (
    value.includes("job") ||
    value.includes("career") ||
    value.includes("employment")
  ) {
    return "Job";
  }

  if (
    value.includes("intern") ||
    value.includes("trainee")
  ) {
    return "Internship";
  }

  if (
    value.includes("event") ||
    value.includes("conference") ||
    value.includes("summit")
  ) {
    return "Event";
  }

  if (
    value.includes("competition") ||
    value.includes("contest")
  ) {
    return "Competition";
  }

  return category;
}

// ============================================================
// HASH / ID
// ============================================================

function makeID(title, url) {
  const text = `${title}|${url}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 180);

  return text;
}

// ============================================================
// SAVE OPPORTUNITY
// ============================================================

async function saveOpportunity(data) {
  try {
    const title = String(data.title || "").trim();
    const url = cleanURL(data.url);

    // IMPORTANT:
    // Every opportunity MUST have a real URL.
    if (!title) {
      console.log("⚠️ Skipped item: missing title");
      return false;
    }

    if (!url) {
      console.log("⚠️ Skipped item:", title);
      console.log("   Reason: missing/invalid URL");
      return false;
    }

    const id = makeID(title, url);

    const opportunity = {
      id,

      title,

      description:
        String(data.description || "").trim() ||
        "No detailed description available.",

      category: normalizeCategory(data.category),

      country: normalizeCountry(data.country),

      countries: Array.isArray(data.countries)
        ? data.countries.map(normalizeCountry)
        : [normalizeCountry(data.country)],

      source: String(data.source || "Unknown"),

      url,

      applyUrl: cleanURL(data.applyUrl) || url,

      detailsUrl: cleanURL(data.detailsUrl) || url,

      playUrl: cleanURL(data.playUrl) || url,

      image: cleanURL(data.image),

      deadline: data.deadline || "",

      publishedAt: data.publishedAt || Date.now(),

      createdAt: data.createdAt || Date.now(),

      updatedAt: Date.now(),

      active: true,

      views: Number(data.views || 0),

      shares: Number(data.shares || 0)
    };

    const ref = db.ref("opportunities").child(id);

    const existing = await ref.once("value");

    if (existing.exists()) {
      await ref.update({
        ...opportunity,
        createdAt:
          existing.val().createdAt || opportunity.createdAt,
        views:
          existing.val().views || 0,
        shares:
          existing.val().shares || 0
      });

      console.log("🔄 UPDATED:", title);
      return false;
    }

    await ref.set(opportunity);

    console.log("");
    console.log("✅ NEW OPPORTUNITY");
    console.log("Title:", title);
    console.log("Category:", opportunity.category);
    console.log("Country:", opportunity.country);
    console.log("Source:", opportunity.source);
    console.log("URL:", opportunity.url);

    return true;
  } catch (error) {
    console.error("❌ SAVE ERROR:", error.message);
    return false;
  }
}

// ============================================================
// GRANTS.GOV
// ============================================================

async function checkGrantsGov() {
  console.log("🇺🇸 Checking Grants.gov...");

  try {
    const url =
      "https://api.grants.gov/v1/api/search2";

    const body = {
      rows: 50,
      startRecordNum: 0,
      keyword: ""
    };

    const data = await fetchJSON(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const opportunities =
      data?.oppHits ||
      data?.data?.oppHits ||
      [];

    console.log("📦 Grants.gov:", opportunities.length);

    let count = 0;

    for (const item of opportunities) {
      const title =
        item.oppTitle ||
        item.title ||
        "Untitled Grant";

      const id =
        item.id ||
        item.oppId ||
        item.opportunityId;

      let url = "";

      if (id) {
        url =
          `https://www.grants.gov/search-results-detail/${id}`;
      }

      if (!validURL(url)) continue;

      const country =
        detectCountry(
          `${item.agencyName || ""} ${item.oppTitle || ""}`
        );

      const saved = await saveOpportunity({
        title,
        description:
          item.description ||
          item.oppNumber ||
          "Grant opportunity available through Grants.gov.",

        category: "Grant",

        country:
          country === "International"
            ? "United States"
            : country,

        source: "Grants.gov",

        url,

        applyUrl: url,

        detailsUrl: url,

        playUrl: url,

        deadline:
          item.closeDate ||
          item.closeDateString ||
          "",

        publishedAt:
          item.openDate ||
          Date.now()
      });

      if (saved) count++;
    }

    return count;
  } catch (error) {
    console.error("❌ Grants.gov ERROR:", error.message);
    return 0;
  }
}

// ============================================================
// REMOTIVE GLOBAL JOBS
// ============================================================

async function checkRemotive() {
  console.log("🌍 Checking Remotive Global Jobs...");

  try {
    const data = await fetchJSON(
      "https://remotive.com/api/remote-jobs"
    );

    const jobs = data?.jobs || [];

    console.log("📦 Remotive:", jobs.length);

    let count = 0;

    for (const job of jobs.slice(0, 50)) {
      const url = cleanURL(job.url);

      if (!url) continue;

      const country =
        detectCountry(
          `${job.candidate_required_location || ""} ${job.title || ""}`
        );

      const saved = await saveOpportunity({
        title: job.title,

        description:
          job.description || "Remote job opportunity.",

        category: "Job",

        country,

        countries:
          country === "International"
            ? ["International"]
            : [country],

        source: "Remotive",

        url,

        applyUrl: url,

        detailsUrl: url,

        playUrl: url,

        image: cleanURL(job.company_logo),

        publishedAt:
          job.publication_date ||
          Date.now()
      });

      if (saved) count++;
    }

    return count;
  } catch (error) {
    console.error("❌ Remotive ERROR:", error.message);
    return 0;
  }
}

// ============================================================
// INTERNATIONAL SOURCES
// ============================================================

async function checkInternationalSources() {
  console.log("🌐 Checking International Opportunities...");

  let total = 0;

  const sources = [
    {
      name: "UN Careers",
      url: "https://careers.un.org/"
    },
    {
      name: "World Bank Careers",
      url: "https://www.worldbank.org/en/about/careers"
    },
    {
      name: "UNICEF Careers",
      url: "https://jobs.unicef.org/"
    },
    {
      name: "WHO Careers",
      url: "https://www.who.int/careers"
    },
    {
      name: "African Union Careers",
      url: "https://au.int/en/careers"
    }
  ];

  for (const source of sources) {
    try {
      if (!validURL(source.url)) continue;

      const saved = await saveOpportunity({
        title: `${source.name} — Opportunities`,

        description:
          `Visit the official ${source.name} website to view current opportunities, jobs, programmes and announcements.`,

        category: "Opportunity",

        country: "International",

        countries: ["International"],

        source: source.name,

        url: source.url,

        applyUrl: source.url,

        detailsUrl: source.url,

        playUrl: source.url,

        publishedAt: Date.now()
      });

      if (saved) total++;
    } catch (error) {
      console.error(
        `❌ ${source.name}:`,
        error.message
      );
    }
  }

  console.log("📦 International sources:", total);

  return total;
}

// ============================================================
// HESLB
// ============================================================

async function checkHESLB() {
  console.log("🇹🇿 Checking HESLB Tanzania...");

  const opportunities = [
    {
      title: "HESLB Online Application",
      url: "https://www.heslb.go.tz/"
    },

    {
      title: "HESLB Scholarships and Loans",
      url: "https://www.heslb.go.tz/"
    },

    {
      title: "HESLB Loan Issuance",
      url: "https://www.heslb.go.tz/"
    },

    {
      title: "HESLB Loan Repayment",
      url: "https://www.heslb.go.tz/"
    },

    {
      title: "HESLB Application Guidelines",
      url: "https://www.heslb.go.tz/"
    }
  ];

  let count = 0;

  for (const item of opportunities) {
    const saved = await saveOpportunity({
      title: item.title,

      description:
        "Visit the official HESLB website for the latest information, application procedures and announcements.",

      category: "Scholarship",

      country: "Tanzania",

      source: "HESLB Tanzania",

      url: item.url,

      applyUrl: item.url,

      detailsUrl: item.url,

      playUrl: item.url
    });

    if (saved) count++;
  }

  console.log("📦 HESLB processed:", count);

  return count;
}

// ============================================================
// AJIRA / PSRS
// ============================================================

async function checkAjira() {
  console.log("🇹🇿 Checking Ajira / PSRS...");

  try {
    const officialURL =
      "https://www.ajira.go.tz/";

    const opportunities = [
      {
        title: "Ajira Portal — Tanzania Public Service Jobs",
        url: officialURL
      },

      {
        title: "Public Service Recruitment Secretariat — Jobs",
        url: officialURL
      }
    ];

    let count = 0;

    for (const item of opportunities) {
      const saved = await saveOpportunity({
        title: item.title,

        description:
          "Visit the official Tanzania public service recruitment portal for current job vacancies and recruitment announcements.",

        category: "Job",

        country: "Tanzania",

        source: "Ajira / PSRS",

        url: item.url,

        applyUrl: item.url,

        detailsUrl: item.url,

        playUrl: item.url
      });

      if (saved) count++;
    }

    console.log("📦 Ajira / PSRS processed:", count);

    return count;
  } catch (error) {
    console.error("❌ Ajira ERROR:", error.message);
    return 0;
  }
}

// ============================================================
// GLOBAL NEWS / EVENTS
// ============================================================

async function checkGlobalEvents() {
  console.log("📰 Checking Global Events...");

  const events = [
    {
      title: "United Nations — Global Events",
      description:
        "Follow official United Nations events, meetings, announcements and international activities.",
      country: "International",
      url: "https://www.un.org/en/events"
    },

    {
      title: "World Health Organization — News & Events",
      description:
        "Official WHO news, events and global health announcements.",
      country: "International",
      url: "https://www.who.int/news"
    },

    {
      title: "World Bank — News & Events",
      description:
        "Global development news, events and announcements from the World Bank.",
      country: "International",
      url: "https://www.worldbank.org/en/news"
    },

    {
      title: "African Union — News & Events",
      description:
        "Official African Union news, events and continental announcements.",
      country: "International",
      url: "https://au.int/en/news"
    }
  ];

  let count = 0;

  for (const event of events) {
    const saved = await saveOpportunity({
      title: event.title,

      description: event.description,

      category: "Event",

      country: event.country,

      source: "Official Global Source",

      url: event.url,

      detailsUrl: event.url,

      applyUrl: event.url,

      playUrl: event.url
    });

    if (saved) count++;
  }

  console.log("📦 Global events:", count);

  return count;
}

// ============================================================
// REMOVE EXPIRED
// ============================================================

async function removeExpired() {
  console.log("🧹 Checking expired opportunities...");

  try {
    const snap = await db.ref("opportunities").once("value");

    if (!snap.exists()) {
      console.log("🧹 Nothing to clean.");
      return;
    }

    const updates = {};

    const now = Date.now();

    snap.forEach(child => {
      const item = child.val();

      if (!item) return;

      if (!item.deadline) return;

      const deadline = new Date(item.deadline).getTime();

      if (
        !isNaN(deadline) &&
        deadline < now
      ) {
        updates[child.key] = null;

        console.log(
          "🗑️ Removing expired:",
          item.title
        );
      }
    });

    if (Object.keys(updates).length) {
      await db.ref("opportunities").update(updates);

      console.log(
        "🧹 Removed",
        Object.keys(updates).length,
        "expired opportunities."
      );
    } else {
      console.log("🧹 Removed 0 expired opportunities.");
    }
  } catch (error) {
    console.error(
      "❌ Expiry cleanup error:",
      error.message
    );
  }
}

// ============================================================
// NORMALIZE EXISTING DATABASE
// ============================================================

async function normalizeExistingCountries() {
  console.log("🌍 Normalizing countries...");

  try {
    const snap = await db.ref("opportunities").once("value");

    if (!snap.exists()) {
      console.log("No opportunities found.");
      return;
    }

    const updates = {};

    snap.forEach(child => {
      const item = child.val();

      if (!item) return;

      const country =
        normalizeCountry(item.country);

      const countries =
        Array.isArray(item.countries)
          ? item.countries.map(normalizeCountry)
          : [country];

      updates[`${child.key}/country`] =
        country;

      updates[`${child.key}/countries`] =
        countries;

      if (!validURL(item.url)) {
        updates[`${child.key}/active`] =
          false;
      }
    });

    if (Object.keys(updates).length) {
      await db.ref("opportunities").update(updates);
    }

    console.log("✅ Country normalization complete");
  } catch (error) {
    console.error(
      "❌ Normalization error:",
      error.message
    );
  }
}

// ============================================================
// CLEAN INVALID URL OPPORTUNITIES
// ============================================================

async function removeInvalidURLs() {
  console.log("🔗 Checking opportunity URLs...");

  try {
    const snap = await db.ref("opportunities").once("value");

    if (!snap.exists()) return;

    const updates = {};

    snap.forEach(child => {
      const item = child.val();

      if (!item) return;

      if (!validURL(item.url)) {
        console.log(
          "🗑️ Removing invalid URL:",
          item.title
        );

        updates[child.key] = null;
      }
    });

    if (Object.keys(updates).length) {
      await db.ref("opportunities").update(updates);
    }

    console.log(
      "🔗 URL check complete."
    );
  } catch (error) {
    console.error(
      "❌ URL cleanup error:",
      error.message
    );
  }
}

// ============================================================
// MAIN BOT
// ============================================================

async function runBot() {
  console.log("");
  console.log("==========================================");
  console.log("🤖 MAKYAMA GLOBAL OPPORTUNITIES BOT V7");
  console.log("==========================================");

  console.log(
    "Time:",
    new Date().toISOString()
  );

  console.log("");

  await removeExpired();

  await removeInvalidURLs();

  let totalNew = 0;

  totalNew += await checkGrantsGov();

  totalNew += await checkRemotive();

  totalNew += await checkInternationalSources();

  totalNew += await checkHESLB();

  totalNew += await checkAjira();

  totalNew += await checkGlobalEvents();

  await normalizeExistingCountries();

  console.log("");
  console.log("==========================================");
  console.log("🎉 BOT FINISHED SUCCESSFULLY");
  console.log("New items:", totalNew);
  console.log("==========================================");
  console.log("");
}

// ============================================================
// START
// ============================================================

runBot().catch(error => {
  console.error(
    "❌ BOT CRITICAL ERROR:",
    error
  );
});

// ============================================================
// AUTO RUN EVERY 30 MINUTES
// ============================================================

setInterval(() => {
  runBot().catch(error => {
    console.error(
      "❌ Scheduled bot error:",
      error
    );
  });
}, CHECK_INTERVAL);
