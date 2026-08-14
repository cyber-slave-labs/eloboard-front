// Pure HTML parsers for eloboard.com/women pages. No network here.
import * as cheerio from 'cheerio';

const RACE = { Z: 'Z', T: 'T', P: 'P', Zerg: 'Z', Terran: 'T', Protoss: 'P' };

// Some ajax endpoints return bare <tr> fragments; parse5 drops <tr> outside
// a <table>, so wrap fragments before loading.
const loadHtml = (html) =>
  cheerio.load(html.includes('<table') ? html : `<table>${html}</table>`);

// search_list page: player dropdown options like <option value="가영">가영|Terran</option>
export function parsePlayers(html) {
  const $ = cheerio.load(html);
  const out = new Map();
  $('option').each((_, el) => {
    const name = $(el).attr('value')?.trim();
    const txt = $(el).text().trim();
    const m = txt.match(/^(.+)\|(Zerg|Terran|Protoss)$/);
    if (!name || !m) return;
    out.set(name, { name, race: RACE[m[2]] });
  });
  return [...out.values()];
}

// month_list.php response: ranking table rows.
// tds: rank, player(link wr_id, text "안아P", optional soop link), vsZ, vsP, vsT, total, win%, elo, channel
export function parseMonthRanking(html) {
  const $ = loadHtml(html);
  const rows = [];
  $('tr').each((_, tr) => {
    const tds = $(tr).children('td');
    if (tds.length < 8) return;
    const rank = parseInt($(tds[0]).text(), 10);
    if (!Number.isFinite(rank)) return;
    const a = $(tds[1]).find('a[href*="bo_table=bj_list"]').first();
    const nameRaw = a.text().replace(/\s+/g, ' ').trim();
    const m = nameRaw.match(/^(.+?)([ZTP])$/);
    if (!m) return;
    const profileId = (a.attr('href') || '').match(/wr_id=(\d+)/)?.[1] ?? null;
    const wl = (i) => {
      const t = $(tds[i]).text();
      const w = t.match(/(\d+)\s*승/)?.[1], l = t.match(/(\d+)\s*패/)?.[1];
      return [Number(w ?? 0), Number(l ?? 0)];
    };
    const channel = $(tds[8]).find('a').attr('href') || null;
    rows.push({
      rank,
      name: m[1].trim(),
      race: m[2],
      profileId,
      vsZ: wl(2), vsP: wl(3), vsT: wl(4),
      w: wl(5)[0], l: wl(5)[1],
      elo: parseFloat($(tds[7]).text().replace(/,/g, '')) || null,
      channel,
    });
  });
  return rows;
}

// Match rows shared by ajax_women_record.php (women) and the inline mixed
// table on profile pages. A row is: date link to the record post, opponent
// link "이름(Z)", map, elo delta, series, note. Result = delta sign.
function parseMatchRows($, boardTable) {
  const out = [];
  $('tr').each((_, tr) => {
    const $tr = $(tr);
    const dateA = $tr.find(`a[href*="bo_table=${boardTable}"]`).first();
    if (!dateA.length) return;
    const date = dateA.text().trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const tds = $tr.children('td');
    if (tds.length < 4) return;
    const recordId = (dateA.attr('href') || '').match(/wr_id=(\d+)/)?.[1] ?? null;
    const oppCell = $(tds[1]);
    const oppRaw = oppCell.text().replace(/\s+/g, ' ').trim();
    const rm = oppRaw.match(/\(([ZTPztp])\)\s*$/);
    const opponent = oppRaw.replace(/\s*\([ZTPztp]\)\s*$/, '').trim();
    const oppProfileId = (oppCell.find('a[href*="bo_table=bj_list"]').attr('href') || '')
      .match(/wr_id=(\d+)/)?.[1] ?? null;
    const delta = parseFloat($(tds[3]).text().replace(/[^0-9.+-]/g, ''));
    if (!opponent || !Number.isFinite(delta)) return;
    out.push({
      id: recordId,
      date,
      opp: opponent,
      oppRace: rm ? rm[1].toUpperCase() : null,
      oppProfileId,
      map: $(tds[2]).text().replace(/\s+/g, ' ').trim() || null,
      delta,
      win: delta >= 0,
      series: $(tds[4])?.text().replace(/\s+/g, ' ').trim() || '',
      note: $(tds[5])?.text().replace(/\s+/g, ' ').trim() || '',
    });
  });
  // Dedupe by record id (rows can repeat across table redraws).
  const seen = new Set();
  return out.filter((r) => {
    const k = r.id ?? `${r.date}|${r.opp}|${r.delta}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function parseWomenRecords(html) {
  return parseMatchRows(loadHtml(html), 'bj_board');
}

export function parseMixedRecords(profileHtml) {
  return parseMatchRows(cheerio.load(profileHtml), 'mix_bat');
}

// Profile page year selector (#record_year) for the women-record ajax table.
export function parseRecordYears(profileHtml) {
  const $ = cheerio.load(profileHtml);
  const years = [];
  $('#record_year option').each((_, el) => {
    const v = $(el).attr('value')?.trim();
    if (v && /^\d{4}$/.test(v)) years.push(v);
  });
  return years;
}

// prize_rank page: per-player career prize money and podium counts.
export function parsePrizes(html) {
  const $ = cheerio.load(html);
  const out = [];
  $('tr').each((_, tr) => {
    const tds = $(tr).children('td');
    if (tds.length < 7) return;
    const rank = parseInt($(tds[0]).text(), 10);
    if (!Number.isFinite(rank)) return;
    const nameRaw = $(tds[1]).text().replace(/\s+/g, ' ').trim();
    const m = nameRaw.match(/^(.+?)\s*([ZTP])$/);
    if (!m) return;
    const count = (i) => parseInt($(tds[i]).text(), 10) || 0;
    out.push({
      rank,
      name: m[1].trim(),
      race: m[2],
      first: count(2), second: count(3), third: count(4), fourth: count(5),
      money: parseInt($(tds[6]).text().replace(/[^0-9]/g, ''), 10) || 0,
    });
  });
  return out;
}

// Main page mixed-recent widget: harvest player names that had new mixed
// matches, e.g. "클템T(승) vs 나무늘봉순Z(패)".
export function parseMainMixedNames(html) {
  const $ = cheerio.load(html);
  const names = new Set();
  $('a[href*="bo_table=mix_bat"]').each((_, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim();
    const m = t.match(/^(.+?)[ZTP]\((승|패)\)\s*vs\s*(.+?)[ZTP]\((승|패)\)$/);
    if (m) { names.add(m[1].trim()); names.add(m[3].trim()); }
  });
  return [...names];
}
