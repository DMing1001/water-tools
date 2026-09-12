// 桥墩冲刷 — 基准回归脚本（与 index.html 计算逻辑一致，禁止改动）
// 用法: node baseline.js

function calcGeneralScourPure(inp){
  const formula = inp.formula;
  let hp, details={};
  if(formula==='bao'){
    const hmax=inp.hmax, P=inp.P;
    if(isNaN(hmax)||isNaN(P))return null;
    hp=P*hmax;
    details={formula:'包尔达可夫（TB 10017）',hmax,P,hp,hpTotal:hp,genScourDepth:0};
  }
  else if(formula==='64-1'||formula==='64-2'){
    const {hmc,hc,Bc,Qc,E,dc,A}=inp;
    if([hmc,hc,Bc,Qc,dc].some(isNaN))return null;
    const ratio=Math.pow(hmc/hc,5/3);
    const dcPow=Math.pow(dc,1/6);
    const inner=A*(Qc/Bc)*ratio/(E*dcPow);
    const hp64_1=Math.pow(inner,3/5);
    hp=formula==='64-1'?hp64_1:hp64_1*(hmc/hc);
    const genScourDepth=hp-hmc;
    details={formula:formula==='64-1'?'64-1 冲止流速（SL/T 808-2025 A.3.5-1）':'64-2 输沙平衡（SL/T 808-2025 A.3.5-1）',hmc,hc,Bc,Qc,E,dc,A,ratio,dcPow,inner,hp64_1,hp,hpTotal:hp,genScourDepth};
  }
  else if(formula==='cohesive'){
    const {hmc,hc,Bc,Qc,IL,A}=inp;
    if([hmc,hc,Bc,Qc,IL].some(isNaN))return null;
    const ratio=Math.pow(hmc/hc,5/3);
    const ILratio=0.33/IL;
    const inner=A*(Qc/Bc)*ratio/ILratio;
    hp=Math.pow(inner,5/8);
    const genScourDepth=hp-hmc;
    details={formula:'黏性土（SL/T 808-2025 A.3.5-6）',hmc,hc,Bc,Qc,IL,A,ratio,ILratio,inner,hp,hpTotal:hp,genScourDepth};
  }
  return{hp,...details};
}

function calcLocalScourPure(inp, hp_val){
  const formula=inp.formula;
  let hb, details={};
  if(formula==='65-1'||formula==='65-2'){
    const {B1,Kxi,d,v}=inp;
    if([B1,d].some(isNaN)||isNaN(hp_val)||isNaN(v))return null;
    if(formula==='65-1'){
      const v0=0.0246*Math.pow(hp_val/d,0.14)*Math.sqrt(322*d+(10+hp_val)/Math.pow(d,0.72));
      const Keta=0.8*(1/Math.pow(d,0.45)+1/Math.pow(d,0.15));
      const v0p=0.462*Math.pow(d/B1,0.06)*v0;
      const n=Math.pow(v0/v,0.25*Math.pow(d,0.19));
      if(v<=v0){
        hb=Kxi*Keta*Math.pow(B1,0.6)*(v-v0p);
      }else{
        hb=Kxi*Keta*Math.pow(B1,0.6)*(v0-v0p)*Math.pow((v-v0p)/(v0-v0p),n);
      }
      details={formula:'65-1 修正式（SL/T 808-2025 A.3.5-8~12）',B1,Kxi,d,v,v0,Keta,v0p,n,hb,type:v<=v0?'清水':'动床'};
    }else{
      const v0=0.0246*Math.pow(hp_val/d,0.14)*Math.sqrt(322*d+(10+hp_val)/Math.pow(d,0.72));
      const Keta2=0.0023/Math.pow(d,2.2)+0.375/Math.pow(d,0.5);
      const v0p=0.12*Math.pow(d,0.5);
      const n2=0.23+0.19*Math.log10(d);
      if(v<=v0){
        hb=Kxi*Keta2*Math.pow(B1,0.6)*Math.pow(hp_val,0.15)*(v/v0-v0p/v0);
      }else{
        hb=Kxi*Keta2*Math.pow(B1,0.6)*Math.pow(hp_val,0.15)*Math.pow((v-v0p)/(v0-v0p),n2);
      }
      details={formula:'65-2（TB 10017）',B1,Kxi,d,v,v0,Keta2,v0p,n2,hb,type:v<=v0?'清水':'动床'};
    }
    hb=Math.max(hb,0);
    details.v=v;details.hp=hp_val;
  }
  else if(formula==='cohesive'){
    const {B1,Kxi,IL}=inp;
    if([B1,IL].some(isNaN)||isNaN(hp_val))return null;
    const v=0.33*Math.pow(hp_val,0.6)/IL;
    const hpB1=hp_val/B1;
    const B1pow=Math.pow(B1,0.6);
    if(hpB1>=2.5){
      const ILpow=Math.pow(IL,1.25);
      hb=0.83*Kxi*B1pow*ILpow*v;
      details={formula:'黏性土（SL/T 808-2025 A.3.5-13/14）',B1,Kxi,IL,v,hp:hp_val,hpB1,B1pow,ILpow,hb,type:'hp/B1≥2.5（A.3.5-13）'};
    }else{
      const hppow=Math.pow(hp_val,0.1);
      hb=0.55*Kxi*B1pow*hppow*IL*v;
      details={formula:'黏性土（SL/T 808-2025 A.3.5-13/14）',B1,Kxi,IL,v,hp:hp_val,hpB1,B1pow,hppow,hb,type:'hp/B1<2.5（A.3.5-14）'};
    }
    hb=Math.max(hb,0);
  }
  return{hb,...details};
}

// 行近流速（与原 calcLocalScour 中 v 计算一致）
function approachVelocity(genFormula, hp, dc, E, qp, B1){
  if(genFormula==='64-1'||genFormula==='64-2'){
    return E*Math.pow(dc,1/6)*Math.pow(hp,2/3);
  }
  return qp/(hp*B1*Math.cos(0));
}

const pick = o => ({
  hp: o.hp, genScourDepth: o.genScourDepth,
  hb: o.hb, v: o.v, v0: o.v0, type: o.type
});

// 工况 A：非黏性 64-1 + 65-1
const genA = calcGeneralScourPure({
  formula:'64-1', hmc:8.5, hc:5.2, Bc:80, Qc:1200, E:0.66, dc:0.5, A:1.0
});
const vA = approachVelocity('64-1', genA.hp, 0.5, 0.66, null, null);
const locA = calcLocalScourPure({formula:'65-1', B1:3.0, Kxi:1.00, d:0.5, v:vA}, genA.hp);
const totalA = 0 + genA.genScourDepth + locA.hb;
const lowestA = 52.50 - totalA;

// 工况 B：黏性土 一般 + 局部
const genB = calcGeneralScourPure({
  formula:'cohesive', hmc:6.0, hc:4.0, Bc:60, Qc:800, IL:0.5, A:1.1
});
const locB = calcLocalScourPure({formula:'cohesive', B1:2.5, Kxi:1.00, IL:0.5}, genB.hp);
const totalB = 1.0 + genB.genScourDepth + locB.hb;
const lowestB = 40.00 - totalB;

// 工况 C：64-2 + 65-2
const genC = calcGeneralScourPure({
  formula:'64-2', hmc:8.5, hc:5.2, Bc:80, Qc:1200, E:0.66, dc:0.5, A:1.0
});
const vC = approachVelocity('64-2', genC.hp, 0.5, 0.66, null, null);
const locC = calcLocalScourPure({formula:'65-2', B1:3.0, Kxi:1.00, d:0.5, v:vC}, genC.hp);

console.log(JSON.stringify({
  note:'bridge-scour baseline — DO NOT modify calc logic',
  caseA:{...pick(genA), ...pick(locA), vA, totalA, lowestA},
  caseB:{...pick(genB), ...pick(locB), totalB, lowestB},
  caseC:{...pick(genC), ...pick(locC), vC}
}, null, 2));
