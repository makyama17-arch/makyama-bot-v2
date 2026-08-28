const express = require("express");
const admin = require("firebase-admin");
const Parser = require("rss-parser");

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


// ======================================================
// RSS PARSER
// ======================================================

const parser = new Parser({
  timeout: 30000,

  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; MAKYAMA-Bot/3.1)"
  },

  customFields: {
    item: [
      ["deadline", "deadline"],
      ["closingDate", "closingDate"],
      ["dueDate", "dueDate"],
      ["applicationDeadline", "applicationDeadline"]
    ]
  }
});


// ======================================================
// SETTINGS
// ======================================================

const OPPORTUNITIES_PATH =
  "opportunities";

const BOT_INTERVAL =
  30 * 60 * 1000;


// ======================================================
// SOURCES
// ======================================================

const RSS_SOURCES = [

  // ------------------------------------------
  // GRANTS.GOV
  // ------------------------------------------

  {
    name: "Grants.gov",
    category: "Grant",
    country: "United States / International",

    url:
      "https://www.grants.gov/rss/GG_OppModByCategory.xml"
  },


  // ------------------------------------------
  // NIH
  // ------------------------------------------

  {
    name: "NIH Funding",
    category: "Grant",
    country: "United States / International",

    url:
      "https://grants.nih.gov/grants/guide/newsfeed/fundingopps.xml"
  },


  // ------------------------------------------
  // NSF FUNDING
  // ------------------------------------------

  {
    name: "NSF Funding",
    category: "Grant",
    country: "United States / International",

    url:
      "https://www.nsf.gov/rss/rss_www_funding_pgm_annc_inf.xml"
  },


  // ------------------------------------------
  // NSF UPCOMING DEADLINES
  // ------------------------------------------

  {
    name: "NSF Upcoming Deadlines",
    category: "Grant",
    country: "United States / International",

    url:
      "https://www.nsf.gov/rss/rss_www_funding_upcoming.xml"
  }

];


// ======================================================
// CLEAN TEXT
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
      /<[^>]*>/g,
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

function validUrl(value) {

  if (!value) {
    return false;
  }

  try {

    const url =
      new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );

  } catch {

    return false;
  }
}


// ======================================================
// DATABASE ID
// ======================================================

function createId(
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
// DEADLINE
// ======================================================

function extractDeadline(item) {

  const fields = [

    item.deadline,

    item.deadlineDate,

    item.applicationDeadline,

    item.closingDate,

    item.closeDate,

    item.dueDate

  ];


  for (
    const field of fields
  ) {

    if (!field) {
      continue;
    }

    const date =
      parseDate(field);

    if (date) {
      return date;
    }
  }


  const text =
    cleanText(

      item.contentSnippet ||
      item.content ||
      item.description ||
      item.summary ||
      ""

    );


  // YYYY-MM-DD

  let match =
    text.match(
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


  return null;
}


// ======================================================
// DESCRIPTION
// ======================================================

function getDescription(item) {

  return cleanText(

    item.contentSnippet ||
    item.summary ||
    item.description ||
    item.content ||
    ""

  );
}


// ======================================================
// CATEGORY
// ======================================================

function detectCategory(
  title,
  description,
  sourceCategory
) {

  const text =
    `${title} ${description}`
      .toLowerCase();


  if (
    text.includes("scholarship")
  ) {
    return "Scholarship";
  }


  if (
    text.includes("fellowship")
  ) {
    return "Fellowship";
  }


  if (
    text.includes("internship")
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
    text.includes("competition") ||
    text.includes("contest")
  ) {
    return "Competition";
  }


  if (
    text.includes("hackathon")
  ) {
    return "Hackathon";
  }


  if (
    text.includes("job") ||
    text.includes("career")
  ) {
    return "Job";
  }


  return (
    sourceCategory ||
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
    text.includes("funded")
  ) {

    return "Funded";
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

async function saveOpportunity(
  item,
  source
) {

  const title =
    cleanText(
      item.title
    );


  const url =
    item.link ||
    item.guid ||
    "";


  if (!title) {
    return;
  }


  if (!validUrl(url)) {

    console.log(
      "⚠️ Invalid URL:",
      title
    );

    return;
  }


  const id =
    createId(
      title,
      url
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

    return;
  }


  const description =
    getDescription(
      item
    );


  const data = {

    title,

    description,

    category:
      detectCategory(
        title,
        description,
        source.category
      ),

    country:
      source.country,

    funding:
      detectFunding(
        title,
        description
      ),

    deadline:
      extractDeadline(
        item
      ),

    officialUrl:
      url,

    source:
      source.name,

    publishedAt:
      parseDate(
        item.isoDate ||
        item.pubDate
      ),

    addedAt:
      Date.now(),

    status:
      "active"
  };


  await ref.set(
    data
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
    data.category
  );

  console.log(
    "Source:",
    source.name
  );
}


// ======================================================
// FETCH SOURCE
// ======================================================

async function fetchSource(
  source
) {

  console.log("");
  console.log(
    "📡 Checking:",
    source.name
  );


  try {

    const feed =
      await parser.parseURL(
        source.url
      );


    const items =
      feed.items || [];


    console.log(
      `📦 Found ${items.length} items`
    );


    for (
      const item of items
    ) {

      try {

        await saveOpportunity(
          item,
          source
        );

      } catch (error) {

        console.error(
          "⚠️ Item error:",
          error.message
        );
      }
    }


  } catch (error) {

    console.error(
      `❌ RSS ERROR: ${source.name}`
    );

    console.error(
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
    "🧹 Cleaning expired opportunities..."
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
      "ℹ️ No opportunities."
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
        child.val() || {};


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
                "🗑️ Deleted:",
                data.title
              );

              deleted++;

            })

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
// BOT
// ======================================================

let botRunning =
  false;


async function runBot() {

  if (
    botRunning
  ) {

    console.log(
      "⏳ Bot bado ina-run..."
    );

    return;
  }


  botRunning =
    true;


  console.log("");
  console.log(
    "=========================================="
  );

  console.log(
    "🤖 MAKYAMA GLOBAL OPPORTUNITY BOT"
  );

  console.log(
    "=========================================="
  );

  console.log(
    "Time:",
    new Date().toISOString()
  );


  try {

    // CLEAN
    await deleteExpired();


    // SOURCES
    for (
      const source of RSS_SOURCES
    ) {

      await fetchSource(
        source
      );
    }


    console.log("");
    console.log(
      "✅ BOT FINISHED"
    );


  } catch (error) {

    console.error(
      "❌ BOT ERROR:",
      error
    );


  } finally {

    botRunning =
      false;
  }
}


// ======================================================
// GET OPPORTUNITIES
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

      console.error(
        error
      );


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
// GET ONE
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
// MANUAL RUN
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
          botRunning
            ? "processing"
            : "ready",

        sources:
          RSS_SOURCES.length

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
        "MAKYAMA GLOBAL OPPORTUNITY BOT",

      version:
        "3.1",

      database:
        "Firebase Realtime Database",

      sources:
        RSS_SOURCES.length,

      interval:
        "30 minutes"

    });
  }
);


// ======================================================
// SERVER
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
      RSS_SOURCES.length
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
