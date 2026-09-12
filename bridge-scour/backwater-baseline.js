// 桥梁壅水 — 基准回归脚本（计算逻辑与 backwater.html 一致，禁止改动）
// 用法: node baseline.js

const g = 9.81;

function fv(v,d=2){return v==null?'—':Number(v).toFixed(d)}

/** 铁路公式纯计算（对应原 calc() 铁路分支） */
function calcRailway(inp){
  const {qp,V,I0,eta,vmAuto} = inp;
  let VMcalc = inp.VM;
  let soil='', VP=null, P_rail=null, alpha_rail=0;
  let omega=null, pierArea=null, omegaX=null, omegaG=null, Psource='';

  if(vmAuto){
    VP = inp.VP;
    alpha_rail = inp.alpha_rail||0;
    const soilType = inp.soilType;
    const Pmode = inp.Pmode;
    if(Pmode==='auto'){
      omega = inp.omega;
      pierArea = inp.pierArea;
      omegaX = qp/(VP*Math.cos(alpha_rail*Math.PI/180));
      omegaG = omega-pierArea;
      P_rail = omegaX/omegaG;
      Psource = 'auto';
    }else{
      P_rail = inp.P_rail;
      omegaX = qp/(VP*Math.cos(alpha_rail*Math.PI/180));
      Psource = 'manual';
    }
    if(soilType==='soft'){VMcalc=VP;soil='松软土';}
    else if(soilType==='medium'){VMcalc=VP*2*P_rail/(P_rail+1);soil='中等土';}
    else{VMcalc=P_rail*VP;soil='密实土';}
  }

  const dZM = eta*(VMcalc*VMcalc-V*V);
  const LY = (!isNaN(I0)&&I0>0)?2*dZM/I0:null;
  return {dZM,LY,VM:VMcalc,eta,V,I0,soil,VP,P_rail,alpha_rail,omegaX,omegaG,omega,pierArea,Psource,vmAuto};
}

/** 公路公式纯计算（对应原 calc() 公路分支） */
function calcHighway(inp){
  const {Vq,Vch,d,P,I0} = inp;
  const A = isNaN(d)?null:0.5*Math.pow(d,-0.25);
  const V0q = Vq/P;
  const KN = Math.sqrt(Vq/V0q)-1.0;
  const Kv = 0.5*Vq/Math.sqrt(g)-0.1;
  const K = KN*Kv;
  const dZM = K*(Vq*Vq-Vch*Vch)/(2*g);
  const LY = (!isNaN(I0)&&I0>0)?2*dZM/I0:null;
  return {A,V0q,KN,Kv,K,dZM,LY,Vq,Vch,d,P,I0};
}

const pickR = r => ({
  dZM:r.dZM, LY:r.LY, VM:r.VM,
  omegaX:r.omegaX, omegaG:r.omegaG, P_rail:r.P_rail
});
const pickH = r => ({
  A:r.A, V0q:r.V0q, KN:r.KN, Kv:r.Kv, K:r.K, dZM:r.dZM, LY:r.LY
});

// 工况 A：铁路 · 平原 · 中等土 · P 自动
const caseRail = calcRailway({
  qp: 3680, V: 2.50, I0: 0.0005,
  eta: 0.10, vmAuto: true,
  VP: 2.97, alpha_rail: 0,
  soilType: 'medium', Pmode: 'auto',
  omega: 169.36, pierArea: 2.10
});

// 工况 B：公路 · JTG C30
const caseHw = calcHighway({
  Vq: 2.92, Vch: 2.92, d: 14.2, P: 1.2, I0: 0.0004,
  Lj: 363, alpha: 0
});

// 工况 C：铁路 · 手动 VM
const caseRailManual = calcRailway({
  qp: 1000, V: 2.0, I0: 0.001,
  eta: 0.07, vmAuto: false, VM: 3.5
});

console.log(JSON.stringify({
  note:'backwater baseline — DO NOT modify calc logic',
  caseRail: pickR(caseRail),
  caseHw: pickH(caseHw),
  caseRailManual: pickR(caseRailManual)
}, null, 2));
