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


// ======================================================
// SETTINGS
// ======================================================

const BOT_INTERVAL = 30 * 60 * 1000;

const REQUEST_TIMEOUT = 30000;


// ======================================================
// FETCH HELPER
// ======================================================

async function fetchWithTimeout(
  url,
  options = {}
) {

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT
    );

  try {

    const response =
      await fetch(
        url,
        {
          ...options,
          signal:
            controller.signal,

          headers: {
            "User-Agent":
              "MAKYAMA Global Opportunities Bot/1.0",

            "Accept":
              "application/json,text/html,application/xhtml+xml,application/xml",

            ...(options.headers || {})
          }
        }
      );

    return response;

  } finally {

    clearTimeout(timeout);
  }
}


// ======================================================
// CLEAN HTML
// ======================================================

function cleanText(value) {

  if (!value) {
    return "";
  }

  return String(value)

    .replace(
      /<script[\s\S]*?<\/script>/gi,
      " "
    )

    .replace(
      /<style[\s\S]*?<\/style>/gi,
      " "
    )

    .replace(
      /<[^>]+>/g,
      " "
    )

    .replace(
      /&nbsp;/gi,
      " "
    )

    .replace(
      /&amp;/gi,
      "&"
    )

    .replace(
      /&quot;/gi,
      '"'
    )

    .replace(
      /&#39;/gi,
      "'"
    )

    .replace(
      /\s+/g,
      " "
    )

    .trim();
}


// ======================================================
// VALID URL
// ======================================================

function validUrl(url) {

  if (!url) {
    return false;
  }

  try {

    const parsed =
      new URL(url);

    return (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:"
    );

  } catch {

    return false;
  }
}


// ======================================================
// DATABASE ID
// ======================================================

function makeId(
  title,
  url
) {

  return `${title}-${url}`
    .toLowerCase()
    .replace(
      /https?:\/\//g,
      ""
    )
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    )
    .substring(
      0,
      180
    );
}


// ======================================================
// DATE
// ======================================================

function parseDate(value) {

  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    isNaN(
      date.getTime()
    )
  ) {

    return null;
  }

  return date.toISOString();
}


// ======================================================
// CATEGORY
// ======================================================

function detectCategory(
  title,
  description,
  defaultCategory
) {

  const text =
    `${title} ${description}`
      .toLowerCase();

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
    text.includes("funding") ||
    text.includes("award")
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

  return (
    defaultCategory ||
    "Opportunity"
  );
}


// ======================================================
// FUNDING
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
// DEADLINE EXTRACTION
// ======================================================

function extractDeadline(text) {

  if (!text) {
    return null;
  }

  const clean =
    cleanText(text);


  // YYYY-MM-DD

  let match =
    clean.match(
      /\b(20\d{2})[-\/](0?[1-9]|1[0-2])[-\/](0?[1-9]|[12]\d|3[01])\b/
    );


  if (match) {

    const date =
      new Date(
        `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}T23:59:59Z`
      );

    if (
      !isNaN(
        date.getTime()
      )
    ) {

      return date.toISOString();
    }
  }


  // Month DD YYYY

  match =
    clean.match(
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+([0-3]?\d),?\s+(20\d{2})\b/i
    );


  if (match) {

    const date =
      new Date(
        `${match[1]} ${match[2]}, ${match[3]} 23:59:59 UTC`
      );

    if (
      !isNaN(
        date.getTime()
      )
    ) {

      return date.toISOString();
    }
  }


  return null;
}


// ======================================================
// SAVE OPPORTUNITY
// ======================================================

async function saveOpportunity(data) {

  if (
    !data.title ||
    !data.url
  ) {

    return false;
  }


  if (
    !validUrl(
      data.url
    )
  ) {

    return false;
  }


  const title =
    cleanText(
      data.title
    );


  const description =
    cleanText(
      data.description ||
      ""
    );


  const id =
    makeId(
      title,
      data.url
    );


  const ref =
    db.ref(
      `${OPPORTUNITIES_PATH}/${id}`
    );


  const existing =
    await ref.once(
      "value"
    );


  if (
    existing.exists()
  ) {

    return false;
  }


  const record = {

    title,

    description,

    category:
      detectCategory(
        title,
        description,
        data.category
      ),

    country:
      data.country ||
      "Worldwide",

    region:
      data.region ||
      "",

    funding:
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


  await ref.set(
    record
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
    record.category
  );

  console.log(
    "Country:",
    record.country
  );

  console.log(
    "Source:",
    record.source
  );


  return true;
}


// ======================================================
// GRANTS.GOV API
// ======================================================

async function fetchGrantsGov() {

  console.log("");
  console.log(
    "🇺🇸 Checking Grants.gov API..."
  );


  const body = {

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

  };


  try {

    const response =
      await fetchWithTimeout(

        "https://api.grants.gov/v1/api/search2",

        {

          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json",

            "Accept":
              "application/json"

          },

          body:
            JSON.stringify(
              body
            )

        }

      );


    if (
      !response.ok
    ) {

      throw new Error(
        `HTTP ${response.status}`
      );
    }


    const json =
      await response.json();


    const items =
      json?.data?.oppHits ||
      [];


    console.log(
      `📦 Grants.gov: ${items.length}`
    );


    for (
      const item of items
    ) {

      const url =
        item.id
          ? `https://www.grants.gov/search-results-detail/${item.id}`
          : "";


      await saveOpportunity({

        title:
          item.title,

        description:
          `${item.agencyName || ""} ${item.number || ""}`,

        category:
          "Grant",

        country:
          "United States / International",

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
// UN CAREERS RSS
// ======================================================

async function fetchUNJobs() {

  console.log("");
  console.log(
    "🌍 Checking UN Careers..."
  );


  const url =
    "https://careers.un.org/jobfeed?isPage=true&language=en";


  try {

    const response =
      await fetchWithTimeout(
        url
      );


    if (
      !response.ok
    ) {

      throw new Error(
        `HTTP ${response.status}`
      );
    }


    const xml =
      await response.text();


    // Extract RSS items manually.
    // Hatuitegemei parser iliyokuwa inavunjika.

    const items =
      xml.match(
        /<item[\s\S]*?<\/item>/gi
      ) || [];


    console.log(
      `📦 UN items: ${items.length}`
    );


    for (
      const item of items
    ) {

      function getTag(
        tag
      ) {

        const match =
          item.match(
            new RegExp(
              `<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
              "i"
            )
          );

        return match
          ? cleanText(
              match[1]
            )
          : "";
      }


      const title =
        getTag(
          "title"
        );


      const link =
        getTag(
          "link"
        );


      const description =
        getTag(
          "description"
        );


      const pubDate =
        getTag(
          "pubDate"
        );


      if (
        !title ||
        !link
      ) {

        continue;
      }


      await saveOpportunity({

        title,

        description,

        category:
          "Job",

        country:
          "Worldwide",

        url:
          link,

        source:
          "UN Careers",

        publishedAt:
          parseDate(
            pubDate
          ),

        deadline:
          extractDeadline(
            description
          )

      });
    }


  } catch (error) {

    console.error(
      "❌ UN Careers:",
      error.message
    );
  }
}


// ======================================================
// TANZANIA — HESLB
// ======================================================

async function fetchHESLB() {

  console.log("");
  console.log(
    "🇹🇿 Checking HESLB..."
  );


  const url =
    "https://www.heslb.go.tz/index.php/news";


  try {

    const response =
      await fetchWithTimeout(
        url
      );


    if (
      !response.ok
    ) {

      throw new Error(
        `HTTP ${response.status}`
      );
    }


    const html =
      await response.text();


    // Links to HESLB news

    const regex =
      /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;


    let match;

    let count =
      0;


    while (
      (match =
        regex.exec(html)) !==
      null
    ) {

      const href =
        match[1];

      const text =
        cleanText(
          match[2]
        );


      if (
        !text
      ) {

        continue;
      }


      const lower =
        text.toLowerCase();


      const useful =
        lower.includes(
          "scholarship"
        ) ||
        lower.includes(
          "ufadhili"
        ) ||
        lower.includes(
          "loan"
        ) ||
        lower.includes(
          "mikopo"
        ) ||
        lower.includes(
          "application"
        ) ||
        lower.includes(
          "maombi"
        ) ||
        lower.includes(
          "interview"
        );


      if (
        !useful
      ) {

        continue;
      }


      let fullUrl =
        href;


      if (
        href.startsWith(
          "/"
        )
      ) {

        fullUrl =
          "https://www.heslb.go.tz" +
          href;

      } else if (
        href.startsWith(
          "index.php"
        )
      ) {

        fullUrl =
          "https://www.heslb.go.tz/" +
          href;

      }


      if (
        !validUrl(
          fullUrl
        )
      ) {

        continue;
      }


      await saveOpportunity({

        title:
          text,

        description:
          "HESLB Tanzania — Higher Education Students' Loans Board",

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


      if (
        count >= 30
      ) {

        break;
      }
    }


    console.log(
      `📦 HESLB processed: ${count}`
    );


  } catch (error) {

    console.error(
      "❌ HESLB:",
      error.message
    );
  }
}


// ======================================================
// TANZANIA — AJIRA / PSRS
// ======================================================

async function fetchAjira() {

  console.log("");
  console.log(
    "🇹🇿 Checking Ajira / PSRS..."
  );


  const url =
    "https://www.ajira.go.tz/recruitment_management";


  try {

    const response =
      await fetchWithTimeout(
        url
      );


    if (
      !response.ok
    ) {

      throw new Error(
        `HTTP ${response.status}`
      );
    }


    const html =
      await response.text();


    const regex =
      /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;


    let match;

    let count =
      0;


    while (
      (match =
        regex.exec(html)) !==
      null
    ) {

      const href =
        match[1];

      const text =
        cleanText(
          match[2]
        );


      if (
        !text
      ) {

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
        href.startsWith(
          "/"
        )
      ) {

        fullUrl =
          "https://www.ajira.go.tz" +
          href;

      } else if (
        href.startsWith(
          "index.php"
        )
      ) {

        fullUrl =
          "https://www.ajira.go.tz/" +
          href;
      }


      if (
        !validUrl(
          fullUrl
        )
      ) {

        continue;
      }


      await saveOpportunity({

        title:
          text,

        description:
          "Tangazo la nafasi za kazi Tanzania — Public Service Recruitment Secretariat",

        category:
          "Job",

        country:
          "Tanzania",

        region:
          "East Africa",

        url:
          fullUrl,

        source:
          "Ajira / PSRS"

      });


      count++;


      if (
        count >= 50
      ) {

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
// DELETE EXPIRED
// ======================================================

async function deleteExpired() {

  console.log("");
  console.log(
    "🧹 Checking expired opportunities..."
  );


  const snapshot =
    await db
      .ref(
        OPPORTUNITIES_PATH
      )
      .once(
        "value"
      );


  if (
    !snapshot.exists()
  ) {

    console.log(
      "ℹ️ Nothing to delete."
    );

    return;
  }


  const now =
    Date.now();


  let deleted =
    0;


  const tasks = [];


  snapshot.forEach(
    child => {

      const data =
        child.val() ||
        {};


      if (
        !data.deadline
      ) {

        return;
      }


      const deadline =
        new Date(
          data.deadline
        ).getTime();


      if (
        !isNaN(
          deadline
        ) &&
        deadline <
          now
      ) {

        tasks.push(

          db
            .ref(
              `${OPPORTUNITIES_PATH}/${child.key}`
            )
            .remove()

            .then(
              () => {

                console.log(
                  "🗑️ Deleted:",
                  data.title
                );

                deleted++;
              }
            )

        );
      }

    }
  );


  await Promise.all(
    tasks
  );


  console.log(
    `🧹 Removed ${deleted} expired opportunities.`
  );
}


// ======================================================
// RUN BOT
// ======================================================

let running =
  false;


async function runBot() {

  if (
    running
  ) {

    console.log(
      "⏳ Bot already running..."
    );

    return;
  }


  running =
    true;


  console.log("");
  console.log(
    "=========================================="
  );

  console.log(
    "🤖 MAKYAMA GLOBAL + TANZANIA BOT"
  );

  console.log(
    "=========================================="
  );

  console.log(
    new Date().toISOString()
  );


  try {

    // 1
    await deleteExpired();


    // 2
    await fetchGrantsGov();


    // 3
    await fetchUNJobs();


    // 4
    await fetchHESLB();


    // 5
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

    running =
      false;
  }
}


// ======================================================
// API — ALL OPPORTUNITIES
// ======================================================

app.get(
  "/opportunities",
  async (
    req,
    res
  ) => {

    try {

      const snapshot =
        await db
          .ref(
            OPPORTUNITIES_PATH
          )
          .once(
            "value"
          );


      const opportunities =
        [];


      if (
        snapshot.exists()
      ) {

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

      res.status(
        500
      ).json({

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
  async (
    req,
    res
  ) => {

    try {

      const snapshot =
        await db
          .ref(
            `${OPPORTUNITIES_PATH}/${req.params.id}`
          )
          .once(
            "value"
          );


      if (
        !snapshot.exists()
      ) {

        return res.status(
          404
        ).json({

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

      res.status(
        500
      ).json({

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
  async (
    req,
    res
  ) => {

    runBot();


    res.json({

      success:
        true,

      message:
        "Bot imeanzishwa."

    });
  }
);


// ======================================================
// HEALTH
// ======================================================

app.get(
  "/health",
  async (
    req,
    res
  ) => {

    try {

      await db
        .ref(
          OPPORTUNITIES_PATH
        )
        .limitToFirst(1)
        .once(
          "value"
        );


      res.json({

        status:
          "ok",

        firebase:
          "connected",

        bot:
          running
            ? "processing"
            : "ready",

        sources:
          4

      });


    } catch (error) {

      res.status(
        500
      ).json({

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
  (
    req,
    res
  ) => {

    res.json({

      status:
        "online",

      bot:
        "MAKYAMA GLOBAL + TANZANIA",

      version:
        "4.0",

      database:
        "Firebase Realtime Database",

      sources:
        [
          "Grants.gov",
          "UN Careers",
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
      4
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


    // Every 30 minutes
    setInterval(
      runBot,
      BOT_INTERVAL
    );

  }
);
