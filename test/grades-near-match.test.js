import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GradesProvider } from '../src/core/providers/gradesProvider.js';

const provider = new GradesProvider();

describe('GradesProvider last-name matching', () => {
  it('uses exact course + last-name matches', async () => {
    const result = await provider.lookup({ rawName: 'Weng, S', course: 'MA 26600' });
    assert.equal(result.status, 'ok');
    assert.equal(result.confidence, 0.9);
    assert.equal(typeof result.gpa, 'number');
  });

  it('does not attribute Wang GPA to Weng via single-edit near-match', async () => {
    // MA 26500 has wang but not weng/wen; near-match previously returned wang.
    const result = await provider.lookup({ rawName: 'Weng, S', course: 'MA 26500' });
    assert.equal(result.status, 'no_match');
    assert.equal(result.gpa, undefined);
  });

  it('does not attribute Choi GPA to Cho', async () => {
    const result = await provider.lookup({ rawName: 'Cho, S', course: 'AD 11300' });
    assert.equal(result.status, 'no_match');
    assert.equal(result.gpa, undefined);
  });

  it('does not attribute Wang GPA to Wong', async () => {
    const result = await provider.lookup({ rawName: 'Wong, J', course: 'AAE 33800' });
    assert.equal(result.status, 'no_match');
    assert.equal(result.gpa, undefined);
  });

  it('does not attribute Lee GPA to Le', async () => {
    const result = await provider.lookup({ rawName: 'Le, J', course: 'AAE 33300' });
    assert.equal(result.status, 'no_match');
    assert.equal(result.gpa, undefined);
  });

  it('does not attribute Chen GPA to Cheng', async () => {
    const result = await provider.lookup({ rawName: 'Cheng, Y', course: 'AT 10901' });
    assert.equal(result.status, 'no_match');
    assert.equal(result.gpa, undefined);
  });
});
