import { useState, useEffect, useRef } from "react";

// ── Supabase config ──────────────────────────────────────────────────────────
const SB_URL = "https://tjkrgnznsspbpzgaskpk.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqa3Jnbnpuc3NwYnB6Z2Fza3BrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNzYxMzAsImV4cCI6MjA4OTc1MjEzMH0.6SckNM932mX_CBTS8V8XuNNvAlZ7FF0EF_rnU-3m1zQ";

const sbH = {
  "apikey": SB_KEY,
  "Authorization": `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation",
};

async function sbSelect(table, qs = "") {
  const r = await fetch(`${SB_URL}/rest/v1/${table}${qs}`, { headers: sbH });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function sbInsert(table, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, { method: "POST", headers: sbH, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function sbDelete(table, id) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers: sbH });
  if (!r.ok) throw new Error(await r.text());
}

async function sbUpload(path, file) {
  const r = await fetch(`${SB_URL}/storage/v1/object/vinyl-images/${path}`, {
    method: "POST",
    headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": file.type || "image/jpeg", "x-upsert": "true" },
    body: file,
  });
  if (!r.ok) throw new Error(await r.text());
  return `${SB_URL}/storage/v1/object/public/vinyl-images/${path}`;
}

// ── Constants ────────────────────────────────────────────────────────────────
const GENRES = ["Blues","Classical","Country","Electronic","Folk","Funk","Jazz","Latin","Pop","Punk","R&B / Soul","Reggae","Rock","Soundtrack","World"];
const CONDITIONS = ["Mint","VG+","VG","G+","G","F"];
const SPEEDS = ["33","45","78"];

// ── Styles ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --cream: #F5F0E8; --ink: #1A1208; --vinyl: #0D0D0D; --groove: #2A2A2A;
    --amber: #C8862A; --dust: #8C7B5E; --paper: #EDE8DC; --red: #B83232;
    --line: rgba(200,134,42,0.15);
  }
  html, body { height: 100%; }
  body {
    font-family: 'DM Sans', sans-serif; color: var(--ink);
    background: repeating-linear-gradient(0deg, transparent, transparent 28px, var(--line) 29px), var(--cream);
    min-height: 100vh;
  }
  .hdr {
    background: var(--vinyl); padding: 0 1.25rem;
    display: flex; align-items: center; justify-content: space-between;
    height: 58px; position: sticky; top: 0; z-index: 100;
    box-shadow: 0 4px 24px rgba(0,0,0,0.4);
  }
  .hdr-logo { font-family:'Playfair Display',serif; font-size:1.25rem; color:var(--amber); display:flex; align-items:center; gap:0.5rem; }
  .hdr-logo em { font-style:italic; color:var(--cream); opacity:0.55; font-size:0.78rem; }
  .hdr-nav { display:flex; gap:0.35rem; }
  .nb { background:transparent; border:1px solid rgba(200,134,42,0.3); color:var(--cream); padding:0.32rem 0.8rem; border-radius:2px; cursor:pointer; font-family:'DM Mono',monospace; font-size:0.7rem; letter-spacing:0.08em; text-transform:uppercase; transition:all 0.2s; }
  .nb:hover,.nb.on { background:var(--amber); border-color:var(--amber); color:var(--vinyl); }
  .main { max-width:1400px; margin:0 auto; padding:1.25rem; }
  .sbar { display:flex; gap:0.65rem; margin-bottom:1.1rem; flex-wrap:wrap; }
  .si { flex:1; min-width:160px; padding:0.5rem 0.8rem; border:1px solid var(--amber); background:white; font-family:'DM Sans',sans-serif; font-size:0.88rem; outline:none; border-radius:2px; }
  .fs { padding:0.5rem 0.8rem; border:1px solid rgba(26,18,8,0.2); background:white; font-family:'DM Mono',monospace; font-size:0.7rem; outline:none; border-radius:2px; cursor:pointer; }
  .vtog { display:flex; gap:0.2rem; background:var(--paper); padding:3px; border-radius:3px; }
  .vb { background:transparent; border:none; padding:0.28rem 0.55rem; cursor:pointer; border-radius:2px; font-size:1rem; transition:background 0.15s; }
  .vb.on { background:white; box-shadow:0 1px 3px rgba(0,0,0,0.1); }
  .stbar { font-family:'DM Mono',monospace; font-size:0.68rem; color:var(--dust); letter-spacing:0.06em; text-transform:uppercase; margin-bottom:1.1rem; padding-bottom:0.6rem; border-bottom:1px solid rgba(200,134,42,0.2); }
  .gal { display:grid; grid-template-columns:repeat(auto-fill,minmax(155px,1fr)); gap:1rem; }
  .rc { cursor:pointer; transition:transform 0.2s; }
  .rc:hover { transform:translateY(-4px); }
  .rc-img { width:100%; aspect-ratio:1; object-fit:cover; display:block; box-shadow:4px 4px 16px rgba(0,0,0,0.25); background:var(--groove); }
  .rc-ph { width:100%; aspect-ratio:1; background:var(--groove); display:flex; align-items:center; justify-content:center; box-shadow:4px 4px 16px rgba(0,0,0,0.25); }
  .rc-info { padding:0.45rem 0.15rem; }
  .rc-art { font-family:'DM Mono',monospace; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--amber); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .rc-alb { font-family:'Playfair Display',serif; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:0.08rem; }
  .rc-yr { font-family:'DM Mono',monospace; font-size:0.62rem; color:var(--dust); margin-top:0.12rem; }
  .lv { display:flex; flex-direction:column; }
  .lhdr { display:grid; grid-template-columns:48px 1fr 1fr 55px 75px 55px; gap:0.85rem; padding:0.38rem 0.65rem; border-bottom:2px solid var(--amber); margin-bottom:0.18rem; }
  .lhdr span { font-family:'DM Mono',monospace; font-size:0.6rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--dust); }
  .lr { display:grid; grid-template-columns:48px 1fr 1fr 55px 75px 55px; gap:0.85rem; align-items:center; padding:0.55rem 0.65rem; border-bottom:1px solid rgba(200,134,42,0.1); cursor:pointer; transition:background 0.15s; }
  .lr:hover { background:rgba(200,134,42,0.05); }
  .lt { width:48px; height:48px; object-fit:cover; }
  .lt-ph { width:48px; height:48px; background:var(--groove); display:flex; align-items:center; justify-content:center; }
  .l-art { font-family:'DM Mono',monospace; font-size:0.65rem; text-transform:uppercase; color:var(--amber); }
  .l-alb { font-family:'Playfair Display',serif; font-size:0.88rem; }
  .l-m { font-family:'DM Mono',monospace; font-size:0.65rem; color:var(--dust); }
  .ov { position:fixed; inset:0; background:rgba(10,8,4,0.88); z-index:200; display:flex; align-items:center; justify-content:center; padding:1rem; backdrop-filter:blur(4px); }
  .mod { background:var(--cream); max-width:800px; width:100%; max-height:90vh; overflow-y:auto; border-top:4px solid var(--amber); box-shadow:0 32px 80px rgba(0,0,0,0.5); }
  .mod-in { padding:1.6rem; }
  .mod-photos { display:grid; grid-template-columns:repeat(3,1fr); gap:0.55rem; margin-bottom:1.1rem; }
  .ph-lbl { font-family:'DM Mono',monospace; font-size:0.6rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--dust); margin-bottom:0.22rem; }
  .mod-img { aspect-ratio:1; object-fit:cover; width:100%; cursor:zoom-in; }
  .mod-img-ph { aspect-ratio:1; background:var(--groove); display:flex; align-items:center; justify-content:center; }
  .mod-title { font-family:'Playfair Display',serif; font-size:1.7rem; line-height:1.1; margin-bottom:0.18rem; }
  .mod-art { font-family:'DM Mono',monospace; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--amber); margin-bottom:1.1rem; }
  .mod-fields { display:grid; grid-template-columns:repeat(3,1fr); gap:0.75rem; margin-bottom:1.1rem; padding:1rem; background:var(--paper); border-left:3px solid var(--amber); }
  .mf label { display:block; font-family:'DM Mono',monospace; font-size:0.6rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--dust); margin-bottom:0.12rem; }
  .mf p { font-size:0.86rem; font-weight:500; }
  .tl { display:grid; grid-template-columns:1fr 1fr; gap:1.1rem; margin-bottom:1.1rem; }
  .tl-side h4 { font-family:'DM Mono',monospace; font-size:0.68rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--amber); margin-bottom:0.55rem; padding-bottom:0.28rem; border-bottom:1px solid rgba(200,134,42,0.3); }
  .ti { display:flex; gap:0.55rem; padding:0.28rem 0; font-size:0.82rem; border-bottom:1px solid rgba(0,0,0,0.04); }
  .tn { font-family:'DM Mono',monospace; font-size:0.65rem; color:var(--dust); width:1.3rem; flex-shrink:0; }
  .mod-notes { padding:0.85rem; background:white; border-left:3px solid var(--dust); font-size:0.83rem; color:var(--dust); font-style:italic; }
  .cls-btn { float:right; background:none; border:1px solid rgba(0,0,0,0.15); width:28px; height:28px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:1rem; border-radius:2px; color:var(--dust); transition:all 0.15s; margin-bottom:0.65rem; }
  .cls-btn:hover { background:var(--red); border-color:var(--red); color:white; }
  .del-btn { margin-top:1.1rem; background:none; border:1px solid var(--red); color:var(--red); padding:0.32rem 0.85rem; font-family:'DM Mono',monospace; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.08em; cursor:pointer; border-radius:2px; transition:all 0.15s; }
  .del-btn:hover { background:var(--red); color:white; }
  .form-wrap { max-width:680px; margin:0 auto; }
  .ft { font-family:'Playfair Display',serif; font-size:1.55rem; margin-bottom:0.28rem; }
  .fs2 { font-family:'DM Mono',monospace; font-size:0.7rem; color:var(--dust); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:1.6rem; }
  .pzones { display:grid; grid-template-columns:repeat(3,1fr); gap:0.8rem; margin-bottom:1.35rem; }
  .pz { border:2px dashed rgba(200,134,42,0.4); aspect-ratio:1; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s; background:var(--paper); position:relative; overflow:hidden; border-radius:2px; }
  .pz:hover { border-color:var(--amber); background:white; }
  .pz.filled { border-style:solid; border-color:var(--amber); }
  .pz img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
  .pz-lbl { font-family:'DM Mono',monospace; font-size:0.6rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--dust); margin-top:0.38rem; z-index:1; }
  .pz-ov { position:absolute; inset:0; background:rgba(0,0,0,0.6); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.4rem; opacity:0; transition:opacity 0.2s; }
  .pz:hover .pz-ov { opacity:1; }
  .pz-ov-btn { background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.4); color:white; font-family:'DM Mono',monospace; font-size:0.6rem; text-transform:uppercase; letter-spacing:0.07em; padding:0.28rem 0.6rem; border-radius:2px; cursor:pointer; transition:background 0.15s; width:80%; text-align:center; }
  .pz-ov-btn:hover { background:var(--amber); border-color:var(--amber); color:var(--ink); }
  .pz-actions { display:flex; flex-direction:column; gap:0.35rem; width:100%; padding:0.5rem; }
  .pz-action-btn { background:rgba(237,232,220,0.12); border:1px solid rgba(200,134,42,0.5); color:var(--amber); font-family:'DM Mono',monospace; font-size:0.58rem; text-transform:uppercase; letter-spacing:0.07em; padding:0.32rem 0.4rem; border-radius:2px; cursor:pointer; transition:all 0.15s; text-align:center; }
  .pz-action-btn:hover { background:var(--amber); color:var(--ink); }
  .ai-btn { width:100%; padding:0.75rem; background:var(--ink); color:var(--amber); border:none; font-family:'DM Mono',monospace; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.12em; cursor:pointer; margin-bottom:1.35rem; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:0.45rem; border-radius:2px; }
  .ai-btn:hover:not(:disabled) { background:var(--amber); color:var(--ink); }
  .ai-btn:disabled { opacity:0.4; cursor:not-allowed; }
  .ai-st { text-align:center; font-family:'DM Mono',monospace; font-size:0.7rem; color:var(--amber); margin-bottom:0.75rem; min-height:1rem; }
  .fsec { margin-bottom:1.35rem; padding:1.1rem; background:var(--paper); border-left:3px solid var(--amber); border-radius:0 2px 2px 0; }
  .fsec-t { font-family:'DM Mono',monospace; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--amber); margin-bottom:0.9rem; }
  .fgrid { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; }
  .fgrid3 { grid-template-columns:1fr 1fr 1fr; }
  .ff { display:flex; flex-direction:column; gap:0.28rem; }
  .ff label { font-family:'DM Mono',monospace; font-size:0.6rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--dust); }
  .ff input,.ff select,.ff textarea { padding:0.42rem 0.65rem; border:1px solid rgba(26,18,8,0.15); background:white; font-family:'DM Sans',sans-serif; font-size:0.86rem; outline:none; border-radius:2px; transition:border-color 0.15s; }
  .ff input:focus,.ff select:focus,.ff textarea:focus { border-color:var(--amber); }
  .ff textarea { resize:vertical; min-height:68px; }
  .tled { display:grid; grid-template-columns:1fr 1fr; gap:1.1rem; }
  .tled h4 { font-family:'DM Mono',monospace; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--amber); margin-bottom:0.6rem; }
  .tir { display:flex; gap:0.38rem; margin-bottom:0.38rem; align-items:center; }
  .tir span { font-family:'DM Mono',monospace; font-size:0.65rem; color:var(--dust); width:1.1rem; flex-shrink:0; }
  .tir input { flex:1; padding:0.3rem 0.52rem; border:1px solid rgba(26,18,8,0.15); background:white; font-family:'DM Sans',sans-serif; font-size:0.82rem; outline:none; border-radius:2px; }
  .tir input:focus { border-color:var(--amber); }
  .rm-t { background:none; border:none; color:var(--dust); cursor:pointer; font-size:0.88rem; padding:0 0.12rem; transition:color 0.15s; }
  .rm-t:hover { color:var(--red); }
  .add-t { background:none; border:1px dashed rgba(200,134,42,0.4); color:var(--amber); padding:0.26rem 0.6rem; font-family:'DM Mono',monospace; font-size:0.65rem; cursor:pointer; border-radius:2px; transition:all 0.15s; margin-top:0.18rem; }
  .add-t:hover { background:var(--amber); color:var(--ink); border-style:solid; }
  .save-btn { width:100%; padding:0.85rem; background:var(--amber); color:var(--ink); border:none; font-family:'DM Mono',monospace; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.12em; cursor:pointer; font-weight:500; transition:all 0.2s; margin-top:0.75rem; border-radius:2px; }
  .save-btn:hover:not(:disabled) { background:var(--ink); color:var(--amber); }
  .save-btn:disabled { opacity:0.4; cursor:not-allowed; }
  .toast { position:fixed; bottom:1.25rem; right:1.25rem; background:var(--ink); color:var(--amber); padding:0.6rem 1rem; font-family:'DM Mono',monospace; font-size:0.72rem; letter-spacing:0.06em; z-index:999; box-shadow:0 8px 32px rgba(0,0,0,0.3); animation:sIn 0.3s ease; border-radius:2px; }
  .toast.err { color:#FF8A8A; }
  @keyframes sIn { from{transform:translateX(120%);opacity:0} to{transform:translateX(0);opacity:1} }
  .spin { width:13px; height:13px; border:2px solid rgba(200,134,42,0.3); border-top-color:var(--amber); border-radius:50%; animation:sp 0.8s linear infinite; display:inline-block; }
  @keyframes sp { to{transform:rotate(360deg)} }
  .empty { text-align:center; padding:3.5rem 2rem; color:var(--dust); }
  .empty p { font-family:'Playfair Display',serif; font-size:1.15rem; font-style:italic; margin-top:0.85rem; }
  .zoom-ov { position:fixed; inset:0; background:rgba(0,0,0,0.96); z-index:300; display:flex; align-items:center; justify-content:center; cursor:zoom-out; }
  .zoom-ov img { max-width:92vw; max-height:92vh; object-fit:contain; }
  @media(max-width:600px){
    .main{padding:0.9rem;}
    .gal{grid-template-columns:repeat(auto-fill,minmax(125px,1fr));gap:0.8rem;}
    .mod-fields{grid-template-columns:1fr 1fr;}
    .fgrid{grid-template-columns:1fr;}
    .fgrid3{grid-template-columns:1fr 1fr;}
    .tled{grid-template-columns:1fr;}
    .tl{grid-template-columns:1fr;}
    .lhdr,.lr{grid-template-columns:48px 1fr 55px;}
    .lhdr>*:nth-child(n+4),.lr>*:nth-child(n+4){display:none;}
  }
`;

// ── Vinyl SVG icon ────────────────────────────────────────────────────────────
function VI({ s = 48, c = "#fff" }) {
  return (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="22" stroke={c} strokeWidth="2"/>
      <circle cx="24" cy="24" r="15" stroke={c} strokeWidth="1" strokeDasharray="3 2"/>
      <circle cx="24" cy="24" r="8" stroke={c} strokeWidth="1"/>
      <circle cx="24" cy="24" r="3" fill={c}/>
    </svg>
  );
}

function b64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("col");
  const [dm, setDm] = useState("gal");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [fg, setFg] = useState("");
  const [fc, setFc] = useState("");
  const [sel, setSel] = useState(null);
  const [zoom, setZoom] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setRecords(await sbSelect("records", "?select=*,images(*)&order=artist.asc")); }
    catch { msg("Error loading", "err"); }
    setLoading(false);
  }

  function msg(text, type = "ok") {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3400);
  }

  const gi = (rec, type) => rec.images?.find(i => i.type === type)?.url;

  const filtered = records.filter(r => {
    const s = q.toLowerCase();
    return (!s || r.artist?.toLowerCase().includes(s) || r.album?.toLowerCase().includes(s) ||
      (r.tracklist_a||[]).some(t=>t.toLowerCase().includes(s)) ||
      (r.tracklist_b||[]).some(t=>t.toLowerCase().includes(s))) &&
      (!fg || r.genre === fg) && (!fc || r.condition === fc);
  });

  return (
    <>
      <style>{css}</style>
      <header className="hdr">
        <div className="hdr-logo"><VI s={25} c="#C8862A" /> Vinyl Archive <em>/ collection</em></div>
        <nav className="hdr-nav">
          <button className={`nb ${view!=="add"?"on":""}`} onClick={()=>setView("col")}>Collection</button>
          <button className={`nb ${view==="add"?"on":""}`} onClick={()=>setView("add")}>+ Add</button>
        </nav>
      </header>

      <main className="main">
        {view !== "add" ? (
          <>
            <div className="sbar">
              <input className="si" placeholder="Search artist, album, track…" value={q} onChange={e=>setQ(e.target.value)} />
              <select className="fs" value={fg} onChange={e=>setFg(e.target.value)}>
                <option value="">All genres</option>
                {GENRES.map(g=><option key={g}>{g}</option>)}
              </select>
              <select className="fs" value={fc} onChange={e=>setFc(e.target.value)}>
                <option value="">All conditions</option>
                {CONDITIONS.map(c=><option key={c}>{c}</option>)}
              </select>
              <div className="vtog">
                <button className={`vb ${dm==="gal"?"on":""}`} onClick={()=>setDm("gal")}>⊞</button>
                <button className={`vb ${dm==="list"?"on":""}`} onClick={()=>setDm("list")}>☰</button>
              </div>
            </div>

            <div className="stbar">
              {loading ? "Loading…" : `${filtered.length} record${filtered.length!==1?"s":""}${records.length!==filtered.length?` of ${records.length}`:""}`}
            </div>

            {loading ? (
              <div className="empty"><div className="spin" style={{width:30,height:30,margin:"0 auto"}} /></div>
            ) : filtered.length === 0 ? (
              <div className="empty"><VI s={56} c="#8C7B5E" /><p>No records found</p></div>
            ) : dm === "gal" ? (
              <div className="gal">
                {filtered.map(r => (
                  <div key={r.id} className="rc" onClick={()=>setSel(r)}>
                    {gi(r,"front") ? <img className="rc-img" src={gi(r,"front")} alt={r.album} /> : <div className="rc-ph"><VI s={52} /></div>}
                    <div className="rc-info">
                      <div className="rc-art">{r.artist}</div>
                      <div className="rc-alb">{r.album}</div>
                      <div className="rc-yr">{[r.year,r.genre].filter(Boolean).join(" · ")}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="lv">
                <div className="lhdr"><span/><span>Artist</span><span>Album</span><span>Year</span><span>Genre</span><span>Cond.</span></div>
                {filtered.map(r => (
                  <div key={r.id} className="lr" onClick={()=>setSel(r)}>
                    {gi(r,"front") ? <img className="lt" src={gi(r,"front")} alt="" /> : <div className="lt-ph"><VI s={20} /></div>}
                    <div className="l-art">{r.artist}</div>
                    <div className="l-alb">{r.album}</div>
                    <div className="l-m">{r.year||"—"}</div>
                    <div className="l-m">{r.genre||"—"}</div>
                    <div className="l-m">{r.condition||"—"}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <AddForm onSaved={()=>{setView("col");load();msg("Record saved!");}} onMsg={msg} />
        )}
      </main>

      {sel && (
        <div className="ov" onClick={e=>e.target===e.currentTarget&&setSel(null)}>
          <div className="mod">
            <div className="mod-in">
              <button className="cls-btn" onClick={()=>setSel(null)}>×</button>
              <div className="mod-photos">
                {[["front","Front cover"],["back","Back cover"],["label","Label"]].map(([t,l])=>(
                  <div key={t}>
                    <div className="ph-lbl">{l}</div>
                    {gi(sel,t) ? <img className="mod-img" src={gi(sel,t)} alt={l} onClick={()=>setZoom(gi(sel,t))} /> : <div className="mod-img-ph"><VI s={34} /></div>}
                  </div>
                ))}
              </div>
              <div className="mod-art">{sel.artist}</div>
              <div className="mod-title">{sel.album}</div>
              {sel.edition && <div style={{fontFamily:"DM Mono",fontSize:"0.7rem",color:"var(--dust)",marginBottom:"0.9rem"}}>{sel.edition}</div>}
              <div className="mod-fields">
                {[["Year",sel.year],["Label",sel.label],["Country",sel.country],["Genre",sel.genre],["Speed",sel.speed?`${sel.speed} RPM`:null],["Condition",sel.condition],["Catalog №",sel.catalog_number]]
                  .filter(([,v])=>v)
                  .map(([l,v])=>(
                    <div key={l} className="mf"><label>{l}</label><p>{v}</p></div>
                  ))}
              </div>
              {((sel.tracklist_a?.length>0)||(sel.tracklist_b?.length>0)) && (
                <div className="tl">
                  {[["Side A",sel.tracklist_a],["Side B",sel.tracklist_b]].map(([s,tracks])=>(
                    <div key={s} className="tl-side">
                      <h4>{s}</h4>
                      {(tracks||[]).map((t,i)=>(
                        <div key={i} className="ti"><span className="tn">{i+1}</span><span>{t}</span></div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              {sel.notes && <div className="mod-notes">"{sel.notes}"</div>}
              <button className="del-btn" onClick={async()=>{
                if(!window.confirm("Delete this record?")) return;
                await sbDelete("records",sel.id);
                setSel(null); load(); msg("Record deleted");
              }}>Delete record</button>
            </div>
          </div>
        </div>
      )}

      {zoom && <div className="zoom-ov" onClick={()=>setZoom(null)}><img src={zoom} alt="zoom" /></div>}
      {toast && <div className={`toast ${toast.type==="err"?"err":""}`}>{toast.text}</div>}
    </>
  );
}

// ── Add form ─────────────────────────────────────────────────────────────────
function AddForm({ onSaved, onMsg }) {
  const [ph, setPh] = useState({front:null,back:null,label:null});
  const [pv, setPv] = useState({front:null,back:null,label:null});
  const [aiSt, setAiSt] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const ef = {artist:"",album:"",year:"",label:"",country:"",genre:"",speed:"33",condition:"",edition:"",catalog_number:"",notes:"",tracklist_a:[""],tracklist_b:[""]};
  const [f, setF] = useState(ef);

  // Hidden file input refs — one per photo type × source
  const camRef = { front: useRef(null), back: useRef(null), label: useRef(null) };
  const galRef = { front: useRef(null), back: useRef(null), label: useRef(null) };

  function onFileChange(type, e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPh(p => ({...p, [type]: file}));
    setPv(p => ({...p, [type]: URL.createObjectURL(file)}));
    e.target.value = "";
  }

  async function analyze() {
    const avail = Object.entries(ph).filter(([,v])=>v);
    if(!avail.length){onMsg("Upload at least one photo first","err");return;}
    setAnalyzing(true); setAiSt("Converting images…");
    try {
      const content = [];
      for(const [type,file] of avail){
        const data = await b64(file);
        content.push({type:"image",source:{type:"base64",media_type:file.type||"image/jpeg",data}});
        content.push({type:"text",text:`This is the ${type==="front"?"front cover":type==="back"?"back cover":"record label (galleta)"} of a vinyl record.`});
      }
      content.push({type:"text",text:`Analyze these vinyl record images and extract all visible information.
Return ONLY a valid JSON object (no markdown, no backticks, no extra text) with exactly these fields:
{"artist":"","album":"","year":"","label":"","country":"","genre":"","speed":"","catalog_number":"","edition":"","tracklist_a":[],"tracklist_b":[]}
Rules: leave fields empty string if not visible. speed must be "33","45","78" or "". genre must be one of: Blues,Classical,Country,Electronic,Folk,Funk,Jazz,Latin,Pop,Punk,R&B / Soul,Reggae,Rock,Soundtrack,World — or "". tracklist arrays contain track title strings, empty array if none visible.`});
      setAiSt("Claude is reading your vinyl…");
      const res = await fetch("/.netlify/functions/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 1000, messages: [{ role: "user", content }] }),
      });
      const d = await res.json();
      const txt = d.content?.find(b=>b.type==="text")?.text||"";
      const p = JSON.parse(txt.replace(/```json|```/g,"").trim());
      setF(prev=>({
        ...prev,
        artist:p.artist||prev.artist, album:p.album||prev.album, year:p.year||prev.year,
        label:p.label||prev.label, country:p.country||prev.country,
        genre:GENRES.includes(p.genre)?p.genre:prev.genre,
        speed:["33","45","78"].includes(String(p.speed))?String(p.speed):prev.speed,
        catalog_number:p.catalog_number||prev.catalog_number,
        edition:p.edition||prev.edition,
        tracklist_a:p.tracklist_a?.length>0?p.tracklist_a:prev.tracklist_a,
        tracklist_b:p.tracklist_b?.length>0?p.tracklist_b:prev.tracklist_b,
      }));
      setAiSt("✓ Fields filled — review and confirm");
    } catch(e) {
      console.error(e); onMsg("AI analysis failed — fill manually","err"); setAiSt("");
    } finally { setAnalyzing(false); }
  }

  const u = (k,v) => setF(p=>({...p,[k]:v}));
  const ut = (side,i,v) => { const k=side==="A"?"tracklist_a":"tracklist_b"; setF(p=>{const l=[...p[k]];l[i]=v;return{...p,[k]:l};}); };
  const at = side => { const k=side==="A"?"tracklist_a":"tracklist_b"; setF(p=>({...p,[k]:[...p[k],""]})); };
  const rt = (side,i) => { const k=side==="A"?"tracklist_a":"tracklist_b"; setF(p=>{const l=p[k].filter((_,x)=>x!==i);return{...p,[k]:l.length?l:[""]};}); };

  async function save() {
    if(!f.artist||!f.album){onMsg("Artist and album required","err");return;}
    setSaving(true);
    try {
      const [rec] = await sbInsert("records",{
        artist:f.artist, album:f.album, year:f.year?parseInt(f.year):null,
        label:f.label||null, country:f.country||null, genre:f.genre||null,
        speed:f.speed||null, condition:f.condition||null, edition:f.edition||null,
        catalog_number:f.catalog_number||null, notes:f.notes||null,
        tracklist_a:f.tracklist_a.filter(t=>t.trim()),
        tracklist_b:f.tracklist_b.filter(t=>t.trim()),
      });
      for(const [type,file] of Object.entries(ph)){
        if(!file) continue;
        const ext = file.name.split(".").pop()||"jpg";
        const url = await sbUpload(`${rec.id}/${type}.${ext}`,file);
        await sbInsert("images",{record_id:rec.id,type,url});
      }
      onSaved();
    } catch(e) {
      console.error(e); onMsg("Error saving","err");
    } finally { setSaving(false); }
  }

  return (
    <div className="form-wrap">
      <div className="ft">Add a new record</div>
      <div className="fs2">Photos → AI fills fields → Review → Save</div>

      {/* Hidden file inputs — camera */}
      {["front","back","label"].map(k => (
        <input key={`cam-${k}`} ref={camRef[k]} type="file" accept="image/*" capture="environment"
          style={{display:"none"}} onChange={e=>onFileChange(k,e)} />
      ))}
      {/* Hidden file inputs — gallery */}
      {["front","back","label"].map(k => (
        <input key={`gal-${k}`} ref={galRef[k]} type="file" accept="image/*"
          style={{display:"none"}} onChange={e=>onFileChange(k,e)} />
      ))}

      <div className="pzones">
        {[["front","Front"],["back","Back"],["label","Label"]].map(([k,l])=>(
          <div key={k} className={`pz ${pv[k]?"filled":""}`}>
            {pv[k] ? (
              <>
                <img src={pv[k]} alt={l} />
                <div className="pz-ov">
                  <button className="pz-ov-btn" onClick={e=>{e.stopPropagation();camRef[k].current.click();}}>📷 Camera</button>
                  <button className="pz-ov-btn" onClick={e=>{e.stopPropagation();galRef[k].current.click();}}>🖼 Gallery</button>
                </div>
              </>
            ) : (
              <>
                <VI s={26} c="#8C7B5E" />
                <div className="pz-lbl">{l}</div>
                <div className="pz-actions">
                  <button className="pz-action-btn" onClick={e=>{e.stopPropagation();camRef[k].current.click();}}>📷 Camera</button>
                  <button className="pz-action-btn" onClick={e=>{e.stopPropagation();galRef[k].current.click();}}>🖼 Gallery</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <button className="ai-btn" onClick={analyze} disabled={analyzing||!Object.values(ph).some(Boolean)}>
        {analyzing ? <><span className="spin"/>Analyzing…</> : "✦ Analyze with AI"}
      </button>
      {aiSt && <div className="ai-st">{aiSt}</div>}

      <div className="fsec">
        <div className="fsec-t">Record info</div>
        <div className="fgrid" style={{marginBottom:"0.75rem"}}>
          <div className="ff"><label>Artist *</label><input value={f.artist} onChange={e=>u("artist",e.target.value)} placeholder="Artist or band" /></div>
          <div className="ff"><label>Album *</label><input value={f.album} onChange={e=>u("album",e.target.value)} placeholder="Album title" /></div>
        </div>
        <div className="fgrid fgrid3">
          <div className="ff"><label>Year</label><input type="number" value={f.year} onChange={e=>u("year",e.target.value)} placeholder="1972" /></div>
          <div className="ff"><label>Label</label><input value={f.label} onChange={e=>u("label",e.target.value)} placeholder="Blue Note…" /></div>
          <div className="ff"><label>Country</label><input value={f.country} onChange={e=>u("country",e.target.value)} placeholder="USA, UK…" /></div>
          <div className="ff"><label>Genre</label>
            <select value={f.genre} onChange={e=>u("genre",e.target.value)}>
              <option value="">Select…</option>{GENRES.map(g=><option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="ff"><label>Speed</label>
            <select value={f.speed} onChange={e=>u("speed",e.target.value)}>
              {SPEEDS.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="ff"><label>Condition</label>
            <select value={f.condition} onChange={e=>u("condition",e.target.value)}>
              <option value="">Select…</option>{CONDITIONS.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="ff"><label>Catalog №</label><input value={f.catalog_number} onChange={e=>u("catalog_number",e.target.value)} /></div>
          <div className="ff" style={{gridColumn:"span 2"}}><label>Edition</label><input value={f.edition} onChange={e=>u("edition",e.target.value)} placeholder="Original, Reissue…" /></div>
        </div>
      </div>

      <div className="fsec">
        <div className="fsec-t">Tracklist</div>
        <div className="tled">
          {["A","B"].map(side=>{
            const key=side==="A"?"tracklist_a":"tracklist_b";
            return (
              <div key={side}>
                <h4>Side {side}</h4>
                {f[key].map((t,i)=>(
                  <div key={i} className="tir">
                    <span>{i+1}</span>
                    <input value={t} onChange={e=>ut(side,i,e.target.value)} placeholder={`Track ${i+1}`} />
                    <button className="rm-t" onClick={()=>rt(side,i)}>×</button>
                  </div>
                ))}
                <button className="add-t" onClick={()=>at(side)}>+ Add</button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="fsec">
        <div className="fsec-t">Personal notes</div>
        <div className="ff"><textarea value={f.notes} onChange={e=>u("notes",e.target.value)} placeholder="Where you got it, memories…" rows={3} /></div>
      </div>

      <button className="save-btn" onClick={save} disabled={saving}>
        {saving?"Saving…":"Save to collection"}
      </button>
    </div>
  );
}
