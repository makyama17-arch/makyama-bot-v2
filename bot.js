// ============================================================
// MAKYAMA GLOBAL OPPORTUNITIES PLATFORM V8
// Jobs + Education + Scholarships + Grants + Events + News
// Global Countries + Official Publish Dates + Admin + Ads
// ============================================================

const express = require("express");
const admin = require("firebase-admin");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// FIREBASE
// ============================================================

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT is missing");
  process.exit(1);
}

let serviceAccount;

try {
  serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT
  );
} catch (error) {
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
// CONFIG
// ============================================================

const CHECK_INTERVAL = 30 * 60 * 1000;

const ADMIN_USERNAME =
  process.env.ADMIN_USERNAME || "admin";

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "ChangeThisPassword123!";

const sessions = new Map();

const USER_AGENT =
  "MAKYAMA Global Opportunities Bot/8.0 (+https://makyama.vercel.app)";

// ============================================================
// BASIC SERVER
// ============================================================

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "MAKYAMA GLOBAL OPPORTUNITIES",
    version: "8.0.0",
    time: new Date().toISOString()
  });
});

app.get("/", (req, res) => {
  res.json({
    status: "online",
    name: "MAKYAMA Global Opportunities",
    version: "8.0.0"
  });
});

// ============================================================
// FETCH HELPERS
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

  return response.json();
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "User-Agent": USER_AGENT,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}

// ============================================================
// URL
// ============================================================

function validURL(value) {
  if (!value || typeof value !== "string") return false;

  try {
    const u = new URL(value.trim());

    return (
      (u.protocol === "http:" ||
        u.protocol === "https:") &&
      !!u.hostname
    );
  } catch {
    return false;
  }
}

function cleanURL(value) {
  if (!value || typeof value !== "string") return "";

  const value2 = value.trim();

  return validURL(value2) ? value2 : "";
}

// ============================================================
// COUNTRY LIST
// ============================================================

const COUNTRIES = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czechia",
  "Democratic Republic of the Congo",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Ivory Coast",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Korea",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Palestine",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Timor-Leste",
  "Togo",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Vatican City",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe"
].sort();

// ============================================================
// COUNTRY ALIASES
// ============================================================

const COUNTRY_MAP = {
  usa: "United States",
  us: "United States",
  "united states of america": "United States",

  uk: "United Kingdom",
  britain: "United Kingdom",

  tz: "Tanzania",
  "united republic of tanzania": "Tanzania",

  ke: "Kenya",
  ug: "Uganda",
  rw: "Rwanda",

  "south korea": "South Korea",
  korea: "South Korea",

  "south africa": "South Africa",

  "ivory coast": "Ivory Coast",
  "cote d'ivoire": "Ivory Coast"
};

function normalizeCountry(value) {
  if (!value) return "International";

  const raw = String(value).trim();

  const key = raw.toLowerCase();

  if (COUNTRY_MAP[key]) {
    return COUNTRY_MAP[key];
  }

  const exact = COUNTRIES.find(
    c => c.toLowerCase() === key
  );

  return exact || raw;
}

function detectCountry(text) {
  if (!text) return "International";

  const value = String(text).toLowerCase();

  for (const country of COUNTRIES) {
    if (value.includes(country.toLowerCase())) {
      return country;
    }
  }

  for (const [alias, country] of Object.entries(
    COUNTRY_MAP
  )) {
    if (value.includes(alias)) {
      return country;
    }
  }

  return "International";
}

// ============================================================
// CATEGORY
// ============================================================

function normalizeCategory(value) {
  const text = String(value || "")
    .toLowerCase()
    .trim();

  if (
    text.includes("job") ||
    text.includes("career") ||
    text.includes("employment") ||
    text.includes("work")
  ) {
    return "Work Opportunities";
  }

  if (
    text.includes("scholar") ||
    text.includes("fellowship")
  ) {
    return "Scholarships";
  }

  if (
    text.includes("education") ||
    text.includes("university") ||
    text.includes("study") ||
    text.includes("course")
  ) {
    return "Education";
  }

  if (
    text.includes("grant") ||
    text.includes("funding")
  ) {
    return "Grants";
  }

  if (
    text.includes("event") ||
    text.includes("conference") ||
    text.includes("summit")
  ) {
    return "Events";
  }

  if (
    text.includes("news") ||
    text.includes("announcement")
  ) {
    return "News";
  }

  return "Opportunity";
}

// ============================================================
// OFFICIAL PUBLISH DATE
// ============================================================

function officialDate(value) {
  if (!value) return null;

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

// ============================================================
// ID
// ============================================================

function makeID(title, url) {
  return crypto
    .createHash("sha256")
    .update(`${title}|${url}`)
    .digest("hex")
    .slice(0, 32);
}

// ============================================================
// SAVE
// ============================================================

async function saveOpportunity(data) {
  const title = String(data.title || "").trim();

  const url =
    cleanURL(data.url) ||
    cleanURL(data.detailsUrl) ||
    cleanURL(data.applyUrl);

  if (!title) {
    console.log("⚠️ Missing title");
    return false;
  }

  if (!url) {
    console.log(
      "⚠️ SKIPPED — no valid URL:",
      title
    );
    return false;
  }

  const id = makeID(title, url);

  const country = normalizeCountry(
    data.country
  );

  const countries =
    Array.isArray(data.countries) &&
    data.countries.length
      ? [...new Set(
          data.countries.map(normalizeCountry)
        )]
      : [country];

  const publishedAt =
    officialDate(data.publishedAt);

  const updatedAtSource =
    officialDate(data.updatedAtSource);

  const ref = db
    .ref("opportunities")
    .child(id);

  const oldSnap = await ref.once("value");

  const old = oldSnap.exists()
    ? oldSnap.val()
    : {};

  const item = {
    id,

    title,

    description:
      String(
        data.description || ""
      ).trim() ||
      "No detailed description is available from the source.",

    category:
      normalizeCategory(data.category),

    country,

    countries,

    source:
      String(data.source || "Official Source"),

    url,

    detailsUrl:
      cleanURL(data.detailsUrl) || url,

    applyUrl:
      cleanURL(data.applyUrl) || url,

    playUrl:
      cleanURL(data.playUrl) || url,

    image:
      cleanURL(data.image),

    deadline:
      data.deadline || "",

    // IMPORTANT:
    // This is ONLY the source publication date.
    publishedAt,

    // Optional official source update date.
    updatedAtSource,

    // Internal database timestamp.
    createdAt:
      old.createdAt || Date.now(),

    updatedAt:
      Date.now(),

    active: true,

    views:
      Number(old.views || 0),

    shares:
      Number(old.shares || 0)
  };

  await ref.set(item);

  console.log(
    oldSnap.exists()
      ? "🔄 UPDATED:"
      : "✅ NEW:",
    title
  );

  console.log(
    "   Category:",
    item.category
  );

  console.log(
    "   Country:",
    item.country
  );

  console.log(
    "   Published:",
    item.publishedAt || "UNAVAILABLE"
  );

  console.log(
    "   Source:",
    item.source
  );

  return !oldSnap.exists();
}

// ============================================================
// REMOTIVE JOBS
// ============================================================

async function checkRemotive() {
  console.log("💼 Checking Remotive jobs...");

  try {
    const data = await fetchJSON(
      "https://remotive.com/api/remote-jobs"
    );

    const jobs = data.jobs || [];

    console.log(
      "📦 Remotive:",
      jobs.length
    );

    let count = 0;

    for (const job of jobs.slice(0, 100)) {
      const url = cleanURL(job.url);

      if (!url) continue;

      const location =
        job.candidate_required_location ||
        "";

      let country =
        detectCountry(
          `${location} ${job.title || ""}`
        );

      // Remote jobs without a country are still global.
      if (!country) {
        country = "International";
      }

      const saved = await saveOpportunity({
        title: job.title,

        description:
          job.description ||
          "Remote work opportunity.",

        category: "Work Opportunities",

        country,

        countries:
          country === "International"
            ? ["International"]
            : [country],

        source: "Remotive",

        url,

        detailsUrl: url,

        applyUrl: url,

        playUrl: url,

        image:
          cleanURL(job.company_logo),

        // REAL Remotive publication date
        publishedAt:
          job.publication_date || null,

        updatedAtSource:
          job.updated_at || null
      });

      if (saved) count++;
    }

    return count;
  } catch (error) {
    console.error(
      "❌ Remotive:",
      error.message
    );

    return 0;
  }
}

// ============================================================
// GRANTS.GOV
// ============================================================

async function checkGrantsGov() {
  console.log("💰 Checking Grants.gov...");

  try {
    const data = await fetchJSON(
      "https://api.grants.gov/v1/api/search2",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          rows: 50,
          startRecordNum: 0,
          keyword: ""
        })
      }
    );

    const grants =
      data?.oppHits ||
      data?.data?.oppHits ||
      [];

    console.log(
      "📦 Grants:",
      grants.length
    );

    let count = 0;

    for (const grant of grants) {
      const id =
        grant.id ||
        grant.oppId ||
        grant.opportunityId;

      if (!id) continue;

      const url =
        `https://www.grants.gov/search-results-detail/${id}`;

      if (!validURL(url)) continue;

      const title =
        grant.oppTitle ||
        grant.title ||
        "Grant Opportunity";

      const description =
        grant.description ||
        grant.oppNumber ||
        "Official grant opportunity published on Grants.gov.";

      const saved = await saveOpportunity({
        title,

        description,

        category: "Grants",

        country: "United States",

        countries: [
          "United States"
        ],

        source: "Grants.gov",

        url,

        detailsUrl: url,

        applyUrl: url,

        playUrl: url,

        // Prefer actual posting date.
        publishedAt:
          grant.postingDate ||
          grant.postDate ||
          grant.openDate ||
          null,

        deadline:
          grant.closeDate ||
          grant.closeDateString ||
          ""
      });

      if (saved) count++;
    }

    return count;
  } catch (error) {
    console.error(
      "❌ Grants.gov:",
      error.message
    );

    return 0;
  }
}

// ============================================================
// GLOBAL OFFICIAL SOURCES
// ============================================================

async function saveGlobalSources() {
  console.log(
    "🌍 Checking global official sources..."
  );

  const sources = [
    {
      title:
        "United Nations — Careers",

      description:
        "Official United Nations careers and employment opportunities.",

      category:
        "Work Opportunities",

      source:
        "United Nations",

      url:
        "https://careers.un.org/"
    },

    {
      title:
        "UNICEF — Careers",

      description:
        "Official UNICEF jobs and career opportunities.",

      category:
        "Work Opportunities",

      source:
        "UNICEF",

      url:
        "https://jobs.unicef.org/"
    },

    {
      title:
        "WHO — Careers",

      description:
        "Official World Health Organization career opportunities.",

      category:
        "Work Opportunities",

      source:
        "World Health Organization",

      url:
        "https://www.who.int/careers"
    },

    {
      title:
        "World Bank — Careers",

      description:
        "Official World Bank career opportunities.",

      category:
        "Work Opportunities",

      source:
        "World Bank",

      url:
        "https://www.worldbank.org/en/about/careers"
    },

    {
      title:
        "African Union — Careers",

      description:
        "Official African Union career and professional opportunities.",

      category:
        "Work Opportunities",

      source:
        "African Union",

      url:
        "https://au.int/en/careers"
    },

    {
      title:
        "United Nations — Events",

      description:
        "Official United Nations events, meetings and international activities.",

      category:
        "Events",

      source:
        "United Nations",

      url:
        "https://www.un.org/en/events"
    },

    {
      title:
        "WHO — News",

      description:
        "Official World Health Organization global news and announcements.",

      category:
        "News",

      source:
        "World Health Organization",

      url:
        "https://www.who.int/news"
    },

    {
      title:
        "World Bank — News",

      description:
        "Global development news and announcements from the World Bank.",

      category:
        "News",

      source:
        "World Bank",

      url:
        "https://www.worldbank.org/en/news"
    },

    {
      title:
        "African Union — News",

      description:
        "Official African Union news and continental announcements.",

      category:
        "News",

      source:
        "African Union",

      url:
        "https://au.int/en/news"
    }
  ];

  let count = 0;

  for (const item of sources) {
    // These source landing pages generally do not expose
    // a single publication date for the page itself.
    // Therefore publishedAt stays null instead of using Date.now().

    const saved = await saveOpportunity({
      ...item,

      country: "International",

      countries: [
        "International"
      ],

      publishedAt: null
    });

    if (saved) count++;
  }

  return count;
}

// ============================================================
// HESLB
// ============================================================

async function checkHESLB() {
  console.log(
    "🎓 Checking HESLB..."
  );

  const url =
    "https://www.heslb.go.tz/";

  return saveOpportunity({
    title:
      "HESLB — Official Student Loans and Scholarships",

    description:
      "Official Higher Education Students' Loans Board information, applications, guidelines and announcements.",

    category:
      "Scholarships",

    country:
      "Tanzania",

    source:
      "HESLB Tanzania",

    url,

    detailsUrl: url,

    applyUrl: url,

    playUrl: url,

    publishedAt: null
  });
}

// ============================================================
// AJIRA
// ============================================================

async function checkAjira() {
  console.log(
    "💼 Checking Ajira Tanzania..."
  );

  const url =
    "https://www.ajira.go.tz/";

  return saveOpportunity({
    title:
      "Ajira Portal — Tanzania Public Service Jobs",

    description:
      "Official Tanzania public service recruitment information and job vacancies.",

    category:
      "Work Opportunities",

    country:
      "Tanzania",

    source:
      "Ajira / PSRS",

    url,

    detailsUrl: url,

    applyUrl: url,

    playUrl: url,

    publishedAt: null
  });
}

// ============================================================
// CLEAN INVALID URLS
// ============================================================

async function removeInvalidURLs() {
  const snap =
    await db.ref("opportunities")
      .once("value");

  if (!snap.exists()) return;

  const updates = {};

  snap.forEach(child => {
    const item = child.val();

    if (
      !item ||
      !validURL(item.url)
    ) {
      updates[child.key] = null;
    }
  });

  if (Object.keys(updates).length) {
    await db.ref("opportunities")
      .update(updates);
  }
}

// ============================================================
// API — OPPORTUNITIES
// ============================================================

app.get(
  "/api/opportunities",
  async (req, res) => {
    try {
      const snap =
        await db.ref("opportunities")
          .once("value");

      const list = [];

      snap.forEach(child => {
        const item = child.val();

        if (!item) return;

        if (!item.active) return;

        if (!validURL(item.url)) return;

        list.push(item);
      });

      // Official publication date first.
      // Items without official date go after dated items.
      list.sort((a, b) => {
        const da =
          a.publishedAt
            ? new Date(a.publishedAt).getTime()
            : 0;

        const dbb =
          b.publishedAt
            ? new Date(b.publishedAt).getTime()
            : 0;

        if (dbb !== da) {
          return dbb - da;
        }

        return (
          Number(b.updatedAt || 0) -
          Number(a.updatedAt || 0)
        );
      });

      res.json({
        ok: true,
        count: list.length,
        opportunities: list
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        ok: false,
        error: "Failed to load opportunities"
      });
    }
  }
);

// ============================================================
// API — VIEW
// ============================================================

app.post(
  "/api/opportunities/:id/view",
  async (req, res) => {
    try {
      const ref =
        db.ref("opportunities")
          .child(req.params.id);

      await ref.transaction(item => {
        if (!item) return item;

        item.views =
          Number(item.views || 0) + 1;

        return item;
      });

      res.json({
        ok: true
      });
    } catch {
      res.status(500).json({
        ok: false
      });
    }
  }
);

// ============================================================
// API — SHARE
// ============================================================

app.post(
  "/api/opportunities/:id/share",
  async (req, res) => {
    try {
      const ref =
        db.ref("opportunities")
          .child(req.params.id);

      await ref.transaction(item => {
        if (!item) return item;

        item.shares =
          Number(item.shares || 0) + 1;

        return item;
      });

      res.json({
        ok: true
      });
    } catch {
      res.status(500).json({
        ok: false
      });
    }
  }
);

// ============================================================
// ADMIN LOGIN
// ============================================================

app.post(
  "/api/admin/login",
  (req, res) => {
    const {
      username,
      password
    } = req.body || {};

    if (
      username !== ADMIN_USERNAME ||
      password !== ADMIN_PASSWORD
    ) {
      return res.status(401).json({
        ok: false,
        error: "Invalid username or password"
      });
    }

    const token =
      crypto.randomBytes(32)
        .toString("hex");

    sessions.set(token, {
      username,
      createdAt: Date.now()
    });

    res.json({
      ok: true,
      token
    });
  }
);

// ============================================================
// ADMIN AUTH
// ============================================================

function adminAuth(req, res, next) {
  const header =
    req.headers.authorization || "";

  const token =
    header.startsWith("Bearer ")
      ? header.slice(7)
      : "";

  if (!token || !sessions.has(token)) {
    return res.status(401).json({
      ok: false,
      error: "Unauthorized"
    });
  }

  next();
}

// ============================================================
// ONLINE USERS
// ============================================================

app.post(
  "/api/online",
  async (req, res) => {
    try {
      const clientId =
        String(
          req.body.clientId || ""
        ).slice(0, 100);

      if (!clientId) {
        return res.status(400).json({
          ok: false
        });
      }

      await db
        .ref("online")
        .child(clientId)
        .set({
          lastSeen: Date.now()
        });

      res.json({
        ok: true
      });
    } catch {
      res.status(500).json({
        ok: false
      });
    }
  }
);

// ============================================================
// ADMIN ONLINE COUNT
// ============================================================

app.get(
  "/api/admin/online",
  adminAuth,
  async (req, res) => {
    try {
      const snap =
        await db.ref("online")
          .once("value");

      const now = Date.now();

      const users = [];

      snap.forEach(child => {
        const data = child.val();

        if (
          data &&
          now - Number(data.lastSeen || 0)
            < 2 * 60 * 1000
        ) {
          users.push({
            id: child.key,
            lastSeen: data.lastSeen
          });
        }
      });

      res.json({
        ok: true,
        count: users.length,
        users
      });
    } catch {
      res.status(500).json({
        ok: false
      });
    }
  }
);

// ============================================================
// ADS — PUBLIC
// ============================================================

app.get(
  "/api/ads",
  async (req, res) => {
    try {
      const snap =
        await db.ref("ads")
          .once("value");

      const ads = [];

      snap.forEach(child => {
        const ad = child.val();

        if (!ad) return;

        if (ad.active === false) return;

        if (
          ad.url &&
          !validURL(ad.url)
        ) {
          return;
        }

        ads.push({
          id: child.key,
          ...ad
        });
      });

      res.json({
        ok: true,
        ads
      });
    } catch {
      res.status(500).json({
        ok: false
      });
    }
  }
);

// ============================================================
// ADMIN — ADS
// ============================================================

app.post(
  "/api/admin/ads",
  adminAuth,
  async (req, res) => {
    try {
      const {
        title,
        text,
        image,
        url
      } = req.body || {};

      if (!title) {
        return res.status(400).json({
          ok: false,
          error: "Title is required"
        });
      }

      if (
        url &&
        !validURL(url)
      ) {
        return res.status(400).json({
          ok: false,
          error: "Invalid ad URL"
        });
      }

      const ref =
        db.ref("ads").push();

      await ref.set({
        title:
          String(title).slice(0, 200),

        text:
          String(text || "").slice(0, 1000),

        image:
          cleanURL(image),

        url:
          cleanURL(url),

        active: true,

        createdAt:
          Date.now()
      });

      res.json({
        ok: true,
        id: ref.key
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error.message
      });
    }
  }
);

app.delete(
  "/api/admin/ads/:id",
  adminAuth,
  async (req, res) => {
    try {
      await db
        .ref("ads")
        .child(req.params.id)
        .remove();

      res.json({
        ok: true
      });
    } catch {
      res.status(500).json({
        ok: false
      });
    }
  }
);

// ============================================================
// ADMIN — OPPORTUNITY DELETE
// ============================================================

app.delete(
  "/api/admin/opportunities/:id",
  adminAuth,
  async (req, res) => {
    try {
      await db
        .ref("opportunities")
        .child(req.params.id)
        .remove();

      res.json({
        ok: true
      });
    } catch {
      res.status(500).json({
        ok: false
      });
    }
  }
);

// ============================================================
// BOT
// ============================================================

async function runBot() {
  console.log("");
  console.log(
    "=========================================="
  );

  console.log(
    "🌍 MAKYAMA GLOBAL OPPORTUNITIES V8"
  );

  console.log(
    "=========================================="
  );

  console.log(
    "Time:",
    new Date().toISOString()
  );

  let total = 0;

  try {
    total += await checkRemotive();
  } catch (e) {
    console.error(e.message);
  }

  try {
    total += await checkGrantsGov();
  } catch (e) {
    console.error(e.message);
  }

  try {
    await saveGlobalSources();
  } catch (e) {
    console.error(e.message);
  }

  try {
    const result =
      await checkHESLB();

    if (result) total++;
  } catch (e) {
    console.error(e.message);
  }

  try {
    const result =
      await checkAjira();

    if (result) total++;
  } catch (e) {
    console.error(e.message);
  }

  await removeInvalidURLs();

  console.log(
    "=========================================="
  );

  console.log(
    "🎉 BOT FINISHED"
  );

  console.log(
    "New:",
    total
  );

  console.log(
    "=========================================="
  );
}

// ============================================================
// START
// ============================================================

app.listen(PORT, () => {
  console.log(
    "=========================================="
  );

  console.log(
    "🚀 MAKYAMA GLOBAL OPPORTUNITIES V8"
  );

  console.log(
    "Port:",
    PORT
  );

  console.log(
    "Default language: English"
  );

  console.log(
    "Mode: GLOBAL"
  );

  console.log(
    "=========================================="
  );

  runBot().catch(console.error);
});

// ============================================================
// EVERY 30 MINUTES
// ============================================================

setInterval(() => {
  runBot().catch(error => {
    console.error(
      "❌ Scheduled bot error:",
      error
    );
  });
}, CHECK_INTERVAL);
