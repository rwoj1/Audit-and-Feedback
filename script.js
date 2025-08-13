/* --------------------------
   1) Minimal drug catalog (from your instructions doc)
   -------------------------- */
// The catalog drives dependent dropdowns. You can extend it easily.
const CATALOG = {
  "Opioid": {
    "Morphine": {
      "Tablet": ["5 mg","10 mg","15 mg","30 mg","60 mg","100 mg","200 mg"],
      "Capsule": ["10 mg","20 mg","50 mg","100 mg"],
      "halvable": false
    },
    "Oxycodone": { "Tablet": ["5 mg","10 mg","15 mg","20 mg","30 mg","40 mg","80 mg"], "halvable": false },
    "Oxycodone / Naloxone": { "Tablet": ["2.5/1.25 mg","5/2.5 mg","10/5 mg","15/7.5 mg","20/10 mg","30/15 mg","40/20 mg","60/30 mg","80/40 mg"], "halvable": false },
    "Tapentadol": { "Tablet": ["50 mg","100 mg","150 mg","200 mg","250 mg"], "halvable": false },
    "Tramadol": { "Tablet": ["50 mg","100 mg","150 mg","200 mg"], "halvable": false },
    "Fentanyl": { "Patch": ["12 mcg/hr","25 mcg/hr","50 mcg/hr","75 mcg/hr","100 mcg/hr"], "halvable": false },
    "Buprenorphine": { "Patch": ["5 mcg/hr","10 mcg/hr","15 mcg/hr","20 mcg/hr","25 mcg/hr","30 mcg/hr","40 mcg/hr"], "halvable": false }
  },
  "Benzodiazepine": {
    "Diazepam": { "Tablet": ["2 mg","5 mg"], "Oral Liquid": ["1 mg/mL"], "halvable": true },
    "Oxazepam": { "Tablet": ["15 mg","30 mg"], "halvable": true },
    "Nitrazepam": { "Tablet": ["5 mg"], "halvable": true },
    "Temazepam": { "Tablet": ["10 mg"], "halvable": true },
    "Alprazolam": { "Tablet": ["0.25 mg","0.5 mg","1 mg","2 mg"], "halvable": true },
    "Clonazepam": { "Tablet": ["0.5 mg","2 mg"], "Oral Liquid": ["2.5 mg/mL"], "halvable": true },
    "Lorazepam": { "Tablet": ["0.5 mg","1 mg","2.5 mg"], "halvable": true },
    "Flunitrazepam": { "Tablet": ["1 mg"], "halvable": true }
  },
  "Proton Pump Inhibitor": {
    "Pantoprazole": { "Tablet": ["20 mg","40 mg"], "halvable": false },
    "Esomeprazole": { "Tablet": ["10 mg","20 mg"], "halvable": false },
    "Lansoprazole": { "Tablet": ["15 mg","30 mg"], "Wafer": ["15 mg","30 mg"], "halvable": false },
    "Omeprazole": { "Tablet": ["10 mg","20 mg"], "Capsule": ["10 mg","20 mg"], "halvable": false },
    "Rabeprazole": { "Tablet": ["10 mg","20 mg"], "halvable": false }
  },
  "Antipsychotic": {
    "Haloperidol": { "Tablet": ["0.5 mg","1 mg","2 mg","5 mg","10 mg","20 mg"], "Oral Liquid": ["2 mg/mL"], "IM/IV": ["5 mg/mL","50 mg/mL","100 mg/mL"], "halvable": true },
    "Olanzapine": { "Tablet": ["2.5 mg","5 mg","7.5 mg","10 mg","15 mg","20 mg"], "Wafer": ["5 mg","10 mg","15 mg","20 mg"], "halvable": true },
    "Quetiapine": { "Immediate Release Tablet": ["25 mg","100 mg","200 mg","300 mg"], "Slow Release Tablet": ["50 mg","150 mg","200 mg","300 mg","400 mg"], "halvable": false }, // IR yes; SR no
    "Risperidone": { "Tablet": ["0.5 mg","1 mg","2 mg","3 mg","4 mg"], "Oral Liquid": ["1 mg/mL"], "halvable": true }
  }
};

/* --------------------------
   2) Class effects + guidance blocks (from algorithms)
   -------------------------- */
const CLASS_INFO = {
  "Benzodiazepine": {
    withdrawals: "Insomnia, anxiety, irritability, sweating, gastrointestinal symptoms (usually mild, days–weeks).",
    sideEffects: "Physical dependence, falls, memory disorder, dementia, functional impairment, daytime sedation, motor vehicle accidents (risk ↑ in older adults).",
    bestPractice: "Typical taper ~25% every 2 weeks; consider 12.5% reductions near the end; monitor every 1–2 weeks; offer CBT/sleep hygiene.",
    preset: { percent: 25, intervalDays: 14, endPercent: 12.5 }
  },
  "Antipsychotic": {
    withdrawals: "Possible recurrence of BPSD (psychosis, agitation, aggression). Monitor closely; consider non-drug strategies.",
    sideEffects: "Metabolic disturbances, weight gain, somnolence, dizziness, injury/falls, EPS, cardiovascular events; risk ↑ with higher dose/older age.",
    bestPractice: "Consider 25–50% dose reduction every 1–2 weeks; slower taper and frequent monitoring if severe baseline BPSD.",
    preset: { percent: 25, percentAlt: 50, intervalDays: 14 }
  },
  "Proton Pump Inhibitor": {
    withdrawals: "Return of GERD symptoms may occur (≈1/10 on on-demand).",
    sideEffects: "Fractures, C. difficile & diarrhea, pneumonia, B12 deficiency, hypomagnesemia; common: headache, nausea, diarrhea, rash.",
    bestPractice: "Either step down dose (e.g., BID→QD; halve dose; every-other-day) OR stop and use on-demand; monitor at 4 & 12 weeks.",
    preset: { mode: "stepdown" } // alternate: "ondemand"
  },
  "Opioid": {
    withdrawals: "Irritability, GI upset, autonomic symptoms; monitor and slow taper if needed.",
    sideEffects: "Sedation, constipation, falls, respiratory depression; class risks vary by agent.",
    bestPractice: "Percentage taper configurable here (follow local protocol).",
  }
};

/* --------------------------
   3) Helpers
   -------------------------- */
const $ = (id)=>document.getElementById(id);
function toMgNumber(str){
  // Extract numeric part (supports mg/mL, mcg/hr etc.). For scheduling, we treat the first number as the "dose unit".
  if(!str) return 0;
  const m = String(str).match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}
function startOfWeek(d){ const dt=new Date(d); const day=dt.getDay(); const diff=(day===0?6:day-1); dt.setDate(dt.getDate()-diff); dt.setHours(0,0,0,0); return dt; }
function fmtDate(d){ return new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}) }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }

/* --------------------------
   4) Populate dropdowns
   -------------------------- */
function populateClasses(){
  const cSel = $("classSelect");
  cSel.innerHTML = "";
  Object.keys(CATALOG).forEach(cls=>{
    const o=document.createElement("option"); o.value=cls; o.textContent=cls; cSel.appendChild(o);
  });
}
function populateMedicines(){
  const cls = $("classSelect").value;
  const mSel = $("medicineSelect");
  mSel.innerHTML = "";
  Object.keys(CATALOG[cls]).forEach(m=>{
    const o=document.createElement("option"); o.value=m; o.textContent=m; mSel.appendChild(o);
  });
}
function populateForms(){
  const cls=$("classSelect").value;
  const med=$("medicineSelect").value;
  const fSel=$("formSelect");
  fSel.innerHTML = "";
  const forms = Object.keys(CATALOG[cls][med]).filter(k=>k!=="halvable");
  forms.forEach(f=>{
    const o=document.createElement("option"); o.value=f; o.textContent=f; fSel.appendChild(o);
  });
}
function populateStrengths(){
  const cls=$("classSelect").value;
  const med=$("medicineSelect").value;
  const form=$("formSelect").value;
  const sSel=$("strengthSelect");
  sSel.innerHTML = "";
  (CATALOG[cls][med][form]||[]).forEach(s=>{
    const o=document.createElement("option"); o.value=s; o.textContent=s; sSel.appendChild(o);
  });
}

/* --------------------------
   5) Presets based on algorithms
   -------------------------- */
function applyPreset(){
  const p = $("presetSelect").value;
  const interval = $("intervalSelect");
  const percent = $("percentSelect");
  if(p==="bzra"){
    interval.value = "14";
    percent.value = "25";
  }else if(p==="ap"){
    // Default toward the conservative end (25% q2w); user can switch to 50% or 1w.
    interval.value = "14";
    percent.value = "25";
  }else if(p==="ppi_stepdown" || p==="ppi_ondemand"){
    // Percent & interval not used the same way; we keep them but logic branches below.
  }
}

/* --------------------------
   6) Schedule generation
   -------------------------- */
function buildPlan(){
  const cls = $("classSelect").value;
  const med = $("medicineSelect").value;
  const form= $("formSelect").value;
  const strengthStr = $("strengthSelect").value;
  const freq = parseInt($("frequencySelect").value,10);
  const duration = $("durationSelect").value;
  const startDate = $("startDate").value ? new Date($("startDate").value) : new Date();
  const reviewDate = $("reviewDate").value ? new Date($("reviewDate").value) : null;
  const intervalDays = parseInt($("intervalSelect").value,10);
  const percent = parseFloat($("percentSelect").value);
  const preset = $("presetSelect").value;

  const doseUnit = toMgNumber(strengthStr); // naive numeric extraction
  if(!doseUnit){ alert("Please select a strength."); return; }

  // Advice block (evidence-based summaries)
  const advice = document.createElement("div");
  advice.innerHTML = renderAdvice(cls, preset);
  $("adviceBlock").innerHTML = "";
  $("adviceBlock").appendChild(advice);

  // Build schedule rows
  let rows = [];
  let currentDose = doseUnit;
  let currentDate = startOfWeek(startDate);
  const minDoseThreshold = Math.max(doseUnit*0.1, 0.125); // small guard to stop

  // PPI special modes from guideline: Step-down OR Stop & On-demand
  if(cls==="Proton Pump Inhibitor" && preset.startsWith("ppi_")){
    rows = buildPPISteps(strengthStr, startDate, reviewDate, preset);
  } else {
    // BZRA: near end, make last steps 12.5% if preset is bzra
    const endPercent = (preset==="bzra") ? 12.5 : percent;

    while(currentDose > minDoseThreshold){
      const weekStart = new Date(currentDate);
      const instr = renderInstructions(cls, med, form, strengthStr, currentDose, freq);
      rows.push({
        week: fmtDate(weekStart),
        dose: currentDose,
        instructions: instr
      });

      // next step
      currentDate = addDays(currentDate, intervalDays);
      const usePercent = (currentDose <= doseUnit*0.25 && preset==="bzra") ? endPercent : percent;
      currentDose = +(currentDose * (1 - usePercent/100)).toFixed(3);

      // stop at reviewDate if provided and reached/passed
      if(reviewDate && currentDate >= reviewDate){ break; }
    }
    // final stop/cessation row
    rows.push({
      week: fmtDate(currentDate),
      dose: 0,
      instructions: "Stop / drug-free days. Monitor and escalate non-drug strategies as needed."
    });
  }

  renderTable(rows, freq, {patient:$("patientName").value, allergies:$("allergies").value, hcp:$("hcpName").value, med, cls, strengthStr, form});

  // Try load images if present
  tryImages(med, strengthStr);
}

function buildPPISteps(strengthStr, startDate, reviewDate, mode){
  const rows=[];
  let d = startOfWeek(startDate);
  const next = (n)=>{ d = addDays(d,n); return fmtDate(d); };

  if(mode==="ppi_stepdown"){
    // Examples of step-down: BID->QD, halve dose, alternate-day.
    rows.push({ week: fmtDate(d), dose: strengthStr, instructions: "Reduce to maintenance (e.g., halve dose or switch BID→QD). Use lifestyle measures. Review in 4 weeks." });
    rows.push({ week: next(28), dose: strengthStr, instructions: "If stable, consider every-other-day or lowest effective dose. If symptoms recur, short course then step back." });
    if(reviewDate && d >= reviewDate) return rows;
    rows.push({ week: next(28), dose: "on-demand", instructions: "Consider transition to on-demand use. Provide OTC/H2RA rescue plan as needed." });
  } else {
    // Stop & on-demand immediately
    rows.push({ week: fmtDate(d), dose: 0, instructions: "Stop. Use on-demand for symptom flares. Provide OTC/H2RA rescue plan; reinforce lifestyle measures." });
    rows.push({ week: next(28), dose: 0, instructions: "Monitor at 4 & 12 weeks. If persistent symptoms 3–7 days: test/treat H. pylori or return to prior effective dose briefly, then re-attempt." });
  }
  return rows;
}

/* Written instructions cell content per row */
function renderInstructions(cls, med, form, strengthStr, currentDose, freq){
  const perDose = `${currentDose} of ${strengthStr}`;
  const doses = ["Morning","Midday","Dinner","Night"].slice(0,freq).map(t=>`${t}: take ${perDose}`).join(" | ");
  const halveFlag = canHalve(cls, med) ? "Tablet may be halved if necessary (check local guidance/brand-specific info)." : "Do not split unless verified safe for the brand/form.";
  return `${doses}. ${halveFlag}`;
}
function canHalve(cls, med){
  const entry = CATALOG[cls]?.[med];
  return !!entry && entry.halvable===true;
}

/* --------------------------
   7) Render table + download
   -------------------------- */
function renderTable(rows, freq, meta){
  const cols = ["Week beginning","Written instructions","Morning","Midday","Dinner","Night"];
  const table = document.createElement("table");
  table.className="table";

  // header
  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  cols.forEach((c,i)=>{
    if(i>1 && i>freq+1) return; // hide extra time-of-day columns
    const th=document.createElement("th"); th.textContent=c; hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  // body
  const tbody = document.createElement("tbody");
  rows.forEach(r=>{
    const tr=document.createElement("tr");
    const cells = [
      r.week,
      r.instructions,
      ...(new Array(freq).fill("").map(()=> "☐")) // tick boxes per time-of-day
    ];
    cells.forEach((val,i)=>{
      const td=document.createElement("td");
      td.textContent = val;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  // header block above the table with patient info and badges
  const header = document.createElement("div");
  header.innerHTML = `
    <div class="badge">Patient: ${meta.patient || "-"}</div>
    <div class="badge">Allergies: ${meta.allergies || "-"}</div>
    <div class="badge">HCP: ${meta.hcp || "-"}</div>
    <div class="badge">Medicine: ${meta.med} (${meta.cls}, ${meta.form}, ${meta.strengthStr})</div>
  `;

  const wrap = $("scheduleBlock");
  wrap.innerHTML = "";
  wrap.appendChild(header);
  wrap.appendChild(table);

  // Download JSON handler (for audit/export)
  $("downloadBtn").onclick = ()=>{
    const blob = new Blob([JSON.stringify({meta, rows}, null, 2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `taper_${meta.patient||'patient'}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
}

/* Evidence-based advice block */
function renderAdvice(cls, preset){
  const c = CLASS_INFO[cls] || {};
  let header = `<strong>${cls} guidance</strong><br>${c.bestPractice||""}`;
  // Monitoring cues (class-based)
  if(cls==="Benzodiazepine" || cls==="Antipsychotic"){
    header += " | Monitor every 1–2 weeks and slow the taper if issues arise.";
  } else if(cls==="Proton Pump Inhibitor"){
    header += " | Review at 4 and 12 weeks.";
  }
  // Preset label
  if(preset && preset!=="custom"){
    header += ` <span class="badge">Preset: ${preset.replaceAll("_"," ")}</span>`;
  }
  return header + `<br><em>Withdrawals:</em> ${c.withdrawals||"-"}<br><em>Side effects (class):</em> ${c.sideEffects||"-"}`;
}

/* Try to display strength-matched images from /images */
function tryImages(med, strength){
  const cont = $("imagesRow");
  cont.innerHTML = "";
  const slugMed = med.toLowerCase().replace(/\s+|\/|\\|\+/g,'_').replace(/[^\w_]/g,'');
  const slugStrength = strength.toLowerCase().replace(/\s+|\/|\\|\+/g,'').replace(/[^\w]/g,'');
  const candidate = `images/${slugMed}_${slugStrength}.jpg`; // e.g., images/diazepam_5mg.jpg
  const img = new Image();
  img.onload = ()=>{ cont.appendChild(img); };
  img.onerror = ()=>{ /* no image available; silently ignore */ };
  img.src = candidate;
}

/* --------------------------
   8) Init & events
   -------------------------- */
function init(){
  populateClasses();
  populateMedicines();
  populateForms();
  populateStrengths();

  $("classSelect").addEventListener("change", ()=>{ populateMedicines(); populateForms(); populateStrengths(); });
  $("medicineSelect").addEventListener("change", ()=>{ populateForms(); populateStrengths(); });
  $("formSelect").addEventListener("change", populateStrengths);
  $("presetSelect").addEventListener("change", applyPreset);
  $("generateBtn").addEventListener("click", buildPlan);
  $("resetBtn").addEventListener("click", ()=>location.reload());
}
document.addEventListener("DOMContentLoaded", init);

