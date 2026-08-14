// eloboard.com/women scraper. Polite by design: sequential requests, fixed
// delay, backoff on the shared host's DB-connection errors.
//
// Usage:
//   node scraper/scrape.mjs players            refresh players.json
//   node scraper/scrape.mjs rankings [--all]   current month (or full history)
//   node scraper/scrape.mjs records --all      every player's match history
//   node scraper/scrape.mjs records --names a,b
//   node scraper/scrape.mjs prizes
//   node scraper/scrape.mjs summary            derive summary.json (offline)
//   node scraper/scrape.mjs daily              incremental: changed players only
//   node scraper/scrape.mjs backfill           players+rankings --all+records --all+prizes+summary
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import {
  parsePlayers, parseMonthRanking, parseWomenRecords,
  parsePrizes, parseMainMixedNames,
} from './parse.mjs';

const BASE = 'https://eloboard.com/women';
const DATA = new URL('../data/', import.meta.url).pathname;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';
const DELAY_MS = 2000;
const EARLIEST_MONTH = '2017-01'; // probe floor; empty months are skipped
const EARLIEST_YEAR = 2012; // hard floor for per-player record scans

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJson = (f, fallback) => (existsSync(DATA + f) ? JSON.parse(readFileSync(DATA + f, 'utf8')) : fallback);
const writeJson = (f, v) => {
  mkdirSync(DATA + f.split('/').slice(0, -1).join('/'), { recursive: true });
  writeFileSync(DATA + f, JSON.stringify(v));
};

let lastRequest = 0;
async function fetchText(path, form) {
  const url = path.startsWith('http') ? path : `${BASE}/${path}`;
  for (let attempt = 0; ; attempt++) {
    const wait = lastRequest + DELAY_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequest = Date.now();
    let body = null;
    try {
      const res = await fetch(url, {
        method: form ? 'POST' : 'GET',
        headers: {
          'User-Agent': UA,
          Referer: `${BASE}/`,
          'X-Requested-With': 'XMLHttpRequest',
          ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
        },
        body: form ? new URLSearchParams(form).toString() : undefined,
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) body = await res.text();
    } catch { /* retry below */ }
    // Shared-host DB saturation shows up as a PHP warning page; back off hard.
    if (body && !body.includes('max_user_connections') && !body.includes('Connect Error')) {
      if (body.includes('정상적인 접근이 아닙니다')) throw new Error(`rejected: ${url}`);
      return body;
    }
    if (attempt >= 5) throw new Error(`gave up after ${attempt + 1} tries: ${url}`);
    await sleep(Math.min(10000 * 2 ** attempt, 120000));
  }
}

// Stable player id: bj_list wr_id when known, else a name hash. Never
// reassigned once stored, so record filenames stay stable.
const fnv = (s) => {
  let h = 0x811c9dc5;
  for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
};

function loadPlayers() {
  return readJson('players.json', []);
}
function savePlayers(players) {
  players.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  writeJson('players.json', players);
}
// Merge newly discovered profileId/channel/race into players; add unknowns.
function upsertPlayer(players, { name, race, profileId, channel }) {
  let p = players.find((x) => x.name === name);
  if (!p) {
    p = { id: profileId ? `p${profileId}` : `h${fnv(name)}`, name, race: race ?? null, profileId: profileId ?? null, channel: channel ?? null };
    players.push(p);
    return p;
  }
  if (race) p.race = race;
  if (profileId && !p.profileId) p.profileId = profileId;
  if (channel && !p.channel) p.channel = channel;
  return p;
}

async function cmdPlayers() {
  const html = await fetchText('bbs/board.php?bo_table=search_list');
  const players = loadPlayers();
  for (const p of parsePlayers(html)) upsertPlayer(players, p);
  savePlayers(players);
  console.log(`players: ${players.length}`);
}

const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

async function fetchMonth(ym) {
  const html = await fetchText('bbs/month_list.php', { sear: `${ym.replace('-', '')}01`, b_id: 'eloboard' });
  return parseMonthRanking(html);
}

async function cmdRankings({ all = false } = {}) {
  const players = loadPlayers();
  const months = [];
  const now = monthKey();
  if (all) {
    for (let y = Number(EARLIEST_MONTH.slice(0, 4)); y <= new Date().getFullYear(); y++)
      for (let m = 1; m <= 12; m++) {
        const ym = `${y}-${String(m).padStart(2, '0')}`;
        if (ym <= now) months.push(ym);
      }
  } else {
    months.push(now);
    // Early in a month, last month's table may still be getting corrections.
    if (new Date().getDate() <= 3) months.push(monthKey(new Date(Date.now() - 5 * 86400000)));
  }
  for (const ym of months) {
    if (ym !== now && existsSync(`${DATA}rankings/${ym}.json`)) continue;
    const rows = await fetchMonth(ym);
    if (!rows.length) { console.log(`rankings ${ym}: empty, skip`); continue; }
    for (const r of rows) upsertPlayer(players, r);
    writeJson(`rankings/${ym}.json`, { month: ym, rows });
    console.log(`rankings ${ym}: ${rows.length} rows`);
  }
  savePlayers(players);
}

// The ajax endpoint accepts any target_year even though its UI select only
// lists recent years; '' means the current year. Mixed (혼성) records live on
// profile pages and are not collected yet.
async function fetchYear(name, year) {
  const html = await fetchText('bbs/ajax_women_record.php', { bj_name: name, target_year: year });
  return parseWomenRecords(html);
}

async function fetchRecordsFor(players, p, { full = false } = {}) {
  const women = [];
  const seen = new Set();
  const add = (rows) => {
    let added = 0;
    for (const r of rows) {
      const k = r.id ?? `${r.date}|${r.opp}|${r.delta}`;
      if (seen.has(k)) continue;
      seen.add(k);
      women.push(r);
      added++;
    }
    return added;
  };
  const existing = readJson(`records/${p.id}.json`, null);
  if (!full && existing) add(existing.women); // incremental: keep history
  add(await fetchYear(p.name, ''));
  if (full) {
    // ponytail: careers are treated as contiguous — two consecutive empty
    // years end the backwards scan
    let emptyStreak = 0;
    for (let y = new Date().getFullYear() - 1; y >= EARLIEST_YEAR && emptyStreak < 2; y--) {
      const rows = await fetchYear(p.name, String(y));
      if (rows.length) { emptyStreak = 0; add(rows); } else emptyStreak++;
    }
  }
  for (const r of women) {
    if (r.opp) upsertPlayer(players, { name: r.opp, race: null, profileId: r.oppProfileId });
  }
  women.sort((a, b) => (a.date === b.date ? Number(a.id) - Number(b.id) : a.date < b.date ? -1 : 1));
  writeJson(`records/${p.id}.json`, {
    id: p.id, name: p.name, race: p.race, profileId: p.profileId, channel: p.channel,
    updated: new Date().toISOString().slice(0, 10),
    fullHistory: full || existing?.fullHistory === true,
    women, mixed: existing?.mixed ?? [],
  });
  return { women: women.length };
}

async function cmdRecords({ names = null, all = false, changedOnly = false } = {}) {
  const players = loadPlayers();
  let targets;
  if (all) {
    // "all" = players seen in any stored monthly ranking (active players).
    const active = new Set();
    for (const f of readdirSync(`${DATA}rankings`))
      for (const r of readJson(`rankings/${f}`, { rows: [] }).rows) active.add(r.name);
    targets = players.filter((p) => active.has(p.name));
  } else if (names) {
    targets = players.filter((p) => names.includes(p.name));
  } else if (changedOnly) {
    targets = await detectChanged(players);
  } else {
    throw new Error('records: pass --all, --names or --changed');
  }
  if (all) {
    // Resume support: skip players whose full history is already on disk.
    targets = targets.filter((p) => readJson(`records/${p.id}.json`, null)?.fullHistory !== true);
  }
  console.log(`records: ${targets.length} players`);
  let done = 0;
  const failed = [];
  for (const p of targets) {
    try {
      // Full backwards scan for --all and for never-scanned players; changed
      // players in daily runs only merge-refresh the current year.
      const full = all || readJson(`records/${p.id}.json`, null)?.fullHistory !== true;
      const n = await fetchRecordsFor(players, p, { full });
      done++;
      console.log(`[${done}/${targets.length}] ${p.name}: ${n.women}w`);
    } catch (e) {
      failed.push(p.name);
      console.error(`FAIL ${p.name}: ${e.message}`);
    }
    if (done % 20 === 0) savePlayers(players);
  }
  savePlayers(players);
  if (failed.length) console.error(`failed players: ${failed.join(', ')}`);
}

// Incremental target detection: a new match changes the player's monthly W/L
// in month_list, so diff the fresh table against the stored snapshot. Mixed
// matches do not show there, so also take names from the main-page widget.
async function detectChanged(players) {
  const ym = monthKey();
  const old = readJson(`rankings/${ym}.json`, { rows: [] });
  const oldByName = new Map(old.rows.map((r) => [r.name, r]));
  const fresh = await fetchMonth(ym);
  for (const r of fresh) upsertPlayer(players, r);
  writeJson(`rankings/${ym}.json`, { month: ym, rows: fresh });
  const changed = new Set(
    fresh.filter((r) => {
      const o = oldByName.get(r.name);
      return !o || o.w !== r.w || o.l !== r.l;
    }).map((r) => r.name),
  );
  const mainHtml = await fetchText('');
  for (const n of parseMainMixedNames(mainHtml)) changed.add(n);
  // Players never scraped at all (e.g. newly registered) get picked up too.
  for (const p of players) if (changed.has(p.name) || !existsSync(`${DATA}records/${p.id}.json`)) changed.add(p.name);
  return players.filter((p) => changed.has(p.name));
}

async function cmdPrizes() {
  const html = await fetchText('bbs/board.php?bo_table=prize_rank');
  writeJson('prizes.json', parsePrizes(html));
  console.log('prizes saved');
}

// Offline derivation of everything the frontend needs beyond per-player files.
// The site cannot serve historical ELO (past-month queries return since-then
// aggregates with the CURRENT elo), so we reconstruct ELO over time from the
// per-match deltas: every player starts at 1000 and each match applies its
// delta. Verified exact against the live table (base 1000.0).
function cmdSummary() {
  const players = loadPlayers();
  const byName = new Map(players.map((p) => [p.name, p]));
  const recordFilesAll = existsSync(`${DATA}records`) ? readdirSync(`${DATA}records`) : [];

  // Per-player reconstruction: monthly {w, l, byRace, eloEnd}.
  const perPlayer = new Map(); // name -> Map(ym -> {w,l,vs:{Z,P,T},elo})
  for (const f of recordFilesAll) {
    const rec = readJson(`records/${f}`, null);
    if (!rec || !rec.women.length) continue;
    let elo = 1000;
    const byMonth = new Map();
    for (const m of rec.women) {
      elo = Math.round((elo + m.delta) * 10) / 10;
      const ym = m.date.slice(0, 7);
      const e = byMonth.get(ym) ?? { w: 0, l: 0, vs: { Z: [0, 0], P: [0, 0], T: [0, 0] } };
      m.win ? e.w++ : e.l++;
      if (e.vs[m.oppRace]) e.vs[m.oppRace][m.win ? 0 : 1]++;
      e.elo = elo;
      byMonth.set(ym, e);
    }
    perPlayer.set(rec.name, byMonth);
  }

  // Cross-player pass: per-month tables ranked by month-end ELO among players
  // active that month, written as months/YYYY-MM.json for the frontend.
  const months = [...new Set([...perPlayer.values()].flatMap((bm) => [...bm.keys()]))].sort();
  const rankOf = new Map(); // `${ym}|${name}` -> rank
  for (const ym of months) {
    const rows = [];
    for (const [name, bm] of perPlayer) {
      const e = bm.get(ym);
      if (!e) continue;
      rows.push({ name, race: byName.get(name)?.race ?? null, vsZ: e.vs.Z, vsP: e.vs.P, vsT: e.vs.T, w: e.w, l: e.l, elo: e.elo });
    }
    rows.sort((a, b) => b.elo - a.elo);
    rows.forEach((r, i) => { r.rank = i + 1; rankOf.set(`${ym}|${r.name}`, i + 1); });
    writeJson(`months/${ym}.json`, { month: ym, rows });
  }

  // Trend per player, appended into record files below.
  const trend = new Map(); // name -> [[ym, elo, w, l, rank], ...]
  for (const [name, bm] of perPlayer) {
    trend.set(name, [...bm.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([ym, e]) => [ym, e.elo, e.w, e.l, rankOf.get(`${ym}|${name}`)]));
  }

  // Sanity: reconstructed final ELO should match the live current table.
  const cur = readJson(`rankings/${monthKey()}.json`, { rows: [] }).rows;
  const off = cur.filter((r) => {
    const t = trend.get(r.name)?.at(-1);
    return t && Math.abs(t[1] - r.elo) > 0.5;
  });
  if (off.length) console.warn(`elo mismatch vs live table: ${off.length}/${cur.length} players, e.g. ${off.slice(0, 3).map((r) => r.name).join(', ')}`);

  const totals = {};
  const mapStats = {};
  const recent = [];
  const seenMatch = new Set();
  const raceAt = new Map(); // matchId -> {name: race} from the opponent's row

  const recordFiles = recordFilesAll;
  // First pass: collect each player's race at match time from opponents' rows.
  for (const f of recordFiles) {
    const rec = readJson(`records/${f}`, null);
    if (!rec) continue;
    for (const kind of ['women', 'mixed']) {
      for (const m of rec[kind]) {
        if (!m.id || !m.oppRace) continue;
        const key = `${kind}:${m.id}`;
        if (!raceAt.has(key)) raceAt.set(key, {});
        raceAt.get(key)[m.opp] = m.oppRace;
      }
    }
  }
  for (const f of recordFiles) {
    const rec = readJson(`records/${f}`, null);
    if (!rec) continue;
    const p = byName.get(rec.name);
    const t = (totals[rec.id] = { name: rec.name, race: p?.race ?? rec.race, n: 0, w: 0, l: 0, mixedN: 0, last: null, elo: null });
    const tr = trend.get(rec.name) ?? [];
    if (tr.length) t.elo = tr.at(-1)[1];
    for (const kind of ['women', 'mixed']) {
      for (const m of rec[kind]) {
        if (kind === 'women') { t.n++; m.win ? t.w++ : t.l++; } else t.mixedN++;
        if (!t.last || m.date > t.last) t.last = m.date;
        const key = `${kind}:${m.id ?? `${m.date}|${rec.name}|${m.opp}`}`;
        if (seenMatch.has(key)) continue;
        seenMatch.add(key);
        // ponytail: race at match time falls back to current race when the
        // opponent's own record was not scraped (retired/unlisted players)
        const myRace = raceAt.get(key)?.[rec.name] ?? t.race ?? '?';
        const oppRace = m.oppRace ?? byName.get(m.opp)?.race ?? '?';
        const winner = m.win ? { race: myRace } : { race: oppRace };
        const loser = m.win ? { race: oppRace } : { race: myRace };
        if (m.map) {
          const ms = (mapStats[m.map] ??= { games: 0, matchups: {} });
          ms.games++;
          if (winner.race !== '?' && loser.race !== '?' && winner.race !== loser.race) {
            const [a, b] = [winner.race, loser.race].sort();
            const mu = (ms.matchups[`${a}v${b}`] ??= [0, 0]);
            mu[winner.race === a ? 0 : 1]++;
          }
        }
        recent.push({
          kind: kind === 'women' ? 'w' : 'm', id: m.id, date: m.date, map: m.map,
          winner: m.win ? rec.name : m.opp, winnerRace: winner.race,
          loser: m.win ? m.opp : rec.name, loserRace: loser.race,
          series: m.series,
        });
      }
    }
  }
  recent.sort((a, b) => (a.date === b.date ? Number(b.id ?? 0) - Number(a.id ?? 0) : a.date < b.date ? 1 : -1));
  const prizes = readJson('prizes.json', []);
  for (const pr of prizes) {
    const p = byName.get(pr.name);
    const t = p && totals[p.id];
    if (t) t.money = pr.money;
  }
  // Trends ride along in each record file so a profile view is one fetch.
  for (const f of recordFiles) {
    const rec = readJson(`records/${f}`, null);
    if (!rec) continue;
    const tr = trend.get(rec.name) ?? [];
    if (JSON.stringify(rec.trend) !== JSON.stringify(tr)) {
      rec.trend = tr;
      writeJson(`records/${f}`, rec);
    }
  }
  writeJson('summary.json', {
    generated: new Date().toISOString(),
    months,
    totals,
    mapStats,
    recent: recent.slice(0, 80),
  });
  console.log(`summary: ${Object.keys(totals).length} players, ${seenMatch.size} unique matches, ${Object.keys(mapStats).length} maps`);
}

const argv = process.argv.slice(2);
const cmd = argv[0];
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const namesArg = argv.includes('--names') ? argv[argv.indexOf('--names') + 1].split(',') : null;

switch (cmd) {
  case 'players': await cmdPlayers(); break;
  case 'rankings': await cmdRankings({ all: flags.has('--all') }); break;
  case 'records': await cmdRecords({ all: flags.has('--all'), names: namesArg, changedOnly: flags.has('--changed') }); break;
  case 'prizes': await cmdPrizes(); break;
  case 'summary': cmdSummary(); break;
  case 'daily':
    await cmdPlayers();
    await cmdRankings();
    await cmdRecords({ changedOnly: true });
    await cmdPrizes();
    cmdSummary();
    break;
  case 'backfill':
    await cmdPlayers();
    await cmdRankings({ all: true });
    await cmdRecords({ all: true });
    await cmdPrizes();
    cmdSummary();
    break;
  default:
    console.error('usage: scrape.mjs players|rankings|records|prizes|summary|daily|backfill');
    process.exit(1);
}
