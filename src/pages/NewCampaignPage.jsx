import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  UploadCloud,
  FilePlus2,
  FileSpreadsheet,
  X,
  Filter,
  CalendarClock,
  Gauge,
  RotateCcw,
} from "lucide-react";
import "./NewCampaignPage.css";

const ACCEPTED = ".csv,.xlsx,.xls";

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NewCampaignPage() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState([]);

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;
    setFiles((prev) => [...prev, ...incoming]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const removeFile = (index) =>
    setFiles((prev) => prev.filter((_, i) => i !== index));

  return (
    <div className="new-campaign" dir="rtl">
      <header className="new-campaign__header">
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => navigate("/campaigns")}
        >
          <ArrowRight size={16} />
          رجوع
        </button>
        <div className="new-campaign__heading">
          <h1 className="new-campaign__title">حملة جديدة</h1>
          <p className="new-campaign__sub">
            استورد الجمهور واضبط إعدادات الحملة قبل الإطلاق.
          </p>
        </div>
        <div className="new-campaign__actions">
          <button
            className="btn btn--ghost"
            onClick={() => navigate("/campaigns")}
          >
            إلغاء
          </button>
          <button className="btn btn--primary">إنشاء الحملة</button>
        </div>
      </header>

      <div className="new-campaign__grid">
        {/* ---------- Right: Audience import ---------- */}
        <section className="panel nc-col nc-import">
          <div className="nc-col__head">
            <h2 className="nc-col__title">استيراد الجمهور</h2>
            <p className="nc-col__desc">رفع ملفات CSV/Excel</p>
          </div>

          <div
            className={`nc-drop ${dragging ? "is-dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
          >
            <UploadCloud className="nc-drop__icon" size={40} />
            <p className="nc-drop__title">اسحب الملفات وأفلتها هنا</p>
            <p className="nc-drop__hint">
              CSV أو Excel — حتى 20 ميجابايت للملف
            </p>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
            >
              <FilePlus2 size={16} />
              إضافة ملف
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              multiple
              hidden
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          {files.length > 0 && (
            <ul className="nc-files">
              {files.map((file, i) => (
                <li className="nc-files__item" key={`${file.name}-${i}`}>
                  <FileSpreadsheet size={18} className="nc-files__icon" />
                  <span className="nc-files__name">{file.name}</span>
                  <span className="nc-files__size">
                    {formatSize(file.size)}
                  </span>
                  <button
                    type="button"
                    className="nc-files__remove"
                    onClick={() => removeFile(i)}
                    aria-label={`إزالة ${file.name}`}
                  >
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="nc-card__head nc-import__seg-head">
            <Filter size={18} className="nc-card__icon" />
            <div>
              <h3 className="nc-card__title">التقسيم</h3>
              <p className="nc-card__desc">
                تصفية الجمهور حسب الخصائص الديموغرافية أو السلوك أو حالة الحساب
                أو الحقول المخصصة.
              </p>
            </div>
          </div>
          <div className="nc-fields">
            <div className="filter-field">
              <label className="filter-label" htmlFor="seg-demographic">
                الخصائص الديموغرافية
              </label>
              <select id="seg-demographic" defaultValue="all">
                <option value="all">الكل</option>
                <option value="age">الفئة العمرية</option>
                <option value="gender">الجنس</option>
                <option value="region">المنطقة</option>
              </select>
            </div>
            <div className="filter-field">
              <label className="filter-label" htmlFor="seg-status">
                حالة الحساب
              </label>
              <select id="seg-status" defaultValue="all">
                <option value="all">كل الحالات</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
                <option value="churned">منسحب</option>
              </select>
            </div>
            <div className="filter-field filter-field--grow">
              <label className="filter-label" htmlFor="seg-custom">
                حقل مخصص
              </label>
              <input
                id="seg-custom"
                type="text"
                placeholder="مثال: القيمة الشرائية > 1000"
              />
            </div>
          </div>
        </section>

        {/* ---------- Left: Configuration ---------- */}
        <section className="nc-col nc-config">
          <div className="panel nc-card">
            <div className="nc-card__head">
              <CalendarClock size={18} className="nc-card__icon" />
              <div>
                <h3 className="nc-card__title">الجدولة</h3>
                <p className="nc-card__desc">
                  جدولة تراعي المنطقة الزمنية، وضبط نافذة الاتصال، واستثناء أيام
                  العطلات.
                </p>
              </div>
            </div>
            <div className="nc-fields">
              <div className="filter-field">
                <label className="filter-label" htmlFor="sch-tz">
                  المنطقة الزمنية
                </label>
                <select id="sch-tz" defaultValue="riyadh">
                  <option value="riyadh">الرياض (GMT+3)</option>
                  <option value="cairo">القاهرة (GMT+2)</option>
                  <option value="dubai">دبي (GMT+4)</option>
                </select>
              </div>
              <div className="filter-field">
                <label className="filter-label" htmlFor="sch-from">
                  بداية نافذة الاتصال
                </label>
                <input id="sch-from" type="time" defaultValue="09:00" />
              </div>
              <div className="filter-field">
                <label className="filter-label" htmlFor="sch-to">
                  نهاية نافذة الاتصال
                </label>
                <input id="sch-to" type="time" defaultValue="18:00" />
              </div>
              <label className="nc-check">
                <input type="checkbox" defaultChecked />
                <span>استثناء العطلات الرسمية</span>
              </label>
            </div>
          </div>

          <div className="panel nc-card">
            <div className="nc-card__head">
              <Gauge size={18} className="nc-card__icon" />
              <div>
                <h3 className="nc-card__title">التحكم بالمعدل</h3>
                <p className="nc-card__desc">
                  حدود المكالمات المتزامنة، وسقف المعدل في الساعة، وإدارة سعة
                  المشغّل.
                </p>
              </div>
            </div>
            <div className="nc-fields">
              <div className="filter-field">
                <label className="filter-label" htmlFor="thr-concurrent">
                  المكالمات المتزامنة
                </label>
                <input
                  id="thr-concurrent"
                  type="number"
                  min="1"
                  defaultValue="50"
                />
              </div>
              <div className="filter-field">
                <label className="filter-label" htmlFor="thr-hourly">
                  الحد الأقصى في الساعة
                </label>
                <input
                  id="thr-hourly"
                  type="number"
                  min="1"
                  defaultValue="500"
                />
              </div>
              <div className="filter-field">
                <label className="filter-label" htmlFor="thr-carrier">
                  سعة المشغّل
                </label>
                <select id="thr-carrier" defaultValue="auto">
                  <option value="auto">تلقائي</option>
                  <option value="low">منخفضة</option>
                  <option value="high">عالية</option>
                </select>
              </div>
            </div>
          </div>

          <div className="panel nc-card">
            <div className="nc-card__head">
              <RotateCcw size={18} className="nc-card__icon" />
              <div>
                <h3 className="nc-card__title">منطق إعادة المحاولة</h3>
                <p className="nc-card__desc">
                  فترات إعادة محاولة قابلة للضبط، وحد أقصى للمحاولات، والتحويل
                  إلى رقم بديل.
                </p>
              </div>
            </div>
            <div className="nc-fields">
              <div className="filter-field">
                <label className="filter-label" htmlFor="retry-interval">
                  الفاصل بين المحاولات (دقيقة)
                </label>
                <input
                  id="retry-interval"
                  type="number"
                  min="1"
                  defaultValue="30"
                />
              </div>
              <div className="filter-field">
                <label className="filter-label" htmlFor="retry-max">
                  الحد الأقصى للمحاولات
                </label>
                <input id="retry-max" type="number" min="1" defaultValue="3" />
              </div>
              <label className="nc-check">
                <input type="checkbox" defaultChecked />
                <span>التحويل إلى رقم بديل عند الفشل</span>
              </label>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
