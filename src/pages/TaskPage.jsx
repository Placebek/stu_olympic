// src/pages/TaskPage.jsx
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { getMyTasks, submitFiles, getMySubmissions } from "../utils/api";
import toast from "react-hot-toast";
import {
    Upload, FileText, X, AlertTriangle, CheckCircle2,
    Hash, ChevronRight, Loader2, Zap, Clock, Lock, Info,
} from "lucide-react";
import TaskDescription from "../components/TaskDescription";

const MAX_SUBMISSIONS = 4;

// Accepted MIME → extensions
const ACCEPTED_EXTS = {
    "text/x-python": [".py"],
    "text/x-c++src": [".cpp"],
    "text/x-csrc": [".c"],
    "text/plain": [".txt"],
    "text/x-java-source": [".java"],
    "application/javascript": [".js"],
    "text/x-typescript": [".ts"],
    "application/zip": [".zip"],
    "application/pdf": [".pdf"],
    // fallback for OS that reports generic type
    "application/octet-stream": [".py", ".cpp", ".c", ".java", ".ts"],
};
const ALLOWED_LABEL = ".py  .cpp  .c  .java  .js  .ts  .txt  .zip  .pdf";

// Static hints for 3 tasks
const FILENAME_HINTS = [
    { task: 1, hint: "task1.py  or  task1.cpp" },
    { task: 2, hint: "task2.py  or  task2.cpp" },
    { task: 3, hint: "task3.py  or  task3.cpp" },
];

function groupTasks(tasks = []) {
    const map = new Map();
    for (const item of tasks) {
        if (!map.has(item.number))
            map.set(item.number, { number: item.number, kz: "", ru: "" });
        const e = map.get(item.number);
        if (item.language === "kz") e.kz = item.content;
        else if (item.language === "ru") e.ru = item.content;
    }
    return Array.from(map.values()).sort((a, b) => a.number - b.number);
}

function fmt(b) {
    if (b < 1024) return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
    return (b / 1048576).toFixed(1) + " MB";
}

function fmtDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("ru-RU", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

export default function TaskPage() {
    const { team } = useAuth();
    const { t, lang } = useLang();
    const navigate = useNavigate();

    const [groupedTasks, setGroupedTasks] = useState([]);
    const [taskData, setTaskData] = useState(null);
    const [loading, setLoading] = useState(true);

    const [pendingFiles, setPendingFiles] = useState([]);
    const [showConfirm, setShowConfirm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState([]);

    const [submissions, setSubmissions] = useState([]);
    const [subsLoading, setSubsLoading] = useState(true);

    const submittedCount = submissions.length;
    const slotsLeft = MAX_SUBMISSIONS - submittedCount;
    const isFull = slotsLeft <= 0;

    useEffect(() => {
        setLoading(true);
        getMyTasks()
            .then((r) => {
                const data = r.data;
                setTaskData({
                    variant: data.variant || team?.variant,
                    team_name: data.team_name || team?.name || "—",
                });
                setGroupedTasks(groupTasks(data.tasks || []));
            })
            .catch(() => toast.error(t.task?.loadError || "Тапсырмаларды жүктеу мүмкін болмады"))
            .finally(() => setLoading(false));
    }, []); // eslint-disable-line

    const loadSubmissions = useCallback(() => {
        setSubsLoading(true);
        getMySubmissions()
            .then((r) => setSubmissions(Array.isArray(r.data) ? r.data : []))
            .catch(() => setSubmissions([]))
            .finally(() => setSubsLoading(false));
    }, []);

    useEffect(() => { loadSubmissions(); }, [loadSubmissions]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: ACCEPTED_EXTS,
        disabled: isFull,
        onDrop: (accepted, rejected) => {
            if (rejected.length > 0)
                toast.error(`Формат қолдамайды. Рұқсат етілген: ${ALLOWED_LABEL}`);
            if (!accepted.length) return;

            setPendingFiles((prev) => {
                const names = new Set(prev.map((f) => f.name));
                const fresh = accepted.filter((f) => !names.has(f.name));
                const canAdd = Math.max(0, slotsLeft - prev.length);
                if (fresh.length > canAdd)
                    toast.error(`Тек ${canAdd} файл қосуға болады (лимит ${MAX_SUBMISSIONS})`);
                return [...prev, ...fresh.slice(0, canAdd)];
            });
        },
    });

    const removePending = (name) =>
        setPendingFiles((prev) => prev.filter((f) => f.name !== name));

    const handleSubmit = async () => {
        if (!pendingFiles.length) return;
        setSubmitting(true);
        setUploadProgress(pendingFiles.map((f) => ({ name: f.name, status: "pending" })));

        let anySuccess = false;
        for (let i = 0; i < pendingFiles.length; i++) {
            const file = pendingFiles[i];
            setUploadProgress((prev) =>
                prev.map((p, idx) => idx === i ? { ...p, status: "uploading" } : p));
            try {
                const fd = new FormData();
                fd.append("file", file);
                await submitFiles(fd);
                setUploadProgress((prev) =>
                    prev.map((p, idx) => idx === i ? { ...p, status: "done" } : p));
                anySuccess = true;
            } catch (e) {
                const msg = e.response?.data?.detail || "Қате";
                setUploadProgress((prev) =>
                    prev.map((p, idx) => idx === i ? { ...p, status: "error", msg } : p));
                toast.error(`${file.name}: ${msg}`);
            }
        }

        if (anySuccess) {
            toast.success("Жіберілді! 🏆");
            setPendingFiles([]);
            setShowConfirm(false);
            loadSubmissions();
        }
        setSubmitting(false);
        setUploadProgress([]);
    };

    if (loading)
        return (
            <div className="min-h-screen flex items-center justify-center relative z-10">
                <div className="w-10 h-10 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin"
                    style={{ animationDuration: "1.5s" }} />
            </div>
        );

    return (
        <div className="min-h-screen pt-28 pb-16 px-4 relative z-10">
            <div className="max-w-4xl mx-auto">

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        {taskData?.variant && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
                                style={{ background: "rgba(99,102,241,0.1)", color: "#4338ca" }}>
                                <Hash size={12} /> {t.nav?.variant} {taskData.variant}
                            </span>
                        )}
                        {taskData?.team_name && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold"
                                style={{ background: "rgba(16,185,129,0.1)", color: "#065f46" }}>
                                {taskData.team_name}
                            </span>
                        )}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900"
                        style={{ fontFamily: '"Clash Display", sans-serif' }}>
                        {t.nav?.task || "Тапсырма"}
                    </h1>
                </motion.div>

                {/* Quiz banner */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="mb-6 rounded-2xl p-4 flex items-center gap-4 cursor-pointer group"
                    style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.08))", border: "1px solid rgba(99,102,241,0.2)" }}
                    onClick={() => navigate("/quiz")}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                        <Zap size={18} color="white" fill="white" />
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-sm text-indigo-800">{t.task?.quizBanner}</p>
                        <p className="text-xs text-indigo-600 opacity-75">{t.task?.quizBannerSub}</p>
                    </div>
                    <span className="text-xs font-semibold text-indigo-600 group-hover:translate-x-1 transition-transform">
                        {t.task?.goQuiz}
                    </span>
                </motion.div>

                <div className="grid md:grid-cols-1  gap-6">

                    {/* Tasks */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }} className="md:col-span-3 space-y-6">
                        {groupedTasks.length > 0 ? groupedTasks.map((item) => {
                            const content = (lang === "kz" ? item.kz : item.ru) || item.kz || item.ru || "";
                            return (
                                <div key={`task-${item.number}`} className="glass-card rounded-3xl p-6 md:p-8">
                                    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/40">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                            <span className="text-indigo-600 font-bold text-lg">{item.number}</span>
                                        </div>
                                        <h2 className="text-xl font-bold text-slate-800"
                                            style={{ fontFamily: '"Clash Display", sans-serif' }}>
                                            {t.task?.task || "Тапсырма"}
                                        </h2>
                                    </div>
                                    <TaskDescription text={content} />
                                </div>
                            );
                        }) : (
                            <div className="glass-card rounded-3xl p-8 text-center py-12">
                                <FileText size={48} className="mx-auto mb-4 text-slate-300" />
                                <p className="text-slate-500">{t.task?.noTasks || "Тапсырмалар жоқ"}</p>
                            </div>
                        )}
                    </motion.div>

                    {/* Right panel */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }} className="md:col-span-2 space-y-4">

                        {/* Upload card */}
                        <div className="glass-card rounded-3xl p-5 space-y-4">

                            {/* Header + slot dots */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Upload size={15} className="text-indigo-500" />
                                    <span className="font-semibold text-sm text-slate-700">
                                        {t.task?.uploadTitle || "Жіберу"}
                                    </span>
                                </div>
                                <div className="flex gap-1" title={`${submittedCount}/${MAX_SUBMISSIONS}`}>
                                    {Array.from({ length: MAX_SUBMISSIONS }).map((_, i) => (
                                        <div key={i} className="w-5 h-2 rounded-full transition-all duration-300"
                                            style={{
                                                background:
                                                    i < submittedCount ? "#6366f1"
                                                    : i < submittedCount + pendingFiles.length ? "rgba(99,102,241,0.35)"
                                                    : "rgba(99,102,241,0.12)",
                                            }} />
                                    ))}
                                </div>
                            </div>

                            {/* Filename hints */}
                            <div className="rounded-xl p-3"
                                style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.12)" }}>
                                <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1 mb-2">
                                    <Info size={11} />
                                    Ұсынылатын файл атаулары / Рекомендуемые имена
                                </p>
                                <div className="space-y-1">
                                    {FILENAME_HINTS.map((h) => (
                                        <div key={h.task} className="flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                                                {h.task}
                                            </span>
                                            <code className="text-xs text-slate-500 font-mono">{h.hint}</code>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2">
                                    Рұқсат етілген: <span className="font-mono">{ALLOWED_LABEL}</span>
                                </p>
                            </div>

                            {/* Dropzone */}
                            {isFull ? (
                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center">
                                    <Lock size={22} className="mx-auto mb-2 text-slate-300" />
                                    <p className="text-sm font-medium text-slate-400">
                                        Лимит {MAX_SUBMISSIONS} файл — жабылды / достигнут
                                    </p>
                                </div>
                            ) : (
                                <div {...getRootProps()}
                                    className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all duration-300
                                        ${isDragActive ? "border-indigo-400 bg-indigo-50/60" : "border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50/30"}`}>
                                    <input {...getInputProps()} />
                                    <motion.div animate={isDragActive ? { scale: 1.08 } : { scale: 1 }}
                                        transition={{ type: "spring", stiffness: 300 }}>
                                        <Upload size={24} className="mx-auto mb-2 text-indigo-400" />
                                        <p className="text-sm text-slate-600 font-medium">
                                            {isDragActive ? (t.task?.dropActive || "Тастаңыз!") : (t.task?.dropzone || "Файлды таңдаңыз")}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Қалды / Осталось:{" "}
                                            <span className="font-semibold text-indigo-500">
                                                {Math.max(0, slotsLeft - pendingFiles.length)}
                                            </span>
                                            /{MAX_SUBMISSIONS}
                                        </p>
                                    </motion.div>
                                </div>
                            )}

                            {/* Pending queue */}
                            <AnimatePresence>
                                {pendingFiles.length > 0 && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }} className="space-y-2">
                                        {pendingFiles.map((f) => (
                                            <motion.div key={f.name}
                                                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                                                className="flex items-center gap-2 p-2.5 rounded-xl"
                                                style={{ background: "rgba(99,102,241,0.07)" }}>
                                                <FileText size={14} className="text-indigo-500 flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-slate-700 truncate">{f.name}</p>
                                                    <p className="text-xs text-slate-400">{fmt(f.size)}</p>
                                                </div>
                                                <button onClick={() => removePending(f.name)}
                                                    className="p-1 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors">
                                                    <X size={12} />
                                                </button>
                                            </motion.div>
                                        ))}
                                        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                            onClick={() => setShowConfirm(true)}
                                            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                                            className="btn-primary w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
                                            {t.task?.submitBtn || "Жіберу"} <ChevronRight size={16} />
                                        </motion.button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Warning */}
                        <div className="rounded-2xl p-4 flex gap-3"
                            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700 leading-relaxed">{t.task?.warning}</p>
                        </div>

                        {/* Submission history */}
                        <div className="glass-card rounded-3xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <CheckCircle2 size={15} className="text-emerald-500" />
                                <p className="font-semibold text-sm text-slate-700">
                                    Жіберілген / Отправленные
                                </p>
                                <span className="ml-auto text-xs text-slate-400">
                                    {submittedCount}/{MAX_SUBMISSIONS}
                                </span>
                            </div>

                            {subsLoading ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 size={18} className="animate-spin text-indigo-400" />
                                </div>
                            ) : submissions.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-3">
                                    Әлі жіберілмеді / Ничего не отправлено
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {submissions.map((s) => (
                                        <div key={s.id} className="flex items-start gap-2 p-3 rounded-xl"
                                            style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
                                            <FileText size={13} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-slate-700 truncate">
                                                    {s.original_name || s.filename}
                                                </p>
                                                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                    <Clock size={9} /> {fmtDate(s.uploaded_at)}
                                                </p>
                                            </div>
                                            <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                                        </div>
                                    ))}
                                    <p className="text-[10px] text-slate-400 text-center pt-1">
                                        ⚠️ Жіберілген файлдарды жою мүмкін емес
                                    </p>
                                </div>
                            )}
                        </div>

                    </motion.div>
                </div>
            </div>

            {/* Confirm modal */}
            <AnimatePresence>
                {showConfirm && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)" }}
                        onClick={(e) => !submitting && e.target === e.currentTarget && setShowConfirm(false)}>
                        <motion.div
                            initial={{ scale: 0.85, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.85, opacity: 0, y: 20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="glass-strong rounded-3xl p-8 max-w-sm w-full">

                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                                style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))" }}>
                                <Upload size={26} className="text-indigo-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 text-center mb-1"
                                style={{ fontFamily: '"Clash Display", sans-serif' }}>
                                {t.task?.confirmTitle || "Растаңыз"}
                            </h3>
                            <p className="text-sm text-slate-500 text-center mb-4">
                                {pendingFiles.length} файл · {t.task?.confirmFiles}
                            </p>

                            {/* Per-file upload status */}
                            <div className="space-y-1.5 mb-4">
                                {(uploadProgress.length > 0
                                    ? uploadProgress
                                    : pendingFiles.map((f) => ({ name: f.name, status: "pending" }))
                                ).map((p) => (
                                    <div key={p.name} className="flex items-center gap-2 p-2 rounded-xl"
                                        style={{ background: "rgba(99,102,241,0.05)" }}>
                                        {p.status === "uploading" && <Loader2 size={12} className="animate-spin text-indigo-500 flex-shrink-0" />}
                                        {p.status === "done"      && <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" />}
                                        {p.status === "error"     && <X size={12} className="text-red-400 flex-shrink-0" />}
                                        {p.status === "pending"   && <div className="w-3 h-3 rounded-full border-2 border-slate-300 flex-shrink-0" />}
                                        <span className="text-xs text-slate-600 truncate flex-1">{p.name}</span>
                                        {p.status === "error" && <span className="text-[10px] text-red-400 truncate">{p.msg}</span>}
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-2xl p-3 mb-5"
                                style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)" }}>
                                <p className="text-xs text-red-600 font-semibold">{t.task?.confirmWarningTitle}</p>
                                <p className="text-xs text-red-500 mt-0.5">{t.task?.confirmWarningDesc}</p>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setShowConfirm(false)} disabled={submitting}
                                    className="btn-glass flex-1 py-3 rounded-xl text-sm font-semibold text-slate-600 disabled:opacity-40">
                                    {t.task?.cancel || "Болдырмау"}
                                </button>
                                <motion.button onClick={handleSubmit} disabled={submitting}
                                    whileHover={{ scale: submitting ? 1 : 1.02 }} whileTap={{ scale: 0.97 }}
                                    className="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                                    {submitting
                                        ? <Loader2 size={16} className="animate-spin" />
                                        : (t.task?.send || "Жіберу")}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
