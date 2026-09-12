// 水跃计算 — 基准回归脚本（矩形断面，标准水力学公式）
// 用法: node baseline.js

const g = 9.81;

function calcJump(inp){
  // inp: { y1, q } 或 { y1, Q, B }
  let y1 = inp.y1;
  let q, Q = null, B = null;
  if (inp.q != null && !isNaN(inp.q)) {
    q = inp.q;
    if (inp.Q != null && !isNaN(inp.Q)) { Q = inp.Q; B = inp.B; }
    else if (inp.B != null && !isNaN(inp.B) && inp.Q != null && !isNaN(inp.Q)) {
      Q = inp.Q; B = inp.B; q = Q / B;
    }
  } else if (inp.Q != null && inp.B != null) {
    Q = inp.Q; B = inp.B; q = Q / B;
  } else {
    return null;
  }

  if (isNaN(y1) || y1 <= 0 || q <= 0) return null;

  const v1 = q / y1;
  const Fr1 = v1 / Math.sqrt(g * y1);
  const hk = Math.pow(q * q / g, 1 / 3);

  // 共轭水深
  const y2 = y1 / 2 * (Math.sqrt(1 + 8 * Fr1 * Fr1) - 1);
  const v2 = q / y2;
  const Fr2 = v2 / Math.sqrt(g * y2);

  // 水跃长度（常用：Lj = 6.9(y2-y1)）
  const dy = y2 - y1;
  const Lj = 6.9 * dy;

  // 能量损失与断面比能
  const dE = Math.pow(dy, 3) / (4 * y1 * y2);
  const E1 = y1 + v1 * v1 / (2 * g);
  const E2 = y2 + v2 * v2 / (2 * g);

  // 跃型
  let jumpType;
  if (Fr1 < 1) jumpType = '缓流，无水跃';
  else if (Fr1 < 1.7) jumpType = '波状水跃';
  else if (Fr1 < 2.5) jumpType = '弱水跃';
  else if (Fr1 < 4.5) jumpType = '摆动水跃';
  else if (Fr1 < 9) jumpType = '稳定水跃';
  else jumpType = '强水跃';

  return { y1, q, Q, B, v1, Fr1, hk, y2, v2, Fr2, dy, Lj, dE, E1, E2, jumpType };
}

const pick = r => ({
  v1: r.v1, Fr1: r.Fr1, hk: r.hk,
  y2: r.y2, v2: r.v2, Fr2: r.Fr2,
  dy: r.dy, Lj: r.Lj, dE: r.dE, E1: r.E1, E2: r.E2, jumpType: r.jumpType
});

// 工况 A：稳定水跃（Fr≈5）
const caseA = calcJump({ Q: 50, B: 10, y1: 0.50 });
// 工况 B：弱/摆动（Fr≈1.8）
const caseB = calcJump({ Q: 20, B: 5, y1: 0.80 });
// 工况 C：强水跃（大 Fr）
const caseC = calcJump({ q: 8, y1: 0.30 });

console.log(JSON.stringify({
  note: 'hydraulic-jump baseline — rectangular free jump',
  caseA: pick(caseA),
  caseB: pick(caseB),
  caseC: pick(caseC)
}, null, 2));
