import { CalendarCheck, Target, Bell, ClipboardList, Gift } from "lucide-react";

// Shared between the wizard (icons) and the templates list (labels only).
// `title` is Arabic (default/backward-compatible), `titleEn` is used when the
// UI language toggle is set to English — see objectiveTitle() below.
export const OBJECTIVES = [
  { id: "appointment", title: "حجز موعد", titleEn: "Book appointment", icon: CalendarCheck },
  { id: "qualify", title: "تأهيل عميل محتمل", titleEn: "Qualify lead", icon: Target },
  { id: "followup", title: "متابعة أو تذكير", titleEn: "Follow-up or reminder", icon: Bell },
  { id: "survey", title: "استبيان أو تقييم", titleEn: "Survey or feedback", icon: ClipboardList },
  { id: "offer", title: "الترويج لعرض", titleEn: "Promote an offer", icon: Gift },
];

export function objectiveTitle(objective, lang) {
  if (!objective) return "";
  return (lang === "en" ? objective.titleEn : objective.title) || objective.title;
}
