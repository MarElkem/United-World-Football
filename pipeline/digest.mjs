// Text briefs for the assistant, one per competition, so the chat server can
// send a small model only the parts a question is about. The assistant may
// only answer from these, so whatever the site does not hold, it cannot claim.

const when = (iso) => iso.slice(0, 16).replace('T', ' ') + ' UTC'

function score(m) {
  if (!m.score) return 'v'
  let s = `${m.score.home}-${m.score.away}`
  if (m.extraTime) s += ' aet'
  if (m.penalties) s += ` (pens ${m.penalties.home}-${m.penalties.away})`
  return s
}

export function buildDigest({ competitions, teams, news, catalogue, now = Date.now() }) {
  const name = (id) => (id ? (teams[id]?.name ?? id) : 'To be decided')
  const matchLine = (m) => {
    const status = m.status === 'scheduled' ? 'scheduled' : m.status.replace(/_/g, ' ')
    return `- ${when(m.kickoff)} | ${m.round} | ${name(m.homeId)} ${score(m)} ${name(m.awayId)} | ${status}`
  }

  const blocks = {}
  for (const c of competitions) {
    const out = [`## ${c.name} (season ${c.season}; ${c.status}; data from ${c.stamp.source}. ${c.stamp.note ?? ''})`]
    if (c.about) out.push(c.about)
    for (const s of c.stages) {
      const zones = new Map((s.zones ?? []).map((z) => [z.zone, z.label]))
      out.push(`Stage: ${s.name}`)
      for (const g of s.groups ?? []) {
        if (s.groups.length > 1) out.push(` ${g.name}`)
        for (const r of g.table) {
          const gd = r.goalsFor - r.goalsAgainst
          const zone = r.zone ? ` [${zones.get(r.zone) ?? r.zone}]` : ''
          out.push(`  ${r.position}. ${name(r.teamId)} P${r.played} W${r.won} D${r.drawn} L${r.lost} GD${gd >= 0 ? '+' : ''}${gd} Pts${r.points}${zone}`)
        }
      }
      for (const r of s.rounds ?? []) {
        out.push(` ${r.name}:`)
        for (const t of r.ties) {
          const agg = t.aggregate ? ` agg ${t.aggregate.home}-${t.aggregate.away}` : ''
          const won = t.winnerId ? `, ${name(t.winnerId)} through${t.decidedBy ? ` (${t.decidedBy.replace('_', ' ')})` : ''}` : ', undecided'
          out.push(`  ${name(t.homeId)} v ${name(t.awayId)}${agg}${won}`)
        }
      }
    }
    const sorted = [...c.matches].sort((a, b) => a.kickoff.localeCompare(b.kickoff))
    const past = sorted.filter((m) => m.score && m.status !== 'live' && m.status !== 'half_time').slice(-10)
    const live = sorted.filter((m) => m.status === 'live' || m.status === 'half_time')
    const next = sorted.filter((m) => m.status === 'scheduled' && new Date(m.kickoff).getTime() > now).slice(0, 10)
    if (live.length) out.push('Live now:', ...live.map(matchLine))
    if (past.length) out.push('Latest results:', ...past.map(matchLine))
    if (next.length) out.push('Next fixtures:', ...next.map(matchLine))

    const teamNames = [...new Set(c.matches.flatMap((m) => [m.homeId, m.awayId]))].map(name)
    blocks[c.slug] = { name: c.name, shortName: c.shortName, teams: teamNames, text: out.join('\n') }
  }

  const withData = new Set(competitions.map((c) => c.slug))
  const overview = [
    `Today is ${new Date(now).toISOString().slice(0, 10)}.`,
    'Competitions with data on the site, and who leads:',
    ...competitions.map((c) => {
      const g = c.stages.find((s) => s.groups?.length === 1)?.groups[0]
      return `- ${c.name}: ${g?.table[0] ? `${name(g.table[0].teamId)} top on ${g.table[0].points} points` : c.status}`
    }),
    `Listed but not connected yet (no data): ${catalogue.filter((e) => !withData.has(e.slug)).map((e) => e.label).join('; ')}`,
  ].join('\n')

  const headlines = news
    .slice(0, 20)
    .map((a) => `- ${a.publishedAt.slice(0, 10)} | ${a.title} | ${a.source}`)
    .join('\n')

  return { generatedAt: new Date(now).toISOString(), overview, competitions: blocks, news: `## Latest headlines\n${headlines || '(none)'}` }
}
