// ✅ helper — resolve image path ใช้ได้ทั้ง absolute URL และ filename
export const resolveImageSrc = (imageUrl?: string | null): string => {
  if (!imageUrl) return "";
  return imageUrl.startsWith("http") ? imageUrl : `/uploads/${imageUrl}`;
};
export const DailyImageSrc = (imageUrl?: string | null): string => {
  if (!imageUrl) return "";

  // full URL → ใช้ตรงๆ
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  // มี / นำหน้าแล้ว เช่น /Daily_Img/xxx.jpg → ใช้ตรงๆ ไม่ต้องเติมอีก
  if (imageUrl.startsWith("/")) {
    return imageUrl;
  }

  // ชื่อไฟล์ล้วนๆ (ข้อมูลเก่า) → เติม prefix
  return `/Daily_Img/${imageUrl}`;
};
