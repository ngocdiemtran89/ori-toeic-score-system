// src/app/api/students/route.js
import { NextResponse } from "next/server";
import { getAllStudents, findStudent, createStudent, updateStudent, initSheets } from "@/lib/sheets";
import { genStudentCode } from "@/lib/toeic";

// GET /api/students?search=xxx
export async function GET(request) {
  try {
    await initSheets();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    if (search) {
      const students = await getAllStudents();
      const q = search.toLowerCase();
      const filtered = students.filter(
        (s) =>
          s.code.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.phone.includes(search)
      );
      return NextResponse.json({ students: filtered });
    }

    const students = await getAllStudents();
    return NextResponse.json({ students });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/students { name, phone, code? }
export async function POST(request) {
  try {
    await initSheets();
    const body = await request.json();
    const { name, phone, code: inputCode } = body;

    if (!name) {
      return NextResponse.json({ error: "Tên là bắt buộc" }, { status: 400 });
    }

    // Check if student exists by code or phone
    if (inputCode) {
      const existing = await findStudent(inputCode);
      if (existing) {
        await updateStudent(inputCode, name, phone || existing.phone);
        return NextResponse.json({ student: { ...existing, name, phone: phone || existing.phone }, isNew: false });
      }
    }
    if (phone) {
      const students = await getAllStudents();
      const byPhone = students.find((s) => s.phone === phone);
      if (byPhone) {
        await updateStudent(byPhone.code, name, phone);
        return NextResponse.json({ student: { ...byPhone, name }, isNew: false });
      }
    }

    // Create new
    const code = inputCode || genStudentCode();
    const student = await createStudent(code, name, phone || "");
    return NextResponse.json({ student, isNew: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
