import crypto from 'node:crypto';
import { buildGroupStats, buildBatchCounts, buildDuplicateGroups, buildIsolationScores, scoreWork } from './riskScoring.js';

export const ENGINE_VERSION = 'sentinel-review-2.0';

export function sourceRow(work) {
  return {
    unique_work_number: work.id, work_name: work.name, state: work.state,
    district: work.district, constituency: work.constituency,
    sanction_amount: work.sanctioned, implementing_agency_name: work.contractor,
    date_of_administrative_approval: work.dateApproved, data_as_on: work.lastUpdated,
    work_status: work.status || '',
  };
}

// Reassess legacy records without presenting their invented expenditure or old scores.
export function assessWorks(works) {
  const rows = works.map(sourceRow);
  const stats = buildGroupStats(rows);
  const batches = buildBatchCounts(rows);
  const duplicates = buildDuplicateGroups(rows);
  const mlScores = rows.length >= 30 ? buildIsolationScores(rows, stats, batches) : rows.map(() => null);
  return works.map((work, i) => {
    const result = scoreWork(rows[i], stats, batches, duplicates, mlScores[i]);
    return { ...work, ...result, utilized: null, engineVersion: ENGINE_VERSION,
      assessmentType: rows.length >= 30 ? 'Rules + seeded Isolation Forest; exploratory, uncalibrated' : 'Rules only; fewer than 30 records, ML withheld',
      dataLimitations: ['Vendor payments unavailable', 'Completion status not verified',
        'Quantities and specifications unavailable; total sanctions are not unit costs',
        'Implementing agency is not a verified contractor identity'],
    };
  });
}

export function evidencePacket(work, reviews = []) {
  const snapshot = { engineVersion: ENGINE_VERSION, work, reviews };
  const snapshotJson = JSON.stringify(snapshot);
  return {
    ...snapshot, snapshotJson,
    snapshotSha256: crypto.createHash('sha256').update(snapshotJson).digest('hex'),
    interpretation: 'Review priority, not a probability or finding of fraud.',
    nextSteps: ['Check the sanction order and approved scope',
      'Request dated progress and payment records',
      'Verify any matched works refer to the same physical asset'],
    integrityNote: 'Hash the UTF-8 snapshotJson string to verify this snapshot. A hash does not prove source truth or prevent an administrator rewriting an entire local chain.',
    exportedAt: new Date().toISOString(),
  };
}
