"use strict";

const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const crypto = require("crypto");
const admin = require("firebase-admin");

const app = express();

const PORT = process.env.PORT || 10000;

const BOT_VERSION = "13.0.0";

const COLLECTIONS = {
  opportunities: "opportunities",
  jobs: "jobs",
  scholarships: "scholarships",
  grants: "grants",
  internships: "internships",
  education: "education",
  news: "news",
  sources: "sources"
};

/* ============================================================
   SERVER
============================================================ */

app.get("/", (req, res) => {
  res.json({
    ok: true,
    name: "MAKYAMA GLOBAL OPPORTUNITIES BOT",
    version: BOT_VERSION,
    countries: 195,
    status: "running",
    time: new Date().toISOString()
  });
});
app.get("/api/opportunities", async (req, res) => {
  try {
    if (!db || !firestoreAvailable) {
      return res.status(503).json({
        ok: false,
        items: [],
        message: "Firestore unavailable"
      });
    }

    const snapshot = await db
      .collection("opportunities")
      .limit(500)
      .get();

    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      ok: true,
      count: items.length,
      items
    });

  } catch (error) {
    console.error(
      "API opportunities error:",
      error.message
    );

    res.status(500).json({
      ok: false,
      items: [],
      message: "Failed to load opportunities"
    });
  }
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "healthy",
    version: BOT_VERSION,
    time: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

/* ============================================================
   FIREBASE
============================================================ */

let db = null;
let firestoreAvailable = false;

function initFirebase() {
  try {
    let serviceAccount = null;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount =
        JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    }

    if (!serviceAccount && process.env.FIREBASE_PROJECT_ID) {
      serviceAccount = {
        project_id: process.env.FIREBASE_PROJECT_ID,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key:
          (process.env.FIREBASE_PRIVATE_KEY || "")
            .replace(/\\n/g, "\n")
      };
    }

    if (serviceAccount) {
      admin.initializeApp({
        credential:
          admin.credential.cert(serviceAccount)
      });
    } else {
      admin.initializeApp({
        credential:
          admin.credential.applicationDefault()
      });
    }

    db = admin.firestore();
    firestoreAvailable = true;

    console.log("🔥 Firebase initialized");

  } catch (error) {

    console.error(
      "⚠️ Firebase initialization failed:",
      error.message
    );

    db = null;
    firestoreAvailable = false;
  }
}

initFirebase();

/* ============================================================
   HELPERS
============================================================ */

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanText(value) {
  if (value === undefined || value === null) {
    return "";
  }

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
    const u = new URL(String(url).trim());

    u.hash = "";

    return u.toString();

  } catch {
    return String(url).trim();
  }
}

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

  id = id.substring(0, 100);

  const hash =
    crypto
      .createHash("sha1")
      .update(raw || crypto.randomUUID())
      .digest("hex")
      .substring(0, 12);

  return `${id}-${hash}`;
}

/* ============================================================
   VERIFIED COUNTRY REGISTRY
============================================================ */

/*
 IMPORTANT:

 DO NOT PUT RANDOM URLs HERE.

 A source enters this registry only after verification.

 Structure:

 {
   code: "TZ",
   country: "Tanzania",

   education: {
      name: "...",
      url: "..."
   },

   jobs: {
      name: "...",
      url: "..."
   },

   news: {
      name: "...",
      url: "..."
   }
 }
*/

const VERIFIED_SOURCES = {

  TZ: {
    country: "Tanzania",

    education: {
      name: "Tanzania Ministry of Education",
      url: "https://www.moe.go.tz/"
    },

    jobs: {
      name: "Tanzania Public Service Recruitment Secretariat",
      url: "https://www.psrs.go.tz/"
    },

    news: {
      name: "Tanzania Government Portal",
      url: "https://www.tanzania.go.tz/"
    }
  },

  KE: {
    country: "Kenya",

    education: {
      name: "Kenya Ministry of Education",
      url: "https://www.education.go.ke/"
    },

    jobs: {
      name: "Kenya Public Service Commission Jobs",
      url: "https://www.psckjobs.go.ke/"
    },

    news: {
      name: "Government of Kenya",
      url: "https://gok.kenya.go.ke/"
    }
  },

  DZ: {
    country: "Algeria",

    education: {
      name: "Algeria Ministry of National Education",
      url: "https://www.education.gov.dz/"
    }
  }

};

/* ============================================================
   COUNTRY MASTER LIST
============================================================ */

const COUNTRIES = [

  ["AF", "Afghanistan"],
  ["AL", "Albania"],
  ["DZ", "Algeria"],
  ["AD", "Andorra"],
  ["AO", "Angola"],
  ["AG", "Antigua and Barbuda"],
  ["AR", "Argentina"],
  ["AM", "Armenia"],
  ["AU", "Australia"],
  ["AT", "Austria"],
  ["AZ", "Azerbaijan"],

  ["BS", "Bahamas"],
  ["BH", "Bahrain"],
  ["BD", "Bangladesh"],
  ["BB", "Barbados"],
  ["BY", "Belarus"],
  ["BE", "Belgium"],
  ["BZ", "Belize"],
  ["BJ", "Benin"],
  ["BT", "Bhutan"],
  ["BO", "Bolivia"],
  ["BA", "Bosnia and Herzegovina"],
  ["BW", "Botswana"],
  ["BR", "Brazil"],
  ["BN", "Brunei"],
  ["BG", "Bulgaria"],
  ["BF", "Burkina Faso"],
  ["BI", "Burundi"],

  ["CV", "Cabo Verde"],
  ["KH", "Cambodia"],
  ["CM", "Cameroon"],
  ["CA", "Canada"],
  ["CF", "Central African Republic"],
  ["TD", "Chad"],
  ["CL", "Chile"],
  ["CN", "China"],
  ["CO", "Colombia"],
  ["KM", "Comoros"],
  ["CG", "Congo"],
  ["CD", "Democratic Republic of the Congo"],
  ["CR", "Costa Rica"],
  ["CI", "Côte d'Ivoire"],
  ["HR", "Croatia"],
  ["CU", "Cuba"],
  ["CY", "Cyprus"],
  ["CZ", "Czechia"],

  ["DK", "Denmark"],
  ["DJ", "Djibouti"],
  ["DM", "Dominica"],
  ["DO", "Dominican Republic"],

  ["EC", "Ecuador"],
  ["EG", "Egypt"],
  ["SV", "El Salvador"],
  ["GQ", "Equatorial Guinea"],
  ["ER", "Eritrea"],
  ["EE", "Estonia"],
  ["SZ", "Eswatini"],
  ["ET", "Ethiopia"],

  ["FJ", "Fiji"],
  ["FI", "Finland"],
  ["FR", "France"],

  ["GA", "Gabon"],
  ["GM", "Gambia"],
  ["GE", "Georgia"],
  ["DE", "Germany"],
  ["GH", "Ghana"],
  ["GR", "Greece"],
  ["GD", "Grenada"],
  ["GT", "Guatemala"],
  ["GN", "Guinea"],
  ["GW", "Guinea-Bissau"],
  ["GY", "Guyana"],

  ["HT", "Haiti"],
  ["HN", "Honduras"],
  ["HU", "Hungary"],

  ["IS", "Iceland"],
  ["IN", "India"],
  ["ID", "Indonesia"],
  ["IR", "Iran"],
  ["IQ", "Iraq"],
  ["IE", "Ireland"],
  ["IL", "Israel"],
  ["IT", "Italy"],

  ["JM", "Jamaica"],
  ["JP", "Japan"],
  ["JO", "Jordan"],

  ["KZ", "Kazakhstan"],
  ["KE", "Kenya"],
  ["KI", "Kiribati"],
  ["KW", "Kuwait"],
  ["KG", "Kyrgyzstan"],

  ["LA", "Laos"],
  ["LV", "Latvia"],
  ["LB", "Lebanon"],
  ["LS", "Lesotho"],
  ["LR", "Liberia"],
  ["LY", "Libya"],
  ["LI", "Liechtenstein"],
  ["LT", "Lithuania"],
  ["LU", "Luxembourg"],

  ["MG", "Madagascar"],
  ["MW", "Malawi"],
  ["MY", "Malaysia"],
  ["MV", "Maldives"],
  ["ML", "Mali"],
  ["MT", "Malta"],
  ["MH", "Marshall Islands"],
  ["MR", "Mauritania"],
  ["MU", "Mauritius"],
  ["MX", "Mexico"],
  ["FM", "Micronesia"],
  ["MD", "Moldova"],
  ["MC", "Monaco"],
  ["MN", "Mongolia"],
  ["ME", "Montenegro"],
  ["MA", "Morocco"],
  ["MZ", "Mozambique"],
  ["MM", "Myanmar"],

  ["NA", "Namibia"],
  ["NR", "Nauru"],
  ["NP", "Nepal"],
  ["NL", "Netherlands"],
  ["NZ", "New Zealand"],
  ["NI", "Nicaragua"],
  ["NE", "Niger"],
  ["NG", "Nigeria"],
  ["MK", "North Macedonia"],
  ["NO", "Norway"],

  ["OM", "Oman"],

  ["PK", "Pakistan"],
  ["PW", "Palau"],
  ["PA", "Panama"],
  ["PG", "Papua New Guinea"],
  ["PY", "Paraguay"],
  ["PE", "Peru"],
  ["PH", "Philippines"],
  ["PL", "Poland"],
  ["PT", "Portugal"],

  ["QA", "Qatar"],

  ["RO", "Romania"],
  ["RU", "Russia"],
  ["RW", "Rwanda"],

  ["KN", "Saint Kitts and Nevis"],
  ["LC", "Saint Lucia"],
  ["VC", "Saint Vincent and the Grenadines"],
  ["WS", "Samoa"],
  ["SM", "San Marino"],
  ["ST", "Sao Tome and Principe"],
  ["SA", "Saudi Arabia"],
  ["SN", "Senegal"],
  ["RS", "Serbia"],
  ["SC", "Seychelles"],
  ["SL", "Sierra Leone"],
  ["SG", "Singapore"],
  ["SK", "Slovakia"],
  ["SI", "Slovenia"],
  ["SB", "Solomon Islands"],
  ["SO", "Somalia"],
  ["ZA", "South Africa"],
  ["SS", "South Sudan"],
  ["ES", "Spain"],
  ["LK", "Sri Lanka"],
  ["SD", "Sudan"],
  ["SR", "Suriname"],
  ["SE", "Sweden"],
  ["CH", "Switzerland"],
  ["SY", "Syria"],

  ["TJ", "Tajikistan"],
  ["TH", "Thailand"],
  ["TL", "Timor-Leste"],
  ["TG", "Togo"],
  ["TO", "Tonga"],
  ["TT", "Trinidad and Tobago"],
  ["TN", "Tunisia"],
  ["TR", "Türkiye"],
  ["TM", "Turkmenistan"],
  ["TV", "Tuvalu"],

  ["UG", "Uganda"],
  ["UA", "Ukraine"],
  ["AE", "United Arab Emirates"],
  ["GB", "United Kingdom"],
  ["TZ", "Tanzania"],
  ["US", "United States"],
  ["UY", "Uruguay"],
  ["UZ", "Uzbekistan"],

  ["VU", "Vanuatu"],
  ["VE", "Venezuela"],
  ["VN", "Vietnam"],

  ["YE", "Yemen"],

  ["ZM", "Zambia"],
  ["ZW", "Zimbabwe"]

];

/* ============================================================
   SOURCE VALIDATION
============================================================ */

async function verifySource(source) {

  if (!source || !source.url) {
    return false;
  }

  try {

    const response = await axios.get(
      source.url,
      {
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: () => true,

        headers: {
          "User-Agent":
            "Mozilla/5.0 MAKYAMA-GLOBAL-BOT/13.0"
        }
      }
    );

    if (
      response.status >= 200 &&
      response.status < 400
    ) {
      return true;
    }

    return false;

  } catch (error) {

    console.log(
      `❌ Source unavailable: ${source.url}`
    );

    return false;
  }
}

/* ============================================================
   FETCH HTML
============================================================ */

async function fetchPage(url) {

  try {

    const response =
      await axios.get(
        url,
        {
          timeout: 25000,
          maxRedirects: 5,
          validateStatus: () => true,

          headers: {
            "User-Agent":
              "Mozilla/5.0 MAKYAMA-GLOBAL-BOT/13.0"
          }
        }
      );

    if (
      response.status < 200 ||
      response.status >= 400
    ) {
      return null;
    }

    return response.data;

  } catch (error) {

    console.log(
      `❌ Failed: ${url} -> ${error.message}`
    );

    return null;
  }
}

/* ============================================================
   HTML COLLECTOR
============================================================ */

async function fetchHTMLSource(
  source,
  category,
  country
) {

  const html =
    await fetchPage(source.url);

  if (!html) {
    return [];
  }

  try {

    const $ =
      cheerio.load(html);

    const items = [];

    $(
      "article, .post, .news-item, .job, .card, li"
    ).each((_, element) => {

      const title =
        cleanText(
          $(element)
            .find(
              "h1,h2,h3,h4,.title,.entry-title"
            )
            .first()
            .text()
        );

      const href =
        $(element)
          .find("a")
          .first()
          .attr("href") || "";

      if (!title || !href) {
        return;
      }

      let absolute = "";

      try {
        absolute =
          new URL(
            href,
            source.url
          ).toString();
      } catch {
        return;
      }

      items.push({

        title,

        description:
          cleanText(
            stripHtml(
              $(element).text()
            )
          ),

        organization:
          source.name,

        country,

        category,

        source:
          source.name,

        sourceUrl:
          normalizeUrl(absolute),

        applicationUrl:
          normalizeUrl(absolute),

        publishedAt:
          new Date().toISOString(),

        status: "active",

        botVersion:
          BOT_VERSION
      });

    });

    return uniqueByUrl(
      items
    ).slice(0, 100);

  } catch (error) {

    console.log(
      `❌ Parser error: ${source.name}`
    );

    return [];
  }
}

/* ============================================================
   UNIQUE
============================================================ */

function uniqueByUrl(items) {

  const map = new Map();

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

  return [...map.values()];
}

/* ============================================================
   SAVE SOURCE STATUS
============================================================ */

async function saveSourceStatus(
  countryCode,
  country,
  type,
  source,
  verified
) {

  if (!db || !firestoreAvailable) {
    return;
  }

  try {

    const id =
      safeDocId(
        `${countryCode}-${type}-${source.url}`
      );

    await db
      .collection(
        COLLECTIONS.sources
      )
      .doc(id)
      .set(
        {
          countryCode,
          country,
          type,

          name:
            source.name,

          url:
            source.url,

          verified,

          checkedAt:
            new Date().toISOString(),

          botVersion:
            BOT_VERSION
        },
        {
          merge: true
        }
      );

  } catch (error) {

    console.log(
      `⚠️ Source status save failed: ${countryCode}`
    );
  }
}

/* ============================================================
   SAVE ITEM
============================================================ */

async function saveItem(
  collection,
  item
) {

  if (!db || !firestoreAvailable) {
    return false;
  }

  try {

    const id =
      safeDocId(
        item.sourceUrl ||
        item.title
      );

    await db
      .collection(collection)
      .doc(id)
      .set(
        {
          ...item,

          updatedAt:
            new Date().toISOString(),

          botVersion:
            BOT_VERSION
        },
        {
          merge: true
        }
      );

    return true;

  } catch (error) {

    console.log(
      `❌ ${collection} save failed:`,
      error.message
    );

    return false;
  }
}

/* ============================================================
   COLLECT ONE COUNTRY
============================================================ */

async function collectCountry(
  countryCode,
  country
) {

  console.log("");
  console.log(
    `🌍 ${country} [${countryCode}]`
  );

  const registry =
    VERIFIED_SOURCES[
      countryCode
    ];

  if (!registry) {

    console.log(
      "⚠️ NO VERIFIED SOURCES"
    );

    return [];
  }

  const results = [];

  for (
    const type of [
      "education",
      "jobs",
      "news"
    ]
  ) {

    const source =
      registry[type];

    if (!source) {

      console.log(
        `⏭️ ${type}: no verified source`
      );

      continue;
    }

    console.log(
      `🔎 Verifying ${type}: ${source.url}`
    );

    const verified =
      await verifySource(
        source
      );

    await saveSourceStatus(
      countryCode,
      country,
      type,
      source,
      verified
    );

    if (!verified) {

      console.log(
        `❌ ${type}: NOT VERIFIED`
      );

      continue;
    }

    console.log(
      `✅ ${type}: VERIFIED`
    );

    const data =
      await fetchHTMLSource(
        source,
        type,
        country
      );

    results.push(
      ...data
    );

    await sleep(500);
  }

  console.log(
    `📦 ${country}: ${results.length} items`
  );

  return results;
}

/* ============================================================
   GLOBAL COLLECTION
============================================================ */

async function collectGlobal() {

  console.log("");
  console.log(
    "============================================================"
  );

  console.log(
    "🌍 MAKYAMA VERIFIED GLOBAL COLLECTION"
  );

  console.log(
    `🌍 COUNTRIES: ${COUNTRIES.length}`
  );

  console.log(
    "============================================================"
  );

  const all = [];

  for (
    const [code, country]
    of COUNTRIES
  ) {

    try {

      const items =
        await collectCountry(
          code,
          country
        );

      all.push(
        ...items
      );

    } catch (error) {

      console.log(
        `❌ ${country} failed: ${error.message}`
      );
    }

    await sleep(300);
  }

  return uniqueByUrl(
    all
  );
}

/* ============================================================
   SAVE GLOBAL
============================================================ */

async function saveAll(
  items
) {

  let saved = 0;

  for (
    const item of items
  ) {

    const category =
      cleanText(
        item.category
      ).toLowerCase();

    let collection =
      COLLECTIONS.opportunities;

    if (
      category === "jobs"
    ) {
      collection =
        COLLECTIONS.jobs;
    }

    if (
      category === "education"
    ) {
      collection =
        COLLECTIONS.education;
    }

    if (
      category === "news"
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
      saved++;
    }

    await saveItem(
      COLLECTIONS.opportunities,
      item
    );

    await sleep(30);
  }

  console.log(
    `💾 SAVED: ${saved}/${items.length}`
  );
}

/* ============================================================
   FIRESTORE TEST
============================================================ */

async function testFirestore() {

  if (!db) {
    console.log(
      "⚠️ Firestore unavailable"
    );

    return false;
  }

  try {

    await db
      .collection("_system")
      .doc("makyama_bot")
      .set(
        {
          bot:
            "MAKYAMA",

          version:
            BOT_VERSION,

          updatedAt:
            new Date().toISOString()
        },
        {
          merge: true
        }
      );

    firestoreAvailable =
      true;

    console.log(
      "✅ Firestore connection OK"
    );

    return true;

  } catch (error) {

    console.log(
      "❌ Firestore connection failed:",
      error.code || "",
      error.message || ""
    );

    firestoreAvailable =
      false;

    return false;
  }
}

/* ============================================================
   MAIN
============================================================ */

let running = false;

async function runBot() {

  if (running) {
    console.log(
      "⏳ Previous run still active"
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
    `🕐 ${new Date().toISOString()}`
  );

  console.log(
    "============================================================"
  );

  try {

    await testFirestore();

    const items =
      await collectGlobal();

    console.log("");
    console.log(
      `📊 TOTAL COLLECTED: ${items.length}`
    );

    await saveAll(
      items
    );

    console.log("");
    console.log(
      "============================================================"
    );

    console.log(
      "✅ GLOBAL RUN COMPLETED"
    );

    console.log(
      "============================================================"
    );

  } catch (error) {

    console.error(
      "❌ BOT ERROR:",
      error.stack ||
      error.message
    );

  } finally {

    running = false;
  }
}

/* ============================================================
   START
============================================================ */

setTimeout(
  () => {
    runBot();
  },
  5000
);

/* ============================================================
   EVERY 30 MINUTES
============================================================ */

setInterval(
  () => {
    runBot();
  },
  30 * 60 * 1000
);

/* ============================================================
   SAFETY
============================================================ */

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
