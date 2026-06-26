// src/app/api/oracle/SIM/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Sim_Repo } from "./repo.sim";

const repo = new Sim_Repo();

// ── GET /api/oracle/SIM?action=OrderSIM&fromDate=xxx&toDate=xxx ───────────
export async function GET(req: NextRequest) {
    const p = req.nextUrl.searchParams;
    const action = p.get("action") ?? "list";

    try {
        if (action === "OrderSIM") {
            const fromDate = p.get("fromDate")?.trim();
            const toDate = p.get("toDate")?.trim();

            if (!fromDate || !toDate) {
                return NextResponse.json(
                    { success: false, message: "ຕ້ອງລະບຸ fromDate ແລະ toDate" },
                    { status: 400 },
                );
            }

            console.log("[SIM GET] fromDate:", fromDate, "toDate:", toDate);
            const rows = await repo.findSimOrder(fromDate, toDate);

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
                message: `action ບໍ່ຖືກຕ້ອງ: "${action}" — ໃຊ້: OrderSIM`,
            },
            { status: 400 },
        );
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[SIM GET]", msg);

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