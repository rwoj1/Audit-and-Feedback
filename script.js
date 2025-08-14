"use strict";

/* ============ Safeguards & constants ============ */
const MAX_WEEKS = 60;                 // cap rows (~3 months window)
const CLASSES_WITH_SLOT_ORDER = new Set([
  "Opioid","Benzodiazepines / Z-Drug (BZRA)","Antipsychotic","Proton Pump Inhibitor"
]); // DIN -> MID -> AM & PM equally
const THREE_MONTHS_MS = 90 * 24 * 3600 * 1000;

/* ============ Catalog (no Oral Liquid) ============ */
// Class order fixed; Opioid medicine order fixed per request
const CATALOG = {
  "Opioid": {
    "Morphine": { "Tablet":["5 mg","10 mg","15 mg","30 mg","60 mg","100 mg","200 mg"], "Capsule":["10 mg","20 mg","50 mg","100 mg"] },
    "Oxycodone": { "Tablet":["5 mg","10 mg","15 mg","20 mg","30 mg","40 mg","80 mg"] },
    "Oxycodone / Naloxone": { "Tablet":["2.5/1.25 mg","5/2.5 mg","10/5 mg","15/7.5 mg","20/10 mg","30/15 mg","40/20 mg","60/30 mg","80/40 mg"] },
    "Tapentadol": { "Tablet":["50 mg","100 mg","150 mg","200 mg","250 mg"] },
    "Tramadol": { "Tablet":["50 mg","100 mg","150 mg","200 mg"] },
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
    "Esomeprazole": { "Tablet":["10 mg","20 mg"] },
    "Lansoprazole": { "Tablet":["15 mg","30 mg"], "Wafer":["15 mg","30 mg"] },
    "Omeprazole": { "Capsule":["10 mg","20 mg"], "Tablet":["10 mg","20 mg"] },
    "Pantoprazole": { "Tablet":["20 mg","40 mg"] },
    "Rabeprazole": { "Tablet":["10 mg","20 mg"] }
  }
};
// Preferred class display order:
const CLASS_ORDER = ["Opioid","Benzodiazepines / Z-Drug (BZRA)","Antipsychotic","Proton Pump Inhibitor"];

/* Split-friendly tablets (SR not; patches never) */
const HALVABLE = new Set([
  "Diazepam","Oxazepam","Nitrazepam","Temazepam","Alprazolam","Clonazepam","Lorazepam","Flunitrazepam",
  "Haloperidol","Olanzapine","Zopiclone","Zolpidem" // SR handled separately
]);

/* ============ Recommended Practice text (bulleted) ============ */
const RECOMMEND = {
  "Opioid": [
    "Tailor the deprescribing plan based on clinical characteristics, goals and preferences.",
    "< 3 months use: reduce the dose by 10–25% every week.",
    "> 3 months use: reduce the dose by 10–25% every 4 weeks.",
    "Long-term/high doses: slower tapering and frequent monitoring."
  ],
  "Benzodiazepines / Z-Drug (BZRA)": [
    "Taper slowly with the patient; e.g., 25% every 2 weeks.",
    "Near end: consider 12.5% reductions and/or planned drug-free days."
  ],
  "Proton Pump Inhibitor": [
    "Step-down to lowest effective dose, alternate-day dosing, or stop and use on-demand.",
    "Review at 4–12 weeks."
  ],
  "Antipsychotic": [
    "Reduce ~25–50% every 1–2 weeks with close monitoring.",
    "Slower taper is reasonable depending on symptoms."
  ]
};

/* ============ Utilities ============ */
const $ = id => document.getElementById(id);
const toNum = s => s ? parseFloat(String(s).match(/([\d.]+)/)?.[1] || "0") : 0;
const fmtDate = d => new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
const fmtDateTime = d => new Date(d).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const addDays = (d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
function startOfWeek(d){ const dt=new Date(d); const day=dt.getDay(); const diff=(day===0?6:day-1); dt.setDate(dt.getDate()-diff); dt.setHours(0,0,0,0); return dt; }
function banner(msg){ const b=document.createElement("div"); b.style.cssText="position:fixed;left:0;right:0;bottom:0;background:#7f1d1d;color:#fff;padding:8px 12px;font:14px system-ui;z-index:999999"; b.textContent=msg; document.body.appendChild(b); }

/* ============ Dropdown population ============ */
function populateClasses(){
  const cSel = $("classSelect"); cSel.innerHTML = "";
  CLASS_ORDER.forEach(cls=>{ const o=document.createElement("option"); o.value=cls; o.textContent=cls; cSel.appendChild(o); });
}
function populateMedicines(){
  const cls = $("classSelect").value, mSel = $("medicineSelect"); mSel.innerHTML = "";
  // Opioids must remain in given order; others alphabetical
  const meds = Object.keys(CATALOG[cls]);
  const ordered = (cls==="Opioid")
    ? ["Morphine","Oxycodone","Oxycodone / Naloxone","Tapentadol","Tramadol","Buprenorphine","Fentanyl"]
    : meds.slice().sort();
  ordered.forEach(m=>{ if(meds.includes(m)){ const o=document.createElement("option"); o.value=m; o.textContent=m; mSel.appendChild(o); }});
}
function populateForms(){
  const cls=$("classSelect").value, med=$("medicineSelect").value, fSel=$("formSelect"); fSel.innerHTML="";
  const forms = Object.keys(CATALOG[cls][med]);
  // Tablet first, otherwise alpha
  forms.sort((a,b)=>{
    const at = /tablet/i.test(a) ? 0 : 1;
    const bt = /tablet/i.test(b) ? 0 : 1;
    if(at!==bt) return at-bt;
    return a.localeCompare(b);
  });
  forms.forEach(f=>{ const o=document.createElement("option"); o.value=f; o.textContent=f; fSel.appendChild(o); });
}
function strengthListForSelected(){
  const cls=$("classSelect").value, med=$("medicineSelect").value, form=$("formSelect").value;
  return (CATALOG[cls][med][form]||[]).slice().sort((a,b)=>toNum(a)-toNum(b));
}

/* Duration visibility (opioids only) */
function updateDurationVisibility(){ $("durationWrap").style.display = ($("classSelect").value==="Opioid") ? "" : "none"; }

/* Recommended practice box: bullet lines */
function updateRecommended(){
  const cls=$("classSelect").value;
  const lines = RECOMMEND[cls] || [];
  const bullets = lines.map(t=>`<li>${t}</li>`).join("");
  $("bestPracticeBox").innerHTML = `<strong>Recommended Practice for ${cls}</strong><ul style="margin:6px 0 0 18px">${bullets}</ul>`;
  $("hdrSpecial").textContent = "Special instructions: " + specialInstructionFor($("medicineSelect").value, $("formSelect").value);
}

/* ============ Dose lines (strength+frequency live only here) ============ */
let doseLines = []; // { id, strengthStr, freqMode }
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
  const box = $("doseLinesContainer"); box.innerHTML = "";
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

    // Populate strengths for this line (same med/form list)
    const sList = strengthListForSelected();
    const sSel=row.querySelector(".dl-strength");
    sList.forEach(s=>{ const o=document.createElement("option"); o.value=s; o.textContent=s; sSel.appendChild(o); });
    sSel.value = ln.strengthStr;

    const fSel=row.querySelector(".dl-freq"); fSel.value = ln.freqMode;

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
  const sList = strengthListForSelected();
  if(!sList.length){ alert("Select a form/strength first."); return; }
  const defaultStrength = sList[sList.length-1]; // highest mg by default
  doseLines.push({ id: nextLineId++, strengthStr: defaultStrength, freqMode: "AM" });
  renderDoseLines();
}

/* ============ Special instructions ============ */
function specialInstructionFor(med, form){
  if(form==="Patch"){
    return "Apply to intact skin as directed. Do not cut patches. Rotate site of application.";
  }
  if(med==="Zolpidem" && /Slow Release/i.test(form)) return "Swallow whole, do not halve or crush";
  if(med==="Quetiapine" && /Slow Release/i.test(form)) return "Swallow whole, do not halve or crush";
  return "Swallow whole, do not halve or crush";
}

/* ============ Taper engine (tablet-count model) ============ */
const SLOT_KEYS = ["AM","MID","DIN","PM"];
const plural = (n, s1, sN)=> (n===1 ? s1 : sN).replace("{n}", String(n));

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

    const startDate = $("startDate")._flatpickr?.selectedDates?.[0] || new Date();
    const reviewDate = $("reviewDate")._flatpickr?.selectedDates?.[0] || null;

    // Controls
    const p1Percent  = Math.max(1, parseFloat($("p1Percent").value || "0"));
    const p1Interval = Math.max(1, parseInt($("p1Interval").value || "0",10));
    const p1StopWeek = parseInt($("p1StopWeek").value || "0",10) || 0;
    const p2Percent  = Math.max(0, parseFloat($("p2Percent").value || "0"));
    const p2Interval = p2Percent ? Math.max(1, parseInt($("p2Interval").value || "0",10)) : 0;

    if(!p1Percent || !p1Interval){ alert("Please set Phase 1 % and interval."); return; }
    if(p2Percent && !p2Interval){ alert("Please set Phase 2 interval."); return; }

    if(doseLines.length===0){ addDoseLine(); } // pre-populate at least 1

    // Base counts by slot: each dose-line contributes 1 tablet in its slots
    let baseCounts = { AM:0, MID:0, DIN:0, PM:0 };
    for(const ln of doseLines){
      slotsForFreq(ln.freqMode).forEach(s=> baseCounts[s] += 1);
    }

    const useSlotOrder = CLASSES_WITH_SLOT_ORDER.has(cls);

    // Timeline build
    const rows = [];
    let date = startOfWeek(startDate);
    let week = 1;
    let counts = {...baseCounts};

    // Strength column text (combine all distinct strengths across lines)
    const strengthText = (() => {
      const uniq = Array.from(new Set(doseLines.map(l=>`${med} ${l.strengthStr} ${form.toLowerCase()}`)));
      return uniq.join(" + ");
    })();

    function pushRow(note=null){
      // Build plain-English, one line per time slot
      let lines=[];
      if(counts.AM>0)  lines.push(plural(counts.AM,"Take {n} tablet in the morning","Take {n} tablets in the morning"));
      if(counts.MID>0) lines.push(plural(counts.MID,"Take {n} tablet at midday","Take {n} tablets at midday"));
      if(counts.DIN>0) lines.push(plural(counts.DIN,"Take {n} tablet at dinner","Take {n} tablets at dinner"));
      if(counts.PM>0)  lines.push(plural(counts.PM,"Take {n} tablet at night","Take {n} tablets at night"));
      if(note) lines.push(note);

      rows.push({
        date: fmtDate(date),
        strength: strengthText || `${med} ${form.toLowerCase()}`,
        instructions: lines.join("\n"),
        am: counts.AM||0, mid: counts.MID||0, din: counts.DIN||0, pm: counts.PM||0
      });
    }

    const totalTabs = obj => SLOT_KEYS.reduce((a,k)=>a+(obj[k]||0),0);

    function applyReductionStep(percent){
      let toDrop = Math.max(1, Math.round(totalTabs(counts) * (percent/100)));
      if(useSlotOrder){
        // Dinner first
        while(toDrop>0 && counts.DIN>0){ counts.DIN -= 1; toDrop--; }
        // then Midday
        while(toDrop>0 && counts.MID>0){ counts.MID -= 1; toDrop--; }
        // then Morning & Night equally
        while(toDrop>0 && (counts.AM>0 || counts.PM>0)){
          if(counts.AM>counts.PM && counts.AM>0){ counts.AM -= 1; toDrop--; }
          else if(counts.PM>0){ counts.PM -= 1; toDrop--; }
          else if(counts.AM>0){ counts.AM -= 1; toDrop--; }
        }
      } else {
        // Even removal otherwise
        while(toDrop>0){
          for(const k of SLOT_KEYS){
            if(toDrop<=0) break;
            if(counts[k]>0){ counts[k]-=1; toDrop--; }
          }
        }
      }
    }

    // Phase 1
    pushRow();
    while(totalTabs(counts)>0){
      if(p1StopWeek && week >= p1StopWeek) break;
      date = addDays(date, p1Interval); week += 1;
      applyReductionStep(p1Percent);
      pushRow();
      if(reviewDate && date >= reviewDate) break;
      if((+date - +startDate) >= THREE_MONTHS_MS) break;
      if(rows.length >= MAX_WEEKS) break;
    }

    // Phase 2
    if(totalTabs(counts)>0 && p2Percent){
      while(totalTabs(counts)>0){
        date = addDays(date, p2Interval); week += 1;
        applyReductionStep(p2Percent);
        pushRow();
        if(reviewDate && date >= reviewDate) break;
        if((+date - +startDate) >= THREE_MONTHS_MS) break;
        if(rows.length >= MAX_WEEKS) break;
      }
    }

    // End note (BZRA, AP, PPI give PRN/alt-days; opioids = stop)
    let endNote = null;
    if(cls==="Proton Pump Inhibitor"){
      endNote = "Use on demand for symptoms; consider alternate days / lowest effective dose.";
    } else if(cls==="Benzodiazepines / Z-Drug (BZRA)" || cls==="Antipsychotic"){
      endNote = "Take as required (PRN); consider alternate days before stopping.";
    }
    date = addDays(date, (p2Percent? Math.max(1,p2Interval) : Math.max(1,p1Interval)));
    rows.push({
      date: fmtDate(date),
      strength: strengthText || `${med} ${form.toLowerCase()}`,
      instructions: endNote || "Stop.",
      am: 0, mid: 0, din: 0, pm: 0
    });

    // Render
    const isFentanyl = (form==="Patch" && med==="Fentanyl");
    const isBupe     = (form==="Patch" && med==="Buprenorphine");
    if(isFentanyl || isBupe){
      renderPatchTable(rows, isFentanyl?3:7);
    } else {
      renderStandardTable(rows, med, form);
    }
    setFooterText(cls);
  } catch(err){
    console.error(err);
    banner("Error: " + (err?.message || String(err)));
  }
}

/* ============ Rendering ============ */
function td(text, cls){ const el=document.createElement("td"); if(cls) el.className=cls; el.textContent=String(text||""); return el; }
function imgTd(info){
  const tdEl=document.createElement("td"); tdEl.className="image-cell";
  if(!info){ tdEl.textContent=""; return tdEl; }
  const cont=document.createElement("div"); const img=new Image();
  const slugMed=String(info.med||"").toLowerCase().replace(/[\s\/\\\+]+/g,"_").replace(/[^\w_]/g,"");
  const slugStrength=String(info.strength||"").toLowerCase().replace(/[\s\/\\\+]+/g,"").replace(/[^\w]/g,"");
  img.onload=()=>cont.appendChild(img); img.onerror=()=>{};
  img.src=`images/${slugMed}_${slugStrength}.jpg`;
  tdEl.appendChild(cont); return tdEl;
}

function renderStandardTable(rows, med, form){
  $("patchBlock").style.display = "none";
  const wrap = $("scheduleBlock"); wrap.style.display = ""; wrap.innerHTML = "";

  const table = document.createElement("table"); table.className="table";
  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  ["Week beginning","Strength","Instructions","Morning","Midday","Dinner","Night","Image"].forEach(h=>{
    const th=document.createElement("th"); th.textContent=h; hr.appendChild(th);
  });
  thead.appendChild(hr); table.appendChild(thead);

  const tbody = document.createElement("tbody");
  rows.forEach(r=>{
    const tr=document.createElement("tr");
    tr.appendChild(td(r.date));
    tr.appendChild(td(r.strength)); // e.g., “Pantoprazole 40 mg tablet + Pantoprazole 20 mg tablet”
    const instrTd = td(r.instructions); instrTd.className = "instructions-pre"; tr.appendChild(instrTd);
    tr.appendChild(td(r.am,"center"));
    tr.appendChild(td(r.mid,"center"));
    tr.appendChild(td(r.din,"center"));
    tr.appendChild(td(r.pm,"center"));

    // Use the first strength in the list (if any) for image naming
    let firstStrength = (r.strength.split("+")[0] || "").trim().toLowerCase();
    // attempt to extract “<med> <dose> <form>” → build image key as <med>_<dose>
    let m = firstStrength.match(/^([\w\s\/-]+)\s+([\d.]+(?:\/[\d.]+)?\s*\w+)\s+(.+)$/);
    const imgCell = imgTd(m ? { med, strength: m[2] } : null);
    tr.appendChild(imgCell);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
}

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
  // Build simple q3d/q7d rows from first to last date
  let start = new Date(rows[0].date);
  let end   = new Date(rows[rows.length-1].date);
  for(let t=new Date(start); t<=end; t=addDays(t,everyDays)){
    const tr=document.createElement("tr");
    tr.appendChild(td(fmtDateTime(t)));
    tr.appendChild(td(fmtDateTime(addDays(new Date(t), everyDays))));
    tr.appendChild(td("X mcg/hr")); // per requirements
    tr.appendChild(td(`Apply 1 patch to the skin every ${everyDays} days. Rotate sites.`));
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
}

/* Footer text placeholders (simple defaults; can be swapped for guideline snippets later) */
function setFooterText(cls){
  const exp = {
    "Opioid":"Improved function and reduced opioid-related harms.",
    "Benzodiazepines / Z-Drug (BZRA)":"Improved cognition, daytime alertness, and reduced falls.",
    "Proton Pump Inhibitor":"Reduced pill burden and adverse effects with long-term use.",
    "Antipsychotic":"Lower risk of metabolic/extrapyramidal adverse effects."
  }[cls] || "—";
  const wdr = {
    "Opioid":"Transient pain flare, cravings, mood changes; use non-opioid strategies.",
    "Benzodiazepines / Z-Drug (BZRA)":"Insomnia, anxiety, irritability; consider sleep hygiene/CBT and slower taper.",
    "Proton Pump Inhibitor":"Rebound heartburn; manage via step-down or on-demand use.",
    "Antipsychotic":"Sleep disturbance, anxiety, return of target symptoms; taper slowly and monitor."
  }[cls] || "—";
  $("expBenefits").textContent = exp;
  $("withdrawalInfo").textContent = wdr;
}

/* ============ Init ============ */
function init(){
  // Calendars
  document.querySelectorAll(".datepick").forEach(el=>{
    if(window.flatpickr){ flatpickr(el,{dateFormat:"Y-m-d",allowInput:true}); }
    else { el.type="date"; }
  });

  populateClasses(); populateMedicines(); populateForms(); updateDurationVisibility(); updateRecommended();

  // Pre-populate one dose line
  addDoseLine();

  $("classSelect").addEventListener("change", ()=>{
    populateMedicines(); populateForms(); updateDurationVisibility(); updateRecommended();
    doseLines=[]; addDoseLine(); renderDoseLines();
  });
  $("medicineSelect").addEventListener("change", ()=>{
    populateForms(); updateRecommended();
    doseLines=[]; addDoseLine(); renderDoseLines();
  });
  $("formSelect").addEventListener("change", ()=>{
    updateRecommended();
    doseLines=[]; addDoseLine(); renderDoseLines();
  });
  $("durationSelect").addEventListener("change", updateRecommended);

  $("addDoseLineBtn").addEventListener("click", addDoseLine);
  renderDoseLines();

  $("generateBtn").addEventListener("click", buildPlan);
  $("resetBtn").addEventListener("click", ()=>location.reload());
  $("printBtn").addEventListener("click", ()=>window.print());
  $("savePdfBtn").addEventListener("click", ()=>{
    const el = $("outputCard"); // PDF/Print: output only
    if(typeof html2pdf==="function"){
      html2pdf().set({
        filename:'taper_plan.pdf',
        margin: 10,
        image:{ type:'jpeg', quality:0.95 },
        html2canvas:{ scale:2, useCORS:true },
        jsPDF:{ unit:'mm', format:'a4', orientation:'portrait' }
      }).from(el).save();
    } else { alert("PDF library not loaded."); }
  });
}
document.addEventListener("DOMContentLoaded", init);
