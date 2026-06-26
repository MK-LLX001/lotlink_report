// src/app/api/oracle/Cases_support/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Spin_Repo } from "./repo.spin";

const repo = new Spin_Repo();

// ── GET /api/oracle/SPIN?action=GetOrder_Spin_ById&id=xxx ───────────
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams; // ✅ ใช้ nextUrl แทน new URL(req.url)
  const action = p.get("action") ?? "list";

  try {
    if (action === "OrderSpin") {
      const caseNumber = p.get("caseNumber")?.trim();

      if (!caseNumber) {
        return NextResponse.json(
          { success: false, message: "ຕ້ອງລະບຸ caseNumber" },
          { status: 400 },
        );
      }

      const row = await repo.findByIdOrder(caseNumber);

      if (!row) {
        return NextResponse.json(
          { success: false, message: `ບໍ່ພົບຂໍ້ມູນ id: ${caseNumber}` },
          { status: 404 },
        );
      }

      return NextResponse.json({ success: true, data: row });
    }

    if (action === "StmtSpin") {
      const caseNumber = p.get("caseNumber")?.trim();

      if (!caseNumber) {
        return NextResponse.json(
          { success: false, message: "ຕ້ອງລະບຸ caseNumber" },
          { status: 400 },
        );
      }

      const row = await repo.findByIdSpin_Stmt(caseNumber);

      if (!row) {
        return NextResponse.json(
          { success: false, message: `ບໍ່ພົບຂໍ້ມູນ caseNumber: ${caseNumber}` },
          { status: 404 },
        );
      }

      return NextResponse.json({ success: true, data: row });
    }

    if (action === "RefundPoints") {
      const caseNumber = p.get("caseNumber")?.trim();

      if (!caseNumber) {
        return NextResponse.json(
          { success: false, message: "ຕ້ອງລະບຸ caseNumber" },
          { status: 400 },
        );
      }

      const row = await repo.findByIdRefundPoints(caseNumber);

      if (!row) {
        return NextResponse.json(
          { success: false, message: `ບໍ່ພົບຂໍ້ມູນ caseNumber: ${caseNumber}` },
          { status: 404 },
        );
      }

      return NextResponse.json({ success: true, data: row });
    }

    if (action === "winner") {
      const fromDate = p.get("fromDate")?.trim();
      const toDate = p.get("toDate")?.trim();
      const amount = p.get("amount")?.trim();

      // validate
      if (!fromDate || !toDate || !amount) {
        return NextResponse.json(
          { success: false, message: "ຕ້ອງລະບຸ fromDate, toDate ແລະ amount" },
          { status: 400 },
        );
      }

      if (isNaN(Number(amount))) {
        return NextResponse.json(
          { success: false, message: "amount ຕ້ອງເປັນຕົວເລກ" },
          { status: 400 },
        );
      }

      const rows = await repo.findByIdWinner(fromDate, toDate, amount);

      if (!rows.length) {
        return NextResponse.json(
          { success: false, message: "ບໍ່ພົບຂໍ້ມູນ" },
          { status: 404 },
        );
      }

      return NextResponse.json({ success: true, data: rows });
    }

    // action ไม่รู้จัก
    return NextResponse.json(
      {
        success: false,
        message: `action ບໍ່ຖືກຕ້ອງ: "${action}" — ໃຊ້: GetOrder_Spin_ById`,
      },
      { status: 400 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Cases_support GET]", msg);

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
