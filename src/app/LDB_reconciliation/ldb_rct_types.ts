export interface ReconciliationRow {
   DATE_TIME:         string; // วันที่ (รูปแบบ 'YYYY-MM-DD')
   WITHDRAW:          number; // รวมถอนทั้งหมด
   DEPOSIT:           number; // รวมฝากทั้งหมด
   SOKXAY_REWARD:     number; // รางวัล Sokxay
   SOKXAY_BONUS:      number; // โบนัส Sokxay
   SCN_REWARD:        number; // รางวัล SCN
   SOKXAY_SPIN:       number; // วงล้อ Sokxay
   SOKXAY_TAX_REWARD: number; // อากรณ์รางวัล Sokxay
   FTR_DR:            number; // การโอนเงิน - ฝั่งถอน (DR)
   FTR_CR:            number; // การโอนเงิน - ฝั่งฝาก (CR)
   BANK_FEE:          number; // Bank Fee (รวมทุกประเภท)
   THE_OTHER:         number; // รายการอื่นๆ ที่ไม่ใช่ข้างบน (เช่น ถอนปกติที่ไม่ใช่รางวัล, ค่าธรรมเนียมที่ไม่ใช่ Bank Fee ฯลฯ)
   DIFF_DR:           number; // ส่วนต่าง (ถอน) = WITHDRAW - (SOKXAY_REWARD + SOKXAY_BONUS + SCN_REWARD + SOKXAY_SPIN + FTR_DR + BANK_FEE)
   DIFF_CR:           number; // ส่วนต่าง (ฝาก) = DEPOSIT - (SOKXAY_TAX_REWARD + FTR_CR)
  
}
 