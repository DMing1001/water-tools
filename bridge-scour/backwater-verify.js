// 桥梁壅水 UI 回归：从 backwater.html 抽出 calcRailway/calcHighway，对比 baseline
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'backwater.html'), 'utf8');
const expected = JSON.parse(fs.readFileSync(path.join(__dirname, 'backwater-baseline-expected.json'), 'utf8'));

const start = html.indexOf('const g = 9.81');
const end = html.indexOf('function renderResult');
if (start < 0 || end < 0) {
  // fallback: look for calcRailway definition block
  const s2 = html.indexOf('function calcRailway');
  const e2 = html.indexOf('function renderResult');
  if (s2 < 0 || e2 < 0) {
    console.error('FAIL: cannot locate calc block');
    process.exit(1);
  }
  var block = html.slice(Math.max(0, html.lastIndexOf('const g', s2) >= 0 ? html.lastIndexOf('const g', s2) : s2), e2);
} else {
  var block = html.slice(start, end);
}

const api = new Function(block + '\nreturn {calcRailway, calcHighway};')();

function near(a, b) {
  if (a === null || b === null) return a === b;
  if (a === undefined || b === undefined) return a === b;
  return Math.abs(a - b) <= 1e-12;
}

function cmpObj(label, got, exp) {
  let ok = true;
  for (const k of Object.keys(exp)) {
    if (!near(got[k], exp[k])) {
      console.error(`FAIL ${label}.${k}: got ${got[k]}, expected ${exp[k]}`);
      ok = false;
    }
  }
  return ok;
}

const caseRail = api.calcRailway({
  qp: 3680, V: 2.50, I0: 0.0005,
  eta: 0.10, vmAuto: true,
  VP: 2.97, alpha_rail: 0,
  soilType: 'medium', Pmode: 'auto',
  omega: 169.36, pierArea: 2.10
});
const caseHw = api.calcHighway({
  Vq: 2.92, Vch: 2.92, d: 14.2, P: 1.2, I0: 0.0004
});
const caseRailManual = api.calcRailway({
  qp: 1000, V: 2.0, I0: 0.001,
  eta: 0.07, vmAuto: false, VM: 3.5
});

const keysR = ['dZM','LY','VM','omegaX','omegaG','P_rail'];
const keysH = ['A','V0q','KN','Kv','K','dZM','LY'];

function pick(o, keys){const r={};for(const k of keys)r[k]=o[k];return r}

const ok1 = cmpObj('caseRail', pick(caseRail, keysR), expected.caseRail);
const ok2 = cmpObj('caseHw', pick(caseHw, keysH), expected.caseHw);
const ok3 = cmpObj('caseRailManual', pick(caseRailManual, keysR), expected.caseRailManual);

if (ok1 && ok2 && ok3) {
  console.log('PASS: 桥梁壅水 calc 与基准完全一致');
  console.log('  caseRail dZM =', caseRail.dZM);
  console.log('  caseHw  dZM =', caseHw.dZM);
  console.log('  manual  dZM =', caseRailManual.dZM);
  process.exit(0);
} else {
  console.error('REGRESSION FAILED');
  process.exit(1);
}
