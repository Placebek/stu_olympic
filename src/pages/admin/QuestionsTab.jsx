// src/pages/admin/QuestionsTab.jsx
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    RefreshCw,
    CheckCircle2,
    Plus,
    Edit2,
    Trash2,
    Wifi,
    Database,
    X,
    Save,
    Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import {
    adminGetQuestions,
    adminGetQuestionsStats,
    adminAddQuestion,
    adminUpdateQuestion,
    adminDeleteQuestion,
} from "../../utils/api";
import { Spinner } from "./AdminShared";

// ── Question Form ─────────────────────────────────────────────────
function QuestionForm({ t, initial, onSave, onCancel }) {
    const [text, setText] = useState(initial?.text_ru || initial?.text || "");
    const [options, setOptions] = useState(
        initial?.options_ru || initial?.options || ["", "", "", "", ""],
    );
    const [correct, setCorrect] = useState(initial?.correct_index ?? 0);
    const [category, setCategory] = useState(initial?.category || "network");
    const [saving, setSaving] = useState(false);

    // Sync when editing a different question
    useEffect(() => {
        setText(initial?.text_ru || initial?.text || "");
        setOptions(initial?.options_ru || initial?.options || ["", "", "", "", ""]);
        setCorrect(initial?.correct_index ?? 0);
        setCategory(initial?.category || "network");
    }, [initial]);

    const handleSave = async () => {
        if (!text.trim() || options.some((o) => !o.trim())) {
            toast.error("Барлық өрісті толтырыңыз");
            return;
        }
        setSaving(true);
        await onSave({
            text_ru: text,
            text_kz: text, // при необходимости добавить отдельное поле KZ
            options_ru: options,
            options_kz: options,
            correct_index: correct,
            category,
        });
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
                        { v: "network", l: t.admin.catNetwork, c: "#6366f1", i: <Wifi size={13} /> },
                        { v: "database", l: t.admin.catDatabase, c: "#10b981", i: <Database size={13} /> },
                    ].map((c) => (
                        <button
                            key={c.v}
                            onClick={() => setCategory(c.v)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
                            style={
                                category === c.v
                                    ? { background: `${c.c}15`, color: c.c, border: `2px solid ${c.c}40` }
                                    : { background: "rgba(255,255,255,0.5)", color: "#94a3b8", border: "1.5px solid rgba(255,255,255,0.7)" }
                            }
                        >
                            {c.i} {c.l}
                        </button>
                    ))}
                </div>

                {/* Question text */}
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
                                            ? { background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff" }
                                            : { background: "rgba(255,255,255,0.6)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.8)" }
                                    }
                                >
                                    {String.fromCharCode(65 + oi)}
                                </button>
                                <input
                                    value={opt}
                                    onChange={(e) =>
                                        setOptions((prev) =>
                                            prev.map((o, i) => (i === oi ? e.target.value : o)),
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

// ── Questions Tab ─────────────────────────────────────────────────
export default function QuestionsTab({ t }) {
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
            setQuestions(Array.isArray(qRes.data) ? qRes.data : []);
            setStats(sRes.data);
        } catch (err) {
            console.error("Ошибка загрузки вопросов:", err);
            setQuestions([
                {
                    id: 1,
                    text_ru: "Какой уровень модели OSI...",
                    text_kz: "OSI моделінің қай деңгейі...",
                    options_ru: ["Сетевой", "Транспортный", "Сеансовый", "Представления", "Прикладной"],
                    options_kz: ["Желiлік", "Тасымалдау", "Сеанстық", "Ұсыныс", "Қолданбалық"],
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

    const statVal = (key) => {
        if (!stats) return 0;
        return stats[key]?.count ?? stats[key] ?? stats[`${key}_count`] ?? 0;
    };

    return (
        <div>
            {/* Stats */}
            {stats && (
                <div className="flex gap-3 mb-4">
                    {[
                        { label: t.admin.catNetwork, key: "network", color: "#6366f1", icon: <Wifi size={14} /> },
                        { label: t.admin.catDatabase, key: "database", color: "#10b981", icon: <Database size={14} /> },
                    ].map((s) => (
                        <div key={s.label} className="glass-card rounded-xl px-4 py-2.5 flex items-center gap-2">
                            <span style={{ color: s.color }}>{s.icon}</span>
                            <span className="font-bold text-sm" style={{ color: s.color }}>
                                {statVal(s.key)}/25
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
                                ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" }
                                : { background: "rgba(255,255,255,0.5)", color: "#64748b", border: "1px solid rgba(255,255,255,0.7)" }
                        }
                    >
                        {c === "all" ? t.admin.filterAll : c === "network" ? t.admin.catNetwork : t.admin.catDatabase}
                    </button>
                ))}

                <button
                    onClick={load}
                    className="p-2 rounded-xl hover:bg-white/50 transition-colors text-slate-500"
                >
                    <RefreshCw size={15} />
                </button>

                <button
                    onClick={() => { setEditQ(null); setShowForm(true); }}
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
                                        prev.map((q) => (q.id === editQ.id ? r.data : q)),
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
                        onCancel={() => { setShowForm(false); setEditQ(null); }}
                    />
                )}
            </AnimatePresence>

            {loading ? (
                <Spinner />
            ) : (
                <div className="space-y-3 mt-2">
                    {questions.length === 0 && (
                        <div className="text-center py-12 text-slate-400 text-sm">
                            Сұрақтар жоқ / Нет вопросов
                        </div>
                    )}
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
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold"
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
                                            onClick={() => { setEditQ(q); setShowForm(true); }}
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
                </div>
            )}
        </div>
    );
}
