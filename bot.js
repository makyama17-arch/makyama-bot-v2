// ============================================================
// MAKYAMA GLOBAL OPPORTUNITIES BOT V8
// Global Countries + Education + Jobs + Grants + Events + News
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
// SERVER
// ============================================================

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "online",
    name: "MAKYAMA Global Opportunities Bot",
    version: "8.0.0",
    mode: "GLOBAL",
    language: "English",
    message: "MAKYAMA Bot is running successfully"
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "MAKYAMA GLOBAL BOT",
    version: "8.0.0",
    time: new Date().toISOString()
  });
});

app.get("/api/stats", async (req, res) => {
  try {
    const snap = await db.ref("opportunities").once("value");

    let total = 0;
    let education = 0;
    let jobs = 0;
    let grants = 0;
    let events = 0;
    let news = 0;

    if (snap.exists()) {
      snap.forEach(child => {
        const item = child.val();

        if (!item || item.active === false) return;

        total++;

        const category =
          String(item.category || "").toLowerCase();

        if (
          category.includes("scholar") ||
          category.includes("education") ||
          category.includes("fellowship")
        ) {
          education++;
        }

        if (
          category.includes("job") ||
          category.includes("internship")
        ) {
          jobs++;
        }

        if (category.includes("grant")) {
          grants++;
        }

        if (category.includes("event")) {
          events++;
        }

        if (category.includes("news")) {
          news++;
        }
      });
    }

    res.json({
      total,
      education,
      jobs,
      grants,
      events,
      news
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log("==========================================");
  console.log("🚀 MAKYAMA GLOBAL OPPORTUNITIES BOT V8");
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
// FETCH JSON
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

// ============================================================
// FETCH TEXT
// ============================================================

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

  return await response.text();
}

// ============================================================
// URL VALIDATION
// ============================================================

function validURL(value) {
  if (!value || typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value.trim());

    return (
      (url.protocol === "http:" ||
        url.protocol === "https:") &&
      !!url.hostname
    );
  } catch {
    return false;
  }
}

function cleanURL(value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  const url = value.trim();

  return validURL(url) ? url : "";
}

// ============================================================
// TEXT CLEANING
// ============================================================

function cleanText(value) {
  if (!value) return "";

  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function limitText(value, max = 10000) {
  const text = cleanText(value);

  if (text.length <= max) {
    return text;
  }

  return text.slice(0, max) + "...";
}

// ============================================================
// COUNTRY NORMALIZATION
// ============================================================

const COUNTRY_MAP = {
  afghanistan: "Afghanistan",
  albania: "Albania",
  algeria: "Algeria",
  andorra: "Andorra",
  angola: "Angola",
  antigua: "Antigua and Barbuda",
  argentina: "Argentina",
  armenia: "Armenia",
  australia: "Australia",
  austria: "Austria",
  azerbaijan: "Azerbaijan",

  bahamas: "Bahamas",
  bahrain: "Bahrain",
  bangladesh: "Bangladesh",
  barbados: "Barbados",
  belarus: "Belarus",
  belgium: "Belgium",
  belize: "Belize",
  benin: "Benin",
  bhutan: "Bhutan",
  bolivia: "Bolivia",
  bosnia: "Bosnia and Herzegovina",
  botswana: "Botswana",
  brazil: "Brazil",
  brunei: "Brunei",
  bulgaria: "Bulgaria",
  burkina: "Burkina Faso",
  burundi: "Burundi",

  cambodia: "Cambodia",
  cameroon: "Cameroon",
  canada: "Canada",
  chad: "Chad",
  chile: "Chile",
  china: "China",
  colombia: "Colombia",
  comoros: "Comoros",
  congo: "Congo",
  croatia: "Croatia",
  cuba: "Cuba",
  cyprus: "Cyprus",
  czechia: "Czech Republic",

  denmark: "Denmark",
  djibouti: "Djibouti",
  dominica: "Dominica",
  "dominican republic": "Dominican Republic",

  ecuador: "Ecuador",
  egypt: "Egypt",
  "el salvador": "El Salvador",
  eritrea: "Eritrea",
  estonia: "Estonia",
  eswatini: "Eswatini",
  ethiopia: "Ethiopia",

  fiji: "Fiji",
  finland: "Finland",
  france: "France",

  gabon: "Gabon",
  gambia: "Gambia",
  georgia: "Georgia",
  germany: "Germany",
  ghana: "Ghana",
  greece: "Greece",
  grenada: "Grenada",
  guatemala: "Guatemala",
  guinea: "Guinea",
  guyana: "Guyana",

  haiti: "Haiti",
  honduras: "Honduras",
  hungary: "Hungary",

  iceland: "Iceland",
  india: "India",
  indonesia: "Indonesia",
  iran: "Iran",
  iraq: "Iraq",
  ireland: "Ireland",
  israel: "Israel",
  italy: "Italy",
  "ivory coast": "Côte d'Ivoire",

  jamaica: "Jamaica",
  japan: "Japan",
  jordan: "Jordan",

  kazakhstan: "Kazakhstan",
  kenya: "Kenya",
  kiribati: "Kiribati",
  kuwait: "Kuwait",
  kyrgyzstan: "Kyrgyzstan",

  laos: "Laos",
  latvia: "Latvia",
  lebanon: "Lebanon",
  lesotho: "Lesotho",
  liberia: "Liberia",
  libya: "Libya",
  liechtenstein: "Liechtenstein",
  lithuania: "Lithuania",
  luxembourg: "Luxembourg",

  madagascar: "Madagascar",
  malawi: "Malawi",
  malaysia: "Malaysia",
  maldives: "Maldives",
  mali: "Mali",
  malta: "Malta",
  mauritania: "Mauritania",
  mauritius: "Mauritius",
  mexico: "Mexico",
  micronesia: "Micronesia",
  moldova: "Moldova",
  monaco: "Monaco",
  mongolia: "Mongolia",
  montenegro: "Montenegro",
  morocco: "Morocco",
  mozambique: "Mozambique",
  myanmar: "Myanmar",

  namibia: "Namibia",
  nauru: "Nauru",
  nepal: "Nepal",
  netherlands: "Netherlands",
  "new zealand": "New Zealand",
  nicaragua: "Nicaragua",
  niger: "Niger",
  nigeria: "Nigeria",
  "north korea": "North Korea",
  "north macedonia": "North Macedonia",
  norway: "Norway",

  oman: "Oman",

  pakistan: "Pakistan",
  palau: "Palau",
  panama: "Panama",
  "papua new guinea": "Papua New Guinea",
  paraguay: "Paraguay",
  peru: "Peru",
  philippines: "Philippines",
  poland: "Poland",
  portugal: "Portugal",

  qatar: "Qatar",

  romania: "Romania",
  russia: "Russia",
  rwanda: "Rwanda",

  samoa: "Samoa",
  "san marino": "San Marino",
  "saudi arabia": "Saudi Arabia",
  senegal: "Senegal",
  serbia: "Serbia",
  seychelles: "Seychelles",
  "sierra leone": "Sierra Leone",
  singapore: "Singapore",
  slovakia: "Slovakia",
  slovenia: "Slovenia",
  somalia: "Somalia",
  "south africa": "South Africa",
  "south korea": "South Korea",
  "south sudan": "South Sudan",
  spain: "Spain",
  "sri lanka": "Sri Lanka",
  sudan: "Sudan",
  suriname: "Suriname",
  sweden: "Sweden",
  switzerland: "Switzerland",
  syria: "Syria",

  taiwan: "Taiwan",
  tajikistan: "Tajikistan",
  tanzania: "Tanzania",
  thailand: "Thailand",
  "timor leste": "Timor-Leste",
  togo: "Togo",
  tonga: "Tonga",
  "trinidad and tobago": "Trinidad and Tobago",
  tunisia: "Tunisia",
  turkey: "Türkiye",
  turkmenistan: "Turkmenistan",
  tuvalu: "Tuvalu",

  uganda: "Uganda",
  ukraine: "Ukraine",
  "united arab emirates": "United Arab Emirates",
  "united kingdom": "United Kingdom",
  "united states": "United States",
  usa: "United States",
  uruguay: "Uruguay",
  uzbekistan: "Uzbekistan",

  vanuatu: "Vanuatu",
  "vatican city": "Vatican City",
  venezuela: "Venezuela",
  vietnam: "Vietnam",

  yemen: "Yemen",

  zambia: "Zambia",
  zimbabwe: "Zimbabwe",

  tz: "Tanzania",
  ke: "Kenya",
  ug: "Uganda",
  rw: "Rwanda",
  uk: "United Kingdom",
  us: "United States"
};

function normalizeCountry(country) {
  if (!country) {
    return "International";
  }

  const value = String(country)
    .trim()
    .toLowerCase();

  if (COUNTRY_MAP[value]) {
    return COUNTRY_MAP[value];
  }

  return String(country).trim();
}

// ============================================================
// DETECT COUNTRY
// ============================================================

function detectCountry(text) {
  if (!text) {
    return "International";
  }

  const value = String(text).toLowerCase();

  for (const [key, country] of Object.entries(
    COUNTRY_MAP
  )) {
    const regex = new RegExp(
      `(^|[^a-z])${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`,
      "i"
    );

    if (regex.test(value)) {
      return country;
    }
  }

  return "International";
}

// ============================================================
// CATEGORY
// ============================================================

function normalizeCategory(category) {
  if (!category) {
    return "Opportunity";
  }

  const value = String(category).toLowerCase();

  if (
    value.includes("scholar") ||
    value.includes("fellowship") ||
    value.includes("education") ||
    value.includes("study") ||
    value.includes("student")
  ) {
    return "Education";
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
    value.includes("employment") ||
    value.includes("vacancy")
  ) {
    return "Work";
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
    value.includes("summit") ||
    value.includes("meeting")
  ) {
    return "Event";
  }

  if (
    value.includes("news") ||
    value.includes("announcement")
  ) {
    return "News";
  }

  if (
    value.includes("competition") ||
    value.includes("contest")
  ) {
    return "Competition";
  }

  return String(category).trim();
}

// ============================================================
// ID
// ============================================================

function makeID(title, url) {
  return `${title}|${url}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 180);
}

// ============================================================
// DESCRIPTION BUILDER
// ============================================================

function buildDescription(data) {
  const parts = [];

  if (data.description) {
    parts.push(cleanText(data.description));
  }

  if (data.about) {
    parts.push(
      "About: " + cleanText(data.about)
    );
  }

  if (data.details) {
    parts.push(
      "Details: " + cleanText(data.details)
    );
  }

  if (data.eligibility) {
    parts.push(
      "Eligibility: " +
        cleanText(data.eligibility)
    );
  }

  if (data.benefits) {
    parts.push(
      "Benefits: " +
        cleanText(data.benefits)
    );
  }

  if (data.requirements) {
    parts.push(
      "Requirements: " +
        cleanText(data.requirements)
    );
  }

  if (data.applicationInstructions) {
    parts.push(
      "Application: " +
        cleanText(data.applicationInstructions)
    );
  }

  return limitText(
    parts.join("\n\n") ||
      "No detailed description available.",
    12000
  );
}

// ============================================================
// SAVE OPPORTUNITY
// ============================================================

async function saveOpportunity(data) {
  try {
    const title = cleanText(data.title);
    const url = cleanURL(data.url);

    if (!title) {
      console.log(
        "⚠️ Skipped item: missing title"
      );
      return false;
    }

    if (!url) {
      console.log(
        "⚠️ Skipped:",
        title,
        "— invalid URL"
      );
      return false;
    }

    const category =
      normalizeCategory(data.category);

    const country =
      normalizeCountry(data.country);

    const countries = Array.isArray(
      data.countries
    )
      ? data.countries
          .map(normalizeCountry)
          .filter(Boolean)
      : [country];

    const id = makeID(title, url);

    const opportunity = {
      id,

      title,

      category,

      country,

      countries,

      description:
        buildDescription(data),

      about:
        limitText(
          data.about ||
            data.description ||
            "",
          10000
        ),

      eligibility:
        limitText(
          data.eligibility || "",
          6000
        ),

      benefits:
        limitText(
          data.benefits || "",
          6000
        ),

      requirements:
        limitText(
          data.requirements || "",
          6000
        ),

      applicationInstructions:
        limitText(
          data.applicationInstructions ||
            "",
          6000
        ),

      organization:
        cleanText(
          data.organization ||
            data.source ||
            ""
        ),

      source:
        cleanText(
          data.source || "Unknown"
        ),

      sourceUrl: url,

      detailsUrl:
        cleanURL(data.detailsUrl) ||
        url,

      applyUrl:
        cleanURL(data.applyUrl) ||
        url,

      playUrl:
        cleanURL(data.playUrl) ||
        url,

      image:
        cleanURL(data.image),

      deadline:
        data.deadline || "",

      publishedAt:
        data.publishedAt ||
        Date.now(),

      createdAt:
        data.createdAt ||
        Date.now(),

      updatedAt:
        Date.now(),

      active: true,

      views:
        Number(data.views || 0),

      shares:
        Number(data.shares || 0)
    };

    const ref =
      db.ref("opportunities").child(id);

    const existing =
      await ref.once("value");

    if (existing.exists()) {
      const old = existing.val() || {};

      await ref.update({
        ...opportunity,

        createdAt:
          old.createdAt ||
          opportunity.createdAt,

        views:
          Number(old.views || 0),

        shares:
          Number(old.shares || 0)
      });

      console.log(
        "🔄 UPDATED:",
        title
      );

      return false;
    }

    await ref.set(opportunity);

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
      "Country:",
      country
    );
    console.log(
      "Source:",
      opportunity.source
    );
    console.log(
      "URL:",
      url
    );

    return true;
  } catch (error) {
    console.error(
      "❌ SAVE ERROR:",
      error.message
    );

    return false;
  }
}

// ============================================================
// GRANTS.GOV
// ============================================================

async function checkGrantsGov() {
  console.log(
    "🇺🇸 Checking Grants.gov..."
  );

  try {
    const data =
      await fetchJSON(
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

    const opportunities =
      data?.oppHits ||
      data?.data?.oppHits ||
      [];

    console.log(
      "📦 Grants.gov:",
      opportunities.length
    );

    let count = 0;

    for (
      const item of opportunities
    ) {
      const title =
        item.oppTitle ||
        item.title ||
        "Untitled Grant";

      const id =
        item.id ||
        item.oppId ||
        item.opportunityId;

      if (!id) continue;

      const url =
        `https://www.grants.gov/search-results-detail/${id}`;

      if (!validURL(url)) {
        continue;
      }

      const detected =
        detectCountry(
          `${item.agencyName || ""} ${
            item.oppTitle || ""
          }`
        );

      const country =
        detected === "International"
          ? "United States"
          : detected;

      const saved =
        await saveOpportunity({
          title,

          description:
            item.description ||
            item.oppNumber ||
            "Grant opportunity available through Grants.gov.",

          category: "Grant",

          country,

          organization:
            item.agencyName ||
            "Grants.gov",

          source:
            "Grants.gov",

          url,

          sourceUrl: url,

          detailsUrl: url,

          applyUrl: url,

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
    console.error(
      "❌ Grants.gov ERROR:",
      error.message
    );

    return 0;
  }
}

// ============================================================
// REMOTIVE
// ============================================================

async function checkRemotive() {
  console.log(
    "🌍 Checking Remotive Global Jobs..."
  );

  try {
    const data =
      await fetchJSON(
        "https://remotive.com/api/remote-jobs"
      );

    const jobs =
      data?.jobs || [];

    console.log(
      "📦 Remotive:",
      jobs.length
    );

    let count = 0;

    for (
      const job of jobs.slice(0, 50)
    ) {
      const url =
        cleanURL(job.url);

      if (!url) continue;

      const locationText =
        job.candidate_required_location ||
        "";

      const country =
        detectCountry(
          locationText
        );

      const description =
        cleanText(
          job.description ||
          "Remote job opportunity."
        );

      const saved =
        await saveOpportunity({
          title:
            job.title,

          description,

          about:
            description,

          category:
            "Work",

          country,

          countries:
            country === "International"
              ? ["International"]
              : [country],

          organization:
            job.company_name ||
            "Remotive",

          source:
            "Remotive",

          url,

          sourceUrl: url,

          detailsUrl: url,

          applyUrl: url,

          playUrl: url,

          image:
            cleanURL(
              job.company_logo
            ),

          publishedAt:
            job.publication_date ||
            Date.now()
        });

      if (saved) count++;
    }

    return count;
  } catch (error) {
    console.error(
      "❌ Remotive ERROR:",
      error.message
    );

    return 0;
  }
}

// ============================================================
// INTERNATIONAL OFFICIAL SOURCES
// ============================================================

async function checkInternationalSources() {
  console.log(
    "🌐 Checking International Sources..."
  );

  const sources = [
    {
      name: "UN Careers",
      category: "Work",
      country: "International",
      url: "https://careers.un.org/"
    },

    {
      name: "World Bank Careers",
      category: "Work",
      country: "International",
      url:
        "https://www.worldbank.org/en/about/careers"
    },

    {
      name: "UNICEF Careers",
      category: "Work",
      country: "International",
      url:
        "https://jobs.unicef.org/"
    },

    {
      name: "WHO Careers",
      category: "Work",
      country: "International",
      url:
        "https://www.who.int/careers"
    },

    {
      name: "African Union Careers",
      category: "Work",
      country: "International",
      url:
        "https://au.int/en/careers"
    }
  ];

  let total = 0;

  for (
    const source of sources
  ) {
    try {
      const saved =
        await saveOpportunity({
          title:
            `${source.name} — Opportunities`,

          description:
            `Official ${source.name} page where users can view current opportunities, vacancies, programmes and announcements.`,

          about:
            `This is an official ${source.name} source.`,

          category:
            source.category,

          country:
            source.country,

          countries:
            ["International"],

          organization:
            source.name,

          source:
            source.name,

          url:
            source.url,

          sourceUrl:
            source.url,

          detailsUrl:
            source.url,

          applyUrl:
            source.url,

          playUrl:
            source.url,

          publishedAt:
            Date.now()
        });

      if (saved) total++;
    } catch (error) {
      console.error(
        `❌ ${source.name}:`,
        error.message
      );
    }
  }

  console.log(
    "📦 International sources:",
    total
  );

  return total;
}

// ============================================================
// HESLB TANZANIA
// ============================================================

async function checkHESLB() {
  console.log(
    "🌍 Checking HESLB..."
  );

  const opportunities = [
    {
      title:
        "HESLB Online Application",

      description:
        "Official HESLB information and online application resources for higher education financing in Tanzania.",

      category:
        "Education",

      url:
        "https://www.heslb.go.tz/"
    },

    {
      title:
        "HESLB Scholarships and Loans",

      description:
        "Official HESLB information about scholarships, student loans and higher education financing.",

      category:
        "Education",

      url:
        "https://www.heslb.go.tz/"
    },

    {
      title:
        "HESLB Loan Issuance",

      description:
        "Official HESLB information about loan issuance and student financing.",

      category:
        "Education",

      url:
        "https://www.heslb.go.tz/"
    },

    {
      title:
        "HESLB Loan Repayment",

      description:
        "Official information about HESLB loan repayment procedures.",

      category:
        "Education",

      url:
        "https://www.heslb.go.tz/"
    },

    {
      title:
        "HESLB Application Guidelines",

      description:
        "Official HESLB application guidelines and announcements.",

      category:
        "Education",

      url:
        "https://www.heslb.go.tz/"
    }
  ];

  let count = 0;

  for (
    const item of opportunities
  ) {
    const saved =
      await saveOpportunity({
        title:
          item.title,

        description:
          item.description,

        about:
          item.description,

        category:
          item.category,

        country:
          "Tanzania",

        countries:
          ["Tanzania"],

        organization:
          "HESLB",

        source:
          "HESLB Tanzania",

        url:
          item.url,

        sourceUrl:
          item.url,

        detailsUrl:
          item.url,

        applyUrl:
          item.url,

        playUrl:
          item.url
      });

    if (saved) count++;
  }

  console.log(
    "📦 HESLB processed:",
    count
  );

  return count;
}

// ============================================================
// AJIRA / PSRS
// ============================================================

async function checkAjira() {
  console.log(
    "🌍 Checking Ajira / PSRS..."
  );

  const officialURL =
    "https://www.ajira.go.tz/";

  const opportunities = [
    {
      title:
        "Ajira Portal — Tanzania Public Service Jobs",

      description:
        "Official Tanzania public service recruitment information and job vacancy resources.",

      url:
        officialURL
    },

    {
      title:
        "Public Service Recruitment Secretariat — Jobs",

      description:
        "Official public service recruitment information from Tanzania.",

      url:
        officialURL
    }
  ];

  let count = 0;

  for (
    const item of opportunities
  ) {
    const saved =
      await saveOpportunity({
        title:
          item.title,

        description:
          item.description,

        about:
          item.description,

        category:
          "Work",

        country:
          "Tanzania",

        countries:
          ["Tanzania"],

        organization:
          "Ajira / PSRS",

        source:
          "Ajira / PSRS",

        url:
          item.url,

        sourceUrl:
          item.url,

        detailsUrl:
          item.url,

        applyUrl:
          item.url,

        playUrl:
          item.url
      });

    if (saved) count++;
  }

  console.log(
    "📦 Ajira / PSRS processed:",
    count
  );

  return count;
}

// ============================================================
// GLOBAL NEWS AND EVENTS
// ============================================================

async function checkGlobalEvents() {
  console.log(
    "📰 Checking Global News & Events..."
  );

  const events = [
    {
      title:
        "United Nations — Global Events",

      description:
        "Official United Nations events, meetings, announcements and international activities.",

      category:
        "Event",

      country:
        "International",

      url:
        "https://www.un.org/en/events"
    },

    {
      title:
        "World Health Organization — News",

      description:
        "Official WHO news, announcements and global health information.",

      category:
        "News",

      country:
        "International",

      url:
        "https://www.who.int/news"
    },

    {
      title:
        "World Bank — News",

      description:
        "Official World Bank news, development updates and announcements.",

      category:
        "News",

      country:
        "International",

      url:
        "https://www.worldbank.org/en/news"
    },

    {
      title:
        "African Union — News & Events",

      description:
        "Official African Union news, events and continental announcements.",

      category:
        "News",

      country:
        "International",

      url:
        "https://au.int/en/news"
    }
  ];

  let count = 0;

  for (
    const event of events
  ) {
    const saved =
      await saveOpportunity({
        title:
          event.title,

        description:
          event.description,

        about:
          event.description,

        category:
          event.category,

        country:
          event.country,

        countries:
          ["International"],

        organization:
          event.title,

        source:
          "Official Global Source",

        url:
          event.url,

        sourceUrl:
          event.url,

        detailsUrl:
          event.url,

        applyUrl:
          event.url,

        playUrl:
          event.url
      });

    if (saved) count++;
  }

  console.log(
    "📦 Global news/events:",
    count
  );

  return count;
}

// ============================================================
// REMOVE EXPIRED
// ============================================================

async function removeExpired() {
  console.log(
    "🧹 Checking expired opportunities..."
  );

  try {
    const snap =
      await db
        .ref("opportunities")
        .once("value");

    if (!snap.exists()) {
      console.log(
        "🧹 Nothing to clean."
      );
      return;
    }

    const updates = {};
    const now = Date.now();

    snap.forEach(child => {
      const item =
        child.val();

      if (!item) return;

      if (!item.deadline) return;

      const deadline =
        new Date(
          item.deadline
        ).getTime();

      if (
        !isNaN(deadline) &&
        deadline < now
      ) {
        updates[
          child.key
        ] = null;

        console.log(
          "🗑️ Removing expired:",
          item.title
        );
      }
    });

    const keys =
      Object.keys(updates);

    if (keys.length) {
      await db
        .ref("opportunities")
        .update(updates);

      console.log(
        "🧹 Removed",
        keys.length,
        "expired opportunities."
      );
    } else {
      console.log(
        "🧹 Removed 0 expired opportunities."
      );
    }
  } catch (error) {
    console.error(
      "❌ Expiry cleanup error:",
      error.message
    );
  }
}

// ============================================================
// NORMALIZE DATABASE
// ============================================================

async function normalizeExistingCountries() {
  console.log(
    "🌍 Normalizing countries..."
  );

  try {
    const snap =
      await db
        .ref("opportunities")
        .once("value");

    if (!snap.exists()) {
      console.log(
        "No opportunities found."
      );
      return;
    }

    const updates = {};

    snap.forEach(child => {
      const item =
        child.val();

      if (!item) return;

      const country =
        normalizeCountry(
          item.country
        );

      let countries;

      if (
        Array.isArray(
          item.countries
        )
      ) {
        countries =
          item.countries
            .map(normalizeCountry)
            .filter(Boolean);
      } else {
        countries =
          [country];
      }

      if (!countries.length) {
        countries =
          [country];
      }

      updates[
        `${child.key}/country`
      ] = country;

      updates[
        `${child.key}/countries`
      ] = countries;

      if (!item.category) {
        updates[
          `${child.key}/category`
        ] = "Opportunity";
      }

      if (!item.sourceUrl) {
        if (validURL(item.url)) {
          updates[
            `${child.key}/sourceUrl`
          ] = item.url;
        }
      }

      if (!item.detailsUrl) {
        if (validURL(item.url)) {
          updates[
            `${child.key}/detailsUrl`
          ] = item.url;
        }
      }

      if (!item.applyUrl) {
        if (validURL(item.url)) {
          updates[
            `${child.key}/applyUrl`
          ] = item.url;
        }
      }

      if (!item.playUrl) {
        if (validURL(item.url)) {
          updates[
            `${child.key}/playUrl`
          ] = item.url;
        }
      }
    });

    if (
      Object.keys(updates).length
    ) {
      await db
        .ref("opportunities")
        .update(updates);
    }

    console.log(
      "✅ Country normalization complete"
    );
  } catch (error) {
    console.error(
      "❌ Normalization error:",
      error.message
    );
  }
}

// ============================================================
// REMOVE INVALID URL
// ============================================================

async function removeInvalidURLs() {
  console.log(
    "🔗 Checking opportunity URLs..."
  );

  try {
    const snap =
      await db
        .ref("opportunities")
        .once("value");

    if (!snap.exists()) {
      return;
    }

    const updates = {};

    snap.forEach(child => {
      const item =
        child.val();

      if (!item) return;

      const url =
        item.sourceUrl ||
        item.url ||
        "";

      if (!validURL(url)) {
        console.log(
          "🗑️ Removing invalid URL:",
          item.title
        );

        updates[
          child.key
        ] = null;
      }
    });

    if (
      Object.keys(updates).length
    ) {
      await db
        .ref("opportunities")
        .update(updates);
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
  console.log(
    "=========================================="
  );
  console.log(
    "🤖 MAKYAMA GLOBAL OPPORTUNITIES BOT V8"
  );
  console.log(
    "=========================================="
  );

  console.log(
    "Time:",
    new Date().toISOString()
  );

  console.log("");

  await removeExpired();

  await removeInvalidURLs();

  let totalNew = 0;

  // GLOBAL
  totalNew +=
    await checkGrantsGov();

  totalNew +=
    await checkRemotive();

  totalNew +=
    await checkInternationalSources();

  totalNew +=
    await checkGlobalEvents();

  // TANZANIA
  totalNew +=
    await checkHESLB();

  totalNew +=
    await checkAjira();

  // NORMALIZATION
  await normalizeExistingCountries();

  console.log("");

  console.log(
    "=========================================="
  );

  console.log(
    "🎉 BOT FINISHED SUCCESSFULLY"
  );

  console.log(
    "New items:",
    totalNew
  );

  console.log(
    "=========================================="
  );

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
