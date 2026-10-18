// Small helpers shared by the data pipeline.

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export function slugify(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** "Liverpool FC" -> "Liverpool", "AFC Bournemouth" -> "Bournemouth". */
export function cleanClubName(name) {
  return name
    .replace(/\s+(FC|CF|AFC|SC|FK|SK|BK|CFC)$/i, '')
    .replace(/^(FC|AFC|CF|SC)\s+/, '')
    .trim()
}

export function initials(name) {
  const words = name.replace(/[^\p{L}\s]/gu, '').split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase()
  return words.slice(0, 3).map((w) => w[0]).join('').toUpperCase()
}

// The names fans actually use, where the official one is long.
const SHORT = {
  'Paris Saint-Germain': 'PSG',
  'Olympique de Marseille': 'Marseille',
  'Olympique Lyonnais': 'Lyon',
  'Racing Club de Lens': 'Lens',
  'RC Strasbourg Alsace': 'Strasbourg',
  'Stade Rennais FC 1901': 'Rennes',
  'Stade Brestois 29': 'Brest',
  'Sport Lisboa e Benfica': 'Benfica',
  'Sporting Clube de Portugal': 'Sporting CP',
  'Sporting Clube de Braga': 'Braga',
  'Vitória Guimarães': 'Vitória SC',
  'GD Estoril Praia': 'Estoril',
  'Internazionale Milano': 'Inter',
  'Club Atlético de Madrid': 'Atlético Madrid',
  'Real Sociedad de Fútbol': 'Real Sociedad',
  'Real Betis Balompié': 'Real Betis',
  'RCD Espanyol de Barcelona': 'Espanyol',
  'Rayo Vallecano de Madrid': 'Rayo Vallecano',
  'RC Celta de Vigo': 'Celta Vigo',
  'RC Deportivo La Coruña': 'Deportivo',
  'Real Racing Club de Santander': 'Racing',
  'Bayer 04 Leverkusen': 'Leverkusen',
  'Borussia Mönchengladbach': 'Gladbach',
  'Borussia Dortmund': 'Dortmund',
  'Eintracht Frankfurt': 'Frankfurt',
  'TSG 1899 Hoffenheim': 'Hoffenheim',
  'SV Werder Bremen': 'Werder Bremen',
  '1. FC Union Berlin': 'Union Berlin',
  '1. FC Köln': 'Köln',
  '1. FSV Mainz 05': 'Mainz',
  'SV 07 Elversberg': 'Elversberg',
  'Bayern München': 'Bayern',
  'Wolverhampton Wanderers': 'Wolves',
  'Brighton & Hove Albion': 'Brighton',
  'Tottenham Hotspur': 'Tottenham',
  'Manchester United': 'Man United',
  'Manchester City': 'Man City',
  'Nottingham Forest': "Nott'm Forest",
  'Newcastle United': 'Newcastle',
  'West Ham United': 'West Ham',
  'West Bromwich Albion': 'West Brom',
  'Queens Park Rangers': 'QPR',
  'Sheffield United': 'Sheffield Utd',
  'Sheffield Wednesday': 'Sheffield Wed',
  'Preston North End': 'Preston',
  'Corinthians Paulista': 'Corinthians',
  'CR Vasco da Gama': 'Vasco',
  'Feyenoord Rotterdam': 'Feyenoord',
  'Willem II Tilburg': 'Willem II',
  'Académico de Viseu': 'Viseu',
  'Estrela da Amadora': 'Estrela',
  'Cambuur-Leeuwarden': 'Cambuur',
}

/** A short form for score strips and brackets: "CR Flamengo" -> "Flamengo". */
export function shortNameFor(name) {
  if (SHORT[name]) return SHORT[name]
  const s = name
    .replace(/^[A-Z]{2,4}\s+(?=\S)/, '')
    .replace(/(\s+(Calcio|AC|AF|FC|\d{2,4}))+$/, '')
    .trim()
  return s.length > 15 ? initials(s) : s
}

// Muted badge colours. Clubs get one from a hash of their name: we have no
// licensed colours or crests, so this is decoration only.
const PALETTE = ['#2F4858', '#5B3A29', '#3D5A3B', '#6B2D2D', '#33415C', '#4A4A2F', '#5C3D5E', '#2E5E5A', '#6A4C24', '#3B3B58']
export function colourFor(id) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]
}

/**
 * Converts a wall-clock time in an IANA zone (or with an explicit "UTC-6"
 * style offset) to an ISO string in UTC.
 */
export function toUtcIso(date, time, zone) {
  const m = /^(\d{1,2}):(\d{2})(?:\s*UTC([+-]\d{1,2})(?::?(\d{2}))?)?$/.exec((time ?? '').trim())
  const [y, mo, d] = date.split('-').map(Number)
  if (!m) {
    // No time given: noon in the zone keeps the calendar date right everywhere.
    return toUtcIso(date, '12:00', zone)
  }
  const hh = Number(m[1])
  const mm = Number(m[2])
  if (m[3] !== undefined) {
    const sign = m[3].startsWith('-') ? -1 : 1
    const offMin = Number(m[3]) * 60 + sign * Number(m[4] ?? 0)
    return new Date(Date.UTC(y, mo - 1, d, hh, mm) - offMin * 60000).toISOString()
  }
  // Guess UTC, then correct by the zone's offset at that instant (twice, for DST edges).
  let t = Date.UTC(y, mo - 1, d, hh, mm)
  for (let i = 0; i < 2; i++) t = Date.UTC(y, mo - 1, d, hh, mm) - zoneOffsetMs(t, zone)
  return new Date(t).toISOString()
}

function zoneOffsetMs(utcMs, zone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(utcMs))
  const get = (t) => Number(parts.find((p) => p.type === t).value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'))
  return asUtc - Math.floor(utcMs / 60000) * 60000
}

export async function writeJson(path, data) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(data))
}

export async function writeText(path, text) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, text)
}

export async function fetchJson(url, init = {}, timeoutMs = 20000) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return res.json()
}

export async function fetchText(url, init = {}, timeoutMs = 20000) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return res.text()
}
