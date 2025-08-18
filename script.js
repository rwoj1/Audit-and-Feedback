"use strict";

/* =========================
   Utilities & constants
========================= */
const $ = (id) => document.getElementById(id);
const fmtDate = (d) => new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
const addDays = (d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
function startOfWeek(d){ const dt=new Date(d); const day=dt.getDay(); const diff=(day===0?6:day-1); dt.setDate(dt.getDate()-diff); dt.setHours(0,0,0,0); return dt; }
function roundToNearest(x, step){ return Math.round(x/step)*step; }
function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }
const THREE_MONTHS_MS = 90*24*3600*1000;
const MAX_WEEKS = 60;

/* Words for tablet fractions */
const WORDS_0_20=["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen","twenty"];
function intToWords(n){ if(n>=0 && n<=20) return WORDS_0_20[n]; return String(n); }
function tabletsToWords(q){ // q in quarters (0.25 tablet units)
  const tabs=q/4, whole=Math.floor(tabs+1e-6), frac=+(tabs-whole).toFixed(2);
  if(whole===0){
    if(frac===0.25) return "a quarter of a tablet";
    if(frac===0.5)  return "half a tablet";
    if(frac===0.75) return "three quarters of a tablet";
  }
  if(frac===0) return whole===1?"one tablet":`${intToWords(whole)} tablets`;
  const j=(frac===0.25)?"a quarter":(frac===0.5)?"a half":"three quarters";
  return `${intToWords(whole)} and ${j} of a tablet`;
}
function tabletsToWords_noUnit(q){ // for table cell
  const tabs=q/4, whole=Math.floor(tabs+1e-6), frac=+(tabs-whole).toFixed(2);
  if(frac===0) return String(whole);
  if(whole===0){
    if(frac===0.25) return "quarter";
    if(frac===0.5)  return "half";
    if(frac===0.75) return "three quarters";
  }
  const j=(frac===0.25)?"a quarter":(frac===0.5)?"a half":"three quarters";
  return `${intToWords(whole)} and ${j}`;
}

/* =========================
   Catalogue & rules (current baseline only)
========================= */
const CLASS_ORDER = ["Opioid","Benzodiazepines / Z-Drug (BZRA)","Antipsychotic","Proton Pump Inhibitor"];

const CATALOG = {
  "Opioid": {
    "Morphine": { "SR Tablet":[ "5 mg","10 mg","15 mg","20 mg","30 mg","60 mg","100 mg","200 mg" ] },
    "Oxycodone": { "SR Tablet":[ "5 mg","10 mg","15 mg","20 mg","30 mg","40 mg","60 mg","80 mg" ] },
    "Oxycodone / Naloxone": { "SR Tablet":[ "2.5/1.25 mg","5/2.5 mg","10/5 mg","15/7.5 mg","20/10 mg","30/15 mg","40/20 mg","60/30 mg","80/40 mg" ] },
    "Tapentadol": { "SR Tablet":[ "50 mg","100 mg","150 mg","200 mg","250 mg" ] },
    "Tramadol": { "SR Tablet":[ "50 mg","100 mg","150 mg","200 mg" ] },
    "Buprenorphine": { "Patch":[ "5 mcg/hr","10 mcg/hr","15 mcg/hr","20 mcg/hr","25 mcg/hr","30 mcg/hr","40 mcg/hr" ] },
    "Fentanyl": { "Patch":[ "12 mcg/hr","25 mcg/hr","50 mcg/hr","75 mcg/hr","100 mcg/hr" ] }
  },
  "Benzodiazepines / Z-Drug (BZRA)": {
    "Alprazolam": { "Tablet":["0.25 mg","0.5 mg","1 mg","2 mg"] },
    "Clonazepam": { "Tablet":["0.5 mg","2 mg"] },
    "Diazepam": { "Tablet":["2 mg","5 mg"] },
    "Flunitrazepam": { "Tablet":["1 mg"] },
    "Lorazepam": { "Tablet":["0.5 mg","1 mg","2.5 mg"] },
    "Nitrazepam": { "Tablet":["5 mg"] },
    "Oxazepam": { "Tablet":["15 mg","30 mg"] },
    "Temazepam": { "Tablet":["10 mg"] },
    "Zolpidem": { "Tablet":["10 mg"], "Slow Release Tablet":["6.25 mg","12.5 mg"] },
    "Zopiclone": { "Tablet":["7.5 mg"] }
  },
  "Antipsychotic": {
    "Haloperidol": { "Tablet":["0.5 mg","1.5 mg","5 mg"] },
    "Olanzapine": { "Tablet":["2.5 mg","5 mg","7.5 mg","10 mg","15 mg","20 mg"], "Wafer":["5 mg","10 mg","15 mg","20 mg"] },
    "Quetiapine": { "Immediate Release Tablet":["25 mg","100 mg","200 mg","300 mg"], "Slow Release Tablet":["50 mg","150 mg","200 mg","300 mg","400 mg"] },
    "Risperidone": { "Tablet":["0.5 mg","1 mg","2 mg","3 mg","4 mg"] }
  },
  "Proton Pump Inhibitor": {
    "Esomeprazole": { "Tablet":["20 mg","40 mg"] },
    "Lansoprazole": { "Tablet":["15 mg","30 mg"], "Wafer":["15 mg","30 mg"] },
    "Omeprazole": { "Capsule":["10 mg","20 mg"], "Tablet":["10 mg","20 mg"] },
    "Pantoprazole": { "Tablet":["20 mg","40 mg"] },
    "Rabeprazole": { "Tablet":["10 mg","20 mg"] }
  }
};

const AP_ROUND = { // IR rounding steps
  "Haloperidol": 0.5,
  "Risperidone": 0.25,
  "Quetiapine": 12.5,
  "Olanzapine": 1.25
};

/* =========================
   Basic helpers
========================= */
function isMR(form){ return /slow\s*release|modified|controlled|extended|sustained/i.test(form) || /(\bSR|MR|CR|ER|XR|PR|CD\b)/i.test(form); }
function parseMgFromStrength(str){ if(!str) return 0; const lead=String(str).split("/")[0]; const m=lead.match(/([\d.]+)\s*mg/i); return m?parseFloat(m[1]):0; }
function parsePatchRate(str){ const m=String(str).match(/([\d.]+)\s*mcg\/hr/i); return m?parseFloat(m[1]):0; }
function currentClass(){ return $("classSelect")?.value || ""; }

/* =========================
   Dropdown population
========================= */
function populateClasses(){ const el=$("classSelect"); if(!el) return; el.innerHTML=""; CLASS_ORDER.forEach(c=>{ const o=document.createElement("option"); o.value=c; o.textContent=c; el.appendChild(o); }); }
function populateMedicines(){ const mSel=$("medicineSelect"), cls=$("classSelect")?.value; if(!mSel || !cls) return; mSel.innerHTML="";
  const meds=Object.keys(CATALOG[cls]||{});
  const ordered=(cls==="Opioid")?["Morphine","Oxycodone","Oxycodone / Naloxone","Tapentadol","Tramadol","Buprenorphine","Fentanyl"]:meds.slice().sort();
  ordered.forEach(m=>{ if(meds.includes(m)){ const o=document.createElement("option"); o.value=m; o.textContent=m; mSel.appendChild(o); }});
}
function populateForms(){ const fSel=$("formSelect"), cls=$("classSelect")?.value, med=$("medicineSelect")?.value; if(!fSel || !cls || !med) return; fSel.innerHTML="";
  const forms=Object.keys((CATALOG[cls]||{})[med]||[]);
  // Tablet first
  forms.sort((a,b)=>{ const at=/tablet/i.test(a)?0:1, bt=/tablet/i.test(b)?0:1; return at!==bt?at-bt:a.localeCompare(b); });
  forms.forEach(f=>{ const o=document.createElement("option"); o.value=f; o.textContent=f; fSel.appendChild(o); });
}
function strengthsForSelected(){ const cls=$("classSelect")?.value, med=$("medicineSelect")?.value, form=$("formSelect")?.value; return (CATALOG[cls]?.[med]?.[form]||[]).slice(); }

/* =========================
   Dose line editor
========================= */
let doseLines=[]; let nextLineId=1;

function canSplitTablets(cls, form, med){
  if(cls==="Opioid" || cls==="Proton Pump Inhibitor") return {half:false, quarter:false};
  if(isMR(form) || /Patch|Capsule|Wafer/i.test(form)) return {half:false, quarter:false};
  if(med==="Zolpidem" && /Slow Release/i.test(form)) return {half:false, quarter:false};
  return {half:true, quarter:true}; // BZRA tablets & AP IR tablets
}

function resetDoseLinesToLowest(){
  const cls=currentClass(), med=$("medicineSelect")?.value, form=$("formSelect")?.value;
  const sList=(strengthsForSelected()||[]).sort((a,b)=>parseMgFromStrength(a)-parseMgFromStrength(b));
  doseLines=[];
  if(sList.length){
    const lowest=sList[0];
    const defaultFreq = (form==="Patch") ? "PATCH" : (cls==="Benzodiazepines / Z-Drug (BZRA)" ? "PM" : "AM");
    doseLines.push({ id: 1, strengthStr: lowest, qty: 1, freqMode: defaultFreq });
    nextLineId=2;
  }
  renderDoseLines();
}

function slotsForFreq(mode){
  switch(mode){
    case "AM":return["AM"]; case "MID":return["MID"]; case "DIN":return["DIN"]; case "PM":return["PM"];
    case "BID":return["AM","PM"]; case "TID":return["AM","MID","PM"]; case "QID":return["AM","MID","DIN","PM"];
    case "PATCH":return["PATCH"]; default:return["AM"];
  }
}
function patchFreqLabel(med){ return (med==="Fentanyl") ? "Every 3 days" : "Every 7 days"; }

function renderDoseLines(){
  const box=$("doseLinesContainer"); if(!box) return; box.innerHTML="";
  if(doseLines.length===0){ const p=document.createElement("p"); p.textContent="(No dose lines)"; p.style.color="#9ca3af"; box.appendChild(p); return; }
  const cls=currentClass(), med=$("medicineSelect").value, form=$("formSelect").value;

  doseLines.forEach((ln,idx)=>{
    const row=document.createElement("div");
    row.style.cssText="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:6px 0";
    row.innerHTML=`<span class="badge">Line ${idx+1}</span>
      <span>Strength:</span><select data-id="${ln.id}" class="dl-strength"></select>
      <span>Number of tablets:</span><input type="number" step="0.25" min="0" value="${ln.qty ?? 1}" class="dl-qty" data-id="${ln.id}" style="width:110px" />
      <span>Frequency:</span><select data-id="${ln.id}" class="dl-freq"></select>
      <button type="button" data-id="${ln.id}" class="secondary dl-remove">Remove</button>`;
    box.appendChild(row);

    // Strength list
    const sSel=row.querySelector(".dl-strength");
    const sList=strengthsForSelected().sort((a,b)=>parseMgFromStrength(a)-parseMgFromStrength(b));
    sSel.innerHTML=""; sList.forEach(s=>{ const o=document.createElement("option"); o.value=s; o.textContent=s; sSel.appendChild(o); });
    sSel.value=ln.strengthStr || sList[0];

    // Frequency
    const fSel=row.querySelector(".dl-freq"); fSel.innerHTML="";
    if(form==="Patch"){
      const o=document.createElement("option"); o.value="PATCH"; o.textContent=patchFreqLabel(med); fSel.appendChild(o); fSel.disabled=true;
    }else if(cls==="Benzodiazepines / Z-Drug (BZRA)"){
      const o=document.createElement("option"); o.value="PM"; o.textContent="Daily at night"; fSel.appendChild(o); fSel.disabled=true;
    }else{
      [["AM","Daily in the morning"],["MID","Daily at midday"],["DIN","Daily at dinner"],["PM","Daily at night"],["BID","Twice daily (morning & night)"],["TID","Three times daily"],["QID","Four times daily"]]
        .forEach(([v,t])=>{ const o=document.createElement("option"); o.value=v; o.textContent=t; fSel.appendChild(o); });
      fSel.disabled=false;
    }
    fSel.value=ln.freqMode || fSel.options[0].value;

    // Handlers
    sSel.addEventListener("change", e=>{ const id=+e.target.dataset.id; const l=doseLines.find(x=>x.id===id); if(l) l.strengthStr=e.target.value; });
    fSel.addEventListener("change", e=>{ const id=+e.target.dataset.id; const l=doseLines.find(x=>x.id===id); if(l) l.freqMode=e.target.value; });
    row.querySelector(".dl-qty").addEventListener("change", e=>{
      const id=+e.target.dataset.id; const l=doseLines.find(x=>x.id===id);
      const split=canSplitTablets(cls,form,med); const step=(split.half||split.quarter)?0.25:1;
      let v=parseFloat(e.target.value); if(isNaN(v)) v=1; v=Math.max(0,Math.round(v/step)*step);
      e.target.value=v; if(l) l.qty=v;
    });
    row.querySelector(".dl-remove").addEventListener("click", e=>{ const id=+e.target.dataset.id; doseLines=doseLines.filter(x=>x.id!==id); renderDoseLines(); });
  });
}

/* =========================
   Best practice & headers
========================= */
const RECOMMEND = {
  "Opioid":[
    "Tailor plan to clinical characteristics, goals and preferences.",
    "< 3 months: reduce 10–25% weekly.",
    "> 3 months: reduce 10–25% every 4 weeks.",
    "Long-term/high doses: slower taper and frequent monitoring."
  ],
  "Benzodiazepines / Z-Drug (BZRA)":[
    "Taper slowly with the patient; e.g., 25% every 2 weeks.",
    "Near end: consider 12.5% reductions and/or planned drug-free days."
  ],
  "Proton Pump Inhibitor":[
    "Step down to lowest effective dose, alternate-day dosing, or stop and use on-demand.",
    "Review at 4–12 weeks."
  ],
  "Antipsychotic":[
    "Reduce ~25–50% every 1–2 weeks with close monitoring.",
    "Slower taper may be appropriate depending on symptoms."
  ]
};
function specialInstructionFor(med, form){
  if(/Patch/i.test(form)) return "Special instruction: apply to intact skin as directed. Do not cut patches.";
  if(isMR(form)) return "Swallow whole, do not halve or crush";
  return "Swallow whole, do not halve or crush";
}
function updateRecommended(){
  const cls=$("classSelect")?.value;
  $("bestPracticeBox").innerHTML=`<strong>Suggested Practice for ${cls||""}</strong><ul>${(RECOMMEND[cls]||[]).map(t=>`<li>${t}</li>`).join("")}</ul>`;
  const med=$("medicineSelect")?.value, form=$("formSelect")?.value;
  $("hdrMedicine").textContent=`Medicine: ${med} ${form||""}`;
  $("hdrSpecial").textContent=`${specialInstructionFor(med, form)}`;
}

/* =========================
   Math helpers for packing
========================= */
function allowedPiecesMg(cls, med, form){
  const strengths=strengthsForSelected().map(parseMgFromStrength).filter(v=>v>0);
  const uniq=[...new Set(strengths)].sort((a,b)=>a-b);
  let pieces=uniq.slice();
  const split=canSplitTablets(cls,form,med);
  if(split.half||split.quarter){
    uniq.forEach(v=>{
      if(split.half) pieces.push(+((v/2).toFixed(3)));
      if(split.quarter) pieces.push(+((v/4).toFixed(3)));
    });
  }
  return [...new Set(pieces)].sort((a,b)=>a-b);
}
function lowestTitrationStepMg(cls, med, form){
  const mgList=strengthsForSelected().map(parseMgFromStrength).filter(v=>v>0).sort((a,b)=>a-b);
  const base=mgList[0]||0; const split=canSplitTablets(cls,form,med);
  return (split.quarter) ? +(base/4).toFixed(3) : (split.half ? +(base/2).toFixed(3) : base);
}
function packTotalMg(pack){ return Object.entries(pack).reduce((s,[mg,c])=>s + parseFloat(mg)*c, 0); }
function packsTotalMg(packs){ return packTotalMg(packs.AM)+packTotalMg(packs.MID)+packTotalMg(packs.DIN)+packTotalMg(packs.PM); }
function removeFromPackByMg(pack, amount){
  let toDrop=+amount.toFixed(3);
  const sizes=Object.keys(pack).map(parseFloat).sort((a,b)=>b-a);
  for(const p of sizes){
    while(toDrop>0 && pack[p]>0){ pack[p]-=1; if(pack[p]===0) delete pack[p]; toDrop=+(toDrop-p).toFixed(3); }
    if(toDrop<=0) break;
  }
  return Math.max(0,toDrop);
}
function composeExact(target, pieces){
  let rem=+target.toFixed(3), used={}; const arr=pieces.slice().sort((a,b)=>b-a);
  for(const s of arr){ const n=Math.floor(rem/s+1e-9); if(n>0){ used[s]=(used[s]||0)+n; rem=+(rem-n*s).toFixed(3); } }
  return Math.abs(rem)<1e-6 ? used : null;
}
function composeExactOrLower(target, pieces, step){
  let t=+target.toFixed(3);
  while(t>0){
    const u=composeExact(t,pieces);
    if(u) return u;
    t=+(t-step).toFixed(3);
  }
  return {};
}

/* Build packs from dose lines */
function buildPacksFromDoseLines(){
  const cls=currentClass(), med=$("medicineSelect").value, form=$("formSelect").value;
  const packs={AM:{},MID:{},DIN:{},PM:{}};
  const add=(slot,mg,count)=>{ packs[slot][mg]=(packs[slot][mg]||0)+count; };

  doseLines.forEach(ln=>{
    const mg=parseMgFromStrength(ln.strengthStr);
    const qty=parseFloat(ln.qty||1);
    const slots=slotsForFreq(ln.freqMode);
    slots.forEach(sl=>{
      if(sl==="PATCH") return; // handled separately
      const split=canSplitTablets(cls,form,med);
      if(split.half||split.quarter){
        const qMg=+(mg/4).toFixed(3);
        const qCount=Math.round(qty*4);
        add(sl,qMg,qCount);
      }else{
        add(sl,mg,Math.round(qty));
      }
    });
  });

  // BZRA night-only enforcement
  if(cls==="Benzodiazepines / Z-Drug (BZRA)"){
    packs.AM={}; packs.MID={}; packs.DIN={};
  }
  return packs;
}

/* =========================
   Reduction steps
========================= */
// SR opioids & PPIs: whole tablets only, AM+PM until lowest dose → PM only → stop
function splitDailyPreferred(total, strengthList){
  const half=Math.floor(total/2);
  for(let amT=half; amT>=0; amT--){
    const pmT=total-amT;
    const am=composeExact(amT,strengthList); if(!am) continue;
    const pm=composeExact(pmT,strengthList); if(pm && pmT>=amT) return {AM:am, PM:pm};
  }
  const all=composeExact(total,strengthList) || {[strengthList[0]]:1};
  return {AM:{}, PM:all};
}
function opioidOrPpiStep(packs, percent){
  const current=packsTotalMg(packs); if(current<=0.0001) return packs;
  const strengths=strengthsForSelected().map(parseMgFromStrength).filter(v=>v>0).sort((a,b)=>a-b);
  const step=strengths[0]||1;
  let target=roundToNearest(current*(1-percent/100), step);
  if(target===current && current>0){ target=Math.max(0,current-step); target=roundToNearest(target,step); }
  const bid=splitDailyPreferred(target,strengths);
  return { AM:bid.AM, MID:{}, DIN:{}, PM:bid.PM };
}

// Antipsychotics: SR → same as above; IR → reduce DIN→MID→AM→PM by %
function antipsychoticStep(packs, percent, med, form){
  const isIR = !/Slow\s*Release/i.test(form) && !/\bSR\b/i.test(form);
  if(!isIR) return opioidOrPpiStep(packs,percent);
  const total=packsTotalMg(packs); if(total<=0.0001) return packs;
  const step=AP_ROUND[med] || lowestTitrationStepMg("Antipsychotic",med,form) || 0.5;
  let target=roundToNearest(total*(1-percent/100), step);
  if(target===total && total>0){ target=Math.max(0,total-step); target=roundToNearest(target,step); }
  let toRemove=+(total-target).toFixed(3);
  const order=["DIN","MID","AM","PM"];
  for(const key of order){ if(toRemove<=1e-6) break; toRemove = removeFromPackByMg(packs[key], toRemove); }
  return packs;
}

// BZRA: night-only; allow halves/quarters; lowest final dose is quarter of lowest tablet for interval then stop
function bzraStep(packs, percent, med, form){
  const current=packsTotalMg(packs); if(current<=0.0001) return packs;
  const pieces=allowedPiecesMg("Benzodiazepines / Z-Drug (BZRA)",med,form);
  const step=lowestTitrationStepMg("Benzodiazepines / Z-Drug (BZRA)",med,form)||0.125;
  let target=roundToNearest(current*(1-percent/100), step);
  if(target===current && current>0){ target=Math.max(0,current-step); target=roundToNearest(target,step); }
  const pm=composeExactOrLower(target,pieces,step);
  return { AM:{}, MID:{}, DIN:{}, PM:pm };
}

/* =========================
   Plan builders
========================= */
function deepCopy(o){ return JSON.parse(JSON.stringify(o)); }

function buildPlanTablets(){
  const cls=currentClass(), med=$("medicineSelect").value, form=$("formSelect").value;
  const p1Percent=clamp(parseFloat($("p1Percent")?.value||"0"),1,100);
  const p1Interval=Math.max(1, parseInt($("p1Interval")?.value||"7",10));
  const p1StopWeek=parseInt($("p1StopWeek")?.value||"0",10)||0;
  const p2Percent=clamp(parseFloat($("p2Percent")?.value||"0"),0,100);
  const p2Interval=p2Percent?Math.max(1, parseInt($("p2Interval")?.value||"0",10)):0;
  const startDate=$("startDate")?($("startDate")._flatpickr?.selectedDates?.[0]||new Date()):new Date();
  const reviewDate=$("reviewDate")?($("reviewDate")._flatpickr?.selectedDates?.[0]||null):null;

  let packs=buildPacksFromDoseLines();
  if(packsTotalMg(packs)===0){ const mgList=strengthsForSelected().map(parseMgFromStrength).filter(v=>v>0).sort((a,b)=>a-b); if(mgList.length) packs.PM[mgList[0]]=1; }

  const rows=[]; let date=startOfWeek(startDate); let week=1;
  const endBy={complete:false, hit3mo:false, hitReview:false, hitP1Stop:false};

  const stepOnce=()=>{
    if(cls==="Opioid"||cls==="Proton Pump Inhibitor") packs=opioidOrPpiStep(packs,p1Percent);
    else if(cls==="Benzodiazepines / Z-Drug (BZRA)") packs=bzraStep(packs,p1Percent,med,form);
    else packs=antipsychoticStep(packs,p1Percent,med,form);
  };

  stepOnce(); rows.push({ week, date:fmtDate(date), packs:deepCopy(packs), med, form });

  while(packsTotalMg(packs)>0.0001){
    if(p1StopWeek && p2Percent===0 && p2Interval===0 && week>=p1StopWeek){ endBy.hitP1Stop=true; break; }
    const nextDate=addDays(date,p1Interval);
    if(reviewDate && nextDate>=reviewDate){ date=nextDate; endBy.hitReview=true; break; }
    if((+nextDate - +startDate) >= THREE_MONTHS_MS){ date=nextDate; endBy.hit3mo=true; break; }
    date=nextDate; week++;
    stepOnce(); rows.push({ week, date:fmtDate(date), packs:deepCopy(packs), med, form });
    if(rows.length>=MAX_WEEKS) break;
  }
  if(packsTotalMg(packs)<=0.0001){ endBy.complete=true; }

  if(!endBy.complete && !(endBy.hit3mo||endBy.hitReview||endBy.hitP1Stop) && p2Percent>0){
    while(packsTotalMg(packs)>0.0001){
      const nextDate=addDays(date,p2Interval);
      if(reviewDate && nextDate>=reviewDate){ date=nextDate; endBy.hitReview=true; break; }
      if((+nextDate - +startDate) >= THREE_MONTHS_MS){ date=nextDate; endBy.hit3mo=true; break; }
      date=nextDate; week++;
      if(cls==="Opioid"||cls==="Proton Pump Inhibitor") packs=opioidOrPpiStep(packs,p2Percent);
      else if(cls==="Benzodiazepines / Z-Drug (BZRA)") packs=bzraStep(packs,p2Percent,med,form);
      else packs=antipsychoticStep(packs,p2Percent,med,form);
      rows.push({ week, date:fmtDate(date), packs:deepCopy(packs), med, form });
      if(rows.length>=MAX_WEEKS) break;
    }
    if(packsTotalMg(packs)<=0.0001){ endBy.complete=true; }
  }

  rows.push({
    week: week+1,
    date: fmtDate(date),
    packs:{AM:{},MID:{},DIN:{},PM:{}},
    med, form,
    stop: endBy.complete,
    review: !endBy.complete // any of the other stop conditions
  });
  return rows;
}

function buildPlanPatch(){
  const med=$("medicineSelect").value, form="Patch";
  const startDate=$("startDate")?($("startDate")._flatpickr?.selectedDates?.[0]||new Date()):new Date();
  const reviewDate=$("reviewDate")?($("reviewDate")._flatpickr?.selectedDates?.[0]||null):null;
  const changeDays=(med==="Fentanyl")?3:7;

  const reduceBy=clamp(parseFloat($("p1Percent")?.value||"0"),1,100);
  const reduceEvery=Math.max(1, parseInt($("p1Interval")?.value||"7",10));

  const strengths=strengthsForSelected().map(parsePatchRate).filter(v=>v>0).sort((a,b)=>b-a); // desc
  const smallest=strengths[strengths.length-1];

  let total=0; doseLines.forEach(ln=> total += parsePatchRate(ln.strengthStr)||0 );
  if(total<=0) total=smallest;

  function mixDownTo(value){
    let remaining=value, used=[];
    for(const s of strengths){ while(remaining>=s){ used.push(s); remaining-=s; } }
    if(remaining>0) used.push(smallest); // round up
    return used;
  }

  const rows=[]; let date=startOfWeek(startDate); let week=1;
  let currentDose=total;
  let nextReductionDate=date;

  while(true){
    if(+date >= +nextReductionDate){
      currentDose = Math.max(smallest, Math.ceil(currentDose*(1 - reduceBy/100)));
      nextReductionDate = addDays(nextReductionDate, reduceEvery);
    }
    rows.push({ week, date:fmtDate(date), patches:mixDownTo(currentDose), med, form });

    const nextDate=addDays(date,changeDays);
    const hitReview=(reviewDate && nextDate>=reviewDate);
    const hit3mo=((+nextDate - +startDate) >= THREE_MONTHS_MS);

    if((currentDose===smallest && (hitReview||hit3mo)) || (hitReview||hit3mo)){
      date=nextDate;
      rows.push({ week:week+1, date:fmtDate(date), patches:[], med, form, review:true });
      break;
    }

    if(currentDose===smallest && (+date >= +nextReductionDate - 1)){
      const stopDate=addDays(date, reduceEvery);
      rows.push({ week:week+1, date:fmtDate(stopDate), patches:[], med, form, stop:true });
      break;
    }

    date=nextDate; week++;
    if(week>MAX_WEEKS) break;
  }
  return rows;
}

/* =========================
   Rendering
========================= */
function formLabelCapsSR(form){ return form.replace(/\bsr\b/ig,"SR"); }
function td(text, cls){ const el=document.createElement("td"); if(cls) el.className=cls; el.textContent=String(text||""); return el; }

function strengthRowInstructions(mg, packs){
  const am=packs.AM[mg]||0, mid=packs.MID[mg]||0, din=packs.DIN[mg]||0, pm=packs.PM[mg]||0;
  const lines=[];
  if(am) lines.push(`Take ${am===1?"1 tablet":`${am} tablets`} in the morning`);
  if(mid) lines.push(`Take ${mid===1?"1 tablet":`${mid} tablets`} at midday`);
  if(din) lines.push(`Take ${din===1?"1 tablet":`${din} tablets`} at dinner`);
  if(pm) lines.push(`Take ${pm===1?"1 tablet":`${pm} tablets`} at night`);
  return { text: lines.join("\n"), am, mid, din, pm };
}

function renderStandardTable(rows){
  const scheduleBlock=$("scheduleBlock"), patchBlock=$("patchBlock");
  patchBlock.style.display="none"; scheduleBlock.style.display="";
  scheduleBlock.innerHTML="";
  const table=document.createElement("table"); table.className="table";
  const thead=document.createElement("thead"); const hr=document.createElement("tr");
  ["Date beginning","Strength","Instructions","Morning","Midday","Dinner","Night"].forEach(h=>{ const th=document.createElement("th"); th.textContent=h; hr.appendChild(th); });
  thead.appendChild(hr); table.appendChild(thead);
  const tbody=document.createElement("tbody");

  rows.forEach((r,idxRow)=>{
    const packs=r.packs;
    const allMg=new Set(); [packs.AM,packs.MID,packs.DIN,packs.PM].forEach(pk=>Object.keys(pk).forEach(m=>allMg.add(+m)));
    const mgList=Array.from(allMg).sort((a,b)=>a-b);
    const lines=mgList.length?mgList:[null];

    lines.forEach((mg,i)=>{
      const tr=document.createElement("tr");
      if((idxRow%2)===1){ tr.style.background="rgba(255,255,255,0.04)"; } // zebra striping inline (prints too)

      if(i===0){ const d=td(r.date); if(lines.length>1) d.rowSpan=lines.length; tr.appendChild(d); }

      if(r.stop||r.review||mg===null){
        tr.appendChild(td(""));
        tr.appendChild(td(r.stop?"Stop.": "Review ongoing plan with the doctor.", "instructions-pre"));
        tr.appendChild(td("", "center")); tr.appendChild(td("", "center")); tr.appendChild(td("", "center")); tr.appendChild(td("", "center"));
        tbody.appendChild(tr); return;
      }

      const { text, am, mid, din, pm }=strengthRowInstructions(mg, packs);
      const med=r.med, form=r.form;
      const fLbl=formLabelCapsSR(form).toLowerCase();
      const mgTxt=(+mg.toFixed(3)).toString().replace(/\.000$/,'').replace(/(\.\d)0+$/,'$1');
      tr.appendChild(td(`${med} ${mgTxt} mg ${fLbl}`));
      tr.appendChild(td(text,"instructions-pre"));
      tr.appendChild(td(am||"", "center"));
      tr.appendChild(td(mid||"", "center"));
      tr.appendChild(td(din||"", "center"));
      tr.appendChild(td(pm||"", "center"));
      tbody.appendChild(tr);
    });
  });

  table.appendChild(tbody);
  scheduleBlock.appendChild(table);
}

function renderPatchTable(rows){
  const scheduleBlock=$("scheduleBlock"), patchBlock=$("patchBlock");
  scheduleBlock.style.display="none"; patchBlock.style.display="";
  patchBlock.innerHTML="";
  const table=document.createElement("table"); table.className="table";
  const thead=document.createElement("thead"); const hr=document.createElement("tr");
  ["Apply on","Remove on","Patch strength(s)","Instructions"].forEach(h=>{ const th=document.createElement("th"); th.textContent=h; hr.appendChild(th); });
  thead.appendChild(hr); table.appendChild(thead);
  const tbody=document.createElement("tbody");

  const everyDays=($("medicineSelect").value==="Fentanyl")?3:7;

  rows.forEach((r,idxRow)=>{
    const tr=document.createElement("tr");
    if((idxRow%2)===1){ tr.style.background="rgba(255,255,255,0.04)"; } // zebra
    tr.appendChild(td(r.date));
    tr.appendChild(td(fmtDate(addDays(new Date(r.date), everyDays))));
    tr.appendChild(td((r.patches||[]).map(v=>`${v} mcg/hr`).join(" + ")));
    tr.appendChild(td(r.stop ? "Stop." : r.review ? "Review ongoing plan with the doctor." : `Apply patches every ${everyDays} days.`));
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  patchBlock.appendChild(table);
}

/* Footer text */
function setFooterText(cls){
  const exp = {
    "Opioid":"Expected benefits: Improved function and reduced opioid-related harms.",
    "Benzodiazepines / Z-Drug (BZRA)":"Expected benefits: Improved cognition, daytime alertness, and reduced falls.",
    "Proton Pump Inhibitor":"Expected benefits: Reduced pill burden and adverse effects with long-term use.",
    "Antipsychotic":"Expected benefits: Lower risk of metabolic/extrapyramidal adverse effects."
  }[cls] || "—";
  const wdr = {
    "Opioid":"Withdrawal: transient pain flare, cravings, mood changes.",
    "Benzodiazepines / Z-Drug (BZRA)":"Withdrawal: insomnia, anxiety, irritability.",
    "Proton Pump Inhibitor":"Withdrawal: rebound heartburn.",
    "Antipsychotic":"Withdrawal: sleep disturbance, anxiety, return of target symptoms."
  }[cls] || "—";
  $("expBenefits").textContent=exp;
  $("withdrawalInfo").textContent=wdr;
}

/* =========================
   Build + actions
========================= */
function buildPlan(){
  const cls=$("classSelect")?.value, med=$("medicineSelect")?.value, form=$("formSelect")?.value;
  if(!cls||!med||!form){ alert("Please select medicine class, medicine, and form."); return; }

  $("hdrMedicine").textContent=`Medicine: ${med} ${form}`;
  $("hdrSpecial").textContent=`${specialInstructionFor(med, form)}`;

  const isPatch=(form==="Patch");
  const rows=isPatch?buildPlanPatch():buildPlanTablets();
  if(isPatch) renderPatchTable(rows); else renderStandardTable(rows);
  setFooterText(cls);
}

/* Print: open a clean window with only the output card to avoid blank first page */
function printOutputOnly(){
  const el=$("outputCard");
  const w=window.open("", "_blank");
  if(!w){ alert("Popup blocked. Please allow popups for this site."); return; }
  const css = `
    <style>
      body{font:14px/1.45 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#000; background:#fff; margin:16px;}
      h1,h2,h3{margin:0 0 8px}
      table{width:100%; border-collapse:separate; border-spacing:0 6px;}
      thead th{ text-align:left; padding:8px; border-bottom:1px solid #ddd; }
      tbody td{ border:1px solid #ddd; padding:8px; vertical-align:top; }
      .instructions-pre{ white-space:pre-line; }
      .footer-notes{ margin-top:12px; font-size:13px; }
      .pill{ display:none; }
      @page { size: A4 portrait; margin: 12mm; }
    </style>`;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8">${css}</head><body>${el.outerHTML}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
  w.close();
}

/* Save as PDF: use html2pdf to capture only the output card */
function saveOutputAsPdf(){
  const el=$("outputCard");
  if(typeof html2pdf==="function"){
    html2pdf().set({
      filename:'taper_plan.pdf',
      margin:10,
      image:{ type:'jpeg', quality:0.95 },
      html2canvas:{ scale:2, useCORS:true },
      jsPDF:{ unit:'mm', format:'a4', orientation:'portrait' }
    }).from(el).save();
  } else {
    alert("PDF library not loaded.");
  }
}

/* =========================
   Init
========================= */
function init(){
  // datepickers
  document.querySelectorAll(".datepick").forEach(el=>{
    if(window.flatpickr){ flatpickr(el,{dateFormat:"Y-m-d",allowInput:true}); }
    else { el.type="date"; }
  });

  populateClasses(); populateMedicines(); populateForms();
  // auto add lowest line
  resetDoseLinesToLowest();

  $("classSelect")?.addEventListener("change", ()=>{ populateMedicines(); populateForms(); updateRecommended(); resetDoseLinesToLowest(); });
  $("medicineSelect")?.addEventListener("change", ()=>{ populateForms(); updateRecommended(); resetDoseLinesToLowest(); });
  $("formSelect")?.addEventListener("change", ()=>{ updateRecommended(); resetDoseLinesToLowest(); });

  $("addDoseLineBtn")?.addEventListener("click", ()=>{
    const sList=(strengthsForSelected()||[]).sort((a,b)=>parseMgFromStrength(a)-parseMgFromStrength(b));
    if(!sList.length){ alert("Select medicine & form first."); return; }
    const cls=currentClass(), med=$("medicineSelect").value, form=$("formSelect").value;
    const defaultFreq = (form==="Patch") ? "PATCH" : (cls==="Benzodiazepines / Z-Drug (BZRA)" ? "PM" : "AM");
    doseLines.push({ id: nextLineId++, strengthStr: sList[0], qty: 1, freqMode: defaultFreq });
    renderDoseLines();
  });

  $("generateBtn")?.addEventListener("click", buildPlan);
  $("resetBtn")?.addEventListener("click", ()=>location.reload());
  $("printBtn")?.addEventListener("click", printOutputOnly);
  $("savePdfBtn")?.addEventListener("click", saveOutputAsPdf);

  updateRecommended();
}

document.addEventListener("DOMContentLoaded", ()=>{
  try{ init(); }catch(e){ console.error(e); alert("Init error: "+(e?.message||String(e))); }
});
