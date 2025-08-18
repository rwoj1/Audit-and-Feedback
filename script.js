"use strict";

/* ========= utilities ========= */
const $ = (id) => document.getElementById(id);
const fmtDate = (d) => new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
const addDays = (d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
function startOfWeek(d){ const dt=new Date(d); const day=dt.getDay(); const diff=(day===0?6:day-1); dt.setDate(dt.getDate()-diff); dt.setHours(0,0,0,0); return dt; }
function roundToNearest(x, step){ return Math.round(x/step)*step; }
function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }
const MAX_WEEKS=60, THREE_MONTHS_MS=90*24*3600*1000;

/* ========= number-to-words for tablet counts (quarters) ========= */
const WORDS_0_20 = ["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen","twenty"];
function intToWords(n){ if(n>=0 && n<=20) return WORDS_0_20[n]; return String(n); }
function tabletsToWords(q){ // q in quarter-units
  const tabs = q/4;
  const whole = Math.floor(tabs + 1e-6);
  const frac = +(tabs - whole).toFixed(2);
  if(whole===0){
    if(frac===0.25) return "a quarter of a tablet";
    if(frac===0.5)  return "half a tablet";
    if(frac===0.75) return "three quarters of a tablet";
  }
  if(frac===0) return whole===1 ? "one tablet" : `${intToWords(whole)} tablets`;
  const joiner = (frac===0.25)?"a quarter":(frac===0.5)?"a half":"three quarters";
  return `${intToWords(whole)} and ${joiner} of a tablet`;
}
function tabletsToWords_noUnit(q){ // for table cells: digits for whole numbers; words for partials
  const tabs = q/4;
  const whole = Math.floor(tabs + 1e-6);
  const frac = +(tabs - whole).toFixed(2);
  if(frac===0) return String(whole); // 1,2,3...
  if(whole===0){
    if(frac===0.25) return "quarter";
    if(frac===0.5)  return "half";
    if(frac===0.75) return "three quarters";
  }
  const joiner = (frac===0.25)?"a quarter":(frac===0.5)?"a half":"three quarters";
  return `${intToWords(whole)} and ${joiner}`;
}

/* ========= catalog ========= */
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
const CLASS_ORDER = ["Opioid","Benzodiazepines / Z-Drug (BZRA)","Antipsychotic","Proton Pump Inhibitor"];

/* ========= helpers ========= */
function isMR(form){ return /slow\s*release|modified|controlled|extended|sustained/i.test(form) || /(\bSR|MR|CR|ER|XR|PR|CD\b)/i.test(form); }
function canSplitTablets(cls, med, form){
  if (cls==="Opioid" || cls==="Proton Pump Inhibitor") return false;
  if (isMR(form)) return false;
  if (/Capsule|Wafer|Patch/i.test(form)) return false;
  if (med==="Zolpidem" && /Slow Release/i.test(form)) return false;
  return true;
}
function parseMgFromStrength(str){ if(!str) return 0; const lead=String(str).split("/")[0]; const m=lead.match(/([\d.]+)\s*mg/i); return m?parseFloat(m[1]):0; }
function parsePatchRate(str){ const m=String(str).match(/([\d.]+)\s*mcg\/hr/i); return m?parseFloat(m[1]):0; }

/* ========= dropdowns & auto-lowest ========= */
function populateClasses(){ const el=$("classSelect"); if(!el) return; el.innerHTML=""; CLASS_ORDER.forEach(c=>{ const o=document.createElement("option"); o.value=c; o.textContent=c; el.appendChild(o); }); }
function populateMedicines(){ const mSel=$("medicineSelect"), cls=$("classSelect")?.value; if(!mSel || !cls) return; mSel.innerHTML=""; const meds=Object.keys(CATALOG[cls]||{}); const ordered=(cls==="Opioid")?["Morphine","Oxycodone","Oxycodone / Naloxone","Tapentadol","Tramadol","Buprenorphine","Fentanyl"]:meds.slice().sort(); ordered.forEach(m=>{ if(meds.includes(m)){ const o=document.createElement("option"); o.value=m; o.textContent=m; mSel.appendChild(o); }}); }
function populateForms(){ const fSel=$("formSelect"), cls=$("classSelect")?.value, med=$("medicineSelect")?.value; if(!fSel || !cls || !med) return; fSel.innerHTML=""; const forms=Object.keys((CATALOG[cls]||{})[med]||[]); forms.sort((a,b)=>{ const at=/tablet/i.test(a)?0:1, bt=/tablet/i.test(b)?0:1; return at!==bt?at-bt:a.localeCompare(b); }); forms.forEach(f=>{ const o=document.createElement("option"); o.value=f; o.textContent=f; fSel.appendChild(o); }); }
function strengthsForSelected(){ const cls=$("classSelect")?.value, med=$("medicineSelect")?.value, form=$("formSelect")?.value; return (CATALOG[cls]?.[med]?.[form]||[]).slice(); }

/* ========= dose lines ========= */
let doseLines=[]; let nextLineId=1;
function resetDoseLinesToLowest(){
  const cls=$("classSelect").value, med=$("medicineSelect").value, form=$("formSelect").value;
  const sList=strengthsForSelected().sort((a,b)=>parseMgFromStrength(a)-parseMgFromStrength(b));
  doseLines=[];
  if(sList.length){
    const lowest=sList[0];
    const defaultFreq = (form==="Patch") ? "PATCH" : (cls==="Benzodiazepines / Z-Drug (BZRA)" ? "PM" : "AM");
    doseLines.push({ id: 1, strengthStr: lowest, qty: 1, freqMode: defaultFreq });
    nextLineId = 2;
  }
  renderDoseLines();
}
function slotsForFreq(mode){ switch(mode){ case "AM":return["AM"]; case "MID":return["MID"]; case "DIN":return["DIN"]; case "PM":return["PM"]; case "BID":return["AM","PM"]; case "TID":return["AM","MID","PM"]; case "QID":return["AM","MID","DIN","PM"]; case "PATCH":return["PATCH"]; default:return["AM"]; } }
function patchFreqLabel(med){ return med==="Fentanyl"?"Every 3 days":"Every 7 days"; }
function renderDoseLines(){
  const box=$("doseLinesContainer"); if(!box) return; box.innerHTML="";
  if(doseLines.length===0){ const p=document.createElement("p"); p.textContent="(No dose lines)"; p.style.color="#9ca3af"; box.appendChild(p); return; }
  const cls=$("classSelect").value, med=$("medicineSelect").value, form=$("formSelect").value;

  doseLines.forEach((ln,idx)=>{
    const row=document.createElement("div");
    row.style.cssText="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:6px 0";
    row.innerHTML=`<span class="badge">Line ${idx+1}</span>
      <span>Strength:</span><select data-id="${ln.id}" class="dl-strength"></select>
      <span>Number of tablets:</span><input type="number" step="0.25" min="0" value="${ln.qty ?? 1}" class="dl-qty" data-id="${ln.id}" style="width:110px" />
      <span>Frequency:</span><select data-id="${ln.id}" class="dl-freq"></select>
      <button type="button" data-id="${ln.id}" class="secondary dl-remove">Remove</button>`;
    box.appendChild(row);

    const sSel=row.querySelector(".dl-strength");
    const sList=strengthsForSelected().sort((a,b)=>parseMgFromStrength(a)-parseMgFromStrength(b));
    sSel.innerHTML=""; sList.forEach(s=>{ const o=document.createElement("option"); o.value=s; o.textContent=s; sSel.appendChild(o); });
    sSel.value=ln.strengthStr || sList[0];

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

    sSel.addEventListener("change", e=>{ const id=+e.target.dataset.id; const l=doseLines.find(x=>x.id===id); if(l) l.strengthStr=e.target.value; });
    fSel.addEventListener("change", e=>{ const id=+e.target.dataset.id; const l=doseLines.find(x=>x.id===id); if(l) l.freqMode=e.target.value; });
    row.querySelector(".dl-qty").addEventListener("change", e=>{
      const id=+e.target.dataset.id; const l=doseLines.find(x=>x.id===id);
      const canSplit=canSplitTablets(cls,med,form); const step = canSplit ? 0.25 : 1;
      let v=parseFloat(e.target.value); if(isNaN(v)) v=1;
      v=Math.max(0, Math.round(v/step)*step);
      e.target.value=v; if(l) l.qty=v;
    });
    row.querySelector(".dl-remove").addEventListener("click", e=>{ const id=+e.target.dataset.id; doseLines=doseLines.filter(x=>x.id!==id); renderDoseLines(); });
  });
}

/* ========= best practice & headers ========= */
const RECOMMEND = {
  "Opioid":[
    "Tailor the plan to clinical characteristics, goals and preferences.",
    "< 3 months use: reduce 10–25% every week.",
    "> 3 months use: reduce 10–25% every 4 weeks.",
    "Long-term/high doses: slower taper and frequent monitoring."
  ],
  "Benzodiazepines / Z-Drug (BZRA)":[
    "Taper slowly with the patient; e.g., 25% every 2 weeks.",
    "Near end: consider 12.5% reductions and/or planned drug-free days."
  ],
  "Proton Pump Inhibitor":[
    "Step-down to lowest effective dose, alternate-day dosing, or stop and use on-demand.",
    "Review at 4–12 weeks."
  ],
  "Antipsychotic":[
    "Reduce ~25–50% every 1–2 weeks with close monitoring.",
    "Slower taper may be appropriate depending on symptoms."
  ]
};
function specialInstructionFor(med, form){
  if(form==="Patch") return "Special instruction: apply to intact skin as directed. Do not cut patches.";
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

/* ========= math & packing ========= */
function allowedPiecesMg(cls, med, form){
  const strengths=strengthsForSelected().map(parseMgFromStrength).filter(v=>v>0);
  const uniq=[...new Set(strengths)].sort((a,b)=>a-b);
  let pieces=uniq.slice();
  if(canSplitTablets(cls,med,form)){ uniq.forEach(v=>pieces.push(v/2, v/4)); }
  return [...new Set(pieces.map(v=>+v.toFixed(3)))].sort((a,b)=>a-b);
}
function lowestTitrationStepMg(cls, med, form){
  const mgList=strengthsForSelected().map(parseMgFromStrength).filter(v=>v>0).sort((a,b)=>a-b);
  const base=mgList[0]||0;
  return canSplitTablets(cls,med,form) ? +(base/4).toFixed(3) : base;
}
function packTotalMg(pack){ return Object.entries(pack).reduce((s,[mg,c])=>s + parseFloat(mg)*c, 0); }
function packsTotalMg(packs){ return packTotalMg(packs.AM)+packTotalMg(packs.MID)+packTotalMg(packs.DIN)+packTotalMg(packs.PM); }
function removeFromPackByMg(pack, amount){
  let toDrop=+amount.toFixed(4);
  const sizes=Object.keys(pack).map(parseFloat).sort((a,b)=>b-a);
  for(const p of sizes){
    while(toDrop>0 && pack[p]>0){ pack[p]-=1; if(pack[p]===0) delete pack[p]; toDrop=+(toDrop-p).toFixed(4); }
    if(toDrop<=0) break;
  }
  return Math.max(0,toDrop);
}

/* map piece mg back to a commercial base for chart labelling */
function baseFromPieceMg(pieceMg){
  const mgList=strengthsForSelected().map(parseMgFromStrength).filter(v=>v>0).sort((a,b)=>a-b);
  for(const s of mgList){ if(Math.abs(pieceMg - s/4) < 1e-6) return {base:s, factor:0.25};
                          if(Math.abs(pieceMg - s/2) < 1e-6) return {base:s, factor:0.5};
                          if(Math.abs(pieceMg - s)   < 1e-6) return {base:s, factor:1}; }
  let nearest=mgList[0]||pieceMg, factor=1;
  return {base:nearest, factor};
}

/* build packs from inputs */
function buildPacksFromDoseLines(){
  const cls=$("classSelect").value, med=$("medicineSelect").value, form=$("formSelect").value;
  const packs={AM:{},MID:{},DIN:{},PM:{}};
  const add=(slot, pieceMg, units)=>{ packs[slot][pieceMg]=(packs[slot][pieceMg]||0)+units; };

  doseLines.forEach(ln=>{
    const mg=parseMgFromStrength(ln.strengthStr);
    const qty=parseFloat(ln.qty||1);
    const slots=slotsForFreq(ln.freqMode);
    slots.forEach(sl=>{
      if(sl==="PATCH") return;
      if(canSplitTablets(cls,med,form)){
        const qMg=+(mg/4).toFixed(3);
        const qCount=Math.round(qty*4); // quarter units
        add(sl, qMg, qCount);
      }else{
        add(sl, mg, Math.round(qty)); // whole tablets only
      }
    });
  });

  // BZRA force PM only
  if($("classSelect").value==="Benzodiazepines / Z-Drug (BZRA)"){
    packs.AM={}; packs.MID={}; packs.DIN={};
  }
  return packs;
}

/* ========= steppers ========= */
function splitDailyPreferred(total, pieceSet){
  const half=Math.floor(total/2);
  for(let amT=half; amT>=0; amT--){
    const pmT=total-amT;
    const am=composeExact(amT,pieceSet); if(!am) continue;
    const pm=composeExact(pmT,pieceSet); if(pm && pmT>=amT) return {AM:am, PM:pm};
  }
  const all=composeExact(total,pieceSet) || {[pieceSet[pieceSet.length-1]]:1};
  return {AM:{}, PM:all};
}
function composeExact(target, pieceSet){
  let rem=target, used={}; const arr=pieceSet.slice().sort((a,b)=>b-a);
  for(const s of arr){ const n=Math.floor(rem/s+1e-9); if(n>0){ used[s]=(used[s]||0)+n; rem=+(rem-n*s).toFixed(3); } }
  return Math.abs(rem)<1e-6 ? used : null;
}
function composeExactOrLower(target, pieceSet, step){
  let t = target;
  while(t>0){
    const used = composeExact(t, pieceSet);
    if(used) return used;
    t = +(t - step).toFixed(3);
  }
  return {};
}

/* opioid & PPI: BID preference */
function opioidOrPpiStep(packs, percent, med, form){
  const current=packsTotalMg(packs); if(current<=0.0001) return packs;
  const strengths=strengthsForSelected().map(parseMgFromStrength).filter(v=>v>0).sort((a,b)=>a-b);
  const step=strengths[0]||1;
  let target=roundToNearest(current*(1-percent/100), step);
  if(target===current && current>0){ target=Math.max(0,current-step); target=roundToNearest(target,step); }
  const bid=splitDailyPreferred(target, strengths);
  return { AM:bid.AM, MID:{}, DIN:{}, PM:bid.PM };
}

/* antipsychotic: SR -> opioid style; IR -> reduce DIN→MID→AM→PM */
function antipsychoticStep(packs, percent, med, form){
  const isIR = !/Slow\s*Release/i.test(form) && !/\bSR\b/i.test(form);
  if(!isIR) return opioidOrPpiStep(packs,percent,med,form);
  const total=packsTotalMg(packs); if(total<=0.0001) return packs;
  let toRemove=+(total*(percent/100)).toFixed(3);
  const order=["DIN","MID","AM","PM"];
  // remove in the specified order using available pieces
  while(toRemove>1e-6){
    for(const key of order){
      if(toRemove<=1e-6) break;
      const before = packTotalMg(packs[key]);
      toRemove = removeFromPackByMg(packs[key], toRemove);
      const after = packTotalMg(packs[key]);
      if(after<before) { /* removed something */ }
    }
    // If nothing could be removed (e.g., already zero), break to avoid loop
    const now=packsTotalMg(packs);
    if(now>=total) break;
  }
  return packs;
}

/* BZRA (PM only) */
function bzraStep(packs, percent, med, form){
  const current=packsTotalMg(packs); if(current<=0.0001) return packs;
  const pieceSet=allowedPiecesMg("Benzodiazepines / Z-Drug (BZRA)",med,form);
  const step=lowestTitrationStepMg("Benzodiazepines / Z-Drug (BZRA)",med,form)||0.125;
  let target=roundToNearest(current*(1-percent/100), step);
  if(target===current && current>0){ target=Math.max(0,current-step); target=roundToNearest(target,step); }
  const pm=composeExactOrLower(target, pieceSet, step);
  return { AM:{}, MID:{}, DIN:{}, PM:pm };
}

/* ========= builders + stopping reasons ========= */
function deepCopy(o){ return JSON.parse(JSON.stringify(o)); }
function stoppingReason({complete, hit3mo, hitReview, hitP1Stop}) {
  if (complete) return "stop";
  return "review";
}

function buildPlanTablets(){
  const cls=$("classSelect").value, med=$("medicineSelect").value, form=$("formSelect").value;
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
  const endBy = { complete:false, hit3mo:false, hitReview:false, hitP1Stop:false };

  const stepOnce=()=>{
    if(cls==="Opioid"||cls==="Proton Pump Inhibitor") packs=opioidOrPpiStep(packs,p1Percent,med,form);
    else if(cls==="Benzodiazepines / Z-Drug (BZRA)") packs=bzraStep(packs,p1Percent,med,form);
    else packs=antipsychoticStep(packs,p1Percent,med,form);
  };

  // first step
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

  // Phase 2
  if(!endBy.complete && !(endBy.hit3mo||endBy.hitReview||endBy.hitP1Stop) && p2Percent>0){
    while(packsTotalMg(packs)>0.0001){
      const nextDate=addDays(date,p2Interval);
      if(reviewDate && nextDate>=reviewDate){ date=nextDate; endBy.hitReview=true; break; }
      if((+nextDate - +startDate) >= THREE_MONTHS_MS){ date=nextDate; endBy.hit3mo=true; break; }
      date=nextDate; week++;
      if(cls==="Opioid"||cls==="Proton Pump Inhibitor") packs=opioidOrPpiStep(packs,p2Percent,med,form);
      else if(cls==="Benzodiazepines / Z-Drug (BZRA)") packs=bzraStep(packs,p2Percent,med,form);
      else packs=antipsychoticStep(packs,p2Percent,med,form);
      rows.push({ week, date:fmtDate(date), packs:deepCopy(packs), med, form });
      if(rows.length>=MAX_WEEKS) break;
    }
    if(packsTotalMg(packs)<=0.0001){ endBy.complete=true; }
  }

  const reason = stoppingReason(endBy);
  // final row date = current date (no extra blank interval)
  rows.push({
    week: week+1,
    date: fmtDate(date),
    packs:{AM:{},MID:{},DIN:{},PM:{}},
    med, form,
    stop: (reason==="stop"),
    review: (reason==="review")
  });
  return rows;
}

/* ---- patches: list every patch change; reduce weekly (or chosen interval); hold smallest until stop ---- */
function buildPlanPatch(){
  const med=$("medicineSelect").value;
  const startDate=$("startDate")?($("startDate")._flatpickr?.selectedDates?.[0]||new Date()):new Date();
  const reviewDate=$("reviewDate")?($("reviewDate")._flatpickr?.selectedDates?.[0]||null):null;

  const reductionEveryDays = Math.max(1, parseInt($("p1Interval")?.value||"7",10)); // e.g., 7
  const reduceBy = clamp(parseFloat($("p1Percent")?.value||"0"),1,100);

  const changeDays = (med==="Fentanyl") ? 3 : 7; // q3d or q7d
  const strengths = strengthsForSelected().map(parsePatchRate).filter(v=>v>0).sort((a,b)=>b-a); // high→low
  const smallest = strengths[strengths.length-1];

  // starting total from dose lines
  let total = 0; doseLines.forEach(ln=> total += parsePatchRate(ln.strengthStr)||0 );
  if(total<=0) total = smallest;

  function mixDownTo(value){
    // greedy mix of available patches to reach (or slightly exceed) value
    let remaining = value, used=[];
    for(const s of strengths){ while(remaining>=s){ used.push(s); remaining -= s; } }
    if(remaining>0){ const s=strengths[strengths.length-1]; used.push(s); /* minimal underfill not allowed, so add one */ }
    return used;
  }

  const rows=[]; let date=startOfWeek(startDate); let week=1;
  let currentDose = total;
  let nextReductionDate = date; // first reduction at first row

  while(true){
    // apply reduction if due (no lower than smallest)
    if(+date >= +nextReductionDate){
      currentDose = Math.max(smallest, Math.ceil(currentDose*(1 - reduceBy/100)));
      nextReductionDate = addDays(nextReductionDate, reductionEveryDays);
    }
    const used = mixDownTo(currentDose);
    rows.push({ week, date:fmtDate(date), patches:used, med, form:"Patch" });

    // stop conditions
    const nextDate = addDays(date, changeDays);
    const hitReview = (reviewDate && nextDate>=reviewDate);
    const hit3mo = ((+nextDate - +startDate) >= THREE_MONTHS_MS);
    if(hitReview || hit3mo){ date = nextDate; rows.push({ week:week+1, date:fmtDate(date), patches:[], med, form:"Patch", review:true }); break; }

    // if we’re already at smallest, keep listing smallest each change until a stop condition is met
    if(currentDose<=smallest && rows.length>=MAX_WEEKS-1){ date=nextDate; rows.push({ week:week+1, date:fmtDate(date), patches:[], med, form:"Patch", stop:true }); break; }

    // advance
    date = nextDate; week++;
    if(rows.length>=MAX_WEEKS) break;
  }
  return rows;
}

/* ========= rendering ========= */
function td(text, cls){ const el=document.createElement("td"); if(cls) el.className=cls; el.textContent=String(text??""); return el; }

function buildGroupedByCommercial(packs){
  // group by base strength, values in quarter-tablets per slot
  const groups={}; // baseMg -> {AM,MID,DIN,PM} in quarters
  ["AM","MID","DIN","PM"].forEach(slot=>{
    Object.entries(packs[slot]).forEach(([pieceStr,count])=>{
      const piece=parseFloat(pieceStr);
      const {base, factor}=baseFromPieceMg(piece); // factor = 1, 0.5, 0.25 tablet
      if(!groups[base]) groups[base]={AM:0,MID:0,DIN:0,PM:0};
      groups[base][slot]+= Math.round(count*factor*4); // store as quarters
    });
  });
  return groups;
}

function labelCommercial(med, baseMg, form){
  const mgTxt=(+baseMg.toFixed(3)).toString().replace(/\.000$/,'').replace(/(\.\d)0+$/,'$1');
  if (/Slow\s*Release/i.test(form) || /\bSR\b/i.test(form)) return `${med} ${mgTxt} mg SR tablet`;
  if (/Immediate\s*Release/i.test(form)) return `${med} ${mgTxt} mg IR tablet`;
  if (/Capsule/i.test(form)) return `${med} ${mgTxt} mg capsule`;
  if (/Wafer/i.test(form)) return `${med} ${mgTxt} mg wafer`;
  return `${med} ${mgTxt} mg tablet`;
}
function formTokenForImage(form){
  if (/Slow\s*Release/i.test(form) || /\bSR\b/i.test(form)) return "SR_Tablet";
  if (/Immediate\s*Release/i.test(form)) return "IR_Tablet";
  if (/Capsule/i.test(form)) return "Capsule";
  if (/Wafer/i.test(form)) return "Wafer";
  return "Tablet";
}

function instructionFromQuarters(amQ, midQ, dinQ, pmQ){
  const lines=[];
  if(amQ)  lines.push(`Take ${tabletsToWords(amQ)} in the morning`);
  if(midQ) lines.push(`Take ${tabletsToWords(midQ)} at midday`);
  if(dinQ) lines.push(`Take ${tabletsToWords(dinQ)} at dinner`);
  if(pmQ)  lines.push(`Take ${tabletsToWords(pmQ)} at night`);
  return lines.join("\n");
}

function renderStandardTable(rows){
  const scheduleBlock=$("scheduleBlock"), patchBlock=$("patchBlock"); if(!scheduleBlock) return;
  scheduleBlock.style.display=""; patchBlock.style.display="none"; scheduleBlock.innerHTML="";
  const table=document.createElement("table"); table.className="table";
  const thead=document.createElement("thead"); const hr=document.createElement("tr");
  ["Date beginning","Strength","Instructions","Morning","Midday","Dinner","Night"].forEach(h=>{ const th=document.createElement("th"); th.textContent=h; hr.appendChild(th); });
  thead.appendChild(hr); table.appendChild(thead);
  const tbody=document.createElement("tbody");

  const imageSet = new Set();
  const medGlobal = $("medicineSelect").value;
  const formGlobal = $("formSelect").value;
  const formToken = formTokenForImage(formGlobal);

  rows.forEach((r, idxWeek)=>{
    if(r.stop || r.review){
      const tr=document.createElement("tr");
      tr.appendChild(td(r.date));
      tr.appendChild(td(""));
      tr.appendChild(td(r.stop ? "Stop." : "Review ongoing plan with the doctor","instructions-pre"));
      tr.appendChild(td("", "center")); tr.appendChild(td("", "center")); tr.appendChild(td("", "center")); tr.appendChild(td("", "center"));
      if(idxWeek%2===1) tr.classList.add("week-even");
      tbody.appendChild(tr);
      return;
    }
    const groups=buildGroupedByCommercial(r.packs);
    const bases=Object.keys(groups).map(parseFloat).sort((a,b)=>a-b);
    if(bases.length===0){
      const tr=document.createElement("tr");
      tr.appendChild(td(r.date)); tr.appendChild(td("")); tr.appendChild(td("", "instructions-pre"));
      tr.appendChild(td("", "center")); tr.appendChild(td("", "center")); tr.appendChild(td("", "center")); tr.appendChild(td("", "center"));
      if(idxWeek%2===1) tr.classList.add("week-even");
      tbody.appendChild(tr);
      return;
    }
    bases.forEach((baseMg, i)=>{
      const g=groups[baseMg];
      const tr=document.createElement("tr");
      if(i===0){ const d=td(r.date); if(bases.length>1) d.rowSpan=bases.length; tr.appendChild(d); }
      tr.appendChild(td(labelCommercial(r.med, baseMg, r.form)));
      tr.appendChild(td(instructionFromQuarters(g.AM,g.MID,g.DIN,g.PM),"instructions-pre"));
      tr.appendChild(td(g.AM? tabletsToWords_noUnit(g.AM) : "", "center"));
      tr.appendChild(td(g.MID? tabletsToWords_noUnit(g.MID) : "", "center"));
      tr.appendChild(td(g.DIN? tabletsToWords_noUnit(g.DIN) : "", "center"));
      tr.appendChild(td(g.PM? tabletsToWords_noUnit(g.PM) : "", "center"));
      if(idxWeek%2===1) tr.classList.add("week-even");
      tbody.appendChild(tr);

      imageSet.add(`${r.med}||${baseMg}||${formToken}`);
    });
  });

  table.appendChild(tbody);
  scheduleBlock.appendChild(table);
  renderImagesBlock(imageSet);
}

function renderPatchTable(rows){
  const scheduleBlock=$("scheduleBlock"), patchBlock=$("patchBlock"); if(!patchBlock) return;
  scheduleBlock.style.display="none"; patchBlock.style.display=""; patchBlock.innerHTML="";
  const table=document.createElement("table"); table.className="table";
  const thead=document.createElement("thead"); const hr=document.createElement("tr");
  ["Apply on","Remove on","Patch strength(s)","Instructions"].forEach(h=>{ const th=document.createElement("th"); th.textContent=h; hr.appendChild(th); });
  thead.appendChild(hr); table.appendChild(thead);
  const tbody=document.createElement("tbody");
  const everyDays=($("medicineSelect").value==="Fentanyl")?3:7;

  rows.forEach((r, idxWeek)=>{
    const tr=document.createElement("tr");
    tr.appendChild(td(r.date));
    tr.appendChild(td(fmtDate(addDays(new Date(r.date), everyDays))));
    tr.appendChild(td((r.patches||[]).map(v=>`${v} mcg/hr`).join(" + ")));
    tr.appendChild(td(r.stop ? "Stop." : r.review ? "Review ongoing plan with the doctor" : `Apply patches every ${everyDays} days.`));
    if(idxWeek%2===1) tr.classList.add("week-even");
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  patchBlock.appendChild(table);
}

/* ========= images block ========= */
function renderImagesBlock(imageSet){
  const block = $("imagesBlock");
  block.innerHTML = "";
  if(!imageSet || imageSet.size===0) return;

  const title = document.createElement("h3");
  title.textContent = "Your tablets may look like this";
  block.appendChild(title);

  imageSet.forEach(key=>{
    const [med, baseMg, formToken] = key.split("||");
    const mgTxt=(+parseFloat(baseMg).toFixed(3)).toString().replace(/\.000$/,'').replace(/(\.\d)0+$/,'$1');
    const row = document.createElement("div");
    row.className = "image-row";

    const img = document.createElement("img");
    const fileName = `${med.replace(/\s+/g,"_")}_${mgTxt}_${formToken}.png`;
    img.src = `images/${fileName}`;
    img.alt = `${med} ${mgTxt} mg ${formToken}`;
    img.onerror = ()=>{ row.remove(); }; // skip missing

    const span = document.createElement("span");
    span.className = "label";
    span.textContent = `${med} ${mgTxt} mg ${formToken.replace("_"," ").replace("_"," ")}`.replace("_Tablet"," tablet").replace("_Capsule"," capsule").replace("_Wafer"," wafer");

    row.appendChild(img);
    row.appendChild(span);
    block.appendChild(row);
  });
}

/* ========= footer ========= */
function setFooterText(cls){
  const exp={ "Opioid":"Improved function and reduced opioid-related harms.",
             "Benzodiazepines / Z-Drug (BZRA)":"Improved cognition, alertness, and reduced falls.",
             "Proton Pump Inhibitor":"Reduced pill burden and long-term adverse effects.",
             "Antipsychotic":"Lower risk of metabolic/extrapyramidal adverse effects." }[cls] || "—";
  const wdr={ "Opioid":"Transient pain flare, cravings, mood changes.",
             "Benzodiazepines / Z-Drug (BZRA)":"Insomnia, anxiety, irritability.",
             "Proton Pump Inhibitor":"Rebound heartburn.",
             "Antipsychotic":"Sleep disturbance, anxiety, return of target symptoms." }[cls] || "—";
  $("expBenefits").textContent=exp; $("withdrawalInfo").textContent=wdr;
}

/* ========= build & init ========= */
function buildPlan(){
  const cls=$("classSelect")?.value, med=$("medicineSelect")?.value, form=$("formSelect")?.value;
  if(!cls || !med || !form){ alert("Please select medicine class, medicine, and form."); return; }
  $("hdrMedicine").textContent=`Medicine: ${med} ${form}`;
  $("hdrSpecial").textContent=`${specialInstructionFor(med, form)}`;
  const rows=(form==="Patch")?buildPlanPatch():buildPlanTablets();
  if(form==="Patch") renderPatchTable(rows); else renderStandardTable(rows);
  setFooterText(cls);
}

/* Print only the output card (no big blank top) */
function printOutputOnly(){
  const src = $("outputCard");
  const holder = document.createElement("div");
  holder.id="__printArea";
  holder.style.cssText="position:fixed;inset:0;background:#fff;z-index:999999;overflow:auto;padding:10mm";
  const clone = src.cloneNode(true);
  holder.appendChild(clone);
  const style = document.createElement("style");
  style.id="__printOnly";
  style.textContent = `
    @page{ size:A4; margin:10mm }
    body > *:not(#__printArea){ display:none !important }
    #__printArea{ display:block !important }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact }
  `;
  document.head.appendChild(style);
  document.body.appendChild(holder);
  window.print();
  holder.remove();
  style.remove();
}

function init(){
  document.querySelectorAll(".datepick").forEach(el=>{ if(window.flatpickr){ flatpickr(el,{dateFormat:"Y-m-d",allowInput:true}); } else { el.type="date"; } });
  populateClasses(); populateMedicines(); populateForms(); resetDoseLinesToLowest();
  $("classSelect")?.addEventListener("change", ()=>{ populateMedicines(); populateForms(); updateRecommended(); resetDoseLinesToLowest(); });
  $("medicineSelect")?.addEventListener("change", ()=>{ populateForms(); updateRecommended(); resetDoseLinesToLowest(); });
  $("formSelect")?.addEventListener("change", ()=>{ updateRecommended(); resetDoseLinesToLowest(); });
  $("addDoseLineBtn")?.addEventListener("click", addDoseLine);
  $("generateBtn")?.addEventListener("click", buildPlan);
  $("resetBtn")?.addEventListener("click", ()=>location.reload());
  $("printBtn")?.addEventListener("click", printOutputOnly);
  $("savePdfBtn")?.addEventListener("click", ()=>{
    const el=$("outputCard");
    if(typeof html2pdf==="function"){
      html2pdf().set({
        filename:'taper_plan.pdf',
        margin:10,
        image:{ type:'jpeg', quality:0.95 },
        html2canvas:{ scale:2, useCORS:true },
        jsPDF:{ unit:'mm', format:'a4', orientation:'portrait' }
      }).from(el).save();
    } else { alert("PDF library not loaded."); }
  });
  updateRecommended();
}
document.addEventListener("DOMContentLoaded", init);
