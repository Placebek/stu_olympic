// src/pages/admin/UploadsTab.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    RefreshCw, Download, CheckCircle2, Circle,
    Loader2, ChevronDown, FileText, ThumbsUp, ThumbsDown, Minus,
} from "lucide-react";
import toast from "react-hot-toast";
import { adminGetUploads, adminGetUnchecked, adminCheckUpload, downloadTeamFile } from "../../utils/api";
import { Spinner } from "./AdminShared";

// ── helpers ────────────────────────────────────────────────────────
function fmtDate(iso) {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleString("ru-RU", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        });
    } catch { return "—"; }
}

/** Иконка + цвет статуса одного файла */
function FileStatusBadge({ file }) {
    if (!file.is_checked)
        return <Circle size={15} className="text-amber-400 flex-shrink-0" />;
    if (file.is_correct === true)
        return <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />;
    if (file.is_correct === false)
        return <CheckCircle2 size={15} className="text-red-400 flex-shrink-0" />;
    // checked but correctness not set
    return <CheckCircle2 size={15} className="text-indigo-400 flex-shrink-0" />;
}

// ── Main component ─────────────────────────────────────────────────
export default function UploadsTab({ t }) {
    const [uploads, setUploads]               = useState([]);
    const [loading, setLoading]               = useState(true);
    const [filter, setFilter]                 = useState("all");   // all | unchecked
    const [variantFilter, setVariantFilter]   = useState("all");   // all | 1 | 2 | …
    const [toggling, setToggling]             = useState(null);    // file id being patched
    const [openId, setOpenId]                 = useState(null);    // accordion

    // ── load ──────────────────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const fn = filter === "unchecked" ? adminGetUnchecked : adminGetUploads;
            const r  = await fn();
            setUploads(Array.isArray(r?.data) ? r.data : []);
        } catch {
            // fallback mock
            setUploads([
                { id: 101, first_name: "Гаухар",  last_name: "А",           original_name: "task1.py",    filename: "aaa.py",    variant: 1, uploaded_at: "2026-03-27T11:23:17", is_checked: false, is_correct: null },
                { id: 102, first_name: "Гаухар",  last_name: "А",           original_name: "task2.py",    filename: "bbb.py",    variant: 1, uploaded_at: "2026-03-27T11:25:10", is_checked: true,  is_correct: true },
                { id: 201, first_name: "Данияр",  last_name: "Абдикадыров", original_name: "report.docx", filename: "ccc.docx",  variant: 2, uploaded_at: "2026-03-20T13:00:00", is_checked: false, is_correct: null },
                { id: 301, first_name: "Жандарбек", last_name: "Сейтқали",  original_name: "task3.cpp",   filename: "ddd.cpp",   variant: 3, uploaded_at: "2026-03-27T09:00:00", is_checked: true,  is_correct: false },
            ]);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => { load(); }, [load]);

    // ── available variant values ──────────────────────────────────
    const variants = useMemo(() => {
        const set = new Set(uploads.map((u) => u.variant).filter(Boolean));
        return Array.from(set).sort((a, b) => a - b);
    }, [uploads]);

    // ── group by participant (first+last name) ────────────────────
    const groupedUploads = useMemo(() => {
        // apply variant filter first
        const filtered = variantFilter === "all"
            ? uploads
            : uploads.filter((u) => String(u.variant) === String(variantFilter));

        const map = new Map();
        filtered.forEach((file) => {
            const key = `${file.first_name || ""}-${file.last_name || ""}` || `id-${file.id}`;
            if (!map.has(key)) {
                map.set(key, {
                    id:         key,
                    first_name: file.first_name,
                    last_name:  file.last_name,
                    full_name:  `${file.first_name || ""} ${file.last_name || ""}`.trim(),
                    variant:    file.variant,
                    files:      [],
                });
            }
            map.get(key).files.push(file);
        });

        return Array.from(map.values());
    }, [uploads, variantFilter]);

    // ── participant summary helpers ───────────────────────────────
    const participantStatus = (files) => {
        const unchecked = files.filter((f) => !f.is_checked).length;
        const wrong     = files.filter((f) => f.is_checked && f.is_correct === false).length;
        const correct   = files.filter((f) => f.is_checked && f.is_correct === true).length;
        if (unchecked > 0)    return { color: "bg-amber-100",   icon: <Circle size={16} className="text-amber-400" />, label: `${unchecked} не проверено` };
        if (wrong > 0)        return { color: "bg-red-100",     icon: <CheckCircle2 size={16} className="text-red-400" />, label: `${wrong} неверно` };
        return                       { color: "bg-emerald-100", icon: <CheckCircle2 size={16} className="text-emerald-500" />, label: "все проверены" };
    };

    // ── download ──────────────────────────────────────────────────
    const handleDownload = async (file) => {
        try {
            const r   = await downloadTeamFile(file.id);
            const url = window.URL.createObjectURL(new Blob([r.data]));
            const a   = document.createElement("a");
            a.href = url;
            a.setAttribute("download", file.original_name || file.filename || "file");
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch { toast.error("Жүктеу қатесі / Ошибка загрузки файла"); }
    };

    // ── check toggle — THREE actions ─────────────────────────────
    // action: "correct" | "wrong" | "uncheck"
    const handleCheck = async (file, action) => {
        setToggling(`${file.id}-${action}`);
        try {
            let payload;
            if (action === "uncheck") {
                payload = { is_checked: false, is_correct: null };
            } else if (action === "correct") {
                payload = { is_checked: true, is_correct: true };
            } else {
                payload = { is_checked: true, is_correct: false };
            }

            const r = await adminCheckUpload(file.id, payload.is_checked, payload.is_correct);
            setUploads((prev) => prev.map((f) => f.id === file.id ? (r?.data || { ...f, ...payload }) : f));

            toast.success(
                action === "uncheck" ? "Белгі алынды"
                : action === "correct" ? "✓ Дұрыс / Верно"
                : "✗ Дұрыс емес / Неверно"
            );
        } catch { toast.error("Қате"); }
        finally  { setToggling(null); }
    };

    // ── render ────────────────────────────────────────────────────
    return (
        <div>
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
                {/* Checked filter */}
                {["all", "unchecked"].map((f) => (
                    <button key={f} onClick={() => setFilter(f)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                        style={filter === f
                            ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" }
                            : { background: "rgba(255,255,255,0.5)", color: "#64748b", border: "1px solid rgba(255,255,255,0.7)" }}>
                        {f === "all" ? t.admin.filterAll : t.admin.filterUnchecked}
                    </button>
                ))}

                {/* Variant filter */}
                {variants.length > 0 && (
                    <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-200">
                        <span className="text-xs text-slate-400 font-medium mr-1">Вариант:</span>
                        <button onClick={() => setVariantFilter("all")}
                            className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                            style={variantFilter === "all"
                                ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" }
                                : { background: "rgba(255,255,255,0.5)", color: "#64748b", border: "1px solid rgba(255,255,255,0.7)" }}>
                            Все
                        </button>
                        {variants.map((v) => (
                            <button key={v} onClick={() => setVariantFilter(String(v))}
                                className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                                style={String(variantFilter) === String(v)
                                    ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" }
                                    : { background: "rgba(255,255,255,0.5)", color: "#64748b", border: "1px solid rgba(255,255,255,0.7)" }}>
                                #{v}
                            </button>
                        ))}
                    </div>
                )}

                <button onClick={load} className="ml-auto p-2 rounded-xl hover:bg-white/50 text-slate-500">
                    <RefreshCw size={15} />
                </button>
            </div>

            {/* Summary line */}
            {!loading && (
                <p className="text-xs text-slate-400 mb-3">
                    {groupedUploads.length} участник · {uploads.filter((u) => variantFilter === "all" || String(u.variant) === String(variantFilter)).length} файл
                </p>
            )}

            {loading ? <Spinner /> : (
                <div className="space-y-3">
                    {groupedUploads.length === 0 && (
                        <div className="text-center py-12 text-slate-400">{t.admin.noFiles}</div>
                    )}

                    {groupedUploads.map((participant) => {
                        const isOpen = openId === participant.id;
                        const status = participantStatus(participant.files);

                        return (
                            <div key={participant.id} className="glass-card rounded-2xl overflow-hidden">
                                {/* Accordion header */}
                                <div onClick={() => setOpenId(isOpen ? null : participant.id)}
                                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/30 transition-colors select-none">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${status.color}`}>
                                        {status.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-slate-800">{participant.full_name}</p>
                                            {participant.variant && (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                                                    style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>
                                                    #{participant.variant}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            {participant.files.length} файл · {status.label}
                                        </p>
                                    </div>
                                    <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                        <ChevronDown size={18} className="text-slate-400" />
                                    </motion.div>
                                </div>

                                {/* Accordion body */}
                                <AnimatePresence>
                                    {isOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden border-t border-white/40">
                                            <div className="p-4 space-y-2">
                                                {participant.files.map((file) => (
                                                    <FileRow
                                                        key={file.id}
                                                        file={file}
                                                        toggling={toggling}
                                                        onDownload={handleDownload}
                                                        onCheck={handleCheck}
                                                        fmtDate={fmtDate}
                                                    />
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── File row ───────────────────────────────────────────────────────
function FileRow({ file, toggling, onDownload, onCheck, fmtDate }) {
    const isLoading = (action) => toggling === `${file.id}-${action}`;

    return (
        <div className="rounded-xl p-3 flex items-center gap-3"
            style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.8)" }}>

            {/* Status icon */}
            <FileStatusBadge file={file} />

            {/* Name + date */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">
                    {file.original_name || file.filename}
                </p>
                <p className="text-[10px] text-slate-400">{fmtDate(file.uploaded_at)}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
                {/* Download */}
                <button onClick={() => onDownload(file)}
                    className="p-2 rounded-xl hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                    title="Скачать">
                    <Download size={14} />
                </button>

                {/* ── Check buttons ── */}
                {!file.is_checked ? (
                    // Not checked yet: show Correct / Wrong
                    <>
                        <motion.button
                            onClick={() => onCheck(file, "correct")}
                            disabled={!!toggling}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
                            style={{ background: "rgba(16,185,129,0.1)", color: "#059669", border: "1px solid rgba(16,185,129,0.2)" }}
                            title="Верно">
                            {isLoading("correct")
                                ? <Loader2 size={12} className="animate-spin" />
                                : <><ThumbsUp size={12} /> Верно</>}
                        </motion.button>
                        <motion.button
                            onClick={() => onCheck(file, "wrong")}
                            disabled={!!toggling}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
                            style={{ background: "rgba(239,68,68,0.08)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.15)" }}
                            title="Неверно">
                            {isLoading("wrong")
                                ? <Loader2 size={12} className="animate-spin" />
                                : <><ThumbsDown size={12} /> Неверно</>}
                        </motion.button>
                    </>
                ) : (
                    // Already checked: show current verdict + Uncheck
                    <>
                        <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold"
                            style={file.is_correct === true
                                ? { background: "rgba(16,185,129,0.1)", color: "#059669" }
                                : file.is_correct === false
                                  ? { background: "rgba(239,68,68,0.08)", color: "#dc2626" }
                                  : { background: "rgba(99,102,241,0.08)", color: "#6366f1" }}>
                            {file.is_correct === true  && <><ThumbsUp size={11} /> Верно</>}
                            {file.is_correct === false && <><ThumbsDown size={11} /> Неверно</>}
                            {file.is_correct === null  && <><Minus size={11} /> Проверено</>}
                        </span>
                        <motion.button
                            onClick={() => onCheck(file, "uncheck")}
                            disabled={!!toggling}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-50 transition-colors text-xs"
                            title="Снять отметку">
                            {isLoading("uncheck")
                                ? <Loader2 size={12} className="animate-spin" />
                                : <span className="text-[10px] font-medium">✕</span>}
                        </motion.button>
                    </>
                )}
            </div>
        </div>
    );
}
