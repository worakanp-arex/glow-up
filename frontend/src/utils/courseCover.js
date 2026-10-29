const COVER_TONES = ["primary", "lilac", "peach", "sky"];

// รูปที่แสดงของคอร์ส: ปกของตัวเองเมื่อเจ้าหน้าที่ตั้งไว้ มิฉะนั้นใช้
// ปกบทเรียนที่มีมาในระบบตามตำแหน่ง (`index`) หรือเมื่อ
// ไม่ทราบตำแหน่งก็ใช้ id ของคอร์ส เพื่อให้คอร์สเดิมได้ปกเดิมเสมอ
export function courseCover(course, index) {
  if (course?.coverImage) return { src: course.coverImage, tone: "primary" };
  let position = index;
  if (position === undefined) {
    position = [...String(course?._id || "")].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  }
  const slot = ((position % 4) + 4) % 4;
  return { src: `/images/lessons/cover-${slot + 1}.png`, tone: COVER_TONES[slot] };
}
