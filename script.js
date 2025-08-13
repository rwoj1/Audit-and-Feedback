"use strict";

/* ===================== Safeguards ===================== */
const MAX_WEEKS = 60;        // hard cap ~3 months @ weekly/fortnightly steps
const MAX_EVENTS = 180;
const CLASSES_WITH_SLOT_ORDER = new Set([
  "Opioid","Benzodiazepines / Z-Drug (BZRA)","Antipsychotic","Proton Pump Inhibitor"
]); // Pantoprazole gets its own custom rule later

/* ===================== Catalog ===================== */
const CATALOG = {
  "Opioid": {
    "Buprenorphine": { "Patch":["5 mcg/hr","10 mcg/hr","15 mcg/hr","20 mcg/hr","25 mcg/hr","30 mcg/hr","40 mcg/hr"] },
    "Fentanyl": { "Patch":["12 mcg/hr","25 mcg/hr","50 mcg/hr","75 mcg/hr","100 mcg/hr"] },
    "Morphine": { "Tablet":["5 mg","10 mg","15 mg","30 mg","60 mg","100 mg","200 mg"], "Capsule":["10 mg","20 mg","50 mg","100 mg"], "Oral Liquid":["1 mg/mL"] },
    "Oxycodone": { "Tablet":["5 mg","10 mg","15 mg","20 mg","30 mg","40 mg","80 mg"] },
    "Oxycodone / Naloxone": { "Tablet":["2.5/1.25 mg","5/2.5 mg","10/5 mg","15/7.5 mg","20/10 mg","30/15 mg","40/20 mg","60/30 mg","80/40 mg"] },
    "Tapentadol": { "Tablet":["50 mg","100 mg","150 mg","200 mg","250 mg"] },
    "Tramadol": { "Tablet":["50 mg","100 mg","150 mg","200 mg"] }
  },
  "Benzodiazepines / Z-Drug (BZRA)": {
    "Alprazolam": { "Tablet":["0.25 mg","0.5 mg","1 mg","2 mg"] },
    "Clonazepam": { "Tablet":["0.5 mg","2 mg"], "Oral Liquid":["2.5 mg/mL"] },
    "Diazepam": { "Tablet":["2 mg","5 mg"], "Oral Liquid":["1 mg/mL"] },
    "Flunitrazepam": { "Tablet":["1 mg"] },
    "Lorazepam": { "Tablet":["0.5 mg","1 mg","2.5 mg"] },
    "Nitrazepam": { "Tablet":["5 mg"] },
    "Oxazepam": { "Tablet":["15 mg","30 mg"] },
    "Temazepam": { "Tablet":["10 mg"] },
    "Zolpidem": { "Tablet":["10 mg"], "Slow Release Tablet":["6.25 mg","12.5 mg"] },
    "Zopiclone": { "Tablet":["7.5 mg"] }
  },
  "Proton Pump Inhibitor": {
    "Esomeprazole": { "Tablet":["10 mg","20 mg"] },
    "Lansoprazole": { "Tablet":["15 mg","30 mg"], "Wafer":["15 mg","30 mg"] },
    "Omeprazole": { "Capsule":["10 mg","20 mg"], "Tablet":["10 mg","20 mg"] },
    "Pantoprazole": { "Tablet":["20 mg","40 mg"] },
    "Rabeprazole": { "Tablet":["10 mg","20 mg"] }
  },
  "Antipsychotic": {
    "Haloperidol": { "Tablet":["0.5 mg","1 mg","2 mg","5 mg","10 mg","20 mg"], "Oral Liquid":["2 mg/mL"] },
    "Olanzapine": { "Tablet":["2.5 mg","5 mg","7.5 mg","10 mg","15 mg","20 mg"], "Wafer":["5 mg","10 mg","15 mg","20 mg"] },
    "Quetiapine": { "Immediate Release Tablet":["25 mg","100 mg","200 mg","300 mg"], "Slow Release Tablet":["50 mg","150 mg","200 mg","300 mg","400 mg"] },
    "Risperidone": { "Tablet":["0.5 mg","1 mg","2 mg","3 mg","4 mg"], "Oral Liquid":["1 mg/mL"] }
  }
};

/* Split-friendly tablets (SR not; patches never) */
const HALVABLE = new Set([
  "Diazepam","Oxazepam","Nitrazepam","Temazepam","Alprazolam","Clonazepam","Lorazepam","Flunitrazepam",
  "Haloperidol","Olanzapine","Zopiclone","Zolpidem" // SR handled separately
]);

/* ===================== Class “Recommended practice” text ===================== */
const RECOMMEND = {
  "Opioid": `Tailor the deprescribing plan based on the person’s clinical characteristics, goals and preferences. Consider:
• <3 months use: reduce the dose by 10 to 25% every week
• >3 months use: reduce the dose by 10 to 25% every 4 weeks
• Long term opioid use (e.g., >1 year) or on high doses: slower tapering and frequent monitoring`,
  "Benzodiazepines / Z-Drug (BZRA)": `Taper slowly in collaboration with patient, for example 25% every 2 weeks, and if possible, 12.5% reductions near end and/or planned drug-free days.`,
  "Proton Pump Inhibitor": `Options: step-down to lowest effective dose, alternate-day dosing, or stop and use on-demand; review at 4–12 weeks.`,
  "Antipsychotic": `Common: reduce ~25–50% every 1–2 weeks with close monitoring for return of target symptoms; slower taper is reasonable.`
};

/* ===================== Utilities ===================== */
const $ = id => document.getElementById(id);
const toNum = s => s ? parseFloat(String(s).match(/([\d.]+)/)?.[1] || "0") : 0;
const fmtDate = d => new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
const fmtDateTime = d => new Date(d).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const addDays = (d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
function startOfWeek(d){ const dt=new Date(d); const day=dt.getDay(); const diff=(day===0?6:day-1); dt.setDate(dt.getDate()-diff); dt.setHours(0,0,0,0); return dt; }
function banner(msg){ const b=document.createElement("div"); b.style.cssText="position:fixed;left:0;right:0;bottom:0;background:#7f1d1d;color:#fff;padding:8px 12px;font:14px system-ui;z-index:999999"; b.textContent=msg; document.body.appendChild(b); }

/* ===================== Populate UI (alphabetical, form = tablet first) ===================== */
function populateClasses(){
  const cSel = $("classSelect"); cSel.innerHTML = "";
  Object.keys(CATALOG).sort().forEach(cls=>{ const o=document.createElement("option"); o.value=cls; o.textContent=cls; cSel.appendChild(o); });
}
function populateMedicines(){
  const cls = $("classSelect").value, mSel = $("medicineSelect"); mSel.innerHTML = "";
  Object.keys(CATALOG[cls]).sort().forEach(m=>{ const o=document.createElement("option"); o.value=m; o.textContent=m; mSel.appendChild(o); });
}
function populateForms(){
  const cls=$("classSelect").value, med=$("medicineSelect").value, fSel=$("formSelect"); fSel.innerHTML="";
  const forms = Object.keys(CATALOG[cls][med]);
  forms.sort((a,b)=>{
    const at = a.toLowerCase().includes("tablet") ? 0 : 1;
    const bt = b.toLowerCase().includes("tablet") ? 0 : 1;
    if(at!==bt) return at-bt;
    return a.localeCompare(b);
  });
  forms.forEach(f=>{ const o=document.createElement("option"); o.value=f; o.textContent=f; fSel.appendChild(o); });
}
function populateStrengths(){
  const cls=$("classSelect").value, med=$("medicineSelect").value, form=$("formSelect").value, sSel=$("strengthSelect"); sSel.innerHTML="";
  const list=(CATALOG[cls][med][form]||[]).slice().sort((a,b)=>toNum(a)-toNum(b));
  list.forEach(s=>{ const o=document.createElement("option"); o.value=s; o.textContent=s; sSel.appendChild(o); });
}

/* Duration field visibility (opioids only) */
function updateDurationVisibility(){ $("durationWrap").style.display = ($("classSelect").value==="Opioid") ? "" : "none"; }

/* Recommended practice box */
function updateRecommended(){
  const cls=$("classSelect").value;
  const med=$("medicineSelect").value;
  $("bestPracticeBox").innerHTML = `<strong>Recommended Practice for ${cls}</strong><br>${RECOMMEND[cls]||""}`;
  // Update header special text (patches wording handled later)
  $("hdrSpecial").textContent = "Special instructions: " + specialInstructionFor(med, $("formSelect").value);
}

/* ===================== Dose lines ===================== */
/*
Each dose line = { id, strengthStr, freqMode }
Rules:
- Additional lines must share same medicine & form as the primary (we enforce at UI level).
- Only strength/frequency are editable on added lines.
*/
let doseLines = []; // line[0] is primary (from main Strength/Frequency selects)
let nextLineId = 1;

function renderDoseLines(){
  const box = $("doseLinesContainer"); box.innerHTML = "";
  if(doseLines.length===0){
    const p=document.createElement("p"); p.textContent="(No additional dose lines)"; p.style.color="#9ca3af";
    box.appendChild(p); return;
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

    // Populate strengths for this line (same med/form list)
    const cls=$("classSelect").value, med=$("medicineSelect").value, form=$("formSelect").value;
    const sList=(CATALOG[cls][med][form]||[]).slice().sort((a,b)=>toNum(a)-toNum(b));
    const sSel=row.querySelector(".dl-strength");
    sList.forEach(s=>{ const o=document.createElement("option"); o.value=s; o.textContent=s; sSel.appendChild(o); });
    sSel.value = ln.strengthStr;

    const fSel=row.querySelector(".dl-freq");
    fSel.value = ln.freqMode;

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
  // Must share same med/form — we don't allow changing those here
  const strength = $("strengthSelect").value;
  const freq = $("frequencySelect").value;
  doseLines.push({ id: nextLineId++, strengthStr: strength, freqMode: freq });
  renderDoseLines();
}

/* ===================== Special Instructions ===================== */
function specialInstructionFor(med, form){
  if(form==="Patch"){
    return "Apply to intact skin as directed. Do not cut patches. Rotate site of application.";
  }
  if(med==="Zolpidem" && /Slow Release/i.test(form)) return "Swallow whole, do not halve or crush";
  if(med==="Quetiapine" && /Slow Release/i.test(form)) return "Swallow whole, do not halve or crush";
  return "Swallow whole, do not halve or crush";
}

/* ===================== Frequency helpers ===================== */
const SLOT_KEYS = ["AM","MID","DIN","PM"]; // Morning, Midday, Dinner, Night
function slotsForFreq(mode){
  switch(mode){
    case "AM": return ["AM"];
    case "MID": return ["MID"];
    case "DIN": return ["DIN"];
    case "PM": return ["PM"];
    case "BID": return ["AM","PM"];
    case "TID": return ["AM","MID","PM"];
    case "QID": return ["AM","MID","DIN","PM"];
    default: return ["AM"];
  }
}

/* ===================== Build plan with slot-order reduction ===================== */
function buildPlan(){
  try{
    // Header info
    const cls = $("classSelect").value;
    const med = $("medicineSelect").value;
    const form= $("formSelect").value;

    $("hdrPatient").textContent   = "Patient: " + ($("patientName").value || "–");
    $("hdrAllergies").textContent = "Allergies: " + ($("allergies").value || "–");
    $("hdrHcp").textContent       = "Health Care Professional: " + ($("hcpName").value || "–");
    $("hdrMedicine").textContent  = "Medicine: " + med + " " + form;
    $("hdrSpecial").textContent   = "Special instructions: " + specialInstructionFor(med, form);

    // Start/review dates and limit rules
    const startDate = $("startDate")._flatpickr?.selectedDates?.[0] || new Date();
    const reviewDate = $("reviewDate")._flatpickr?.selectedDates?.[0] || null;
    const threeMonthsMs = 90*24*3600*1000; // hard limit

    // Phase controls (Phase 2 can be 0/0)
    const p1Percent = Math.max(1, parseFloat($("p1Percent").value || "0"));
    const p1Interval = Math.max(1, parseInt($("p1Interval").value || "0",10));
    const p1StopWeek = parseInt($("p1StopWeek").value || "0",10) || 0;
    const p2Percent = Math.max(0, parseFloat($("p2Percent").value || "0"));
    const p2Interval = p2Percent ? Math.max(1, parseInt($("p2Interval").value || "0",10)) : 0;

    if(!p1Percent || !p1Interval){ alert("Please set Phase 1 % and interval."); return; }
    if(p2Percent && !p2Interval){ alert("Please set Phase 2 interval."); return; }

    // PRIMARY line (line #1) from main selects:
    const primary = {
      id: 0,
      strengthStr: $("strengthSelect").value,
      freqMode: $("frequencySelect").value
    };
    if(!primary.strengthStr){ alert("Please select a strength."); return; }

    // Build working set of lines (primary + added)
    const lines = [primary, ...doseLines];

    // Map initial tablets-per-slot (each line = 1 tablet for each listed slot)
    let baseCounts = { AM:0, MID:0, DIN:0, PM:0 };
    for(const ln of lines){
      for(const s of slotsForFreq(ln.freqMode)) baseCounts[s] += 1;
    }

    // Reduction engine uses tablet counts (not mg) to keep UX simple & per your examples.
    // Order for classes in CLASSES_WITH_SLOT_ORDER: DIN → MID → (AM & PM equally)
    const useSlotOrder = CLASSES_WITH_SLOT_ORDER.has(cls) && !(cls==="Proton Pump Inhibitor" && med==="Pantoprazole");

    // Timeline
    const rows = [];
    let date = startOfWeek(startDate);
    let week = 1;
    let counts = {...baseCounts};

    function pushRow(note=null){
      rows.push({
        date: fmtDate(date),
        counts: {...counts},
        note
      });
    }

    // helper: total tablets/day
    const totalTabs = obj => SLOT_KEYS.reduce((a,k)=>a+(obj[k]||0),0);

    // Apply a reduction “step” by percentage of current daily tablets
    function applyReductionStep(percent){
      let toDrop = Math.max(1, Math.round(totalTabs(counts) * (percent/100)));
      if(useSlotOrder){
        // 1) Dinner first
        while(toDrop>0 && counts.DIN>0){ counts.DIN -= 1; toDrop--; }
        // 2) Then Midday
        while(toDrop>0 && counts.MID>0){ counts.MID -= 1; toDrop--; }
        // 3) Then Morning & Night equally
        while(toDrop>0 && (counts.AM>0 || counts.PM>0)){
          if(counts.AM>counts.PM && counts.AM>0){ counts.AM -= 1; toDrop--; }
          else if(counts.PM>0){ counts.PM -= 1; toDrop--; }
          else if(counts.AM>0){ counts.AM -= 1; toDrop--; }
        }
      } else {
        // Generic: remove evenly from all slots
        while(toDrop>0){
          for(const k of SLOT_KEYS){
            if(toDrop<=0) break;
            if(counts[k]>0){ counts[k]-=1; toDrop--; }
          }
        }
      }
    }

    // ----- Phase 1 loop -----
    while(totalTabs(counts)>0){
      pushRow();
      if(p1StopWeek && week >= p1StopWeek) break;

      // Next interval
      date = addDays(date, p1Interval); week += 1;
      applyReductionStep(p1Percent);

      // stop at 3 months or review date if reached
      if(reviewDate && date >= reviewDate) break;
      if((+date - +startDate) >= threeMonthsMs) break;
      if(rows.length >= MAX_WEEKS) break;
    }

    // ----- Phase 2 loop (if any) -----
    if(totalTabs(counts)>0 && p2Percent){
      while(totalTabs(counts)>0){
        date = addDays(date, p2Interval); week += 1;
        applyReductionStep(p2Percent);
        pushRow();

        if(reviewDate && date >= reviewDate) break;
        if((+date - +startDate) >= threeMonthsMs) break;
        if(rows.length >= MAX_WEEKS) break;
      }
    }

    // End row note per class
    let endNote = null;
    if(cls==="Proton Pump Inhibitor"){
      if(med==="Pantoprazole"){
        endNote = "Stop or use on demand for symptoms; consider alternate days / lowest effective dose.";
      } else {
        endNote = "Use on demand for symptoms; consider alternate days / lowest effective dose.";
      }
    } else if(cls==="Benzodiazepines / Z-Drug (BZRA)" || cls==="Antipsychotic"){
      endNote = "Take as required (PRN); consider alternate days before stopping.";
    }

    // Add terminal row (zero day) with note
    date = addDays(date, (p2Percent ? Math.max(1,p2Interval) : Math.max(1,p1Interval)));
    rows.push({ date: fmtDate(date), counts: {AM:0,MID:0,DIN:0,PM:0}, note: endNote });

    // Render tables (patch vs standard)
    const isFentanylPatch = (form==="Patch" && med==="Fentanyl");
    const isBupePatch = (form==="Patch" && med==="Buprenorphine");
    if(isFentanylPatch || isBupePatch){
      renderPatchTable(rows, isFentanylPatch?3:7);
      // expected benefits / withdrawal placeholders (class-specific)
      setFooterText(cls);
    } else {
      renderStandardTable(rows);
      setFooterText(cls);
    }
  } catch(err){
    console.error(err);
    banner("Error: " + (err?.message || String(err)));
  }
}

/* ===================== Rendering ===================== */
function renderStandardTable(rows){
  $("patchBlock").style.display = "none";
  const wrap = $("scheduleBlock"); wrap.style.display = ""; wrap.innerHTML = "";

  const table = document.createElement("table"); table.className="table";
  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  ["Week Beginning","Instructions","Morning","Midday","Dinner","Night"].forEach(h=>{
    const th=document.createElement("th"); th.textContent=h; hr.appendChild(th);
  });
  thead.appendChild(hr); table.appendChild(thead);

  const tbody = document.createElement("tbody");

  rows.forEach(r=>{
    const tr=document.createElement("tr");
    tr.appendChild(td(r.date));

    // Build plain-English lines per slot (no strength names, per your request)
    let lines=[];
    if(r.counts.AM>0)  lines.push(plural(r.counts.AM,"Take {n} tablet in the morning","Take {n} tablets in the morning"));
    if(r.counts.MID>0) lines.push(plural(r.counts.MID,"Take {n} tablet at midday","Take {n} tablets at midday"));
    if(r.counts.DIN>0) lines.push(plural(r.counts.DIN,"Take {n} tablet at dinner","Take {n} tablets at dinner"));
    if(r.counts.PM>0)  lines.push(plural(r.counts.PM,"Take {n} tablet at night","Take {n} tablets at night"));
    if(r.note) lines.push(r.note);
    tr.appendChild(td(lines.length? lines.join("\n") : (r.note || "—")));

    tr.appendChild(td(r.counts.AM||0,"center"));
    tr.appendChild(td(r.counts.MID||0,"center"));
    tr.appendChild(td(r.counts.DIN||0,"center"));
    tr.appendChild(td(r.counts.PM||0,"center"));

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
}
function plural(n, s1, sN){ return (n===1 ? s1 : sN).replace("{n}", String(n)); }

function renderPatchTable(rows, everyDays){
  $("scheduleBlock").style.display = "none";
  const wrap = $("patchBlock"); wrap.style.display = ""; wrap.innerHTML = "";

  const table = document.createElement("table"); table.className="table";
  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  ["Apply on","Remove on","Patch strength(s)","Instructions"].forEach(h=>{
    const th=document.createElement("th"); th.textContent=h; hr.appendChild(th);
  });
  thead.appendChild(hr); table.appendChild(thead);

  const tbody = document.createElement("tbody");

  // Build simple q3d/q7d rows across the timeline
  let start = new Date(rows[0].date);
  let end   = new Date(rows[rows.length-1].date);
  for(let t=new Date(start); t<=end; t=addDays(t,everyDays)){
    const tr=document.createElement("tr");
    tr.appendChild(td(fmtDateTime(t)));
    tr.appendChild(td(fmtDateTime(addDays(new Date(t), everyDays))));
    tr.appendChild(td("X mcg/hr")); // display format per your instruction
    tr.appendChild(td(`Apply 1 patch to the skin every ${everyDays} days. Rotate sites.`));
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
}

/* Footer text placeholders (can be wired to your guideline excerpts later) */
function setFooterText(cls){
  const exp = {
    "Opioid":"Improved function and reduced opioid-related harms.",
    "Benzodiazepines / Z-Drug (BZRA)":"Improved cognition, daytime alertness, and reduced falls.",
    "Proton Pump Inhibitor":"Reduced pill burden and adverse effects (e.g., C. difficile, fractures) at long-term high doses.",
    "Antipsychotic":"Reduce metabolic and extrapyramidal adverse effects."
  }[cls] || "—";
  const wdr = {
    "Opioid":"Transient pain flare, cravings, mood changes; mitigate with non-opioid strategies.",
    "Benzodiazepines / Z-Drug (BZRA)":"Insomnia, anxiety, irritability; consider sleep hygiene/CBT and slower taper.",
    "Proton Pump Inhibitor":"Rebound dyspepsia/heartburn; manage with step-down or on-demand use.",
    "Antipsychotic":"Sleep disturbance, anxiety, return of target symptoms; use slower taper and close monitoring."
  }[cls] || "—";
  $("expBenefits").textContent = exp;
  $("withdrawalInfo").textContent = wdr;
}

/* ===================== Small helpers ===================== */
function td(text, cls){ const el=document.createElement("td"); if(cls) el.className=cls; el.textContent=String(text||""); return el; }

/* ===================== Init ===================== */
function init(){
  // Calendars
  document.querySelectorAll(".datepick").forEach(el=>{
    if(window.flatpickr){ flatpickr(el,{dateFormat:"Y-m-d",allowInput:true}); }
    else { el.type="date"; }
  });

  populateClasses(); populateMedicines(); populateForms(); populateStrengths(); updateDurationVisibility(); updateRecommended();

  $("classSelect").addEventListener("change", ()=>{ populateMedicines(); populateForms(); populateStrengths(); updateDurationVisibility(); updateRecommended(); doseLines=[]; renderDoseLines(); });
  $("medicineSelect").addEventListener("change", ()=>{ populateForms(); populateStrengths(); updateRecommended(); doseLines=[]; renderDoseLines(); });
  $("formSelect").addEventListener("change", ()=>{ populateStrengths(); updateRecommended(); doseLines=[]; renderDoseLines(); });
  $("durationSelect").addEventListener("change", updateRecommended);

  $("addDoseLineBtn").addEventListener("click", addDoseLine);

  $("generateBtn").addEventListener("click", buildPlan);
  $("resetBtn").addEventListener("click", ()=>location.reload());
  $("printBtn").addEventListener("click", ()=>window.print());
  $("savePdfBtn").addEventListener("click", ()=>{
    const el=$("outputCard");
    if(typeof html2pdf==="function"){
      html2pdf().set({ filename:'taper_plan.pdf', margin:10, image:{type:'jpeg',quality:0.95}, html2canvas:{scale:2,useCORS:true}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'} }).from(el).save();
    } else { alert("PDF library not loaded."); }
  });
}
document.addEventListener("DOMContentLoaded", init);
