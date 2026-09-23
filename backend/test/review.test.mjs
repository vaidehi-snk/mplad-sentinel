import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { assessWorks, evidencePacket } from '../lib/evidence.js';
import { buildDuplicateGroups, buildBatchCounts, parseIndianDate } from '../lib/riskScoring.js';
import { IsolationForest } from '../lib/isolationForest.js';

test('incomplete historical records do not establish expenditure or delay', () => {
  const [work] = assessWorks([{ id:'A', name:'Bridge', state:'S', constituency:'C', sanctioned:9000000,
    utilized:9000000, contractor:'Agency', dateApproved:'01-01-2010', lastUpdated:'01-01-2026' }]);
  assert.equal(work.utilized, null);
  assert.equal(work.score, 0);
  assert.ok(work.assessmentType.includes('ML withheld'));
});

test('Unicode descriptions remain distinct and repeat IDs are not duplicate works', () => {
  const base = { state:'S', constituency:'C' };
  const groups = buildDuplicateGroups([
    {...base, unique_work_number:'a', work_name:'विद्यालय'},
    {...base, unique_work_number:'b', work_name:'पानी'},
    {...base, unique_work_number:'a', work_name:'विद्यालय'},
  ]);
  assert.deepEqual(groups, {});
});

test('missing dates and agency names do not create a batch signal', () => {
  assert.deepEqual(buildBatchCounts(Array.from({length:5}, () => ({}))), {});
  assert.equal(parseIndianDate('31-02-2025'), null);
  assert.equal(parseIndianDate('29-02-2025'), null);
  assert.ok(parseIndianDate('29-02-2024'));
});

test('seeded forest ranks an isolated value above the normal median reproducibly', () => {
  const points = Array.from({length:60}, (_,i) => [100 + i % 7, 1, 0]);
  points.push([10000, 1, 0]);
  const a = new IsolationForest(), b = new IsolationForest();
  a.fit(points); b.fit(points);
  assert.deepEqual(a.scoreAll(points), b.scoreAll(points));
  assert.ok(a.score(points.at(-1)) > a.score(points[20]));
  assert.ok(a.scoreAll(points).every(Number.isFinite));
});

test('evidence digest detects changes to the exported snapshot', () => {
  const p = evidencePacket({id:'A', sanctioned:100});
  const digest = value => crypto.createHash('sha256').update(value).digest('hex');
  assert.equal(digest(p.snapshotJson), p.snapshotSha256);
  assert.notEqual(digest(p.snapshotJson.replace('100', '200')), p.snapshotSha256);
});
