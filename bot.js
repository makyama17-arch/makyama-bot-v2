// ============================================================
// MAKYAMA GLOBAL OPPORTUNITIES BOT V10
// ============================================================
// GLOBAL COUNTRY COVERAGE
//
// FEATURES
// ------------------------------------------------------------
// 1. 195 countries catalog
// 2. Country API even when country has zero opportunities
// 3. Global opportunities
// 4. Jobs
// 5. Scholarships
// 6. Grants
// 7. Internships
// 8. Events
// 9. News / Announcements
// 10. Country updates
// 11. Grants.gov posted opportunities
// 12. Remotive remote jobs
// 13. RSS / Google News country discovery
// 14. Official publication dates preserved
// 15. No fake Date.now() publication dates
// 16. Expired opportunity cleanup
// 17. Invalid URL cleanup
// 18. Duplicate protection
// 19. Search API
// 20. Country statistics API
// 21. Single opportunity details API
// 22. Ads API
//
// NODE:
// Node.js 18+
//
// PACKAGES:
// express
// firebase-admin
//
// ============================================================

const express = require("express");
const admin = require("firebase-admin");

const app = express();

const PORT = process.env.PORT || 10000;

app.use(
  express.json({
    limit: "3mb"
  })
);

// ============================================================
// CONFIG
// ============================================================

const BOT_VERSION = "10.0.0";

const CHECK_INTERVAL =
  30 * 60 * 1000;

const USER_AGENT =
  "MAKYAMA-Global-Opportunities-Bot/10.0 (+https://makyama.vercel.app)";

const MAX_REMOTIVE_JOBS = 100;

const MAX_GRANTS = 100;

const MAX_RSS_ITEMS_PER_COUNTRY = 8;

const REQUEST_TIMEOUT = 20000;

const DAYS_TO_KEEP_NEWS = 90;

const DAYS_TO_KEEP_OPPORTUNITIES = 365;

// ============================================================
// FIREBASE
// ============================================================

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error(
    "❌ FIREBASE_SERVICE_ACCOUNT is missing!"
  );

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

if (!admin.apps.length) {
  admin.initializeApp({
    credential:
      admin.credential.cert(
        serviceAccount
      ),

    databaseURL:
      process.env.FIREBASE_DATABASE_URL ||
      "https://makyama-e5e89-default-rtdb.firebaseio.com/"
  });
}

const db = admin.database();

// ============================================================
// COUNTRY DATABASE
// 195 COUNTRIES
// ============================================================

const COUNTRIES = [
  {
    code: "AF",
    name: "Afghanistan"
  },
  {
    code: "AL",
    name: "Albania"
  },
  {
    code: "DZ",
    name: "Algeria"
  },
  {
    code: "AD",
    name: "Andorra"
  },
  {
    code: "AO",
    name: "Angola"
  },
  {
    code: "AG",
    name: "Antigua and Barbuda"
  },
  {
    code: "AR",
    name: "Argentina"
  },
  {
    code: "AM",
    name: "Armenia"
  },
  {
    code: "AU",
    name: "Australia"
  },
  {
    code: "AT",
    name: "Austria"
  },
  {
    code: "AZ",
    name: "Azerbaijan"
  },

  {
    code: "BS",
    name: "Bahamas"
  },
  {
    code: "BH",
    name: "Bahrain"
  },
  {
    code: "BD",
    name: "Bangladesh"
  },
  {
    code: "BB",
    name: "Barbados"
  },
  {
    code: "BY",
    name: "Belarus"
  },
  {
    code: "BE",
    name: "Belgium"
  },
  {
    code: "BZ",
    name: "Belize"
  },
  {
    code: "BJ",
    name: "Benin"
  },
  {
    code: "BT",
    name: "Bhutan"
  },
  {
    code: "BO",
    name: "Bolivia"
  },
  {
    code: "BA",
    name: "Bosnia and Herzegovina"
  },
  {
    code: "BW",
    name: "Botswana"
  },
  {
    code: "BR",
    name: "Brazil"
  },
  {
    code: "BN",
    name: "Brunei"
  },
  {
    code: "BG",
    name: "Bulgaria"
  },
  {
    code: "BF",
    name: "Burkina Faso"
  },
  {
    code: "BI",
    name: "Burundi"
  },

  {
    code: "CV",
    name: "Cabo Verde"
  },
  {
    code: "KH",
    name: "Cambodia"
  },
  {
    code: "CM",
    name: "Cameroon"
  },
  {
    code: "CA",
    name: "Canada"
  },
  {
    code: "CF",
    name: "Central African Republic"
  },
  {
    code: "TD",
    name: "Chad"
  },
  {
    code: "CL",
    name: "Chile"
  },
  {
    code: "CN",
    name: "China"
  },
  {
    code: "CO",
    name: "Colombia"
  },
  {
    code: "KM",
    name: "Comoros"
  },
  {
    code: "CG",
    name: "Congo"
  },
  {
    code: "CD",
    name: "Democratic Republic of the Congo"
  },
  {
    code: "CR",
    name: "Costa Rica"
  },
  {
    code: "CI",
    name: "Côte d'Ivoire"
  },
  {
    code: "HR",
    name: "Croatia"
  },
  {
    code: "CU",
    name: "Cuba"
  },
  {
    code: "CY",
    name: "Cyprus"
  },
  {
    code: "CZ",
    name: "Czechia"
  },

  {
    code: "DK",
    name: "Denmark"
  },
  {
    code: "DJ",
    name: "Djibouti"
  },
  {
    code: "DM",
    name: "Dominica"
  },
  {
    code: "DO",
    name: "Dominican Republic"
  },

  {
    code: "EC",
    name: "Ecuador"
  },
  {
    code: "EG",
    name: "Egypt"
  },
  {
    code: "SV",
    name: "El Salvador"
  },
  {
    code: "GQ",
    name: "Equatorial Guinea"
  },
  {
    code: "ER",
    name: "Eritrea"
  },
  {
    code: "EE",
    name: "Estonia"
  },
  {
    code: "SZ",
    name: "Eswatini"
  },
  {
    code: "ET",
    name: "Ethiopia"
  },

  {
    code: "FJ",
    name: "Fiji"
  },
  {
    code: "FI",
    name: "Finland"
  },
  {
    code: "FR",
    name: "France"
  },

  {
    code: "GA",
    name: "Gabon"
  },
  {
    code: "GM",
    name: "Gambia"
  },
  {
    code: "GE",
    name: "Georgia"
  },
  {
    code: "DE",
    name: "Germany"
  },
  {
    code: "GH",
    name: "Ghana"
  },
  {
    code: "GR",
    name: "Greece"
  },
  {
    code: "GD",
    name: "Grenada"
  },
  {
    code: "GT",
    name: "Guatemala"
  },
  {
    code: "GN",
    name: "Guinea"
  },
  {
    code: "GW",
    name: "Guinea-Bissau"
  },
  {
    code: "GY",
    name: "Guyana"
  },

  {
    code: "HT",
    name: "Haiti"
  },
  {
    code: "HN",
    name: "Honduras"
  },
  {
    code: "HU",
    name: "Hungary"
  },

  {
    code: "IS",
    name: "Iceland"
  },
  {
    code: "IN",
    name: "India"
  },
  {
    code: "ID",
    name: "Indonesia"
  },
  {
    code: "IR",
    name: "Iran"
  },
  {
    code: "IQ",
    name: "Iraq"
  },
  {
    code: "IE",
    name: "Ireland"
  },
  {
    code: "IL",
    name: "Israel"
  },
  {
    code: "IT",
    name: "Italy"
  },

  {
    code: "JM",
    name: "Jamaica"
  },
  {
    code: "JP",
    name: "Japan"
  },
  {
    code: "JO",
    name: "Jordan"
  },

  {
    code: "KZ",
    name: "Kazakhstan"
  },
  {
    code: "KE",
    name: "Kenya"
  },
  {
    code: "KI",
    name: "Kiribati"
  },
  {
    code: "KP",
    name: "North Korea"
  },
  {
    code: "KR",
    name: "South Korea"
  },
  {
    code: "KW",
    name: "Kuwait"
  },
  {
    code: "KG",
    name: "Kyrgyzstan"
  },

  {
    code: "LA",
    name: "Laos"
  },
  {
    code: "LV",
    name: "Latvia"
  },
  {
    code: "LB",
    name: "Lebanon"
  },
  {
    code: "LS",
    name: "Lesotho"
  },
  {
    code: "LR",
    name: "Liberia"
  },
  {
    code: "LY",
    name: "Libya"
  },
  {
    code: "LI",
    name: "Liechtenstein"
  },
  {
    code: "LT",
    name: "Lithuania"
  },
  {
    code: "LU",
    name: "Luxembourg"
  },

  {
    code: "MG",
    name: "Madagascar"
  },
  {
    code: "MW",
    name: "Malawi"
  },
  {
    code: "MY",
    name: "Malaysia"
  },
  {
    code: "MV",
    name: "Maldives"
  },
  {
    code: "ML",
    name: "Mali"
  },
  {
    code: "MT",
    name: "Malta"
  },
  {
    code: "MH",
    name: "Marshall Islands"
  },
  {
    code: "MR",
    name: "Mauritania"
  },
  {
    code: "MU",
    name: "Mauritius"
  },
  {
    code: "MX",
    name: "Mexico"
  },
  {
    code: "FM",
    name: "Micronesia"
  },
  {
    code: "MD",
    name: "Moldova"
  },
  {
    code: "MC",
    name: "Monaco"
  },
  {
    code: "MN",
    name: "Mongolia"
  },
  {
    code: "ME",
    name: "Montenegro"
  },
  {
    code: "MA",
    name: "Morocco"
  },
  {
    code: "MZ",
    name: "Mozambique"
  },
  {
    code: "MM",
    name: "Myanmar"
  },

  {
    code: "NA",
    name: "Namibia"
  },
  {
    code: "NR",
    name: "Nauru"
  },
  {
    code: "NP",
    name: "Nepal"
  },
  {
    code: "NL",
    name: "Netherlands"
  },
  {
    code: "NZ",
    name: "New Zealand"
  },
  {
    code: "NI",
    name: "Nicaragua"
  },
  {
    code: "NE",
    name: "Niger"
  },
  {
    code: "NG",
    name: "Nigeria"
  },
  {
    code: "MK",
    name: "North Macedonia"
  },
  {
    code: "NO",
    name: "Norway"
  },

  {
    code: "OM",
    name: "Oman"
  },

  {
    code: "PK",
    name: "Pakistan"
  },
  {
    code: "PW",
    name: "Palau"
  },
  {
    code: "PA",
    name: "Panama"
  },
  {
    code: "PG",
    name: "Papua New Guinea"
  },
  {
    code: "PY",
    name: "Paraguay"
  },
  {
    code: "PE",
    name: "Peru"
  },
  {
    code: "PH",
    name: "Philippines"
  },
  {
    code: "PL",
    name: "Poland"
  },
  {
    code: "PT",
    name: "Portugal"
  },

  {
    code: "QA",
    name: "Qatar"
  },

  {
    code: "RO",
    name: "Romania"
  },
  {
    code: "RU",
    name: "Russia"
  },
  {
    code: "RW",
    name: "Rwanda"
  },

  {
    code: "KN",
    name: "Saint Kitts and Nevis"
  },
  {
    code: "LC",
    name: "Saint Lucia"
  },
  {
    code: "VC",
    name: "Saint Vincent and the Grenadines"
  },
  {
    code: "WS",
    name: "Samoa"
  },
  {
    code: "SM",
    name: "San Marino"
  },
  {
    code: "ST",
    name: "Sao Tome and Principe"
  },
  {
    code: "SA",
    name: "Saudi Arabia"
  },
  {
    code: "SN",
    name: "Senegal"
  },
  {
    code: "RS",
    name: "Serbia"
  },
  {
    code: "SC",
    name: "Seychelles"
  },
  {
    code: "SL",
    name: "Sierra Leone"
  },
  {
    code: "SG",
    name: "Singapore"
  },
  {
    code: "SK",
    name: "Slovakia"
  },
  {
    code: "SI",
    name: "Slovenia"
  },
  {
    code: "SB",
    name: "Solomon Islands"
  },
  {
    code: "SO",
    name: "Somalia"
  },
  {
    code: "ZA",
    name: "South Africa"
  },
  {
    code: "SS",
    name: "South Sudan"
  },
  {
    code: "ES",
    name: "Spain"
  },
  {
    code: "LK",
    name: "Sri Lanka"
  },
  {
    code: "SD",
    name: "Sudan"
  },
  {
    code: "SR",
    name: "Suriname"
  },
  {
    code: "SE",
    name: "Sweden"
  },
  {
    code: "CH",
    name: "Switzerland"
  },
  {
    code: "SY",
    name: "Syria"
  },

  {
    code: "TJ",
    name: "Tajikistan"
  },
  {
    code: "TZ",
    name: "Tanzania"
  },
  {
    code: "TH",
    name: "Thailand"
  },
  {
    code: "TL",
    name: "Timor-Leste"
  },
  {
    code: "TG",
    name: "Togo"
  },
  {
    code: "TO",
    name: "Tonga"
  },
  {
    code: "TT",
    name: "Trinidad and Tobago"
  },
  {
    code: "TN",
    name: "Tunisia"
  },
  {
    code: "TR",
    name: "Türkiye"
  },
  {
    code: "TM",
    name: "Turkmenistan"
  },
  {
    code: "TV",
    name: "Tuvalu"
  },

  {
    code: "UG",
    name: "Uganda"
  },
  {
    code: "UA",
    name: "Ukraine"
  },
  {
    code: "AE",
    name: "United Arab Emirates"
  },
  {
    code: "GB",
    name: "United Kingdom"
  },
  {
    code: "US",
    name: "United States"
  },
  {
    code: "UY",
    name: "Uruguay"
  },
  {
    code: "UZ",
    name: "Uzbekistan"
  },

  {
    code: "VU",
    name: "Vanuatu"
  },
  {
    code: "VA",
    name: "Vatican City"
  },
  {
    code: "VE",
    name: "Venezuela"
  },
  {
    code: "VN",
    name: "Vietnam"
  },

  {
    code: "YE",
    name: "Yemen"
  },

  {
    code: "ZM",
    name: "Zambia"
  },
  {
    code: "ZW",
    name: "Zimbabwe"
  }
];

// ============================================================
// COUNTRY ALIASES
// ============================================================

const COUNTRY_ALIASES = {

  usa: "United States",
  us: "United States",
  "u.s.": "United States",
  "u.s.a.": "United States",
  america: "United States",

  uk: "United Kingdom",
  britain: "United Kingdom",
  "great britain": "United Kingdom",
  "u.k.": "United Kingdom",

  tz: "Tanzania",
  tanzania: "Tanzania",

  ke: "Kenya",
  kenya: "Kenya",

  ug: "Uganda",
  uganda: "Uganda",

  rw: "Rwanda",
  rwanda: "Rwanda",

  drc: "Democratic Republic of the Congo",
  congo: "Republic of the Congo",

  "south korea": "South Korea",
  korea: "South Korea",

  "north korea": "North Korea",

  turkey: "Türkiye",

  czech: "Czechia",

  "ivory coast": "Côte d'Ivoire",

  swaziland: "Eswatini",

  burma: "Myanmar",

  palestine: "Palestine"
};

// ============================================================
// COUNTRY LOOKUPS
// ============================================================

function getCountryByName(name) {

  if (!name) {
    return null;
  }

  const normalized =
    String(name)
      .trim()
      .toLowerCase();

  const alias =
    COUNTRY_ALIASES[
      normalized
    ];

  if (alias) {
    return alias;
  }

  const found =
    COUNTRIES.find(
      country =>
        country.name
          .toLowerCase() ===
        normalized
    );

  return found
    ? found.name
    : null;
}

function getCountryCode(name) {

  const countryName =
    getCountryByName(name);

  if (!countryName) {
    return null;
  }

  const country =
    COUNTRIES.find(
      item =>
        item.name ===
        countryName
    );

  return country
    ? country.code
    : null;
}

// ============================================================
// COUNTRY DETECTION
// ============================================================

function detectCountry(text) {

  if (!text) {
    return "International";
  }

  const value =
    String(text)
      .toLowerCase();

  // Longest names first
  // prevents "congo" matching before
  // "democratic republic of the congo"

  const names = [
    ...COUNTRIES
      .map(
        item =>
          item.name
      ),

    ...Object.keys(
      COUNTRY_ALIASES
    )
  ]
    .sort(
      (a, b) =>
        b.length - a.length
    );

  for (
    const name
    of names
  ) {

    const escaped =
      name.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

    const regex =
      new RegExp(
        `(^|[^a-z])${escaped.toLowerCase()}([^a-z]|$)`,
        "i"
      );

    if (
      regex.test(value)
    ) {

      return (
        COUNTRY_ALIASES[
          name.toLowerCase()
        ] ||
        name
      );
    }
  }

  return "International";
}

// ============================================================
// NORMALIZE COUNTRY
// ============================================================

function normalizeCountry(
  country
) {

  if (!country) {
    return "International";
  }

  return (
    getCountryByName(
      country
    ) ||
    country
      .toString()
      .trim()
  );
}

// ============================================================
// CATEGORY
// ============================================================

function normalizeCategory(
  category
) {

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
    value.includes("education") ||
    value.includes("study")
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
    value.includes("work")
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
// URL
// ============================================================

function validURL(
  value
) {

  if (
    !value ||
    typeof value !== "string"
  ) {
    return false;
  }

  try {

    const url =
      new URL(
        value.trim()
      );

    return (
      (
        url.protocol ===
          "http:" ||
        url.protocol ===
          "https:"
      ) &&
      !!url.hostname
    );

  } catch {

    return false;
  }
}

function cleanURL(
  value
) {

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
// DATE
// ============================================================

function parseOfficialDate(
  value
) {

  if (!value) {
    return null;
  }

  if (
    value instanceof Date
  ) {

    const time =
      value.getTime();

    return Number.isFinite(
      time
    )
      ? time
      : null;
  }

  const text =
    String(value)
      .trim();

  if (!text) {
    return null;
  }

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

    return Number.isFinite(
      time
    )
      ? time
      : null;
  }

  // MM/DD/YYYY

  if (
    /^\d{1,2}\/\d{1,2}\/\d{4}$/
      .test(text)
  ) {

    const [
      month,
      day,
      year
    ] =
      text
        .split("/")
        .map(Number);

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

    return Number.isFinite(
      time
    )
      ? time
      : null;
  }

  const parsed =
    Date.parse(text);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}

// ============================================================
// DESCRIPTION
// ============================================================

function cleanDescription(
  value
) {

  if (!value) {
    return "";
  }

  let text =
    String(value);

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

  text =
    text.replace(
      /<[^>]+>/g,
      " "
    );

  text =
    text
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
        /&lt;/gi,
        "<"
      )
      .replace(
        /&gt;/gi,
        ">"
      );

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
// SLUG / ID
// ============================================================

function makeID(
  title,
  url
) {

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
      .slice(
        0,
        160
      );

  return text;
}

// ============================================================
// HASH ID
// ============================================================

function hashString(
  text
) {

  let hash = 0;

  const value =
    String(text);

  for (
    let i = 0;
    i < value.length;
    i++
  ) {

    hash =
      (
        (
          hash << 5
        ) -
        hash +
        value.charCodeAt(i)
      ) |
      0;
  }

  return Math.abs(
    hash
  ).toString(
    36
  );
}

// ============================================================
// FETCH WITH TIMEOUT
// ============================================================

async function fetchWithTimeout(
  url,
  options = {}
) {

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      REQUEST_TIMEOUT
    );

  try {

    return await fetch(
      url,
      {
        ...options,

        signal:
          controller.signal,

        headers: {

          "User-Agent":
            USER_AGENT,

          Accept:
            "*/*",

          ...(options.headers ||
            {})
        }
      }
    );

  } finally {

    clearTimeout(
      timeout
    );
  }
}

// ============================================================
// FETCH JSON
// ============================================================

async function fetchJSON(
  url,
  options = {}
) {

  const response =
    await fetchWithTimeout(
      url,
      {
        ...options,

        headers: {

          Accept:
            "application/json,text/plain,*/*",

          ...(options.headers ||
            {})
        }
      }
    );

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

async function fetchText(
  url,
  options = {}
) {

  const response =
    await fetchWithTimeout(
      url,
      {
        ...options,

        headers: {

          Accept:
            "text/xml,application/xml,text/html,*/*",

          ...(options.headers ||
            {})
        }
      }
    );

  if (!response.ok) {

    throw new Error(
      `HTTP ${response.status} ${response.statusText}`
    );
  }

  return await response.text();
}

// ============================================================
// XML HELPERS
// ============================================================

function decodeXML(
  value
) {

  return String(
    value || ""
  )
    .replace(
      /<!CDATA\[([\s\S]*?)\]>/gi,
      "$1"
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
      /&lt;/gi,
      "<"
    )
    .replace(
      /&gt;/gi,
      ">"
    );
}

function extractXMLTags(
  xml,
  tag
) {

  const results = [];

  const regex =
    new RegExp(
      `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
      "gi"
    );

  let match;

  while (
    (match =
      regex.exec(xml))
  ) {

    results.push(
      decodeXML(
        match[1]
      ).trim()
    );
  }

  return results;
}

// ============================================================
// RSS PARSER
// ============================================================

function parseRSS(
  xml
) {

  const items = [];

  const itemRegex =
    /<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi;

  let match;

  while (
    (match =
      itemRegex.exec(xml))
  ) {

    const block =
      match[2];

    const title =
      firstXMLValue(
        block,
        [
          "title"
        ]
      );

    const link =
      firstXMLValue(
        block,
        [
          "link"
        ]
      ) ||
      extractAtomLink(
        block
      );

    const description =
      firstXMLValue(
        block,
        [
          "description",
          "summary",
          "content"
        ]
      );

    const pubDate =
      firstXMLValue(
        block,
        [
          "pubDate",
          "published",
          "updated",
          "date"
        ]
      );

    if (
      title &&
      link &&
      validURL(link)
    ) {

      items.push({
        title:
          cleanDescription(
            title
          ),

        url:
          link.trim(),

        description:
          cleanDescription(
            description
          ),

        publishedAt:
          parseOfficialDate(
            pubDate
          )
      });
    }
  }

  return items;
}

function firstXMLValue(
  xml,
  tags
) {

  for (
    const tag
    of tags
  ) {

    const regex =
      new RegExp(
        `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
        "i"
      );

    const match =
      xml.match(
        regex
      );

    if (
      match &&
      match[1]
    ) {

      return decodeXML(
        match[1]
      ).trim();
    }
  }

  return "";
}

function extractAtomLink(
  xml
) {

  const match =
    xml.match(
      /<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i
    );

  return match
    ? decodeXML(
        match[1]
      )
    : "";
}

// ============================================================
// SAVE OPPORTUNITY
// ============================================================

async function saveOpportunity(
  data
) {

  try {

    const title =
      String(
        data.title || ""
      ).trim();

    const url =
      cleanURL(
        data.url
      );

    if (!title) {

      console.log(
        "⚠️ SKIPPED: missing title"
      );

      return {
        saved: false,
        reason:
          "missing_title"
      };
    }

    if (!url) {

      console.log(
        "⚠️ SKIPPED:",
        title,
        "| invalid URL"
      );

      return {
        saved: false,
        reason:
          "invalid_url"
      };
    }

    // --------------------------------------------------------
    // PUBLICATION DATE
    // --------------------------------------------------------
    //
    // IMPORTANT:
    // Do NOT use Date.now() here as publication date.
    //
    // If source does not give publication date,
    // publishedAt remains null.
    //
    // createdAt is separate.
    //

    const publishedAt =
      parseOfficialDate(
        data.publishedAt
      );

    const deadlineAt =
      parseOfficialDate(
        data.deadline
      );

    const country =
      normalizeCountry(
        data.country
      );

    const countries =
      Array.isArray(
        data.countries
      )
        ? [
            ...new Set(
              data.countries
                .map(
                  normalizeCountry
                )
                .filter(Boolean)
            )
          ]
        : [
            country
          ];

    const source =
      String(
        data.source ||
          "Unknown"
      ).trim();

    const id =
      String(
        data.id ||
          makeID(
            title,
            url
          )
      );

    const now =
      Date.now();

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

      country,

      countryCode:
        getCountryCode(
          country
        ),

      countries,

      source,

      sourceType:
        data.sourceType ||
        "opportunity",

      url,

      applyUrl:
        cleanURL(
          data.applyUrl
        ) || url,

      detailsUrl:
        cleanURL(
          data.detailsUrl
        ) || url,

      image:
        cleanURL(
          data.image
        ),

      deadline:
        data.deadline ||
        "",

      deadlineAt:
        deadlineAt || null,

      publishedAt:
        publishedAt || null,

      publishedDate:
        publishedAt
          ? new Date(
              publishedAt
            ).toISOString()
          : null,

      createdAt:
        data.createdAt ||
        now,

      updatedAt:
        now,

      active:
        data.active !== false,

      sourceStatus:
        data.sourceStatus ||
        "active",

      verified:
        data.verified !== false,

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
        .ref(
          "opportunities"
        )
        .child(id);

    const existing =
      await ref.once(
        "value"
      );

    if (
      existing.exists()
    ) {

      const old =
        existing.val() ||
        {};

      // IMPORTANT:
      // If source now gives no date,
      // preserve old official date.

      const finalPublishedAt =
        publishedAt ||
        parseOfficialDate(
          old.publishedAt
        ) ||
        null;

      const finalPublishedDate =
        finalPublishedAt
          ? new Date(
              finalPublishedAt
            ).toISOString()
          : null;

      await ref.update({

        ...opportunity,

        publishedAt:
          finalPublishedAt,

        publishedDate:
          finalPublishedDate,

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

      return {
        saved: false,
        updated: true,
        id
      };
    }

    await ref.set(
      opportunity
    );

    console.log(
      "✅ NEW:",
      title,
      "|",
      country,
      "|",
      source
    );

    return {
      saved: true,
      updated: false,
      id
    };

  } catch (error) {

    console.error(
      "❌ SAVE ERROR:",
      error.message
    );

    return {
      saved: false,
      reason:
        "save_error"
    };
  }
}

// ============================================================
// SAVE COUNTRY SOURCE
// ============================================================
//
// This is NOT treated as a new opportunity.
// This prevents fake "published today" records.
//

async function saveCountrySource(
  data
) {

  try {

    const country =
      normalizeCountry(
        data.country
      );

    const code =
      getCountryCode(
        country
      );

    if (!code) {
      return false;
    }

    const sourceId =
      hashString(
        `${country}|${data.url}`
      );

    const record = {

      id:
        sourceId,

      country,

      countryCode:
        code,

      name:
        data.name ||
        country,

      source:
        data.source ||
        "Unknown",

      url:
        cleanURL(
          data.url
        ),

      type:
        data.type ||
        "official",

      updatedAt:
        Date.now()
    };

    if (!record.url) {
      return false;
    }

    await db
      .ref(
        `countrySources/${code}/${sourceId}`
      )
      .set(
        record
      );

    return true;

  } catch (error) {

    console.error(
      "❌ country source error:",
      error.message
    );

    return false;
  }
}

// ============================================================
// INITIALIZE ALL 195 COUNTRIES
// ============================================================

async function initializeCountries() {

  console.log(
    "🌍 Initializing country catalog..."
  );

  const updates = {};

  for (
    const country
    of COUNTRIES
  ) {

    updates[
      country.code
    ] = {

      code:
        country.code,

      name:
        country.name,

      opportunityCount:
        0,

      latestPublishedAt:
        null,

      latestPublishedDate:
        null,

      status:
        "no_verified_updates_yet",

      updatedAt:
        Date.now()
    };
  }

  await db
    .ref("countries")
    .update(
      updates
    );

  console.log(
    "🌍 Countries initialized:",
    COUNTRIES.length
  );
}

// ============================================================
// UPDATE COUNTRY STATISTICS
// ============================================================

async function updateCountryStatistics() {

  console.log(
    "📊 Updating country statistics..."
  );

  try {

    const snap =
      await db
        .ref(
          "opportunities"
        )
        .once(
          "value"
        );

    const stats = {};

    for (
      const country
      of COUNTRIES
    ) {

      stats[
        country.code
      ] = {

        code:
          country.code,

        name:
          country.name,

        opportunityCount:
          0,

        latestPublishedAt:
          null,

        latestPublishedDate:
          null,

        status:
          "no_verified_updates_yet"
      };
    }

    snap.forEach(
      child => {

        const item =
          child.val();

        if (!item) {
          return;
        }

        if (
          item.active === false
        ) {
          return;
        }

        const country =
          normalizeCountry(
            item.country
          );

        const code =
          getCountryCode(
            country
          );

        if (!code) {
          return;
        }

        if (
          !stats[code]
        ) {
          return;
        }

        stats[code]
          .opportunityCount++;

        const published =
          parseOfficialDate(
            item.publishedAt
          );

        if (
          published &&
          (
            !stats[code]
              .latestPublishedAt ||
            published >
              stats[code]
                .latestPublishedAt
          )
        ) {

          stats[code]
            .latestPublishedAt =
            published;

          stats[code]
            .latestPublishedDate =
            new Date(
              published
            ).toISOString();
        }

        if (
          stats[code]
            .opportunityCount >
          0
        ) {

          stats[code]
            .status =
            "has_updates";
        }
      }
    );

    const updates = {};

    for (
      const country
      of COUNTRIES
    ) {

      updates[
        country.code
      ] = {

        ...stats[
          country.code
        ],

        updatedAt:
          Date.now()
      };
    }

    await db
      .ref(
        "countries"
      )
      .update(
        updates
      );

    console.log(
      "📊 Country statistics updated."
    );

  } catch (error) {

    console.error(
      "❌ Country statistics error:",
      error.message
    );
  }
}

// ============================================================
// GRANTS.GOV
// ============================================================

async function checkGrantsGov() {

  console.log(
    "💰 Checking Grants.gov POSTED opportunities..."
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

      oppStatuses:
        "posted",

      agencies:
        "",

      eligibilities:
        "",

      fundingCategories:
        "",

      fundingInstruments:
        "",

      aln:
        ""
    };

    const data =
      await fetchJSON(
        apiURL,
        {

          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(
              body
            )
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

    let savedCount = 0;

    const activeGrantIds =
      new Set();

    const now =
      Date.now();

    for (
      const item
      of opportunities
    ) {

      const id =
        item.id ||
        item.oppId ||
        item.opportunityId;

      if (!id) {
        continue;
      }

      const title =
        item.oppTitle ||
        item.title ||
        item.opportunityTitle ||
        "Untitled Grant";

      const status =
        String(
          item.oppStatus ||
          item.status ||
          "posted"
        )
          .toLowerCase()
          .trim();

      if (
        status !==
        "posted"
      ) {

        continue;
      }

      const openDate =
        item.openDate ||
        item.openDateString ||
        "";

      const closeDate =
        item.closeDate ||
        item.closeDateString ||
        "";

      const publishedAt =
        parseOfficialDate(
          openDate
        ) ||
        parseOfficialDate(
          item.postingDate
        ) ||
        parseOfficialDate(
          item.publishDate
        );

      const deadlineAt =
        parseOfficialDate(
          closeDate
        );

      if (
        deadlineAt &&
        deadlineAt < now
      ) {

        continue;
      }

      activeGrantIds.add(
        String(id)
      );

      const url =
        `https://www.grants.gov/search-results-detail/${id}`;

      const description =
        item.description ||
        item.oppDescription ||
        item.synopsis ||
        item.oppSynopsis ||
        `Official grant opportunity published by ${
          item.agencyName ||
          "the U.S. Government"
        }.`;

      const detected =
        detectCountry(
          [
            item.agencyName,
            title,
            description
          ]
            .filter(Boolean)
            .join(" ")
        );

      const country =
        detected ===
        "International"
          ? "United States"
          : detected;

      const result =
        await saveOpportunity({

          id:
            `grants-gov-${id}`,

          title,

          description,

          category:
            "Grant",

          country,

          countries:
            [country],

          source:
            "Grants.gov",

          sourceType:
            "government_grant",

          url,

          applyUrl:
            url,

          detailsUrl:
            url,

          deadline:
            closeDate,

          publishedAt,

          sourceStatus:
            "posted",

          verified:
            true
        });

      if (
        result.saved
      ) {
        savedCount++;
      }
    }

    await cleanupOldGrants(
      activeGrantIds
    );

    console.log(
      "✅ Grants.gov saved:",
      savedCount
    );

    return savedCount;

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
        .ref(
          "opportunities"
        )
        .once(
          "value"
        );

    if (!snap.exists()) {
      return;
    }

    const updates = {};

    snap.forEach(
      child => {

        const item =
          child.val();

        if (!item) {
          return;
        }

        if (
          item.source !==
          "Grants.gov"
        ) {
          return;
        }

        const match =
          String(
            item.id ||
              ""
          )
            .match(
              /grants-gov-(\d+)/
            );

        if (!match) {
          return;
        }

        const id =
          String(
            match[1]
          );

        if (
          !activeGrantIds.has(
            id
          )
        ) {

          updates[
            child.key
          ] = null;
        }
      }
    );

    if (
      Object.keys(
        updates
      ).length
    ) {

      await db
        .ref(
          "opportunities"
        )
        .update(
          updates
        );
    }

  } catch (error) {

    console.error(
      "❌ Grants cleanup:",
      error.message
    );
  }
}

// ============================================================
// REMOTIVE
// ============================================================

async function checkRemotive() {

  console.log(
    "💼 Checking Remotive..."
  );

  try {

    const data =
      await fetchJSON(
        "https://remotive.com/api/remote-jobs"
      );

    const jobs =
      data?.jobs || [];

    console.log(
      "📦 Remotive jobs:",
      jobs.length
    );

    let savedCount = 0;

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

      const publishedAt =
        parseOfficialDate(
          job.publication_date
        );

      const location =
        job.candidate_required_location ||
        "Worldwide";

      const detected =
        detectCountry(
          [
            location,
            job.title
          ]
            .filter(Boolean)
            .join(" ")
        );

      const country =
        detected ===
        "International"
          ? "International"
          : detected;

      const description =
        cleanDescription(
          job.description
        );

      const result =
        await saveOpportunity({

          id:
            `remotive-${job.id}`,

          title:
            job.title ||
            "Remote Job",

          description,

          category:
            job.category ||
            "Work Opportunities",

          country,

          countries:
            country ===
            "International"
              ? ["International"]
              : [country],

          source:
            "Remotive",

          sourceType:
            "remote_job",

          url,

          applyUrl:
            url,

          detailsUrl:
            url,

          image:
            cleanURL(
              job.company_logo
            ),

          publishedAt,

          sourceStatus:
            "active",

          verified:
            true
        });

      if (
        result.saved
      ) {
        savedCount++;
      }
    }

    console.log(
      "✅ Remotive saved:",
      savedCount
    );

    return savedCount;

  } catch (error) {

    console.error(
      "❌ Remotive ERROR:",
      error.message
    );

    return 0;
  }
}

// ============================================================
// OFFICIAL COUNTRY SOURCES
// ============================================================
//
// These are SOURCE DIRECTORIES, not fake opportunities.
//
// This lets the frontend show:
// "Official sources available for this country"
// without pretending that a source homepage was
// published today.
//

const OFFICIAL_SOURCES = [

  {
    country:
      "Tanzania",

    name:
      "Tanzania Government",

    source:
      "Government of Tanzania",

    url:
      "https://www.tanzania.go.tz/",

    type:
      "official"
  },

  {
    country:
      "Tanzania",

    name:
      "Ajira Portal",

    source:
      "Ajira Tanzania",

    url:
      "https://www.ajira.go.tz/",

    type:
      "jobs"
  },

  {
    country:
      "Tanzania",

    name:
      "HESLB",

    source:
      "HESLB Tanzania",

    url:
      "https://www.heslb.go.tz/",

    type:
      "education"
  },

  {
    country:
      "Kenya",

    name:
      "Kenya Government",

    source:
      "Government of Kenya",

    url:
      "https://www.mygov.go.ke/",

    type:
      "official"
  },

  {
    country:
      "United States",

    name:
      "USA Government",

    source:
      "USA.gov",

    url:
      "https://www.usa.gov/",

    type:
      "official"
  },

  {
    country:
      "United Kingdom",

    name:
      "UK Government",

    source:
      "GOV.UK",

    url:
      "https://www.gov.uk/",

    type:
      "official"
  },

  {
    country:
      "Canada",

    name:
      "Government of Canada",

    source:
      "Government of Canada",

    url:
      "https://www.canada.ca/",

    type:
      "official"
  },

  {
    country:
      "Australia",

    name:
      "Australian Government",

    source:
      "Australian Government",

    url:
      "https://www.australia.gov.au/",

    type:
      "official"
  },

  {
    country:
      "India",

    name:
      "Government of India",

    source:
      "Government of India",

    url:
      "https://www.india.gov.in/",

    type:
      "official"
  },

  {
    country:
      "South Africa",

    name:
      "South African Government",

    source:
      "South African Government",

    url:
      "https://www.gov.za/",

    type:
      "official"
  },

  {
    country:
      "Nigeria",

    name:
      "Nigeria Government",

    source:
      "Federal Republic of Nigeria",

    url:
      "https://www.gov.ng/",

    type:
      "official"
  },

  {
    country:
      "Ghana",

    name:
      "Ghana Government",

    source:
      "Government of Ghana",

    url:
      "https://www.ghana.gov.gh/",

    type:
      "official"
  },

  {
    country:
      "Rwanda",

    name:
      "Rwanda Government",

    source:
      "Government of Rwanda",

    url:
      "https://www.gov.rw/",

    type:
      "official"
  },

  {
    country:
      "Uganda",

    name:
      "Uganda Government",

    source:
      "Government of Uganda",

    url:
      "https://www.gou.go.ug/",

    type:
      "official"
  },

  {
    country:
      "France",

    name:
      "French Government",

    source:
      "Government of France",

    url:
      "https://www.gouvernement.fr/",

    type:
      "official"
  },

  {
    country:
      "Germany",

    name:
      "German Government",

    source:
      "Federal Government of Germany",

    url:
      "https://www.bundesregierung.de/",

    type:
      "official"
  },

  {
    country:
      "Japan",

    name:
      "Government of Japan",

    source:
      "Government of Japan",

    url:
      "https://www.japan.go.jp/",

    type:
      "official"
  },

  {
    country:
      "South Korea",

    name:
      "Korea Government",

    source:
      "Republic of Korea",

    url:
      "https://www.korea.net/",

    type:
      "official"
  },

  {
    country:
      "United Arab Emirates",

    name:
      "UAE Government",

    source:
      "UAE Government",

    url:
      "https://u.ae/",

    type:
      "official"
  },

  {
    country:
      "Saudi Arabia",

    name:
      "Saudi Government",

    source:
      "Saudi Government",

    url:
      "https://www.my.gov.sa/",

    type:
      "official"
  }
];

// ============================================================
// SAVE OFFICIAL SOURCE DIRECTORY
// ============================================================

async function saveOfficialSources() {

  console.log(
    "🏛️ Saving official source directory..."
  );

  for (
    const source
    of OFFICIAL_SOURCES
  ) {

    await saveCountrySource(
      source
    );
  }

  console.log(
    "🏛️ Official sources saved."
  );
}

// ============================================================
// GOOGLE NEWS RSS COUNTRY DISCOVERY
// ============================================================
//
// This does NOT claim that the result is an official
// government announcement.
//
// It is marked:
// sourceType = "news_discovery"
//
// The actual publisher URL is kept.
// Publication date comes from RSS.
//

async function checkCountryNews(
  country
) {

  try {

    const query =
      encodeURIComponent(
        `"${country.name}" jobs OR scholarship OR grant OR internship OR opportunity OR announcement`
      );

    const rssURL =
      `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

    const xml =
      await fetchText(
        rssURL
      );

    const items =
      parseRSS(
        xml
      )
        .slice(
          0,
          MAX_RSS_ITEMS_PER_COUNTRY
        );

    let saved = 0;

    for (
      const item
      of items
    ) {

      const detected =
        detectCountry(
          `${item.title} ${item.description}`
        );

      // Do not force another country
      // into this country's record.

      if (
        detected !==
          "International" &&
        detected !==
          country.name
      ) {

        continue;
      }

      const result =
        await saveOpportunity({

          id:
            `rss-${hashString(
              item.url
            )}`,

          title:
            item.title,

          description:
            item.description ||
            `Latest public information related to ${country.name}.`,

          category:
            detectNewsCategory(
              item.title
            ),

          country:
            country.name,

          countries:
            [country.name],

          source:
            "Google News / Publisher",

          sourceType:
            "news_discovery",

          url:
            item.url,

          detailsUrl:
            item.url,

          applyUrl:
            item.url,

          publishedAt:
            item.publishedAt,

          sourceStatus:
            "discovered",

          verified:
            false
        });

      if (
        result.saved
      ) {
        saved++;
      }
    }

    return saved;

  } catch (error) {

    console.error(
      `❌ Country news ${country.name}:`,
      error.message
    );

    return 0;
  }
}

// ============================================================
// CATEGORY FROM NEWS TITLE
// ============================================================

function detectNewsCategory(
  title
) {

  const value =
    String(
      title || ""
    )
      .toLowerCase();

  if (
    value.includes("scholar") ||
    value.includes("fellowship") ||
    value.includes("education") ||
    value.includes("university")
  ) {

    return "Education";
  }

  if (
    value.includes("grant") ||
    value.includes("funding")
  ) {

    return "Grant";
  }

  if (
    value.includes("job") ||
    value.includes("career") ||
    value.includes("recruit")
  ) {

    return "Work Opportunities";
  }

  if (
    value.includes("intern")
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

  return "News";
}

// ============================================================
// COUNTRY BATCH
// ============================================================
//
// 195 countries every 30 minutes would create unnecessary
// traffic.
//
// Each run processes a batch.
//
// COUNTRY_BATCH_SIZE can be changed through environment.
// Default = 20.
//
// With 20 countries/run:
// 195 countries are covered roughly every 5 hours.
//
// ============================================================

const COUNTRY_BATCH_SIZE =
  Number(
    process.env.COUNTRY_BATCH_SIZE ||
      20
  );

async function checkCountryBatch() {

  const stateRef =
    db.ref(
      "botState/countryCursor"
    );

  const snapshot =
    await stateRef.once(
      "value"
    );

  let cursor =
    Number(
      snapshot.val() ||
        0
    );

  if (
    cursor < 0 ||
    cursor >=
      COUNTRIES.length
  ) {

    cursor = 0;
  }

  const selected =
    [];

  for (
    let i = 0;
    i <
      COUNTRY_BATCH_SIZE;
    i++
  ) {

    const index =
      (
        cursor + i
      ) %
      COUNTRIES.length;

    selected.push(
      COUNTRIES[
        index
      ]
    );
  }

  console.log(
    "🌍 Country batch:",
    selected
      .map(
        c => c.name
      )
      .join(", ")
  );

  let total = 0;

  for (
    const country
    of selected
  ) {

    total +=
      await checkCountryNews(
        country
      );

    // Small delay
    // prevents hammering RSS.

    await sleep(
      500
    );
  }

  const nextCursor =
    (
      cursor +
      selected.length
    ) %
    COUNTRIES.length;

  await stateRef.set(
    nextCursor
  );

  console.log(
    "🌍 Country batch saved:",
    total
  );

  return total;
}

// ============================================================
// SLEEP
// ============================================================

function sleep(
  ms
) {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );
}

// ============================================================
// CLEAN EXPIRED
// ============================================================

async function removeExpired() {

  console.log(
    "🧹 Removing expired opportunities..."
  );

  try {

    const snap =
      await db
        .ref(
          "opportunities"
        )
        .once(
          "value"
        );

    if (!snap.exists()) {
      return;
    }

    const updates = {};

    const now =
      Date.now();

    snap.forEach(
      child => {

        const item =
          child.val();

        if (!item) {
          return;
        }

        const deadline =
          parseOfficialDate(
            item.deadlineAt ||
              item.deadline
          );

        if (
          deadline &&
          deadline < now
        ) {

          updates[
            child.key
          ] = null;

          console.log(
            "🗑️ EXPIRED:",
            item.title
          );
        }
      }
    );

    if (
      Object.keys(
        updates
      ).length
    ) {

      await db
        .ref(
          "opportunities"
        )
        .update(
          updates
        );
    }

  } catch (error) {

    console.error(
      "❌ Expiry cleanup:",
      error.message
    );
  }
}

// ============================================================
// CLEAN INVALID URLS
// ============================================================

async function removeInvalidURLs() {

  console.log(
    "🔗 Checking URLs..."
  );

  try {

    const snap =
      await db
        .ref(
          "opportunities"
        )
        .once(
          "value"
        );

    if (!snap.exists()) {
      return;
    }

    const updates = {};

    snap.forEach(
      child => {

        const item =
          child.val();

        if (!item) {
          return;
        }

        if (
          !validURL(
            item.url
          )
        ) {

          updates[
            child.key
          ] = null;

          console.log(
            "🗑️ INVALID URL:",
            item.title
          );
        }
      }
    );

    if (
      Object.keys(
        updates
      ).length
    ) {

      await db
        .ref(
          "opportunities"
        )
        .update(
          updates
        );
    }

  } catch (error) {

    console.error(
      "❌ URL cleanup:",
      error.message
    );
  }
}

// ============================================================
// CLEAN VERY OLD NEWS DISCOVERY
// ============================================================

async function cleanupOldNews() {

  try {

    const snap =
      await db
        .ref(
          "opportunities"
        )
        .once(
          "value"
        );

    if (!snap.exists()) {
      return;
    }

    const updates = {};

    const now =
      Date.now();

    const maxAge =
      DAYS_TO_KEEP_NEWS *
      24 *
      60 *
      60 *
      1000;

    snap.forEach(
      child => {

        const item =
          child.val();

        if (!item) {
          return;
        }

        if (
          item.sourceType !==
          "news_discovery"
        ) {
          return;
        }

        const published =
          parseOfficialDate(
            item.publishedAt
          );

        if (
          published &&
          now - published >
            maxAge
        ) {

          updates[
            child.key
          ] = null;
        }
      }
    );

    if (
      Object.keys(
        updates
      ).length
    ) {

      await db
        .ref(
          "opportunities"
        )
        .update(
          updates
        );
    }

  } catch (error) {

    console.error(
      "❌ Old news cleanup:",
      error.message
    );
  }
}

// ============================================================
// NORMALIZE DATABASE
// ============================================================

async function normalizeExistingData() {

  console.log(
    "🔧 Normalizing existing data..."
  );

  try {

    const snap =
      await db
        .ref(
          "opportunities"
        )
        .once(
          "value"
        );

    if (!snap.exists()) {
      return;
    }

    const updates = {};

    snap.forEach(
      child => {

        const item =
          child.val();

        if (!item) {
          return;
        }

        const country =
          normalizeCountry(
            item.country
          );

        const code =
          getCountryCode(
            country
          );

        updates[
          `${child.key}/country`
        ] =
          country;

        updates[
          `${child.key}/countryCode`
        ] =
          code;

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

        const published =
          parseOfficialDate(
            item.publishedAt
          );

        if (
          published
        ) {

          updates[
            `${child.key}/publishedAt`
          ] =
            published;

          updates[
            `${child.key}/publishedDate`
          ] =
            new Date(
              published
            ).toISOString();
        }
      }
    );

    if (
      Object.keys(
        updates
      ).length
    ) {

      await db
        .ref(
          "opportunities"
        )
        .update(
          updates
        );
    }

    console.log(
      "🔧 Normalization complete."
    );

  } catch (error) {

    console.error(
      "❌ Normalize error:",
      error.message
    );
  }
}

// ============================================================
// API: HOME
// ============================================================

app.get(
  "/",
  (req, res) => {

    res.json({

      status:
        "online",

      name:
        "MAKYAMA Global Opportunities Bot",

      version:
        BOT_VERSION,

      mode:
        "GLOBAL",

      countries:
        COUNTRIES.length,

      message:
        "Bot is running successfully."
    });
  }
);

// ============================================================
// API: HEALTH
// ============================================================

app.get(
  "/health",
  (req, res) => {

    res.json({

      ok:
        true,

      service:
        "MAKYAMA BOT",

      version:
        BOT_VERSION,

      countries:
        COUNTRIES.length,

      time:
        new Date()
          .toISOString()
    });
  }
);

// ============================================================
// API: ALL COUNTRIES
// ============================================================

app.get(
  "/api/countries",
  async (req, res) => {

    try {

      const snap =
        await db
          .ref(
            "countries"
          )
          .once(
            "value"
          );

      const stored =
        snap.val() ||
        {};

      const countries =
        COUNTRIES.map(
          country => {

            const item =
              stored[
                country.code
              ] || {};

            return {

              code:
                country.code,

              name:
                country.name,

              opportunityCount:
                Number(
                  item.opportunityCount ||
                    0
                ),

              latestPublishedAt:
                item.latestPublishedAt ||
                null,

              latestPublishedDate:
                item.latestPublishedDate ||
                null,

              status:
                item.status ||
                "no_verified_updates_yet"
            };
          }
        );

      res.json({

        ok:
          true,

        count:
          countries.length,

        countries
      });

    } catch (error) {

      console.error(
        "❌ Countries API:",
        error.message
      );

      res.status(
        500
      ).json({

        ok:
          false,

        error:
          "Failed to load countries"
      });
    }
  }
);

// ============================================================
// API: COUNTRY DETAILS
// ============================================================

app.get(
  "/api/countries/:code",
  async (req, res) => {

    try {

      const code =
        String(
          req.params.code
        )
          .trim()
          .toUpperCase();

      const country =
        COUNTRIES.find(
          item =>
            item.code ===
            code
        );

      if (!country) {

        return res.status(
          404
        ).json({

          ok:
            false,

          error:
            "Country not found"
        });
      }

      const [
        countrySnap,
        opportunitiesSnap,
        sourcesSnap
      ] =
        await Promise.all([
          db
            .ref(
              `countries/${code}`
            )
            .once(
              "value"
            ),

          db
            .ref(
              "opportunities"
            )
            .once(
              "value"
            ),

          db
            .ref(
              `countrySources/${code}`
            )
            .once(
              "value"
            )
        ]);

      const opportunities =
        [];

      opportunitiesSnap.forEach(
        child => {

          const item =
            child.val();

          if (!item) {
            return;
          }

          if (
            item.active === false
          ) {
            return;
          }

          if (
            item.countryCode ===
              code ||
            normalizeCountry(
              item.country
            ) ===
              country.name
          ) {

            opportunities.push(
              item
            );
          }
        }
      );

      opportunities.sort(
        (a, b) =>
          Number(
            b.publishedAt ||
              0
          ) -
          Number(
            a.publishedAt ||
              0
          )
      );

      const sourceData =
        sourcesSnap.val() ||
        {};

      const sources =
        Object.values(
          sourceData
        );

      res.json({

        ok:
          true,

        country: {

          ...country,

          ...(countrySnap.val() ||
            {}),

          sources,

          opportunities
        }
      });

    } catch (error) {

      console.error(
        "❌ Country details:",
        error.message
      );

      res.status(
        500
      ).json({

        ok:
          false,

        error:
          "Failed to load country"
      });
    }
  }
);

// ============================================================
// API: OPPORTUNITIES
// ============================================================

app.get(
  "/api/opportunities",
  async (req, res) => {

    try {

      const snap =
        await db
          .ref(
            "opportunities"
          )
          .once(
            "value"
          );

      const data =
        [];

      const {
        country,
        category,
        source,
        q,
        limit
      } =
        req.query;

      const max =
        Math.min(
          Number(
            limit || 1000
          ),
          5000
        );

      snap.forEach(
        child => {

          const item =
            child.val();

          if (!item) {
            return;
          }

          if (
            item.active === false
          ) {
            return;
          }

          if (
            !validURL(
              item.url
            )
          ) {
            return;
          }

          if (
            country &&
            normalizeCountry(
              item.country
            ) !==
              normalizeCountry(
                country
              )
          ) {
            return;
          }

          if (
            category &&
            String(
              item.category ||
                ""
            ).toLowerCase() !==
              String(
                category
              ).toLowerCase()
          ) {
            return;
          }

          if (
            source &&
            String(
              item.source ||
                ""
            ).toLowerCase() !==
              String(
                source
              ).toLowerCase()
          ) {
            return;
          }

          if (q) {

            const text =
              [
                item.title,
                item.description,
                item.country,
                item.category,
                item.source
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            if (
              !text.includes(
                String(
                  q
                ).toLowerCase()
              )
            ) {

              return;
            }
          }

          data.push(
            item
          );
        }
      );

      data.sort(
        (a, b) =>
          Number(
            b.publishedAt ||
              0
          ) -
          Number(
            a.publishedAt ||
              0
          )
      );

      res.json({

        ok:
          true,

        count:
          data.length,

        opportunities:
          data.slice(
            0,
            max
          )
      });

    } catch (error) {

      console.error(
        "❌ Opportunities API:",
        error.message
      );

      res.status(
        500
      ).json({

        ok:
          false,

        error:
          "Failed to load opportunities"
      });
    }
  }
);

// ============================================================
// API: SINGLE OPPORTUNITY
// ============================================================

app.get(
  "/api/opportunities/:id",
  async (req, res) => {

    try {

      const id =
        req.params.id;

      const snap =
        await db
          .ref(
            `opportunities/${id}`
          )
          .once(
            "value"
          );

      if (!snap.exists()) {

        return res.status(
          404
        ).json({

          ok:
            false,

          error:
            "Opportunity not found"
        });
      }

      const item =
        snap.val();

      if (
        !item ||
        item.active === false ||
        !validURL(
          item.url
        )
      ) {

        return res.status(
          404
        ).json({

          ok:
            false,

          error:
            "Opportunity unavailable"
        });
      }

      await db
        .ref(
          `opportunities/${id}/views`
        )
        .transaction(
          value =>
            Number(
              value || 0
            ) + 1
        );

      item.views =
        Number(
          item.views || 0
        ) + 1;

      res.json({

        ok:
          true,

        opportunity:
          item
      });

    } catch (error) {

      console.error(
        "❌ Single opportunity:",
        error.message
      );

      res.status(
        500
      ).json({

        ok:
          false,

        error:
          "Failed to load opportunity"
      });
    }
  }
);

// ============================================================
// API: ADS
// ============================================================

app.get(
  "/api/ads",
  async (req, res) => {

    try {

      const snap =
        await db
          .ref(
            "ads"
          )
          .once(
            "value"
          );

      const ads =
        [];

      snap.forEach(
        child => {

          const ad =
            child.val();

          if (!ad) {
            return;
          }

          if (
            ad.active === false
          ) {
            return;
          }

          ads.push({

            id:
              child.key,

            ...ad
          });
        }
      );

      ads.sort(
        (a, b) =>
          Number(
            b.createdAt || 0
          ) -
          Number(
            a.createdAt || 0
          )
      );

      res.json({

        ok:
          true,

        ads
      });

    } catch (error) {

      console.error(
        "❌ Ads API:",
        error.message
      );

      res.status(
        500
      ).json({

        ok:
          false,

        error:
          "Failed to load ads"
      });
    }
  }
);

// ============================================================
// API: BOT STATUS
// ============================================================

app.get(
  "/api/bot-status",
  async (req, res) => {

    try {

      const snap =
        await db
          .ref(
            "botState"
          )
          .once(
            "value"
          );

      const state =
        snap.val() ||
        {};

      res.json({

        ok:
          true,

        version:
          BOT_VERSION,

        countries:
          COUNTRIES.length,

        countryBatchSize:
          COUNTRY_BATCH_SIZE,

        countryCursor:
          Number(
            state.countryCursor ||
              0
          ),

        intervalMinutes:
          CHECK_INTERVAL /
          60000,

        lastRun:
          state.lastRun ||
          null
      });

    } catch (error) {

      res.status(
        500
      ).json({

        ok:
          false,

        error:
          "Failed to load bot status"
      });
    }
  }
);

// ============================================================
// RUN BOT
// ============================================================

let botRunning =
  false;

async function runBot() {

  if (
    botRunning
  ) {

    console.log(
      "⏭️ Previous bot run still active. Skipping."
    );

    return;
  }

  botRunning =
    true;

  const start =
    Date.now();

  console.log("");
  console.log(
    "================================================"
  );
  console.log(
    "🤖 MAKYAMA GLOBAL BOT V10"
  );
  console.log(
    "================================================"
  );
  console.log(
    "Time:",
    new Date()
      .toISOString()
  );
  console.log(
    "Countries:",
    COUNTRIES.length
  );
  console.log(
    "Country batch:",
    COUNTRY_BATCH_SIZE
  );
  console.log(
    "Grants.gov: POSTED ONLY"
  );
  console.log(
    "Fake publication dates: DISABLED"
  );
  console.log(
    "================================================"
  );

  try {

    await db
      .ref(
        "botState/lastRun"
      )
      .set(
        new Date()
          .toISOString()
      );

    // --------------------------------------------------------
    // COUNTRY CATALOG
    // --------------------------------------------------------

    await initializeCountries();

    // --------------------------------------------------------
    // OFFICIAL SOURCE DIRECTORY
    // --------------------------------------------------------

    await saveOfficialSources();

    // --------------------------------------------------------
    // CLEAN OLD DATA
    // --------------------------------------------------------

    await removeExpired();

    await removeInvalidURLs();

    await cleanupOldNews();

    // --------------------------------------------------------
    // GLOBAL SOURCES
    // --------------------------------------------------------

    await checkGrantsGov();

    await checkRemotive();

    // --------------------------------------------------------
    // COUNTRY NEWS / OPPORTUNITIES
    // --------------------------------------------------------

    await checkCountryBatch();

    // --------------------------------------------------------
    // NORMALIZE
    // --------------------------------------------------------

    await normalizeExistingData();

    // --------------------------------------------------------
    // COUNTRY STATS
    // --------------------------------------------------------

    await updateCountryStatistics();

    // --------------------------------------------------------
    // FINAL CLEAN
    // --------------------------------------------------------

    await removeExpired();

    console.log("");
    console.log(
      "================================================"
    );
    console.log(
      "🎉 BOT FINISHED"
    );
    console.log(
      "Runtime:",
      Math.round(
        (
          Date.now() -
          start
        ) /
        1000
      ),
      "seconds"
    );
    console.log(
      "================================================"
    );

  } catch (error) {

    console.error(
      "❌ BOT CRITICAL ERROR:",
      error
    );

  } finally {

    botRunning =
      false;
  }
}

// ============================================================
// SERVER
// ============================================================

app.listen(
  PORT,
  () => {

    console.log("");
    console.log(
      "=============================================="
    );
    console.log(
      "🚀 MAKYAMA GLOBAL OPPORTUNITIES BOT V10"
    );
    console.log(
      "=============================================="
    );
    console.log(
      "Port:",
      PORT
    );
    console.log(
      "Countries:",
      COUNTRIES.length
    );
    console.log(
      "Interval:",
      CHECK_INTERVAL /
        60000,
      "minutes"
    );
    console.log(
      "Mode: GLOBAL"
    );
    console.log(
      "Publication dates: SOURCE DATES ONLY"
    );
    console.log(
      "=============================================="
    );
    console.log("");
  }
);

// ============================================================
// START FIRST RUN
// ============================================================

runBot()
  .catch(
    error =>
      console.error(
        "❌ Startup bot error:",
        error
      )
  );

// ============================================================
// AUTO RUN
// ============================================================

setInterval(
  () => {

    runBot()
      .catch(
        error =>
          console.error(
            "❌ Scheduled bot error:",
            error
          )
      );

  },
  CHECK_INTERVAL
);

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

process.on(
  "SIGTERM",
  () => {

    console.log(
      "🛑 SIGTERM received."
    );

    process.exit(
      0
    );
  }
);

process.on(
  "SIGINT",
  () => {

    console.log(
      "🛑 SIGINT received."
    );

    process.exit(
      0
    );
  }
);
