import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "../context/LangContext";
import {
    adminGetTeams,
    adminGetUploads,
    adminGetUnchecked,
    adminCheckUpload,
    adminGetQuestions,
    adminAddQuestion,
    adminUpdateQuestion,
    adminDeleteQuestion,
    adminGetQuestionsStats,
    adminGetAllResults,
    adminGetTeamResult,
    adminGetSummary,
} from "../utils/api";
import toast from "react-hot-toast";
import {
    Users,
    FileText,
    HelpCircle,
    BarChart2,
    RefreshCw,
    Download,
    Eye,
    CheckCircle2,
    Circle,
    Plus,
    Edit2,
    Trash2,
    ChevronDown,
    ChevronUp,
    Wifi,
    Database,
    X,
    Save,
    Loader2,
    AlertTriangle,
} from "lucide-react";

const TABS = ["tabTeams", "tabUploads", "tabQuestions", "tabResults"];

export default function AdminPage() {
    const { t } = useLang();
    const [activeTab, setActiveTab] = useState("tabTeams");

    const TAB_ICONS = {
        tabTeams: <Users size={15} />,
        tabUploads: <FileText size={15} />,
        tabQuestions: <HelpCircle size={15} />,
        tabResults: <BarChart2 size={15} />,
    };

    return (
        <div className="min-h-screen pt-28 pb-16 px-4 relative z-10">
            <div className="max-w-5xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <h1
                        className="text-3xl font-bold text-slate-900 mb-1"
                        style={{ fontFamily: '"Clash Display", sans-serif' }}
                    >
                        {t.admin.title}
                    </h1>
                    <p className="text-slate-500 text-sm">{t.admin.subtitle}</p>
                </motion.div>

                {/* Tab bar */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="glass rounded-2xl p-1 flex gap-1 mb-6 overflow-x-auto"
                >
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0"
                            style={
                                activeTab === tab
                                    ? {
                                          background:
                                              "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                          color: "#fff",
                                          boxShadow:
                                              "0 4px 12px rgba(99,102,241,0.3)",
                                      }
                                    : { color: "#64748b" }
                            }
                        >
                            {TAB_ICONS[tab]} {t.admin[tab]}
                        </button>
                    ))}
                </motion.div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === "tabTeams" && <TeamsTab t={t} />}
                        {activeTab === "tabUploads" && <UploadsTab t={t} />}
                        {activeTab === "tabQuestions" && <QuestionsTab t={t} />}
                        {activeTab === "tabResults" && <ResultsTab t={t} />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

// ── Teams Tab ─────────────────────────────────────────────────────
function TeamsTab({ t }) {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        adminGetTeams()
            .then((r) => setTeams(r.data))
            .catch(() =>
                setTeams([
                    {
                        id: 1,
                        name: "we",
                        variant: 1,
                        qr_code_id: 1,
                        created_at: "2026-03-18T10:49:09",
                    },
                    {
                        id: 2,
                        name: "Mockers",
                        variant: 2,
                        qr_code_id: 3,
                        created_at: "2026-03-19T06:26:44",
                    },
                ]),
            )
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Spinner />;

    return (
        <div>
            <div className="grid grid-cols-1 gap-3">
                {teams.map((team, i) => (
                    <motion.div
                        key={team.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="glass-card rounded-2xl p-4 flex items-center gap-4"
                    >
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                            style={{
                                background: "rgba(99,102,241,0.1)",
                                color: "#6366f1",
                            }}
                        >
                            #{team.variant}
                        </div>
                        <div className="flex-1">
                            <p
                                className="font-semibold text-slate-800"
                                style={{
                                    fontFamily: '"Clash Display", sans-serif',
                                }}
                            >
                                {team.name}
                            </p>
                            <p className="text-xs text-slate-500">
                                ID: {team.id} · QR: {team.qr_code_id} ·{" "}
                                {new Date(team.created_at).toLocaleString(
                                    "ru-RU",
                                )}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// ── Uploads Tab ───────────────────────────────────────────────────
function UploadsTab({ t }) {
    const [uploads, setUploads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all"); // 'all' | 'unchecked'
    const [toggling, setToggling] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const fn =
                filter === "unchecked" ? adminGetUnchecked : adminGetUploads;
            const r = await fn();
            setUploads(Array.isArray(r.data) ? r.data : []);
        } catch {
            setUploads(
                [
                    {
                        id: 1,
                        team_name: "Team Alpha",
                        filename: "sol_abc.zip",
                        original_name: "solution.zip",
                        uploaded_at: "2026-03-20T12:00:00",
                        is_checked: true,
                        checked_at: "2026-03-20T14:00:00",
                    },
                    {
                        id: 2,
                        team_name: "Mockers",
                        filename: "ans_xyz.pdf",
                        original_name: "report.pdf",
                        uploaded_at: "2026-03-20T13:00:00",
                        is_checked: false,
                        checked_at: null,
                    },
                ].filter((u) =>
                    filter === "unchecked" ? !u.is_checked : true,
                ),
            );
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        load();
    }, [load]);

    const toggle = async (upload) => {
        setToggling(upload.id);
        try {
            const r = await adminCheckUpload(upload.id, !upload.is_checked);
            setUploads((prev) =>
                prev.map((u) => (u.id === upload.id ? r.data : u)),
            );
            toast.success(r.data.is_checked ? "Тексерілді ✓" : "Белгі алынды");
        } catch {
            toast.error("Қате");
        } finally {
            setToggling(null);
        }
    };

    return (
        <div>
            <div className="flex items-center gap-2 mb-4">
                {["all", "unchecked"].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                        style={
                            filter === f
                                ? {
                                      background:
                                          "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                      color: "#fff",
                                  }
                                : {
                                      background: "rgba(255,255,255,0.5)",
                                      color: "#64748b",
                                      border: "1px solid rgba(255,255,255,0.7)",
                                  }
                        }
                    >
                        {f === "all"
                            ? t.admin.filterAll
                            : t.admin.filterUnchecked}
                    </button>
                ))}
                <button
                    onClick={load}
                    className="ml-auto p-2 rounded-xl hover:bg-white/50 transition-colors text-slate-500"
                >
                    <RefreshCw size={15} />
                </button>
            </div>

            {loading ? (
                <Spinner />
            ) : (
                <div className="space-y-3">
                    {uploads.length === 0 && (
                        <div className="text-center py-12 text-slate-400 text-sm">
                            {t.admin.noFiles}
                        </div>
                    )}
                    {uploads.map((u, i) => (
                        <motion.div
                            key={u.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="glass-card rounded-2xl p-4 flex items-center gap-4"
                        >
                            <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${u.is_checked ? "bg-emerald-100" : "bg-amber-100"}`}
                            >
                                {u.is_checked ? (
                                    <CheckCircle2
                                        size={18}
                                        className="text-emerald-500"
                                    />
                                ) : (
                                    <Circle
                                        size={18}
                                        className="text-amber-400"
                                    />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-slate-800 truncate">
                                    {u.original_name}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {u.team_name} ·{" "}
                                    {u.uploaded_at
                                        ? new Date(
                                              u.uploaded_at,
                                          ).toLocaleString("ru-RU")
                                        : "—"}
                                </p>
                                {u.is_checked && u.checked_at && (
                                    <p className="text-xs text-emerald-600">
                                        {t.admin.checked}:{" "}
                                        {new Date(u.checked_at).toLocaleString(
                                            "ru-RU",
                                        )}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-2 rounded-xl hover:bg-white/60 transition-colors text-slate-500 hover:text-indigo-600">
                                    <Download size={15} />
                                </button>
                                <motion.button
                                    onClick={() => toggle(u)}
                                    disabled={toggling === u.id}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                                    style={
                                        u.is_checked
                                            ? {
                                                  background:
                                                      "rgba(239,68,68,0.08)",
                                                  color: "#dc2626",
                                                  border: "1px solid rgba(239,68,68,0.2)",
                                              }
                                            : {
                                                  background:
                                                      "rgba(16,185,129,0.1)",
                                                  color: "#059669",
                                                  border: "1px solid rgba(16,185,129,0.2)",
                                              }
                                    }
                                >
                                    {toggling === u.id ? (
                                        <Loader2
                                            size={12}
                                            className="animate-spin"
                                        />
                                    ) : u.is_checked ? (
                                        t.admin.markUnchecked
                                    ) : (
                                        t.admin.markChecked
                                    )}
                                </motion.button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}

function QuestionsTab({ t }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("all");
  const [stats, setStats] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editQ, setEditQ] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, sRes] = await Promise.all([
        adminGetQuestions(catFilter === "all" ? null : catFilter),
        adminGetQuestionsStats(),
      ]);

      // ✅ Исправлено: не оборачиваем в массив!
      setQuestions(qRes.data);        // сервер уже возвращает массив
      setStats(sRes.data);

    } catch (err) {
      console.error("Ошибка загрузки вопросов:", err);
      
      // Фолбэк только для разработки
      setQuestions([
        {
          id: 1,
          text_kz: "OSI моделінің қай деңгейі...",
          text_ru: "Какой уровень модели OSI...",
          options_kz: ["Желiлік", "Тасымалдау", "Сеанстық", "Ұсыныс", "Қолданбалық"],
          options_ru: ["Сетевой", "Транспортный", "Сеансовый", "Представления", "Прикладной"],
          correct_index: 2,
          category: "network",
        },
      ]);
      setStats({ network: 25, database: 25 });
    } finally {
      setLoading(false);
    }
  }, [catFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // Функция для отображения правильного текста и вариантов
  const getQuestionText = (q) => q.text_ru || q.text_kz || q.text || "Без текста";
  const getOptions = (q) => q.options_ru || q.options_kz || q.options || [];

  const handleDelete = async (id) => {
    if (!window.confirm(t.admin.confirmDelete)) return;
    try {
      await adminDeleteQuestion(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      toast.success("Жойылды");
    } catch {
      toast.error("Қате");
    }
  };

  return (
    <div>
      {/* Stats */}
      {stats && (
        <div className="flex gap-3 mb-4">
          {[
            {
              label: t.admin.catNetwork,
              value: stats.network?.count ?? stats.network ?? stats.network_count ?? 0,
              color: "#6366f1",
              icon: <Wifi size={14} />,
            },
            {
              label: t.admin.catDatabase,
              value: stats.database?.count ?? stats.database ?? stats.database_count ?? 0,
              color: "#10b981",
              icon: <Database size={14} />,
            },
          ].map((s) => (
            <div
              key={s.label}
              className="glass-card rounded-xl px-4 py-2.5 flex items-center gap-2"
            >
              <span style={{ color: s.color }}>{s.icon}</span>
              <span className="font-bold text-sm" style={{ color: s.color }}>
                {s.value}/25
              </span>
              <span className="text-xs text-slate-500">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        {["all", "network", "database"].map((c) => (
          <button
            key={c}
            onClick={() => setCatFilter(c)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={
              catFilter === c
                ? {
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color: "#fff",
                  }
                : {
                    background: "rgba(255,255,255,0.5)",
                    color: "#64748b",
                    border: "1px solid rgba(255,255,255,0.7)",
                  }
            }
          >
            {c === "all"
              ? t.admin.filterAll
              : c === "network"
              ? t.admin.catNetwork
              : t.admin.catDatabase}
          </button>
        ))}

        <button
          onClick={() => {
            setEditQ(null);
            setShowForm(true);
          }}
          className="ml-auto btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
        >
          <Plus size={13} /> {t.admin.addQuestion}
        </button>
      </div>

      {/* Question form */}
      <AnimatePresence>
        {showForm && (
          <QuestionForm
            t={t}
            initial={editQ}
            onSave={async (data) => {
              try {
                if (editQ) {
                  const r = await adminUpdateQuestion(editQ.id, data);
                  setQuestions((prev) =>
                    prev.map((q) => (q.id === editQ.id ? r.data : q))
                  );
                } else {
                  const r = await adminAddQuestion(data);
                  setQuestions((prev) => [...prev, r.data]);
                }
                toast.success("Сақталды");
                setShowForm(false);
                setEditQ(null);
              } catch (e) {
                toast.error(e.response?.data?.detail || "Қате");
              }
            }}
            onCancel={() => {
              setShowForm(false);
              setEditQ(null);
            }}
          />
        )}
      </AnimatePresence>

      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-3 mt-2">
          {questions.map((q, i) => {
            const text = getQuestionText(q);
            const options = getOptions(q);

            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass-card rounded-2xl p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold`}
                      style={
                        q.category === "network"
                          ? { background: "rgba(99,102,241,0.1)", color: "#6366f1" }
                          : { background: "rgba(16,185,129,0.1)", color: "#10b981" }
                      }
                    >
                      {q.category === "network" ? <Wifi size={10} /> : <Database size={10} />}
                      {q.category === "network" ? t.admin.catNetwork : t.admin.catDatabase}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 mb-3">{text}</p>

                    <div className="grid grid-cols-2 gap-1.5">
                      {options.map((opt, oi) => (
                        <div
                          key={oi}
                          className={`text-xs px-3 py-2 rounded-xl flex items-center gap-2 ${
                            oi === q.correct_index
                              ? "bg-emerald-100 text-emerald-700 font-semibold"
                              : "bg-white/60 text-slate-600"
                          }`}
                        >
                          {oi === q.correct_index && <CheckCircle2 size={14} />}
                          <span className="font-bold text-xs opacity-70">
                            {String.fromCharCode(65 + oi)}.
                          </span>
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => {
                        setEditQ(q);
                        setShowForm(true);
                      }}
                      className="p-2 rounded-xl hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="p-2 rounded-xl hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {questions.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">
              Сұрақтар жоқ / Нет вопросов
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Question form
function QuestionForm({ t, initial, onSave, onCancel }) {
    const [text, setText] = useState(initial?.text || "");
    const [options, setOptions] = useState(
        initial?.options || ["", "", "", ""],
    );
    const [correct, setCorrect] = useState(initial?.correct_index ?? 0);
    const [category, setCategory] = useState(initial?.category || "network");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!text.trim() || options.some((o) => !o.trim())) {
            toast.error("Барлық өрісті толтырыңыз");
            return;
        }
        setSaving(true);
        await onSave({ text, options, correct_index: correct, category });
        setSaving(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden" }}
            className="mb-4"
        >
            <div className="glass-card rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-slate-700">
                        {initial ? t.admin.editQuestion : t.admin.addQuestion}
                    </p>
                    <button
                        onClick={onCancel}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Category */}
                <div className="flex gap-2">
                    {[
                        {
                            v: "network",
                            l: t.admin.catNetwork,
                            c: "#6366f1",
                            i: <Wifi size={13} />,
                        },
                        {
                            v: "database",
                            l: t.admin.catDatabase,
                            c: "#10b981",
                            i: <Database size={13} />,
                        },
                    ].map((c) => (
                        <button
                            key={c.v}
                            onClick={() => setCategory(c.v)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
                            style={
                                category === c.v
                                    ? {
                                          background: `${c.c}15`,
                                          color: c.c,
                                          border: `2px solid ${c.c}40`,
                                      }
                                    : {
                                          background: "rgba(255,255,255,0.5)",
                                          color: "#94a3b8",
                                          border: "1.5px solid rgba(255,255,255,0.7)",
                                      }
                            }
                        >
                            {c.i} {c.l}
                        </button>
                    ))}
                </div>

                {/* Question */}
                <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1.5">
                        {t.admin.questionText}
                    </label>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={2}
                        className="input-glass w-full px-3 py-2 rounded-xl text-sm resize-none"
                        placeholder="Сұрақ мәтіні / Текст вопроса"
                    />
                </div>

                {/* Options */}
                <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1.5">
                        {t.admin.questionOptions}
                    </label>
                    <div className="space-y-2">
                        {options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                                <button
                                    onClick={() => setCorrect(oi)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all"
                                    style={
                                        correct === oi
                                            ? {
                                                  background:
                                                      "linear-gradient(135deg,#10b981,#059669)",
                                                  color: "#fff",
                                              }
                                            : {
                                                  background:
                                                      "rgba(255,255,255,0.6)",
                                                  color: "#94a3b8",
                                                  border: "1px solid rgba(255,255,255,0.8)",
                                              }
                                    }
                                >
                                    {String.fromCharCode(65 + oi)}
                                </button>
                                <input
                                    value={opt}
                                    onChange={(e) =>
                                        setOptions((prev) =>
                                            prev.map((o, i) =>
                                                i === oi ? e.target.value : o,
                                            ),
                                        )
                                    }
                                    className="input-glass flex-1 px-3 py-2 rounded-xl text-sm"
                                    placeholder={`${t.admin.option} ${String.fromCharCode(65 + oi)}`}
                                />
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                        {t.admin.correctAnswer}: нажмите на букву
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onCancel}
                        className="btn-glass flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600"
                    >
                        {t.admin.cancelEdit}
                    </button>
                    <motion.button
                        onClick={handleSave}
                        disabled={saving}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className="btn-primary flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"
                    >
                        {saving ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <>
                                <Save size={14} />
                                {t.admin.saveQuestion}
                            </>
                        )}
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
}

// ── Quiz Results Tab ──────────────────────────────────────────────
function ResultsTab({ t }) {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(null);
    const [detail, setDetail] = useState({});

    useEffect(() => {
        adminGetAllResults()
            .then((r) => setResults(Array.isArray(r.data) ? r.data : []))
            .catch(() =>
                setResults([
                    {
                        team_id: 1,
                        team_name: "Team Alpha",
                        variant: 1,
                        is_completed: true,
                        total_questions: 10,
                        answered_count: 10,
                        correct_count: 8,
                        network_correct: 4,
                        database_correct: 4,
                        score_percent: 80,
                    },
                    {
                        team_id: 2,
                        team_name: "Mockers",
                        variant: 2,
                        is_completed: false,
                        total_questions: 10,
                        answered_count: 3,
                        correct_count: 2,
                        network_correct: 1,
                        database_correct: 1,
                        score_percent: 20,
                    },
                ]),
            )
            .finally(() => setLoading(false));
    }, []);

    const loadDetail = async (teamId) => {
        if (detail[teamId]) {
            setExpanded(expanded === teamId ? null : teamId);
            return;
        }
        try {
            const r = await adminGetTeamResult(teamId);
            setDetail((prev) => ({ ...prev, [teamId]: r.data }));
            setExpanded(teamId);
        } catch {
            toast.error("Қате");
        }
    };

    if (loading) return <Spinner />;

    return (
        <div>
            {/* Summary table */}
            <div className="glass-card rounded-2xl overflow-hidden mb-4">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/40">
                                {[
                                    t.admin.team,
                                    t.admin.variant,
                                    t.admin.totalQ,
                                    t.admin.answered,
                                    t.admin.correctCount,
                                    t.admin.networkCorrect,
                                    t.admin.dbCorrect,
                                    t.admin.scorePercent,
                                    t.admin.completed,
                                ].map((h) => (
                                    <th
                                        key={h}
                                        className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap"
                                    >
                                        {h}
                                    </th>
                                ))}
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r, i) => (
                                <tr
                                    key={r.team_id}
                                    className={`border-b border-white/20 hover:bg-white/20 transition-colors ${i % 2 === 0 ? "" : "bg-white/5"}`}
                                >
                                    <td className="px-4 py-3 font-semibold text-slate-800">
                                        {r.team_name}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">
                                        #{r.variant}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {r.total_questions}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {r.answered_count}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className="font-semibold"
                                            style={{
                                                color:
                                                    r.correct_count /
                                                        r.total_questions >=
                                                    0.7
                                                        ? "#10b981"
                                                        : "#f59e0b",
                                            }}
                                        >
                                            {r.correct_count}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-indigo-600 font-medium">
                                        {r.network_correct}
                                    </td>
                                    <td className="px-4 py-3 text-emerald-600 font-medium">
                                        {r.database_correct}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${r.score_percent}%`,
                                                        background:
                                                            r.score_percent >=
                                                            70
                                                                ? "#10b981"
                                                                : r.score_percent >=
                                                                    40
                                                                  ? "#f59e0b"
                                                                  : "#ef4444",
                                                    }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600">
                                                {Math.round(r.score_percent)}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.is_completed ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                                        >
                                            {r.is_completed
                                                ? t.admin.completed
                                                : t.admin.notCompleted}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() =>
                                                loadDetail(r.team_id)
                                            }
                                            className="text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors whitespace-nowrap"
                                        >
                                            {t.admin.viewDetail}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail expand */}
            <AnimatePresence>
                {expanded && detail[expanded] && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: "hidden" }}
                    >
                        <div className="glass-card rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <p className="font-semibold text-slate-700">
                                    {detail[expanded].team_name} —{" "}
                                    {t.admin.viewDetail}
                                </p>
                                <button
                                    onClick={() => setExpanded(null)}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="space-y-2">
                                {detail[expanded].answers?.map((ans, i) => (
                                    <div
                                        key={ans.question_id}
                                        className="p-3 rounded-xl"
                                        style={
                                            ans.is_correct
                                                ? {
                                                      background:
                                                          "rgba(16,185,129,0.07)",
                                                      border: "1px solid rgba(16,185,129,0.2)",
                                                  }
                                                : {
                                                      background:
                                                          "rgba(239,68,68,0.06)",
                                                      border: "1px solid rgba(239,68,68,0.15)",
                                                  }
                                        }
                                    >
                                        <div className="flex items-start gap-2">
                                            <span
                                                className={`text-xs font-bold flex-shrink-0 mt-0.5 ${ans.is_correct ? "text-emerald-500" : "text-red-400"}`}
                                            >
                                                {i + 1}.
                                            </span>
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-700 font-medium mb-1">
                                                    {ans.question_text}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <span
                                                        className="px-1.5 py-0.5 rounded"
                                                        style={
                                                            ans.category ===
                                                            "network"
                                                                ? {
                                                                      background:
                                                                          "rgba(99,102,241,0.1)",
                                                                      color: "#6366f1",
                                                                  }
                                                                : {
                                                                      background:
                                                                          "rgba(16,185,129,0.1)",
                                                                      color: "#10b981",
                                                                  }
                                                        }
                                                    >
                                                        {ans.category ===
                                                        "network"
                                                            ? t.admin.catNetwork
                                                            : t.admin
                                                                  .catDatabase}
                                                    </span>
                                                    <span>
                                                        →{" "}
                                                        {ans.options[
                                                            ans.chosen_index
                                                        ] ?? t.quiz.notAnswered}
                                                    </span>
                                                    {!ans.is_correct && (
                                                        <span className="text-emerald-600">
                                                            ✓{" "}
                                                            {
                                                                ans.options[
                                                                    ans
                                                                        .correct_index
                                                                ]
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function Spinner() {
    return (
        <div className="flex justify-center py-16">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-500"
            />
        </div>
    );
}
