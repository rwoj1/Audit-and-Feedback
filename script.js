"use strict";

/* =========================
   Helpers & UI plumbing
========================= */
const $ = id => document.getElementById(id);
const fmtDate = d => new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
const addDays = (d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
function startOfWeek(d){ const dt=new Date(d); const day=dt.getDay(); const diff=(day===0?6:day-1); dt.setDate(dt.getDate()-diff); dt.setHours(0,0,0,0); return dt; }
function banner(msg){ const b=document.createElement("div"); b.style.cssText="position:fixed;left:0;right:0;bottom:0;background:#7f1d1d;color:#fff;padding:8px 12px;font:14px system-ui;z-index:999999"; b.textContent=msg; document.body.appendChild(b); }
const SLOT_KEYS = ["AM","MID","DIN","PM"];
const MAX_WEEKS = 60;
const THREE_MONTHS_MS = 90 * 24 * 3600 * 1000;

/* =========================
   Catalog (solids only)
========================= */
const CATALOG = {
  "Opioid": {
    // SR tablets (no splitting)
    "Morphine": { "SR Tablet":["10 mg","15 mg","30 mg","60 mg","100 mg","200 mg"] },
    "Oxycodone": { "SR Tablet":["10 mg","20 mg","40 mg","80 mg"] },
    "Oxycodone / Naloxone": { "SR Tablet":["5/2.5 mg","10/5 mg","15/7.5 mg","20/10 mg","30/15 mg","40/20 mg","60/30 mg","80/40 mg"] },
    "Tapentadol": { "SR Tablet":["50 mg","100 mg","150 mg","200 mg","250 mg"] },
    "Tramadol": { "SR Tablet":["50 mg","100 mg","150 mg","200 mg"] },
    "Buprenorphine": { "Patch":["5 mcg/hr","10 mcg/hr","15 mcg/hr","20 mcg/hr","25 mcg/hr","30 mcg/hr","40 mcg/hr"] },
    "Fentanyl": { "Patch":["12 mcg/hr","25 mcg/hr","50 mcg/hr","75 mcg/hr","100 mcg/hr"] }
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
    "Zolpidem": { "Tablet":["10 mg"], "Slow Release Tablet":["6.25 mg","12.5 mg"] }, // SR cannot split
    "Zopiclone": { "Tablet":["7.5 mg"] }
  },
  "Antipsychotic": {
    "Haloperidol": { "Tablet":["0.5 mg","1 mg","2 mg","5 mg","10 mg","20 mg"] },
    "Olanzapine": { "Tablet":["2.5 mg","5 mg","7.5 mg","10 mg","15 mg","20 mg"], "Wafer":["5 mg","10 mg","15 mg","20 mg"] },
    "Quetiapine": { "Immediate Release Tablet":["25 mg","100 mg","200 mg","300 mg"], "Slow Release Tablet":["50 mg","150 mg","200 mg","300 mg","400 mg"] },
    "Risperidone": { "Tablet":["0.5 mg","1 mg","2 mg","3 mg","4 mg"] }
  },
  "Proton Pump Inhibitor": {
    "Esomeprazole": { "Tablet":["10 mg","20 mg"] },
    "Lansoprazole": { "Tablet":["15 mg","30 mg"], "Wafer":["15 mg","30 mg"] },
    "Omeprazole": { "Capsule":["10 mg","20 mg"], "Tablet":["10 mg","20 mg"] },
    "Pantoprazole": { "Tablet":["20 mg","40 mg"] },
    "Rabeprazole": { "Tablet":["10 mg","20 mg"] }
  }
};

const CLASS_ORDER = ["Opioid","Benzodiazepines / Z-Drug (BZRA)","Antipsychotic","Proton Pump Inhibitor"];

/* =========================
   Splitting rules
========================= */
function currentClass(){ return $("classSelect")?.value || ""; }
function isMR(form){ return /slow\s*release|modified|controlled|extended|sustained/i.test(form) || /\b(SR|MR|CR|ER|XR|PR|CD)\b/i.test(form); }
function canHalf(med, form){
  const cls = currentClass();
  if(cls==="Opioid") return false;
  if(cls==="Proton Pump Inhibitor") return false;
  if(med==="Zolpidem" && /Slow Release/i.test(form)) return false;
  if(isMR(form)) return false;
  if(/Capsule|Wafer|Patch/i.test(form)) return false;
  return true;
}
function canQuarter(med, form){
  const cls = currentClass();
  if(cls==="Opioid") return false;
  if(cls==="Proton Pump Inhibitor") return false;
  if(med==="Zolpidem" && /Slow Release/i.test(form)) return false;
  if(isMR(form)) return false;
  // Per your latest: BZRA & Antipsychotics can be quartered (IR only)
  return true;
}

/* =========================
   Parsing and dropdowns
========================= */
function parseMgFromStrength(str){
  if(!str) return 0;
  const slash = String(str).split("/")[0];
  const m = slash.match(/([\d.]+)\s*mg/i);
  return m ? parseFloat(m[1]) : 0;
}
function parsePatchRate(str){
  const m = String(str).match(/([\d.]+)\s*mcg\/hr/i);
  return m ? parseFloat(m[1]) : 0;
}

function populateClasses(){
  const cSel = $("classSelect"); if(!cSel) return;
  cSel.innerHTML = "";
  CLASS_ORDER.forEach(cls=>{ const o=document.createElement("option"); o.value=cls; o.textContent=cls; cSel.appendChild(o); });
}
function populateMedicines(){
  const mSel = $("medicineSelect"); const clsEl = $("classSelect");
  if(!mSel || !clsEl) return;
  const cls = clsEl.value;
  mSel.innerHTML = "";
  const meds = Object.keys(CATALOG[cls]||{});
  const ordered = (cls==="Opioid")
    ? ["Morphine","Oxycodone","Oxycodone / Naloxone","Tapentadol","Tramadol","Buprenorphine","Fentanyl"]
    : meds.slice().sort();
  ordered.forEach(m=>{ if(meds.includes(m)){ const o=document.createElement("option"); o.value=m; o.textContent=m; mSel.appendChild(o); }});
}
function populateForms(){
  const fSel = $("formSelect"); const clsEl=$("classSelect"); const medEl=$("medicineSelect");
  if(!fSel || !clsEl || !medEl) return;
  const cls = clsEl.value, med = medEl.value;
  fSel.innerHTML = "";
  const forms = Object.keys((CATALOG[cls]||{})[med]||[]);
  forms.sort((a,b)=>{
    const at = /tablet/i.test(a) ? 0 : 1;
    const bt = /tablet/i.test(b) ? 0 : 1;
    if(at!==bt) return at-bt;
    return a.localeCompare(b);
  });
  forms.forEach(f=>{ const o=document.createElement("option"); o.value=f; o.textContent=f; fSel.appendChild(o); });
}
function strengthsForSelected(){
  const cls=$("classSelect")?.value, med=$("medicineSelect")?.value, form=$("formSelect")?.value;
  return (CATALOG[cls]?.[med]?.[form]||[]).slice();
}

/* =========================
   Dose lines (input model)
========================= */
let doseLines = []; // {id,strengthStr,freqMode}
let nextLineId = 1;
function slotsForFreq(mode){
  switch(mode){
    case "AM":  return ["AM"];
    case "MID": return ["MID"];
    case "DIN": return ["DIN"];
    case "PM":  return ["PM"];
    case "BID": return ["AM","PM"];
    case "TID": return ["AM","MID","PM"];
    case "QID": return ["AM","MID","DIN","PM"];
    default:    return ["AM"];
  }
}
function renderDoseLines(){
  const box = $("doseLinesContainer"); if(!box) return;
  box.innerHTML = "";
  if(doseLines.length===0){
    const p=document.createElement("p"); p.textContent="(No dose lines)"; p.style.color="#9ca3af"; box.appendChild(p); return;
  }
  doseLines.forEach((ln,idx)=>{
    const row=document.createElement("div");
    row.style.cssText="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:6px 0";
    row.innerHTML =
      `<span class="badge">Line ${idx+1}</span>
       <span>Strength:</span>
       <select data-id="${ln.id}" class="dl-strength"></select>
       <span>Frequency:</span>
       <select data-id="${ln.id}" class="dl-freq">
         <option value="AM">Daily in the morning</option>
         <option value="MID">Daily at midday</option>
         <option value="DIN">Daily at dinner</option>
         <option value="PM">Daily at night</option>
         <option value="BID">Twice daily (morning & night)</option>
         <option value="TID">Three times daily</option>
         <option value="QID">Four times daily</option>
       </select>
       <button type="button" data-id="${ln.id}" class="secondary dl-remove">Remove</button>`;
    box.appendChild(row);

    const sSel=row.querySelector(".dl-strength");
    const sList = strengthsForSelected().sort((a,b)=>parseMgFromStrength(a)-parseMgFromStrength(b));
    sSel.innerHTML="";
    sList.forEach(s=>{ const o=document.createElement("option"); o.value=s; o.textContent=s; sSel.appendChild(o); });
    sSel.value = ln.strengthStr || sList[sList.length-1];

    const fSel=row.querySelector(".dl-freq"); fSel.value = ln.freqMode || "AM";

    sSel.addEventListener("change", e=>{
      const id=parseInt(e.target.getAttribute("data-id"),10);
      const l = doseLines.find(x=>x.id===id); if(l){ l.strengthStr = e.target.value; }
    });
    fSel.addEventListener("change", e=>{
      const id=parseInt(e.target.getAttribute("data-id"),10);
      const l = doseLines.find(x=>x.id===id); if(l){ l.freqMode = e.target.value; }
    });
    row.querySelector(".dl-remove").addEventListener("click", e=>{
      const id=parseInt(e.target.getAttribute("data-id"),10);
      doseLines = doseLines.filter(x=>x.id!==id);
      renderDoseLines();
    });
  });
}
function addDoseLine(){
  const sList = strengthsForSelected().sort((a,b)=>parseMgFromStrength(a)-parseMgFromStrength(b));
  if(!sList.length){ banner("Select medicine & form first."); return; }
  const defaultStrength = sList[sList.length-1];
  doseLines.push({ id: nextLineId++, strengthStr: defaultStrength, freqMode: "AM" });
  renderDoseLines();
}

/* =========================
   Recommended box & headers
========================= */
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
  if(/Slow Release/i.test(form) || isMR(form)) return "Swallow whole, do not halve or crush";
  return "Swallow whole, do not halve or crush";
}
function updateRecommended(){
  const cls = $("classSelect")?.value;
  const lines = RECOMMEND[cls] || [];
  $("bestPracticeBox").innerHTML = `<strong>Recommended Practice for ${cls||""}</strong><ul style="margin:6px 0 0 18px">${lines.map(t=>`<li>${t}</li>`).join("")}</ul>`;
  const med = $("medicineSelect")?.value, form = $("formSelect")?.value;
  $("hdrMedicine").textContent = `Medicine: ${med} ${form}`;
  $("hdrSpecial").textContent  = `Special instructions: ${specialInstructionFor(med, form)}`;
  // Hide Patient/Allergies/HCP badges if present
  ["hdrPatient","hdrAllergies","hdrHcp"].forEach(id=>{ const el=$(id); if(el){ el.style.display="none"; }});
}

/* =========================
   Piece model utilities
========================= */
function allowedPiecesMg(med, form){
  const strengths = strengthsForSelected().map(parseMgFromStrength).filter(v=>v>0);
  const uniq = Array.from(new Set(strengths)).sort((a,b)=>a-b);
  let pieces = uniq.slice(); // whole tablets always
  if(canHalf(med, form)) uniq.forEach(v => pieces.push(v/2));
  if(canQuarter(med, form)) uniq.forEach(v => pieces.push(v/4));
  pieces = Array.from(new Set(pieces.map(v=>+v.toFixed(2)))).sort((a,b)=>a-b);
  return pieces;
}
function buildPacksFromDoseLines(){
  // packs = { AM:{mg:count}, MID:{}, DIN:{}, PM:{} }
  const med=$("medicineSelect").value, form=$("formSelect").value;
  const pieces = allowedPiecesMg(med, form);
  const packs = { AM:{}, MID:{}, DIN:{}, PM:{} };
  const add = (slot, mg, n=1)=>{ packs[slot][mg]=(packs[slot][mg]||0)+n; };

  // Each dose line contributes one “piece bundle” per scheduled slot equal to its mg
  doseLines.forEach(ln=>{
    const mg = parseMgFromStrength(ln.strengthStr);
    const slots = slotsForFreq(ln.freqMode);
    slots.forEach(sl=>{
      let remaining = +mg.toFixed(2);
      // Exact whole if available, else greedy down (never exceed mg)
      const desc = pieces.slice().sort((a,b)=>b-a);
      for(const p of desc){
        if(remaining<=0) break;
        const n = Math.floor( (remaining + 1e-9) / p );
        if(n>0){ add(sl, p, n); remaining = +(remaining - n*p).toFixed(2); }
      }
    });
  });
  return packs;
}
function packTotalMg(pack){ return Object.entries(pack).reduce((s,[mg,c])=>s + parseFloat(mg)*c, 0); }
function packsTotalMg(packs){ return packTotalMg(packs.AM)+packTotalMg(packs.MID)+packTotalMg(packs.DIN)+packTotalMg(packs.PM); }
function clonePacks(p){ return { AM:{...p.AM}, MID:{...p.MID}, DIN:{...p.DIN}, PM:{...p.PM} }; }
function removeFromPackByMg(pack, amount){
  // remove up to 'amount' mg by deleting largest pieces first (never halves where not allowed because packs only contain allowed)
  let toDrop = +amount.toFixed(4);
  const sizes = Object.keys(pack).map(parseFloat).sort((a,b)=>b-a);
  for(const p of sizes){
    while(toDrop>0 && pack[p]>0){
      pack[p]-=1; if(pack[p]===0) delete pack[p];
      toDrop = +(toDrop - p).toFixed(4);
    }
    if(toDrop<=0) break;
  }
  return Math.max(0,toDrop);
}
function countPieces(pack){ return Object.values(pack).reduce((a,b)=>a+b,0); }
function smallestPiece(med, form){ return allowedPiecesMg(med, form)[0]; }

/* =========================
   Class-specific reduction
========================= */
// Distribute total target into AM/PM nearly equal with night >= morning (for opioids when only AM/PM)
function distributeToAMPM(totalTargetMg, med, form){
  const pieces = allowedPiecesMg(med, form).slice().sort((a,b)=>b-a);
  // greedy to two slots: try to split equally; keep PM >= AM
  let am = {}, pm = {};
  let remaining = totalTargetMg;
  for(const p of pieces){
    while(remaining >= p - 1e-9){
      // assign alternatingly to keep PM >= AM
      const amMg = packTotalMg(am), pmMg = packTotalMg(pm);
      if(pmMg <= amMg){ pm[p]=(pm[p]||0)+1; }
      else { am[p]=(am[p]||0)+1; }
      remaining = +(remaining - p).toFixed(2);
    }
  }
  return {AM:am, PM:pm};
}

// Reduce packs by percent but prioritize slot order
function reduceByPercentWithOrder(packs, percent, primaryOrder){
  const total = packsTotalMg(packs);
  let drop = +(total * (percent/100)).toFixed(4);
  for(const key of primaryOrder){
    if(drop<=0) break;
    drop = removeFromPackByMg(packs[key], drop);
  }
  // If still something left (rare), cycle all slots largest-first
  if(drop>0){
    const allOrder = ["AM","MID","DIN","PM"];
    for(const k of allOrder){
      if(drop<=0) break;
      drop = removeFromPackByMg(packs[k], drop);
    }
  }
}

// Build “Take … in the …” line
function buildInstructionLine(pack, tail){
  if(countPieces(pack)===0) return null;
  // Phrase: “Take 1 tablet” / “Take 2 tablets” / include halves/quarters if present
  const entries = Object.entries(pack).map(([mg,c])=>({mg:parseFloat(mg), c})).sort((a,b)=>b.mg-a.mg);
  // We’ll classify each piece as whole/half/quarter based on presence in allowed whole sizes
  const wholeSizes = strengthsForSelected().map(parseMgFromStrength);
  const parts = [];
  entries.forEach(({mg,c})=>{
    const isHalf    = wholeSizes.some(w=>Math.abs(w/2 - mg) < 0.01);
    const isQuarter = wholeSizes.some(w=>Math.abs(w/4 - mg) < 0.01);
    let name = "tablet";
    if(isQuarter) name = "quarter tablet";
    else if(isHalf) name = "half tablet";
    if(c===1) parts.push(`1 ${name}`);
    else parts.push(`${c} ${name}s`);
  });
  return `Take ${parts.join(" + ")} ${tail}`;
}
function strengthLabelsFromPacks(packs, med, form){
  const labels = new Set();
  [packs.AM, packs.MID, packs.DIN, packs.PM].forEach(pack=>{
    Object.keys(pack).forEach(mgStr=>{
      labels.add(`${med} ${(+parseFloat(mgStr).toFixed(2)).toString().replace(/\.00$/,'')} mg ${form.toLowerCase()}`);
    });
  });
  return Array.from(labels);
}

/* =========================
   Build plan per class
========================= */
function buildPlanTablets(){
  const cls=$("classSelect").value, med=$("medicineSelect").value, form=$("formSelect").value;
  const p1Percent  = Math.max(1, parseFloat($("p1Percent")?.value || "0"));
  const p1Interval = Math.max(1, parseInt($("p1Interval")?.value || "0",10));
  const p1StopWeek = parseInt($("p1StopWeek")?.value || "0",10) || 0;
  const p2Percent  = Math.max(0, parseFloat($("p2Percent")?.value || "0"));
  const p2Interval = p2Percent ? Math.max(1, parseInt($("p2Interval")?.value || "0",10)) : 0;

  const startDate = $("startDate")? ($("startDate")._flatpickr?.selectedDates?.[0] || new Date()) : new Date();
  const reviewDate = $("reviewDate")? ($("reviewDate")._flatpickr?.selectedDates?.[0] || null) : null;

  let packs = buildPacksFromDoseLines();
  // if no input, seed 1 largest AM tablet
  if(packsTotalMg(packs)===0){
    const max = allowedPiecesMg(med, form).slice(-1)[0];
    packs.AM[max]=1;
  }

  const rows = [];
  let date = startOfWeek(startDate);
  let week = 1;

  function pushRow(note=null){
    const instr = [];
    const am = buildInstructionLine(packs.AM,"in the morning"); if(am) instr.push(am);
    const md = buildInstructionLine(packs.MID,"at midday");     if(md) instr.push(md);
    const dn = buildInstructionLine(packs.DIN,"at dinner");     if(dn) instr.push(dn);
    const pm = buildInstructionLine(packs.PM,"at night");       if(pm) instr.push(pm);
    if(note) instr.push(note);

    rows.push({
      date: fmtDate(date),
      strengths: strengthLabelsFromPacks(packs, med, form),
      instructions: instr.join("\n"),
      am: countPieces(packs.AM), mid: countPieces(packs.MID), din: countPieces(packs.DIN), pm: countPieces(packs.PM)
    });
  }

  // ========== Phase logic ==========
  // Apply “start at second step”: do first reduction before first row
  const doOneStep = (percent)=>{
    const total = packsTotalMg(packs);
    if(total <= 0.01) return;

    if(cls==="Opioid"){
      const hasMidOrDin = packTotalMg(packs.MID)>0 || packTotalMg(packs.DIN)>0;
      if(hasMidOrDin){
        // Reduce DIN then MID first by percent of total
        reduceByPercentWithOrder(packs, percent, ["DIN","MID","AM","PM"]);
      } else {
        // No MID/DIN: reduce total by percent, then split remainder into AM/PM with night a little more
        const target = +(total * (1 - percent/100)).toFixed(2);
        // Build a fresh AM/PM split from scratch using allowed pieces (no splitting for opioids enforced by allowedPieces)
        const dist = distributeToAMPM(target, med, form);
        packs = { AM:dist.AM, MID:{}, DIN:{}, PM:dist.PM };
      }
    } else if(cls==="Benzodiazepines / Z-Drug (BZRA)"){
      // Order: midday or dinner first, then morning, then night
      reduceByPercentWithOrder(packs, percent, ["MID","DIN","AM","PM"]);
    } else if(cls==="Antipsychotic"){
      // Same order as BZRA
      reduceByPercentWithOrder(packs, percent, ["MID","DIN","AM","PM"]);
    } else if(cls==="Proton Pump Inhibitor"){
      // Order: midday, then morning, then night
      reduceByPercentWithOrder(packs, percent, ["MID","AM","PM"]);
    }
  };

  // First step before first row
  doOneStep(p1Percent);
  pushRow();

  // Continue Phase 1
  while(packsTotalMg(packs) > 0.01){
    if(p1StopWeek && week >= p1StopWeek) break;
    date = addDays(date, p1Interval); week += 1;
    doOneStep(p1Percent);
    pushRow();
    if(reviewDate && date >= reviewDate) break;
    if((+date - +startDate) >= THREE_MONTHS_MS) break;
    if(rows.length >= MAX_WEEKS) break;
  }

  // Phase 2 (if set)
  if(p2Percent && packsTotalMg(packs) > 0.01){
    while(packsTotalMg(packs) > 0.01){
      date = addDays(date, p2Interval); week += 1;
      doOneStep(p2Percent);
      pushRow();
      if(reviewDate && date >= reviewDate) break;
      if((+date - +startDate) >= THREE_MONTHS_MS) break;
      if(rows.length >= MAX_WEEKS) break;
    }
  }

  // Final hold: lowest available at specific time then stop
  const holdPiece = smallestPiece(med, form);
  if(holdPiece){
    date = addDays(date, p1Interval);
    // Clear all
    packs = { AM:{}, MID:{}, DIN:{}, PM:{} };
    if(cls==="Proton Pump Inhibitor"){
      // lowest dose at dinner time
      packs.DIN[holdPiece]=1;
    } else {
      // lowest dose at night time
      packs.PM[holdPiece]=1;
    }
    pushRow();
  }
  // Stop row
  date = addDays(date, p1Interval);
  rows.push({ date: fmtDate(date), strengths: [], instructions: "Stop.", am:0, mid:0, din:0, pm:0 });

  return rows;
}

/* =========================
   Patches (Fentanyl/Buprenorphine)
========================= */
function buildPlanPatch(){
  const med=$("medicineSelect").value, form=$("formSelect").value; // Patch
  const startDate = $("startDate")? ($("startDate")._flatpickr?.selectedDates?.[0] || new Date()) : new Date();
  const reviewDate = $("reviewDate")? ($("reviewDate")._flatpickr?.selectedDates?.[0] || null) : null;
  const p1Percent  = Math.max(1, parseFloat($("p1Percent")?.value || "0"));
  const p1Interval = Math.max(1, parseInt($("p1Interval")?.value || "0",10));

  const everyDays = (med==="Fentanyl") ? 3 : 7; // preset
  const strengths = strengthsForSelected().map(parsePatchRate).filter(v=>v>0).sort((a,b)=>b-a);
  if(!strengths.length){ banner("No patch strengths available."); return []; }

  // total baseline from dose lines
  let total = 0;
  doseLines.forEach(ln=>{
    const r = parsePatchRate(ln.strengthStr);
    total += r;
  });
  if(total<=0) total = strengths[strengths.length-1]; // default smallest if nothing given

  // one step function: reduce by % (rounded UP) and compose using multiple patches
  function nextDose(curr){
    const target = Math.max(0, curr * (1 - p1Percent/100));
    const targetUp = Math.ceil(target); // round up mcg/hr to integer
    // compose ≥ targetUp with minimal sum (greedy add from largest)
    let remaining = targetUp;
    const used = [];
    for(const s of strengths){
      while(remaining > 0){
        if(s <= remaining){ used.push(s); remaining -= s; }
        else break;
      }
    }
    // If still remaining, add one smallest patch until covered
    while(remaining > 0){ used.push(strengths[strengths.length-1]); remaining -= strengths[strengths.length-1]; }
    const sum = used.reduce((a,b)=>a+b,0);
    return { value: sum, used };
  }

  const rows = [];
  let date = startOfWeek(startDate);

  // First step before first row
  let step1 = nextDose(total);
  function pushPatchRow(val, usedList){
    rows.push({
      date: fmtDate(date),
      patches: usedList.length ? usedList.slice() : (val? [val] : []),
      instructions: `Apply patches every ${everyDays} days.`
    });
  }
  pushPatchRow(step1.value, step1.used);

  // Continue until minimal then hold smallest one interval, then stop
  const smallest = strengths[strengths.length-1];
  let curr = step1.value;
  const endDate = addDays(startDate, 90);
  while(curr > smallest){
    date = addDays(date, p1Interval);
    const nxt = nextDose(curr);
    curr = nxt.value;
    pushPatchRow(curr, nxt.used);
    if(reviewDate && date >= reviewDate) break;
    if(date > endDate) break;
    if(rows.length >= MAX_WEEKS) break;
  }
  // Hold smallest for one interval
  date = addDays(date, p1Interval);
  pushPatchRow(smallest, [smallest]);
  // Stop
  date = addDays(date, p1Interval);
  rows.push({ date: fmtDate(date), patches: [], instructions: "Stop." });

  return rows;
}

/* =========================
   Rendering (chart)
========================= */
function td(text, cls){ const el=document.createElement("td"); if(cls) el.className=cls; el.textContent=String(text||""); return el; }

function renderStandardTable(rows, med, form){
  const patchBlock = $("patchBlock"), scheduleBlock = $("scheduleBlock");
  if(patchBlock) patchBlock.style.display="none";
  if(!scheduleBlock) return;
  scheduleBlock.style.display="";
  scheduleBlock.innerHTML="";

  const table = document.createElement("table"); table.className="table";
  const thead=document.createElement("thead"); const hr=document.createElement("tr");
  // Image column removed
  ["Week beginning","Strength","Instructions","Morning","Midday","Dinner","Night"].forEach(h=>{ const th=document.createElement("th"); th.textContent=h; hr.appendChild(th); });
  thead.appendChild(hr); table.appendChild(thead);

  const tbody=document.createElement("tbody");
  rows.forEach(r=>{
    const strengths = r.strengths && r.strengths.length ? r.strengths : [""];
    strengths.forEach((s,idx)=>{
      const tr=document.createElement("tr");
      if(idx===0){
        const dateTd = td(r.date);
        if(strengths.length>1) dateTd.rowSpan = strengths.length;
        tr.appendChild(dateTd);
      }
      tr.appendChild(td(s));
      const instr=td(r.instructions); instr.className="instructions-pre"; tr.appendChild(instr);
      tr.appendChild(td(r.am,"center"));
      tr.appendChild(td(r.mid,"center"));
      tr.appendChild(td(r.din,"center"));
      tr.appendChild(td(r.pm,"center"));
      tbody.appendChild(tr);
    });
  });

  table.appendChild(tbody);
  scheduleBlock.appendChild(table);
}

function renderPatchTable(rows){
  const scheduleBlock = $("scheduleBlock"), patchBlock = $("patchBlock");
  if(scheduleBlock) scheduleBlock.style.display="none";
  if(!patchBlock) return;
  patchBlock.style.display=""; patchBlock.innerHTML="";

  const table=document.createElement("table"); table.className="table";
  const thead=document.createElement("thead"); const hr=document.createElement("tr");
  // Remove times; show dates only; remove "Rotate sites"
  ["Apply on","Remove on","Patch strength(s)","Instructions"].forEach(h=>{ const th=document.createElement("th"); th.textContent=h; hr.appendChild(th); });
  thead.appendChild(hr); table.appendChild(thead);

  const tbody=document.createElement("tbody");
  const everyDays = ($("medicineSelect").value==="Fentanyl") ? 3 : 7;
  for(let i=0;i<rows.length;i++){
    const r = rows[i];
    const tr=document.createElement("tr");
    tr.appendChild(td(r.date));
    // compute remove date = apply date + everyDays
    const rmv = fmtDate(addDays(new Date(r.date), everyDays));
    tr.appendChild(td(rmv));
    const patchTxt = (r.patches && r.patches.length) ? r.patches.map(v=>`${v} mcg/hr`).join(" + ") : "";
    tr.appendChild(td(patchTxt));
    tr.appendChild(td(r.instructions));
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  patchBlock.appendChild(table);
}

/* =========================
   Footer
========================= */
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
  $("expBenefits").textContent = exp;
  $("withdrawalInfo").textContent = wdr;
}

/* =========================
   Core build
========================= */
function buildPlan(){
  try{
    const classSelect = $("classSelect"), medicineSelect = $("medicineSelect"), formSelect = $("formSelect");
    if(!classSelect || !medicineSelect || !formSelect){ banner("Missing inputs. Reload the page."); return; }
    const cls = classSelect.value, med = medicineSelect.value, form = formSelect.value;

    // Top badges (hide Patient/Allergies/HCP per request)
    $("hdrMedicine").textContent = `Medicine: ${med} ${form}`;
    $("hdrSpecial").textContent  = `Special instructions: ${specialInstructionFor(med, form)}`;
    ["hdrPatient","hdrAllergies","hdrHcp"].forEach(id=>{ const el=$(id); if(el){ el.style.display="none"; }});

    const isPatch = (form==="Patch");
    const rows = isPatch ? buildPlanPatch() : buildPlanTablets();

    if(isPatch) renderPatchTable(rows);
    else renderStandardTable(rows, med, form);

    setFooterText(cls);
  } catch(err){
    console.error(err); banner("Error: " + (err?.message || String(err))); }
}

/* =========================
   Init & listeners
========================= */
function init(){
  document.querySelectorAll(".datepick").forEach(el=>{
    if(window.flatpickr){ flatpickr(el,{dateFormat:"Y-m-d",allowInput:true}); }
    else { el.type="date"; }
  });

  populateClasses();
  populateMedicines();
  populateForms();

  // Pre-populate one dose line
  doseLines = [];
  addDoseLine();

  $("classSelect")?.addEventListener("change", ()=>{
    populateMedicines(); populateForms();
    updateRecommended();
    doseLines=[]; addDoseLine();
  });
  $("medicineSelect")?.addEventListener("change", ()=>{
    populateForms(); updateRecommended();
    doseLines=[]; addDoseLine();
  });
  $("formSelect")?.addEventListener("change", ()=>{
    updateRecommended();
    doseLines=[]; addDoseLine();
  });

  $("addDoseLineBtn")?.addEventListener("click", addDoseLine);
  $("generateBtn")?.addEventListener("click", buildPlan);
  $("resetBtn")?.addEventListener("click", ()=>location.reload());
  $("printBtn")?.addEventListener("click", ()=>window.print());
  $("savePdfBtn")?.addEventListener("click", ()=>{
    const el = $("outputCard");
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
document.addEventListener("DOMContentLoaded", ()=>{ try{ init(); } catch(e){ console.error(e); banner("Init error: " + (e?.message || String(e))); }});
