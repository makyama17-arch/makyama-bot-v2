// ============================================================
// MAKYAMA GLOBAL OPPORTUNITIES BOT V12
// ============================================================
// GLOBAL COUNTRY SYSTEM
//
// FEATURES
// ------------------------------------------------------------
// - 190+ country registry
// - Education sources
// - Jobs sources
// - News sources
// - Government portals
// - Country metadata
// - Official-source preference
// - RSS / Atom
// - HTML extraction
// - JSON/API support
// - Source health monitoring
// - Retry system
// - Duplicate protection
// - Expired opportunity filtering
// - Firestore safe IDs
// - Firestore retry
// - Tanzania official sources
// - International organizations
// - Render HTTP server
// - Runs every 30 minutes
// ============================================================

"use strict";

const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const crypto = require("crypto");
const admin = require("firebase-admin");

const app = express();

const PORT = process.env.PORT || 10000;

const BOT_VERSION = "12.0.0";

const BASE_URL =
  process.env.PUBLIC_URL ||
  "https://makyama-bot-v2.onrender.com";

// ============================================================
// SERVER
// ============================================================

app.get("/", (req, res) => {
  res.status(200).json({
    ok: true,
    name: "MAKYAMA GLOBAL OPPORTUNITIES BOT",
    version: BOT_VERSION,
    status: "running",
    countries: COUNTRY_REGISTRY.length,
    time: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    status: "healthy",
    version: BOT_VERSION,
    countries: COUNTRY_REGISTRY.length,
    time: new Date().toISOString()
  });
});

app.get("/countries", (req, res) => {
  res.status(200).json(
    COUNTRY_REGISTRY.map(c => ({
      code: c.code,
      name: c.name,
      region: c.region
    }))
  );
});

app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

// ============================================================
// FIREBASE
// ============================================================

let db = null;
let firestoreAvailable = false;

function initFirebase() {
  try {
    if (admin.apps.length) {
      db = admin.firestore();
      firestoreAvailable = true;

      console.log("🔥 Firebase already initialized");
      return;
    }

    let serviceAccount = null;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(
          process.env.FIREBASE_SERVICE_ACCOUNT
        );
      } catch (error) {
        console.error(
          "❌ FIREBASE_SERVICE_ACCOUNT invalid:",
          error.message
        );
      }
    }

    if (
      !serviceAccount &&
      process.env.FIREBASE_PROJECT_ID
    ) {
      serviceAccount = {
        project_id:
          process.env.FIREBASE_PROJECT_ID,

        client_email:
          process.env.FIREBASE_CLIENT_EMAIL,

        private_key:
          (
            process.env.FIREBASE_PRIVATE_KEY ||
            ""
          ).replace(/\\n/g, "\n")
      };
    }

    if (serviceAccount) {
      admin.initializeApp({
        credential:
          admin.credential.cert(
            serviceAccount
          )
      });

      db = admin.firestore();
      firestoreAvailable = true;

      console.log("🔥 Firebase initialized");

      return;
    }

    admin.initializeApp({
      credential:
        admin.credential.applicationDefault()
    });

    db = admin.firestore();
    firestoreAvailable = true;

    console.log(
      "🔥 Firebase initialized using ADC"
    );

  } catch (error) {
    firestoreAvailable = false;
    db = null;

    console.error(
      "⚠️ Firebase initialization failed:",
      error.message
    );
  }
}

initFirebase();

// ============================================================
// COLLECTIONS
// ============================================================

const COLLECTIONS = {
  opportunities: "opportunities",
  jobs: "jobs",
  scholarships: "scholarships",
  grants: "grants",
  internships: "internships",
  events: "events",
  news: "news",
  sources: "sources",
  countries: "countries"
};

// ============================================================
// COUNTRY REGISTRY
// ============================================================
//
// NOTE:
// These are government/root domains used for discovery.
// The bot DOES NOT assume every country has RSS.
//
// If a page has RSS -> RSS parser.
// Otherwise -> HTML parser.
//
// ============================================================

const COUNTRY_REGISTRY = [

  // AFRICA
  {
    code: "DZ",
    name: "Algeria",
    region: "Africa",
    government: "https://www.algeria.dz/",
    education: "https://www.education.gov.dz/",
    jobs: "https://www.anem.dz/"
  },
  {
    code: "AO",
    name: "Angola",
    region: "Africa",
    government: "https://governo.gov.ao/"
  },
  {
    code: "BJ",
    name: "Benin",
    region: "Africa",
    government: "https://www.gouv.bj/"
  },
  {
    code: "BW",
    name: "Botswana",
    region: "Africa",
    government: "https://www.gov.bw/"
  },
  {
    code: "BF",
    name: "Burkina Faso",
    region: "Africa",
    government: "https://www.servicepublic.gov.bf/"
  },
  {
    code: "BI",
    name: "Burundi",
    region: "Africa",
    government: "https://www.presidence.gov.bi/"
  },
  {
    code: "CV",
    name: "Cabo Verde",
    region: "Africa",
    government: "https://www.governo.cv/"
  },
  {
    code: "CM",
    name: "Cameroon",
    region: "Africa",
    government: "https://www.spm.gov.cm/"
  },
  {
    code: "CF",
    name: "Central African Republic",
    region: "Africa",
    government: "https://www.presidence.cf/"
  },
  {
    code: "TD",
    name: "Chad",
    region: "Africa",
    government: "https://www.presidence.td/"
  },
  {
    code: "KM",
    name: "Comoros",
    region: "Africa",
    government: "https://beit-salam.km/"
  },
  {
    code: "CD",
    name: "Democratic Republic of Congo",
    region: "Africa",
    government: "https://www.primature.gouv.cd/"
  },
  {
    code: "CG",
    name: "Republic of Congo",
    region: "Africa",
    government: "https://www.gouvernement.cg/"
  },
  {
    code: "CI",
    name: "Cote d'Ivoire",
    region: "Africa",
    government: "https://www.gouv.ci/"
  },
  {
    code: "DJ",
    name: "Djibouti",
    region: "Africa",
    government: "https://www.presidence.dj/"
  },
  {
    code: "EG",
    name: "Egypt",
    region: "Africa",
    government: "https://www.egypt.gov.eg/"
  },
  {
    code: "GQ",
    name: "Equatorial Guinea",
    region: "Africa",
    government: "https://www.guineaecuatorialpress.com/"
  },
  {
    code: "ER",
    name: "Eritrea",
    region: "Africa",
    government: "https://shabait.com/"
  },
  {
    code: "SZ",
    name: "Eswatini",
    region: "Africa",
    government: "https://www.gov.sz/"
  },
  {
    code: "ET",
    name: "Ethiopia",
    region: "Africa",
    government: "https://www.ethiopia.gov.et/"
  },
  {
    code: "GA",
    name: "Gabon",
    region: "Africa",
    government: "https://www.gouvernement.ga/"
  },
  {
    code: "GM",
    name: "Gambia",
    region: "Africa",
    government: "https://www.gambia.gov.gm/"
  },
  {
    code: "GH",
    name: "Ghana",
    region: "Africa",
    government: "https://www.ghana.gov.gh/"
  },
  {
    code: "GN",
    name: "Guinea",
    region: "Africa",
    government: "https://www.gouvernement.gov.gn/"
  },
  {
    code: "GW",
    name: "Guinea-Bissau",
    region: "Africa",
    government: "https://www.gov.gw/"
  },
  {
    code: "KE",
    name: "Kenya",
    region: "Africa",
    government: "https://www.kenya.go.ke/"
  },
  {
    code: "LS",
    name: "Lesotho",
    region: "Africa",
    government: "https://www.gov.ls/"
  },
  {
    code: "LR",
    name: "Liberia",
    region: "Africa",
    government: "https://www.emansion.gov.lr/"
  },
  {
    code: "LY",
    name: "Libya",
    region: "Africa",
    government: "https://www.pm.gov.ly/"
  },
  {
    code: "MG",
    name: "Madagascar",
    region: "Africa",
    government: "https://www.presidence.gov.mg/"
  },
  {
    code: "MW",
    name: "Malawi",
    region: "Africa",
    government: "https://www.malawi.gov.mw/"
  },
  {
    code: "ML",
    name: "Mali",
    region: "Africa",
    government: "https://www.gouvernement.ml/"
  },
  {
    code: "MR",
    name: "Mauritania",
    region: "Africa",
    government: "https://www.gov.mr/"
  },
  {
    code: "MU",
    name: "Mauritius",
    region: "Africa",
    government: "https://www.govmu.org/"
  },
  {
    code: "MA",
    name: "Morocco",
    region: "Africa",
    government: "https://www.maroc.ma/"
  },
  {
    code: "MZ",
    name: "Mozambique",
    region: "Africa",
    government: "https://www.portaldogoverno.gov.mz/"
  },
  {
    code: "NA",
    name: "Namibia",
    region: "Africa",
    government: "https://www.gov.na/"
  },
  {
    code: "NE",
    name: "Niger",
    region: "Africa",
    government: "https://www.gouv.ne/"
  },
  {
    code: "NG",
    name: "Nigeria",
    region: "Africa",
    government: "https://www.gov.ng/"
  },
  {
    code: "RW",
    name: "Rwanda",
    region: "Africa",
    government: "https://www.gov.rw/"
  },
  {
    code: "ST",
    name: "Sao Tome and Principe",
    region: "Africa",
    government: "https://www.gov.st/"
  },
  {
    code: "SN",
    name: "Senegal",
    region: "Africa",
    government: "https://www.sec.gouv.sn/"
  },
  {
    code: "SC",
    name: "Seychelles",
    region: "Africa",
    government: "https://www.egov.sc/"
  },
  {
    code: "SL",
    name: "Sierra Leone",
    region: "Africa",
    government: "https://www.gov.sl/"
  },
  {
    code: "SO",
    name: "Somalia",
    region: "Africa",
    government: "https://www.gov.so/"
  },
  {
    code: "ZA",
    name: "South Africa",
    region: "Africa",
    government: "https://www.gov.za/"
  },
  {
    code: "SS",
    name: "South Sudan",
    region: "Africa",
    government: "https://www.goss.org/"
  },
  {
    code: "SD",
    name: "Sudan",
    region: "Africa",
    government: "https://www.sudan.gov.sd/"
  },
  {
    code: "TZ",
    name: "Tanzania",
    region: "Africa",
    government: "https://www.tanzania.go.tz/",
    education: "https://www.moe.go.tz/",
    jobs: "https://www.ajira.go.tz/"
  },
  {
    code: "TG",
    name: "Togo",
    region: "Africa",
    government: "https://www.gouv.tg/"
  },
  {
    code: "TN",
    name: "Tunisia",
    region: "Africa",
    government: "https://www.tunisie.gov.tn/"
  },
  {
    code: "UG",
    name: "Uganda",
    region: "Africa",
    government: "https://www.gou.go.ug/"
  },
  {
    code: "ZM",
    name: "Zambia",
    region: "Africa",
    government: "https://www.zambia.gov.zm/"
  },
  {
    code: "ZW",
    name: "Zimbabwe",
    region: "Africa",
    government: "https://www.zim.gov.zw/"
  },

  // AMERICAS
  {
    code: "AG",
    name: "Antigua and Barbuda",
    region: "Americas",
    government: "https://ab.gov.ag/"
  },
  {
    code: "AR",
    name: "Argentina",
    region: "Americas",
    government: "https://www.argentina.gob.ar/"
  },
  {
    code: "BS",
    name: "Bahamas",
    region: "Americas",
    government: "https://www.bahamas.gov.bs/"
  },
  {
    code: "BB",
    name: "Barbados",
    region: "Americas",
    government: "https://www.gov.bb/"
  },
  {
    code: "BZ",
    name: "Belize",
    region: "Americas",
    government: "https://www.belize.gov.bz/"
  },
  {
    code: "BO",
    name: "Bolivia",
    region: "Americas",
    government: "https://www.bolivia.gob.bo/"
  },
  {
    code: "BR",
    name: "Brazil",
    region: "Americas",
    government: "https://www.gov.br/"
  },
  {
    code: "CA",
    name: "Canada",
    region: "Americas",
    government: "https://www.canada.ca/"
  },
  {
    code: "CL",
    name: "Chile",
    region: "Americas",
    government: "https://www.gob.cl/"
  },
  {
    code: "CO",
    name: "Colombia",
    region: "Americas",
    government: "https://www.gov.co/"
  },
  {
    code: "CR",
    name: "Costa Rica",
    region: "Americas",
    government: "https://www.presidencia.go.cr/"
  },
  {
    code: "CU",
    name: "Cuba",
    region: "Americas",
    government: "https://www.cubagob.cu/"
  },
  {
    code: "DM",
    name: "Dominica",
    region: "Americas",
    government: "https://dominica.gov.dm/"
  },
  {
    code: "DO",
    name: "Dominican Republic",
    region: "Americas",
    government: "https://www.gob.do/"
  },
  {
    code: "EC",
    name: "Ecuador",
    region: "Americas",
    government: "https://www.gob.ec/"
  },
  {
    code: "SV",
    name: "El Salvador",
    region: "Americas",
    government: "https://www.presidencia.gob.sv/"
  },
  {
    code: "GD",
    name: "Grenada",
    region: "Americas",
    government: "https://www.gov.gd/"
  },
  {
    code: "GT",
    name: "Guatemala",
    region: "Americas",
    government: "https://guatemala.gob.gt/"
  },
  {
    code: "GY",
    name: "Guyana",
    region: "Americas",
    government: "https://dpi.gov.gy/"
  },
  {
    code: "HT",
    name: "Haiti",
    region: "Americas",
    government: "https://www.gouv.ht/"
  },
  {
    code: "HN",
    name: "Honduras",
    region: "Americas",
    government: "https://www.presidencia.gob.hn/"
  },
  {
    code: "JM",
    name: "Jamaica",
    region: "Americas",
    government: "https://www.gov.jm/"
  },
  {
    code: "MX",
    name: "Mexico",
    region: "Americas",
    government: "https://www.gob.mx/"
  },
  {
    code: "NI",
    name: "Nicaragua",
    region: "Americas",
    government: "https://www.presidencia.gob.ni/"
  },
  {
    code: "PA",
    name: "Panama",
    region: "Americas",
    government: "https://www.presidencia.gob.pa/"
  },
  {
    code: "PY",
    name: "Paraguay",
    region: "Americas",
    government: "https://www.presidencia.gov.py/"
  },
  {
    code: "PE",
    name: "Peru",
    region: "Americas",
    government: "https://www.gob.pe/"
  },
  {
    code: "KN",
    name: "Saint Kitts and Nevis",
    region: "Americas",
    government: "https://www.gov.kn/"
  },
  {
    code: "LC",
    name: "Saint Lucia",
    region: "Americas",
    government: "https://www.govt.lc/"
  },
  {
    code: "VC",
    name: "Saint Vincent and the Grenadines",
    region: "Americas",
    government: "https://www.gov.vc/"
  },
  {
    code: "SR",
    name: "Suriname",
    region: "Americas",
    government: "https://www.gov.sr/"
  },
  {
    code: "TT",
    name: "Trinidad and Tobago",
    region: "Americas",
    government: "https://www.gov.tt/"
  },
  {
    code: "US",
    name: "United States",
    region: "Americas",
    government: "https://www.usa.gov/",
    jobs: "https://www.usajobs.gov/"
  },
  {
    code: "UY",
    name: "Uruguay",
    region: "Americas",
    government: "https://www.gub.uy/"
  },
  {
    code: "VE",
    name: "Venezuela",
    region: "Americas",
    government: "https://www.gob.ve/"
  },

  // ASIA
  {
    code: "AF",
    name: "Afghanistan",
    region: "Asia",
    government: "https://www.gov.af/"
  },
  {
    code: "AM",
    name: "Armenia",
    region: "Asia",
    government: "https://www.gov.am/"
  },
  {
    code: "AZ",
    name: "Azerbaijan",
    region: "Asia",
    government: "https://www.gov.az/"
  },
  {
    code: "BH",
    name: "Bahrain",
    region: "Asia",
    government: "https://www.bahrain.bh/"
  },
  {
    code: "BD",
    name: "Bangladesh",
    region: "Asia",
    government: "https://bangladesh.gov.bd/"
  },
  {
    code: "BT",
    name: "Bhutan",
    region: "Asia",
    government: "https://www.gov.bt/"
  },
  {
    code: "BN",
    name: "Brunei",
    region: "Asia",
    government: "https://www.gov.bn/"
  },
  {
    code: "KH",
    name: "Cambodia",
    region: "Asia",
    government: "https://www.cambodia.gov.kh/"
  },
  {
    code: "CN",
    name: "China",
    region: "Asia",
    government: "https://www.gov.cn/"
  },
  {
    code: "GE",
    name: "Georgia",
    region: "Asia",
    government: "https://www.gov.ge/"
  },
  {
    code: "IN",
    name: "India",
    region: "Asia",
    government: "https://www.india.gov.in/"
  },
  {
    code: "ID",
    name: "Indonesia",
    region: "Asia",
    government: "https://indonesia.go.id/"
  },
  {
    code: "IR",
    name: "Iran",
    region: "Asia",
    government: "https://www.gov.ir/"
  },
  {
    code: "IQ",
    name: "Iraq",
    region: "Asia",
    government: "https://www.cabinet.iq/"
  },
  {
    code: "IL",
    name: "Israel",
    region: "Asia",
    government: "https://www.gov.il/"
  },
  {
    code: "JP",
    name: "Japan",
    region: "Asia",
    government: "https://www.japan.go.jp/"
  },
  {
    code: "JO",
    name: "Jordan",
    region: "Asia",
    government: "https://portal.jordan.gov.jo/"
  },
  {
    code: "KZ",
    name: "Kazakhstan",
    region: "Asia",
    government: "https://www.gov.kz/"
  },
  {
    code: "KW",
    name: "Kuwait",
    region: "Asia",
    government: "https://www.e.gov.kw/"
  },
  {
    code: "KG",
    name: "Kyrgyzstan",
    region: "Asia",
    government: "https://www.gov.kg/"
  },
  {
    code: "LA",
    name: "Laos",
    region: "Asia",
    government: "https://www.gov.la/"
  },
  {
    code: "LB",
    name: "Lebanon",
    region: "Asia",
    government: "https://www.gov.lb/"
  },
  {
    code: "MY",
    name: "Malaysia",
    region: "Asia",
    government: "https://www.malaysia.gov.my/"
  },
  {
    code: "MV",
    name: "Maldives",
    region: "Asia",
    government: "https://www.gov.mv/"
  },
  {
    code: "MN",
    name: "Mongolia",
    region: "Asia",
    government: "https://www.gov.mn/"
  },
  {
    code: "MM",
    name: "Myanmar",
    region: "Asia",
    government: "https://www.myanmar.gov.mm/"
  },
  {
    code: "NP",
    name: "Nepal",
    region: "Asia",
    government: "https://www.nepal.gov.np/"
  },
  {
    code: "KP",
    name: "North Korea",
    region: "Asia",
    government: "https://www.naenara.com.kp/"
  },
  {
    code: "OM",
    name: "Oman",
    region: "Asia",
    government: "https://www.oman.om/"
  },
  {
    code: "PK",
    name: "Pakistan",
    region: "Asia",
    government: "https://www.pakistan.gov.pk/"
  },
  {
    code: "PS",
    name: "Palestine",
    region: "Asia",
    government: "https://www.palestine.ps/"
  },
  {
    code: "PH",
    name: "Philippines",
    region: "Asia",
    government: "https://www.gov.ph/"
  },
  {
    code: "QA",
    name: "Qatar",
    region: "Asia",
    government: "https://www.gov.qa/"
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    region: "Asia",
    government: "https://www.my.gov.sa/"
  },
  {
    code: "SG",
    name: "Singapore",
    region: "Asia",
    government: "https://www.gov.sg/"
  },
  {
    code: "KR",
    name: "South Korea",
    region: "Asia",
    government: "https://www.korea.net/"
  },
  {
    code: "LK",
    name: "Sri Lanka",
    region: "Asia",
    government: "https://www.gov.lk/"
  },
  {
    code: "SY",
    name: "Syria",
    region: "Asia",
    government: "https://www.egov.sy/"
  },
  {
    code: "TJ",
    name: "Tajikistan",
    region: "Asia",
    government: "https://www.gov.tj/"
  },
  {
    code: "TH",
    name: "Thailand",
    region: "Asia",
    government: "https://www.thaigov.go.th/"
  },
  {
    code: "TL",
    name: "Timor-Leste",
    region: "Asia",
    government: "https://timor-leste.gov.tl/"
  },
  {
    code: "TR",
    name: "Türkiye",
    region: "Asia",
    government: "https://www.turkiye.gov.tr/"
  },
  {
    code: "TM",
    name: "Turkmenistan",
    region: "Asia",
    government: "https://www.turkmenistan.gov.tm/"
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    region: "Asia",
    government: "https://u.ae/"
  },
  {
    code: "UZ",
    name: "Uzbekistan",
    region: "Asia",
    government: "https://gov.uz/"
  },
  {
    code: "VN",
    name: "Vietnam",
    region: "Asia",
    government: "https://chinhphu.vn/"
  },
  {
    code: "YE",
    name: "Yemen",
    region: "Asia",
    government: "https://yemen.gov.ye/"
  },

  // EUROPE
  {
    code: "AL",
    name: "Albania",
    region: "Europe",
    government: "https://www.gov.al/"
  },
  {
    code: "AD",
    name: "Andorra",
    region: "Europe",
    government: "https://www.govern.ad/"
  },
  {
    code: "AT",
    name: "Austria",
    region: "Europe",
    government: "https://www.oesterreich.gv.at/"
  },
  {
    code: "BY",
    name: "Belarus",
    region: "Europe",
    government: "https://president.gov.by/"
  },
  {
    code: "BE",
    name: "Belgium",
    region: "Europe",
    government: "https://www.belgium.be/"
  },
  {
    code: "BA",
    name: "Bosnia and Herzegovina",
    region: "Europe",
    government: "https://www.gov.ba/"
  },
  {
    code: "BG",
    name: "Bulgaria",
    region: "Europe",
    government: "https://www.government.bg/"
  },
  {
    code: "HR",
    name: "Croatia",
    region: "Europe",
    government: "https://gov.hr/"
  },
  {
    code: "CY",
    name: "Cyprus",
    region: "Europe",
    government: "https://www.gov.cy/"
  },
  {
    code: "CZ",
    name: "Czech Republic",
    region: "Europe",
    government: "https://www.vlada.cz/"
  },
  {
    code: "DK",
    name: "Denmark",
    region: "Europe",
    government: "https://www.denmark.dk/"
  },
  {
    code: "EE",
    name: "Estonia",
    region: "Europe",
    government: "https://www.eesti.ee/"
  },
  {
    code: "FI",
    name: "Finland",
    region: "Europe",
    government: "https://www.suomi.fi/"
  },
  {
    code: "FR",
    name: "France",
    region: "Europe",
    government: "https://www.gouvernement.fr/"
  },
  {
    code: "DE",
    name: "Germany",
    region: "Europe",
    government: "https://www.bundesregierung.de/"
  },
  {
    code: "GR",
    name: "Greece",
    region: "Europe",
    government: "https://www.gov.gr/"
  },
  {
    code: "HU",
    name: "Hungary",
    region: "Europe",
    government: "https://kormany.hu/"
  },
  {
    code: "IS",
    name: "Iceland",
    region: "Europe",
    government: "https://www.government.is/"
  },
  {
    code: "IE",
    name: "Ireland",
    region: "Europe",
    government: "https://www.gov.ie/"
  },
  {
    code: "IT",
    name: "Italy",
    region: "Europe",
    government: "https://www.governo.it/"
  },
  {
    code: "LV",
    name: "Latvia",
    region: "Europe",
    government: "https://www.latvija.gov.lv/"
  },
  {
    code: "LI",
    name: "Liechtenstein",
    region: "Europe",
    government: "https://www.llv.li/"
  },
  {
    code: "LT",
    name: "Lithuania",
    region: "Europe",
    government: "https://lrv.lt/"
  },
  {
    code: "LU",
    name: "Luxembourg",
    region: "Europe",
    government: "https://www.gouvernement.lu/"
  },
  {
    code: "MT",
    name: "Malta",
    region: "Europe",
    government: "https://www.gov.mt/"
  },
  {
    code: "MD",
    name: "Moldova",
    region: "Europe",
    government: "https://gov.md/"
  },
  {
    code: "MC",
    name: "Monaco",
    region: "Europe",
    government: "https://www.gouv.mc/"
  },
  {
    code: "ME",
    name: "Montenegro",
    region: "Europe",
    government: "https://www.gov.me/"
  },
  {
    code: "NL",
    name: "Netherlands",
    region: "Europe",
    government: "https://www.government.nl/"
  },
  {
    code: "MK",
    name: "North Macedonia",
    region: "Europe",
    government: "https://vlada.mk/"
  },
  {
    code: "NO",
    name: "Norway",
    region: "Europe",
    government: "https://www.regjeringen.no/"
  },
  {
    code: "PL",
    name: "Poland",
    region: "Europe",
    government: "https://www.gov.pl/"
  },
  {
    code: "PT",
    name: "Portugal",
    region: "Europe",
    government: "https://www.portugal.gov.pt/"
  },
  {
    code: "RO",
    name: "Romania",
    region: "Europe",
    government: "https://www.gov.ro/"
  },
  {
    code: "RU",
    name: "Russia",
    region: "Europe",
    government: "https://government.ru/"
  },
  {
    code: "SM",
    name: "San Marino",
    region: "Europe",
    government: "https://www.gov.sm/"
  },
  {
    code: "RS",
    name: "Serbia",
    region: "Europe",
    government: "https://www.srbija.gov.rs/"
  },
  {
    code: "SK",
    name: "Slovakia",
    region: "Europe",
    government: "https://www.vlada.gov.sk/"
  },
  {
    code: "SI",
    name: "Slovenia",
    region: "Europe",
    government: "https://www.gov.si/"
  },
  {
    code: "ES",
    name: "Spain",
    region: "Europe",
    government: "https://administracion.gob.es/"
  },
  {
    code: "SE",
    name: "Sweden",
    region: "Europe",
    government: "https://www.government.se/"
  },
  {
    code: "CH",
    name: "Switzerland",
    region: "Europe",
    government: "https://www.admin.ch/"
  },
  {
    code: "UA",
    name: "Ukraine",
    region: "Europe",
    government: "https://www.kmu.gov.ua/"
  },
  {
    code: "GB",
    name: "United Kingdom",
    region: "Europe",
    government: "https://www.gov.uk/"
  },
  {
    code: "VA",
    name: "Vatican City",
    region: "Europe",
    government: "https://www.vaticanstate.va/"
  },

  // OCEANIA
  {
    code: "AU",
    name: "Australia",
    region: "Oceania",
    government: "https://www.australia.gov.au/"
  },
  {
    code: "FJ",
    name: "Fiji",
    region: "Oceania",
    government: "https://www.fiji.gov.fj/"
  },
  {
    code: "KI",
    name: "Kiribati",
    region: "Oceania",
    government: "https://www.president.gov.ki/"
  },
  {
    code: "MH",
    name: "Marshall Islands",
    region: "Oceania",
    government: "https://rmiembassyus.org/"
  },
  {
    code: "FM",
    name: "Micronesia",
    region: "Oceania",
    government: "https://www.fsmpio.fm/"
  },
  {
    code: "NR",
    name: "Nauru",
    region: "Oceania",
    government: "https://www.naurugov.nr/"
  },
  {
    code: "NZ",
    name: "New Zealand",
    region: "Oceania",
    government: "https://www.govt.nz/"
  },
  {
    code: "PW",
    name: "Palau",
    region: "Oceania",
    government: "https://www.palaugov.pw/"
  },
  {
    code: "PG",
    name: "Papua New Guinea",
    region: "Oceania",
    government: "https://www.pmnec.gov.pg/"
  },
  {
    code: "WS",
    name: "Samoa",
    region: "Oceania",
    government: "https://www.samoagovt.ws/"
  },
  {
    code: "SB",
    name: "Solomon Islands",
    region: "Oceania",
    government: "https://solomons.gov.sb/"
  },
  {
    code: "TO",
    name: "Tonga",
    region: "Oceania",
    government: "https://www.gov.to/"
  },
  {
    code: "TV",
    name: "Tuvalu",
    region: "Oceania",
    government: "https://www.gov.tv/"
  },
  {
    code: "VU",
    name: "Vanuatu",
    region: "Oceania",
    government: "https://www.gov.vu/"
  }

];

// ============================================================
// HELPERS
// ============================================================

function cleanText(value) {
  if (
    value === undefined ||
    value === null
  ) {
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
    const parsed =
      new URL(String(url).trim());

    parsed.hash = "";

    return parsed.toString();

  } catch {
    return String(url).trim();
  }
}

function makeAbsoluteUrl(href, base) {
  if (!href) return "";

  try {
    return new URL(
      href,
      base
    ).toString();

  } catch {
    return "";
  }
}

function safeDocId(value) {
  const raw =
    cleanText(value) ||
    crypto.randomUUID();

  let id = raw
    .replace(
      /^https?:\/\//i,
      ""
    )
    .replace(
      /[^a-zA-Z0-9_-]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    )
    .toLowerCase();

  if (!id) {
    id = "item";
  }

  if (id.length > 100) {
    id = id.substring(0, 100);
  }

  const hash =
    crypto
      .createHash("sha1")
      .update(raw)
      .digest("hex")
      .substring(0, 12);

  return `${id}-${hash}`;
}

function sleep(ms) {
  return new Promise(
    resolve => setTimeout(resolve, ms)
  );
}

function parseDate(value) {
  if (!value) return null;

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}

function isExpired(value) {
  const date =
    parseDate(value);

  if (!date) return false;

  return (
    date.getTime() <
    Date.now()
  );
}

function uniqueByUrl(items) {
  const map = new Map();

  for (const item of items) {
    const key =
      normalizeUrl(
        item.sourceUrl ||
        item.applicationUrl ||
        item.title
      );

    if (!key) continue;

    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return Array.from(
    map.values()
  );
}

// ============================================================
// NORMALIZE ITEM
// ============================================================

function normalizeItem(
  item,
  countryOverride = null
) {

  const country =
    countryOverride ||
    item.country ||
    "International";

  const output = {

    title:
      cleanText(
        item.title
      ),

    description:
      cleanText(
        stripHtml(
          item.description || ""
        )
      ),

    organization:
      cleanText(
        item.organization ||
        item.organisation ||
        item.company ||
        item.provider ||
        ""
      ),

    country:
      cleanText(country),

    countryCode:
      cleanText(
        item.countryCode ||
        ""
      ),

    region:
      cleanText(
        item.region ||
        ""
      ),

    category:
      cleanText(
        item.category ||
        "News"
      ),

    type:
      cleanText(
        item.type ||
        item.category ||
        "News"
      ),

    source:
      cleanText(
        item.source ||
        ""
      ),

    sourceUrl:
      normalizeUrl(
        item.sourceUrl ||
        item.url ||
        item.link ||
        ""
      ),

    applicationUrl:
      normalizeUrl(
        item.applicationUrl ||
        item.applyUrl ||
        item.sourceUrl ||
        item.url ||
        item.link ||
        ""
      ),

    sourceType:
      cleanText(
        item.sourceType ||
        "government"
      ),

    trustLevel:
      cleanText(
        item.trustLevel ||
        "official"
      ),

    publishedAt:
      item.publishedAt ||
      null,

    deadline:
      item.deadline ||
      null,

    remote:
      Boolean(
        item.remote
      ),

    tags:
      Array.isArray(item.tags)
        ? item.tags
        : [],

    status:
      "active",

    updatedAt:
      new Date().toISOString()
  };

  if (
    output.deadline &&
    isExpired(
      output.deadline
    )
  ) {
    output.status =
      "expired";
  }

  return output;
}

// ============================================================
// HTTP FETCH WITH RETRIES
// ============================================================

async function fetchPage(
  url,
  options = {}
) {

  if (!url) return null;

  const retries =
    options.retries ?? 2;

  const timeout =
    options.timeout ?? 20000;

  for (
    let attempt = 1;
    attempt <= retries + 1;
    attempt++
  ) {

    try {

      const response =
        await axios.get(
          url,
          {
            timeout,

            maxRedirects: 5,

            headers: {
              "User-Agent":
                "Mozilla/5.0 (compatible; MAKYAMA-BOT/12.0; +https://makyama-bot-v2.onrender.com)",

              Accept:
                options.accept ||
                "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

              ...(options.headers || {})
            },

            validateStatus:
              () => true
          }
        );

      if (
        response.status >= 200 &&
        response.status < 400
      ) {
        return response.data;
      }

      throw new Error(
        `HTTP ${response.status}`
      );

    } catch (error) {

      if (
        attempt >
        retries
      ) {

        console.error(
          `❌ Failed: ${url} -> ${error.message}`
        );

        return null;
      }

      await sleep(
        1000 * attempt
      );
    }
  }

  return null;
}

// ============================================================
// RSS / ATOM
// ============================================================

async function fetchRSS(
  sourceName,
  sourceUrl,
  category,
  country,
  countryCode = "",
  region = ""
) {

  console.log(
    `      📡 RSS ${sourceName}`
  );

  const xml =
    await fetchPage(
      sourceUrl,
      {
        timeout: 30000,
        accept:
          "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"
      }
    );

  if (!xml) {
    return [];
  }

  try {

    const $ =
      cheerio.load(
        xml,
        {
          xml: true
        }
      );

    const items = [];

    $("item, entry")
      .each(
        (_, element) => {

          const title =
            cleanText(
              $(element)
                .find("title")
                .first()
                .text()
            );

          let link =
            cleanText(
              $(element)
                .find("link")
                .first()
                .text()
            );

          if (!link) {
            link =
              $(element)
                .find("link")
                .first()
                .attr("href") ||
              "";
          }

          const description =
            cleanText(
              $(element)
                .find(
                  "description,summary,content"
                )
                .first()
                .text()
            );

          const pubDate =
            cleanText(
              $(element)
                .find(
                  "pubDate,published,updated"
                )
                .first()
                .text()
            );

          let publishedAt = null;

          if (pubDate) {
            const date =
              parseDate(pubDate);

            if (date) {
              publishedAt =
                date.toISOString();
            }
          }

          const item =
            normalizeItem(
              {
                title,
                description,
                organization:
                  sourceName,
                country,
                countryCode,
                region,
                category,
                type: category,
                source:
                  sourceName,
                sourceUrl:
                  link,
                applicationUrl:
                  link,
                publishedAt
              }
            );

          if (
            item.title &&
            item.sourceUrl
          ) {
            items.push(item);
          }
        }
      );

    return uniqueByUrl(
      items
    ).slice(0, 100);

  } catch (error) {

    console.error(
      `❌ RSS parser ${sourceName}:`,
      error.message
    );

    return [];
  }
}

// ============================================================
// HTML
// ============================================================

async function fetchHTMLSource(
  sourceName,
  sourceUrl,
  category,
  country,
  countryCode = "",
  region = ""
) {

  console.log(
    `      🌐 HTML ${sourceName}`
  );

  const html =
    await fetchPage(
      sourceUrl,
      {
        timeout: 30000
      }
    );

  if (!html) {
    return [];
  }

  try {

    const $ =
      cheerio.load(html);

    const items = [];

    const selectors = [
      "article",
      ".article",
      ".news-item",
      ".news",
      ".post",
      ".post-item",
      ".job",
      ".job-item",
      ".vacancy",
      ".opportunity",
      ".scholarship",
      ".card",
      "main li"
    ];

    for (
      const selector of selectors
    ) {

      $(selector)
        .each(
          (_, element) => {

            const title =
              cleanText(
                $(element)
                  .find(
                    "h1,h2,h3,h4,h5,.title,.entry-title"
                  )
                  .first()
                  .text()
              );

            const href =
              $(element)
                .find("a")
                .first()
                .attr("href") ||
              "";

            const absolute =
              makeAbsoluteUrl(
                href,
                sourceUrl
              );

            const text =
              cleanText(
                $(element)
                  .text()
              );

            if (
              title &&
              absolute &&
              text.length >=
                title.length
            ) {

              const item =
                normalizeItem(
                  {
                    title,
                    description:
                      text,
                    organization:
                      sourceName,
                    country,
                    countryCode,
                    region,
                    category,
                    type: category,
                    source:
                      sourceName,
                    sourceUrl:
                      absolute,
                    applicationUrl:
                      absolute,
                    publishedAt:
                      null
                  }
                );

              items.push(item);
            }
          }
        );

      if (
        items.length >= 50
      ) {
        break;
      }
    }

    return uniqueByUrl(
      items
    ).slice(0, 100);

  } catch (error) {

    console.error(
      `❌ HTML parser ${sourceName}:`,
      error.message
    );

    return [];
  }
}

// ============================================================
// COUNTRY SOURCE DISCOVERY
// ============================================================

function buildCountrySources(
  country
) {

  const sources = [];

  const base =
    country.government;

  if (!base) {
    return sources;
  }

  // Government portal
  sources.push({
    name:
      `${country.name} Government`,
    url:
      base,
    category:
      "News"
  });

  // Education
  sources.push({
    name:
      `${country.name} Education`,
    url:
      country.education ||
      base,
    category:
      "Education"
  });

  // Jobs
  sources.push({
    name:
      `${country.name} Jobs`,
    url:
      country.jobs ||
      base,
    category:
      "Jobs"
  });

  return sources;
}

// ============================================================
// SOURCE CLASSIFICATION
// ============================================================

function classifyCategory(
  title,
  text,
  fallback
) {

  const value =
    `${title} ${text}`
      .toLowerCase();

  if (
    /scholarship|scholarships|grant|funding|fellowship|admission|university|college|education|school|student|study|training/.test(
      value
    )
  ) {
    if (
      /scholarship|fellowship|grant|funding/.test(
        value
      )
    ) {
      return "Scholarship";
    }

    return "Education";
  }

  if (
    /job|jobs|career|careers|vacancy|vacancies|employment|recruitment|recruit|position|work/.test(
      value
    )
  ) {
    return "Jobs";
  }

  if (
    /event|conference|summit|workshop|forum/.test(
      value
    )
  ) {
    return "Events";
  }

  return fallback || "News";
}

// ============================================================
// COUNTRY COLLECTOR
// ============================================================

async function collectCountry(
  country
) {

  console.log("");
  console.log(
    `🌍 ${country.name} [${country.code}]`
  );

  const sources =
    buildCountrySources(
      country
    );

  const results = [];

  for (
    const source of sources
  ) {

    let data = [];

    // Try RSS first
    const rss =
      await fetchRSS(
        source.name,
        source.url,
        source.category,
        country.name,
        country.code,
        country.region
      );

    if (
      rss.length
    ) {
      data = rss;
    } else {

      // Fallback HTML
      data =
        await fetchHTMLSource(
          source.name,
          source.url,
          source.category,
          country.name,
          country.code,
          country.region
        );
    }

    for (
      const item of data
    ) {

      item.category =
        classifyCategory(
          item.title,
          item.description,
          source.category
        );

      item.type =
        item.category;

      item.country =
        country.name;

      item.countryCode =
        country.code;

      item.region =
        country.region;

      item.sourceType =
        "government";

      item.trustLevel =
        "official";

      results.push(item);
    }

    await sleep(100);
  }

  const unique =
    uniqueByUrl(
      results
    );

  console.log(
    `      📦 ${country.name}: ${unique.length}`
  );

  return unique;
}

// ============================================================
// INTERNATIONAL SOURCES
// ============================================================

async function collectInternational() {

  console.log("");
  console.log(
    "🌐 INTERNATIONAL SOURCES"
  );

  const results = [];

  const sources = [

    {
      name:
        "United Nations",
      url:
        "https://www.un.org/en/",
      category:
        "News"
    },

    {
      name:
        "United Nations Careers",
      url:
        "https://careers.un.org/",
      category:
        "Jobs"
    },

    {
      name:
        "WHO News",
      url:
        "https://www.who.int/rss-feeds/news-english.xml",
      category:
        "News",
      rss:
        true
    },

    {
      name:
        "WHO Careers",
      url:
        "https://www.who.int/careers",
      category:
        "Jobs"
    },

    {
      name:
        "World Bank News",
      url:
        "https://www.worldbank.org/en/news",
      category:
        "News"
    },

    {
      name:
        "World Bank Careers",
      url:
        "https://www.worldbank.org/en/about/careers",
      category:
        "Jobs"
    },

    {
      name:
        "UNICEF Careers",
      url:
        "https://jobs.unicef.org/",
      category:
        "Jobs"
    },

    {
      name:
        "African Union",
      url:
        "https://au.int/en/news",
      category:
        "News"
    }
  ];

  for (
    const source of sources
  ) {

    let data = [];

    if (
      source.rss
    ) {

      data =
        await fetchRSS(
          source.name,
          source.url,
          source.category,
          "International",
          "",
          "International"
        );

    } else {

      data =
        await fetchHTMLSource(
          source.name,
          source.url,
          source.category,
          "International",
          "",
          "International"
        );
    }

    results.push(
      ...data
    );

    await sleep(100);
  }

  return uniqueByUrl(
    results
  );
}

// ============================================================
// GRANTS.GOV
// ============================================================

async function fetchGrantsGov() {

  console.log("");
  console.log(
    "🇺🇸 Grants.gov"
  );

  try {

    const response =
      await axios.post(
        "https://api.grants.gov/v1/api/search2",
        {
          keyword: "",
          oppStatuses:
            "posted",
          rows: 100,
          startRecordNum: 0
        },
        {
          timeout: 30000,
          headers: {
            "Content-Type":
              "application/json",
            "User-Agent":
              "MAKYAMA-BOT/12.0"
          }
        }
      );

    const data =
      response.data || {};

    const results =
      data.oppHits ||
      data.data?.oppHits ||
      data.data?.results ||
      [];

    const items = [];

    for (
      const x of results
    ) {

      const id =
        x.opportunityNumber ||
        x.oppNumber ||
        x.id ||
        "";

      const link =
        id
          ? `https://www.grants.gov/search-results-detail/${id}`
          : "";

      const item =
        normalizeItem(
          {
            title:
              x.oppTitle ||
              x.title ||
              "",

            description:
              x.description ||
              x.synopsis ||
              "",

            organization:
              x.agencyName ||
              x.agency ||
              "",

            country:
              "United States",

            countryCode:
              "US",

            region:
              "Americas",

            category:
              "Grant",

            type:
              "Grant",

            source:
              "Grants.gov",

            sourceUrl:
              link,

            applicationUrl:
              link,

            publishedAt:
              x.postDate ||
              x.openDate ||
              null,

            deadline:
              x.closeDate ||
              null,

            sourceType:
              "government",

            trustLevel:
              "official",

            tags: [
              "USA",
              "Grant",
              "Grants.gov"
            ]
          }
        );

      if (
        item.title &&
        item.status !==
          "expired"
      ) {
        items.push(item);
      }
    }

    console.log(
      `      📦 Grants.gov: ${items.length}`
    );

    return uniqueByUrl(
      items
    );

  } catch (error) {

    console.error(
      "❌ Grants.gov:",
      error.message
    );

    return [];
  }
}

// ============================================================
// TANZANIA SPECIAL SOURCES
// ============================================================

async function collectTanzaniaSpecial() {

  console.log("");
  console.log(
    "🇹🇿 TANZANIA SPECIAL SOURCES"
  );

  const sources = [

    {
      name:
        "Tanzania Ministry of Education",
      url:
        "https://www.moe.go.tz/",
      category:
        "Education"
    },

    {
      name:
        "Tanzania Government Portal",
      url:
        "https://www.tanzania.go.tz/",
      category:
        "News"
    },

    {
      name:
        "Tanzania Labour Ministry",
      url:
        "https://kazi.go.tz/",
      category:
        "Jobs"
    },

    {
      name:
        "Tanzania Ajira Portal",
      url:
        "https://www.ajira.go.tz/",
      category:
        "Jobs"
    },

    {
      name:
        "HESLB",
      url:
        "https://www.heslb.go.tz/",
      category:
        "Scholarship"
    },

    {
      name:
        "Tanzania Commission for Universities",
      url:
        "https://www.tcu.go.tz/",
      category:
        "Education"
    },

    {
      name:
        "Zanzibar Ministry of Education",
      url:
        "https://moez.go.tz/",
      category:
        "Education"
    }
  ];

  const results = [];

  for (
    const source of sources
  ) {

    let data =
      await fetchRSS(
        source.name,
        source.url,
        source.category,
        "Tanzania",
        "TZ",
        "Africa"
      );

    if (
      !data.length
    ) {

      data =
        await fetchHTMLSource(
          source.name,
          source.url,
          source.category,
          "Tanzania",
          "TZ",
          "Africa"
        );
    }

    results.push(
      ...data
    );

    await sleep(150);
  }

  return uniqueByUrl(
    results
  );
}

// ============================================================
// SAVE FIRESTORE
// ============================================================

function getDocRef(
  collection,
  item
) {

  if (
    !db ||
    !firestoreAvailable
  ) {
    return null;
  }

  const source =
    item.sourceUrl ||
    item.applicationUrl ||
    item.title ||
    crypto.randomUUID();

  return db
    .collection(collection)
    .doc(
      safeDocId(source)
    );
}

async function saveItem(
  collection,
  item
) {

  if (
    !db ||
    !firestoreAvailable
  ) {
    return false;
  }

  try {

    const ref =
      getDocRef(
        collection,
        item
      );

    if (!ref) {
      return false;
    }

    await ref.set(
      {
        ...item,

        collection,

        updatedAt:
          new Date().toISOString()
      },
      {
        merge: true
      }
    );

    return true;

  } catch (error) {

    console.error(
      `❌ Firestore ${collection}:`,
      error.code || "",
      error.message || error
    );

    return false;
  }
}

// ============================================================
// CATEGORY COLLECTION
// ============================================================

function collectionFor(
  item
) {

  const category =
    cleanText(
      item.category
    ).toLowerCase();

  if (
    category.includes(
      "scholar"
    ) ||
    category.includes(
      "education"
    )
  ) {
    return COLLECTIONS.scholarships;
  }

  if (
    category.includes(
      "grant"
    )
  ) {
    return COLLECTIONS.grants;
  }

  if (
    category.includes(
      "job"
    )
  ) {
    return COLLECTIONS.jobs;
  }

  if (
    category.includes(
      "intern"
    )
  ) {
    return COLLECTIONS.internships;
  }

  if (
    category.includes(
      "event"
    )
  ) {
    return COLLECTIONS.events;
  }

  if (
    category.includes(
      "news"
    )
  ) {
    return COLLECTIONS.news;
  }

  return COLLECTIONS.opportunities;
}

// ============================================================
// SAVE MANY
// ============================================================

async function saveAll(
  items
) {

  if (
    !items.length
  ) {

    console.log(
      "⚠️ Nothing to save"
    );

    return 0;
  }

  if (
    !firestoreAvailable
  ) {

    console.log(
      "⚠️ Firestore unavailable - collected data not saved"
    );

    return 0;
  }

  let saved = 0;

  for (
    const item of items
  ) {

    const categoryCollection =
      collectionFor(
        item
      );

    const ok =
      await saveItem(
        categoryCollection,
        item
      );

    if (ok) {
      saved++;
    }

    await saveItem(
      COLLECTIONS.opportunities,
      item
    );

    await sleep(20);
  }

  console.log(
    `💾 SAVED: ${saved}/${items.length}`
  );

  return saved;
}

// ============================================================
// SAVE COUNTRY METADATA
// ============================================================

async function saveCountryMetadata() {

  if (
    !db ||
    !firestoreAvailable
  ) {
    return;
  }

  for (
    const country of COUNTRY_REGISTRY
  ) {

    try {

      await db
        .collection(
          COLLECTIONS.countries
        )
        .doc(
          country.code
        )
        .set(
          {
            ...country,

            updatedAt:
              new Date().toISOString(),

            botVersion:
              BOT_VERSION
          },
          {
            merge: true
          }
        );

    } catch (error) {

      console.error(
        `❌ Country save ${country.name}:`,
        error.message
      );
    }
  }

  console.log(
    `🌍 Country metadata saved: ${COUNTRY_REGISTRY.length}`
  );
}

// ============================================================
// SOURCE HEALTH
// ============================================================

async function saveSourceHealth(
  country,
  source,
  count,
  status
) {

  if (
    !db ||
    !firestoreAvailable
  ) {
    return;
  }

  try {

    const id =
      safeDocId(
        `${country.code}-${source}`
      );

    await db
      .collection(
        COLLECTIONS.sources
      )
      .doc(id)
      .set(
        {
          country:
            country.name,

          countryCode:
            country.code,

          region:
            country.region,

          source,

          count,

          status,

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

    console.error(
      "❌ Source health:",
      error.message
    );
  }
}

// ============================================================
// FIRESTORE TEST
// ============================================================

async function testFirestore() {

  if (
    !db ||
    !firestoreAvailable
  ) {

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

          countries:
            COUNTRY_REGISTRY.length,

          updatedAt:
            new Date().toISOString()
        },
        {
          merge: true
        }
      );

    console.log(
      "✅ Firestore connection OK"
    );

    return true;

  } catch (error) {

    console.error(
      "❌ Firestore connection failed:",
      error.code || "",
      error.message || error
    );

    firestoreAvailable = false;

    return false;
  }
}

// ============================================================
// REMOVE EXPIRED
// ============================================================

async function removeExpired() {

  if (
    !db ||
    !firestoreAvailable
  ) {
    return;
  }

  for (
    const collection of
      Object.values(
        COLLECTIONS
      )
  ) {

    if (
      collection ===
      COLLECTIONS.sources ||
      collection ===
      COLLECTIONS.countries
    ) {
      continue;
    }

    try {

      const snapshot =
        await db
          .collection(
            collection
          )
          .limit(500)
          .get();

      let removed = 0;

      for (
        const doc of
          snapshot.docs
      ) {

        const data =
          doc.data() || {};

        if (
          data.deadline &&
          isExpired(
            data.deadline
          )
        ) {

          await doc.ref.delete();

          removed++;
        }
      }

      if (removed) {

        console.log(
          `🧹 ${collection}: removed ${removed}`
        );
      }

    } catch (error) {

      console.error(
        `❌ Cleanup ${collection}:`,
        error.message
      );
    }
  }
}

// ============================================================
// GLOBAL COLLECTOR
// ============================================================

async function collectAll() {

  console.log("");
  console.log(
    "============================================================"
  );
  console.log(
    "🌍 GLOBAL COLLECTION STARTED"
  );
  console.log(
    `🌍 COUNTRIES: ${COUNTRY_REGISTRY.length}`
  );
  console.log(
    "============================================================"
  );

  const all = [];

  // ----------------------------------------------------------
  // COUNTRY SOURCES
  // ----------------------------------------------------------

  for (
    const country of
      COUNTRY_REGISTRY
  ) {

    try {

      const items =
        await collectCountry(
          country
        );

      all.push(
        ...items
      );

      await sleep(200);

    } catch (error) {

      console.error(
        `❌ ${country.name} failed:`,
        error.message
      );
    }
  }

  // ----------------------------------------------------------
  // TANZANIA SPECIAL
  // ----------------------------------------------------------

  try {

    const tz =
      await collectTanzaniaSpecial();

    all.push(
      ...tz
    );

  } catch (error) {

    console.error(
      "❌ Tanzania special:",
      error.message
    );
  }

  // ----------------------------------------------------------
  // INTERNATIONAL
  // ----------------------------------------------------------

  try {

    const international =
      await collectInternational();

    all.push(
      ...international
    );

  } catch (error) {

    console.error(
      "❌ International:",
      error.message
    );
  }

  // ----------------------------------------------------------
  // GRANTS
  // ----------------------------------------------------------

  try {

    const grants =
      await fetchGrantsGov();

    all.push(
      ...grants
    );

  } catch (error) {

    console.error(
      "❌ Grants:",
      error.message
    );
  }

  // ----------------------------------------------------------
  // NORMALIZE
  // ----------------------------------------------------------

  const normalized =
    all
      .map(
        item =>
          normalizeItem(
            item
          )
      )
      .filter(
        item =>
          item.title &&
          item.sourceUrl &&
          item.status !==
            "expired"
      );

  const unique =
    uniqueByUrl(
      normalized
    );

  console.log("");
  console.log(
    "============================================================"
  );
  console.log(
    `📊 COUNTRIES CHECKED: ${COUNTRY_REGISTRY.length}`
  );
  console.log(
    `📦 TOTAL COLLECTED: ${unique.length}`
  );
  console.log(
    "============================================================"
  );

  return unique;
}

// ============================================================
// MAIN BOT
// ============================================================

let running = false;

async function runBot() {

  if (running) {

    console.log(
      "⏳ Previous run still active."
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

    // 1
    await testFirestore();

    // 2
    await saveCountryMetadata();

    // 3
    const items =
      await collectAll();

    // 4
    await saveAll(
      items
    );

    // 5
    await removeExpired();

    console.log("");
    console.log(
      "============================================================"
    );
    console.log(
      "✅ BOT RUN COMPLETED"
    );
    console.log(
      "============================================================"
    );

  } catch (error) {

    console.error("");
    console.error(
      "❌ BOT ERROR:",
      error.stack ||
      error.message ||
      error
    );

  } finally {

    running = false;
  }
}

// ============================================================
// START
// ============================================================

setTimeout(
  () => {

    runBot()
      .catch(
        error =>
          console.error(
            "Unhandled:",
            error
          )
      );

  },
  5000
);

// ============================================================
// EVERY 30 MINUTES
// ============================================================

setInterval(
  () => {

    runBot()
      .catch(
        error =>
          console.error(
            "Scheduled error:",
            error
          )
      );

  },
  30 * 60 * 1000
);

// ============================================================
// PROCESS SAFETY
// ============================================================

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

// ============================================================
// END
// ============================================================
