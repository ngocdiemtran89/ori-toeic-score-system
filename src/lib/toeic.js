// src/lib/toeic.js
// ══════════════════════════════════════════════════════════════
// TOEIC Official Conversion Tables & Score Calculation
// ══════════════════════════════════════════════════════════════

export const LISTENING_TABLE = [5,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100,105,110,115,120,125,130,135,140,145,150,155,160,165,170,175,180,185,190,195,200,205,210,215,220,225,230,235,240,245,250,255,260,265,270,275,280,285,290,295,300,305,310,315,320,325,330,335,340,345,350,355,360,365,370,375,380,385,395,400,405,410,415,420,425,430,435,440,445,450,455,460,465,470,475,480,485,490,495,495,495,495,495];

export const READING_TABLE = [5,5,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100,105,110,115,120,125,130,135,140,145,150,155,160,165,170,175,180,185,190,195,200,205,210,215,220,225,230,235,240,245,250,255,260,265,270,275,280,285,290,295,300,305,310,315,320,325,330,335,340,345,350,355,360,365,370,375,380,385,390,395,400,405,410,415,420,425,430,435,440,445,450,455,460,465,470,475,480,485,490,495];

export const PART_MAX = { P1: 6, P2: 25, P3: 39, P4: 30, P5: 30, P6: 16, P7: 54 };
export const L_PARTS = ["P1", "P2", "P3", "P4"];
export const R_PARTS = ["P5", "P6", "P7"];

export const TOEIC_STANDARDS = {
  450: { L: { P1: 3, P2: 10, P3: 12, P4: 10 }, R: { P5: 12, P6: 5, P7: 20 } },
  500: { L: { P1: 3, P2: 13, P3: 16, P4: 12 }, R: { P5: 15, P6: 7, P7: 26 } },
  550: { L: { P1: 4, P2: 16, P3: 20, P4: 18 }, R: { P5: 18, P6: 8, P7: 32 } },
  600: { L: { P1: 5, P2: 19, P3: 24, P4: 22 }, R: { P5: 22, P6: 10, P7: 38 } },
  650: { L: { P1: 5, P2: 21, P3: 28, P4: 24 }, R: { P5: 24, P6: 12, P7: 42 } },
  700: { L: { P1: 6, P2: 23, P3: 32, P4: 26 }, R: { P5: 26, P6: 13, P7: 46 } },
  750: { L: { P1: 6, P2: 24, P3: 34, P4: 28 }, R: { P5: 28, P6: 14, P7: 48 } },
  800: { L: { P1: 6, P2: 25, P3: 36, P4: 28 }, R: { P5: 28, P6: 15, P7: 50 } },
};

export function calcScore(parts) {
  const lCorrect = L_PARTS.reduce((s, p) => s + (parts[p] || 0), 0);
  const rCorrect = R_PARTS.reduce((s, p) => s + (parts[p] || 0), 0);
  const lClamped = Math.min(100, Math.max(0, lCorrect));
  const rClamped = Math.min(100, Math.max(0, rCorrect));
  const listening = LISTENING_TABLE[lClamped];
  const reading = READING_TABLE[rClamped];
  return { listening, reading, total: listening + reading, lCorrect, rCorrect };
}

export function findLevel(total) {
  const lvs = Object.keys(TOEIC_STANDARDS).map(Number).sort((a, b) => a - b);
  let c = lvs[0];
  for (const l of lvs) if (total >= l) c = l;
  return c;
}

export function getNextTarget(total) {
  const lvs = Object.keys(TOEIC_STANDARDS).map(Number).sort((a, b) => a - b);
  for (const l of lvs) if (l > total) return l;
  return lvs[lvs.length - 1] + 50;
}

export function genTargets(current, targetLevel) {
  const std = TOEIC_STANDARDS[targetLevel];
  if (!std) return null;
  const targets = {};
  [...L_PARTS, ...R_PARTS].forEach((p) => {
    const sec = L_PARTS.includes(p) ? "L" : "R";
    const tgt = std[sec][p];
    const cur = current[p] || 0;
    targets[p] = { current: cur, target: tgt, diff: Math.max(0, tgt - cur), exceeded: cur >= tgt };
  });
  return targets;
}

export function genStudentCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "ORI-";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
