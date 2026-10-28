// What a person sees after "assess now". The measurement underneath is unchanged
// (the care team still sees the level), but the person is shown encouragement and
// next steps instead of a risk label or raw averages: a label like "high risk"
// weighs on someone who is already struggling, and a visible score invites
// logging for the score rather than for how they actually feel.
export const RISK_GUIDANCE = {
  low: {
    title: "ช่วงนี้คุณดูแลใจได้ดี",
    message: "บันทึกของคุณสะท้อนว่าช่วงที่ผ่านมาค่อนข้างนิ่ง ลองรักษาจังหวะนี้ไว้ และเตรียมตัวสำหรับวันที่ใจหนักกว่าปกติ",
    steps: [
      { text: "บันทึกความรู้สึกต่อเนื่องทุกวัน แม้แค่สั้น ๆ", to: null },
      { text: "ฝึกทักษะการปฏิเสธไว้ล่วงหน้า", to: "/learning", label: "ไปฝึกทักษะ" },
      { text: "เก็บคนที่ไว้ใจไว้ในใจ เผื่อวันที่อยากมีคนคุยด้วย", to: null },
    ],
  },
  medium: {
    title: "ช่วงนี้อาจมีบางวันที่ใจหนักกว่าปกติ",
    message: "ไม่เป็นไรเลยที่จะรู้สึกแบบนี้ ลองหยิบเครื่องมือเล็ก ๆ มาช่วยตัวเอง และอย่าลืมว่ามีคนพร้อมคุยด้วยเสมอ",
    steps: [
      { text: "ลองหายใจช้า ๆ ตามแบบฝึก 4-7-8 เมื่อความอยากขึ้น", to: "/games", label: "ไปที่เกมฟื้นฟู" },
      { text: "ซ้อมรับมือสถานการณ์ที่อาจเจอ", to: "/learning", label: "ฝึกสถานการณ์จำลอง" },
      { text: "ทักหาคนที่ไว้ใจ หรือคุยกับผู้ให้คำปรึกษา", to: "/counselling", label: "นัดคุยกับผู้ให้คำปรึกษา" },
    ],
  },
  high: {
    title: "ช่วงนี้อย่าเผชิญคนเดียวนะ",
    message: "ดูเหมือนช่วงนี้จะหนักสำหรับคุณ การขอให้มีคนอยู่ข้าง ๆ เป็นเรื่องที่เข้มแข็งมาก เราอยากให้คุณได้คุยกับใครสักคนเร็ว ๆ นี้",
    steps: [
      { text: "คุยกับผู้ให้คำปรึกษาของเรา ไม่ต้องรอให้ถึงวันนัด", to: "/counselling", label: "ขอคำปรึกษาตอนนี้", primary: true },
      { text: "ชวนคนที่ไว้ใจมาอยู่ด้วย หรือบอกครอบครัวว่าคุณต้องการกำลังใจ", to: null },
      { text: "ถ้าใจหนักมากจนรู้สึกไม่ปลอดภัย โทรสายด่วนสุขภาพจิต 1323 ได้ตลอด 24 ชั่วโมง", to: "tel:1323", label: "โทร 1323" },
    ],
  },
};
