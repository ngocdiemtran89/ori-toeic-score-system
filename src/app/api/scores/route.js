// src/app/api/scores/route.js
import { NextResponse } from "next/server";
import { getScoresByStudent, getAllScores, upsertScore, initSheets } from "@/lib/sheets";
import { calcScore } from "@/lib/toeic";

// GET /api/scores?code=xxx or GET /api/scores (all)
export async function GET(request) {
  try {
    await initSheets();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (code) {
      const scores = await getScoresByStudent(code);
      return NextResponse.json({ scores });
    }

    const scores = await getAllScores();
    return NextResponse.json({ scores });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/scores { code, month, P1, P2, P3, P4, P5, P6, P7 }
export async function POST(request) {
  try {
    await initSheets();
    const body = await request.json();
    const { code, month, P1, P2, P3, P4, P5, P6, P7 } = body;

    if (!code || !month) {
      return NextResponse.json({ error: "code và month là bắt buộc" }, { status: 400 });
    }

    const parts = {
      P1: parseInt(P1) || 0,
      P2: parseInt(P2) || 0,
      P3: parseInt(P3) || 0,
      P4: parseInt(P4) || 0,
      P5: parseInt(P5) || 0,
      P6: parseInt(P6) || 0,
      P7: parseInt(P7) || 0,
    };

    const calculated = calcScore(parts);

    await upsertScore(code, month, parts, calculated);

    // Get all scores for this student to include history
    const allScores = await getScoresByStudent(code);

    return NextResponse.json({
      ok: true,
      score: { ...parts, ...calculated, month },
      history: allScores,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
