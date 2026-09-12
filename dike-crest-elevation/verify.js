// 回归：从 index.html 抽出纯 calc 逻辑，与 baseline-expected.json 对比
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const expected = JSON.parse(fs.readFileSync(path.join(__dirname, 'baseline-expected.json'), 'utf8'));

// 1) 系数表 / 常量
const c0 = html.indexOf('const gradeFB_noOW');
const c1 = html.indexOf('let lastSingle');
// 2) 插值 + calc（到 fv 为止）
const d0 = html.indexOf('function lerp');
const d1 = html.indexOf('function fv');
if (c0 < 0 || c1 < 0 || d0 < 0 || d1 < 0) {
  console.error('FAIL: cannot locate calc blocks');
  process.exit(1);
}
const block = html.slice(c0, c1) + '\n' + html.slice(d0, d1);

const api = new Function(block + '\nreturn {calc};')();

const caseA = {
  name: '基准A-常规3级', section: 'K5+200',
  WL: 52.50, A: 0.70, d: 3.50,
  V: 8.5, F: 2200, beta: 0,
  m: 2.5, Kd: 0.85, P: 2, useE: true,
  overtop: false, grade: 3, surfText: '砌石'
};
const caseB = {
  name: '基准B-1级斜向允许越浪', section: 'K12+850',
  WL: 18.20, A: 0.50, d: 5.20,
  V: 12.0, F: 4500, beta: 25,
  m: 3.0, Kd: 0.92, P: 1, useE: true,
  overtop: true, grade: 1, surfText: '混凝土板'
};

const keys = ['Hbar','Tbar','L0','Lbar','hl','Hd','Kw','e','cosb','Kp','Kv','R0','Rp','crest','tmin'];

function compare(label, got, exp) {
  let ok = true;
  for (const k of keys) {
    if (!(Math.abs(got[k] - exp[k]) <= 1e-12)) {
      console.error(`FAIL ${label}.${k}: got ${got[k]}, expected ${exp[k]}`);
      ok = false;
    }
  }
  return ok;
}

const a = api.calc(caseA);
const b = api.calc(caseB);
const okA = compare('caseA', a, expected.caseA);
const okB = compare('caseB', b, expected.caseB);

if (okA && okB) {
  console.log('PASS: 堤顶高程 calc 与基准完全一致');
  console.log('  caseA crest =', a.crest);
  console.log('  caseB crest =', b.crest);
  process.exit(0);
} else {
  console.error('REGRESSION FAILED');
  process.exit(1);
}
