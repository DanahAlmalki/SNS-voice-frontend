import { useEffect, useState } from "react";
import { X, Copy, Check } from "lucide-react";
import "./PromptModal.css";

export default function PromptModal({ open, onClose, prompt }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  if (!open) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__head">
          <h3 className="modal__title">المطالبة النهائية (Prompt)</h3>
          <button className="modal__close" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </header>

        <pre className="modal__body" dir="ltr">
          {prompt}
        </pre>

        <footer className="modal__foot">
          <button className="btn btn--subtle" onClick={copy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "تم النسخ" : "نسخ"}
          </button>
          <button className="btn btn--primary" onClick={onClose}>
            إغلاق
          </button>
        </footer>
      </div>
    </div>
  );
}
