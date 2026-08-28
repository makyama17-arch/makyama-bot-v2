const express = require("express");
const admin = require("firebase-admin");

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

const OPPORTUNITIES_PATH = "opportunities";

const BOT_INTERVAL = 30 * 60 * 1000;
const REQUEST_TIMEOUT = 30000;


// ======================================================
// FETCH
// ======================================================

async function fetchWithTimeout(url, options = {}) {

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT
  );

  try {

    return await fetch(url, {
      ...options,

      signal: controller.signal,

      headers: {
        "User-Agent":
          "MAKYAMA Global Opportunities Bot/5.0",

        "Accept":
          "application/json,text/html,application/xhtml+xml,application/xml",

        ...(options.headers || {})
      }
    });

  } finally {

    clearTimeout(timeout);

  }
}


// ======================================================
// CLEAN HTML / ENTITIES
// ======================================================

function cleanText(value) {

  if (!value) return "";

  return String(value)

    .replace(/<script[\s\S]*?<\/script>/gi, " ")

    .replace(/<style[\s\S]*?<\/style>/gi, " ")

    .replace(/<[^>]+>/g, " ")

    .replace(/&nbsp;/gi, " ")

    .replace(/&amp;/gi, "&")

    .replace(/&quot;/gi, '"')

    .replace(/&#39;/gi, "'")

    .replace(/&apos;/gi, "'")

    .replace(/&ndash;/gi, "–")

    .replace(/&mdash;/gi, "—")

    .replace(/&hellip;/gi, "…")

    .replace(/&#8211;/gi, "–")

    .replace(/&#8212;/gi, "—")

    .replace(/&#8230;/gi, "…")

    .replace(/\s+/g, " ")

    .trim();
}


// ======================================================
// URL
// ======================================================

function validUrl(url) {

  if (!url) return false;

  try {

    const parsed = new URL(url);

    return (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:"
    );

  } catch {

    return false;

  }
}


// ======================================================
// ID
// ======================================================

function makeId(title, url) {

  return `${title}-${url}`

    .toLowerCase()

    .replace(/https?:\/\//g, "")

    .replace(/[^a-z0-9]+/g, "-")

    .replace(/^-+|-+$/g, "")

    .substring(0, 180);
}


// ======================================================
// DATE
// ======================================================

function parseDate(value) {

  if (!value) return null;

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}


// ======================================================
// DEADLINE
// ======================================================

function extractDeadline(text) {

  if (!text) return null;

  const clean = cleanText(text);

  // YYYY-MM-DD

  let match = clean.match(
    /\b(20\d{2})[-\/](0?[1-9]|1[0-2])[-\/](0?[1-9]|[12]\d|3[01])\b/
  );

  if (match) {

    const date = new Date(
      `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}T23:59:59Z`
    );

    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }


  // Month DD YYYY

  match = clean.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+([0-3]?\d),?\s+(20\d{2})\b/i
  );

  if (match) {

    const date = new Date(
      `${match[1]} ${match[2]}, ${match[3]} 23:59:59 UTC`
    );

    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }


  // DD Month YYYY

  match = clean.match(
    /\b([0-3]?\d)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i
  );

  if (match) {

    const date = new Date(
      `${match[2]} ${match[1]}, ${match[3]} 23:59:59 UTC`
    );

    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }


  return null;
}


// ======================================================
// CATEGORY
// ======================================================

function detectCategory(
  title,
  description,
  defaultCategory = "Opportunity"
) {

  const text =
    `${title} ${description}`.toLowerCase();


  if (
    text.includes("scholarship") ||
    text.includes("scholarships") ||
    text.includes("ufadhili")
  ) {
    return "Scholarship";
  }


  if (
    text.includes("fellowship")
  ) {
    return "Fellowship";
  }


  if (
    text.includes("internship") ||
    text.includes("intern ")
  ) {
    return "Internship";
  }


  if (
    text.includes("grant") ||
    text.includes("funding")
  ) {
    return "Grant";
  }


  if (
    text.includes("hackathon")
  ) {
    return "Hackathon";
  }


  if (
    text.includes("competition") ||
    text.includes("contest")
  ) {
    return "Competition";
  }


  if (
    text.includes("job") ||
    text.includes("vacancy") ||
    text.includes("nafasi za kazi") ||
    text.includes("employment")
  ) {
    return "Job";
  }


  return defaultCategory;
}


// ======================================================
// FUNDING
// ======================================================

function detectFunding(title, description) {

  const text =
    `${title} ${description}`.toLowerCase();


  if (
    text.includes("fully funded") ||
    text.includes("fully-funded") ||
    text.includes("full scholarship")
  ) {
    return "Fully Funded";
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
// SAVE
// ======================================================

async function saveOpportunity(data) {

  if (!data.title || !data.url) {
    return false;
  }


  if (!validUrl(data.url)) {
    return false;
  }


  const title =
    cleanText(data.title);


  const description =
    cleanText(data.description || "");


  const id =
    makeId(title, data.url);


  const ref =
    db.ref(
      `${OPPORTUNITIES_PATH}/${id}`
    );


  const existing =
    await ref.once("value");


  if (existing.exists()) {

    return false;
  }


  const record = {

    title,

    description,

    category:
      data.category ||
      detectCategory(
        title,
        description
      ),

    country:
      data.country ||
      "Worldwide",

    region:
      data.region ||
      "",

    funding:
      data.funding ||
      detectFunding(
        title,
        description
      ),

    deadline:
      data.deadline ||
      extractDeadline(
        description
      ),

    officialUrl:
      data.url,

    source:
      data.source ||
      "MAKYAMA",

    publishedAt:
      data.publishedAt ||
      null,

    addedAt:
      Date.now(),

    status:
      "active"

  };


  await ref.set(record);


  console.log("");
  console.log("✅ NEW OPPORTUNITY");
  console.log("Title:", title);
  console.log("Category:", record.category);
  console.log("Country:", record.country);
  console.log("Deadline:", record.deadline || "N/A");
  console.log("Source:", record.source);


  return true;
}


// ======================================================
// GRANTS.GOV
// ======================================================

async function fetchGrantsGov() {

  console.log("");
  console.log("🇺🇸 Checking Grants.gov API...");


  try {

    const response =
      await fetchWithTimeout(
        "https://api.grants.gov/v1/api/search2",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "Accept":
              "application/json"
          },

          body: JSON.stringify({

            rows: 50,

            keyword: "",

            oppStatuses:
              "posted|forecasted",

            eligibilities:
              "",

            agencies:
              "",

            fundingCategories:
              "",

            fundingInstruments:
              "",

            aln:
              ""

          })
        }
      );


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );
    }


    const json =
      await response.json();


    const items =
      json?.data?.oppHits || [];


    console.log(
      `📦 Grants.gov: ${items.length}`
    );


    for (const item of items) {

      if (!item.title) {
        continue;
      }


      const url =
        item.id
          ? `https://www.grants.gov/search-results-detail/${item.id}`
          : "";


      if (!url) {
        continue;
      }


      await saveOpportunity({

        title:
          item.title,

        description:
          `${item.agencyName || ""} ${item.number || ""}`,

        category:
          "Grant",

        country:
          "United States / International",

        region:
          "Global",

        url,

        source:
          "Grants.gov",

        publishedAt:
          parseDate(
            item.openDate
          ),

        deadline:
          parseDate(
            item.closeDate
          )

      });

    }


  } catch (error) {

    console.error(
      "❌ Grants.gov:",
      error.message
    );

  }
}


// ======================================================
// HESLB — FILTERED
// ======================================================

function isRealHESLBOpportunity(title) {

  const text =
    title.toLowerCase();


  // ❌ Do NOT save these

  const blocked = [

    "loan issuance",

    "loan repayment",

    "about loan repayment",

    "about loan issuance",

    "application guideline",

    "application guidelines",

    "online application",

    "olams",

    "beneficiary",

    "repay loan",

    "repayment",

    "loan application"

  ];


  for (const word of blocked) {

    if (text.includes(word)) {
      return false;
    }

  }


  // ✅ Scholarship / education opportunity

  const allowed = [

    "scholarship",

    "scholarships",

    "ufadhili",

    "ngongoro",

    "ngorongoro",

    "samia",

    "nyerere memorial",

    "nyerere",

    "masters scholarship",

    "degree scholarship",

    "education"

  ];


  return allowed.some(
    word => text.includes(word)
  );
}


async function fetchHESLB() {

  console.log("");
  console.log("🇹🇿 Checking HESLB Scholarships...");


  const url =
    "https://www.heslb.go.tz/loanapplication/application-guideline";


  try {

    const response =
      await fetchWithTimeout(url);


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );
    }


    const html =
      await response.text();


    const regex =
      /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;


    let match;

    let count = 0;


    while (
      (match = regex.exec(html)) !== null
    ) {

      const href =
        match[1];


      const text =
        cleanText(match[2]);


      if (!text) {
        continue;
      }


      if (
        !isRealHESLBOpportunity(text)
      ) {
        continue;
      }


      let fullUrl =
        href;


      if (
        href.startsWith("/")
      ) {

        fullUrl =
          "https://www.heslb.go.tz" +
          href;

      } else if (
        href.startsWith("index.php")
      ) {

        fullUrl =
          "https://www.heslb.go.tz/" +
          href;

      }


      if (!validUrl(fullUrl)) {
        continue;
      }


      const description =
        `Official HESLB Tanzania opportunity: ${text}`;


      await saveOpportunity({

        title:
          text,

        description,

        category:
          "Scholarship",

        country:
          "Tanzania",

        region:
          "East Africa",

        url:
          fullUrl,

        source:
          "HESLB Tanzania",

        deadline:
          extractDeadline(
            text
          )

      });


      count++;


      if (count >= 30) {
        break;
      }

    }


    console.log(
      `📦 HESLB scholarships processed: ${count}`
    );


  } catch (error) {

    console.error(
      "❌ HESLB:",
      error.message
    );

  }
}


// ======================================================
// AJIRA / PSRS
// ======================================================

async function fetchAjira() {

  console.log("");
  console.log("🇹🇿 Checking Ajira / PSRS...");


  const url =
    "https://www.ajira.go.tz/recruitment_management";


  try {

    const response =
      await fetchWithTimeout(url);


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );
    }


    const html =
      await response.text();


    const regex =
      /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;


    let match;

    let count = 0;


    while (
      (match = regex.exec(html)) !== null
    ) {

      const href =
        match[1];


      const text =
        cleanText(match[2]);


      if (!text) {
        continue;
      }


      const lower =
        text.toLowerCase();


      if (
        !lower.includes(
          "nafasi za kazi"
        )
      ) {
        continue;
      }


      let fullUrl =
        href;


      if (
        href.startsWith("/")
      ) {

        fullUrl =
          "https://www.ajira.go.tz" +
          href;

      } else if (
        href.startsWith("index.php")
      ) {

        fullUrl =
          "https://www.ajira.go.tz/" +
          href;
      }


      if (!validUrl(fullUrl)) {
        continue;
      }


      await saveOpportunity({

        title:
          text,

        description:
          "Tangazo rasmi la nafasi za kazi Tanzania — Public Service Recruitment Secretariat.",

        category:
          "Job",

        country:
          "Tanzania",

        region:
          "East Africa",

        url:
          fullUrl,

        source:
          "Ajira / PSRS",

        deadline:
          extractDeadline(
            text
          )

      });


      count++;


      if (count >= 50) {
        break;
      }

    }


    console.log(
      `📦 Ajira processed: ${count}`
    );


  } catch (error) {

    console.error(
      "❌ Ajira:",
      error.message
    );

  }
}


// ======================================================
// EXTRA TANZANIA FILTER
// ======================================================

async function fetchHESLBNews() {

  console.log("");
  console.log(
    "🇹🇿 Checking HESLB latest news..."
  );


  const url =
    "https://www.heslb.go.tz/news";


  try {

    const response =
      await fetchWithTimeout(url);


    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }


    const html =
      await response.text();


    const regex =
      /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;


    let match;

    let count = 0;


    while (
      (match = regex.exec(html)) !== null
    ) {

      const href =
        match[1];


      const text =
        cleanText(match[2]);


      if (!text) {
        continue;
      }


      if (
        !isRealHESLBOpportunity(text)
      ) {
        continue;
      }


      let fullUrl =
        href;


      if (
        href.startsWith("/")
      ) {

        fullUrl =
          "https://www.heslb.go.tz" +
          href;

      } else if (
        href.startsWith("index.php")
      ) {

        fullUrl =
          "https://www.heslb.go.tz/" +
          href;
      }


      if (!validUrl(fullUrl)) {
        continue;
      }


      await saveOpportunity({

        title:
          text,

        description:
          `HESLB Tanzania: ${text}`,

        category:
          "Scholarship",

        country:
          "Tanzania",

        region:
          "East Africa",

        url:
          fullUrl,

        source:
          "HESLB Tanzania"

      });


      count++;


      if (count >= 20) {
        break;
      }

    }


    console.log(
      `📦 HESLB news opportunities: ${count}`
    );


  } catch (error) {

    console.error(
      "❌ HESLB News:",
      error.message
    );

  }
}


// ======================================================
// DELETE EXPIRED
// ======================================================

async function deleteExpired() {

  console.log("");
  console.log(
    "🧹 Checking expired opportunities..."
  );


  const snapshot =
    await db
      .ref(OPPORTUNITIES_PATH)
      .once("value");


  if (!snapshot.exists()) {

    console.log(
      "ℹ️ Nothing to delete."
    );

    return;
  }


  const now =
    Date.now();


  let deleted = 0;

  const tasks = [];


  snapshot.forEach(
    child => {

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

        tasks.push(

          db
            .ref(
              `${OPPORTUNITIES_PATH}/${child.key}`
            )
            .remove()

            .then(() => {

              console.log(
                "🗑️ Deleted expired:",
                data.title
              );

              deleted++;

            })

        );

      }

    }
  );


  await Promise.all(tasks);


  console.log(
    `🧹 Removed ${deleted} expired opportunities.`
  );
}


// ======================================================
// BOT
// ======================================================

let running = false;


async function runBot() {

  if (running) {

    console.log(
      "⏳ Bot already running..."
    );

    return;
  }


  running = true;


  console.log("");
  console.log(
    "=========================================="
  );

  console.log(
    "🤖 MAKYAMA GLOBAL + TANZANIA BOT V5"
  );

  console.log(
    "=========================================="
  );

  console.log(
    "Time:",
    new Date().toISOString()
  );


  try {

    // CLEAN FIRST

    await deleteExpired();


    // GLOBAL

    await fetchGrantsGov();


    // TANZANIA

    await fetchHESLB();

    await fetchHESLBNews();

    await fetchAjira();


    console.log("");
    console.log(
      "🎉 BOT FINISHED SUCCESSFULLY"
    );


  } catch (error) {

    console.error(
      "❌ BOT ERROR:",
      error.message
    );

  } finally {

    running = false;

  }
}


// ======================================================
// API — ALL
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
          child => {

            opportunities.push({

              id:
                child.key,

              ...child.val()

            });

          }
        );

      }


      opportunities.sort(
        (a, b) =>
          (b.addedAt || 0) -
          (a.addedAt || 0)
      );


      res.json({

        success:
          true,

        count:
          opportunities.length,

        opportunities

      });


    } catch (error) {

      res.status(500).json({

        success:
          false,

        message:
          error.message

      });

    }
  }
);


// ======================================================
// API — FILTER
// ======================================================

app.get(
  "/opportunities/category/:category",
  async (req, res) => {

    try {

      const snapshot =
        await db
          .ref(OPPORTUNITIES_PATH)
          .once("value");


      const list = [];


      if (snapshot.exists()) {

        snapshot.forEach(
          child => {

            const data =
              child.val() || {};


            if (
              String(
                data.category || ""
              ).toLowerCase() ===
              String(
                req.params.category
              ).toLowerCase()
            ) {

              list.push({

                id:
                  child.key,

                ...data

              });

            }

          }
        );

      }


      res.json({

        success:
          true,

        count:
          list.length,

        opportunities:
          list

      });


    } catch (error) {

      res.status(500).json({

        success:
          false,

        message:
          error.message

      });

    }
  }
);


// ======================================================
// API — ONE
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

          success:
            false,

          message:
            "Opportunity haipo."

        });

      }


      res.json({

        success:
          true,

        id:
          req.params.id,

        opportunity:
          snapshot.val()

      });


    } catch (error) {

      res.status(500).json({

        success:
          false,

        message:
          error.message

      });

    }
  }
);


// ======================================================
// MANUAL BOT RUN
// ======================================================

app.post(
  "/bot/run",
  async (req, res) => {

    runBot();


    res.json({

      success:
        true,

      message:
        "MAKYAMA Bot V5 imeanzishwa."

    });

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
          running
            ? "processing"
            : "ready",

        version:
          "5.0",

        sources:
          [
            "Grants.gov",
            "HESLB Tanzania",
            "Ajira / PSRS Tanzania"
          ]

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
        "MAKYAMA GLOBAL + TANZANIA V5",

      version:
        "5.0",

      database:
        "Firebase Realtime Database",

      sources:
        [
          "Grants.gov",
          "HESLB Tanzania",
          "Ajira / PSRS Tanzania"
        ],

      interval:
        "30 minutes"

    });

  }
);


// ======================================================
// START
// ======================================================

app.listen(
  PORT,
  () => {

    console.log("");
    console.log(
      "=========================================="
    );

    console.log(
      "🚀 MAKYAMA BOT V5 ONLINE"
    );

    console.log(
      "=========================================="
    );

    console.log(
      "Port:",
      PORT
    );

    console.log(
      "Interval:",
      "30 minutes"
    );

    console.log(
      "Sources:",
      "Grants.gov + HESLB + Ajira/PSRS"
    );

    console.log(
      "=========================================="
    );


    // RUN IMMEDIATELY

    runBot();


    // EVERY 30 MINUTES

    setInterval(
      runBot,
      BOT_INTERVAL
    );

  }
);
