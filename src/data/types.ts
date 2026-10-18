// Normalised football model shared by every data source. The interface reads
// only these shapes, so a provider can be swapped without touching the UI.

export type Section = 'nations' | 'clubs' | 'intercontinental'

export type Freshness = 'live' | 'delayed' | 'stale' | 'demo' | 'unavailable'

export interface DataStamp {
  source: string
  fetchedAt: string // ISO
  freshness: Freshness
  note?: string
}

export interface Team {
  id: string
  name: string
  shortName: string
  kind: 'national' | 'club'
  /** ISO 3166 code (or gb-eng style) used for the flag. */
  country: string
  /** Hex colour for the initials badge when no licensed crest exists. */
  colour: string
}

export type MatchStatus =
  | 'scheduled'
  | 'live'
  | 'half_time'
  | 'finished'
  | 'after_extra_time'
  | 'penalties'
  | 'postponed'
  | 'cancelled'
  | 'suspended'
  | 'abandoned'
  | 'awarded'

export interface Score {
  home: number
  away: number
}

export interface Match {
  id: string
  competitionId: string
  stageId: string
  groupId?: string
  round: string
  homeId: string
  awayId: string
  kickoff: string // ISO, UTC
  venue?: string
  venueTimeZone: string
  status: MatchStatus
  minute?: number
  score?: Score
  halfTime?: Score
  extraTime?: Score
  penalties?: Score
  /** For the second leg of a two-legged tie. */
  aggregate?: Score
  /** Set by a source that says who won (awarded matches, away goals). */
  winnerId?: string
}

export type Zone = 'qualify' | 'playoff' | 'continental' | 'relegate' | 'relegation_playoff'

export interface StandingRow {
  teamId: string
  position: number
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  points: number
  form: ('W' | 'D' | 'L')[]
  zone?: Zone
}

export interface ZoneLegend {
  zone: Zone
  label: string
}

export interface Group {
  id: string
  name: string
  table: StandingRow[]
}

export interface Tie {
  id: string
  round: string
  homeId?: string
  awayId?: string
  legs: string[] // match ids
  aggregate?: Score
  winnerId?: string
  decidedBy?: 'aggregate' | 'away_goals' | 'extra_time' | 'penalties' | 'single_match'
}

export type StageFormat = 'league' | 'groups' | 'league_phase' | 'knockout' | 'qualifying'

export interface Stage {
  id: string
  name: string
  format: StageFormat
  groups?: Group[]
  zones?: ZoneLegend[]
  /** Knockout rounds in order, each with its ties. */
  rounds?: { name: string; ties: Tie[] }[]
}

export type CompetitionStatus = 'active' | 'upcoming' | 'qualifying' | 'completed'

export interface Competition {
  id: string
  slug: string
  name: string
  shortName: string
  section: Section
  confederation: string
  country?: string
  season: string
  status: CompetitionStatus
  stages: Stage[]
  matches: Match[]
  stamp: DataStamp
  /** False when we list the competition but no source is connected yet. */
  connected: boolean
  about?: string
}

export type NewsType = 'transfer' | 'match_report' | 'tournament' | 'national_team' | 'club' | 'injury' | 'manager'

export interface NewsArticle {
  id: string
  title: string
  summary: string
  url: string
  source: string
  publishedAt: string
  type: NewsType
  sections: Section[]
  tags: { kind: 'team' | 'competition' | 'country' | 'confederation'; id: string; label: string }[]
  alsoReportedBy?: string[]
  /** The headline's language, when the feed says (es, de, fr, pt...). */
  lang?: string
  demo: boolean
}

export interface NavNode {
  id: string
  label: string
  /** Small red annotation, such as a confederation acronym. */
  note?: string
  href?: string
  flag?: string
  status?: CompetitionStatus
  connected?: boolean
  children?: NavNode[]
}
