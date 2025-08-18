"use strict";

/* ========= utilities ========= */
const $ = (id) => document.getElementById(id);
const fmtDate = (d) => new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
const addDays = (d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
function startOfWeek(d){ const dt=new Date(d); const day=dt.getDay(); const diff=(day===0?6:day-1); dt.setDate(dt.getDate()-diff); dt.setHours(0,0,0,0); return dt; }
function banner(msg){ const b=document.createElement("div"); b.style.cssText="position:fixed;left:0;right:0;bottom:0;background:#7f1d1d;color:#fff;padding:8px 12px;font:14px system-ui;z-index:999999"; b.textContent=msg; document.body.appendChild(b); }
function roundToNearest(x, step){ return Math.round(x/step)*step; }
function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }

const MAX_WEEKS=60, THREE_MONTHS_MS=90*24*3600*1000;

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
    "Haloperidol": { "Tablet":["0.5 mg","1 mg","2 mg","5 mg","10 mg","20 mg"] },
    "Olanzapine": { "Tablet":["2.5 mg","5 mg","7.5 mg","10 mg","15 mg","20 mg"], "Wafer":["5 mg","10 mg","15 mg","20 mg"] },
    "Quetiapine": { "Immediate Release Tablet":["25 mg","100 mg","200 mg","300 mg"], "Slow Release Tablet":["50 mg","150 mg","200 mg","300 mg","400 mg"] },
    "Risperidone": { "Tablet":["0.5 mg","1 mg","2 mg","3 mg","4 mg"] }
  },
  "Proton Pump Inhibitor": {
    "Esomeprazole": { "Tablet":["20 mg","40 mg"] },   /* fixed */
    "Lansoprazole": { "Tablet":["15 mg","30 mg"], "Wafer":["15 mg","30 mg"] },
    "Omeprazole": { "Capsule":["10 mg","20 mg"], "Tablet":["10 mg","20 mg"] },
    "Pantoprazole": { "Tablet":["20 mg","40 mg"] },
    "Rabeprazole": { "Tablet":["10 mg","20 mg"] }
  }
};
const CLASS_ORDER = ["Opioid","Benzodiazepines / Z-Drug (BZRA)","Antipsychotic","Proton Pump Inhibitor"];

/* ========= rules ========= */
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

/* ========= dropdowns ========= */
function populateClasses(){ const el=$("classSelect"); if(!el) return; el.innerHTML=""; CLASS_ORDER.forEach(c=>{ const o=document.createElement("option"); o.value=c; o.textContent=c; el.appendChild(o); }); }
function populateMedicines(){ const mSel=$("medicineSelect"), cls=$("classSelect")?.value; if(!mSel || !cls) return; mSel.innerHTML=""; const meds=Object.keys(CATALOG[cls]||{}); const ordered=(cls==="Opioid")?["Morphine","Oxycodone","Oxycodone / Naloxone","Tapentadol","Tramadol","Buprenorphine","Fentanyl"]:meds.slice().sort(); ordered.forEach(m=>{ if(meds.includes(m)){ const o=document.createElement("option"); o.value=m; o.textContent=m; mSel.appendChild(o); }}); }
function populateForms(){ const fSel=$("formSelect"), cls=$("classSelect")?.value, med=$("medicineSelect")?.value; if(!fSel || !cls || !med) return; fSel.innerHTML=""; const forms=Object.keys((CATALOG[cls]||{})[med]||[]); forms.sort((a,b)=>{ const at=/tablet/i.test(a)?0:1, bt=/tablet/i.test(b)?0:1; return at!==bt?at-bt:a.localeCompare(b); }); forms.forEach(f=>{ const o=document.createElement("option"); o.value=f; o.textContent=f; fSel.appendChild(o); }); }
function strengthsForSelected(){ const cls=$("classSelect")?.value, med=$("medicineSelect")?.value, form=$("formSelect")?.value; return (CATALOG[cls]?.[med]?.[form]||[]).slice(); }

/* ========= dose lines UI (now includes quantity) ========= */
let doseLines=[]; let nextLineId=1;
function slotsForFreq(mode){ switch(mode){ case "AM":return["AM"]; case "MID":return["MID"]; case "DIN":return["DIN"]; case "PM":return["PM"]; case "BID":return["AM","PM"]; case "TID":return["AM","MID","PM"]; case "QID":return["AM","MID","DIN","PM"]; case "PATCH":return["PATCH"]; default:return["AM"]; } }
function patchFreqLabel(med){ return med==="Fentanyl"?"Every 3 days":"Every 7 days"; }

function renderDoseLines(){
  const box=$("doseLinesContainer"); if(!box) return; box.innerHTML="";
  if(doseLines.length===0){ const p=document.createElement("p"); p.textContent="(No dose lines)"; p.style.color="#9ca3af"; box.appendChild(p); return; }
  const med=$("medicineSelect").value, form=$("formSelect").value, cls=$("classSelect").value;
  doseLines.forEach((ln,idx)=>{
    const row=document.createElement("div");
    row.style.cssText="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:6px 0";
    row.innerHTML=`<span class="badge">Line ${idx+1}</span>
      <span>Strength:</span><select data-id="${ln.id}" class="dl-strength"></select>
      <span>Number of tablets:</span><input type="number" step="0.25" min="0" value="${ln.qty ?? 1}" class="dl-qty" data-id="${ln.id}" style="width:100px" />
      <span>Frequency:</span><select data-id="${ln.id}" class="dl-freq"></select>
      <button type="button" data-id="${ln.id}" class="secondary dl-remove">Remove</button>`;
    box.appendChild(row);

    // Strength options
    const sSel=row.querySelector(".dl-strength");
    const sList=strengthsForSelected().sort((a,b)=>parseMgFromStrength(a)-parseMgFromStrength(b));
    sSel.innerHTML=""; sList.forEach(s=>{ const o=document.createElement("option"); o.value=s; o.textContent=s; sSel.appendChild(o); });
    sSel.value=ln.strengthStr || sList[sList.length-1];

    // Frequency options
    const fSel=row.querySelector(".dl-freq"); fSel.innerHTML="";
    if(form==="Patch"){
      const o=document.createElement("option"); o.value="PATCH"; o.textContent=patchFreqLabel(med); fSel.appendChild(o); fSel.disabled=true;
    }else{
      [["AM","Daily in the morning"],["MID","Daily at midday"],["DIN","Daily at dinner"],["PM","Daily at night"],["BID","Twice daily (morning & night)"],["TID","Three times daily"],["QID","Four times daily"]]
        .forEach(([v,t])=>{ const o=document.createElement("option"); o.value=v; o.textContent=t; fSel.appendChild(o); });
      fSel.value=ln.freqMode || "AM"; fSel.disabled=false;
    }

    // Listeners
    sSel.addEventListener("change", e=>{const id=+e.target.dataset.id; const l=doseLines.find(x=>x.id===id); if(l) l.strengthStr=e.target.value;});
    fSel.addEventListener("change", e=>{const id=+e.target.dataset.id; const l=doseLines.find(x=>x.id===id); if(l) l.freqMode=e.target.value;});
    row.querySelector(".dl-qty").addEventListener("change", e=>{
      const id=+e.target.dataset.id; const l=doseLines.find(x=>x.id===id);
      let v=parseFloat(e.target.value); const canSplit=canSplitTablets(cls,med,form);
      const step=canSplit?0.25: (cls==="Opioid"||cls==="Proton Pump Inhibitor"?1:0.5);
      if(isNaN(v)) v=1; v=Math.max(0, Math.round(v/step)*step);
      e.target.value=v; if(l) l.qty=v;
    });
    row.querySelector(".dl-remove").addEventListener("click", e=>{ const id=+e.target.dataset.id; doseLines=doseLines.filter(x=>x.id!==id); renderDoseLines(); });
  });
}
function addDoseLine(){
  const sList=strengthsForSelected().sort((a,b)=>parseMgFromStrength(a)-parseMgFromStrength(b));
  if(!sList.length){ banner("Select medicine & form first."); return; }
  doseLines.push({ id: nextLineId++, strengthStr: sList[sList.length-1], qty: 1, freqMode: "AM" });
  renderDoseLines();
}

/* ========= best practice & headers ========= */
const RECOMMEND = {
  "Opioid":["Tailor the plan to clinical characteristics, goals and preferences.","< 3 months use: reduce 10–25% every week.","> 3 months use: reduce 10–25% every 4 weeks.","Long-term/high doses: slower taper and frequent monitoring."],
  "Benzodiazepines / Z-Drug (BZRA)":[ "Taper slowly with the patient; e.g., 25% every 2 weeks.","Near end: consider 12.5% reductions and/or planned drug-free days." ],
  "Proton Pump Inhibitor":[ "Step-down to lowest effective dose, alternate-day dosing, or stop and use on-demand.","Review at 4–12 weeks." ],
  "Antipsychotic":[ "Reduce ~25–50% every 1–2 weeks with close monitoring.","Slower taper may be appropriate depending on symptoms." ]
};
function specialInstructionFor(med, form){
  if(form==="Patch") return "Special instruction: apply to intact skin as directed. Do not cut patches.";
  if(isMR(form)) return "Swallow whole, do not halve or crush";
  return "Swallow whole, do not halve or crush";
}
function updateRecommended(){
  const cls=$("classSelect")?.value;
  const bp=$("bestPracticeBox"); bp.className="bp";
  bp.innerHTML=`<strong>Suggested Practice for ${cls||""}</strong><ul>${(RECOMMEND[cls]||[]).map(t=>`<li>${t}</li>`).join("")}</ul>`;
  const med=$("medicineSelect")?.value, form=$("formSelect")?.value;
  $("hdrMedicine").textContent=`Medicine: ${med} ${form||""}`;
  $("hdrSpecial").textContent=`Special instructions: ${specialInstructionFor(med, form)}`;
}

/* ========= math helpers ========= */
function allowedPiecesMg(cls, med, form){
  const strengths=strengthsForSelected().map(parseMgFromStrength).filter(v=>v>0);
  const uniq=[...new Set(strengths)].sort((a,b)=>a-b);
  let pieces=uniq.slice();
  const canSplit=canSplitTablets(cls,med,form);
  if(canSplit){ uniq.forEach(v=>pieces.push(v/2, v/4)); }
  pieces=[...new Set(pieces.map(v=>+v.toFixed(2)))].sort((a,b)=>a-b);
  return pieces;
}
function lowestTitrationStepMg(cls, med, form){
  const mgList=strengthsForSelected().map(parseMgFromStrength).filter(v=>v>0).sort((a,b)=>a-b);
  const base=mgList[0]||0;
  if(canSplitTablets(cls,med,form)) return +(base/4).toFixed(3);
  // if halving only (not used separately now) fallback to half; otherwise whole tablet
  return base; 
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

/* ========= compose helpers ========= */
function composeExact(target, pieceSet){
  let rem=target, used={}; const arr=pieceSet.slice().sort((a,b)=>b-a);
  for(const s of arr){ const n=Math.floor(rem/s+1e-9); if(n>0){ used[s]=(used[s]||0)+n; rem=+(rem-n*s).toFixed(3); } }
  return Math.abs(rem)<1e-6 ? used : null;
}
function splitDailyPreferred(total, pieceSet){
  // Prefer BID with PM >= AM, else TID/QID patterns are collapsed out by allocation stage
  const half=Math.floor(total/2);
  for(let amT=half; amT>=0; amT--){
    const pmT=total-amT;
    const am=composeExact(amT,pieceSet); if(!am) continue;
    const pm=composeExact(pmT,pieceSet); if(pm && pmT>=amT) return {AM:am, PM:pm};
  }
  // fallback: all to PM
  const all=composeExact(total,pieceSet) || {[pieceSet[pieceSet.length-1]]:1};
  return {AM:{}, PM:all};
}

/* ========= build packs from user inputs ========= */
function buildPacksFromDoseLines(){
  const cls=$("classSelect").value, med=$("medicineSelect").value, form=$("formSelect").value;
  const canSplit=canSplitTablets(cls,med,form);
  const packs={AM:{},MID:{},DIN:{},PM:{}};
  const add=(slot,mg,count)=>{ packs[slot][mg]=(packs[slot][mg]||0)+count; };

  doseLines.forEach(ln=>{
    const mg=parseMgFromStrength(ln.strengthStr);
    const qty=parseFloat(ln.qty||1);
    const slots=slotsForFreq(ln.freqMode);
    slots.forEach(sl=>{
      if(sl==="PATCH") return;
      if(!canSplit){ // whole tablets only
        add(sl, mg, Math.round(qty));
      }else{
        const quarters=Math.round(qty*4); // quarter resolution
        const qMg=+(mg/4).toFixed(3);
        add(sl, qMg, quarters);
      }
    });
  });
  return packs;
}

/* ========= per-class reduction logic ========= */
function labelStrength(med, mg, form){
  const mgTxt=(+mg.toFixed(3)).toString().replace(/\.000$/,'').replace(/(\.\d)0+$/,'$1');
  if (/^\s*SR\s*Tablet$/i.test(form) || /Slow\s*Release/i.test(form)) return `${med} ${mgTxt} mg SR tablet`;
  if (/Immediate\s*Release/i.test(form)) return `${med} ${mgTxt} mg IR tablet`;
  return `${med} ${mgTxt} mg ${form.toLowerCase()}`;
}

/* Opioids & PPIs (no splitting) – keep BID where possible then taper to night-only end */
function opioidOrPpiStep(packs, percent, med, form){
  const current=packsTotalMg(packs); if(current<=0.0001) return packs;
  const strengths=strengthsForSelected().map(parseMgFromStrength).filter(v=>v>0).sort((a,b)=>a-b);
  const step=strengths[0]||1; // constrain to whole tablets of smallest strength
  let target=roundToNearest(current*(1-percent/100), step);
  if(target===current && current>0){ target=Math.max(0,current-step); target=roundToNearest(target,step); }
  const bid=splitDailyPreferred(target, strengths);
  return { AM:bid.AM, MID:{}, DIN:{}, PM:bid.PM };
}

/* BZRA & Antipsychotics (quartering/halving allowed) */
function bzraAntipsychoticStep(packs, percent, med, form){
  const cls=$("classSelect").value;
  const current=packsTotalMg(packs); if(current<=0.0001) return packs;
  const pieceSet=allowedPiecesMg(cls,med,form); const step=lowestTitrationStepMg(cls,med,form) || 0.125;
  let target=roundToNearest(current*(1-percent/100), step);
  if(target===current && current>0){ target=Math.max(0,current-step); target=roundToNearest(target,step); }

  // First zero out DIN then MID (as per rules), then allocate AM/PM with PM >= AM
  packs.DIN={}; packs.MID={};

  const bid=splitDailyPreferred(target, pieceSet);
  return { AM:bid.AM, MID:{}, DIN:{}, PM:bid.PM };
}

/* ========= builders ========= */
function deepCopy(o){ return JSON.parse(JSON.stringify(o)); }

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
  if(packsTotalMg(packs)===0){ const mgList=strengthsForSelected().map(parseMgFromStrength).filter(v=>v>0).sort((a,b)=>a-b); if(mgList.length) packs.AM[mgList[mgList.length-1]]=1; }

  const rows=[]; let date=startOfWeek(startDate); let week=1;
  const stepOnce=()=>{ if(cls==="Opioid"||cls==="Proton Pump Inhibitor"){ packs=opioidOrPpiStep(packs,p1Percent,med,form); } else { packs=bzraAntipsychoticStep(packs,p1Percent,med,form); } };

  stepOnce(); rows.push({ week, date:fmtDate(date), packs:deepCopy(packs), med, form });
  while(packsTotalMg(packs)>0.0001){
    if(p1StopWeek && week>=p1StopWeek) break;
    date=addDays(date,p1Interval); week++;
    stepOnce(); rows.push({ week, date:fmtDate(date), packs:deepCopy(packs), med, form });
    if(reviewDate && date>=reviewDate) break;
    if((+date - +startDate) >= THREE_MONTHS_MS) break;
    if(rows.length>=MAX_WEEKS) break;
  }
  if(p2Percent && packsTotalMg(packs)>0.0001){
    const stepP2=()=>{ if(cls==="Opioid"||cls==="Proton Pump Inhibitor"){ packs=opioidOrPpiStep(packs,p2Percent,med,form); } else { packs=bzraAntipsychoticStep(packs,p2Percent,med,form); } };
    while(packsTotalMg(packs)>0.0001){
      date=addDays(date,p2Interval); week++;
      stepP2(); rows.push({ week, date:fmtDate(date), packs:deepCopy(packs), med, form });
      if(reviewDate && date>=reviewDate) break;
      if((+date - +startDate) >= THREE_MONTHS_MS) break;
      if(rows.length>=MAX_WEEKS) break;
    }
  }
  // End: add explicit stop line
  if(packsTotalMg(packs)<=0.0001){ date=addDays(date,p1Interval); rows.push({ week:week+1, date:fmtDate(date), packs:{AM:{},MID:{},DIN:{},PM:{}}, med, form, stop:true }); }
  return rows;
}

function buildPlanPatch(){
  const med=$("medicineSelect").value;
  const startDate=$("startDate")?($("startDate")._flatpickr?.selectedDates?.[0]||new Date()):new Date();
  const reviewDate=$("reviewDate")?($("reviewDate")._flatpickr?.selectedDates?.[0]||null):null;
  const p1Percent=clamp(parseFloat($("p1Percent")?.value||"0"),1,100);
  const p1Interval=Math.max(1, parseInt($("p1Interval")?.value||"7",10));
  const strengths=strengthsForSelected().map(parsePatchRate).filter(v=>v>0).sort((a,b)=>b-a);
  const everyDays=(med==="Fentanyl")?3:7;

  let total=0; doseLines.forEach(ln=>{ total += parsePatchRate(ln.strengthStr)||0; });
  if(total<=0) total=strengths[strengths.length-1];

  function nextDose(curr){
    const tgtUp=Math.ceil(curr*(1 - p1Percent/100));
    let remaining=tgtUp, used=[];
    for(const s of strengths){ while(remaining>=s){ used.push(s); remaining-=s; } }
    while(remaining>0){ const s=strengths[strengths.length-1]; used.push(s); remaining-=s; }
    return { value: used.reduce((a,b)=>a+b,0), used };
  }

  const rows=[]; let date=startOfWeek(startDate);
  let step=nextDose(total); rows.push({ week:1, date:fmtDate(date), patches:step.used, med, form:"Patch" });
  let curr=step.value; const smallest=strengths[strengths.length-1]; const endDate=addDays(startDate,90);

  let w=1;
  while(curr>smallest){
    date=addDays(date,p1Interval); w++;
    const nxt=nextDose(curr); curr=nxt.value;
    rows.push({ week:w, date:fmtDate(date), patches:nxt.used, med, form:"Patch" });
    if(reviewDate && date>=reviewDate) break;
    if(date>endDate) break;
    if(rows.length>=MAX_WEEKS) break;
  }
  date=addDays(date,p1Interval); w++; rows.push({ week:w, date:fmtDate(date), patches:[smallest], med, form:"Patch" });
  date=addDays(date,p1Interval); w++; rows.push({ week:w, date:fmtDate(date), patches:[], med, form:"Patch", stop:true });
  return rows;
}

/* ========= rendering (zebra per week group) ========= */
function td(text, cls){ const el=document.createElement("td"); if(cls) el.className=cls; el.textContent=String(text??""); return el; }

function quantToWords(n){
  if(n===0.25) return "a quarter of a tablet";
  if(n===0.5)  return "half a tablet";
  if(n===0.75) return "three quarters of a tablet";
  if(Math.abs(n-1)<1e-6) return "1 tablet";
  return `${n} tablets`;
}

function buildStrengthRowInstructions(mg, packs){
  const lines=[];
  const am=(packs.AM[mg]||0), mid=(packs.MID[mg]||0), din=(packs.DIN[mg]||0), pm=(packs.PM[mg]||0);
  if(am)  lines.push(`Take ${quantToWords(am)} in the morning`);
  if(mid) lines.push(`Take ${quantToWords(mid)} at midday`);
  if(din) lines.push(`Take ${quantToWords(din)} at dinner`);
  if(pm)  lines.push(`Take ${quantToWords(pm)} at night`);
  return { text: lines.join("\n"), am, mid, din, pm };
}

function renderStandardTable(rows){
  const scheduleBlock=$("scheduleBlock"), patchBlock=$("patchBlock"); if(!scheduleBlock) return;
  scheduleBlock.style.display=""; patchBlock.style.display="none"; scheduleBlock.innerHTML="";

  const table=document.createElement("table"); table.className="table";
  const thead=document.createElement("thead"); const hr=document.createElement("tr");
  ["Week beginning","Strength","Instructions","Morning","Midday","Dinner","Night"].forEach(h=>{ const th=document.createElement("th"); th.textContent=h; hr.appendChild(th); });
  thead.appendChild(hr); table.appendChild(thead);

  const tbody=document.createElement("tbody");

  rows.forEach((r, idxWeek)=>{
    const packs=r.packs, med=r.med, form=r.form;
    const allMg=new Set(); [packs.AM,packs.MID,packs.DIN,packs.PM].forEach(pack=>{ Object.keys(pack).forEach(mg=>allMg.add(+mg)); });
    const mgList=Array.from(allMg).sort((a,b)=>a-b);
    const lines=mgList.length?mgList:[null];

    lines.forEach((mg, idx)=>{
      const tr=document.createElement("tr");
      if(idx===0){ const d=td(r.date); if(lines.length>1) d.rowSpan=lines.length; tr.appendChild(d); }
      if(r.stop || mg===null){
        tr.appendChild(td(""));
        tr.appendChild(td("Stop.", "instructions-pre"));
        tr.appendChild(td("", "center")); tr.appendChild(td("", "center")); tr.appendChild(td("", "center")); tr.appendChild(td("", "center"));
        if(idxWeek%2===1) tr.classList.add("week-even");
        tbody.appendChild(tr); return;
      }
      const { text, am, mid, din, pm }=buildStrengthRowInstructions(mg, packs);
      tr.appendChild(td(labelStrength(med, mg, form)));
      tr.appendChild(td(text,"instructions-pre"));
      tr.appendChild(td(am||"", "center"));
      tr.appendChild(td(mid||"", "center"));
      tr.appendChild(td(din||"", "center"));
      tr.appendChild(td(pm||"", "center"));
      if(idxWeek%2===1) tr.classList.add("week-even");
      tbody.appendChild(tr);
    });
  });

  table.appendChild(tbody);
  scheduleBlock.appendChild(table);
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
    tr.appendChild(td(r.stop ? "Stop." : `Apply patches every ${everyDays} days.`));
    if(idxWeek%2===1) tr.classList.add("week-even");
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  patchBlock.appendChild(table);
}

/* ========= footer text ========= */
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
  try{
    const cls=$("classSelect")?.value, med=$("medicineSelect")?.value, form=$("formSelect")?.value;
    if(!cls || !med || !form){ banner("Please select medicine class, medicine, and form."); return; }
    $("hdrMedicine").textContent=`Medicine: ${med} ${form}`; $("hdrSpecial").textContent=`Special instructions: ${specialInstructionFor(med, form)}`;
    const isPatch=(form==="Patch");
    const rows=isPatch?buildPlanPatch():buildPlanTablets();
    if(isPatch) renderPatchTable(rows); else renderStandardTable(rows);
    setFooterText(cls);
  }catch(err){ console.error(err); banner("Error: " + (err?.message||String(err))); }
}

function init(){
  document.querySelectorAll(".datepick").forEach(el=>{ if(window.flatpickr){ flatpickr(el,{dateFormat:"Y-m-d",allowInput:true}); } else { el.type="date"; } });
  populateClasses(); populateMedicines(); populateForms();
  doseLines=[]; addDoseLine();
  $("classSelect")?.addEventListener("change", ()=>{ populateMedicines(); populateForms(); updateRecommended(); doseLines=[]; addDoseLine(); });
  $("medicineSelect")?.addEventListener("change", ()=>{ populateForms(); updateRecommended(); doseLines=[]; addDoseLine(); });
  $("formSelect")?.addEventListener("change", ()=>{ updateRecommended(); doseLines=[]; addDoseLine(); });
  $("addDoseLineBtn")?.addEventListener("click", addDoseLine);
  $("generateBtn")?.addEventListener("click", buildPlan);
  $("resetBtn")?.addEventListener("click", ()=>location.reload());
  $("printBtn")?.addEventListener("click", ()=>window.print());
  $("savePdfBtn")?.addEventListener("click", ()=>{
    const el=$("outputCard");
    if(typeof html2pdf==="function"){
      html2pdf().set({ filename:'taper_plan.pdf', margin:10, image:{ type:'jpeg', quality:0.95 }, html2canvas:{ scale:2, useCORS:true }, jsPDF:{ unit:'mm', format:'a4', orientation:'portrait' } }).from(el).save();
    } else { alert("PDF library not loaded."); }
  });
  updateRecommended();
}
document.addEventListener("DOMContentLoaded", ()=>{ try{ init(); } catch(e){ console.error(e); banner("Init error: " + (e?.message||String(e))); }});
