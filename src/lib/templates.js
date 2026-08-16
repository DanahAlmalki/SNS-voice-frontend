// Persists wizard-created templates in the browser (no backend endpoint exists for templates).
const STORAGE_KEY = "sns-templates";

export function loadTemplates() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function saveTemplate(template) {
  const templates = [template, ...loadTemplates()];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  return template;
}
