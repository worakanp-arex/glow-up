import { AlertTriangle, Angry, Brain, CloudRain, Frown, Ghost, HeartCrack, HelpCircle, Zap } from "lucide-react";

export const MOOD_OPTIONS = [
  { value: "sad", label: "เศร้า", icon: Frown },
  { value: "very_sad", label: "เศร้ามาก", icon: HeartCrack },
  { value: "anxious", label: "วิตกกังวล", icon: AlertTriangle },
  { value: "panic", label: "แพนิค", icon: Zap },
  { value: "overthinking", label: "คิดมาก", icon: Brain },
  { value: "angry", label: "โกรธ หงุดหงิด", icon: Angry },
  { value: "stressed", label: "เครียด", icon: CloudRain },
  { value: "numb", label: "รู้สึกว่างเปล่า ชาไป", icon: Ghost },
  { value: "other", label: "อื่นๆ", icon: HelpCircle },
];

export function moodByValue(value) {
  return MOOD_OPTIONS.find((item) => item.value === value) || null;
}
