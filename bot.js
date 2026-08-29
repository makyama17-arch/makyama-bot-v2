// ============================================================
// MAKYAMA GLOBAL OPPORTUNITIES BOT V8
// ============================================================
// GLOBAL:
// - Work Opportunities
// - Jobs
// - Scholarships
// - Grants
// - Internships
// - Events
// - Global News / Announcements
//
// IMPORTANT:
// - Grants.gov: POSTED ONLY
// - Expired opportunities removed
// - Official publication date preserved
// - Every opportunity MUST have a valid URL
// - Latest published opportunities first
// ============================================================

const express = require("express");
const admin = require("firebase-admin");

const app = express();

const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: "2mb" }));

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
  console.error(
    "❌ Invalid FIREBASE_SERVICE_ACCOUNT JSON"
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

// ============================================================
// CONSTANTS
// ============================================================

const CHECK_INTERVAL =
  30 * 60 * 1000;

const USER_AGENT =
  "MAKYAMA-Global-Opportunities-Bot/8.0 (+https://makyama.vercel.app)";

const MAX_REMOTIVE_JOBS = 100;

const MAX_GRANTS = 100;

// ============================================================
// HEALTH
// ============================================================

app.get("/", (req, res) => {
  res.json({
    status: "online",
    name: "MAKYAMA Global Opportunities Bot",
    version: "8.0.0",
    mode: "GLOBAL",
    language: "English",
    message: "Bot is running successfully"
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "MAKYAMA BOT",
    version: "8.0.0",
    time: new Date().toISOString()
  });
});

// ============================================================
// API: OPPORTUNITIES
// ============================================================

app.get("/api/opportunities", async (req, res) => {
  try {
    const snap =
      await db.ref("opportunities").once("value");

    const data = [];

    snap.forEach(child => {
      const item = child.val();

      if (!item) return;

      if (item.active === false) return;

      if (!validURL(item.url)) return;

      data.push(item);
    });

    data.sort(
      (a, b) =>
        Number(b.publishedAt || 0) -
        Number(a.publishedAt || 0)
    );

    res.json({
      ok: true,
      count: data.length,
      opportunities: data
    });

  } catch (error) {

    console.error(
      "❌ API opportunities error:",
      error.message
    );

    res.status(500).json({
      ok: false,
      error: "Failed to load opportunities"
    });
  }
});

// ============================================================
// API: SINGLE OPPORTUNITY
// ============================================================

app.get("/api/opportunities/:id", async (req, res) => {
  try {

    const id = req.params.id;

    const snap =
      await db
        .ref("opportunities")
        .child(id)
        .once("value");

    if (!snap.exists()) {
      return res.status(404).json({
        ok: false,
        error: "Opportunity not found"
      });
    }

    const item = snap.val();

    if (
      !item ||
      item.active === false ||
      !validURL(item.url)
    ) {
      return res.status(404).json({
        ok: false,
        error: "Opportunity unavailable"
      });
    }

    await db
      .ref(`opportunities/${id}/views`)
      .transaction(value =>
        Number(value || 0) + 1
      );

    item.views =
      Number(item.views || 0) + 1;

    res.json({
      ok: true,
      opportunity: item
    });

  } catch (error) {

    console.error(
      "❌ Single opportunity error:",
      error.message
    );

    res.status(500).json({
      ok: false,
      error: "Failed to load opportunity"
    });
  }
});

// ============================================================
// API: ADS
// ============================================================

app.get("/api/ads", async (req, res) => {

  try {

    const snap =
      await db.ref("ads").once("value");

    const ads = [];

    snap.forEach(child => {

      const ad = child.val();

      if (!ad) return;

      if (ad.active === false) return;

      ads.push({
        id: child.key,
        ...ad
      });
    });

    ads.sort(
      (a, b) =>
        Number(b.createdAt || 0) -
        Number(a.createdAt || 0)
    );

    res.json({
      ok: true,
      ads
    });

  } catch (error) {

    console.error(
      "❌ Ads API error:",
      error.message
    );

    res.status(500).json({
      ok: false,
      error: "Failed to load ads"
    });
  }
});

// ============================================================
// SERVER
// ============================================================

app.listen(PORT, () => {

  console.log("");
  console.log("==========================================");
  console.log("🚀 MAKYAMA GLOBAL OPPORTUNITIES BOT V8");
  console.log("==========================================");
  console.log("Port:", PORT);
  console.log("Interval: 30 minutes");
  console.log("Default language: English");
  console.log("Mode: GLOBAL");
  console.log("Grants.gov: POSTED ONLY");
  console.log("Expired cleanup: ENABLED");
  console.log("Official dates: ENABLED");
  console.log("==========================================");
  console.log("");

});

// ============================================================
// FETCH JSON
// ============================================================

async function fetchJSON(url, options = {}) {

  const response =
    await fetch(url, {

      ...options,

      headers: {

        "User-Agent":
          USER_AGENT,

        Accept:
          "application/json,text/plain,*/*",

        ...(options.headers || {})
      }
    });

  if (!response.ok) {

    throw new Error(
      `HTTP ${response.status} ${response.statusText}`
    );
  }

  return await response.json();
}

// ============================================================
// FETCH TEXT
// ============================================================

async function fetchText(url, options = {}) {

  const response =
    await fetch(url, {

      ...options,

      headers: {

        "User-Agent":
          USER_AGENT,

        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

        ...(options.headers || {})
      }
    });

  if (!response.ok) {

    throw new Error(
      `HTTP ${response.status} ${response.statusText}`
    );
  }

  return await response.text();
}

// ============================================================
// URL VALIDATION
// ============================================================

function validURL(value) {

  if (
    !value ||
    typeof value !== "string"
  ) {
    return false;
  }

  try {

    const url =
      new URL(value.trim());

    return (
      (
        url.protocol === "http:" ||
        url.protocol === "https:"
      ) &&
      !!url.hostname
    );

  } catch {

    return false;
  }
}

function cleanURL(value) {

  if (
    !value ||
    typeof value !== "string"
  ) {
    return "";
  }

  const url =
    value.trim();

  return validURL(url)
    ? url
    : "";
}

// ============================================================
// DATE PARSER
// ============================================================

function parseOfficialDate(value) {

  if (!value) return null;

  if (value instanceof Date) {

    const time =
      value.getTime();

    return isNaN(time)
      ? null
      : time;
  }

  const text =
    String(value).trim();

  if (!text) return null;

  // YYYY-MM-DD

  if (
    /^\d{4}-\d{2}-\d{2}$/
      .test(text)
  ) {

    const date =
      new Date(
        `${text}T00:00:00Z`
      );

    const time =
      date.getTime();

    return isNaN(time)
      ? null
      : time;
  }

  // MM/DD/YYYY

  if (
    /^\d{1,2}\/\d{1,2}\/\d{4}$/
      .test(text)
  ) {

    const parts =
      text.split("/")
        .map(Number);

    const month = parts[0];
    const day = parts[1];
    const year = parts[2];

    const date =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day
        )
      );

    const time =
      date.getTime();

    return isNaN(time)
      ? null
      : time;
  }

  const parsed =
    Date.parse(text);

  return isNaN(parsed)
    ? null
    : parsed;
}

// ============================================================
// FORMAT DESCRIPTION
// ============================================================

function cleanDescription(value) {

  if (!value) {
    return "";
  }

  let text =
    String(value);

  // Remove script/style

  text =
    text.replace(
      /<script[\s\S]*?<\/script>/gi,
      " "
    );

  text =
    text.replace(
      /<style[\s\S]*?<\/style>/gi,
      " "
    );

  // Convert common HTML elements

  text =
    text.replace(
      /<br\s*\/?>/gi,
      "\n"
    );

  text =
    text.replace(
      /<\/p>/gi,
      "\n\n"
    );

  text =
    text.replace(
      /<\/div>/gi,
      "\n"
    );

  // Remove HTML

  text =
    text.replace(
      /<[^>]+>/g,
      " "
    );

  // Decode some HTML entities

  text =
    text
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">");

  // Normalize whitespace

  text =
    text.replace(
      /[ \t]+/g,
      " "
    );

  text =
    text.replace(
      /\n\s*\n\s*\n+/g,
      "\n\n"
    );

  return text.trim();
}

// ============================================================
// COUNTRY MAP
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
  "costa rica": "Costa Rica",
  croatia: "Croatia",
  cuba: "Cuba",
  cyprus: "Cyprus",
  "czech republic": "Czechia",

  denmark: "Denmark",
  djibouti: "Djibouti",
  dominica: "Dominica",
  "dominican republic":
    "Dominican Republic",

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
  "saudi arabia": "Saudi Arabia",
  senegal: "Senegal",
  serbia: "Serbia",
  seychelles: "Seychelles",
  "sierra leone": "Sierra Leone",
  singapore: "Singapore",
  slovakia: "Slovakia",
  slovenia: "Slovenia",
  "solomon islands":
    "Solomon Islands",
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
  togo: "Togo",
  tonga: "Tonga",
  tunisia: "Tunisia",
  turkey: "Türkiye",
  turkmenistan: "Turkmenistan",
  tuvalu: "Tuvalu",

  uganda: "Uganda",
  ukraine: "Ukraine",
  "united arab emirates":
    "United Arab Emirates",
  "united kingdom":
    "United Kingdom",
  "united states":
    "United States",
  uruguay: "Uruguay",
  uzbekistan: "Uzbekistan",

  vanuatu: "Vanuatu",
  venezuela: "Venezuela",
  vietnam: "Vietnam",

  yemen: "Yemen",

  zambia: "Zambia",
  zimbabwe: "Zimbabwe",

  // Common abbreviations

  usa: "United States",
  us: "United States",

  uk: "United Kingdom",

  tz: "Tanzania",

  ke: "Kenya",

  ug: "Uganda",

  rw: "Rwanda"
};

// ============================================================
// COUNTRY NORMALIZATION
// ============================================================

function normalizeCountry(country) {

  if (!country) {
    return "International";
  }

  const value =
    String(country).trim();

  const key =
    value.toLowerCase();

  return (
    COUNTRY_MAP[key] ||
    value
  );
}

// ============================================================
// DETECT COUNTRY
// ============================================================

function detectCountry(text) {

  if (!text) {
    return "International";
  }

  const value =
    String(text).toLowerCase();

  for (
    const [key, country]
    of Object.entries(COUNTRY_MAP)
  ) {

    const escaped =
      key.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

    const regex =
      new RegExp(
        `(^|[^a-z])${escaped}([^a-z]|$)`,
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

  const value =
    String(category)
      .toLowerCase()
      .trim();

  if (
    value.includes("scholar") ||
    value.includes("fellowship") ||
    value.includes("education")
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
    value.includes("work opportunity")
  ) {
    return "Work Opportunities";
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

  return category;
}

// ============================================================
// ID
// ============================================================

function makeID(title, url) {

  const text =
    `${title}|${url}`
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      )
      .slice(0, 180);

  return text;
}

// ============================================================
// SAVE OPPORTUNITY
// ============================================================

async function saveOpportunity(data) {

  try {

    const title =
      String(
        data.title || ""
      ).trim();

    const url =
      cleanURL(data.url);

    if (!title) {

      console.log(
        "⚠️ Skipped item: missing title"
      );

      return false;
    }

    if (!url) {

      console.log(
        "⚠️ Skipped item:",
        title
      );

      console.log(
        "Reason: missing/invalid URL"
      );

      return false;
    }

    const id =
      makeID(title, url);

    const publishedAt =
      parseOfficialDate(
        data.publishedAt
      ) || Date.now();

    const deadline =
      data.deadline || "";

    const opportunity = {

      id,

      title,

      description:
        cleanDescription(
          data.description
        ) ||
        "No detailed description available.",

      category:
        normalizeCategory(
          data.category
        ),

      country:
        normalizeCountry(
          data.country
        ),

      countries:
        Array.isArray(data.countries)
          ? [
              ...new Set(
                data.countries
                  .map(normalizeCountry)
              )
            ]
          : [
              normalizeCountry(
                data.country
              )
            ],

      source:
        String(
          data.source ||
          "Unknown"
        ).trim(),

      url,

      applyUrl:
        cleanURL(
          data.applyUrl
        ) || url,

      detailsUrl:
        cleanURL(
          data.detailsUrl
        ) || url,

      playUrl:
        cleanURL(
          data.playUrl
        ) || url,

      image:
        cleanURL(
          data.image
        ),

      deadline,

      publishedAt,

      publishedDate:
        new Date(
          publishedAt
        ).toISOString(),

      createdAt:
        data.createdAt ||
        Date.now(),

      updatedAt:
        Date.now(),

      active: true,

      sourceStatus:
        data.sourceStatus ||
        "active",

      views:
        Number(
          data.views || 0
        ),

      shares:
        Number(
          data.shares || 0
        )
    };

    const ref =
      db
        .ref("opportunities")
        .child(id);

    const existing =
      await ref.once("value");

    if (existing.exists()) {

      const old =
        existing.val() || {};

      await ref.update({

        ...opportunity,

        createdAt:
          old.createdAt ||
          opportunity.createdAt,

        views:
          Number(
            old.views || 0
          ),

        shares:
          Number(
            old.shares || 0
          )
      });

      console.log(
        "🔄 UPDATED:",
        title
      );

      console.log(
        "   Category:",
        opportunity.category
      );

      console.log(
        "   Country:",
        opportunity.country
      );

      console.log(
        "   Published:",
        opportunity.publishedDate
      );

      console.log(
        "   Source:",
        opportunity.source
      );

      return false;
    }

    await ref.set(
      opportunity
    );

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
      opportunity.category
    );

    console.log(
      "Country:",
      opportunity.country
    );

    console.log(
      "Published:",
      opportunity.publishedDate
    );

    console.log(
      "Source:",
      opportunity.source
    );

    console.log(
      "URL:",
      opportunity.url
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
// ONLY POSTED + NOT EXPIRED
// ============================================================

async function checkGrantsGov() {

  console.log(
    "💰 Checking Grants.gov ACTIVE opportunities..."
  );

  try {

    const apiURL =
      "https://api.grants.gov/v1/api/search2";

    const body = {

      rows:
        MAX_GRANTS,

      startRecordNum:
        0,

      keyword:
        "",

      // VERY IMPORTANT
      // DO NOT FETCH CLOSED/ARCHIVED
      oppStatuses:
        "posted"
    };

    const data =
      await fetchJSON(
        apiURL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(body)
        }
      );

    const opportunities =
      data?.oppHits ||
      data?.data?.oppHits ||
      [];

    console.log(
      "📦 Grants.gov POSTED:",
      opportunities.length
    );

    let count = 0;

    const now =
      Date.now();

    // IDs currently active
    const activeGrantIds =
      new Set();

    for (
      const item
      of opportunities
    ) {

      const title =
        item.oppTitle ||
        item.title ||
        item.opportunityTitle ||
        "Untitled Grant";

      const id =
        item.id ||
        item.oppId ||
        item.opportunityId;

      if (!id) {

        console.log(
          "⚠️ Skipped grant without ID:",
          title
        );

        continue;
      }

      activeGrantIds.add(
        String(id)
      );

      const url =
        `https://www.grants.gov/search-results-detail/${id}`;

      if (!validURL(url)) {
        continue;
      }

      // --------------------------------------------------------
      // STATUS
      // --------------------------------------------------------

      const status =
        String(
          item.oppStatus ||
          item.status ||
          "posted"
        )
        .toLowerCase()
        .trim();

      if (status !== "posted") {

        console.log(
          "⏭️ Skipped non-posted:",
          title,
          "|",
          status
        );

        continue;
      }

      // --------------------------------------------------------
      // DATES
      // --------------------------------------------------------

      const openDate =
        item.openDate ||
        item.openDateString ||
        "";

      const closeDate =
        item.closeDate ||
        item.closeDateString ||
        "";

      const officialPublished =
        parseOfficialDate(
          openDate
        );

      const officialDeadline =
        parseOfficialDate(
          closeDate
        );

      // --------------------------------------------------------
      // EXPIRED
      // --------------------------------------------------------

      if (
        officialDeadline &&
        officialDeadline < now
      ) {

        console.log(
          "⏭️ EXPIRED:",
          title,
          "| Deadline:",
          closeDate
        );

        continue;
      }

      // --------------------------------------------------------
      // COUNTRY
      // --------------------------------------------------------

      const detected =
        detectCountry(
          `${item.agencyName || ""} ${title}`
        );

      const country =
        detected === "International"
          ? "United States"
          : detected;

      // --------------------------------------------------------
      // DESCRIPTION
      // --------------------------------------------------------

      const description =
        item.description ||
        item.oppDescription ||
        item.synopsis ||
        item.oppSynopsis ||
        `Official grant opportunity published by ${
          item.agencyName ||
          "the U.S. Government"
        }.`;

      // --------------------------------------------------------
      // PUBLISHED DATE
      //
      // DO NOT USE Date.now() IF SOURCE DATE EXISTS
      // --------------------------------------------------------

      const publishedAt =
        officialPublished ||
        parseOfficialDate(
          item.postingDate
        ) ||
        parseOfficialDate(
          item.publishDate
        );

      if (!publishedAt) {

        console.log(
          "⚠️ No official publication date:",
          title
        );

        // We still save it, but clearly
        // use current timestamp only as fallback.
      }

      const saved =
        await saveOpportunity({

          title,

          description,

          category:
            "Grant",

          country,

          countries:
            [country],

          source:
            "Grants.gov",

          url,

          applyUrl:
            url,

          detailsUrl:
            url,

          playUrl:
            url,

          deadline:
            closeDate,

          publishedAt:
            publishedAt ||
            Date.now(),

          sourceStatus:
            "posted"
        });

      if (saved) {
        count++;
      }
    }

    // --------------------------------------------------------
    // CLEAN OLD GRANTS.GOV RECORDS
    //
    // This removes old Grants.gov records that are no longer
    // in the current POSTED result set.
    // --------------------------------------------------------

    await cleanupOldGrants(
      activeGrantIds
    );

    console.log(
      "✅ Grants.gov active saved:",
      count
    );

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
// CLEAN OLD GRANTS
// ============================================================

async function cleanupOldGrants(
  activeGrantIds
) {

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

      if (
        item.source !==
        "Grants.gov"
      ) {
        return;
      }

      const url =
        String(
          item.url || ""
        );

      const match =
        url.match(
          /search-results-detail\/(\d+)/i
        );

      if (!match) {

        // If it is an old Grants.gov
        // record but we cannot identify
        // its official ID, remove it.

        console.log(
          "🗑️ Removing unidentified old Grants.gov record:",
          item.title
        );

        updates[
          child.key
        ] = null;

        return;
      }

      const grantId =
        String(match[1]);

      if (
        !activeGrantIds.has(
          grantId
        )
      ) {

        console.log(
          "🗑️ Removing no-longer-posted grant:",
          item.title
        );

        updates[
          child.key
        ] = null;
      }
    });

    if (
      Object.keys(updates)
        .length
    ) {

      await db
        .ref("opportunities")
        .update(updates);

      console.log(
        "🧹 Old Grants.gov removed:",
        Object.keys(updates).length
      );
    }

  } catch (error) {

    console.error(
      "❌ Grants cleanup error:",
      error.message
    );
  }
}

// ============================================================
// REMOTIVE
// ============================================================

async function checkRemotive() {

  console.log(
    "🌍 Checking Remotive Work Opportunities..."
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
      const job
      of jobs.slice(
        0,
        MAX_REMOTIVE_JOBS
      )
    ) {

      const url =
        cleanURL(
          job.url
        );

      if (!url) {
        continue;
      }

      // --------------------------------------------------------
      // OFFICIAL REMOTIVE PUBLICATION DATE
      // --------------------------------------------------------

      const publishedAt =
        parseOfficialDate(
          job.publication_date
        ) ||
        parseOfficialDate(
          job.publicationDate
        );

      // --------------------------------------------------------
      // COUNTRY
      // --------------------------------------------------------

      const locationText =
        [
          job.candidate_required_location,
          job.job_type,
          job.title,
          job.description
        ]
        .filter(Boolean)
        .join(" ");

      const country =
        detectCountry(
          locationText
        );

      // --------------------------------------------------------
      // DESCRIPTION
      // --------------------------------------------------------

      const description =
        cleanDescription(
          job.description
        ) ||
        "Remote work opportunity available through Remotive.";

      const saved =
        await saveOpportunity({

          title:
            job.title ||
            "Remote Work Opportunity",

          description,

          category:
            "Work Opportunities",

          country,

          countries:
            country === "International"
              ? ["International"]
              : [country],

          source:
            "Remotive",

          url,

          applyUrl:
            url,

          detailsUrl:
            url,

          playUrl:
            url,

          image:
            cleanURL(
              job.company_logo
            ),

          publishedAt:
            publishedAt ||
            Date.now(),

          sourceStatus:
            "active"
        });

      if (saved) {
        count++;
      }
    }

    console.log(
      "✅ Remotive saved:",
      count
    );

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
// INTERNATIONAL SOURCES
// ============================================================

async function checkInternationalSources() {

  console.log(
    "🌐 Checking International Opportunities..."
  );

  const sources = [

    {
      name:
        "UN Careers",

      title:
        "United Nations Careers",

      category:
        "Work Opportunities",

      description:
        "Official United Nations careers portal for international jobs and career opportunities.",

      url:
        "https://careers.un.org/"
    },

    {
      name:
        "World Bank Careers",

      title:
        "World Bank Careers",

      category:
        "Work Opportunities",

      description:
        "Official World Bank careers portal for international employment opportunities.",

      url:
        "https://www.worldbank.org/en/about/careers"
    },

    {
      name:
        "UNICEF Careers",

      title:
        "UNICEF Careers",

      category:
        "Work Opportunities",

      description:
        "Official UNICEF careers portal for jobs and professional opportunities.",

      url:
        "https://jobs.unicef.org/"
    },

    {
      name:
        "WHO Careers",

      title:
        "World Health Organization Careers",

      category:
        "Work Opportunities",

      description:
        "Official WHO careers portal for global employment opportunities.",

      url:
        "https://www.who.int/careers"
    },

    {
      name:
        "African Union Careers",

      title:
        "African Union Careers",

      category:
        "Work Opportunities",

      description:
        "Official African Union careers portal for continental employment opportunities.",

      url:
        "https://au.int/en/careers"
    }
  ];

  let total = 0;

  for (
    const source
    of sources
  ) {

    try {

      const saved =
        await saveOpportunity({

          title:
            source.title,

          description:
            source.description,

          category:
            source.category,

          country:
            "International",

          countries:
            ["International"],

          source:
            source.name,

          url:
            source.url,

          applyUrl:
            source.url,

          detailsUrl:
            source.url,

          playUrl:
            source.url,

          publishedAt:
            Date.now(),

          sourceStatus:
            "active"
        });

      if (saved) {
        total++;
      }

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
// HESLB
// ============================================================

async function checkHESLB() {

  console.log(
    "🇹🇿 Checking HESLB..."
  );

  const items = [

    {
      title:
        "HESLB Official Website",

      description:
        "Official Higher Education Students' Loans Board website. Check current loan application information, announcements and official updates.",

      url:
        "https://www.heslb.go.tz/"
    },

    {
      title:
        "HESLB Online Application Information",

      description:
        "Official HESLB information for students seeking higher education loans and related application announcements.",

      url:
        "https://www.heslb.go.tz/"
    }
  ];

  let count = 0;

  for (
    const item
    of items
  ) {

    const saved =
      await saveOpportunity({

        title:
          item.title,

        description:
          item.description,

        category:
          "Education",

        country:
          "Tanzania",

        source:
          "HESLB Tanzania",

        url:
          item.url,

        applyUrl:
          item.url,

        detailsUrl:
          item.url,

        playUrl:
          item.url,

        publishedAt:
          Date.now(),

        sourceStatus:
          "official"
      });

    if (saved) {
      count++;
    }
  }

  console.log(
    "📦 HESLB:",
    count
  );

  return count;
}

// ============================================================
// AJIRA / PSRS
// ============================================================

async function checkAjira() {

  console.log(
    "🇹🇿 Checking Ajira / PSRS..."
  );

  try {

    const officialURL =
      "https://www.ajira.go.tz/";

    const items = [

      {
        title:
          "Ajira Portal — Tanzania Public Service Jobs",

        description:
          "Official Tanzania public service recruitment portal. Check current government job vacancies and recruitment announcements.",

        url:
          officialURL
      },

      {
        title:
          "Public Service Recruitment Secretariat — Jobs",

        description:
          "Official Public Service Recruitment Secretariat information and recruitment announcements for Tanzania.",

        url:
          officialURL
      }
    ];

    let count = 0;

    for (
      const item
      of items
    ) {

      const saved =
        await saveOpportunity({

          title:
            item.title,

          description:
            item.description,

          category:
            "Work Opportunities",

          country:
            "Tanzania",

          source:
            "Ajira / PSRS",

          url:
            item.url,

          applyUrl:
            item.url,

          detailsUrl:
            item.url,

          playUrl:
            item.url,

          publishedAt:
            Date.now(),

          sourceStatus:
            "official"
        });

      if (saved) {
        count++;
      }
    }

    console.log(
      "📦 Ajira / PSRS:",
      count
    );

    return count;

  } catch (error) {

    console.error(
      "❌ Ajira ERROR:",
      error.message
    );

    return 0;
  }
}

// ============================================================
// GLOBAL EVENTS / NEWS
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

      url:
        "https://www.un.org/en/events"
    },

    {
      title:
        "World Health Organization — News",

      description:
        "Official WHO global health news, announcements and important updates.",

      category:
        "News",

      url:
        "https://www.who.int/news"
    },

    {
      title:
        "World Bank — News",

      description:
        "Official World Bank global development news, announcements and updates.",

      category:
        "News",

      url:
        "https://www.worldbank.org/en/news"
    },

    {
      title:
        "African Union — News",

      description:
        "Official African Union continental news, events and announcements.",

      category:
        "News",

      url:
        "https://au.int/en/news"
    }
  ];

  let count = 0;

  for (
    const event
    of events
  ) {

    const saved =
      await saveOpportunity({

        title:
          event.title,

        description:
          event.description,

        category:
          event.category,

        country:
          "International",

        source:
          "Official Global Source",

        url:
          event.url,

        detailsUrl:
          event.url,

        applyUrl:
          event.url,

        playUrl:
          event.url,

        publishedAt:
          Date.now(),

        sourceStatus:
          "official"
      });

    if (saved) {
      count++;
    }
  }

  console.log(
    "📦 Global News / Events:",
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

    const now =
      Date.now();

    snap.forEach(child => {

      const item =
        child.val();

      if (!item) return;

      if (!item.deadline) return;

      const deadline =
        parseOfficialDate(
          item.deadline
        );

      if (
        deadline &&
        deadline < now
      ) {

        console.log(
          "🗑️ Removing expired:",
          item.title
        );

        updates[
          child.key
        ] = null;
      }
    });

    if (
      Object.keys(updates)
        .length
    ) {

      await db
        .ref("opportunities")
        .update(updates);

      console.log(
        "🧹 Removed:",
        Object.keys(updates).length
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
// REMOVE INVALID URLS
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

      if (
        !validURL(item.url)
      ) {

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
      Object.keys(updates)
        .length
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
// REMOVE OLD GRANTS WITHOUT DEADLINE
// ============================================================

async function cleanupSuspiciousOldGrants() {

  console.log(
    "🧹 Checking suspicious old Grants.gov records..."
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

    const now =
      Date.now();

    snap.forEach(child => {

      const item =
        child.val();

      if (!item) return;

      if (
        item.source !==
        "Grants.gov"
      ) {
        return;
      }

      const published =
        parseOfficialDate(
          item.publishedAt
        );

      const deadline =
        parseOfficialDate(
          item.deadline
        );

      // If it has a deadline and
      // deadline is passed.

      if (
        deadline &&
        deadline < now
      ) {

        console.log(
          "🗑️ Old grant deadline passed:",
          item.title
        );

        updates[
          child.key
        ] = null;

        return;
      }

      // If an old Grants.gov record
      // has no deadline and was published
      // long ago, remove it.
      //
      // 180 days safety period.

      const days180 =
        180 *
        24 *
        60 *
        60 *
        1000;

      if (
        published &&
        now - published >
          days180 &&
        !deadline
      ) {

        console.log(
          "🗑️ Suspicious old grant:",
          item.title
        );

        updates[
          child.key
        ] = null;
      }
    });

    if (
      Object.keys(updates)
        .length
    ) {

      await db
        .ref("opportunities")
        .update(updates);

      console.log(
        "🧹 Suspicious grants removed:",
        Object.keys(updates).length
      );
    }

  } catch (error) {

    console.error(
      "❌ Old grants cleanup error:",
      error.message
    );
  }
}

// ============================================================
// NORMALIZE EXISTING DATA
// ============================================================

async function normalizeExistingData() {

  console.log(
    "🌍 Normalizing existing database..."
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
          [
            ...new Set(
              item.countries
                .map(
                  normalizeCountry
                )
            )
          ];

      } else {

        countries =
          [country];
      }

      updates[
        `${child.key}/country`
      ] =
        country;

      updates[
        `${child.key}/countries`
      ] =
        countries;

      updates[
        `${child.key}/category`
      ] =
        normalizeCategory(
          item.category
        );

      if (
        !validURL(
          item.url
        )
      ) {

        updates[
          `${child.key}/active`
        ] = false;
      }

      const publishedAt =
        parseOfficialDate(
          item.publishedAt
        );

      if (publishedAt) {

        updates[
          `${child.key}/publishedDate`
        ] =
          new Date(
            publishedAt
          ).toISOString();
      }
    });

    if (
      Object.keys(updates)
        .length
    ) {

      await db
        .ref("opportunities")
        .update(updates);
    }

    console.log(
      "✅ Existing data normalized."
    );

  } catch (error) {

    console.error(
      "❌ Normalization error:",
      error.message
    );
  }
}

// ============================================================
// CLEAN OLD DUPLICATE / BAD DATA
// ============================================================

async function cleanupBadData() {

  console.log(
    "🧹 Checking bad database records..."
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

      // Missing title

      if (
        !String(
          item.title || ""
        ).trim()
      ) {

        updates[
          child.key
        ] = null;

        return;
      }

      // Missing URL

      if (
        !validURL(
          item.url
        )
      ) {

        updates[
          child.key
        ] = null;

        return;
      }

      // Inactive

      if (
        item.active === false
      ) {

        updates[
          child.key
        ] = null;
      }
    });

    if (
      Object.keys(updates)
        .length
    ) {

      await db
        .ref("opportunities")
        .update(updates);

      console.log(
        "🧹 Bad records removed:",
        Object.keys(updates).length
      );
    }

  } catch (error) {

    console.error(
      "❌ Bad data cleanup error:",
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

  console.log(
    "Mode: GLOBAL"
  );

  console.log(
    "Language: English"
  );

  console.log(
    "Grants.gov: POSTED ONLY"
  );

  console.log("");

  // ----------------------------------------------------------
  // CLEAN DATABASE FIRST
  // ----------------------------------------------------------

  await removeExpired();

  await removeInvalidURLs();

  await cleanupSuspiciousOldGrants();

  await cleanupBadData();

  // ----------------------------------------------------------
  // FETCH SOURCES
  // ----------------------------------------------------------

  let totalNew = 0;

  totalNew +=
    await checkRemotive();

  totalNew +=
    await checkGrantsGov();

  totalNew +=
    await checkInternationalSources();

  totalNew +=
    await checkHESLB();

  totalNew +=
    await checkAjira();

  totalNew +=
    await checkGlobalEvents();

  // ----------------------------------------------------------
  // NORMALIZE
  // ----------------------------------------------------------

  await normalizeExistingData();

  // ----------------------------------------------------------
  // FINAL CLEAN
  // ----------------------------------------------------------

  await removeExpired();

  await removeInvalidURLs();

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
    "Finished:",
    new Date().toISOString()
  );

  console.log(
    "=========================================="
  );

  console.log("");
}

// ============================================================
// START
// ============================================================

runBot()
  .catch(error => {

    console.error(
      "❌ BOT CRITICAL ERROR:",
      error
    );
  });

// ============================================================
// AUTO RUN EVERY 30 MINUTES
// ============================================================

setInterval(
  () => {

    runBot()
      .catch(error => {

        console.error(
          "❌ Scheduled bot error:",
          error
        );
      });

  },
  CHECK_INTERVAL
);

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

process.on(
  "SIGTERM",
  async () => {

    console.log(
      "🛑 SIGTERM received."
    );

    process.exit(0);
  }
);

process.on(
  "SIGINT",
  async () => {

    console.log(
      "🛑 SIGINT received."
    );

    process.exit(0);
  }
);
