// 水跃 UI 回归：从 index.html 抽出 calcJump，对比 baseline-expected.json
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const expected = JSON.parse(fs.readFileSync(path.join(__dirname, 'baseline-expected.json'), 'utf8'));

const start = html.indexOf('const g = 9.81');
const end = html.indexOf('/* ========== UI ==========');
if (start < 0 || end < 0) {
  console.error('FAIL: cannot locate calcJump');
  process.exit(1);
}
const api = new Function(html.slice(start, end) + '\nreturn {calcJump};')();

function near(a, b) {
  if (a === null || b === null || a === undefined || b === undefined) return a === b;
  if (typeof a === 'string' || typeof b === 'string') return a === b;
  return Math.abs(a - b) <= 1e-12;
}
function cmp(label, got, exp) {
  let ok = true;
  for (const k of Object.keys(exp)) {
    if (!near(got[k], exp[k])) {
      console.error(`FAIL ${label}.${k}: got ${got[k]}, expected ${exp[k]}`);
      ok = false;
    }
  }
  return ok;
}
function pick(r) {
  return { v1:r.v1, Fr1:r.Fr1, hk:r.hk, y2:r.y2, v2:r.v2, Fr2:r.Fr2, dy:r.dy, Lj:r.Lj, dE:r.dE, E1:r.E1, E2:r.E2, jumpType:r.jumpType };
}

const caseA = api.calcJump({ Q: 50, B: 10, y1: 0.50 });
const caseB = api.calcJump({ Q: 20, B: 5, y1: 0.80 });
const caseC = api.calcJump({ q: 8, y1: 0.30 });

const ok = cmp('caseA', pick(caseA), expected.caseA) &
  cmp('caseB', pick(caseB), expected.caseB) &
  cmp('caseC', pick(caseC), expected.caseC);

if (ok) {
  console.log('PASS: 水跃 calc 与基准完全一致');
  console.log('  caseA y2 =', caseA.y2, ' Lj =', caseA.Lj);
  process.exit(0);
} else {
  console.error('REGRESSION FAILED');
  process.exit(1);
}
