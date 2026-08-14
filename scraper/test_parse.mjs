// Fixture-based self-check: node scraper/test_parse.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  parsePlayers, parseMonthRanking, parseWomenRecords,
  parseMixedRecords, parsePrizes, parseMainMixedNames,
} from './parse.mjs';

const fx = (f) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8');

const players = parsePlayers(fx('players.html'));
assert.ok(players.length > 500, `players: ${players.length}`);
const gayoung = players.find((p) => p.name === '가영');
assert.deepEqual(gayoung, { name: '가영', race: 'T' });

const ranking = parseMonthRanking(fx('month.html'));
assert.ok(ranking.length > 100, `ranking rows: ${ranking.length}`);
assert.equal(ranking[0].rank, 1);
assert.equal(ranking[0].name, '안아');
assert.equal(ranking[0].race, 'P');
assert.equal(ranking[0].profileId, '175');
assert.equal(ranking[0].elo, 1784.2);
const habli = ranking.find((r) => r.name === '하블리');
assert.deepEqual(habli.vsP, [16, 5]);
assert.equal(habli.w, 42);

const rec = parseWomenRecords(fx('records.html'));
assert.ok(rec.length > 400, `records: ${rec.length}`);
assert.equal(rec[0].id, '253230');
assert.equal(rec[0].opp, '땃쥐');
assert.equal(rec[0].oppRace, 'Z');
assert.equal(rec[0].map, '애티튜드');
assert.equal(rec[0].delta, 13.1);
assert.equal(rec[0].win, true);
assert.ok(rec.every((r) => r.map !== null && r.date && r.opp));

const mixed = parseMixedRecords(fx('profile.html'));
assert.ok(mixed.length >= 4, `mixed: ${mixed.length}`);
assert.ok(mixed.every((r) => r.map && /^\d{4}-\d{2}-\d{2}$/.test(r.date)));
assert.ok(mixed.some((r) => r.opp === '혁민'));

const prizes = parsePrizes(fx('prize.html'));
assert.ok(prizes.length > 10, `prizes: ${prizes.length}`);
assert.equal(prizes[0].name, '서지수');
assert.equal(prizes[0].first, 16);
assert.equal(prizes[0].money, 44850000);

console.log('all parsers ok:', {
  players: players.length, ranking: ranking.length,
  records: rec.length, mixed: mixed.length, prizes: prizes.length,
});
