import { CalendarCheck, Target, Bell, ClipboardList, Gift } from "lucide-react";

// Shared between the wizard (icons) and the templates list (labels only).
export const OBJECTIVES = [
  { id: "appointment", title: "حجز موعد", icon: CalendarCheck },
  { id: "qualify", title: "تأهيل عميل محتمل", icon: Target },
  { id: "followup", title: "متابعة أو تذكير", icon: Bell },
  { id: "survey", title: "استبيان أو تقييم", icon: ClipboardList },
  { id: "offer", title: "الترويج لعرض", icon: Gift },
];
