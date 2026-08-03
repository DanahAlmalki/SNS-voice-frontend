const STORAGE_KEY = "sns-theme";

export const DEFAULT_THEME = {
  accent: "#575eae",
  vibrant: "#f0562d",
  danger: "#b05650",
  bg: "#f8fafc",
  text: "#0f172a",
  sidebar: "#080b12",
};

export const THEME_FIELDS = [
  { key: "accent", label: "اللون الأساسي", hint: "الأزرار والعناصر التفاعلية" },
  {
    key: "vibrant",
    label: "اللون المميّز",
    hint: "يُستخدم بشكل محدود للإبراز",
  },
  { key: "danger", label: "لون التنبيه", hint: "الحذف والإجراءات الخطرة" },
  { key: "bg", label: "خلفية الصفحة" },
  { key: "text", label: "لون النص" },
  { key: "sidebar", label: "خلفية القائمة الجانبية" },
];

function clamp(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  const to = (n) => clamp(n).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function mix(hex, target, weight) {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  return rgbToHex({
    r: a.r + (b.r - a.r) * weight,
    g: a.g + (b.g - a.g) * weight,
    b: a.b + (b.b - a.b) * weight,
  });
}

const darken = (hex, amount) => mix(hex, "#000000", amount);
const lighten = (hex, amount) => mix(hex, "#ffffff", amount);

export function applyTheme(theme) {
  const root = document.documentElement;
  const set = (name, value) => root.style.setProperty(name, value);
  const { r, g, b } = hexToRgb(theme.accent);

  set("--accent", theme.accent);
  set("--accent-hover", darken(theme.accent, 0.12));
  set("--accent-active", darken(theme.accent, 0.22));
  set("--accent-weak", lighten(theme.accent, 0.88));
  set("--accent-weak-2", lighten(theme.accent, 0.8));
  set("--accent-text", darken(theme.accent, 0.22));
  set("--ring", `0 0 0 3px rgba(${r}, ${g}, ${b}, 0.22)`);
  set("--primary", theme.accent);
  set("--primary-dark", darken(theme.accent, 0.12));

  set("--vibrant", theme.vibrant);
  set("--vibrant-hover", darken(theme.vibrant, 0.12));

  set("--danger", theme.danger);
  set("--danger-hover", darken(theme.danger, 0.12));
  set("--danger-weak", lighten(theme.danger, 0.9));

  set("--bg", theme.bg);
  set("--text", theme.text);

  set("--sidebar-bg", theme.sidebar);
  set("--sidebar-hover", lighten(theme.sidebar, 0.08));
}

export function loadTheme() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...DEFAULT_THEME, ...saved };
  } catch {
    return { ...DEFAULT_THEME };
  }
}

export function saveTheme(theme) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
}
