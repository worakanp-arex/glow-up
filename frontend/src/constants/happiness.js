import { Angry, Annoyed, Frown, Laugh, Meh, Smile, SmilePlus } from "lucide-react";

export const HAPPINESS_LEVELS = [
  { level: 1, label: "แย่มาก", icon: Angry, color: "var(--happiness-1)" },
  { level: 2, label: "ไม่ดี", icon: Frown, color: "var(--happiness-2)" },
  { level: 3, label: "ค่อนข้างแย่", icon: Annoyed, color: "var(--happiness-3)" },
  { level: 4, label: "เฉยๆ", icon: Meh, color: "var(--happiness-4)" },
  { level: 5, label: "พอใช้", icon: Smile, color: "var(--happiness-5)" },
  { level: 6, label: "ดี", icon: SmilePlus, color: "var(--happiness-6)" },
  { level: 7, label: "ดีมาก", icon: Laugh, color: "var(--happiness-7)" },
];

export function happinessByLevel(level) {
  return HAPPINESS_LEVELS.find((item) => item.level === level) || null;
}
