// Recovery-domain axes for the radar chart, GamePlay's domain enum, and
// every mini-game's domain tag (wheel segments, quiz questions). Order is
// fixed — the radar chart renders axes in this exact order. These are also
// the 8 default categories seeded into the admin-managed MissionCategory
// catalog (see missionCategoryController.js) that ActivityMission now reads
// its category list from — admins can rename or add to that catalog, but
// any category beyond these 8 won't have a radar axis or game content of
// its own; ActivityMissionLog points still count toward the user's total
// regardless of category.
export const RECOVERY_DOMAINS = [
  { key: "self_awareness", label: "ตระหนักรู้ตนเอง" },
  { key: "coping", label: "ทักษะรับมือ" },
  { key: "routine", label: "กิจวัตร" },
  { key: "physical", label: "สุขภาพกาย" },
  { key: "learning", label: "การเรียนรู้" },
  { key: "self_monitoring", label: "การติดตามตนเอง" },
  { key: "social", label: "สังคม/ความสัมพันธ์" },
  { key: "mindfulness", label: "จิตใจ/สติ" },
];

export const WHEEL_SEGMENTS = [
  { label: "พลังใจ +5", points: 5, domain: "self_awareness" },
  { label: "ก้าวเล็กๆ +3", points: 3, domain: "routine" },
  { label: "ลุยต่อ +8", points: 8, domain: "physical" },
  { label: "สมองไว +5", points: 5, domain: "learning" },
  { label: "ใจเย็นๆ +5", points: 5, domain: "coping" },
  { label: "สู้ต่อไป +3", points: 3, domain: "self_monitoring" },
  { label: "โบนัส! +10", points: 10, domain: "self_awareness" },
  { label: "กำลังใจ +4", points: 4, domain: "coping" },
  { label: "เพื่อนช่วยได้ +5", points: 5, domain: "social" },
  { label: "ใจสงบ +4", points: 4, domain: "mindfulness" },
];

// Trigger <-> coping-response pairs for the memory-match game. Each pair
// becomes 2 cards (12 cards total) — matching them reinforces recall of a
// healthy response to a common relapse trigger.
export const COPING_PAIRS = [
  { id: "stress", trigger: "เครียดสะสม", coping: "หายใจเข้าลึกๆ นับ 1-10" },
  { id: "craving", trigger: "อยากใช้สารกะทันหัน", coping: "โทรหาเพื่อนหรือคนที่ไว้ใจ" },
  { id: "anger", trigger: "โกรธ หงุดหงิดง่าย", coping: "เดินออกจากสถานการณ์สัก 10 นาที" },
  { id: "loneliness", trigger: "รู้สึกโดดเดี่ยว", coping: "เข้าไปพูดคุยในชุมชนฟื้นฟู" },
  { id: "insomnia", trigger: "นอนไม่หลับ กังวลใจ", coping: "เขียนบันทึกความรู้สึกก่อนนอน" },
  { id: "temptation", trigger: "เจอสิ่งกระตุ้นเก่าๆ", coping: "เปลี่ยนเส้นทาง หลีกเลี่ยงที่เดิม" },
];

// Quiz bank — a small fixed pool; each day 3 questions are picked
// deterministically from `dateKey` so every user sees the same daily quiz.
export const QUIZ_BANK = [
  {
    id: "q1",
    question: "เมื่อรู้สึกอยากใช้สารกะทันหัน วิธีใดควรทำเป็นอันดับแรก?",
    options: ["อดทนอยู่คนเดียวเงียบๆ", "ติดต่อคนที่ไว้ใจหรือสายด่วนขอคำปรึกษา", "ไปหาสถานที่เดิมที่เคยใช้สาร", "ไม่ทำอะไรเลย"],
    correctIndex: 1,
    domain: "coping",
  },
  {
    id: "q2",
    question: "การเช็คอินอารมณ์ทุกวันมีประโยชน์อย่างไร?",
    options: ["ทำให้รู้เท่าทันความรู้สึกตนเอง", "ไม่มีประโยชน์", "เพื่อให้คนอื่นตัดสิน", "เสียเวลาเปล่า"],
    correctIndex: 0,
    domain: "self_awareness",
  },
  {
    id: "q3",
    question: "Lapse ต่างจาก Relapse อย่างไร ตามแนวปฏิบัติของโรงพยาบาล?",
    options: [
      "ไม่ต่างกัน",
      "Lapse คือกลับไปใช้ซ้ำน้อยกว่า 7 วัน ส่วน Relapse คือนานกว่า 7 วัน",
      "Lapse รุนแรงกว่า Relapse",
      "Relapse คือยังไม่เคยใช้สารเลย",
    ],
    correctIndex: 1,
    domain: "self_awareness",
  },
  {
    id: "q4",
    question: "การสร้างกิจวัตรประจำวัน (เช่น งานบ้าน ออกกำลังกาย) ช่วยการฟื้นฟูอย่างไร?",
    options: ["ไม่ช่วยอะไร", "ช่วยให้ใช้เวลาว่างอย่างเหมาะสมและสร้างความรับผิดชอบ", "ทำให้เหนื่อยเกินไป", "ไม่เกี่ยวกับการฟื้นฟู"],
    correctIndex: 1,
    domain: "routine",
  },
  {
    id: "q5",
    question: "ข้อใดเป็นตัวอย่างของ Coping Skill ที่เหมาะสม?",
    options: ["เก็บความรู้สึกไว้คนเดียว", "หายใจลึกๆ และฝึกสติเมื่อเครียด", "หลีกเลี่ยงทุกสถานการณ์ตลอดไป", "ใช้สารเพื่อลดความเครียด"],
    correctIndex: 1,
    domain: "coping",
  },
  {
    id: "q6",
    question: "การออกกำลังกายสม่ำเสมอส่งผลดีต่อการฟื้นฟูอย่างไร?",
    options: ["ไม่มีผล", "ช่วยลดความเครียดและเสริมสุขภาพกายใจ", "ทำให้ความอยากใช้สารเพิ่มขึ้น", "ทำให้นอนไม่หลับ"],
    correctIndex: 1,
    domain: "physical",
  },
  {
    id: "q7",
    question: "เหตุใดการเรียนรู้ทักษะใหม่จึงสำคัญกับผู้ผ่านการบำบัด?",
    options: ["ไม่สำคัญ", "ช่วยสร้างความมั่นใจและโอกาสในการทำงาน", "เสียเวลาโดยเปล่าประโยชน์", "ทำให้เครียดมากขึ้น"],
    correctIndex: 1,
    domain: "learning",
  },
  {
    id: "q8",
    question: "การรักษาสถิติเช็คอินต่อเนื่อง (Streak) สะท้อนอะไร?",
    options: ["ไม่สะท้อนอะไร", "ความสม่ำเสมอในการติดตามและดูแลตนเอง", "ความโชคดี", "แค่ตัวเลขเกม"],
    correctIndex: 1,
    domain: "self_monitoring",
  },
  {
    id: "q9",
    question: "หากรู้สึกเสี่ยงจะกลับไปใช้สารซ้ำ ควรทำอย่างไร?",
    options: ["ปกปิดไว้คนเดียว", "ขอรับคำปรึกษาจากบุคลากรทางการแพทย์ทันที", "รอให้อาการหายเอง", "หยุดใช้แอปไปเลย"],
    correctIndex: 1,
    domain: "coping",
  },
];
