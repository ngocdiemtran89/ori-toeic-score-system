// src/app/page.js
"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── TOEIC Constants (client-side) ────────────────────────────
const LISTENING_TABLE=[5,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100,105,110,115,120,125,130,135,140,145,150,155,160,165,170,175,180,185,190,195,200,205,210,215,220,225,230,235,240,245,250,255,260,265,270,275,280,285,290,295,300,305,310,315,320,325,330,335,340,345,350,355,360,365,370,375,380,385,395,400,405,410,415,420,425,430,435,440,445,450,455,460,465,470,475,480,485,490,495,495,495,495,495];
const READING_TABLE=[5,5,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100,105,110,115,120,125,130,135,140,145,150,155,160,165,170,175,180,185,190,195,200,205,210,215,220,225,230,235,240,245,250,255,260,265,270,275,280,285,290,295,300,305,310,315,320,325,330,335,340,345,350,355,360,365,370,375,380,385,390,395,400,405,410,415,420,425,430,435,440,445,450,455,460,465,470,475,480,485,490,495];
const PM={P1:6,P2:25,P3:39,P4:30,P5:30,P6:16,P7:54};
const LP=["P1","P2","P3","P4"], RP=["P5","P6","P7"], AP=[...LP,...RP];
const STANDARDS={450:{L:{P1:3,P2:10,P3:12,P4:10},R:{P5:12,P6:5,P7:20}},500:{L:{P1:3,P2:13,P3:16,P4:12},R:{P5:15,P6:7,P7:26}},550:{L:{P1:4,P2:16,P3:20,P4:18},R:{P5:18,P6:8,P7:32}},600:{L:{P1:5,P2:19,P3:24,P4:22},R:{P5:22,P6:10,P7:38}},650:{L:{P1:5,P2:21,P3:28,P4:24},R:{P5:24,P6:12,P7:42}},700:{L:{P1:6,P2:23,P3:32,P4:26},R:{P5:26,P6:13,P7:46}},750:{L:{P1:6,P2:24,P3:34,P4:28},R:{P5:28,P6:14,P7:48}},800:{L:{P1:6,P2:25,P3:36,P4:28},R:{P5:28,P6:15,P7:50}}};

function calc(sc){const l=LP.reduce((s,p)=>s+(sc[p]||0),0),r=RP.reduce((s,p)=>s+(sc[p]||0),0);return{listening:LISTENING_TABLE[Math.min(100,l)],reading:READING_TABLE[Math.min(100,r)],total:LISTENING_TABLE[Math.min(100,l)]+READING_TABLE[Math.min(100,r)],lCorrect:l,rCorrect:r};}
function findLvl(t){const l=Object.keys(STANDARDS).map(Number).sort((a,b)=>a-b);let c=l[0];for(const v of l)if(t>=v)c=v;return c;}
function nextTgt(t){const l=Object.keys(STANDARDS).map(Number).sort((a,b)=>a-b);for(const v of l)if(v>t)return v;return l[l.length-1]+50;}
function genTgt(cur,lvl){const s=STANDARDS[lvl];if(!s)return null;const t={};AP.forEach(p=>{const sec=LP.includes(p)?"L":"R";const tg=s[sec][p],c=cur[p]||0;t[p]={current:c,target:tg,diff:Math.max(0,tg-c),exceeded:c>=tg};});return t;}

// ─── API helpers ──────────────────────────────────────────────
const api = {
  async getStudents(search) {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    const r = await fetch(`/api/students${q}`);
    return r.json();
  },
  async saveStudent(data) {
    const r = await fetch("/api/students", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(data) });
    return r.json();
  },
  async getScores(code) {
    const r = await fetch(`/api/scores?code=${code}`);
    return r.json();
  },
  async saveScore(data) {
    const r = await fetch("/api/scores", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(data) });
    return r.json();
  },
  async analyze(data) {
    const r = await fetch("/api/analyze", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(data) });
    return r.json();
  },
};

// ─── Components ───────────────────────────────────────────────
function Ring({value,max,size=100,color="#FF6B35",label,score}){
  const pct=Math.min(100,(value/max)*100),r=(size-10)/2,circ=2*Math.PI*r,off=circ-(pct/100)*circ;
  return(<div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6} strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" style={{transition:"stroke-dashoffset 1s"}}/></svg>
    <div style={{marginTop:-size+8,height:size-16,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><span className="mono" style={{fontSize:size*0.24,fontWeight:900,color}}>{score}</span><span style={{fontSize:size*0.11,color:"rgba(255,255,255,0.3)"}}>{value}/{max}</span></div>
    {label&&<span style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:8,letterSpacing:1.5,textTransform:"uppercase"}}>{label}</span>}
  </div>);
}

function PartBar({part,current,max,target,prev}){
  const pct=(current/max)*100,tPct=target?(target/max)*100:0,diff=prev!=null?current-prev:null,isL=LP.includes(part),col=isL?"#FF6B35":"#00C9A7";
  return(<div style={{marginBottom:11}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span className="mono" style={{fontSize:12,fontWeight:700,color:col,width:24}}>{part}</span>
        <span style={{fontSize:13,color:"#fff",fontWeight:600}}>{current}/{max}</span>
        {diff!=null&&diff!==0&&<span style={{fontSize:11,fontWeight:700,color:diff>0?"#00E676":"#FF5252",background:diff>0?"rgba(0,230,118,0.1)":"rgba(255,82,82,0.1)",padding:"1px 6px",borderRadius:4}}>{diff>0?`+${diff}`:diff}</span>}
      </div>
      {target!=null&&<span style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>🎯 {target}/{max}</span>}
    </div>
    <div style={{position:"relative",height:7,background:"rgba(255,255,255,0.05)",borderRadius:4,overflow:"hidden"}}>
      <div style={{height:"100%",width:`${pct}%`,background:col,borderRadius:4,transition:"width 0.8s ease-out"}}/>
      {target!=null&&<div style={{position:"absolute",top:0,left:`${tPct}%`,width:2,height:"100%",background:"#FFD740"}}/>}
    </div>
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function Home() {
  const [view, setView] = useState("input");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [students, setStudents] = useState([]);

  // Form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [month, setMonth] = useState(() => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;});
  const [scores, setScores] = useState({P1:"",P2:"",P3:"",P4:"",P5:"",P6:"",P7:""});
  const [inputMode, setInputMode] = useState("manual");
  const [textInput, setTextInput] = useState("");

  // Report
  const [report, setReport] = useState(null);
  const [aiInsight, setAiInsight] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // History
  const [selStudent, setSelStudent] = useState(null);
  const [selHistory, setSelHistory] = useState([]);
  const [lookupQ, setLookupQ] = useState("");
  const [lookupResults, setLookupResults] = useState([]);

  // Bằng khen
  const [certStudent, setCertStudent] = useState("");
  const [certName, setCertName] = useState("Học Viên");
  const [certL, setCertL] = useState(0);
  const [certR, setCertR] = useState(0);
  const certTotal = certL + certR;
  const [certTeacher, setCertTeacher] = useState("Trần Ngọc Diễm");
  const certRef = useRef(null);

  const flash = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };
  const moLabel = (m) => { const [y,mo]=m.split("-"); return `T${parseInt(mo)}/${y}`; };

  // Load students list
  useEffect(() => { api.getStudents().then(d => setStudents(d.students||[])).catch(()=>{}); }, []);

  // Auto-fill on phone/code blur
  const autoFill = async () => {
    if (code) {
      const d = await api.getStudents(code);
      const f = d.students?.[0];
      if (f && f.code.toUpperCase() === code.toUpperCase()) { setName(f.name); setPhone(f.phone); setCode(f.code); flash(`Tìm thấy: ${f.name}`); return; }
    }
    if (phone && phone.length >= 9) {
      const d = await api.getStudents(phone);
      const f = d.students?.[0];
      if (f) { setName(f.name); setCode(f.code); flash(`Tìm thấy: ${f.name}`); return; }
    }
  };

  // Parse text
  const parseText = () => {
    const sc = {};
    const pats = [/P(\d)\s*[:\-=–—]\s*(\d+)\s*[\/\\]\s*(\d+)/gi, /Part\s*(\d)\s*[:\-=–—]\s*(\d+)\s*[\/\\]\s*(\d+)/gi];
    for (const pat of pats) { let m; while ((m = pat.exec(textInput)) !== null) { const p = `P${m[1]}`; const v = parseInt(m[2]); if (PM[p] && v <= PM[p]) sc[p] = v; } }
    if (Object.keys(sc).length > 0) { setScores(prev => { const n={...prev}; Object.entries(sc).forEach(([k,v])=>n[k]=String(v)); return n; }); flash(`Nhận diện ${Object.keys(sc).length} Part`); }
    else flash("Không tìm thấy điểm","error");
  };

  // Live preview
  const liveScore = (() => { const n = {}; Object.entries(scores).forEach(([k,v])=>n[k]=parseInt(v)||0); return calc(n); })();

  // Submit
  const handleSubmit = async () => {
    if (!name.trim()) { flash("Nhập tên học viên","error"); return; }
    setLoading(true);

    try {
      // 1. Save/find student
      const stuRes = await api.saveStudent({ name: name.trim(), phone, code: code || undefined });

      // ── Kiểm tra lỗi API ──
      if (stuRes.error) {
        flash(`Lỗi: ${stuRes.error}`, "error");
        setLoading(false);
        return;
      }
      if (!stuRes.student) {
        flash("Lỗi: Không nhận được dữ liệu từ server. Kiểm tra kết nối Google Sheets tại /api/health", "error");
        setLoading(false);
        return;
      }

      const stu = stuRes.student;
      setCode(stu.code);

      // 2. Save score
      const num = {}; Object.entries(scores).forEach(([k,v])=>num[k]=parseInt(v)||0);
      const scoreRes = await api.saveScore({ code: stu.code, month, ...num });

      if (scoreRes.error) { flash(scoreRes.error,"error"); setLoading(false); return; }

      // 3. Build report
      const history = scoreRes.history || [];
      const current = scoreRes.score;
      const prevRecord = history.filter(h=>h.month<month).sort((a,b)=>b.month.localeCompare(a.month))[0];
      const est = calc(num);
      const lvl = findLvl(est.total);
      const nxt = nextTgt(est.total);
      const tgt = genTgt(num, nxt);

      const rpt = {
        code: stu.code, name: stu.name, phone: stu.phone, month,
        scores: num, est, lvl, nxt, tgt,
        prevSc: prevRecord ? {P1:prevRecord.P1,P2:prevRecord.P2,P3:prevRecord.P3,P4:prevRecord.P4,P5:prevRecord.P5,P6:prevRecord.P6,P7:prevRecord.P7} : null,
        prevEst: prevRecord ? { listening: prevRecord.listening, reading: prevRecord.reading, total: prevRecord.total } : null,
        prevMo: prevRecord?.month,
        history,
      };
      setReport(rpt);
      setView("report");
      flash(`Lưu thành công! Mã: ${stu.code}`);

      // Refresh students
      api.getStudents().then(d=>setStudents(d.students||[]));

      // 4. AI analysis (background)
      setAiLoading(true); setAiInsight(null);
      try {
        const aiRes = await api.analyze({ name: stu.name, scores: num, prevScores: rpt.prevSc, estimate: est });
        if (aiRes.insight) setAiInsight(aiRes.insight);
      } catch {}
      setAiLoading(false);

    } catch (err) {
      console.error("Submit error:", err);
      flash(`Lỗi kết nối: ${err.message}. Truy cập /api/health để kiểm tra`, "error");
    }
    setLoading(false);
  };

  // Load history for student
  const loadHistory = async (studentCode) => {
    setSelStudent(studentCode);
    const d = await api.getScores(studentCode);
    setSelHistory(d.scores || []);
  };

  // Lookup
  const doLookup = async (q) => {
    setLookupQ(q);
    if (q.length >= 2) {
      const d = await api.getStudents(q);
      setLookupResults(d.students || []);
    } else setLookupResults([]);
  };

  return (
    <div style={{ padding: "16px 12px", maxWidth: 640, margin: "0 auto" }}>

      {/* Toast */}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: 4, color: "var(--text-dim)", textTransform: "uppercase" }}>ORI TOEIC · Web App</div>
        <h1 style={{ fontSize: 24, fontWeight: 900, margin: "6px 0", background: "linear-gradient(135deg,#FF6B35,#FFD740,#00C9A7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Hệ Thống Báo Điểm
        </h1>
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 10 }}>
          Dữ liệu lưu trên Google Sheets · {students.length} học viên
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 5, flexWrap: "wrap" }}>
          {[{k:"input",l:"📝 Nhập"},{k:"report",l:"📊 Báo cáo"},{k:"capture",l:"📸 Chụp ảnh"},{k:"cert",l:"🏆 Bằng khen"},{k:"history",l:"📈 Lịch sử"}].map(t =>
            <button key={t.k} onClick={()=>setView(t.k)} className={`tag ${view===t.k?"tag-active":"tag-inactive"}`}>{t.l}</button>
          )}
        </div>
      </div>

      {/* ═══ INPUT ═══ */}
      {view === "input" && (
        <div>
          <div className="card">
            <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>Thông tin học viên</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div>
                <label style={{ fontSize: 10, color: "var(--text-dim)", display: "block", marginBottom: 3 }}>HỌ TÊN *</label>
                <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Gia Huy" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "var(--text-dim)", display: "block", marginBottom: 3 }}>SỐ ĐIỆN THOẠI</label>
                <input className="input" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="0901234567" onBlur={autoFill} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 10, color: "var(--text-dim)", display: "block", marginBottom: 3 }}>MÃ HV</label>
                <input className="input input-mono" value={code} onChange={e=>setCode(e.target.value)} placeholder="ORI-XXXXX" onBlur={autoFill} style={{letterSpacing:1}} />
                <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>Bỏ trống → tự sinh</div>
              </div>
              <div>
                <label style={{ fontSize: 10, color: "var(--text-dim)", display: "block", marginBottom: 3 }}>THÁNG</label>
                <input type="month" className="input" value={month} onChange={e=>setMonth(e.target.value)} style={{colorScheme:"dark"}} />
              </div>
            </div>

            <div style={{ height: 1, background: "var(--border)", margin: "12px 0" }} />

            {/* Input mode */}
            <div style={{ display: "flex", gap: 3, marginBottom: 12, background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 3 }}>
              {[{k:"manual",l:"Nhập tay"},{k:"text",l:"Dán text"}].map(m =>
                <button key={m.k} onClick={()=>setInputMode(m.k)} style={{ flex:1, padding:"7px 0", border:"none", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer", background: inputMode===m.k?"rgba(255,107,53,0.15)":"transparent", color: inputMode===m.k?"#FF6B35":"rgba(255,255,255,0.3)" }}>{m.l}</button>
              )}
            </div>

            {inputMode === "manual" && (
              <>
                <div style={{ fontSize: 12, color: "#FF6B35", fontWeight: 700, marginBottom: 6 }}>🎧 LISTENING</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
                  {LP.map(p => (
                    <div key={p} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "#FF6B35", width: 24 }}>{p}</span>
                      <input type="number" min={0} max={PM[p]} className="input input-mono" value={scores[p]} onChange={e=>setScores(s=>({...s,[p]:e.target.value}))} placeholder="0" style={{width:56,textAlign:"center",padding:"8px"}} />
                      <span style={{ fontSize: 11, color: "var(--text-dim)" }}>/{PM[p]}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "#00C9A7", fontWeight: 700, marginBottom: 6 }}>📖 READING</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {RP.map(p => (
                    <div key={p} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "#00C9A7", width: 24 }}>{p}</span>
                      <input type="number" min={0} max={PM[p]} className="input input-mono" value={scores[p]} onChange={e=>setScores(s=>({...s,[p]:e.target.value}))} placeholder="0" style={{width:56,textAlign:"center",padding:"8px"}} />
                      <span style={{ fontSize: 11, color: "var(--text-dim)" }}>/{PM[p]}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {inputMode === "text" && (
              <>
                <textarea className="input input-mono" value={textInput} onChange={e=>setTextInput(e.target.value)} placeholder={"Dán điểm:\nP1: 3/6\nP2: 12/25..."} style={{height:120,resize:"none",fontSize:13}} />
                <button className="btn-primary" onClick={parseText} style={{marginTop:8,width:"100%"}}>🔍 Nhận diện</button>
              </>
            )}

            {/* Live preview */}
            {Object.values(scores).some(v=>v!=="") && (
              <div style={{ marginTop: 12, padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>⚡ Quy đổi trực tiếp</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 14, alignItems: "center" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#FF6B35" }}>🎧 {liveScore.lCorrect}/100</div>
                    <div className="mono" style={{ fontSize: 20, fontWeight: 900, color: "#FF6B35" }}>{liveScore.listening}</div>
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.15)" }}>+</div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#00C9A7" }}>📖 {liveScore.rCorrect}/100</div>
                    <div className="mono" style={{ fontSize: 20, fontWeight: 900, color: "#00C9A7" }}>{liveScore.reading}</div>
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.15)" }}>=</div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#FFD740" }}>TỔNG</div>
                    <div className="mono" style={{ fontSize: 24, fontWeight: 900, color: "#FFD740" }}>{liveScore.total}</div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
              <button className="btn-secondary" onClick={()=>{setScores({P1:"",P2:"",P3:"",P4:"",P5:"",P6:"",P7:""})}} style={{padding:"10px 14px"}}>🗑️</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={loading||!name.trim()} style={{flex:1}}>
                {loading ? "⏳ Đang lưu vào Google Sheets..." : "🚀 Tạo báo cáo & Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ REPORT ═══ */}
      {view === "report" && report && (
        <div>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "var(--text-dim)", textTransform: "uppercase" }}>Báo cáo · {moLabel(report.month)}</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, margin: "6px 0" }}>{report.name}</h2>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <span className="mono" style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>{report.code}</span>
              {report.phone && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>📱 {report.phone}</span>}
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 16, alignItems: "center" }}>
              <Ring value={report.est.lCorrect} max={100} size={105} color="#FF6B35" label="Listening" score={report.est.listening} />
              <div style={{ textAlign: "center" }}>
                <div className="mono" style={{ fontSize: 40, fontWeight: 900, background: "linear-gradient(135deg,#FF6B35,#FFD740)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{report.est.total}</div>
                <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 2 }}>/ 990</div>
                {report.prevEst && (
                  <div style={{ marginTop: 4, fontSize: 13, fontWeight: 700, color: report.est.total >= report.prevEst.total ? "#00E676" : "#FF5252" }}>
                    {report.est.total >= report.prevEst.total ? "↑" : "↓"} {Math.abs(report.est.total - report.prevEst.total)}
                    <span style={{ fontSize: 10, color: "var(--text-dim)", marginLeft: 4 }}>vs {moLabel(report.prevMo)}</span>
                  </div>
                )}
              </div>
              <Ring value={report.est.rCorrect} max={100} size={105} color="#00C9A7" label="Reading" score={report.est.reading} />
            </div>

            <div style={{ marginTop: 10, padding: 8, background: "rgba(255,255,255,0.02)", borderRadius: 8, fontSize: 12, color: "var(--text-muted)" }}>
              🎧 {report.est.lCorrect} đúng → <strong style={{color:"#FF6B35"}}>{report.est.listening}</strong> · 📖 {report.est.rCorrect} đúng → <strong style={{color:"#00C9A7"}}>{report.est.reading}</strong>
            </div>
          </div>

          {/* Parts */}
          <div className="card">
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10, letterSpacing: 1 }}>📊 CHI TIẾT</div>
            <div style={{ fontSize: 11, color: "#FF6B35", fontWeight: 700, marginBottom: 5 }}>🎧 LISTENING</div>
            {LP.map(p=><PartBar key={p} part={p} current={report.scores[p]} max={PM[p]} target={report.tgt?.[p]?.target} prev={report.prevSc?.[p]} />)}
            <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />
            <div style={{ fontSize: 11, color: "#00C9A7", fontWeight: 700, marginBottom: 5 }}>📖 READING</div>
            {RP.map(p=><PartBar key={p} part={p} current={report.scores[p]} max={PM[p]} target={report.tgt?.[p]?.target} prev={report.prevSc?.[p]} />)}
          </div>

          {/* Targets */}
          <div className="card" style={{ borderColor: "rgba(255,215,64,0.1)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#FFD740", marginBottom: 10 }}>🎯 MỤC TIÊU → {report.nxt}+</div>
            {report.tgt && Object.entries(report.tgt).map(([p,t])=>(
              <div key={p} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: LP.includes(p)?"#FF6B35":"#00C9A7" }}>{p}</span>
                <span style={{ fontSize: 12 }}>{t.current} → {t.target}/{PM[p]}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: t.exceeded?"#00E676":"#FFD740", background: t.exceeded?"rgba(0,230,118,0.08)":"rgba(255,215,64,0.08)", padding: "2px 7px", borderRadius: 5 }}>
                  {t.exceeded ? "✅ Đạt" : `+${t.diff}`}
                </span>
              </div>
            ))}
          </div>

          {/* AI */}
          <div className="card" style={{ borderColor: "rgba(138,43,226,0.1)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#BB86FC", marginBottom: 10 }}>🤖 AI PHÂN TÍCH</div>
            {aiLoading && <div style={{ textAlign: "center", padding: 14, color: "var(--text-dim)" }}>🧠 Đang phân tích...</div>}
            {aiInsight && (
              <div style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.7)" }}>
                <p style={{ margin: "0 0 10px" }}>{aiInsight.summary}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <div style={{ padding: 8, background: "rgba(0,230,118,0.05)", borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: "#00E676", fontWeight: 700, marginBottom: 3 }}>💪 MẠNH</div>
                    {aiInsight.strengths?.map((s,i)=><div key={i} style={{fontSize:12,marginBottom:2}}>• {s}</div>)}
                  </div>
                  <div style={{ padding: 8, background: "rgba(255,82,82,0.05)", borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: "#FF5252", fontWeight: 700, marginBottom: 3 }}>⚠️ CẢI THIỆN</div>
                    {aiInsight.weaknesses?.map((w,i)=><div key={i} style={{fontSize:12,marginBottom:2}}>• {w}</div>)}
                  </div>
                </div>
                <div style={{ padding: 8, background: "rgba(255,215,64,0.04)", borderRadius: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 10, color: "#FFD740", fontWeight: 700, marginBottom: 2 }}>📅 KẾ HOẠCH</div>
                  <div style={{ fontSize: 12 }}>{aiInsight.weekly_plan}</div>
                </div>
                <div style={{ padding: 8, background: "rgba(187,134,252,0.06)", borderRadius: 8, textAlign: "center", fontSize: 13, fontWeight: 600, color: "#BB86FC" }}>✨ {aiInsight.motivation}</div>
              </div>
            )}
            {!aiLoading && !aiInsight && <div style={{ textAlign: "center", padding: 10, color: "var(--text-dim)", fontSize: 12 }}>AI chưa cấu hình hoặc không khả dụng. Thêm ANTHROPIC_API_KEY trong .env.local để bật.</div>}
          </div>

          {/* ═══ ZALO SHARE ═══ */}
          <div className="card" style={{ borderColor: "rgba(0,168,255,0.15)", background: "rgba(0,168,255,0.03)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#00A8FF", marginBottom: 10 }}>💬 GỬI QUA ZALO</div>

            <button onClick={() => {
              const m = report, e = m.est;
              const diffText = m.prevEst ? ` (${e.total >= m.prevEst.total ? "+" : ""}${e.total - m.prevEst.total} so với ${moLabel(m.prevMo)})` : "";
              const parts = [...LP,...RP].map(p => `  ${p}: ${m.scores[p]}/${PM[p]}`).join("\n");
              const url = `${window.location.origin}/report/${m.code}`;
              const msg = `📊 BÁO CÁO ĐIỂM TOEIC — ${moLabel(m.month)}\n━━━━━━━━━━━━━━━━━━━━\n\n👤 Học viên: ${m.name}\n🆔 Mã HV: ${m.code}\n\n📝 TỔNG ĐIỂM: ${e.total}/990${diffText}\n🎧 Listening: ${e.listening}/495 (${e.lCorrect} câu đúng)\n📖 Reading: ${e.reading}/495 (${e.rCorrect} câu đúng)\n\n📋 Chi tiết:\n${parts}\n\n🎯 Mục tiêu tháng sau: ${m.nxt}+\n\n🔗 Xem báo cáo đầy đủ:\n${url}\n\n━━━━━━━━━━━━━━━━━━━━\nORI TOEIC · 0906 303 373`;
              navigator.clipboard.writeText(msg).then(() => flash("✅ Đã copy! Mở Zalo → paste gửi")).catch(() => flash("Không copy được", "error"));
            }} style={{ width:"100%",padding:"12px 16px",border:"none",borderRadius:10,background:"linear-gradient(135deg,#0068FF,#00A8FF)",color:"white",fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:8 }}>
              📋 Copy tin nhắn Zalo (đầy đủ)
            </button>

            <button onClick={() => {
              const m = report, e = m.est, url = `${window.location.origin}/report/${m.code}`;
              const msg = `Chào PH ${m.name},\n\nBáo cáo TOEIC ${moLabel(m.month)}: ${e.total}/990 (L: ${e.listening} + R: ${e.reading}).\n\n👉 Xem chi tiết: ${url}\n\nORI TOEIC · 0906 303 373`;
              navigator.clipboard.writeText(msg).then(() => flash("✅ Đã copy tin nhắn ngắn!")).catch(() => flash("Không copy được", "error"));
            }} style={{ width:"100%",padding:"10px 16px",border:"1px solid rgba(0,168,255,0.2)",borderRadius:10,background:"transparent",color:"#00A8FF",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:8 }}>
              ✉️ Copy tin nhắn ngắn + link
            </button>

            <button onClick={() => {
              const url = `${window.location.origin}/report/${report.code}`;
              navigator.clipboard.writeText(url).then(() => flash("✅ Đã copy link!")).catch(() => flash("Không copy được", "error"));
            }} style={{ width:"100%",padding:"10px 16px",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,background:"transparent",color:"rgba(255,255,255,0.4)",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
              🔗 Copy link: /report/{report.code}
            </button>
          </div>
        </div>
      )}

      {/* ═══ CHỤP ẢNH ═══ */}
      {view === "capture" && (
        <div className="card" style={{ textAlign: "center" }}>
          {report ? (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12 }}>📸 CHỤP ẢNH BÁO CÁO</div>
              <div id="capture-area" style={{ background: "rgba(255,255,255,0.02)", borderRadius: 12, padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: 10, letterSpacing: 3, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 6 }}>ORI TOEIC · Báo cáo điểm</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 2 }}>{report.name}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 12 }}>{report.code} · {moLabel(report.month)}</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 12 }}>
                  <Ring value={report.est.lCorrect} max={100} size={90} color="#FF6B35" label="Listening" score={report.est.listening} />
                  <div style={{ textAlign: "center", alignSelf: "center" }}>
                    <div className="mono" style={{ fontSize: 36, fontWeight: 900, color: "#FFD740" }}>{report.est.total}</div>
                    <div style={{ fontSize: 10, color: "var(--text-dim)" }}>/990</div>
                  </div>
                  <Ring value={report.est.rCorrect} max={100} size={90} color="#00C9A7" label="Reading" score={report.est.reading} />
                </div>
                {AP.map(p => <PartBar key={p} part={p} current={report.scores[p]} max={PM[p]} target={report.tgt?.[p]?.target} prev={report.prevSc?.[p]} />)}
              </div>
              <button className="btn-primary" onClick={async () => {
                try {
                  if (typeof window.html2canvas === 'undefined') {
                    const s = document.createElement('script');
                    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                    document.head.appendChild(s);
                    await new Promise(r => s.onload = r);
                  }
                  const el = document.getElementById('capture-area');
                  const canvas = await window.html2canvas(el, { scale: 2, backgroundColor: '#0f0f1a' });
                  const link = document.createElement('a');
                  link.download = `toeic-${report.name.replace(/\s+/g, '-')}-${report.month}.png`;
                  link.href = canvas.toDataURL('image/png');
                  link.click();
                  flash("✅ Đã tải ảnh!");
                } catch (err) { flash("Lỗi: " + err.message, "error"); }
              }} style={{ width: "100%", marginTop: 12, fontSize: 14, padding: "12px 0" }}>
                📥 TẢI XUỐNG ẢNH (PNG)
              </button>
            </div>
          ) : (
            <div style={{ padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📸</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Chưa có báo cáo</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 14 }}>Vui lòng nhập điểm và tạo báo cáo trước</div>
              <button className="btn-primary" onClick={() => setView("input")} style={{ padding: "10px 24px" }}>📝 Đi đến Nhập điểm</button>
            </div>
          )}
        </div>
      )}

      {/* ═══ BẰNG KHEN ═══ */}
      {view === "cert" && (
        <div>
          <div className="card">
            <div style={{ fontSize: 12, fontWeight: 700, color: "#FFD740", marginBottom: 12 }}>🏆 TẠO BẰNG KHEN</div>

            {/* Row 1: Student + Teacher */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 10, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>CHỌN HỌC VIÊN</label>
                <select className="input" value={certStudent} onChange={e => {
                  const val = e.target.value;
                  setCertStudent(val);
                  if (val) {
                    const stu = students.find(s => s.code === val);
                    if (stu) {
                      setCertName(stu.name);
                      // Auto-fill scores from latest record
                      api.getScores(val).then(d => {
                        const latest = d.scores?.sort((a,b) => b.month.localeCompare(a.month))[0];
                        if (latest) { setCertL(latest.listening || 0); setCertR(latest.reading || 0); }
                      }).catch(() => {});
                    }
                  }
                }}>
                  <option value="">-- Chọn hoặc nhập tay bên dưới --</option>
                  {students.map(s => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>GIÁO VIÊN</label>
                <select className="input" value={certTeacher} onChange={e => setCertTeacher(e.target.value)}>
                  <option>Trần Ngọc Diễm</option>
                  <option>Đỗ Ngọc Loan</option>
                  <option>Grace Phạm</option>
                </select>
              </div>
            </div>

            {/* Row 2: Name + Scores */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 10, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>TÊN HỌC VIÊN</label>
                <input className="input" type="text" value={certName} onChange={e => setCertName(e.target.value)} placeholder="Nhập tên..." style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>LISTENING</label>
                <input className="input" type="number" min="0" max="495" value={certL} onChange={e => setCertL(Math.min(495, Math.max(0, Number(e.target.value) || 0)))} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>READING</label>
                <input className="input" type="number" min="0" max="495" value={certR} onChange={e => setCertR(Math.min(495, Math.max(0, Number(e.target.value) || 0)))} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>TỔNG</label>
                <div className="input mono" style={{ width: "100%", display: "flex", alignItems: "center", fontSize: 18, fontWeight: 900, color: "#FFD740", background: "rgba(255,215,64,0.06)", border: "1px solid rgba(255,215,64,0.2)", justifyContent: "center", letterSpacing: 1 }}>
                  {certTotal}
                </div>
              </div>
            </div>

            {/* Download button */}
            <button className="btn-primary" onClick={async () => {
              try {
                if (typeof window.html2canvas === 'undefined') {
                  const script = document.createElement('script');
                  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                  document.head.appendChild(script);
                  await new Promise(res => { script.onload = res; script.onerror = () => res(); });
                }
                const el = certRef.current;
                if (!el) return;
                flash("⏳ Đang tạo ảnh...");
                const canvas = await window.html2canvas(el, { scale: 3, useCORS: true, backgroundColor: "#ffffff", logging: false });
                const link = document.createElement('a');
                link.download = `BangKhen-${certName.replace(/\s+/g, '-')}-${certTotal}.jpg`;
                link.href = canvas.toDataURL('image/jpeg', 0.95);
                link.click();
                flash("✅ Đã tải bằng khen!");
              } catch (err) {
                flash("Lỗi tải ảnh: " + err.message, "error");
              }
            }} style={{ width: "100%", fontSize: 15, padding: "14px 0", marginBottom: 0 }}>
              📥 TẢI XUỐNG BẰNG KHEN (JPG)
            </button>
          </div>

          {/* ── Certificate Preview ── */}
          <div style={{ marginTop: 14, fontSize: 11, color: "var(--text-dim)", textAlign: "center", marginBottom: 6 }}>
            📸 Xem trước bằng khen · Nhấn nút tải xuống để lưu ảnh JPG
          </div>

          {/* ══════════════════════════════════════════════════════════
              BẰNG KHEN — Premium A4 Portrait Design
              Nền trắng, viền vàng gold 15px, font Times + Playfair + Great Vibes
              ══════════════════════════════════════════════════════════ */}
          <div ref={certRef} style={{
            width: "100%", maxWidth: 560, margin: "0 auto",
            aspectRatio: "210/297", /* A4 portrait */
            background: "#ffffff",
            position: "relative", overflow: "hidden",
            fontFamily: "'Times New Roman', 'Georgia', serif",
            color: "#333",
          }}>
            {/* === Outer gold border === */}
            <div style={{ position: "absolute", inset: 0, border: "14px solid #d4af37" }} />

            {/* === Inner gold line === */}
            <div style={{ position: "absolute", inset: 20, border: "2px solid #d4af37" }} />

            {/* === Corner ornaments === */}
            {[[0,0,"top","left"],[0,1,"top","right"],[1,0,"bottom","left"],[1,1,"bottom","right"]].map(([r,c,v,h]) => (
              <div key={`${v}${h}`} style={{
                position: "absolute", [v]: 24, [h]: 24,
                width: 36, height: 36,
                [`border${v.charAt(0).toUpperCase()+v.slice(1)}`]: "3px solid #b8972f",
                [`border${h.charAt(0).toUpperCase()+h.slice(1)}`]: "3px solid #b8972f",
              }} />
            ))}

            {/* === Content area === */}
            <div style={{
              position: "relative", zIndex: 1,
              display: "flex", flexDirection: "column", alignItems: "center",
              height: "100%", textAlign: "center",
              padding: "8% 10% 6%",
            }}>

              {/* ── Header: Logo + Date ── */}
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center", marginBottom: "3%" }}>
                <div style={{
                  background: "linear-gradient(135deg, #1a3a7a, #2856a6)",
                  color: "#fff", padding: "6px 18px",
                  fontWeight: 800, fontSize: 11, letterSpacing: 3,
                  fontFamily: "system-ui, Arial, sans-serif",
                }}>
                  ORI ACADEMY
                </div>
                <div style={{ fontSize: 11, color: "#777", fontStyle: "italic" }}>
                  TP. Hồ Chí Minh, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                </div>
              </div>

              {/* ── Gold divider ── */}
              <div style={{ width: "60%", height: 2, background: "linear-gradient(90deg, transparent, #d4af37, transparent)", marginBottom: "3%" }} />

              {/* ── Title ── */}
              <div style={{
                fontFamily: "'Playfair Display', 'Georgia', serif",
                fontSize: 48, fontWeight: 900,
                color: "#8b4513", letterSpacing: 10,
                textTransform: "uppercase",
                textShadow: "1px 1px 2px rgba(139,69,19,0.15)",
                marginBottom: 4,
              }}>
                BẰNG KHEN
              </div>

              <div style={{
                fontSize: 11, letterSpacing: 5,
                color: "#d4af37", textTransform: "uppercase",
                fontWeight: 600, fontFamily: "system-ui, sans-serif",
                marginBottom: "1%",
              }}>
                TOEIC ACHIEVEMENT AWARD
              </div>

              <div style={{ fontSize: 13, color: "#666", fontStyle: "italic", marginBottom: "3%" }}>
                Hệ thống Anh ngữ ORI trân trọng trao tặng cho
              </div>

              {/* ── Student Name ── */}
              <div style={{
                fontFamily: "'Dancing Script', 'Great Vibes', cursive",
                fontSize: 42, fontWeight: 700,
                color: "#1a3a7a",
                marginBottom: "1%",
                lineHeight: 1.2,
                textShadow: "1px 2px 4px rgba(0,0,0,0.08)",
              }}>
                {certName || "Họ và Tên"}
              </div>

              {/* ── Gold divider small ── */}
              <div style={{ width: "30%", height: 1, background: "linear-gradient(90deg, transparent, #d4af37, transparent)", margin: "2% 0" }} />

              {/* ── Description ── */}
              <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7, marginBottom: "3%", maxWidth: "85%" }}>
                Đã hoàn thành xuất sắc kỳ thi thử TOEIC chuẩn quốc tế
                <br />với kết quả đạt được như sau:
              </div>

              {/* ── Score Box ── */}
              <div style={{
                border: "2px solid #d4af37",
                padding: "16px 36px 20px",
                marginBottom: "4%",
                position: "relative",
                minWidth: "55%",
              }}>
                {/* Corner decorations for score box */}
                {[["top","left"],["top","right"],["bottom","left"],["bottom","right"]].map(([v,h]) => (
                  <div key={`s${v}${h}`} style={{
                    position: "absolute", [v]: -4, [h]: -4,
                    width: 12, height: 12,
                    [`border${v.charAt(0).toUpperCase()+v.slice(1)}`]: "2px solid #b8972f",
                    [`border${h.charAt(0).toUpperCase()+h.slice(1)}`]: "2px solid #b8972f",
                  }} />
                ))}

                <div style={{ display: "flex", justifyContent: "center", gap: 40, marginBottom: 10 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#555", letterSpacing: 1, marginBottom: 4 }}>Listening</div>
                    <div style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 30, fontWeight: 900, color: "#1a3a7a",
                    }}>{certL}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#555", letterSpacing: 1, marginBottom: 4 }}>Reading</div>
                    <div style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 30, fontWeight: 900, color: "#1a3a7a",
                    }}>{certR}</div>
                  </div>
                </div>

                <div style={{ width: "60%", height: 1, background: "#d4af37", margin: "0 auto 8px", opacity: 0.4 }} />

                <div style={{ fontSize: 9, letterSpacing: 3, color: "#999", textTransform: "uppercase", fontFamily: "system-ui, sans-serif", marginBottom: 4 }}>
                  TỔNG ĐIỂM ĐẠT ĐƯỢC
                </div>
                <div style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 42, fontWeight: 900,
                  color: "#d4af37",
                  lineHeight: 1,
                  textShadow: "1px 1px 3px rgba(212,175,55,0.2)",
                }}>
                  {certTotal}
                </div>
              </div>

              {/* ── Spacer ── */}
              <div style={{ flex: 1 }} />

              {/* ── Gold divider before signatures ── */}
              <div style={{ width: "70%", height: 1, background: "linear-gradient(90deg, transparent, #d4af37, transparent)", marginBottom: "4%" }} />

              {/* ── Signatures ── */}
              <div style={{ display: "flex", justifyContent: "space-around", width: "100%" }}>
                {[
                  { role: "GIÁO VIÊN HƯỚNG DẪN", name: certTeacher },
                  { role: "GIÁM ĐỐC TRUNG TÂM", name: certTeacher },
                ].map((sig, i) => (
                  <div key={i} style={{ textAlign: "center", minWidth: 140 }}>
                    <div style={{
                      fontFamily: "'Dancing Script', cursive",
                      fontSize: 20, color: "#1a3a7a",
                      marginBottom: 4,
                    }}>
                      {sig.name.split(" ").map(w => w.charAt(0)).join(". ")}.
                    </div>
                    <div style={{ width: 120, height: 1, background: "#999", margin: "4px auto 6px" }} />
                    <div style={{
                      fontSize: 8, letterSpacing: 2, color: "#999",
                      textTransform: "uppercase",
                      fontFamily: "system-ui, sans-serif",
                      marginBottom: 3,
                    }}>{sig.role}</div>
                    <div style={{ fontSize: 12, color: "#444", fontWeight: 500 }}>{sig.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ HISTORY ═══ */}
      {view === "history" && (
        <div className="card">
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>📈 LỊCH SỬ</div>
          {students.length === 0 ? <div style={{ textAlign: "center", padding: 24, color: "var(--text-dim)" }}>📭 Chưa có học viên</div> : (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                {students.map(s => (
                  <button key={s.code} onClick={()=>loadHistory(s.code)} className={`tag ${selStudent===s.code?"tag-active":"tag-inactive"}`}>
                    {s.name} <span style={{opacity:0.4,fontSize:10}}>{s.code}</span>
                  </button>
                ))}
              </div>
              {selStudent && (
                <div>
                  {selHistory.length === 0 ? <div style={{textAlign:"center",padding:16,color:"var(--text-dim)",fontSize:13}}>Chưa có bản ghi</div> :
                    selHistory.sort((a,b)=>b.month.localeCompare(a.month)).map((rec, idx, arr) => {
                      const prev = idx+1 < arr.length ? arr[idx+1] : null;
                      const diff = prev ? rec.total - prev.total : null;
                      return (
                        <div key={rec.month} style={{ padding: 12, marginBottom: 6, background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>{moLabel(rec.month)}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span className="mono" style={{ fontSize: 18, fontWeight: 900, color: "#FFD740" }}>{rec.total}</span>
                              {diff!=null && <span style={{fontSize:12,fontWeight:700,color:diff>=0?"#00E676":"#FF5252"}}>{diff>=0?`+${diff}`:diff}</span>}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>
                            <span>🎧 {rec.lCorrect}đúng → <strong style={{color:"#FF6B35"}}>{rec.listening}</strong></span>
                            <span>📖 {rec.rCorrect}đúng → <strong style={{color:"#00C9A7"}}>{rec.reading}</strong></span>
                          </div>
                          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                            {["P1","P2","P3","P4","P5","P6","P7"].map(p=>(
                              <span key={p} className="mono" style={{fontSize:10,padding:"2px 5px",borderRadius:4,background:LP.includes(p)?"rgba(255,107,53,0.06)":"rgba(0,201,167,0.06)",color:LP.includes(p)?"#FF6B35":"#00C9A7"}}>{p}:{rec[p]}</span>
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                            <button onClick={() => {
                              const stu = students.find(s=>s.code===selStudent);
                              const url = `${window.location.origin}/report/${selStudent}`;
                              const msg = `Chào PH ${stu?.name||selStudent},\n\nBáo cáo TOEIC ${moLabel(rec.month)}: ${rec.total}/990 (L: ${rec.listening} + R: ${rec.reading}).\n\n👉 Xem chi tiết: ${url}\n\nORI TOEIC · 0906 303 373`;
                              navigator.clipboard.writeText(msg).then(()=>flash("✅ Đã copy!")).catch(()=>{});
                            }} style={{fontSize:10,padding:"4px 8px",border:"1px solid rgba(0,168,255,0.2)",borderRadius:6,background:"transparent",color:"#00A8FF",cursor:"pointer",fontWeight:600}}>
                              💬 Copy Zalo
                            </button>
                            <button onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/report/${selStudent}`).then(()=>flash("✅ Đã copy link!")).catch(()=>{});
                            }} style={{fontSize:10,padding:"4px 8px",border:"1px solid rgba(255,255,255,0.06)",borderRadius:6,background:"transparent",color:"rgba(255,255,255,0.3)",cursor:"pointer",fontWeight:600}}>
                              🔗 Link
                            </button>
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══ LOOKUP ═══ */}
      {view === "lookup" && (
        <div className="card">
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>🔍 TRA CỨU</div>
          <input className="input" value={lookupQ} onChange={e=>doLookup(e.target.value)} placeholder="Nhập tên, SĐT, hoặc mã HV..." style={{marginBottom:12}} />
          {lookupResults.map(stu => (
            <div key={stu.code} style={{ padding: 12, marginBottom: 6, background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{stu.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                    <span className="mono">{stu.code}</span> · 📱 {stu.phone || "—"}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {lookupQ.length >= 2 && lookupResults.length === 0 && (
            <div style={{ textAlign: "center", padding: 16, color: "var(--text-dim)", fontSize: 13 }}>Không tìm thấy</div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: "center", marginTop: 24, paddingBottom: 16, fontSize: 10, color: "rgba(255,255,255,0.1)" }}>
        ORI TOEIC Score System · Vercel + Google Sheets · 0906 303 373
      </div>
    </div>
  );
}
