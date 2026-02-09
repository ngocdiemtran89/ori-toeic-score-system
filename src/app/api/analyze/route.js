// src/app/api/analyze/route.js
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI chưa được cấu hình" }, { status: 400 });
    }

    const body = await request.json();
    const { name, scores, prevScores, estimate } = body;

    const PART_MAX = { P1: 6, P2: 25, P3: 39, P4: 30, P5: 30, P6: 16, P7: 54 };

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: `Bạn là giáo viên TOEIC chuyên nghiệp. Phân tích điểm "${name}".
Điểm: ${JSON.stringify(scores)} (max: ${JSON.stringify(PART_MAX)})
${prevScores ? `Tháng trước: ${JSON.stringify(prevScores)}` : "Không có tháng trước."}
Quy đổi: L=${estimate.listening}/495, R=${estimate.reading}/495, Total=${estimate.total}/990
Trả JSON (không markdown): {"summary":"2-3 câu","strengths":["..."],"weaknesses":["..."],"focus_parts":["..."],"weekly_plan":"Kế hoạch 4 tuần","motivation":"1 câu"}`,
          },
        ],
      }),
    });

    const data = await res.json();
    const text = data.content?.map((c) => c.text || "").join("") || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const insight = JSON.parse(clean);

    return NextResponse.json({ insight });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
