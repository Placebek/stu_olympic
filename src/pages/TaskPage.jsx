import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { getMyTasks, submitFiles, getTask } from "../utils/api";
import toast from "react-hot-toast";
import {
    Upload,
    FileText,
    X,
    AlertTriangle,
    CheckCircle2,
    Code2,
    Hash,
    Clock,
    ChevronRight,
    Loader2,
    Zap,
} from "lucide-react";
import TaskDescription from "../components/TaskDescription";

export default function TaskPage() {
    const { team, isSubmitted, markSubmitted } = useAuth();
    const { t } = useLang();
    const navigate = useNavigate();

    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [files, setFiles] = useState([]);
    const [showConfirm, setShowConfirm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(isSubmitted());
    const [taskData, setTaskData] = useState(null); // будет весь объект {variant, team_name, tasks}

    useEffect(() => {
        if (!team?.variant) {
            setLoading(false);
            return;
        }

        setLoading(true);

        getTask(team.variant)
            .then((r) => {
                const data = r.data;
                // минимальная нормализация
                const normalized = {
                    variant: data.variant || team.variant,
                    team_name: data.team_name || team?.name || "—",
                    tasks: Array.isArray(data.tasks) ? data.tasks : [],
                };
                setTaskData(normalized);
            })
            .catch((err) => {
                console.error("Ошибка загрузки заданий:", err);
                toast.error(
                    t.task.loadError || "Тапсырмаларды жүктеу мүмкін болмады",
                );
                // можно оставить fallback, но лучше показывать ошибку
            })
            .finally(() => setLoading(false));
    }, [team?.variant, t]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: (accepted) =>
            setFiles((prev) => [
                ...prev,
                ...accepted.filter((f) => !prev.find((p) => p.name === f.name)),
            ]),
        disabled: submitted,
    });

    const removeFile = (name) =>
        setFiles((prev) => prev.filter((f) => f.name !== name));

    const handleSubmit = async () => {
        if (files.length === 0) {
            toast.error("Файл қосыңыз");
            return;
        }
        setSubmitting(true);
        try {
            const fd = new FormData();
            files.forEach((f) => fd.append("file", f));
            await submitFiles(fd);
            markSubmitted();
            setSubmitted(true);
            setShowConfirm(false);
            toast.success("Жұмыс жіберілді! 🏆");
        } catch (e) {
            toast.error(e.response?.data?.detail || "Жіберу қатесі");
        } finally {
            setSubmitting(false);
        }
    };

    const fmt = (b) =>
        b < 1024
            ? b + " B"
            : b < 1048576
              ? (b / 1024).toFixed(1) + " KB"
              : (b / 1048576).toFixed(1) + " MB";

    if (loading)
        return (
            <div className="min-h-screen flex items-center justify-center relative z-10">
                <div
                    className="w-10 h-10 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin"
                    style={{ animationDuration: '1.5s' }}
                />
            </div>
        );

    return (
        <div className="min-h-screen pt-28 pb-16 px-4 relative z-10">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        {task?.variant && (
                            <span
                                className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
                                style={{
                                    background: "rgba(99,102,241,0.1)",
                                    color: "#4338ca",
                                }}
                            >
                                <Hash size={12} /> {t.nav.variant}{" "}
                                {task.variant}
                            </span>
                        )}
                        {task?.difficulty && (
                            <span
                                className="px-3 py-1 rounded-full text-xs font-semibold"
                                style={{
                                    background: "rgba(245,158,11,0.1)",
                                    color: "#b45309",
                                }}
                            >
                                {task.difficulty}
                            </span>
                        )}
                        {task?.timeLimit && (
                            <span
                                className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
                                style={{
                                    background: "rgba(16,185,129,0.1)",
                                    color: "#065f46",
                                }}
                            >
                                <Clock size={12} /> {task.timeLimit}
                            </span>
                        )}
                    </div>
                    <h1
                        className="text-3xl md:text-4xl font-bold text-slate-900"
                        style={{ fontFamily: '"Clash Display", sans-serif' }}
                    >
                        {task?.title || t.nav.task}
                    </h1>
                </motion.div>

                {/* Quiz banner */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="mb-6 rounded-2xl p-4 flex items-center gap-4 cursor-pointer group"
                    style={{
                        background:
                            "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.08))",
                        border: "1px solid rgba(99,102,241,0.2)",
                    }}
                    onClick={() => navigate("/quiz")}
                >
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                            background:
                                "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        }}
                    >
                        <Zap size={18} color="white" fill="white" />
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-sm text-indigo-800">
                            {t.task.quizBanner}
                        </p>
                        <p className="text-xs text-indigo-600 opacity-75">
                            {t.task.quizBannerSub}
                        </p>
                    </div>
                    <span className="text-xs font-semibold text-indigo-600 group-hover:translate-x-1 transition-transform">
                        {t.task.goQuiz}
                    </span>
                </motion.div>

                <div className="grid md:grid-cols-5 gap-6">
                    {/* Task description */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="md:col-span-3 space-y-6"
                    >
                        {taskData?.tasks?.length > 0 ? (
                            taskData.tasks.map((item) => (
                                <div
                                    key={item.number}
                                    className="glass-card rounded-3xl p-6 md:p-8"
                                >
                                    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/40">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                            <span className="text-indigo-600 font-bold text-lg">
                                                {item.number}
                                            </span>
                                        </div>
                                        <h2
                                            className="text-xl font-bold text-slate-800"
                                            style={{
                                                fontFamily:
                                                    '"Clash Display", sans-serif',
                                            }}
                                        >
                                            {t.task.task} {item.number}
                                        </h2>
                                    </div>
                                    <TaskDescription text={item.content || ''} />
                                </div>
                            ))
                        ) : loading ? null : (
                            <div className="glass-card rounded-3xl p-8 text-center py-12">
                                <FileText
                                    size={48}
                                    className="mx-auto mb-4 text-slate-300"
                                />
                                <p className="text-slate-500">
                                    {t.task.noTasks || "Тапсырмалар әзірге жоқ"}
                                </p>
                            </div>
                        )}
                    </motion.div>

                    {/* Upload panel */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="md:col-span-2 space-y-4"
                    >
                        {submitted && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="rounded-2xl p-5 text-center"
                                style={{
                                    background:
                                        "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.08))",
                                    border: "1px solid rgba(16,185,129,0.25)",
                                }}
                            >
                                <CheckCircle2
                                    size={32}
                                    className="text-emerald-500 mx-auto mb-2"
                                />
                                <p
                                    className="font-bold text-emerald-700"
                                    style={{
                                        fontFamily:
                                            '"Clash Display", sans-serif',
                                    }}
                                >
                                    {t.task.submittedTitle}
                                </p>
                                <p className="text-xs text-emerald-600 mt-1">
                                    {t.task.submittedDesc}
                                </p>
                            </motion.div>
                        )}

                        {!submitted && (
                            <div className="glass-card rounded-3xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Upload
                                        size={16}
                                        className="text-indigo-500"
                                    />
                                    <span className="font-semibold text-sm text-slate-700">
                                        {t.task.uploadTitle}
                                    </span>
                                </div>

                                <div
                                    {...getRootProps()}
                                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-300 cursor-pointer
                    ${isDragActive ? "border-indigo-400 bg-indigo-50/60" : "border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50/30"}`}
                                >
                                    <input {...getInputProps()} />
                                    <motion.div
                                        animate={
                                            isDragActive
                                                ? { scale: 1.1 }
                                                : { scale: 1 }
                                        }
                                        transition={{
                                            type: "spring",
                                            stiffness: 300,
                                        }}
                                    >
                                        <Upload
                                            size={28}
                                            className="mx-auto mb-2 text-indigo-400"
                                        />
                                        <p className="text-sm text-slate-600 font-medium">
                                            {isDragActive
                                                ? t.task.dropActive
                                                : t.task.dropzone}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {t.task.dropzoneHint}
                                        </p>
                                    </motion.div>
                                </div>

                                <AnimatePresence>
                                    {files.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{
                                                opacity: 1,
                                                height: "auto",
                                            }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mt-3 space-y-2"
                                        >
                                            {files.map((f) => (
                                                <motion.div
                                                    key={f.name}
                                                    initial={{
                                                        opacity: 0,
                                                        x: -10,
                                                    }}
                                                    animate={{
                                                        opacity: 1,
                                                        x: 0,
                                                    }}
                                                    exit={{ opacity: 0, x: 10 }}
                                                    className="flex items-center gap-2 p-2.5 rounded-xl"
                                                    style={{
                                                        background:
                                                            "rgba(99,102,241,0.07)",
                                                    }}
                                                >
                                                    <FileText
                                                        size={14}
                                                        className="text-indigo-500 flex-shrink-0"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-slate-700 truncate">
                                                            {f.name}
                                                        </p>
                                                        <p className="text-xs text-slate-400">
                                                            {fmt(f.size)}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() =>
                                                            removeFile(f.name)
                                                        }
                                                        className="p-1 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {files.length > 0 && (
                                    <motion.button
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        onClick={() => setShowConfirm(true)}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="btn-primary w-full py-3 rounded-xl font-semibold text-sm mt-3 flex items-center justify-center gap-2"
                                    >
                                        {t.task.submitBtn}{" "}
                                        <ChevronRight size={16} />
                                    </motion.button>
                                )}
                            </div>
                        )}

                        <div
                            className="rounded-2xl p-4 flex gap-3"
                            style={{
                                background: "rgba(245,158,11,0.08)",
                                border: "1px solid rgba(245,158,11,0.2)",
                            }}
                        >
                            <AlertTriangle
                                size={16}
                                className="text-amber-500 flex-shrink-0 mt-0.5"
                            />
                            <p className="text-xs text-amber-700 leading-relaxed">
                                {t.task.warning}
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Confirm modal */}
            <AnimatePresence>
                {showConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{
                            background: "rgba(0,0,0,0.3)",
                            backdropFilter: "blur(8px)",
                        }}
                        onClick={(e) =>
                            e.target === e.currentTarget &&
                            setShowConfirm(false)
                        }
                    >
                        <motion.div
                            initial={{ scale: 0.85, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.85, opacity: 0, y: 20 }}
                            transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 25,
                            }}
                            className="glass-strong rounded-3xl p-8 max-w-sm w-full"
                        >
                            <div
                                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                                style={{
                                    background:
                                        "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))",
                                }}
                            >
                                <AlertTriangle
                                    size={26}
                                    className="text-indigo-600"
                                />
                            </div>
                            <h3
                                className="text-xl font-bold text-slate-800 text-center mb-2"
                                style={{
                                    fontFamily: '"Clash Display", sans-serif',
                                }}
                            >
                                {t.task.confirmTitle}
                            </h3>
                            <p className="text-sm text-slate-500 text-center mb-2">
                                {files.length} {t.task.confirmFiles}
                            </p>
                            <div
                                className="rounded-2xl p-3 mb-6"
                                style={{
                                    background: "rgba(239,68,68,0.07)",
                                    border: "1px solid rgba(239,68,68,0.15)",
                                }}
                            >
                                <p className="text-xs text-red-600 font-semibold">
                                    {t.task.confirmWarningTitle}
                                </p>
                                <p className="text-xs text-red-500 mt-0.5">
                                    {t.task.confirmWarningDesc}
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="btn-glass flex-1 py-3 rounded-xl text-sm font-semibold text-slate-600"
                                >
                                    {t.task.cancel}
                                </button>
                                <motion.button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                    className="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <Loader2
                                            size={16}
                                            className="animate-spin"
                                        />
                                    ) : (
                                        t.task.send
                                    )}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

