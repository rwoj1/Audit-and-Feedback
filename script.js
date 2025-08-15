"use strict";

/* ===== helpers ===== */
const $ = id => document.getElementById(id);
const fmtDate = d => new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
const fmtDateTime = d => new Date(d).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const addDays = (d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
function startOfWeek(d){ const dt=new Date(d); const day=dt.getDay(); const diff=(day===0?6:day-1); dt.setDate(dt.getDate()-diff); dt.setHours(0,0,0,0); return dt; }
function banner(msg){ const b=document.createElement("div"); b.style.cssText="position:fixed;left:0;right:0;bottom:0;background:#7f1d1d;color:#fff;padding:8px 12px;font:14px system-ui;z-index:999999"; b.textContent=msg; document.body.appendChild(b); }

/* ===== constants ===== */
const MAX_WEEKS = 60;
const THREE_MONTHS_MS = 90 * 24 * 3600 * 1000;
const SLOT_KEYS = ["AM","MID","DIN","PM"];
const CLASS_ORDERED = ["Opioid","Benzodiazepines / Z-Drug (BZRA)","Antipsychotic","Proton Pump Inhibitor"];

/* ===== catalog (SR opioids; no oral liquids) ===== */
const CATALOG = {
  "Opioid": {
    "Morphine":            { "Slow Release Tablet":["10 mg","15 mg","30 mg","60 mg","100 mg","200 mg"] },
    "Oxycodone":           { "Slow Release Tablet":["5 mg","10 mg","20 mg","40 mg","80 mg"] },
    "Oxycodone / Naloxone":{ "Slow Release Tablet":["2.5/1.25 mg","5/2.5 mg","10/5 mg","15/7.5 mg","20/10 mg","30/15 mg","40/20 mg","60/30 mg","80/40 mg"] },
    "Tapentadol":          { "Slow Release Tablet":["50 mg","100 mg","150 mg","200 mg","250 mg"] },
    "Tramadol":            { "Slow Release Tablet":["50 mg","100 mg","150 mg","200 mg"] },
    "Buprenorphine":       { "Patch":["5 mcg/hr","10 mcg/hr","15 mcg/hr","20 mcg/hr","25 mcg/hr","30 mcg/hr","40 mcg/hr"] },
    "Fentanyl":            { "Patch":["12 mcg/hr","25 mcg/hr","50 mcg/hr","75 mcg/hr","100 mcg/hr"] }
  },
  "Benzodiazepines / Z-Drug (BZRA)": {
    "Alprazolam":  { "Tablet":["0.25 mg","0.5 mg","1 mg","2 mg"] },
    "Clonazepam":  { "Tablet":["0.5 mg","2 mg"] },
    "Diazepam":    { "Tablet":["2 mg","5 mg"] },
    "Flunitrazepam":{ "Tablet":["1 mg"] },
    "Lorazepam":   { "Tablet":["0.5 mg","1 mg","2.5 mg"] },
    "Nitrazepam":  { "Tablet":["5 mg"] },
    "Oxazepam":    { "Tablet":["15 mg","30 mg"] },
    "Temazepam":   { "Tablet":["10 mg"] },
    "Zolpidem":    { "Tablet":["10 mg"], "Slow Release Tablet":["6.25 mg","12.5 mg"] },
    "Zopiclone":   { "Tablet":["7.5 mg"] }
  },
  "Antipsychotic": {
    "Haloperidol": { "Tablet":["0.5 mg","1 mg","2 mg","5 mg","10 mg","20 mg"] },
    "Olanzapine":  { "Tablet":["2.5 mg","5 mg","7.5 mg","10 mg","15 mg","20 mg"], "Wafer":["5 mg","10 mg","15 mg","20 mg"] },
    "Quetiapine":  { "Immediate Release Tablet":["25 mg","100 mg","200 mg","300 mg"], "Slow Release Tablet":["50 mg","150 mg","200 mg","300 mg","400 mg"] },
    "Risperidone": { "Tablet":["0.5 mg","1 mg","2 mg","3 mg","4 mg"] }
  },
  "Proton Pump Inhibitor": {
    "Esomeprazole": { "Tablet":["10 mg","20 mg"] },
    "Lansoprazole": { "Tablet":["15 mg","30 mg"], "Wafer":["15 mg","30 mg"] },
    "Omeprazole":   { "Capsule":["10 mg","20 mg"], "Tablet":["10 mg","20 mg"] },
    "Pantoprazole": { "Tablet":["20 mg","40 mg"] },
    "Rabeprazole":  { "Tablet":["10 mg","20 mg"] }
  }
};

/* ===== splitting rules (NO halves/quarters for: Opioids, PPIs, Zolpidem SR, SR/Cap/Wafer/Patch) ===== */
function currentClass(){ return $("classSelect")?.value || ""; }
function canHalf(med, form){
  const cls = currentClass();
  if(cls==="Opioid" || cls==="Proton Pump Inhibitor") return false;
  if(med==="Zolpidem" && /Slow Release/i.test(form)) return false;
  if(form==="Patch" || /Slow\s*Release/i.test(form) || /Capsule/i.test(form) || /Wafer/i.test(form)) return false;
  return true;
}
function canQuarter(med, form, strengthMg){
  const cls = currentClass();
  if(cls==="Opioid" || cls==="Proton Pump Inhibitor") return false;
  if(med==="Zolpidem" && /Slow Release/i.test(form)) return false;
  if(med==="Diazepam" && /Tablet/i.test(form) && (strengthMg===2 || strengthMg===5)) return true; // conservative
  return false;
}

/* ===== parsing ===== */
function parseMgFromStrength(str){
  if(!str) return 0;
  const slash = String(str).split("/")[0];
  const m = slash.match(/([\d.]+)\s*mg/i);
  return m ? parseFloat(m[1]) : 0;
}

/* ===== dropdowns ===== */
function populateClasses(){
  const cSel = $("classSelect"); if(!cSel) return;
  cSel.innerHTML = "";
  CLASS_ORDERED.forEach(cls=>{ const o=document.createElement("option"); o.value=cls; o.textContent=cls; cSel.appendChild(o); });
}
function populateMedicines(){
  const mSel = $("medicineSelect"); const clsEl = $("classSelect");
  if(!mSel || !clsEl) return;
  const cls = clsEl.value;
  mSel.innerHTML = "";
