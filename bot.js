const express = require("express");
const admin = require("firebase-admin");

const app = express();

const PORT = process.env.PORT || 10000;
const INTERVAL = 30 * 60 * 1000;

/* =========================================================
   FIREBASE
========================================================= */

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT haijawekwa!");
  process.exit(1);
}

let serviceAccount;

try {
  serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT
  );
} catch (e) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT si JSON sahihi.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    process.env.FIREBASE_DATABASE_URL ||
    "https://makyama-e5e89-default-rtdb.firebaseio.com/"
});

const db = admin.database();

/* =========================================================
   EXPRESS
========================================================= */

app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>MAKYAMA GLOBAL OPPORTUNITIES BOT</title>
        <meta name="viewport" content="width=device-width,initial-scale=1">
      </head>
      <body style="
        background:#070a09;
        color:white;
        font-family:Arial;
        text-align:center;
        padding:50px
      ">
        <h1 style="color:#00e676">
          🌍 MAKYAMA GLOBAL OPPORTUNITIES BOT V6
        </h1>

        <p>🟢 Bot is running.</p>

        <p>
          🇹🇿 Tanzania +
          🌍 Global Countries
        </p>

        <p>
          Jobs • Scholarships • Grants • Internships
        </p>
      </body>
    </html>
  `);
});

app.get("/health", (req, res) => {
  res.json({
    status: "online",
    bot: "MAKYAMA GLOBAL OPPORTUNITIES V6",
    time: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log("==========================================");
  console.log("🚀 MAKYAMA GLOBAL OPPORTUNITIES BOT V6");
  console.log("==========================================");
  console.log("Port:", PORT);
  console.log("Interval: 30 minutes");
  console.log("==========================================");
});


/* =========================================================
   HELPERS
========================================================= */

function clean(value) {
  if (value === undefined || value === null) return "";

  return String(value)
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function makeId(title, source, link) {
  return Buffer
    .from(
      `${source}|${title}|${link || ""}`
        .toLowerCase()
    )
    .toString("base64")
    .replace(/[+/=]/g, "")
    .substring(0, 120);
}

function countryFromText(text) {

  const t = String(text || "").toLowerCase();

  const countries = [

    ["tanzania", "Tanzania"],
    ["kenya", "Kenya"],
    ["uganda", "Uganda"],
    ["rwanda", "Rwanda"],
    ["burundi", "Burundi"],
    ["nigeria", "Nigeria"],
    ["ghana", "Ghana"],
    ["south africa", "South Africa"],
    ["zambia", "Zambia"],
    ["zimbabwe", "Zimbabwe"],
    ["malawi", "Malawi"],
    ["mozambique", "Mozambique"],
    ["ethiopia", "Ethiopia"],
    ["somalia", "Somalia"],
    ["sudan", "Sudan"],
    ["egypt", "Egypt"],
    ["botswana", "Botswana"],
    ["namibia", "Namibia"],
    ["senegal", "Senegal"],
    ["cameroon", "Cameroon"],
    ["ivory coast", "Côte d'Ivoire"],

    ["united states", "United States"],
    ["usa", "United States"],
    ["america", "United States"],

    ["canada", "Canada"],
    ["united kingdom", "United Kingdom"],
    ["uk", "United Kingdom"],
    ["england", "United Kingdom"],

    ["australia", "Australia"],
    ["new zealand", "New Zealand"],

    ["germany", "Germany"],
    ["france", "France"],
    ["italy", "Italy"],
    ["spain", "Spain"],
    ["portugal", "Portugal"],
    ["netherlands", "Netherlands"],
    ["belgium", "Belgium"],
    ["switzerland", "Switzerland"],
    ["sweden", "Sweden"],
    ["norway", "Norway"],
    ["denmark", "Denmark"],
    ["finland", "Finland"],
    ["ireland", "Ireland"],
    ["poland", "Poland"],
    ["austria", "Austria"],
    ["belarus", "Belarus"],
    ["ukraine", "Ukraine"],
    ["romania", "Romania"],
    ["greece", "Greece"],
    ["czech", "Czech Republic"],
    ["hungary", "Hungary"],

    ["india", "India"],
    ["pakistan", "Pakistan"],
    ["bangladesh", "Bangladesh"],
    ["nepal", "Nepal"],
    ["sri lanka", "Sri Lanka"],

    ["china", "China"],
    ["japan", "Japan"],
    ["south korea", "South Korea"],
    ["korea", "South Korea"],
    ["singapore", "Singapore"],
    ["malaysia", "Malaysia"],
    ["indonesia", "Indonesia"],
    ["philippines", "Philippines"],
    ["vietnam", "Vietnam"],
    ["thailand", "Thailand"],

    ["uae", "United Arab Emirates"],
    ["united arab emirates", "United Arab Emirates"],
    ["dubai", "United Arab Emirates"],
    ["saudi arabia", "Saudi Arabia"],
    ["qatar", "Qatar"],
    ["kuwait", "Kuwait"],
    ["oman", "Oman"],
    ["bahrain", "Bahrain"],
    ["israel", "Israel"],
    ["jordan", "Jordan"],
    ["turkey", "Türkiye"],

    ["brazil", "Brazil"],
    ["argentina", "Argentina"],
    ["mexico", "Mexico"],
    ["colombia", "Colombia"],
    ["chile", "Chile"],
    ["peru", "Peru"]

  ];

  for (const [needle, country] of countries) {

    if (t.includes(needle)) {
      return country;
    }

  }

  return "International";
}


/* =========================================================
   FETCH
========================================================= */

async function fetchJSON(url, options = {}) {

  const response = await fetch(url, {
    ...options,
    headers: {
      "User-Agent":
        "MAKYAMA-Global-Opportunities-Bot/6.0",
      "Accept":
        "application/json,text/plain,*/*",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} - ${url}`
    );
  }

  return response.json();
}


async function fetchText(url, options = {}) {

  const response = await fetch(url, {
    ...options,
    headers: {
      "User-Agent":
        "MAKYAMA-Global-Opportunities-Bot/6.0",
      "Accept":
        "application/rss+xml,application/xml,text/xml,text/plain,*/*",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} - ${url}`
    );
  }

  return response.text();
}


/* =========================================================
   SAVE OPPORTUNITY
========================================================= */

async function saveOpportunity(data) {

  const title = clean(data.title);

  if (!title) return false;

  const source = clean(data.source) || "Unknown";

  const link = clean(data.link);

  const id = makeId(
    title,
    source,
    link
  );

  const country =
    clean(data.country) ||
    countryFromText(
      `${title} ${data.description || ""} ${link}`
    );

  const opportunity = {

    title,

    category:
      clean(data.category) ||
      "Opportunity",

    country,

    source,

    description:
      clean(data.description || ""),

    link,

    deadline:
      clean(data.deadline || ""),

    published:
      data.published ||
      Date.now(),

    updatedAt:
      Date.now(),

    global: true

  };

  await db
    .ref("opportunities/" + id)
    .set(opportunity);

  return true;
}


/* =========================================================
   REMOVE OLD EXPIRED DATA
========================================================= */

async function cleanExpired() {

  console.log("🧹 Checking expired opportunities...");

  const snap =
    await db.ref("opportunities").once("value");

  if (!snap.exists()) {
    console.log("🧹 Nothing to clean.");
    return;
  }

  let removed = 0;

  const now = Date.now();

  const updates = {};

  snap.forEach(child => {

    const item = child.val() || {};

    if (
      item.expiresAt &&
      Number(item.expiresAt) < now
    ) {

      updates[child.key] = null;

      removed++;

    }

  });

  if (removed > 0) {
    await db
      .ref("opportunities")
      .update(updates);
  }

  console.log(
    `🧹 Removed ${removed} expired opportunities.`
  );
}


/* =========================================================
   1. GRANTS.GOV
========================================================= */

async function fetchGrantsGov() {

  console.log("🇺🇸 Checking Grants.gov...");

  try {

    /*
      Grants.gov API endpoint.
      Tunafanya POST kwa search endpoint.
    */

    const url =
      "https://api.grants.gov/v1/api/search2";

    const data = await fetchJSON(
      url,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

          keyword:
            "",

          oppStatuses:
            "forecasted|posted",

          rows:
            50,

          startRecordNum:
            0

        })
      }
    );

    const opportunities =
      data?.oppHits ||
      data?.data?.oppHits ||
      [];

    let count = 0;

    for (const item of opportunities) {

      const title =
        item.oppTitle ||
        item.title ||
        "Grant Opportunity";

      const link =
        item.oppNumber
          ? `https://www.grants.gov/search-results-detail/${item.oppNumber}`
          : "";

      const description =
        item.oppDescription ||
        item.description ||
        "";

      const country =
        countryFromText(
          `${title} ${description}`
        );

      await saveOpportunity({

        title,

        category:
          "Grant",

        country,

        source:
          "Grants.gov",

        description,

        link,

        deadline:
          item.closeDate ||
          "",

        published:
          Date.now()

      });

      count++;

    }

    console.log(
      `📦 Grants.gov: ${count}`
    );

  } catch (error) {

    console.error(
      "❌ Grants.gov ERROR:",
      error.message
    );

  }
}


/* =========================================================
   2. REMOTIVE GLOBAL JOBS
========================================================= */

async function fetchRemotive() {

  console.log(
    "🌍 Checking Remotive Global Jobs..."
  );

  try {

    const url =
      "https://remotive.com/api/remote-jobs?limit=100";

    const data =
      await fetchJSON(url);

    const jobs =
      data?.jobs || [];

    let count = 0;

    for (const job of jobs) {

      const locations =
        Array.isArray(job.candidate_required_location)
          ? job.candidate_required_location.join(", ")
          : (
              job.candidate_required_location ||
              "Worldwide"
            );

      let country =
        countryFromText(
          `${locations} ${job.title} ${job.description || ""}`
        );

      if (
        locations.toLowerCase().includes("worldwide") ||
        locations.toLowerCase().includes("anywhere")
      ) {
        country = "Worldwide";
      }

      await saveOpportunity({

        title:
          job.title,

        category:
          "Job",

        country,

        source:
          "Remotive",

        description:
          clean(job.description || ""),

        link:
          job.url || "",

        deadline:
          "",

        published:
          job.publication_date
            ? new Date(
                job.publication_date
              ).getTime()
            : Date.now()

      });

      count++;

    }

    console.log(
      `📦 Remotive: ${count}`
    );

  } catch (error) {

    console.error(
      "❌ Remotive ERROR:",
      error.message
    );

  }
}


/* =========================================================
   3. HESLB TANZANIA
========================================================= */

async function fetchHESLB() {

  console.log(
    "🇹🇿 Checking HESLB Tanzania..."
  );

  try {

    const html =
      await fetchText(
        "https://www.heslb.go.tz/"
      );

    const title =
      "HESLB Tanzania — Latest Opportunities";

    await saveOpportunity({

      title,

      category:
        "Scholarship",

      country:
        "Tanzania",

      source:
        "HESLB Tanzania",

      description:
        "Official Higher Education Students' Loans Board Tanzania opportunities, scholarships, loans and education funding updates.",

      link:
        "https://www.heslb.go.tz/",

      published:
        Date.now()

    });

    /*
      Tunaweka pia shortcut za muhimu.
    */

    await saveOpportunity({

      title:
        "HESLB 2026/2027 Loan Application",

      category:
        "Scholarship",

      country:
        "Tanzania",

      source:
        "HESLB Tanzania",

      description:
        "Official HESLB 2026/2027 loan application information.",

      link:
        "https://www.heslb.go.tz/",

      published:
        Date.now()

    });

    await saveOpportunity({

      title:
        "HESLB Scholarships and Guidelines",

      category:
        "Scholarship",

      country:
        "Tanzania",

      source:
        "HESLB Tanzania",

      description:
        "Official scholarship guidelines and higher education funding information.",

      link:
        "https://www.heslb.go.tz/index.php/category/guidelines",

      published:
        Date.now()

    });

    console.log(
      "📦 HESLB Tanzania processed"
    );

  } catch (error) {

    console.error(
      "❌ HESLB ERROR:",
      error.message
    );

  }
}


/* =========================================================
   4. AJIRA / PSRS TANZANIA
========================================================= */

async function fetchAjira() {

  console.log(
    "🇹🇿 Checking Ajira / PSRS..."
  );

  try {

    const html =
      await fetchText(
        "https://www.ajira.go.tz/"
      );

    /*
      Kwa sasa tunaweka official source
      kama opportunity feed.

      Hii ni bora kuliko kutengeneza
      fake jobs ambazo hazipo.
    */

    await saveOpportunity({

      title:
        "Ajira Tanzania — Latest Government Jobs",

      category:
        "Job",

      country:
        "Tanzania",

      source:
        "Ajira / PSRS",

      description:
        "Official Tanzania Public Service Recruitment Secretariat job announcements and recruitment updates.",

      link:
        "https://www.ajira.go.tz/",

      published:
        Date.now()

    });

    console.log(
      "📦 Ajira / PSRS processed"
    );

  } catch (error) {

    console.error(
      "❌ Ajira ERROR:",
      error.message
    );

  }
}


/* =========================================================
   5. INTERNATIONAL OPPORTUNITIES
========================================================= */

async function fetchInternational() {

  console.log(
    "🌐 Checking International Opportunities..."
  );

  /*
    Hapa tunaweka official international
    opportunity entry.

    Baadaye tunaweza kuongeza:
      - UN
      - World Bank
      - African Union
      - Erasmus+
      - DAAD
      - Commonwealth
      - Mastercard Foundation
      - WHO
      - UNICEF
      - ILO
      - etc.
  */

  const sources = [

    {
      title:
        "United Nations Careers",

      category:
        "Job",

      country:
        "International",

      source:
        "United Nations",

      description:
        "United Nations international career and employment opportunities.",

      link:
        "https://careers.un.org/"
    },

    {
      title:
        "World Bank Careers",

      category:
        "Job",

      country:
        "International",

      source:
        "World Bank",

      description:
        "World Bank careers and international employment opportunities.",

      link:
        "https://www.worldbank.org/en/about/careers"
    },

    {
      title:
        "Erasmus+ Opportunities",

      category:
        "Scholarship",

      country:
        "International",

      source:
        "Erasmus+",

      description:
        "European international education, mobility and scholarship opportunities.",

      link:
        "https://erasmus-plus.ec.europa.eu/"
    },

    {
      title:
        "DAAD Scholarships",

      category:
        "Scholarship",

      country:
        "Germany",

      source:
        "DAAD",

      description:
        "Official German Academic Exchange Service scholarship opportunities.",

      link:
        "https://www.daad.de/en/study-and-research-in-germany/scholarships/"
    },

    {
      title:
        "Commonwealth Scholarships",

      category:
        "Scholarship",

      country:
        "United Kingdom",

      source:
        "Commonwealth",

      description:
        "Commonwealth scholarship and fellowship opportunities.",

      link:
        "https://cscuk.fcdo.gov.uk/"
    },

    {
      title:
        "African Union Opportunities",

      category:
        "Job",

      country:
        "Africa",

      source:
        "African Union",

      description:
        "African Union career and professional opportunities.",

      link:
        "https://au.int/en/careers"
    }

  ];

  let count = 0;

  for (const item of sources) {

    await saveOpportunity({

      ...item,

      published:
        Date.now()

    });

    count++;

  }

  console.log(
    `📦 International sources: ${count}`
  );
}


/* =========================================================
   COUNTRY NORMALIZATION
========================================================= */

async function normalizeCountries() {

  console.log(
    "🌍 Normalizing countries..."
  );

  const snap =
    await db.ref("opportunities")
      .once("value");

  if (!snap.exists()) return;

  const updates = {};

  snap.forEach(child => {

    const item =
      child.val() || {};

    const text = [

      item.title,
      item.description,
      item.country,
      item.link

    ].join(" ");

    let country =
      item.country;

    /*
      Kama country haipo vizuri,
      tunajaribu kuitambua.
    */

    if (
      !country ||
      country === "Unknown" ||
      country === "International"
    ) {

      country =
        countryFromText(text);

    }

    /*
      Worldwide ibaki Worldwide.
    */

    if (
      text.toLowerCase()
        .includes("worldwide")
    ) {

      country = "Worldwide";

    }

    updates[
      child.key + "/country"
    ] = country;

    updates[
      child.key + "/global"
    ] = true;

  });

  await db
    .ref("opportunities")
    .update(updates);

  console.log(
    "✅ Country normalization complete"
  );
}


/* =========================================================
   BOT MAIN RUN
========================================================= */

async function runBot() {

  console.log("");
  console.log("==========================================");
  console.log(
    "🤖 MAKYAMA GLOBAL + TANZANIA BOT V6"
  );
  console.log("==========================================");

  console.log(
    "Time:",
    new Date().toISOString()
  );

  try {

    await cleanExpired();

    /*
      GLOBAL SOURCES
    */

    await fetchGrantsGov();

    await fetchRemotive();

    await fetchInternational();

    /*
      TANZANIA SOURCES
    */

    await fetchHESLB();

    await fetchAjira();

    /*
      COUNTRY FIX
    */

    await normalizeCountries();

    console.log("");
    console.log(
      "🎉 BOT FINISHED SUCCESSFULLY"
    );

  } catch (error) {

    console.error(
      "❌ BOT ERROR:",
      error
    );

  }

  console.log("==========================================");
}


/* =========================================================
   START
========================================================= */

runBot();

setInterval(
  runBot,
  INTERVAL
);
