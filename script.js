:root{
  --bg:#0f172a; --card:#111827; --muted:#9ca3af; --text:#e5e7eb; --accent:#60a5fa; --border:#1f2937;
  --row:#0b1220; --rowAlt:#0d1528; --rowPrint:#ffffff; --rowPrintAlt:#f5f7fa;
  --bpBlue:#0b3b6d; --bpBlueSoft:#0e4b8a;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:var(--bg);color:var(--text);font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}

.container{max-width:1000px;margin:24px auto;padding:0 16px}
h1{font-size:22px;margin:0 0 12px}
h2{font-size:18px;margin:0 0 10px}
h3{font-size:14px;margin:0 0 8px;color:var(--muted)}

.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:12px 0}
.grid.compact{grid-template-columns:repeat(2,1fr)}
label{display:flex;flex-direction:column;gap:6px}
select,input{background:#0b1220;color:var(--text);border:1px solid var(--border);border-radius:10px;padding:10px}

.card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px;margin:14px 0}
.card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.pill{background:#0b1220;border:1px solid var(--border);border-radius:999px;padding:6px 10px;color:#cbd5e1}

/* Suggested Practice box */
.bp{background:#0b1220;border:1px solid #1e293b;border-radius:12px;padding:12px}
.bp.opioid{background:var(--bpBlue); border-color:var(--bpBlueSoft)}
.bp strong{display:block;margin-bottom:6px}
.bp ul{margin:6px 0 0 18px}
.bp li{margin:2px 0}

button{background:var(--accent);border:none;color:#04121f;padding:10px 14px;border-radius:10px;cursor:pointer;font-weight:600}
button.secondary{background:#374151;color:#e5e7eb}
button.ghost{background:transparent;border:1px solid var(--border);color:var(--text)}
.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}

.dose-lines .badge{background:#1f2937;padding:4px 8px;border-radius:999px;color:#d1d5db}
.hint{color:var(--muted);margin:6px 0 0}

/* table */
.table{width:100%;border-collapse:separate;border-spacing:0 8px}
.table thead th{font-weight:600;text-align:left;padding:8px;color:#dbeafe}
.table tbody td{background:var(--row);border:1px solid var(--border);padding:10px;vertical-align:top}
.table tbody tr:nth-child(even) td{background:var(--rowAlt)}
.table tbody tr td:first-child{border-top-left-radius:10px;border-bottom-left-radius:10px}
.table tbody tr td:last-child{border-top-right-radius:10px;border-bottom-right-radius:10px}
.center{text-align:center}
.instructions-pre{white-space:pre-line}
.output-head{display:flex;gap:10px;align-items:center;justify-content:space-between;margin-bottom:8px}
.footer-notes{margin-top:12px;color:#cbd5e1}

@media (max-width:800px){
  .grid{grid-template-columns:1fr}
  .grid.compact{grid-template-columns:1fr}
  .actions{flex-direction:column;align-items:flex-start}
}

/* Print/PDF set to A4 with light zebra rows */
@media print{
  @page{ size:A4; margin:10mm }
  body{background:#fff;color:#000}
  .card, .container{box-shadow:none;border:none}
  .actions, .hint, .pill{display:none}
  .table thead th{color:#000}
  .table tbody td{background:var(--rowPrint);border-color:#bfc4cc;color:#000}
  .table tbody tr:nth-child(even) td{background:var(--rowPrintAlt)}
}
