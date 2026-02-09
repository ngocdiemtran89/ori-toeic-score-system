// src/lib/sheets.js
// ══════════════════════════════════════════════════════════════
// Google Sheets Database Layer
// Sheet structure:
//   Sheet "students": Mã HV | Tên | SĐT | Ngày tạo
//   Sheet "scores":   Mã HV | Tháng | P1 | P2 | P3 | P4 | P5 | P6 | P7 | L Đúng | R Đúng | L Điểm | R Điểm | Tổng | Ngày nhập
// ══════════════════════════════════════════════════════════════

import { google } from "googleapis";

let sheetsClient = null;

function getClient() {
  if (sheetsClient) return sheetsClient;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// ─── Initialize sheets if they don't exist ────────────────────
export async function initSheets() {
  const sheets = getClient();

  try {
    const res = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const existing = res.data.sheets.map((s) => s.properties.title);

    const requests = [];

    if (!existing.includes("students")) {
      requests.push({ addSheet: { properties: { title: "students" } } });
    }
    if (!existing.includes("scores")) {
      requests.push({ addSheet: { properties: { title: "scores" } } });
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: { requests },
      });
    }

    // Add headers if empty
    const studentsData = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "students!A1:D1",
    });
    if (!studentsData.data.values || studentsData.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: "students!A1:D1",
        valueInputOption: "RAW",
        requestBody: {
          values: [["Mã HV", "Tên", "SĐT", "Ngày tạo"]],
        },
      });
    }

    const scoresData = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "scores!A1:O1",
    });
    if (!scoresData.data.values || scoresData.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: "scores!A1:O1",
        valueInputOption: "RAW",
        requestBody: {
          values: [
            [
              "Mã HV", "Tháng", "P1", "P2", "P3", "P4", "P5", "P6", "P7",
              "L Đúng", "R Đúng", "L Điểm", "R Điểm", "Tổng", "Ngày nhập",
            ],
          ],
        },
      });
    }

    return { ok: true };
  } catch (error) {
    console.error("initSheets error:", error.message);
    return { ok: false, error: error.message };
  }
}

// ─── Students CRUD ────────────────────────────────────────────
export async function getAllStudents() {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "students!A2:D1000",
  });
  const rows = res.data.values || [];
  return rows.map((r) => ({
    code: r[0] || "",
    name: r[1] || "",
    phone: r[2] || "",
    createdAt: r[3] || "",
  }));
}

export async function findStudent(query) {
  const all = await getAllStudents();
  const q = query.toLowerCase();
  return all.find(
    (s) =>
      s.code.toLowerCase() === q ||
      s.phone === query ||
      s.name.toLowerCase().includes(q)
  );
}

export async function createStudent(code, name, phone) {
  const sheets = getClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "students!A:D",
    valueInputOption: "RAW",
    requestBody: {
      values: [[code, name, phone, new Date().toISOString().slice(0, 10)]],
    },
  });
  return { code, name, phone };
}

export async function updateStudent(code, name, phone) {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "students!A2:D1000",
  });
  const rows = res.data.values || [];
  const idx = rows.findIndex((r) => r[0] === code);
  if (idx === -1) return null;

  const rowNum = idx + 2;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `students!B${rowNum}:C${rowNum}`,
    valueInputOption: "RAW",
    requestBody: { values: [[name, phone]] },
  });
  return { code, name, phone };
}

// ─── Scores CRUD ──────────────────────────────────────────────
export async function getScoresByStudent(code) {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "scores!A2:O5000",
  });
  const rows = res.data.values || [];
  return rows
    .filter((r) => r[0] === code)
    .map((r) => ({
      code: r[0],
      month: r[1],
      P1: parseInt(r[2]) || 0,
      P2: parseInt(r[3]) || 0,
      P3: parseInt(r[4]) || 0,
      P4: parseInt(r[5]) || 0,
      P5: parseInt(r[6]) || 0,
      P6: parseInt(r[7]) || 0,
      P7: parseInt(r[8]) || 0,
      lCorrect: parseInt(r[9]) || 0,
      rCorrect: parseInt(r[10]) || 0,
      listening: parseInt(r[11]) || 0,
      reading: parseInt(r[12]) || 0,
      total: parseInt(r[13]) || 0,
      createdAt: r[14] || "",
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export async function getAllScores() {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "scores!A2:O5000",
  });
  const rows = res.data.values || [];
  return rows.map((r) => ({
    code: r[0],
    month: r[1],
    P1: parseInt(r[2]) || 0,
    P2: parseInt(r[3]) || 0,
    P3: parseInt(r[4]) || 0,
    P4: parseInt(r[5]) || 0,
    P5: parseInt(r[6]) || 0,
    P6: parseInt(r[7]) || 0,
    P7: parseInt(r[8]) || 0,
    lCorrect: parseInt(r[9]) || 0,
    rCorrect: parseInt(r[10]) || 0,
    listening: parseInt(r[11]) || 0,
    reading: parseInt(r[12]) || 0,
    total: parseInt(r[13]) || 0,
    createdAt: r[14] || "",
  }));
}

export async function upsertScore(code, month, parts, calculated) {
  const sheets = getClient();

  // Check if exists
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "scores!A2:B5000",
  });
  const rows = res.data.values || [];
  const idx = rows.findIndex((r) => r[0] === code && r[1] === month);

  const row = [
    code, month,
    parts.P1, parts.P2, parts.P3, parts.P4, parts.P5, parts.P6, parts.P7,
    calculated.lCorrect, calculated.rCorrect,
    calculated.listening, calculated.reading, calculated.total,
    new Date().toISOString().slice(0, 16),
  ];

  if (idx >= 0) {
    // Update
    const rowNum = idx + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `scores!A${rowNum}:O${rowNum}`,
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });
  } else {
    // Append
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "scores!A:O",
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });
  }

  return { ok: true };
}
