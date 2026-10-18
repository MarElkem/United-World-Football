// Builds src/data/countries.json: world-atlas country id -> ISO alpha-2, a
// display name and the football confederation the country plays in.
import { readFileSync, writeFileSync } from 'node:fs'

const atlas = JSON.parse(readFileSync('node_modules/world-atlas/countries-110m.json', 'utf8'))
const codes = JSON.parse(readFileSync('node_modules/i18n-iso-countries/codes.json', 'utf8'))
const numToA2 = new Map(codes.map(([a2, , num]) => [num, a2]))

const lists = {
  CAF: 'DZ AO BJ BW BF BI CV CM CF TD KM CG CD DJ EG GQ ER SZ ET GA GM GH GN GW CI KE LS LR LY MG MW ML MR MU MA MZ NA NE NG RW ST SN SC SL SO ZA SS SD TZ TG TN UG ZM ZW',
  CONMEBOL: 'AR BO BR CL CO EC PY PE UY VE',
  Concacaf: 'US CA MX GT BZ SV HN NI CR PA CU JM HT DO PR BS TT GY SR BB AG DM GD KN LC VC AW CW BM KY TC VG VI AI MS GP MQ SX BQ',
  OFC: 'NZ PG FJ SB VU NC PF WS TO CK KI TV AS',
  UEFA: 'AL AD AM AT AZ BY BE BA BG HR CY CZ DK EE FO FI FR GE DE GI GR HU IS IE IL IT KZ XK LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SE CH TR UA GB',
  AFC: 'AF AU BH BD BT BN KH CN TW GU HK IN ID IR IQ JP JO KP KR KW KG LA LB MO MY MV MN MM NP OM PK PS PH QA SA SG LK SY TJ TH TL TM AE UZ VN YE',
}
const confOf = new Map()
for (const [conf, s] of Object.entries(lists)) for (const a2 of s.split(' ')) confOf.set(a2, conf)

const byName = { Kosovo: 'XK', Somaliland: 'SO', 'N. Cyprus': null }
const names = {
  'United States of America': 'United States', 'Dem. Rep. Congo': 'DR Congo', 'Central African Rep.': 'Central African Republic',
  'Dominican Rep.': 'Dominican Republic', 'Bosnia and Herz.': 'Bosnia and Herzegovina', 'Eq. Guinea': 'Equatorial Guinea',
  "Côte d'Ivoire": 'Ivory Coast', 'S. Sudan': 'South Sudan', 'Solomon Is.': 'Solomon Islands', 'W. Sahara': 'Western Sahara',
  'Falkland Is.': 'Falkland Islands', 'Fr. S. Antarctic Lands': 'French Southern Lands', 'North Macedonia': 'North Macedonia',
}

const out = []
for (const g of atlas.objects.countries.geometries) {
  const name = g.properties.name
  const a2 = g.id ? numToA2.get(g.id) ?? null : byName[name] ?? null
  out.push({ id: g.id ?? name, a2: a2 ? a2.toLowerCase() : null, name: names[name] ?? name, conf: a2 ? confOf.get(a2) ?? null : null })
}
writeFileSync('src/data/countries.json', JSON.stringify(out))
const none = out.filter((c) => !c.conf).map((c) => `${c.name}(${c.a2})`)
console.log(out.length, 'countries; no confederation:', none.join(', '))

// Copy just the flags we can show (countries on the globe plus home nations).
import { mkdirSync, copyFileSync, existsSync, rmSync } from 'node:fs'
const flagDir = 'src/assets/flags'
rmSync(flagDir, { recursive: true, force: true })
mkdirSync(flagDir, { recursive: true })
const wanted = new Set([...out.map((c) => c.a2).filter(Boolean), 'gb-eng', 'gb-sct'])
let copied = 0
for (const code of wanted) {
  const src = `node_modules/flag-icons/flags/4x3/${code}.svg`
  if (existsSync(src)) {
    copyFileSync(src, `${flagDir}/${code}.svg`)
    copied++
  }
}
console.log(copied, 'flags copied')
