import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, access, unlink } from "fs/promises";
import path from "path";
import { DailyRepo, type StatusFilter } from "./repo";

const repo = new DailyRepo();

const VALID_STATUS: StatusFilter[] = ["ALL", "100%", "50%", "ກຳລັງດຳເນີນງານ"];

const parseStatus = (v: string | null): StatusFilter | undefined => {
  if (!v) return undefined;
  return VALID_STATUS.includes(v as StatusFilter)
    ? (v as StatusFilter)
    : undefined;
};

// ── image helpers ─────────────────────────────────────────────────────────────

const UPLOAD_DIR = path.join(process.cwd(), "public", "Daily_Img");

async function saveImage(file: File): Promise<string> {
  const originalName = file.name.replace(/\s+/g, "-");
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}-${base}${ext}`;

  // ✅ ตรวจสอบ dir — ถ้าไม่มีให้สร้าง
  try {
    await access(UPLOAD_DIR);
  } catch {
    await mkdir(UPLOAD_DIR, { recursive: true });
    console.log("[Daily_Img] created folder:", UPLOAD_DIR);
  }

  await writeFile(
    path.join(UPLOAD_DIR, filename),
    Buffer.from(await file.arrayBuffer()),
  );

  console.log("[Daily_Img] saved:", filename);

  // ✅ return path ให้ตรงกับ folder ที่เซฟ
  return `/Daily_Img/${filename}`;
}

async function deleteImage(filePath: string): Promise<void> {
  try {
    const filename = path.basename(filePath);
    await unlink(path.join(UPLOAD_DIR, filename));
  } catch (err) {
    console.error("[Daily_Img] rollback failed:", filePath, err);
  }
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const action = params.get("action") ?? "list";

  try {
    if (action === "list") {
      const result = await repo.findAll(
        params.get("page") ?? undefined,
        params.get("limit") ?? undefined,
        params.get("search") ?? undefined,
        parseStatus(params.get("status")),
      );

      const { success: _s, ...rest } = result;
      return NextResponse.json({ success: true, ...rest });
    }

    return NextResponse.json(
      { success: false, message: `action ບໍ່ຖືກຕ້ອງ: "${action}"` },
      { status: 400 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Daily GET]", message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData();
    const action = (fd.get("action") as string)?.trim();

    if (action === "create_daily") {
      const fields = {
        types_work: (fd.get("types_work") as string)?.trim() ?? "",
        description: (fd.get("description") as string)?.trim() ?? "",
        contact: (fd.get("contact") as string)?.trim() ?? "",
        startDate: (fd.get("startDate") as string)?.trim() ?? "",
        endDate: (fd.get("endDate") as string)?.trim() ?? "",
        status: (fd.get("status") as string)?.trim() ?? "",
        page: (fd.get("page") as string)?.trim() ?? "",
        agreement: (fd.get("agreement") as string)?.trim() ?? "",
        img_url: null as string | null,
        remark: (fd.get("remark") as string)?.trim() ?? "",
      };

      // อ่านไฟล์ที่ upload มา
      const files = fd
        .getAll("images")
        .filter((f): f is File => f instanceof File && f.size > 0);

      // save ทีละไฟล์ — ถ้าพังกลางทาง rollback ไฟล์บนดิสก์ทั้งหมด
      const savedFilenames: string[] = [];
      try {
        for (const file of files) {
          savedFilenames.push(await saveImage(file));
        }
      } catch (err) {
        await Promise.all(savedFilenames.map(deleteImage));
        throw err;
      }

      // ถ้า upload file มา → override img_url ด้วยชื่อไฟล์แรก
      if (savedFilenames.length > 0) {
        fields.img_url = savedFilenames[0];
      }

      try {
        const result = await repo.create(fields, savedFilenames);
        return NextResponse.json({
          success: true,
          message: "ບັນທຶກຂໍ້ມູນສຳເລັດ",
          data: result,
        });
      } catch (err) {
        // DB failed → ลบไฟล์บนดิสก์ออกด้วย
        await Promise.all(savedFilenames.map(deleteImage));
        throw err;
      }
    }

    // this is update ---------------------------------------

    if (action === "update_daily") {
      const daily_id = (fd.get("daily_id") as string)?.trim();
      if (!daily_id) {
        return NextResponse.json(
          { success: false, message: "ບໍ່ມີ daily_id" },
          { status: 400 },
        );
      }

      const fields = {
        types_work: (fd.get("types_work") as string)?.trim() ?? "",
        description: (fd.get("description") as string)?.trim() ?? "",
        contact: (fd.get("contact") as string)?.trim() ?? "",
        startDate: (fd.get("startDate") as string)?.trim() ?? "",
        endDate: (fd.get("endDate") as string)?.trim() ?? "",
        status: (fd.get("status") as string)?.trim() ?? "",
        page: (fd.get("page") as string)?.trim() ?? "",
        agreement: (fd.get("agreement") as string)?.trim() ?? "",
        img_url: null as string | null,
        remark: (fd.get("remark") as string)?.trim() ?? "",
      };

      const existingImgUrl = (fd.get("img_url") as string)?.trim() ?? "";
      if (existingImgUrl) fields.img_url = existingImgUrl;

      const files = fd
        .getAll("images")
        .filter((f): f is File => f instanceof File && f.size > 0);
      const savedFilenames: string[] = [];

      try {
        for (const file of files) {
          savedFilenames.push(await saveImage(file));
        }
      } catch (err) {
        await Promise.all(savedFilenames.map(deleteImage));
        throw err;
      }

      if (savedFilenames.length > 0) fields.img_url = savedFilenames[0];

      try {
        const result = await repo.update(daily_id, fields);
        return NextResponse.json({
          success: true,
          message: "ອັບເດດສຳເລັດ",
          data: result,
        });
      } catch (err) {
        await Promise.all(savedFilenames.map(deleteImage));
        throw err;
      }
    }
    /// this is delete ---------------

    if (action === "delete_daily") {
      const daily_id = (fd.get("daily_id") as string)?.trim();
      if (!daily_id) {
        return NextResponse.json(
          { success: false, message: "ບໍ່ມີ daily_id" },
          { status: 400 },
        );
      }
      const result = await repo.delete(daily_id);
      return NextResponse.json({
        success: true,
        message: "ລົບຂໍ້ມູນສຳເລັດ",
        data: result,
      });
    }
    return NextResponse.json(
      { success: false, message: `action ບໍ່ຖືກຕ້ອງ: "${action}"` },
      { status: 400 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Daily POST]", msg);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
