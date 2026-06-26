// src/app/api/oracle/Cases_support/route.ts
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, access, unlink } from "fs/promises";
import path from "path";
import { CasesRepo } from "./Cases_repo/Repo_Cases";

const repo = new CasesRepo();

const VALID_STATUS = ["ALL", "ACTIVE", "CLOSED"] as const;
type StatusFilter = (typeof VALID_STATUS)[number];

const parseStatus = (v: string | null): StatusFilter | undefined =>
  v && VALID_STATUS.includes(v as StatusFilter)
    ? (v as StatusFilter)
    : undefined;

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

async function saveImage(file: File): Promise<string> {
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/\s+/g, "-")}`;

  try {
    await access(UPLOAD_DIR);
  } catch {
    await mkdir(UPLOAD_DIR, { recursive: true });
    // console.log("[uploads] created folder:", UPLOAD_DIR);
  }

  await writeFile(
    path.join(UPLOAD_DIR, filename),
    Buffer.from(await file.arrayBuffer()),
  );
  // console.log("[uploads] saved:", filename);

  return filename;
}

// ลบไฟล์ที่เซฟไปแล้วในกรณีที่ DB transaction ล้มเหลว
async function deleteImage(filename: string): Promise<void> {
  try {
    await unlink(path.join(UPLOAD_DIR, filename));
    //  console.log("[uploads] rolled back:", filename);
  } catch (err) {
    console.error("[uploads] rollback failed:", filename, err);
  }
}

// ── GET ───────────────────────────────────────────────────────────────────────
// ── GET ───────────────────────────────────────────────────────────────────────
// แทนที่ส่วน GET เดิมใน route.ts ด้วยอันนี้
export async function GET(req: NextRequest) {
  const p = new URL(req.url).searchParams;
  const action = p.get("action") ?? "list";

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

    // ✅ เพิ่ม getById — ดึงเคส + รูปทั้งหมดจาก case_images
    if (action === "getById") {
      const id = p.get("id");
      if (!id)
        return NextResponse.json(
          { success: false, message: "ຕ້ອງລະບຸ id" },
          { status: 400 },
        );
      const row = await repo.findById(id);
      if (!row)
        return NextResponse.json(
          { success: false, message: "ບໍ່ພົບເຄສ" },
          { status: 404 },
        );
      return NextResponse.json({ success: true, data: row });
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
        cust_connect: (fd.get("cust_connect") as string)?.trim(),
        notes: (fd.get("notes") as string)?.trim(),
        image_url: null as string | null,
      };

      // อ่านหลายไฟล์จาก field "images" (frontend append ซ้ำหลายรอบด้วย key เดิม)
      const files = fd
        .getAll("images")
        .filter((f): f is File => f instanceof File && f.size > 0);

      // บันทึกไฟล์ทีละตัว — ถ้าพังกลางทางให้ลบที่เซฟไปแล้วทั้งหมดทิ้ง
      const savedFilenames: string[] = [];
      try {
        for (const file of files) {
          savedFilenames.push(await saveImage(file));
        }
      } catch (err) {
        await Promise.all(savedFilenames.map(deleteImage));
        throw err;
      }

      // เก็บรูปแรกไว้ใน column image_url เดิมด้วย เผื่อหน้าจออื่นยังอ่านค่านี้อยู่
      if (savedFilenames.length > 0) fields.image_url = savedFilenames[0];

      try {
        // repo.create จะใช้ transaction INSERT เคสหลัก + INSERT รูปทุกรูปพร้อมกัน
        const result = await repo.create(fields, savedFilenames);
        return NextResponse.json({
          success: true,
          message: "ບັນທຶກຂໍ້ມູນສຳເລັດ",
          data: result,
        });
      } catch (err) {
        // DB transaction rollback แล้ว → ลบไฟล์บนดิสก์ออกด้วยให้สอดคล้องกัน
        await Promise.all(savedFilenames.map(deleteImage));
        throw err;
      }
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
        "cust_connect",
        "notes",
        "status",
        "priority",
        "assigned_to",
        "customer",
      ].forEach((key) => {
        const val = fd.get(key) as string | null;
        if (val !== null) fields[key] = val.trim();
      });

      const result = await repo.update(id, fields);
      return NextResponse.json({
        success: true,
        message: "ອັບເດດສຳເລັດ",
        data: result,
      });
    }

    // --- delete --------------
    if (action === "delete") {
      const id = (fd.get("id") as string)?.trim();
      const username = (fd.get("username") as string)?.trim();

      if (!id || !username)
        return NextResponse.json(
          { success: false, message: "ຕ້ອງລະບຸ id ແລະ username" },
          { status: 400 },
        );

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

    // -- getcasesbyuserreport --------------
    if (action === "getcasesbyuserreport") {
      const username = (fd.get("username") as string)?.trim();
      const from_date = (fd.get("from_date") as string)?.trim() || undefined;
      const to_date = (fd.get("to_date") as string)?.trim() || undefined;
      const problem_type =
        (fd.get("problem_type") as string)?.trim() || undefined;

      if (!username)
        return NextResponse.json(
          { success: false, message: "ຕ້ອງລະບຸ username" },
          { status: 400 },
        );

      const result = await repo.getcasesbyuserreport(
        username,
        from_date,
        to_date,
        problem_type,
      );

      return NextResponse.json({
        success: true,
        message: "ດຶງຂໍ້ມູນ Report ສຳເລັດ",
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
        message: `action ບໍ່ຖືກຕ້ອງ: "${action}" — ໃຊ້: create | update | delete | offcases | getcasesbyuser | log`,
      },
      { status: 400 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Cases POST]", msg);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
