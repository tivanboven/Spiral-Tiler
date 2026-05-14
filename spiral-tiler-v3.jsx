import { useState, useEffect, useRef, useCallback } from "react";

const FONT = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&display=swap";

const GS = 13, GM = 6;
const KNIGHT     = [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]];
const RESOS      = [["100",100],["1K",1e3],["10K",1e4],["100K",1e5],["1M",1e6],["4M",4e6]];
const DCOLS      = ["#ff4040","#3d88ff","#40dd80","#ffcc33"];
const PIECE_NAMES = ["Red","Blue","Green","Yellow"];

const enc = (dx, dy) => `${dx},${dy}`;
const dec = s => s.split(",").map(Number);
const mkKnight = () => new Set(KNIGHT.map(([dx,dy]) => enc(dx,dy)));
const h2r = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];

// ── Spiral ────────────────────────────────────────────────────────────────────
function mkSpiral(N) {
  const X = new Int16Array(N), Y = new Int16Array(N);
  let x=0,y=0,dx=1,dy=0,seg=1,pos=0,t=0;
  for (let i=1;i<N;i++) {
    x+=dx; y+=dy; X[i]=x; Y[i]=y;
    if (++pos===seg) { pos=0; const _=dx; dx=-dy; dy=_; if(++t%2===0) seg++; }
  }
  return [X,Y];
}

// ── Algorithm ─────────────────────────────────────────────────────────────────
function mkAlgo(active, N, ownBlocks) {
  const SN   = Math.min(N*2, 12_000_000);
  const HALF = Math.ceil(Math.sqrt(SN)/2)+6;
  const GW   = 2*HALF+1;
  const occ  = new Uint8Array(GW*GW);
  const atk  = new Uint8Array(GW*GW);
  const K    = active.length;
  const mvs  = active.map(p => Array.from(p.moves).map(dec));
  const [SX,SY] = mkSpiral(SN);
  const ptrs = new Array(K).fill(0);
  let placed = 0;
  return {
    occ, GW, HALF,
    get placed() { return placed; },
    step(chunk) {
      const lim = Math.min(placed+chunk, N);
      outer: while (placed < lim) {
        const gi    = placed % K;
        const gbit  = 1 << gi;
        const emask = ownBlocks ? 0xFF : ((1<<K)-1) & ~gbit;
        for (;;) {
          if (ptrs[gi] >= SN) break outer;
          const si = ptrs[gi]++;
          const sx = SX[si], sy = SY[si];
          if (sx<-HALF||sx>HALF||sy<-HALF||sy>HALF) continue;
          const oi = (sy+HALF)*GW+(sx+HALF);
          if (occ[oi]||(atk[oi]&emask)) continue;
          occ[oi] = gi+1;
          const ml = mvs[gi];
          for (let m=0;m<ml.length;m++) {
            const tx=sx+ml[m][0], ty=sy+ml[m][1];
            if (tx>=-HALF&&tx<=HALF&&ty>=-HALF&&ty<=HALF)
              atk[(ty+HALF)*GW+(tx+HALF)] |= gbit;
          }
          placed++; continue outer;
        }
        break;
      }
      return placed >= N;
    }
  };
}

// ── Move Grid ─────────────────────────────────────────────────────────────────
function MoveGrid({ moves, color, onChange }) {
  const toggle = (dx,dy) => {
    if (!dx&&!dy) return;
    const s = new Set(moves), k = enc(dx,dy);
    s.has(k) ? s.delete(k) : s.add(k); onChange(s);
  };
  const ops = [
    ["↔ X",   () => { const s=new Set(moves); for(const k of moves){const[a,b]=dec(k);s.add(enc(-a,b));} onChange(s); }],
    ["↕ Y",   () => { const s=new Set(moves); for(const k of moves){const[a,b]=dec(k);s.add(enc(a,-b));} onChange(s); }],
    ["↻ 90°", () => { const s=new Set(); for(const k of moves){const[a,b]=dec(k);s.add(enc(-b,a));} onChange(s); }],
    ["clear", () => onChange(new Set())],
  ];
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${GS},16px)`,
        gap:1, background:"#06060d", padding:2, width:"fit-content", border:"1px solid #18182a" }}>
        {Array.from({length:GS*GS},(_,i)=>{
          const r=Math.floor(i/GS), c=i%GS, dx=c-GM, dy=r-GM;
          const ctr=!dx&&!dy, act=moves.has(enc(dx,dy));
          return <div key={i} onClick={()=>toggle(dx,dy)} style={{
            width:16,height:16, background:ctr?"#28284a":act?color:"#10101c",
            border:`1px solid ${act&&!ctr?color+"60":"#18182a"}`,
            boxSizing:"border-box", cursor:ctr?"default":"pointer", transition:"background .06s",
          }}/>;
        })}
      </div>
      <div style={{ display:"flex", gap:3, marginTop:5 }}>
        {ops.map(([l,fn]) => (
          <button key={l} onClick={fn} style={{
            padding:"2px 7px", fontSize:9, cursor:"pointer",
            background:"transparent", color:"#b0b0d0",
            border:"1px solid #2a2a40", fontFamily:"inherit", letterSpacing:0.5,
          }}>{l}</button>
        ))}
      </div>
    </div>
  );
}

// ── Piece Card ────────────────────────────────────────────────────────────────
function PieceCard({ piece, active, onSelect, onUpdate, dgStart, dgOver, dgDrop }) {
  return (
    <div draggable onDragStart={dgStart} onDragOver={e=>{e.preventDefault();dgOver();}} onDrop={dgDrop}
      onClick={onSelect} style={{
        display:"flex", alignItems:"center", gap:6, padding:"6px 10px",
        background:active?"#0c0c1a":"transparent",
        borderLeft:`2px solid ${active?piece.color:"#16162a"}`,
        borderBottom:"1px solid #0e0e1a", cursor:"pointer", userSelect:"none",
      }}>
      <span style={{ color:"#666688", fontSize:11, cursor:"grab" }}>⠿</span>
      <div style={{ width:10, height:10, background:piece.enabled?piece.color:"#252538",
        flexShrink:0, outline:piece.enabled?`1px solid ${piece.color}44`:"none", outlineOffset:1 }}/>
      <input value={piece.name} onClick={e=>e.stopPropagation()}
        onChange={e=>onUpdate({...piece,name:e.target.value})}
        style={{ flex:1, background:"transparent", border:"none",
          color:active?"#eeeef8":"#aaaacc", fontSize:10,
          outline:"none", fontFamily:"inherit", minWidth:0 }}/>
      <input type="color" value={piece.color} onClick={e=>e.stopPropagation()}
        onChange={e=>onUpdate({...piece,color:e.target.value})}
        style={{ width:18, height:18, padding:0, border:"none", background:"none", cursor:"pointer", flexShrink:0 }}/>
      <input type="checkbox" checked={piece.enabled} onClick={e=>e.stopPropagation()}
        onChange={e=>onUpdate({...piece,enabled:e.target.checked})}
        style={{ flexShrink:0, accentColor:piece.color }}/>
    </div>
  );
}

// ── Visualization Canvas ──────────────────────────────────────────────────────
function VizCanvas({ occ, GW, colors, version, isDone }) {
  const cvRef = useRef(null);
  const vp    = useRef({ zoom:1, px:0, py:0, drag:false, lx:0, ly:0, ready:false });
  const bmRef = useRef(null);
  const lastBuildMs = useRef(0);
  const building    = useRef(false);

  const [generating,  setGenerating]  = useState(false);
  const [previewData, setPreviewData] = useState(null);
  // previewData = { url: string (data URL), blob: Blob }
  const [saveStatus,  setSaveStatus]  = useState("");
  const [pressedBtn,  setPressedBtn]  = useState(null);

  // ── Canvas draw ─────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const cv = cvRef.current;
    if (!cv||!bmRef.current) return;
    const ctx = cv.getContext("2d");
    const { zoom, px, py } = vp.current;
    const b = bmRef.current;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0,0,cv.width,cv.height);
    ctx.imageSmoothingEnabled = zoom < 4;
    ctx.drawImage(b, cv.width/2+px-b.width*zoom/2, cv.height/2+py-b.height*zoom/2, b.width*zoom, b.height*zoom);
    const cx=cv.width/2+px, cy=cv.height/2+py;
    ctx.strokeStyle="rgba(80,80,200,0.12)"; ctx.lineWidth=1; ctx.setLineDash([3,5]);
    ctx.beginPath(); ctx.moveTo(cx,0); ctx.lineTo(cx,cv.height);
    ctx.moveTo(0,cy); ctx.lineTo(cv.width,cy); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle="rgba(60,60,120,0.35)"; ctx.font="9px 'IBM Plex Mono',monospace"; ctx.textAlign="right";
    ctx.fillText(`${zoom<1?zoom.toFixed(3):zoom.toFixed(1)}×  ·  grid ${GW}×${GW}`, cv.width-10, cv.height-9);
  }, [GW]);

  // ── Bitmap rebuild ───────────────────────────────────────────────────────────
  const buildBitmap = useCallback(() => {
    if (!occ||!GW||building.current) return;
    building.current = true; lastBuildMs.current = Date.now();
    const rgb = colors.map(h2r);
    const buf = new Uint8ClampedArray(GW*GW*4).fill(255);
    for (let i=0;i<GW*GW;i++) {
      const g=occ[i], b=i<<2;
      if (g===0) { buf[b]=255; buf[b+1]=255; buf[b+2]=255; }
      else { const[r,gg,bl]=rgb[g-1]; buf[b]=r; buf[b+1]=gg; buf[b+2]=bl; }
    }
    createImageBitmap(new ImageData(buf,GW,GW)).then(bitmap => {
      bmRef.current = bitmap; building.current = false;
      if (!vp.current.ready) {
        const cv=cvRef.current;
        if (cv) { vp.current.zoom=Math.min(cv.width,cv.height)/GW*0.88; vp.current.ready=true; }
      }
      draw();
    });
  }, [occ,GW,colors,draw]);

  useEffect(() => {
    const now = Date.now();
    if (!isDone && now-lastBuildMs.current<250) return;
    buildBitmap();
  }, [version, isDone, buildBitmap]);

  // ── Mouse / wheel ────────────────────────────────────────────────────────────
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const onWheel = e => {
      e.preventDefault();
      const f = e.deltaY<0?1.25:0.8;
      const r = cv.getBoundingClientRect();
      const mx=e.clientX-r.left-cv.width/2, my=e.clientY-r.top-cv.height/2;
      const {zoom:z,px,py} = vp.current;
      const nz = Math.max(0.002,Math.min(300,z*f));
      vp.current.px=mx+(px-mx)*(nz/z); vp.current.py=my+(py-my)*(nz/z); vp.current.zoom=nz; draw();
    };
    const onDown = e => { vp.current.drag=true; vp.current.lx=e.clientX; vp.current.ly=e.clientY; };
    const onMove = e => {
      if (!vp.current.drag) return;
      vp.current.px+=e.clientX-vp.current.lx; vp.current.py+=e.clientY-vp.current.ly;
      vp.current.lx=e.clientX; vp.current.ly=e.clientY; draw();
    };
    const onUp = () => { vp.current.drag=false; };
    cv.addEventListener("wheel",onWheel,{passive:false});
    cv.addEventListener("mousedown",onDown);
    window.addEventListener("mousemove",onMove);
    window.addEventListener("mouseup",onUp);
    return () => {
      cv.removeEventListener("wheel",onWheel); cv.removeEventListener("mousedown",onDown);
      window.removeEventListener("mousemove",onMove); window.removeEventListener("mouseup",onUp);
    };
  }, [draw]);

  // ── Resize ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ro = new ResizeObserver(([entry]) => {
      const {width,height}=entry.contentRect; cv.width=width; cv.height=height; draw();
    });
    ro.observe(cv); cv.width=cv.offsetWidth; cv.height=cv.offsetHeight;
    return () => ro.disconnect();
  }, [draw]);

  const resetView = () => {
    const cv=cvRef.current; if (!cv||!GW) return;
    vp.current.zoom=Math.min(cv.width,cv.height)/GW*0.88; vp.current.px=0; vp.current.py=0; draw();
  };

  // ── Generate 8k image ────────────────────────────────────────────────────────
  const openPreview = useCallback(() => {
    if (!occ||!GW||generating) return;
    setGenerating(true); setSaveStatus("");
    const OUT=8000, rgb=colors.map(h2r);
    const buf=new Uint8ClampedArray(GW*GW*4).fill(255);
    let x0=GW, x1=0, y0=GW, y1=0;
    for (let y=0;y<GW;y++) for (let x=0;x<GW;x++) {
      const i=y*GW+x, b=i<<2, g=occ[i];
      if (g===0) { buf[b]=255; buf[b+1]=255; buf[b+2]=255; }
      else { const[r,gg,bl]=rgb[g-1]; buf[b]=r; buf[b+1]=gg; buf[b+2]=bl;
        if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
      buf[b+3]=255;
    }
    if (x1<x0) { setGenerating(false); return; }
    createImageBitmap(new ImageData(buf,GW,GW), x0,y0, x1-x0+1,y1-y0+1)
      .then(bm => {
        const cv=document.createElement("canvas"); cv.width=OUT; cv.height=OUT;
        const ctx=cv.getContext("2d"); ctx.fillStyle="#ffffff"; ctx.fillRect(0,0,OUT,OUT);
        ctx.imageSmoothingEnabled=false; ctx.drawImage(bm,0,0,OUT,OUT);
        const url=cv.toDataURL("image/png");
        cv.toBlob(blob => { setPreviewData({url, blob:blob??null}); setGenerating(false); }, "image/png");
      })
      .catch(() => setGenerating(false));
  }, [occ,GW,colors,generating]);

  const closePreview = useCallback(() => { setPreviewData(null); setSaveStatus(""); }, []);

  // ── Save actions (called directly from taps for gesture context) ─────────────
  const status = (msg, ms=3000) => { setSaveStatus(msg); if (ms) setTimeout(()=>setSaveStatus(""),ms); };

  const doDownload = () => {
    try {
      const a=document.createElement("a"); a.href=previewData.url;
      a.download="spiral-tiler-8000x8000.png";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      status("Download triggered — check notifications / Files");
    } catch(e) { status("Download failed: "+e.message); }
  };

  const doShare = () => {
    if (!previewData?.blob) return;
    const file=new File([previewData.blob],"spiral-tiler-8000x8000.png",{type:"image/png"});
    navigator.share({files:[file],title:"Spiral Tiler Pattern"})
      .then(()=>status("Shared!"))
      .catch(e=>status(e.name==="AbortError"?"Share cancelled":"Share failed: "+e.message));
  };

  const doOpenBrowser = () => {
    // Wraps the image in a minimal HTML page so the browser can display + save it
    const html=`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#111}img{width:100%;display:block}</style></head><body><img src="${previewData.url}"></body></html>`;
    const blob=new Blob([html],{type:"text/html"});
    const u=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=u; a.target="_blank";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(u), 60000);
    status("Opening — if nothing happens, try Download");
  };

  const doCopy = async () => {
    if (!previewData?.blob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({"image/png":previewData.blob})]);
      status("✓ Copied to clipboard!");
    } catch(e) { status("Copy unavailable ("+e.name+")"); }
  };

  // ── Shared button styles ─────────────────────────────────────────────────────
  const overlayBtn = {
    padding:"4px 10px", background:"rgba(8,8,18,0.80)", border:"1px solid #2a2a44",
    fontFamily:"IBM Plex Mono,monospace", fontSize:9, letterSpacing:1, cursor:"pointer",
    backdropFilter:"blur(4px)",
  };

  const mkModalBtn = (id, extra={}) => ({
    padding:"10px 18px", borderRadius:4,
    fontFamily:"IBM Plex Mono,monospace", fontSize:11, letterSpacing:1, cursor:"pointer",
    color:"#d0d0f0", border:"1px solid #3a3a60",
    background: pressedBtn===id ? "#252545" : "#0e0e22",
    transform: pressedBtn===id ? "scale(0.95)" : "scale(1)",
    transition:"background 0.08s, transform 0.08s",
    ...extra,
  });

  const press   = id => () => setPressedBtn(id);
  const release = ()  => setPressedBtn(null);

  return (
    <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
      <canvas ref={cvRef} style={{ width:"100%", height:"100%", display:"block", cursor:"crosshair" }}/>

      <button onClick={resetView} title="Reset zoom and pan"
        style={{ ...overlayBtn, position:"absolute", bottom:14, right:14, color:"#9090cc" }}>
        [ fit ]
      </button>

      <button onClick={openPreview} disabled={!isDone||generating}
        title={isDone?"Open 8000×8000 export":"Run a pattern first"}
        style={{
          ...overlayBtn, position:"absolute", bottom:14, right:68,
          color:  generating?"#555580":!isDone?"#555580":"#66dd66",
          border:`1px solid ${isDone&&!generating?"#2a5a2a":"#2a2a44"}`,
          cursor: isDone&&!generating?"pointer":"default",
          transition:"color .2s, border-color .2s",
        }}>
        {generating?"[ rendering… ]":"[ ↓ 8k png ]"}
      </button>

      {/* ── Export modal ──────────────────────────────────────────────────── */}
      {previewData && (
        <div onClick={closePreview} style={{
          position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.95)",
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16,
        }}>
          {/* Image preview */}
          <img src={previewData.url} alt="8000×8000 export"
            onClick={e=>e.stopPropagation()}
            style={{ maxWidth:"92vw", maxHeight:"55vh", imageRendering:"pixelated",
              border:"1px solid #2a2a50", display:"block" }}/>

          {/* Action buttons */}
          <div onClick={e=>e.stopPropagation()}
            style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center", padding:"0 16px" }}>

            <button
              onPointerDown={press("dl")} onPointerUp={release} onPointerLeave={release}
              onClick={doDownload} style={mkModalBtn("dl")}>
              ⬇ Download
            </button>

            {(navigator.share||navigator.canShare) && (
              <button
                onPointerDown={press("sh")} onPointerUp={release} onPointerLeave={release}
                onClick={doShare} style={mkModalBtn("sh")}>
                ⬆ Share
              </button>
            )}

            <button
              onPointerDown={press("ob")} onPointerUp={release} onPointerLeave={release}
              onClick={doOpenBrowser} style={mkModalBtn("ob")}>
              🌐 Open in browser
            </button>

            {navigator.clipboard?.write && (
              <button
                onPointerDown={press("cp")} onPointerUp={release} onPointerLeave={release}
                onClick={doCopy} style={mkModalBtn("cp")}>
                📋 Copy
              </button>
            )}

            <button
              onPointerDown={press("cl")} onPointerUp={release} onPointerLeave={release}
              onClick={closePreview} style={mkModalBtn("cl",{color:"#666688",borderColor:"#2a2a44"})}>
              ✕ Close
            </button>
          </div>

          {/* Status feedback */}
          <div style={{ minHeight:18, fontSize:10, color: saveStatus.startsWith("✓")?"#66dd66":"#9090cc",
            fontFamily:"IBM Plex Mono,monospace", letterSpacing:1 }}>
            {saveStatus}
          </div>

          <div style={{ fontSize:8, color:"#333355", letterSpacing:1, fontFamily:"IBM Plex Mono,monospace" }}>
            8000 × 8000 px · pixel-perfect PNG
          </div>
        </div>
      )}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
const mkPieces = () => [
  { id:0, enabled:true,  color:DCOLS[0], name:`${PIECE_NAMES[0]} Knight`, moves:mkKnight() },
  { id:1, enabled:true,  color:DCOLS[1], name:`${PIECE_NAMES[1]} Knight`, moves:mkKnight() },
  { id:2, enabled:false, color:DCOLS[2], name:`${PIECE_NAMES[2]} Piece`,  moves:new Set()  },
  { id:3, enabled:false, color:DCOLS[3], name:`${PIECE_NAMES[3]} Piece`,  moves:new Set()  },
];

export default function App() {
  const [pieces,   setPieces]   = useState(mkPieces);
  const [order,    setOrder]    = useState([0,1,2,3]);
  const [sel,      setSel]      = useState(0);
  const [res,      setRes]      = useState(100_000);
  const [ownBlks,  setOwnBlks]  = useState(false);
  const [running,  setRunning]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [runId,    setRunId]    = useState(0);
  const [viz,      setViz]      = useState(null);

  const tmRef = useRef(null), aRef = useRef(null), dSrc = useRef(null);

  useEffect(() => {
    const l=document.createElement("link"); l.href=FONT; l.rel="stylesheet"; document.head.appendChild(l);
  }, []);

  const stop = useCallback(() => { clearTimeout(tmRef.current); aRef.current=null; setRunning(false); }, []);

  const run = useCallback(() => {
    stop();
    const active=order.map(i=>pieces[i]).filter(p=>p.enabled&&p.moves.size>0);
    if (!active.length) return;
    const N=res; setRunning(true); setProgress(0); setRunId(id=>id+1);
    setTimeout(() => {
      const a=mkAlgo(active,N,ownBlks); aRef.current=a;
      const colors=active.map(p=>p.color);
      setViz({occ:a.occ,GW:a.GW,colors,version:0,isDone:false});
      const CHUNK=Math.max(1000,Math.floor(N/400));
      const tick=()=>{
        if (!aRef.current) return;
        const done=a.step(CHUNK), p=a.placed;
        setProgress(p/N);
        setViz(v=>v&&{...v,version:p,isDone:done||p>=N});
        if (done||p>=N) { setRunning(false); aRef.current=null; }
        else tmRef.current=setTimeout(tick,4);
      };
      tick();
    }, 16);
  }, [order,pieces,res,ownBlks,stop]);

  const upd=(id,p)=>setPieces(ps=>ps.map(q=>q.id===id?p:q));
  const dg={
    start: id=>{dSrc.current=id;},
    over:  id=>{
      if(dSrc.current===null||dSrc.current===id) return;
      const o=[...order],f=o.indexOf(dSrc.current),t=o.indexOf(id);
      [o[f],o[t]]=[o[t],o[f]]; setOrder(o);
    },
    drop: ()=>{dSrc.current=null;},
  };

  const sp  = pieces[sel];
  const lbl = { fontSize:8, letterSpacing:2, color:"#8888aa", textTransform:"uppercase", marginBottom:5 };

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden",
      background:"#08080e", color:"#c8c8e0", fontFamily:'"IBM Plex Mono",monospace', fontSize:11 }}>

      {/* ── Sidebar ── */}
      <div style={{ width:268, flexShrink:0, display:"flex", flexDirection:"column",
        background:"#07070d", borderRight:"1px solid #121220", overflow:"hidden" }}>

        <div style={{ padding:"13px 12px 11px", borderBottom:"1px solid #0f0f1e" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#d8d8f0", letterSpacing:4, textTransform:"uppercase" }}>
            Spiral Tiler</div>
          <div style={{ fontSize:8, color:"#7070a0", marginTop:3, letterSpacing:2 }}>
            SEQUENCE-BASED PATTERN GENERATOR</div>
        </div>

        <div style={{ flexShrink:0, paddingTop:8 }}>
          <div style={{...lbl, paddingLeft:10}}>Cycle Order — drag to reorder</div>
          {order.map(pi=>(
            <PieceCard key={pi} piece={pieces[pi]} active={sel===pi}
              onSelect={()=>setSel(pi)} onUpdate={p=>upd(pi,p)}
              dgStart={()=>dg.start(pi)} dgOver={()=>dg.over(pi)} dgDrop={dg.drop}/>
          ))}
        </div>

        <div style={{ padding:"10px 10px", flex:1, overflow:"auto", borderTop:"1px solid #0e0e1a" }}>
          <div style={lbl}>Move Pattern</div>
          <div style={{ fontSize:10, color:sp.color, marginBottom:6, fontWeight:500 }}>{sp.name}</div>
          {!sp.enabled && <div style={{ fontSize:8, color:"#7878a8", marginBottom:6, letterSpacing:1 }}>PIECE IS DISABLED</div>}
          <MoveGrid moves={sp.moves} color={sp.color} onChange={moves=>upd(sel,{...sp,moves})}/>
          <div style={{ fontSize:8, color:"#7878a8", marginTop:6, letterSpacing:1 }}>
            {sp.moves.size} VECTORS · RANGE ±{GM}</div>
        </div>

        <div style={{ padding:"9px 10px", borderTop:"1px solid #0e0e1a", flexShrink:0 }}>
          <div style={lbl}>Resolution</div>
          <div style={{ display:"flex", gap:2, flexWrap:"wrap", marginBottom:9 }}>
            {RESOS.map(([l,v])=>(
              <button key={v} onClick={()=>setRes(v)} style={{
                padding:"2px 7px", fontSize:9, cursor:"pointer", fontFamily:"inherit", letterSpacing:0.5,
                background:res===v?"#0a1e38":"transparent",
                color:res===v?"#6aabff":"#9090b8",
                border:`1px solid ${res===v?"#184070":"#252538"}`,
              }}>{l}</button>
            ))}
          </div>

          <label style={{ display:"flex", alignItems:"center", gap:5, marginBottom:9,
            cursor:"pointer", fontSize:9, color:"#b0b0cc", letterSpacing:0.5 }}>
            <input type="checkbox" checked={ownBlks} onChange={e=>setOwnBlks(e.target.checked)}
              style={{accentColor:"#4488ee"}}/>
            same-color attacks block placement
          </label>

          {progress>0 && (
            <div style={{ marginBottom:9 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:8, color:"#8888aa", marginBottom:3, letterSpacing:0.5 }}>
                <span>{(progress*100).toFixed(1)}%</span>
                <span>{Math.round(progress*res).toLocaleString()} / {res.toLocaleString()}</span>
              </div>
              <div style={{ height:1, background:"#0c0c18" }}>
                <div style={{ height:"100%", width:`${progress*100}%`,
                  background:"linear-gradient(90deg,#1a4488,#3366cc)", transition:"width .12s" }}/>
              </div>
            </div>
          )}

          <button onClick={running?stop:run} style={{
            width:"100%", padding:"9px", fontFamily:"inherit", fontSize:9,
            fontWeight:700, letterSpacing:3, textTransform:"uppercase", cursor:"pointer",
            background:running?"#160606":"#060e1c",
            color:      running?"#ff6666":"#5599ff",
            border:     `1px solid ${running?"#551111":"#113366"}`,
          }}>{running?"■  Stop":"▶  Run Pattern"}</button>
        </div>
      </div>

      {/* ── Canvas ── */}
      {viz ? (
        <VizCanvas key={runId} {...viz}/>
      ) : (
        <div style={{ flex:1, display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center", background:"#ffffff", gap:10 }}>
          <div style={{ fontSize:9, letterSpacing:4, textTransform:"uppercase",
            color:"#999999", fontFamily:"IBM Plex Mono,monospace" }}>
            Configure pieces → Run Pattern</div>
          <div style={{ fontSize:8, color:"#bbbbbb", letterSpacing:2, fontFamily:"IBM Plex Mono,monospace" }}>
            scroll to zoom · drag to pan</div>
        </div>
      )}
    </div>
  );
}
