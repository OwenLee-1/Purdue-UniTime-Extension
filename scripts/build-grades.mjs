// Data-prep script (run with: npm run build:grades).
//
// Downloads the open BoilerGrades grade-distribution CSVs (sourced via a public
// records request to Purdue), computes an average GPA per (course + instructor)
// across all available semesters, and writes a compact bundled dataset to
// src/core/providers/gradesData.js.
//
// The CSVs only contain letter-grade PERCENTAGES, so we compute GPA ourselves
// using standard Purdue grade points. We aggregate by simple mean across sections
// (we don't have enrollment counts to weight by).

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = 'eduxstad/boiler-grades';
const TREE_URL = `https://api.github.com/repos/${REPO}/git/trees/main?recursive=1`;
const RAW = (path) => `https://raw.githubusercontent.com/${REPO}/main/${path}`;

// Purdue grade points. Non-GPA marks (AU, I, N, P, PI, S, SI, U, W) are excluded.
const POINTS = {
  'A+': 4.0, A: 4.0, 'A-': 3.7,
  'B+': 3.3, B: 3.0, 'B-': 2.7,
  'C+': 2.3, C: 2.0, 'C-': 1.7,
  'D+': 1.3, D: 1.0, 'D-': 0.7,
  E: 0.0, F: 0.0,
};

function parsePct(v) {
  if (!v) return 0;
  const n = parseFloat(String(v).replace('%', '').trim());
  return Number.isFinite(n) ? n : 0;
}

function lastNameKey(instructor) {
  // Instructor is "Last, First M." — take the part before the comma.
  const last = String(instructor || '').split(',')[0] || '';
  return last
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

function sectionGpa(row, colOf) {
  let num = 0;
  let den = 0;
  for (const [letter, pts] of Object.entries(POINTS)) {
    const idx = colOf[letter];
    if (idx === undefined) continue;
    const pct = parsePct(row[idx]);
    num += pct * pts;
    den += pct;
  }
  return den > 0 ? num / den : null;
}

// Letter buckets for the hover-card histogram (we fold +/- into the base letter).
const BUCKETS = {
  A: ['A+', 'A', 'A-'],
  B: ['B+', 'B', 'B-'],
  C: ['C+', 'C', 'C-'],
  D: ['D+', 'D', 'D-'],
  F: ['E', 'F'],
};

/**
 * Returns the A/B/C/D/F percentage breakdown for a section, normalized to sum to
 * 100 across just those GPA-bearing grades (ignores W/P/S/etc.). Null if empty.
 */
function sectionDistribution(row, colOf) {
  const raw = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  let total = 0;
  for (const [bucket, letters] of Object.entries(BUCKETS)) {
    for (const letter of letters) {
      const idx = colOf[letter];
      if (idx === undefined) continue;
      const pct = parsePct(row[idx]);
      raw[bucket] += pct;
      total += pct;
    }
  }
  if (total <= 0) return null;
  const norm = {};
  for (const k of Object.keys(raw)) norm[k] = (raw[k] / total) * 100;
  return norm;
}

async function listCsvFiles() {
  const res = await fetch(TREE_URL);
  if (!res.ok) throw new Error(`tree fetch ${res.status}`);
  const data = await res.json();
  return data.tree
    .filter((t) => t.type === 'blob' && /\.csv$/i.test(t.path) && !/_db\.csv$/i.test(t.path))
    .map((t) => t.path);
}

function splitCsvLine(line) {
  return line.split(';');
}

async function processCsv(path, acc) {
  const res = await fetch(RAW(path));
  if (!res.ok) {
    console.warn(`skip ${path}: ${res.status}`);
    return;
  }
  const text = await res.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return;

  const header = splitCsvLine(lines[0]);
  const colOf = {};
  header.forEach((name, i) => {
    colOf[name.trim()] = i;
  });

  const iSubject = colOf['Subject'];
  const iNumber = colOf['Course Number'];
  const iInstructor = colOf['Instructor'];
  if (iSubject === undefined || iNumber === undefined || iInstructor === undefined) {
    console.warn(`skip ${path}: missing key columns`);
    return;
  }

  let lastCourse = '';
  let lastNum = '';
  for (let r = 1; r < lines.length; r++) {
    const row = splitCsvLine(lines[r]);
    // The CSV omits repeated Subject/Course on continuation rows, so carry forward.
    const subject = (row[iSubject] || '').trim() || lastCourse;
    const number = (row[iNumber] || '').trim() || lastNum;
    lastCourse = subject;
    lastNum = number;
    const instructor = (row[iInstructor] || '').trim();
    if (!subject || !number || !instructor) continue;

    const gpa = sectionGpa(row, colOf);
    if (gpa === null) continue;
    const dist = sectionDistribution(row, colOf);

    const courseKey = `${subject} ${number}`;
    const nameKey = lastNameKey(instructor);
    if (!nameKey) continue;

    acc[courseKey] = acc[courseKey] || {};
    const rec = (acc[courseKey][nameKey] = acc[courseKey][nameKey] || {
      sum: 0,
      n: 0,
      dist: { A: 0, B: 0, C: 0, D: 0, F: 0 },
    });
    rec.sum += gpa;
    rec.n += 1;
    if (dist) for (const k of Object.keys(rec.dist)) rec.dist[k] += dist[k];
  }
}

async function main() {
  console.log('Listing CSV files…');
  const files = await listCsvFiles();
  console.log(`Found ${files.length} CSV files:`, files.join(', '));

  const acc = {};
  for (const f of files) {
    console.log(`Processing ${f}…`);
    await processCsv(f, acc);
  }

  // Collapse to { course: { lastname: { gpa, n, dist } } }. dist is the average
  // A/B/C/D/F percentage breakdown (whole numbers) across this prof's sections.
  const out = {};
  let entries = 0;
  for (const [course, profs] of Object.entries(acc)) {
    out[course] = {};
    for (const [name, { sum, n, dist }] of Object.entries(profs)) {
      out[course][name] = {
        gpa: Math.round((sum / n) * 100) / 100,
        n,
        dist: {
          A: Math.round(dist.A / n),
          B: Math.round(dist.B / n),
          C: Math.round(dist.C / n),
          D: Math.round(dist.D / n),
          F: Math.round(dist.F / n),
        },
      };
      entries++;
    }
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const outPath = join(here, '..', 'src', 'core', 'providers', 'gradesData.js');
  const banner =
    '// AUTO-GENERATED by scripts/build-grades.mjs — do not edit by hand.\n' +
    '// Per "SUBJECT NUMBER" course, keyed by instructor last name:\n' +
    '//   { gpa, n (sections averaged), dist: { A,B,C,D,F percentages } }\n' +
    '// Source: BoilerGrades open dataset (Purdue public-records grade distributions).\n';
  writeFileSync(outPath, `${banner}export const GRADES = ${JSON.stringify(out)};\n`);

  console.log(`Wrote ${entries} (course,instructor) GPA entries across ${Object.keys(out).length} courses.`);
  console.log(`Output: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
