// src/app/api/oracle/Cases_support/route.ts
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, access } from "fs/promises";
import path from "path";
import { CasesRepo } from "./Cases_repo/Repo_Cases";

const repo = new CasesRepo();

const VALID_STATUS = ["ALL", "ACTIVE", "CLOSED"] as const;
type StatusFilter = (typeof VALID_STATUS)[number];
const parseStatus = (v: string | null): StatusFilter | undefined =>
  v && VALID_STATUS.includes(v as StatusFilter)
    ? (v as StatusFilter)
    : undefined;

async function saveImage(file: File): Promise<string> {
  const filename = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");

  // ตรวจว่ามี folder ไหม — ถ้าไม่มีสร้างใหม่ / ถ้ามีแล้วข้ามไป
  try {
    await access(uploadDir); // ✅ มีอยู่แล้ว
  } catch {
    await mkdir(uploadDir, { recursive: true }); // ✅ ยังไม่มี → สร้าง
    console.log("[uploads] created folder:", uploadDir);
  }

  await writeFile(
    path.join(uploadDir, filename),
    Buffer.from(await file.arrayBuffer()),
  );
  console.log("[uploads] saved:", filename);

  return filename;
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const p = new URL(req.url).searchParams;
  const action = p.get("action") ?? "list"; // default = list

  try {
    if (action === "list") {
      const rows = await repo.findAll(
        p.get("page") ?? undefined,
        p.get("limit") ?? undefined,
        p.get("search") ?? undefined,
        parseStatus(p.get("status")),
      );
      return NextResponse.json({ data: rows });
    }

    return NextResponse.json(
      {
        success: false,
        message: `action ບໍ່ຖືກຕ້ອງ: "${action}" — ໃຊ້: list | getById`,
      },
      { status: 400 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Cases GET]", msg);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData();
    const action = (fd.get("action") as string)?.trim();

    // ---- create cases -----------------------------
    if (action === "create") {
      const fields = {
        case_number: (fd.get("case_number") as string)?.trim(),
        problem_type: (fd.get("problem_type") as string)?.trim(),
        error_type: (fd.get("error_type") as string)?.trim(),
        description: (fd.get("description") as string)?.trim(),
        status: (fd.get("status") as string)?.trim(),
        priority: (fd.get("priority") as string)?.trim(),
        assigned_to: (fd.get("assigned_to") as string)?.trim(),
        customer: (fd.get("customer") as string)?.trim(),
        image_url: null as string | null,
      };
      const file = fd.get("image") as File | null;
      if (file?.size) fields.image_url = await saveImage(file);

      const result = await repo.create(fields);
      return NextResponse.json({
        success: true,
        message: "ບັນທຶກຂໍ້ມູນສຳເລັດ",
        data: result,
      });
    }
    // --- update ----------------
    if (action === "update") {
      const id = (fd.get("id") as string)?.trim();
      if (!id)
        return NextResponse.json(
          { success: false, message: "ຕ້ອງລະບຸ id" },
          { status: 400 },
        );

      const fields: Record<string, string | null> = {};
      [
        "case_number",
        "problem_type",
        "error_type",
        "description",
        "status",
        "priority",
        "assigned_to",
        "customer",
      ].forEach((key) => {
        const val = fd.get(key) as string | null;
        if (val !== null) fields[key] = val.trim();
      });
      // const file = fd.get("image") as File | null;
      // if (file?.size) fields.image_url = await saveImage(file);

      const result = await repo.update(id, fields);
      return NextResponse.json({
        success: true,
        message: "ອັບເດດສຳເລັດ",
        data: result,
      });
    }

    // --- deteie --------------
    if (action === "delete") {
      const id = (fd.get("id") as string)?.trim();
      const username = (fd.get("username") as string)?.trim();

      if (!id || !username)
        return NextResponse.json(
          { success: false, message: "ຕ້ອງລະບຸ id ແລະ username" },
          { status: 400 },
        );

      // ✅ pass both id and username
      const result = await repo.softDelete(id, username);

      return NextResponse.json({
        success: true,
        message: "ລົບຂໍ້ມູນສຳເລັດ",
        data: result,
      });
    }

    // --- offcases --------------
    if (action === "offcases") {
      const id = (fd.get("id") as string)?.trim();
      const username = (fd.get("username") as string)?.trim();
      const status = (fd.get("status") as string)?.trim();

      if (!id || !username || !status)
        // ✅ ເພີ່ມ ! ໜ້າ status
        return NextResponse.json(
          { success: false, message: "ຕ້ອງລະບຸ id, username ແລະ status" },
          { status: 400 },
        );

      const result = await repo.softoffcases(id, username, status);

      return NextResponse.json({
        success: true,
        message: "ອັບເດດສຳເລັດ",
        data: result,
      });
    }
    // -- getcasesbyuser --------------
    if (action === "getcasesbyuser") {
      const username = (fd.get("username") as string)?.trim();
      if (!username)
        // ✅ ເພີ່ມ ! ໜ້າ status
        return NextResponse.json(
          { success: false, message: "ຕ້ອງລະບຸ id, username ແລະ status" },
          { status: 400 },
        );

      const result = await repo.getcasesbyuser(username);

      return NextResponse.json({
        success: true,
        message: "ອັບເດດສຳເລັດ",
        data: result,
      });
    }

    if (action === "log") {
      const case_id = (fd.get("case_id") as string)?.trim();
      const username = (fd.get("username") as string)?.trim();
      if (!case_id || !username)
        return NextResponse.json(
          { success: false, message: "ຕ້ອງລະບຸ case_id ແລະ username" },
          { status: 400 },
        );

      const result = await repo.log(case_id, username);
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json(
      {
        success: false,
        message: `action ບໍ່ຖືກຕ້ອງ: "${action}" — ໃຊ້: create | update | delete | log`,
      },
      { status: 400 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Cases POST]", msg);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
