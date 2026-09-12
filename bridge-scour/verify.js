// 桥墩冲刷 UI 回归：从 index.html 抽出纯 calc，对比 baseline-expected.json
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const expected = JSON.parse(fs.readFileSync(path.join(__dirname, 'baseline-expected.json'), 'utf8'));

const start = html.indexOf('function calcGeneralScourPure');
const end = html.indexOf('/* ========== UI ==========');
if (start < 0 || end < 0) {
  console.error('FAIL: cannot locate calc block');
  process.exit(1);
}
const block = html.slice(start, end);
const api = new Function(block + '\nreturn {calcGeneralScourPure, calcLocalScourPure, approachVelocity};')();

function near(a, b) {
  if (a === null || b === null || a === undefined || b === undefined) return a === b || (a == null && b == null);
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

const genA = api.calcGeneralScourPure({formula:'64-1', hmc:8.5, hc:5.2, Bc:80, Qc:1200, E:0.66, dc:0.5, A:1.0});
const vA = api.approachVelocity('64-1', genA.hp, 0.5, 0.66, null, null);
const locA = api.calcLocalScourPure({formula:'65-1', B1:3.0, Kxi:1.00, d:0.5, v:vA}, genA.hp);
const totalA = 0 + genA.genScourDepth + locA.hb;
const lowestA = 52.50 - totalA;

const genB = api.calcGeneralScourPure({formula:'cohesive', hmc:6.0, hc:4.0, Bc:60, Qc:800, IL:0.5, A:1.1});
const locB = api.calcLocalScourPure({formula:'cohesive', B1:2.5, Kxi:1.00, IL:0.5}, genB.hp);
const totalB = 1.0 + genB.genScourDepth + locB.hb;
const lowestB = 40.00 - totalB;

const genC = api.calcGeneralScourPure({formula:'64-2', hmc:8.5, hc:5.2, Bc:80, Qc:1200, E:0.66, dc:0.5, A:1.0});
const vC = api.approachVelocity('64-2', genC.hp, 0.5, 0.66, null, null);
const locC = api.calcLocalScourPure({formula:'65-2', B1:3.0, Kxi:1.00, d:0.5, v:vC}, genC.hp);

const gotA = {hp:genA.hp, genScourDepth:genA.genScourDepth, hb:locA.hb, v:locA.v, v0:locA.v0, type:locA.type, totalA, lowestA};
const gotB = {hp:genB.hp, genScourDepth:genB.genScourDepth, hb:locB.hb, v:locB.v, type:locB.type, totalB, lowestB};
const gotC = {hp:genC.hp, genScourDepth:genC.genScourDepth, hb:locC.hb, v:locC.v, v0:locC.v0, type:locC.type};

const ok = cmp('caseA', gotA, expected.caseA) &
  cmp('caseB', gotB, expected.caseB) &
  cmp('caseC', gotC, expected.caseC);

if (ok) {
  console.log('PASS: 桥墩冲刷 calc 与基准完全一致');
  console.log('  caseA total =', totalA, ' lowest =', lowestA);
  console.log('  caseB total =', totalB, ' lowest =', lowestB);
  process.exit(0);
} else {
  console.error('REGRESSION FAILED');
  process.exit(1);
}
