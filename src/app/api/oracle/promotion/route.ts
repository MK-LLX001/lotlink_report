// src/app/api/oracle/PROMOTION/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Promotion_Service_Repo } from "./repo.promotion";

const repo = new Promotion_Service_Repo();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime());
}

// ── GET /api/oracle/PROMOTION?action=Promotion&fromDate=xxx&toDate=xxx ───────────
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const action = p.get("action") ?? "list";

  try {
    if (action === "Promotion") {
      const fromDate = p.get("fromDate")?.trim();
      const toDate = p.get("toDate")?.trim();

      if (!fromDate || !toDate) {
        return NextResponse.json(
          { success: false, message: "ຕ້ອງລະບຸ fromDate ແລະ toDate" },
          { status: 400 },
        );
      }

      if (!isValidDate(fromDate) || !isValidDate(toDate)) {
        return NextResponse.json(
          {
            success: false,
            message: "ຮູບແບບວັນທີບໍ່ຖືກຕ້ອງ ຕ້ອງເປັນ YYYY-MM-DD",
          },
          { status: 400 },
        );
      }

      if (fromDate > toDate) {
        return NextResponse.json(
          { success: false, message: "fromDate ຕ້ອງມາກ່ອນ toDate" },
          { status: 400 },
        );
      }

      console.log("[PROMOTION GET] fromDate:", fromDate, "toDate:", toDate);
      const rows = await repo.findPromotion(fromDate, toDate);

      if (!rows || rows.length === 0) {
        return NextResponse.json(
          { success: false, message: `ບໍ່ພົບຂໍ້ມູນ ${fromDate} - ${toDate}` },
          { status: 404 },
        );
      }

      return NextResponse.json({ success: true, data: rows });
    }

    return NextResponse.json(
      {
        success: false,
        message: `action ບໍ່ຖືກຕ້ອງ: "${action}" — ໃຊ້: Promotion`,
      },
      { status: 400 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[PROMOTION GET] ERROR:", msg);
    if (stack) console.error(stack);

    return NextResponse.json(
      {
        success: false,
        message:
          process.env.NODE_ENV === "development"
            ? msg
            : "ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່",
      },
      { status: 500 },
    );
  }
}
