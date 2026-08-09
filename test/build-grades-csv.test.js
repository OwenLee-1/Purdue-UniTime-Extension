import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectCsvFormat,
  ingestCsvText,
  lastNameKey,
  looksLikeHeaderlessTermRow,
  splitDelimitedLine,
} from '../scripts/build-grades.mjs';

test('splitDelimitedLine keeps quoted comma instructor names intact', () => {
  const fields = splitDelimitedLine(
    'AAE,,20300,Aeromechanics I,202210,Fall 2021,002,67031,"Hassan, Hashim",9.3%,,,,37.1%',
    ','
  );
  assert.equal(fields[8], 'Hassan, Hashim');
  assert.equal(fields[2], '20300');
});

test('detectCsvFormat recognizes comma header, semicolon header, and headerless fall2023', () => {
  assert.deepEqual(
    detectCsvFormat('Subject,Subject Desc,Course Number,Title,Instructor,A,B,C,D,F,W'),
    { delimiter: ',', headerless: false }
  );
  assert.deepEqual(
    detectCsvFormat('Subject;Subject Desc;Course Number;Title;Instructor;A;B;C;D;F;W'),
    { delimiter: ';', headerless: false }
  );
  assert.deepEqual(
    detectCsvFormat('Fall 2023;AAE;20300;Aeromechanics I;Hassan, Hashim;27.9%;47.0%;18.6%;3.8%;1.6%;1.1%;'),
    { delimiter: ';', headerless: true }
  );
  assert.equal(detectCsvFormat('not,a,grades,file'), null);
});

test('looksLikeHeaderlessTermRow rejects short or malformed rows', () => {
  assert.equal(looksLikeHeaderlessTermRow(['Fall 2023', 'AAE']), false);
  assert.equal(
    looksLikeHeaderlessTermRow([
      'Fall 2023',
      'AAE',
      '20300',
      'Aeromechanics I',
      'Hassan Hashim',
      '27.9%',
      '47.0%',
      '18.6%',
      '3.8%',
      '1.6%',
      '1.1%',
    ]),
    false
  );
});

test('ingestCsvText parses fall2021-style comma CSV including continuation rows', () => {
  const text = [
    'Subject,Subject Desc,Course Number,Title,Academic Period,Academic Period Desc,Section,CRN,Instructor,A,A-,A+,AU,B,B-,B+,C,C-,C+,D,D-,D+,E,F,FN,I,IF,N,NS,P,PI,S,SI,U,W,WF,WN,WU,',
    'AAE,AAE-Aero & Astro Engineering,20300,Aeromechanics I,202210,Fall 2021,002,67031,"Arnas Martinez, David",12.6%,,,,21.1%,,,36.0%,,,15.4%,,,,10.9%,,,,,,,,,,,4.0%,,,,',
    ',,,,,,003,13363,"Hassan, Hashim",9.3%,,,,37.1%,,,27.1%,,,14.3%,,,,10.7%,,,,0.7%,,,,,,,0.7%,,,,',
  ].join('\n');

  const acc = {};
  const result = ingestCsvText('fall2021.csv', text, acc);
  assert.equal(result.skipped, false);
  assert.equal(result.processed, 2);
  assert.ok(acc['AAE 20300'].arnasmartinez);
  assert.ok(acc['AAE 20300'].hassan);
  assert.equal(lastNameKey('Hassan, Hashim'), 'hassan');
  assert.equal(acc['AAE 20300'].hassan.n, 1);
  assert.ok(acc['AAE 20300'].hassan.sum > 0);
});

test('ingestCsvText parses fall2023 headerless A/B/C/D/F rows', () => {
  const text = [
    'Fall 2023;AAE;20300;Aeromechanics I;Hassan, Hashim;27.9%;47.0%;18.6%;3.8%;1.6%;1.1%;',
    'Fall 2023;AAE;33300;Fluid Mechanics;Canino, James V.;17.6%;35.3%;29.4%;11.8%;5.9%;;',
  ].join('\n');

  const acc = {};
  const result = ingestCsvText('fall2023.csv', text, acc);
  assert.equal(result.skipped, false);
  assert.equal(result.processed, 2);
  assert.equal(acc['AAE 20300'].hassan.n, 1);
  assert.equal(acc['AAE 33300'].canino.n, 1);
  // 27.9*4 + 47*3 + 18.6*2 + 3.8*1 + 1.6*0 = 111.6+141+37.2+3.8 = 293.6 / 98.9 ≈ 2.968
  const gpa = acc['AAE 20300'].hassan.sum / acc['AAE 20300'].hassan.n;
  assert.ok(gpa > 2.9 && gpa < 3.05, `unexpected gpa ${gpa}`);
});

test('legacy semicolon-only split would drop fall2021; ingest no longer skips it', () => {
  const fall2021Header =
    'Subject,Subject Desc,Course Number,Title,Academic Period,Academic Period Desc,Section,CRN,Instructor,A,B,C,D,F';
  // Old splitCsvLine used line.split(';') and then required named Subject columns.
  const legacyFields = fall2021Header.split(';');
  assert.equal(legacyFields.length, 1);
  assert.equal(legacyFields[0].includes('Subject'), true);
  assert.notEqual(legacyFields[0].trim(), 'Subject');

  const acc = {};
  const result = ingestCsvText(
    'fall2021.csv',
    `${fall2021Header}\nAAE,desc,20300,title,202210,Fall 2021,001,1,"Tallman, Tyler N.",10%,20%,30%,20%,20%`,
    acc
  );
  assert.equal(result.skipped, false);
  assert.ok(acc['AAE 20300'].tallman);
});
