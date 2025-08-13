/* ======= Catalog (injectables removed; tablets/capsules/liquids/patches only) ======= */
const CATALOG = {
  "Opioid": {
    "Morphine": { "Tablet": ["5 mg","10 mg","15 mg","30 mg","60 mg","100 mg","200 mg"], "Capsule": ["10 mg","20 mg","50 mg","100 mg"], "Oral Liquid": ["1 mg/mL"] },
    "Oxycodone": { "Tablet": ["5 mg","10 mg","15 mg","20 mg","30 mg","40 mg","80 mg"] },
    "Oxycodone / Naloxone": { "Tablet": ["2.5/1.25 mg","5/2.5 mg","10/5 mg","15/7.5 mg","20/10 mg","30/15 mg","40/20 mg","60/30 mg","80/40 mg"] },
    "Tapentadol": { "Tablet": ["50 mg","100 mg","150 mg","200 mg","250 mg"] },
    "Tramadol": { "Tablet": ["50 mg","100 mg","150 mg","200 mg"] },
    "Fentanyl": { "Patch": ["12 mcg/hr","25 mcg/hr","50 mcg/hr","75 mcg/hr","100 mcg/hr"] },
    "Buprenorphine": { "Patch": ["5 mcg/hr","10 mcg/hr","15 mcg/hr","20 mcg/hr","25 mcg/hr","30 mcg/hr","40 mcg/hr"] }
  },
  "Benzodiazepines / Z-drugs": {
    // Benzodiazepines
    "Diazepam": { "Tablet": ["2 mg","5 mg"], "Oral Liquid": ["1 mg/mL"] },
    "Oxazepam": { "Tablet": ["15 mg","30 mg"] },
    "Nitrazepam": { "Tablet": ["5 mg"] },
    "Temazepam": { "Tablet": ["10 mg"] },
    "Alprazolam": { "Tablet": ["0.25 mg","0.5 mg","1 mg","2 mg"] },
    "Clonazepam": { "Tablet": ["0.5 mg","2 mg"], "Oral Liquid": ["2.5 mg/mL"] },
    "Lorazepam": { "Tablet": ["0.5 mg","1 mg","2.5 mg"] },
    "Flunitrazepam": { "Tablet": ["1 mg"] },
    // Z-drugs
    "Zopiclone": { "Tablet": ["7.5 mg"] }, // IR
    "Zolpidem": { "Tablet": ["10 mg"], "Slow Release Tablet": ["6.25 mg","12.5 mg"] } // SR cannot be halved
  },
  "Proton Pump Inhibitor": {
    "Pantoprazole": { "Tablet": ["20 mg","40 mg"] },
    "Esomeprazole": { "Tablet": ["10 mg","20 mg"] },
    "Lansoprazole": { "Tablet": ["15 mg","30 mg"], "Wafer": ["15 mg","30 mg"] },
    "Omeprazole": { "Tablet": ["10 mg","20 mg"], "Capsule": ["10 mg","20 mg"] },
    "Rabeprazole": { "Tablet": ["10 mg","20 mg"] }
  },
  "Antipsychotic": {
    "Haloperidol": { "Tablet": ["0.5 mg","1 mg","2 mg","5 mg","10 mg","20 mg"], "Oral Liquid": ["2 mg/mL"] },
    "Olanzapine": { "Tablet": ["2.5 mg","5 mg","7.5 mg","10 mg","15 mg","20 mg"], "Wafer": ["5 mg","10 mg","15 mg","20 mg"] },
    "Quetiapine": { "Immediate Release Tablet": ["25 mg","100 mg","200 mg","300 mg"], "Slow Release Tablet": ["50 mg","150 mg","200 mg","300 mg","400 mg"] },
    "Risperidone": { "Tablet": ["0.5 mg","1 mg","2 mg","3 mg","4 mg"], "Oral Liquid": ["1 mg/mL"] }
  }
};

/* Tablets that may be halved (conservative). Zolpidem SR cannot be halved; patches never split. */
const HALVABLE = new Set([
  "Diazepam","Oxazepam","Nitrazepam","Temazepam","Alprazolam","Clonazepam","Lorazepam","Flunitrazepam",
  "Haloperidol","Olanzapine","Zopiclone","Zolpidem" // SR is handled separately
]);

/* ======= Guidance text (shown above controls; used to prefill defaults) ======= */
const GUIDANCE = {
  "Benzodiazepines / Z-drugs": {
    text: "Typical approach: reduce by ~25% every 2 weeks; near the end, slow to ~12.5% every 2 weeks. Monitor sleep/anxiety; slow down if withdrawal symptoms occur.",
    preset: { p1Percent: 25, p1Interval: 14, p2Percent: 12.5, p2Interval: 14 } // BZRA taper guidance :contentReference[oaicite:0]{index=0}
  },
  "Antipsychotic": {
    text: "Common approach: dose reductions of about 25–50% every 1–2 weeks with close monitoring for recurrence of symptoms; slower tapers are reasonable.",
    preset: { p1Percent: 33, p1Interval: 14, p2Percent: 25, p2Interval: 14 } // AP deprescribing cadence :contentReference[oaicite:1]{index=1}
  },
  "Proton Pump Inhibitor": {
    text: "Options include dose step-down to the lowest effective dose, stop then on-demand, or switch to intermittent therapy; review around 4–12 weeks.",
    preset: { p1Percent: 50, p1Interval: 14, p2Percent: 0, p2Interval: 0 } // PPI step-down/on-demand :contentReference[oaicite:2]{index=2}
  },
  "Opioid": {
    text: "Deprescribing should be gradual and individualised with regular review; avoid precipitous rapid tapers. Use co-interventions and focus on function and goals.",
    preset: { p1Percent: 10, p1Interval: 7, p2Percent: 10, p2Interval: 14 } // Opioid deprescribing principles :contentReference[oaicite:3]{index=3}
  }
};

/* ======= DOM helpers ======= */
const $ = id => document.getElementById(id);
const toNum = s => s ? parseFloat(String(s).match(/([\d.]+)/)?.[1] || "0") : 0;
const unitOf = s => s?.replace(/^[\d.\s/]+/,'').trim();
const fmtDate = d => new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
const addDays = (d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
function startOfWeek(d){ const dt=new Date(d); const day=dt.getDay(); const diff=(day===0?6:day-1); dt.setDate(dt.getDate()-diff); dt.setHours(0,0,0,0); return dt; }

/* ======= UI population ======= */
function populateClasses(){
  const cSel = $("classSelect"); cSel.innerHTML = "";
  Object.keys(CATALOG).forEach(cls=>{ const o=document.createElement("option"); o.value=cls; o.textContent=cls; cSel.appendChild(o); });
}
function populateMedicines(){
  const cls = $("classSelect").value, mSel = $("medicineSelect");
  mSel.innerHTML = "";
  Object.keys(CATALOG[cls]).forEach(m=>{ const o=document.createElement("option"); o.value=m; o.textContent=m; mSel.appendChild(o); });
}
function populateForms(){
  const { value: cls } = $("classSelect");
  const { value: med } = $("medicineSelect");
  const fSel = $("formSelect"); fSel.innerHTML = "";
  Object.keys(CATALOG[cls][med]).forEach(f=>{
    if(f==="IM/IV") return;
    const o=document.createElement("option"); o.value=f; o.textContent=f; fSel.appendChild(o);
  });
}
function populateStrengths(){
  const cls=$("classSelect").value, med=$("medicineSelect").value, form=$("formSelect").value, sSel=$("strengthSelect");
  sSel.innerHTML = "";
  (CATALOG[cls][med][form]||[]).forEach(s=>{ const o=document.createElement("option"); o.value=s; o.textContent=s; sSel.appendChild(o); });
}

/* Duration is only relevant in some classes (BZRA duration of use; AP often ≥3 months for BPSD; PPI ≥4 weeks) */
function updateDurationVisibility(){
  const cls = $("classSelect").value;
  const show = (cls==="Benzodiazepines / Z-drugs" || cls==="Antipsychotic" || cls==="Proton Pump Inhibitor");
  $("durationWrap").style.display = show ? "" : "none";
}

/* Best-practice box + prefill controls */
function updateBestPracticeAndPrefill(){
  const cls = $("classSelect").value;
  const med = $("medicineSelect").value;
  const g = GUIDANCE[cls];
  const box = $("bestPracticeBox");
  if(g){
    box.innerHTML = `<strong>Best-practice for ${med || cls}</strong><br>${g.text}`;
    // Pre-populate taper controls (you can still edit)
    $("p1Percent").value = g.preset.p1Percent || "";
    $("p1Interval").value = g.preset.p1Interval || "";
    $("p2Percent").value = g.preset.p2Percent || "";
    $("p2Interval").value = g.preset.p2Interval || "";
  } else {
    box.innerHTML = "";
  }
}

/* Special instruction rules */
function specialInstructionFor(med, form, strengthLabel){
  if(form === "Patch") return "Patches: apply to intact skin as directed. Do not cut patches.";
  // Zolpidem SR check
  if(med==="Zolpidem" && /Slow Release/i.test(form)) return "Swallow whole, do not halve or crush";
  // Quetiapine SR not halved
  if(med==="Quetiapine" && /Slow Release/i.test(form)) return "Swallow whole, do not halve or crush";
  if(HALVABLE.has(med)) return "May be halved. If quartering is required, check brand-specific guidance.";
  return "Swallow whole, do not halve or crush";
}

/* ======= Build plan ======= */
function buildPlan(){
  const cls = $("classSelect").value;
  const med = $("medicineSelect").value;
  const form= $("formSelect").value;
  const strengthStr = $("strengthSelect").value;
  const baseDose = toNum(strengthStr);
  const unit = unitOf(strengthStr) || "";
  const freqMode = $("frequencySelect").value; // AM, PM, BID, TID, QID

  const startDate = $("startDate").value ? new Date($("startDate").value) : new Date();
  const reviewDate = $("reviewDate").value ? new Date($("reviewDate").value) : null;
  const stopAtReview = $("taperUntilReview").checked;

  const p1Percent = parseFloat($("p1Percent").value || "0");
  const p1Interval = parseInt($("p1Interval").value || "0",10);
  const p1StopDose = parseFloat($("p1StopDose").value || "0");
  const p1StopWeek = parseInt($("p1StopWeek").value || "0",10);
  const p2Percent = parseFloat($("p2Percent").value || "0");
  const p2Interval = parseInt($("p2Interval").value || "0",10);

  if(!baseDose){ alert("Please select a strength."); return; }
  if(!p1Percent || !p1Interval){ alert("Please set Phase 1 % and interval."); return; }
  if(p2Percent && !p2Interval){ alert("Please set Phase 2 interval."); return; }

  // Header badges & special instructions
  $("hdrPatient").textContent   = "Patient: " + ($("patientName").value || "–");
  $("hdrAllergies").textContent = "Allergies: " + ($("allergies").value || "–");
  $("hdrHcp").textContent       = "HCP: " + ($("hcpName").value || "–");
  $("hdrMedicine").textContent  = "Medicine: " + med + " " + form;
  $("hdrSpecial").textContent   = "Special instructions: " + specialInstructionFor(med, form, strengthStr);

  // Build taper
  const rowsByWeek = [];
  let target = baseDose;
  let week = 1;
  let date = startOfWeek(startDate);
  const strengthList = (CATALOG[cls][med][form]||[]).map(s=>({label:s,val:toNum(s)})).sort((a,b)=>b.val-a.val);
  const smallest = strengthList.length ? strengthList[strengthList.length-1].val : baseDose;

  function pushWeekRow(targetDose){
    const components = decomposeDose(cls, med, form, targetDose);
    rowsByWeek.push({ date: fmtDate(date), components, targetDose });
  }

  // Phase 1
  while(target > 0){
    pushWeekRow(target);
    if((p1StopDose && target <= p1StopDose) || (p1StopWeek && week >= p1StopWeek)) break;
    date = addDays(date, p1Interval); week += 1;
    target = +(target * (1 - p1Percent/100)).toFixed(3);
    if(stopAtReview && reviewDate && date >= reviewDate) break;
    if(target <= 0.0001) break;
  }

  // Phase 2 (optional)
  if(target > 0 && p2Percent){
    while(target > 0.0001){
      date = addDays(date, p2Interval); week += 1;
      target = +(target * (1 - p2Percent/100)).toFixed(3);
      rowsByWeek.push({ date: fmtDate(date), components: decomposeDose(cls, med, form, target), targetDose: target });
      if(stopAtReview && reviewDate && date >= reviewDate) break;
      if(target <= 0.0001) break;
    }
  }

  // End-of-taper logic (alternate days / PRN) for BZRA/Z-drugs, PPIs, Antipsychotics
  const endEligible = (cls==="Benzodiazepines / Z-drugs" || cls==="Proton Pump Inhibitor" || cls==="Antipsychotic");
  const nearZero = target <= Math.max(smallest, baseDose*0.125);

  if(endEligible && (nearZero || (stopAtReview && reviewDate && date>=reviewDate))){
    // Add a final consolidation row with alternate-day or PRN advice
    date = addDays(date, (p2Percent? p2Interval : p1Interval));
    const strategy = (cls==="Proton Pump Inhibitor") ? "Use on demand for symptoms" : "Take as required (PRN)";
    const alt = (cls==="Proton Pump Inhibitor") ? "alternate days or step down to lowest effective dose" : "alternate days if needed before stopping";
    rowsByWeek.push({ date: fmtDate(date), components: [], targetDose: 0, endNote: `${strategy}; consider ${alt}.` });
  } else {
    // Full stop row
    date = addDays(date, (p2Percent? p2Interval : p1Interval));
    rowsByWeek.push({ date: fmtDate(date), components: [], targetDose: 0 });
  }

  renderTable(rowsByWeek, freqMode, { med, form });
}

/* Decompose to strengths (greedy; allow halves for splittable tablets; patches never split; Zolpidem/Quetiapine SR never split) */
function decomposeDose(cls, med, form, targetDose){
  const strengths = (CATALOG[cls][med][form]||[]).map(s=>({label:s, val:toNum(s)}))
    .filter(x=>x.val>0)
    .sort((a,b)=>b.val-a.val);

  const components = [];
  let remaining = targetDose;

  const canSplitTablet = (form!=="Patch") && HALVABLE.has(med) &&
    !(med==="Zolpidem" && /Slow Release/i.test(form)) &&
    !(med==="Quetiapine" && /Slow Release/i.test(form));

  for(const s of strengths){
    if(remaining <= 0.0001) break;
    let count = Math.floor(remaining / s.val);
    remaining = +(remaining - count*s.val).toFixed(3);

    if(canSplitTablet && remaining >= s.val*0.5 - 1e-6){
      count += 0.5;
      remaining = +(remaining - s.val*0.5).toFixed(3);
    }
    if(count>0) components.push({ strengthLabel: s.label, countPerDose: count });
  }

  if(remaining > 0.0001 && strengths.length){
    const smallest = strengths[strengths.length-1];
    const addCount = (canSplitTablet ? 0.5 : 1);
    components.push({ strengthLabel: smallest.label, countPerDose: addCount });
  }
  return components;
}

/* Render schedule table */
function renderTable(weeks, freqMode, meta){
  const wrap = $("scheduleBlock"); wrap.innerHTML = "";
  const table = document.createElement("table"); table.className="table";

  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  ["Week Beginning","Instructions","Strength","Morning","Midday","Dinner","Night","Special Instruction","Your tablet may look like"].forEach(h=>{
    const th=document.createElement("th"); th.textContent=h; hr.appendChild(th);
  });
  thead.appendChild(hr); table.appendChild(thead);

  const tbody = document.createElement("tbody");
  weeks.forEach(week=>{
    if(week.targetDose<=0){
      const tr=document.createElement("tr");
      tr.appendChild(td(week.date));
      tr.appendChild(td(week.endNote || "Stop. Drug-free days; use non-drug strategies and monitoring as agreed."));
      tr.appendChild(td("–"));
      for(let i=0;i<4;i++) tr.appendChild(td("—","center"));
      tr.appendChild(td("—"));
      tr.appendChild(imageCell(null));
      tbody.appendChild(tr);
      return;
    }
    if(week.components.length===0){
      tbody.appendChild(makeRow(week.date, meta, {strengthLabel:"—", countPerDose:1}, freqMode));
    } else {
      week.components.forEach((cmp, idx)=>{
        tbody.appendChild(makeRow(idx===0? week.date : "", meta, cmp, freqMode));
      });
    }
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
}

/* One row */
function makeRow(dateTxt, meta, cmp, freqMode){
  const tr=document.createElement("tr");
  tr.appendChild(td(dateTxt || " "));

  const countStr = formatCount(cmp.countPerDose, meta.form);
  const instr = buildPlainEnglishDose(countStr, cmp.strengthLabel, freqMode, meta.form);
  tr.appendChild(td(instr));

  tr.appendChild(td(cmp.strengthLabel));

  const marks = marksFor(freqMode);
  for(let i=0;i<4;i++){ tr.appendChild(td(marks[i] ? "X" : "","center")); }

  tr.appendChild(td(specialInstructionFor(meta.med || "", meta.form, cmp.strengthLabel)));
  tr.appendChild(imageCell({ med: meta.med, strength: cmp.strengthLabel }));
  return tr;
}

/* Time-of-day marks respecting “keep same time” for daily meds */
function marksFor(mode){
  const map = { AM:[1,0,0,0], PM:[0,0,0,1], BID:[1,0,0,1], TID:[1,1,0,1], QID:[1,1,1,1] };
  const arr = map[mode] || [1,0,0,1];
  return arr;
}

/* Cells & images */
function td(text, cls){ const el=document.createElement("td"); if(cls) el.className=cls; el.textContent=text; return el; }
function imageCell(info){
  const tdEl = document.createElement("td"); tdEl.className="image-cell";
  if(!info){ tdEl.textContent=""; return tdEl; }
  const cont=document.createElement("div"); const img=new Image();
  const slugMed = (info.med||"").toLowerCase().replace(/\s+|\/|\\|\+/g,'_').replace(/[^\w_]/g,'');
  const slugStrength = info.strength.toLowerCase().replace(/\s+|\/|\\|\+/g,'').replace(/[^\w]/g,'');
  img.onload=()=>cont.appendChild(img); img.onerror=()=>{};
  img.src = `images/${slugMed}_${slugStrength}.jpg`;
  tdEl.appendChild(cont); return tdEl;
}

/* Wording helpers */
function formatCount(count, form){
  if(form==="Patch"){
    if(count===1) return "1 patch";
    if(count===0.5) return "½ patch";
    if(Number.isInteger(count)) return `${count} patches`;
    return `${count} patch(es)`;
  }
  if(Number.isInteger(count)) return count===1 ? "1 tablet" : `${count} tablets`;
  if(count%1===0.5) return "½ tablet";
  return `${count} tablet(s)`;
}
function buildPlainEnglishDose(countStr, strengthLabel, mode, form){
  if(form==="Patch") return `Apply ${countStr} of ${strengthLabel} as directed. Do not cut patches.`;
  const whenText = { AM:"in the morning", PM:"at night", BID:["in the morning","at night"], TID:["in the morning","at midday","at night"], QID:["in the morning","at midday","at dinner","at night"] };
  const w = whenText[mode];
  if(Array.isArray(w)) return w.map(t=>`Take ${countStr} of ${strengthLabel} ${t}`).join(". ");
  return `Take ${countStr} of ${strengthLabel} ${w}`;
}

/* ======= Init & events ======= */
function init(){
  populateClasses(); populateMedicines(); populateForms(); populateStrengths(); updateDurationVisibility(); updateBestPracticeAndPrefill();

  $("classSelect").addEventListener("change", ()=>{ populateMedicines(); populateForms(); populateStrengths(); updateDurationVisibility(); updateBestPracticeAndPrefill(); });
  $("medicineSelect").addEventListener("change", ()=>{ populateForms(); populateStrengths(); updateBestPracticeAndPrefill(); });
  $("formSelect").addEventListener("change", ()=>{ populateStrengths(); updateBestPracticeAndPrefill(); });

  $("durationSelect").addEventListener("change", ()=>{}); // kept for future validations if needed
  $("generateBtn").addEventListener("click", buildPlan);
  $("resetBtn").addEventListener("click", ()=>location.reload());
  $("printBtn").addEventListener("click", ()=>window.print());
  $("savePdfBtn").addEventListener("click", ()=>{
    const element = document.getElementById("outputCard");
    if(typeof html2pdf==="function"){
      html2pdf().set({ filename:'taper_plan.pdf', margin:10, image:{type:'jpeg',quality:0.95}, html2canvas:{scale:2,useCORS:true}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'} }).from(element).save();
    } else { alert("PDF library not loaded."); }
  });
}
document.addEventListener("DOMContentLoaded", init);
