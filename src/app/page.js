// src/app/page.js
"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── TOEIC Constants (client-side) ────────────────────────────
const LISTENING_TABLE = [5, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160, 165, 170, 175, 180, 185, 190, 195, 200, 205, 210, 215, 220, 225, 230, 235, 240, 245, 250, 255, 260, 265, 270, 275, 280, 285, 290, 295, 300, 305, 310, 315, 320, 325, 330, 335, 340, 345, 350, 355, 360, 365, 370, 375, 380, 385, 395, 400, 405, 410, 415, 420, 425, 430, 435, 440, 445, 450, 455, 460, 465, 470, 475, 480, 485, 490, 495, 495, 495, 495, 495];
const READING_TABLE = [5, 5, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160, 165, 170, 175, 180, 185, 190, 195, 200, 205, 210, 215, 220, 225, 230, 235, 240, 245, 250, 255, 260, 265, 270, 275, 280, 285, 290, 295, 300, 305, 310, 315, 320, 325, 330, 335, 340, 345, 350, 355, 360, 365, 370, 375, 380, 385, 390, 395, 400, 405, 410, 415, 420, 425, 430, 435, 440, 445, 450, 455, 460, 465, 470, 475, 480, 485, 490, 495];
const PM = { P1: 6, P2: 25, P3: 39, P4: 30, P5: 30, P6: 16, P7: 54 };
const LP = ["P1", "P2", "P3", "P4"], RP = ["P5", "P6", "P7"], AP = [...LP, ...RP];
const STANDARDS = { 450: { L: { P1: 3, P2: 10, P3: 12, P4: 10 }, R: { P5: 12, P6: 5, P7: 20 } }, 500: { L: { P1: 3, P2: 13, P3: 16, P4: 12 }, R: { P5: 15, P6: 7, P7: 26 } }, 550: { L: { P1: 4, P2: 16, P3: 20, P4: 18 }, R: { P5: 18, P6: 8, P7: 32 } }, 600: { L: { P1: 5, P2: 19, P3: 24, P4: 22 }, R: { P5: 22, P6: 10, P7: 38 } }, 650: { L: { P1: 5, P2: 21, P3: 28, P4: 24 }, R: { P5: 24, P6: 12, P7: 42 } }, 700: { L: { P1: 6, P2: 23, P3: 32, P4: 26 }, R: { P5: 26, P6: 13, P7: 46 } }, 750: { L: { P1: 6, P2: 24, P3: 34, P4: 28 }, R: { P5: 28, P6: 14, P7: 48 } }, 800: { L: { P1: 6, P2: 25, P3: 36, P4: 28 }, R: { P5: 28, P6: 15, P7: 50 } } };

function calc(sc) { const l = LP.reduce((s, p) => s + (sc[p] || 0), 0), r = RP.reduce((s, p) => s + (sc[p] || 0), 0); return { listening: LISTENING_TABLE[Math.min(100, l)], reading: READING_TABLE[Math.min(100, r)], total: LISTENING_TABLE[Math.min(100, l)] + READING_TABLE[Math.min(100, r)], lCorrect: l, rCorrect: r }; }
function findLvl(t) { const l = Object.keys(STANDARDS).map(Number).sort((a, b) => a - b); let c = l[0]; for (const v of l) if (t >= v) c = v; return c; }
function nextTgt(t) { const l = Object.keys(STANDARDS).map(Number).sort((a, b) => a - b); for (const v of l) if (v > t) return v; return l[l.length - 1] + 50; }
function genTgt(cur, lvl) { const s = STANDARDS[lvl]; if (!s) return null; const t = {}; AP.forEach(p => { const sec = LP.includes(p) ? "L" : "R"; const tg = s[sec][p], c = cur[p] || 0; t[p] = { current: c, target: tg, diff: Math.max(0, tg - c), exceeded: c >= tg }; }); return t; }

// Calculate extra questions needed for target score increase
function calcExtraNeeded(currentL, currentR, targetIncrease) {
  const currentTotal = LISTENING_TABLE[Math.min(100, currentL)] + READING_TABLE[Math.min(100, currentR)];
  const targetTotal = currentTotal + targetIncrease;

  // Try adding questions evenly to L and R
  let extraL = 0, extraR = 0;
  let testL = currentL, testR = currentR;

  while (LISTENING_TABLE[Math.min(100, testL)] + READING_TABLE[Math.min(100, testR)] < targetTotal && (testL < 100 || testR < 100)) {
    // Alternate adding to L and R, prioritize the one with more room for improvement
    if (testL < 100 && (testR >= 100 || (100 - testL) >= (100 - testR))) {
      testL++; extraL++;
    } else if (testR < 100) {
      testR++; extraR++;
    } else break;
  }

  const achievedTotal = LISTENING_TABLE[Math.min(100, testL)] + READING_TABLE[Math.min(100, testR)];
  return { extraL, extraR, extraTotal: extraL + extraR, achievedTotal, possible: achievedTotal >= targetTotal };
}


// ─── API helpers ──────────────────────────────────────────────
const api = {
  async getStudents(search) {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    const r = await fetch(`/api/students${q}`);
    return r.json();
  },
  async saveStudent(data) {
    const r = await fetch("/api/students", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    return r.json();
  },
  async getScores(code) {
    const r = await fetch(`/api/scores?code=${code}`);
    return r.json();
  },
  async saveScore(data) {
    const r = await fetch("/api/scores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    return r.json();
  },
  async analyze(data) {
    const r = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    return r.json();
  },
};

// ─── Components ───────────────────────────────────────────────
function Ring({ value, max, size = 100, color = "#FF6B35", label, score }) {
  const pct = Math.min(100, (value / max) * 100), r = (size - 10) / 2, circ = 2 * Math.PI * r, off = circ - (pct / 100) * circ;
  return (<div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6} strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s" }} /></svg>
    <div style={{ marginTop: -size + 8, height: size - 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}><span className="mono" style={{ fontSize: size * 0.24, fontWeight: 900, color }}>{score}</span><span style={{ fontSize: size * 0.11, color: "rgba(255,255,255,0.3)" }}>{value}/{max}</span></div>
    {label && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 8, letterSpacing: 1.5, textTransform: "uppercase" }}>{label}</span>}
  </div>);
}

function PartBar({ part, current, max, target, prev }) {
  const pct = (current / max) * 100, tPct = target ? (target / max) * 100 : 0, diff = prev != null ? current - prev : null, isL = LP.includes(part), col = isL ? "#FF6B35" : "#00C9A7";
  return (<div style={{ marginBottom: 11 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: col, width: 24 }}>{part}</span>
        <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{current}/{max}</span>
        {diff != null && diff !== 0 && <span style={{ fontSize: 11, fontWeight: 700, color: diff > 0 ? "#00E676" : "#FF5252", background: diff > 0 ? "rgba(0,230,118,0.1)" : "rgba(255,82,82,0.1)", padding: "1px 6px", borderRadius: 4 }}>{diff > 0 ? `+${diff}` : diff}</span>}
      </div>
      {target != null && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>🎯 {target}/{max}</span>}
    </div>
    <div style={{ position: "relative", height: 7, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: col, borderRadius: 4, transition: "width 0.8s ease-out" }} />
      {target != null && <div style={{ position: "absolute", top: 0, left: `${tPct}%`, width: 2, height: "100%", background: "#FFD740" }} />}
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
  const [month, setMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; });
  const [scores, setScores] = useState({ P1: "", P2: "", P3: "", P4: "", P5: "", P6: "", P7: "" });
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

  // Certificate
  const certRef = useRef(null);
  const [certStudent, setCertStudent] = useState("");
  const [certName, setCertName] = useState("Học Viên");
  const [certListening, setCertListening] = useState(0);
  const [certReading, setCertReading] = useState(0);
  const [certTotal, setCertTotal] = useState(0);
  const [certInstructor, setCertInstructor] = useState("Trần Ngọc Diễm");
  const [exporting, setExporting] = useState(false);

  const flash = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  const moLabel = (m) => { const [y, mo] = m.split("-"); return `T${parseInt(mo)}/${y}`; };

  // Load students list
  useEffect(() => { api.getStudents().then(d => setStudents(d.students || [])).catch(() => { }); }, []);

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
    if (Object.keys(sc).length > 0) { setScores(prev => { const n = { ...prev }; Object.entries(sc).forEach(([k, v]) => n[k] = String(v)); return n; }); flash(`Nhận diện ${Object.keys(sc).length} Part`); }
    else flash("Không tìm thấy điểm", "error");
  };

  // Live preview
  const liveScore = (() => { const n = {}; Object.entries(scores).forEach(([k, v]) => n[k] = parseInt(v) || 0); return calc(n); })();

  // Submit
  const handleSubmit = async () => {
    if (!name.trim()) { flash("Nhập tên học viên", "error"); return; }
    setLoading(true);

    try {
      // 1. Save/find student
      const stuRes = await api.saveStudent({ name: name.trim(), phone, code: code || undefined });
      const stu = stuRes.student;
      setCode(stu.code);

      // 2. Save score
      const num = {}; Object.entries(scores).forEach(([k, v]) => num[k] = parseInt(v) || 0);
      const scoreRes = await api.saveScore({ code: stu.code, month, ...num });

      if (scoreRes.error) { flash(scoreRes.error, "error"); setLoading(false); return; }

      // 3. Build report
      const history = scoreRes.history || [];
      const current = scoreRes.score;
      const prevRecord = history.filter(h => h.month < month).sort((a, b) => b.month.localeCompare(a.month))[0];
      const est = calc(num);
      const lvl = findLvl(est.total);
      const nxt = nextTgt(est.total);
      const tgt = genTgt(num, nxt);

      const rpt = {
        code: stu.code, name: stu.name, phone: stu.phone, month,
        scores: num, est, lvl, nxt, tgt,
        prevSc: prevRecord ? { P1: prevRecord.P1, P2: prevRecord.P2, P3: prevRecord.P3, P4: prevRecord.P4, P5: prevRecord.P5, P6: prevRecord.P6, P7: prevRecord.P7 } : null,
        prevEst: prevRecord ? { listening: prevRecord.listening, reading: prevRecord.reading, total: prevRecord.total } : null,
        prevMo: prevRecord?.month,
        history,
      };
      setReport(rpt);
      setView("report");
      flash(`Lưu thành công! Mã: ${stu.code}`);

      // Refresh students
      api.getStudents().then(d => setStudents(d.students || []));

      // 4. AI analysis (background)
      setAiLoading(true); setAiInsight(null);
      try {
        const aiRes = await api.analyze({ name: stu.name, scores: num, prevScores: rpt.prevSc, estimate: est });
        if (aiRes.insight) setAiInsight(aiRes.insight);
      } catch { }
      setAiLoading(false);

    } catch (err) {
      flash(`Lỗi: ${err.message}`, "error");
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
          {[{ k: "input", l: "📝 Nhập" }, { k: "report", l: "📊 Báo cáo" }, { k: "screenshot", l: "📸 Chụp ảnh" }, { k: "certificate", l: "🏆 Bằng khen" }, { k: "history", l: "📈 Lịch sử" }].map(t =>
            <button key={t.k} onClick={() => setView(t.k)} className={`tag ${view === t.k ? "tag-active" : "tag-inactive"}`}>{t.l}</button>
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
                <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Gia Huy" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "var(--text-dim)", display: "block", marginBottom: 3 }}>SỐ ĐIỆN THOẠI</label>
                <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0901234567" onBlur={autoFill} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 10, color: "var(--text-dim)", display: "block", marginBottom: 3 }}>MÃ HV</label>
                <input className="input input-mono" value={code} onChange={e => setCode(e.target.value)} placeholder="ORI-XXXXX" onBlur={autoFill} style={{ letterSpacing: 1 }} />
                <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>Bỏ trống → tự sinh</div>
              </div>
              <div>
                <label style={{ fontSize: 10, color: "var(--text-dim)", display: "block", marginBottom: 3 }}>THÁNG</label>
                <input type="month" className="input" value={month} onChange={e => setMonth(e.target.value)} style={{ colorScheme: "dark" }} />
              </div>
            </div>

            <div style={{ height: 1, background: "var(--border)", margin: "12px 0" }} />

            {/* Input mode */}
            <div style={{ display: "flex", gap: 3, marginBottom: 12, background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 3 }}>
              {[{ k: "manual", l: "Nhập tay" }, { k: "text", l: "Dán text" }].map(m =>
                <button key={m.k} onClick={() => setInputMode(m.k)} style={{ flex: 1, padding: "7px 0", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: inputMode === m.k ? "rgba(255,107,53,0.15)" : "transparent", color: inputMode === m.k ? "#FF6B35" : "rgba(255,255,255,0.3)" }}>{m.l}</button>
              )}
            </div>

            {inputMode === "manual" && (
              <>
                <div style={{ fontSize: 12, color: "#FF6B35", fontWeight: 700, marginBottom: 6 }}>🎧 LISTENING</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
                  {LP.map(p => (
                    <div key={p} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "#FF6B35", width: 24 }}>{p}</span>
                      <input type="number" min={0} max={PM[p]} className="input input-mono" value={scores[p]} onChange={e => setScores(s => ({ ...s, [p]: e.target.value }))} placeholder="0" style={{ width: 56, textAlign: "center", padding: "8px" }} />
                      <span style={{ fontSize: 11, color: "var(--text-dim)" }}>/{PM[p]}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "#00C9A7", fontWeight: 700, marginBottom: 6 }}>📖 READING</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {RP.map(p => (
                    <div key={p} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "#00C9A7", width: 24 }}>{p}</span>
                      <input type="number" min={0} max={PM[p]} className="input input-mono" value={scores[p]} onChange={e => setScores(s => ({ ...s, [p]: e.target.value }))} placeholder="0" style={{ width: 56, textAlign: "center", padding: "8px" }} />
                      <span style={{ fontSize: 11, color: "var(--text-dim)" }}>/{PM[p]}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {inputMode === "text" && (
              <>
                <textarea className="input input-mono" value={textInput} onChange={e => setTextInput(e.target.value)} placeholder={"Dán điểm:\nP1: 3/6\nP2: 12/25..."} style={{ height: 120, resize: "none", fontSize: 13 }} />
                <button className="btn-primary" onClick={parseText} style={{ marginTop: 8, width: "100%" }}>🔍 Nhận diện</button>
              </>
            )}

            {/* Live preview */}
            {Object.values(scores).some(v => v !== "") && (
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
              <button className="btn-secondary" onClick={() => { setName(""); setPhone(""); setCode(""); setScores({ P1: "", P2: "", P3: "", P4: "", P5: "", P6: "", P7: "" }) }} style={{ padding: "10px 14px" }} title="Xóa form để nhập học viên mới">🗑️ Mới</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={loading || !name.trim()} style={{ flex: 1 }}>
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
              🎧 {report.est.lCorrect} đúng → <strong style={{ color: "#FF6B35" }}>{report.est.listening}</strong> · 📖 {report.est.rCorrect} đúng → <strong style={{ color: "#00C9A7" }}>{report.est.reading}</strong>
            </div>
          </div>

          {/* Parts */}
          <div className="card">
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10, letterSpacing: 1 }}>📊 CHI TIẾT</div>
            <div style={{ fontSize: 11, color: "#FF6B35", fontWeight: 700, marginBottom: 5 }}>🎧 LISTENING</div>
            {LP.map(p => <PartBar key={p} part={p} current={report.scores[p]} max={PM[p]} target={report.tgt?.[p]?.target} prev={report.prevSc?.[p]} />)}
            <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />
            <div style={{ fontSize: 11, color: "#00C9A7", fontWeight: 700, marginBottom: 5 }}>📖 READING</div>
            {RP.map(p => <PartBar key={p} part={p} current={report.scores[p]} max={PM[p]} target={report.tgt?.[p]?.target} prev={report.prevSc?.[p]} />)}
          </div>

          {/* Targets */}
          <div className="card" style={{ borderColor: "rgba(255,215,64,0.1)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#FFD740", marginBottom: 10 }}>🎯 MỤC TIÊU → {report.nxt}+</div>
            {report.tgt && Object.entries(report.tgt).map(([p, t]) => (
              <div key={p} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: LP.includes(p) ? "#FF6B35" : "#00C9A7" }}>{p}</span>
                <span style={{ fontSize: 12 }}>{t.current} → {t.target}/{PM[p]}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: t.exceeded ? "#00E676" : "#FFD740", background: t.exceeded ? "rgba(0,230,118,0.08)" : "rgba(255,215,64,0.08)", padding: "2px 7px", borderRadius: 5 }}>
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
                    {aiInsight.strengths?.map((s, i) => <div key={i} style={{ fontSize: 12, marginBottom: 2 }}>• {s}</div>)}
                  </div>
                  <div style={{ padding: 8, background: "rgba(255,82,82,0.05)", borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: "#FF5252", fontWeight: 700, marginBottom: 3 }}>⚠️ CẢI THIỆN</div>
                    {aiInsight.weaknesses?.map((w, i) => <div key={i} style={{ fontSize: 12, marginBottom: 2 }}>• {w}</div>)}
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
        </div>
      )}

      {/* ═══ SCREENSHOT REPORT ═══ */}
      {view === "screenshot" && report && (() => {
        const extra50 = calcExtraNeeded(report.est.lCorrect, report.est.rCorrect, 50);
        const extra100 = calcExtraNeeded(report.est.lCorrect, report.est.rCorrect, 100);
        return (
          <div style={{ padding: 0 }}>
            {/* Screenshot-friendly card */}
            <div style={{
              background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
              borderRadius: 20,
              padding: "24px 20px",
              border: "2px solid rgba(255,215,64,0.3)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
            }}>
              {/* Header with branding */}
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{
                  fontSize: 11,
                  letterSpacing: 4,
                  color: "#FFD740",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  marginBottom: 4
                }}>ORI EDUCATION</div>
                <div style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,0.4)",
                  letterSpacing: 2
                }}>BÁO CÁO ĐIỂM TOEIC · {moLabel(report.month)}</div>
              </div>

              {/* Student name */}
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <h2 style={{
                  fontSize: 28,
                  fontWeight: 900,
                  margin: 0,
                  color: "#fff",
                  textShadow: "0 2px 10px rgba(255,107,53,0.3)"
                }}>{report.name}</h2>
                <div style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.4)",
                  marginTop: 4
                }}>Mã HV: {report.code}</div>
              </div>

              {/* Main score circle */}
              <div style={{
                textAlign: "center",
                margin: "20px 0",
                position: "relative"
              }}>
                <div style={{
                  width: 140,
                  height: 140,
                  margin: "0 auto",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, rgba(255,107,53,0.2), rgba(0,201,167,0.2))",
                  border: "4px solid",
                  borderColor: "#FFD740",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 40px rgba(255,215,64,0.3)"
                }}>
                  <div className="mono" style={{
                    fontSize: 48,
                    fontWeight: 900,
                    background: "linear-gradient(135deg, #FF6B35, #FFD740)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent"
                  }}>{report.est.total}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>/ 990</div>
                </div>

                {/* Change indicator */}
                {report.prevEst && (
                  <div style={{
                    position: "absolute",
                    right: "calc(50% - 90px)",
                    top: 10,
                    padding: "4px 10px",
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 800,
                    background: report.est.total >= report.prevEst.total
                      ? "linear-gradient(135deg, #00E676, #00C853)"
                      : "linear-gradient(135deg, #FF5252, #D32F2F)",
                    color: "#fff",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.3)"
                  }}>
                    {report.est.total >= report.prevEst.total ? "↑" : "↓"} {Math.abs(report.est.total - report.prevEst.total)}
                  </div>
                )}
              </div>

              {/* L/R breakdown */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 20
              }}>
                <div style={{
                  background: "rgba(255,107,53,0.15)",
                  borderRadius: 12,
                  padding: 12,
                  textAlign: "center",
                  border: "1px solid rgba(255,107,53,0.3)"
                }}>
                  <div style={{ fontSize: 10, color: "#FF6B35", fontWeight: 700, marginBottom: 4 }}>🎧 LISTENING</div>
                  <div className="mono" style={{ fontSize: 28, fontWeight: 900, color: "#FF6B35" }}>{report.est.listening}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{report.est.lCorrect}/100 đúng</div>
                </div>
                <div style={{
                  background: "rgba(0,201,167,0.15)",
                  borderRadius: 12,
                  padding: 12,
                  textAlign: "center",
                  border: "1px solid rgba(0,201,167,0.3)"
                }}>
                  <div style={{ fontSize: 10, color: "#00C9A7", fontWeight: 700, marginBottom: 4 }}>📖 READING</div>
                  <div className="mono" style={{ fontSize: 28, fontWeight: 900, color: "#00C9A7" }}>{report.est.reading}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{report.est.rCorrect}/100 đúng</div>
                </div>
              </div>

              {/* Part breakdown */}
              <div style={{
                background: "rgba(255,255,255,0.03)",
                borderRadius: 12,
                padding: 12,
                marginBottom: 16
              }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 8, letterSpacing: 1 }}>CHI TIẾT TỪNG PART</div>
                <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                  {AP.map(p => (
                    <div key={p} style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      background: LP.includes(p) ? "rgba(255,107,53,0.1)" : "rgba(0,201,167,0.1)",
                      border: `1px solid ${LP.includes(p) ? "rgba(255,107,53,0.3)" : "rgba(0,201,167,0.3)"}`,
                      textAlign: "center",
                      minWidth: 50
                    }}>
                      <div className="mono" style={{ fontSize: 10, color: LP.includes(p) ? "#FF6B35" : "#00C9A7", fontWeight: 700 }}>{p}</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{report.scores[p]}/{PM[p]}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Target goals +50 and +100 */}
              <div style={{
                background: "linear-gradient(135deg, rgba(255,215,64,0.1), rgba(255,107,53,0.1))",
                borderRadius: 16,
                padding: 16,
                border: "2px solid rgba(255,215,64,0.3)"
              }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#FFD740",
                  marginBottom: 12,
                  textAlign: "center",
                  letterSpacing: 1
                }}>🎯 MỤC TIÊU THÁNG SAU</div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {/* +50 target */}
                  <div style={{
                    background: "rgba(0,0,0,0.3)",
                    borderRadius: 12,
                    padding: 12,
                    textAlign: "center"
                  }}>
                    <div style={{ fontSize: 10, color: "#00E676", fontWeight: 700, marginBottom: 4 }}>TĂNG +50 ĐIỂM</div>
                    <div className="mono" style={{ fontSize: 22, fontWeight: 900, color: "#00E676" }}>{report.est.total + 50}</div>
                    <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "8px 0" }}></div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
                      Cần thêm: <span style={{ fontWeight: 800, color: "#FFD740" }}>{extra50.extraTotal} câu</span>
                    </div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                      (L +{extra50.extraL} / R +{extra50.extraR})
                    </div>
                  </div>

                  {/* +100 target */}
                  <div style={{
                    background: "rgba(0,0,0,0.3)",
                    borderRadius: 12,
                    padding: 12,
                    textAlign: "center"
                  }}>
                    <div style={{ fontSize: 10, color: "#FF6B35", fontWeight: 700, marginBottom: 4 }}>TĂNG +100 ĐIỂM</div>
                    <div className="mono" style={{ fontSize: 22, fontWeight: 900, color: "#FF6B35" }}>{Math.min(990, report.est.total + 100)}</div>
                    <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "8px 0" }}></div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
                      Cần thêm: <span style={{ fontWeight: 800, color: "#FFD740" }}>{extra100.extraTotal} câu</span>
                    </div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                      (L +{extra100.extraL} / R +{extra100.extraR})
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{
                textAlign: "center",
                marginTop: 16,
                paddingTop: 12,
                borderTop: "1px solid rgba(255,255,255,0.1)"
              }}>
                <div style={{ fontSize: 10, color: "#FFD740", fontWeight: 700, marginBottom: 2 }}>ORI EDUCATION</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>📞 0906 303 373 · Zalo hỗ trợ 24/7</div>
              </div>
            </div>

            <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: "var(--text-dim)" }}>
              📸 Chụp ảnh màn hình phía trên để gửi cho học viên!
            </div>
          </div>
        );
      })()}

      {view === "screenshot" && !report && (
        <div className="card" style={{ textAlign: "center", padding: 30 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📸</div>
          <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 10 }}>Chưa có báo cáo</div>
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Vui lòng nhập điểm và tạo báo cáo trước</div>
          <button className="btn-primary" onClick={() => setView("input")} style={{ marginTop: 16 }}>
            📝 Đi đến Nhập điểm
          </button>
        </div>
      )}

      {/* ═══ CERTIFICATE ═══ */}
      {view === "certificate" && (() => {
        const loadCertStudent = async (code) => {
          setCertStudent(code);
          const student = students.find(s => s.code === code);
          if (student) {
            setCertName(student.name);
            // Load latest score
            const h = await api.getHistory(code);
            if (h.scores?.length > 0) {
              const latest = h.scores.sort((a, b) => b.month.localeCompare(a.month))[0];
              setCertListening(latest.listening);
              setCertReading(latest.reading);
              setCertTotal(latest.total);
            }
          }
        };

        const exportImage = async () => {
          if (!certRef.current) return;
          setExporting(true);
          try {
            const html2canvas = (await import("html2canvas")).default;
            const canvas = await html2canvas(certRef.current, {
              scale: 2,
              backgroundColor: "#ffffff",
              useCORS: true,
              logging: false
            });
            const link = document.createElement("a");
            link.download = `bangkhen-${certName.replace(/\s+/g, "-")}-${Date.now()}.jpg`;
            link.href = canvas.toDataURL("image/jpeg", 0.95);
            link.click();
            flash("✅ Đã tải xuống bằng khen!");
          } catch (err) {
            console.error(err);
            flash("❌ Lỗi xuất ảnh", "error");
          }
          setExporting(false);
        };

        const today = new Date();
        const dateStr = `TP. Hồ Chí Minh, ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;
        const instructorSign = certInstructor === "Grace Phạm" ? "Grace" :
          certInstructor === "Đỗ Ngọc Loan" ? "N. Loan" : "T. N. Diễm";

        return (
          <div>
            {/* Controls */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#FFD740", marginBottom: 12 }}>🏆 TẠO BẰNG KHEN</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 10, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>CHỌN HỌC VIÊN</label>
                  <select
                    className="input"
                    value={certStudent}
                    onChange={e => loadCertStudent(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <option value="">-- Chọn hoặc nhập tay bên dưới --</option>
                    {students.map(s => (
                      <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>GIÁO VIÊN</label>
                  <select
                    className="input"
                    value={certInstructor}
                    onChange={e => setCertInstructor(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <option value="Trần Ngọc Diễm">Trần Ngọc Diễm</option>
                    <option value="Grace Phạm">Grace Phạm</option>
                    <option value="Đỗ Ngọc Loan">Đỗ Ngọc Loan</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 10, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>TÊN</label>
                  <input className="input" value={certName} onChange={e => setCertName(e.target.value)} style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>LISTENING</label>
                  <input className="input" type="number" value={certListening} onChange={e => setCertListening(Number(e.target.value))} style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>READING</label>
                  <input className="input" type="number" value={certReading} onChange={e => setCertReading(Number(e.target.value))} style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>TỔNG</label>
                  <input className="input" type="number" value={certTotal} onChange={e => setCertTotal(Number(e.target.value))} style={{ width: "100%" }} />
                </div>
              </div>

              <button
                className="btn-primary"
                onClick={exportImage}
                disabled={exporting}
                style={{ width: "100%" }}
              >
                {exporting ? "⏳ Đang xuất..." : "📥 TẢI XUỐNG BẰNG KHEN (JPG)"}
              </button>
            </div>

            {/* Certificate Preview - Expert Design */}
            {(() => {
              // Dynamic font size: tên ngắn → to, tên dài → nhỏ hơn
              const nameLen = certName.length;
              const nameFontSize = nameLen <= 6 ? 72 : nameLen <= 10 ? 60 : nameLen <= 15 ? 50 : nameLen <= 20 ? 42 : 34;

              return (
                <div ref={certRef} style={{
                  width: "100%",
                  aspectRatio: "210/297",
                  background: "linear-gradient(180deg, #ffffff 0%, #fefefe 100%)",
                  border: "14px solid #1e3a8a",
                  position: "relative",
                  boxSizing: "border-box",
                  fontFamily: "Times New Roman, serif",
                  color: "#1e3a8a",
                  overflow: "hidden"
                }}>
                  {/* Inner gold border frame */}
                  <div style={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    right: 12,
                    bottom: 12,
                    border: "3px double #d4af37",
                    pointerEvents: "none"
                  }} />

                  {/* Content area with proper margin - safe distance from border */}
                  <div style={{
                    position: "absolute",
                    top: 36,
                    left: 36,
                    right: 36,
                    bottom: 36,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}>
                    {/* Corner decorations - inside content with offset */}
                    <div style={{ position: "absolute", top: -8, left: -8, width: 40, height: 40, borderTop: "3px solid #d4af37", borderLeft: "3px solid #d4af37" }} />
                    <div style={{ position: "absolute", top: -8, right: -8, width: 40, height: 40, borderTop: "3px solid #d4af37", borderRight: "3px solid #d4af37" }} />
                    <div style={{ position: "absolute", bottom: -8, left: -8, width: 40, height: 40, borderBottom: "3px solid #d4af37", borderLeft: "3px solid #d4af37" }} />
                    <div style={{ position: "absolute", bottom: -8, right: -8, width: 40, height: 40, borderBottom: "3px solid #d4af37", borderRight: "3px solid #d4af37" }} />

                    {/* ═══ HEADER - với padding để tránh góc trang trí ═══ */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingTop: 8, paddingLeft: 40, paddingRight: 40 }}>
                      <div style={{
                        padding: "7px 16px",
                        background: "linear-gradient(135deg, #1e3a8a 0%, #172554 100%)",
                        color: "#d4af37",
                        fontFamily: "Montserrat, Arial, sans-serif",
                        fontWeight: 700,
                        fontSize: 14,
                        letterSpacing: 2,
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                      }}>ORI ACADEMY</div>
                      <div style={{ fontStyle: "italic", fontSize: 13, color: "#475569", paddingTop: 6 }}>{dateStr}</div>
                    </div>

                    {/* ═══ TITLE ═══ */}
                    <div style={{ textAlign: "center", marginTop: 12 }}>
                      <h1 style={{
                        fontFamily: "Playfair Display, serif",
                        fontSize: 56,
                        fontWeight: 700,
                        margin: 0,
                        textTransform: "uppercase",
                        letterSpacing: 8,
                        background: "linear-gradient(135deg, #1e3a8a 0%, #c9a227 50%, #1e3a8a 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        textShadow: "none"
                      }}>Bằng Khen</h1>
                      <div style={{
                        fontFamily: "Montserrat, Arial, sans-serif",
                        fontSize: 15,
                        fontWeight: 600,
                        color: "#d4af37",
                        letterSpacing: 4,
                        textTransform: "uppercase",
                        marginTop: 6
                      }}>TOEIC ACHIEVEMENT AWARD</div>
                    </div>

                    {/* ═══ RECIPIENT ═══ */}
                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        fontSize: 16,
                        color: "#475569",
                        marginBottom: 12,
                        fontStyle: "italic",
                        letterSpacing: 0.5
                      }}>Hệ thống Anh ngữ ORI trân trọng trao tặng cho</div>

                      {/* === STUDENT NAME - PROMINENT === */}
                      <div style={{
                        fontFamily: "Great Vibes, cursive",
                        fontSize: nameFontSize,
                        color: "#1e3a8a",
                        lineHeight: 1.15,
                        padding: "8px 0",
                        textShadow: "1px 1px 2px rgba(30,58,138,0.1)"
                      }}>{certName}</div>
                    </div>

                    {/* ═══ SCORE SECTION - Centered with equal spacing ═══ */}
                    <div style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: 16
                    }}>
                      <div style={{
                        fontSize: 15,
                        lineHeight: 1.7,
                        color: "#334155",
                        letterSpacing: 0.3,
                        textAlign: "center"
                      }}>
                        Đã hoàn thành xuất sắc kỳ thi thử TOEIC chuẩn quốc tế<br />
                        với kết quả đạt được như sau:
                      </div>

                      {/* Score box - Centered and balanced */}
                      <div style={{
                        padding: "24px 56px",
                        background: "linear-gradient(180deg, #fefefe 0%, #f8f9fa 100%)",
                        border: "2px solid #d4af37",
                        position: "relative",
                        boxShadow: "0 4px 12px rgba(212,175,55,0.15)",
                        textAlign: "center"
                      }}>
                        <div style={{ position: "absolute", top: 5, left: 5, right: 5, bottom: 5, border: "1px solid rgba(212,175,55,0.3)", pointerEvents: "none" }} />

                        {/* Listening & Reading - Blue text */}
                        <div style={{ display: "flex", gap: 56, justifyContent: "center", marginBottom: 16 }}>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontWeight: 600, color: "#1e3a8a", fontSize: 14, marginBottom: 4 }}>Listening</div>
                            <div style={{ fontWeight: 800, color: "#1e3a8a", fontSize: 26 }}>{certListening}</div>
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontWeight: 600, color: "#1e3a8a", fontSize: 14, marginBottom: 4 }}>Reading</div>
                            <div style={{ fontWeight: 800, color: "#1e3a8a", fontSize: 26 }}>{certReading}</div>
                          </div>
                        </div>

                        {/* Total - Gold and bigger */}
                        <div style={{ fontSize: 12, color: "#64748b", letterSpacing: 1.5, marginBottom: 8, textTransform: "uppercase", textAlign: "center" }}>Tổng điểm đạt được</div>
                        <div style={{ fontSize: 52, fontWeight: 800, color: "#d4af37", lineHeight: 1, textShadow: "1px 1px 2px rgba(0,0,0,0.1)", textAlign: "center" }}>{certTotal}</div>
                      </div>
                    </div>

                    {/* ═══ SIGNATURES - với padding để tránh góc trang trí ═══ */}
                    <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: 50, paddingRight: 50, paddingBottom: 8 }}>
                      <div style={{ textAlign: "center", width: 150 }}>
                        <div style={{ height: 42, borderBottom: "2px solid #d4af37", position: "relative", marginBottom: 8 }}>
                          <div style={{
                            position: "absolute",
                            bottom: 8,
                            left: "50%",
                            transform: "translateX(-50%)",
                            fontFamily: "Great Vibes, cursive",
                            fontSize: 26,
                            color: "#1e40af",
                            whiteSpace: "nowrap"
                          }}>{instructorSign}</div>
                        </div>
                        <div style={{ fontFamily: "Montserrat, Arial, sans-serif", fontWeight: 700, color: "#1e3a8a", textTransform: "uppercase", fontSize: 10, letterSpacing: 1 }}>Giáo viên hướng dẫn</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginTop: 4 }}>{certInstructor}</div>
                      </div>

                      <div style={{ textAlign: "center", width: 150 }}>
                        <div style={{ height: 42, borderBottom: "2px solid #d4af37", position: "relative", marginBottom: 8 }}>
                          <div style={{
                            position: "absolute",
                            bottom: 8,
                            left: "50%",
                            transform: "translateX(-50%)",
                            fontFamily: "Great Vibes, cursive",
                            fontSize: 26,
                            color: "#1e40af",
                            whiteSpace: "nowrap"
                          }}>T. N. Diễm</div>
                        </div>
                        <div style={{ fontFamily: "Montserrat, Arial, sans-serif", fontWeight: 700, color: "#1e3a8a", textTransform: "uppercase", fontSize: 10, letterSpacing: 1 }}>Giám đốc trung tâm</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginTop: 4 }}>Trần Ngọc Diễm</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: "var(--text-dim)" }}>
              📸 Xem trước bằng khen · Nhấn nút tải xuống để lưu ảnh JPG
            </div>
          </div>
        );
      })()}


      {view === "history" && (
        <div>
          <div className="card">
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>📈 LỊCH SỬ ĐIỂM</div>
            {students.length === 0 ? <div style={{ textAlign: "center", padding: 24, color: "var(--text-dim)" }}>📭 Chưa có học viên</div> : (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                  {students.map(s => (
                    <button key={s.code} onClick={() => loadHistory(s.code)} className={`tag ${selStudent === s.code ? "tag-active" : "tag-inactive"}`}>
                      {s.name} <span style={{ opacity: 0.4, fontSize: 10 }}>{s.code}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Progress Chart - Screenshot Optimized */}
          {selStudent && selHistory.length > 0 && (() => {
            const sorted = [...selHistory].sort((a, b) => a.month.localeCompare(b.month));
            const studentInfo = students.find(s => s.code === selStudent);
            const maxScore = 990;
            const firstScore = sorted[0]?.total || 0;
            const lastScore = sorted[sorted.length - 1]?.total || 0;
            const totalProgress = lastScore - firstScore;

            return (
              <div style={{
                background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
                borderRadius: 20,
                padding: "20px 16px",
                border: "2px solid rgba(255,215,64,0.3)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                marginTop: 12
              }}>
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 10, letterSpacing: 3, color: "#FFD740", fontWeight: 700 }}>ORI EDUCATION</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>BIỂU ĐỒ TIẾN BỘ TOEIC</div>
                  <h3 style={{ fontSize: 22, fontWeight: 900, color: "#fff", margin: 0 }}>{studentInfo?.name || selStudent}</h3>
                </div>

                {/* Total Progress Badge */}
                <div style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 12,
                  marginBottom: 20
                }}>
                  <div style={{
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: 12,
                    padding: "10px 16px",
                    textAlign: "center"
                  }}>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>LẦN ĐẦU</div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 800, color: "#FF6B35" }}>{firstScore}</div>
                  </div>
                  <div style={{
                    background: totalProgress >= 0 ? "rgba(0,230,118,0.15)" : "rgba(255,82,82,0.15)",
                    borderRadius: 12,
                    padding: "10px 16px",
                    textAlign: "center",
                    border: `2px solid ${totalProgress >= 0 ? "rgba(0,230,118,0.5)" : "rgba(255,82,82,0.5)"}`
                  }}>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>TIẾN BỘ</div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 900, color: totalProgress >= 0 ? "#00E676" : "#FF5252" }}>
                      {totalProgress >= 0 ? `+${totalProgress}` : totalProgress}
                    </div>
                  </div>
                  <div style={{
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: 12,
                    padding: "10px 16px",
                    textAlign: "center"
                  }}>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>HIỆN TẠI</div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 800, color: "#00C9A7" }}>{lastScore}</div>
                  </div>
                </div>

                {/* Bar Chart */}
                <div style={{
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16
                }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 12, letterSpacing: 1 }}>ĐIỂM TỔNG QUA CÁC THÁNG</div>

                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120, justifyContent: "center" }}>
                    {sorted.map((rec, idx) => {
                      const height = (rec.total / maxScore) * 100;
                      const prevRec = idx > 0 ? sorted[idx - 1] : null;
                      const change = prevRec ? rec.total - prevRec.total : 0;
                      return (
                        <div key={rec.month} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, maxWidth: 60 }}>
                          {/* Change indicator */}
                          {change !== 0 && (
                            <div style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: change > 0 ? "#00E676" : "#FF5252",
                              marginBottom: 4
                            }}>
                              {change > 0 ? `+${change}` : change}
                            </div>
                          )}
                          {/* Bar */}
                          <div style={{
                            width: "100%",
                            height: `${height}%`,
                            minHeight: 20,
                            background: `linear-gradient(180deg, #FFD740 0%, #FF6B35 100%)`,
                            borderRadius: "8px 8px 4px 4px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "flex-end",
                            alignItems: "center",
                            paddingBottom: 4,
                            boxShadow: "0 4px 15px rgba(255,107,53,0.3)"
                          }}>
                            <div className="mono" style={{ fontSize: 12, fontWeight: 900, color: "#1a1a2e" }}>{rec.total}</div>
                          </div>
                          {/* Month label */}
                          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>{moLabel(rec.month)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* L/R Breakdown Chart */}
                <div style={{
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: 16,
                  padding: 16
                }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 12, letterSpacing: 1 }}>LISTENING vs READING</div>

                  <div style={{ display: "flex", gap: 16 }}>
                    {/* Listening chart */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: "#FF6B35", fontWeight: 700, marginBottom: 8, textAlign: "center" }}>🎧 LISTENING</div>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 60, justifyContent: "center" }}>
                        {sorted.map(rec => (
                          <div key={rec.month} style={{
                            flex: 1,
                            maxWidth: 30,
                            height: `${(rec.listening / 495) * 100}%`,
                            minHeight: 10,
                            background: "linear-gradient(180deg, #FF6B35, #FF8C5A)",
                            borderRadius: 4,
                            display: "flex",
                            alignItems: "flex-end",
                            justifyContent: "center"
                          }}>
                            <span style={{ fontSize: 8, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{rec.listening}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Reading chart */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: "#00C9A7", fontWeight: 700, marginBottom: 8, textAlign: "center" }}>📖 READING</div>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 60, justifyContent: "center" }}>
                        {sorted.map(rec => (
                          <div key={rec.month} style={{
                            flex: 1,
                            maxWidth: 30,
                            height: `${(rec.reading / 495) * 100}%`,
                            minHeight: 10,
                            background: "linear-gradient(180deg, #00C9A7, #00E7C1)",
                            borderRadius: 4,
                            display: "flex",
                            alignItems: "flex-end",
                            justifyContent: "center"
                          }}>
                            <span style={{ fontSize: 8, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{rec.reading}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ textAlign: "center", marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={{ fontSize: 10, color: "#FFD740", fontWeight: 700 }}>ORI EDUCATION</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>📞 0906 303 373</div>
                </div>
              </div>
            );
          })()}

          {/* Detailed History List */}
          {selStudent && selHistory.length > 0 && (
            <div className="card" style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>📋 CHI TIẾT TỪNG THÁNG</div>
              {selHistory.sort((a, b) => b.month.localeCompare(a.month)).map((rec, idx, arr) => {
                const prev = idx + 1 < arr.length ? arr[idx + 1] : null;
                const diff = prev ? rec.total - prev.total : null;
                return (
                  <div key={rec.month} style={{ padding: 12, marginBottom: 6, background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{moLabel(rec.month)}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span className="mono" style={{ fontSize: 18, fontWeight: 900, color: "#FFD740" }}>{rec.total}</span>
                        {diff != null && <span style={{ fontSize: 12, fontWeight: 700, color: diff >= 0 ? "#00E676" : "#FF5252" }}>{diff >= 0 ? `+${diff}` : diff}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>
                      <span>🎧 {rec.lCorrect}đúng → <strong style={{ color: "#FF6B35" }}>{rec.listening}</strong></span>
                      <span>📖 {rec.rCorrect}đúng → <strong style={{ color: "#00C9A7" }}>{rec.reading}</strong></span>
                    </div>
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                      {["P1", "P2", "P3", "P4", "P5", "P6", "P7"].map(p => (
                        <span key={p} className="mono" style={{ fontSize: 10, padding: "2px 5px", borderRadius: 4, background: LP.includes(p) ? "rgba(255,107,53,0.06)" : "rgba(0,201,167,0.06)", color: LP.includes(p) ? "#FF6B35" : "#00C9A7" }}>{p}:{rec[p]}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selStudent && selHistory.length === 0 && (
            <div className="card" style={{ marginTop: 12, textAlign: "center", padding: 20 }}>
              <div style={{ color: "var(--text-dim)", fontSize: 13 }}>Chưa có bản ghi điểm</div>
            </div>
          )}
        </div>
      )}

      {/* ═══ LOOKUP ═══ */}
      {view === "lookup" && (
        <div className="card">
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>🔍 TRA CỨU</div>
          <input className="input" value={lookupQ} onChange={e => doLookup(e.target.value)} placeholder="Nhập tên, SĐT, hoặc mã HV..." style={{ marginBottom: 12 }} />
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
