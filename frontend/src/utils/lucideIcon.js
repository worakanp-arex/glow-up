import {
  Activity,
  Anchor,
  Award,
  BookOpen,
  Brain,
  Briefcase,
  CalendarCheck,
  Circle,
  Compass,
  Dumbbell,
  Flame,
  Gift,
  Handshake,
  Heart,
  HeartHandshake,
  Home,
  LifeBuoy,
  LineChart,
  Medal,
  Moon,
  Music,
  Palette,
  Shield,
  Smile,
  Sparkles,
  Sprout,
  Star,
  Sun,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

// A curated, explicitly-imported subset of lucide-react icons for admin-
// entered icon names (MissionCategory.icon, Mission.badgeIcon, Reward.icon).
// Importing the whole `lucide-react` namespace (`import * as ...`) would
// defeat tree-shaking and pull the entire icon set into every bundle that
// uses this helper, so only icons listed here are ever bundled.
const ICONS = {
  Activity,
  Anchor,
  Award,
  BookOpen,
  Brain,
  Briefcase,
  CalendarCheck,
  Compass,
  Dumbbell,
  Flame,
  Gift,
  Handshake,
  Heart,
  HeartHandshake,
  Home,
  LifeBuoy,
  LineChart,
  Medal,
  Moon,
  Music,
  Palette,
  Shield,
  Smile,
  Sparkles,
  Sprout,
  Star,
  Sun,
  Target,
  Trophy,
  Users,
  Zap,
};

export function resolveIcon(name) {
  return (name && ICONS[name]) || Circle;
}

export const ICON_NAMES = Object.keys(ICONS);
