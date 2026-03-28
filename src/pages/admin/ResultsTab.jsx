// src/pages/admin/ResultsTab.jsx
// Использует GET /admin/quiz/results/{team_id}/detailed для подробного просмотра
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wifi, Database, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { adminGetAllResults, adminGetTeamResultDetailed } from "../../utils/api";
import { Spinner } from "./AdminShared";

export default function ResultsTab({ t }) {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(null);
    const [detail, setDetail] = useState({});
    const [loadingDetail, setLoadingDetail] = useState(null);

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
                        total_questions: 50,
                        answered_count: 50,
                        correct_count: 40,
                        network_correct: 20,
                        database_correct: 20,
                        score_percent: 80,
                    },
                    {
                        team_id: 2,
                        team_name: "Mockers",
                        variant: 2,
                        is_completed: false,
                        total_questions: 50,
                        answered_count: 10,
                        correct_count: 6,
                        network_correct: 3,
                        database_correct: 3,
                        score_percent: 12,
                    },
                ]),
            )
            .finally(() => setLoading(false));
    }, []);

    const loadDetail = async (teamId) => {
        // Toggle off
        if (expanded === teamId) {
            setExpanded(null);
            return;
        }
        // Use cached
        if (detail[teamId]) {
            setExpanded(teamId);
            return;
        }
        setLoadingDetail(teamId);
        try {
            // Use the new /detailed endpoint that returns full question texts + options
            const r = await adminGetTeamResultDetailed(teamId);
            setDetail((prev) => ({ ...prev, [teamId]: r.data }));
            setExpanded(teamId);
        } catch {
            toast.error("Қате / Ошибка загрузки деталей");
        } finally {
            setLoadingDetail(null);
        }
    };

    if (loading) return <Spinner />;

    const headers = [
        t.admin.team,
        t.admin.variant,
        t.admin.totalQ,
        t.admin.answered,
        t.admin.correctCount,
        t.admin.networkCorrect,
        t.admin.dbCorrect,
        t.admin.scorePercent,
        t.admin.completed,
    ];

    return (
        <div>
            {/* Summary table */}
            <div className="glass-card rounded-2xl overflow-hidden mb-4">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/40">
                                {headers.map((h) => (
                                    <th
                                        key={h}
                                        className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap"
                                    >
                                        {h}
                                    </th>
                                ))}
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r, i) => (
                                <tr
                                    key={r.team_id}
                                    className={`border-b border-white/20 hover:bg-white/20 transition-colors ${i % 2 === 0 ? "" : "bg-white/5"}`}
                                >
                                    <td className="px-4 py-3 font-semibold text-slate-800">
                                        {r.first_name && r.last_name}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">#{r.variant}</td>
                                    <td className="px-4 py-3 text-slate-600">{r.total_questions}</td>
                                    <td className="px-4 py-3 text-slate-600">{r.answered_count}</td>
                                    <td className="px-4 py-3">
                                        <span
                                            className="font-semibold"
                                            style={{
                                                color:
                                                    r.correct_count / r.total_questions >= 0.7
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
                                                            r.score_percent >= 70
                                                                ? "#10b981"
                                                                : r.score_percent >= 40
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
                                            {r.is_completed ? t.admin.completed : t.admin.notCompleted}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => loadDetail(r.team_id)}
                                            disabled={loadingDetail === r.team_id}
                                            className="text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors whitespace-nowrap disabled:opacity-50"
                                        >
                                            {loadingDetail === r.team_id
                                                ? "..."
                                                : expanded === r.team_id
                                                  ? t.admin.hide ?? "Скрыть"
                                                  : t.admin.viewDetail}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detailed expand — uses /detailed endpoint data */}
            <AnimatePresence>
                {expanded && detail[expanded] && (
                    <motion.div
                        key={expanded}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: "hidden" }}
                    >
                        <div className="glass-card rounded-2xl p-5">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-1">
                                <p className="font-semibold text-slate-700">
                                    {detail[expanded].first_name} {detail[expanded].last_name} —{" "}
                                    {detail[expanded].team_name ?? ""} #{detail[expanded].variant}
                                </p>
                                <button
                                    onClick={() => setExpanded(null)}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            {/* Meta row */}
                            <div className="flex gap-4 text-xs text-slate-500 mb-4">
                                <span>
                                    ✓ {detail[expanded].correct_count} / {detail[expanded].total_questions}
                                </span>
                                <span>
                                    <Wifi size={11} className="inline mr-0.5" />
                                    {detail[expanded].network_correct}
                                </span>
                                <span>
                                    <Database size={11} className="inline mr-0.5" />
                                    {detail[expanded].database_correct}
                                </span>
                                <span className="font-semibold text-indigo-600">
                                    {Math.round(detail[expanded].score_percent)}%
                                </span>
                                {detail[expanded].is_completed ? (
                                    <span className="text-emerald-600">{t.admin.completed}</span>
                                ) : (
                                    <span className="text-amber-500">{t.admin.notCompleted}</span>
                                )}
                            </div>

                            {/* Answer list */}
                            <div className="space-y-2">
                                {detail[expanded].answers?.map((ans, i) => {
                                    const notAnswered = ans.chosen_index === null;
                                    const isCorrect = ans.is_correct;

                                    return (
                                        <div
                                            key={ans.question_id}
                                            className="p-3 rounded-xl"
                                            style={
                                                notAnswered
                                                    ? {
                                                          background: "rgba(100,116,139,0.06)",
                                                          border: "1px solid rgba(100,116,139,0.15)",
                                                      }
                                                    : isCorrect
                                                      ? {
                                                            background: "rgba(16,185,129,0.07)",
                                                            border: "1px solid rgba(16,185,129,0.2)",
                                                        }
                                                      : {
                                                            background: "rgba(239,68,68,0.06)",
                                                            border: "1px solid rgba(239,68,68,0.15)",
                                                        }
                                            }
                                        >
                                            <div className="flex items-start gap-2">
                                                <span
                                                    className={`text-xs font-bold flex-shrink-0 mt-0.5 ${
                                                        notAnswered
                                                            ? "text-slate-400"
                                                            : isCorrect
                                                              ? "text-emerald-500"
                                                              : "text-red-400"
                                                    }`}
                                                >
                                                    {i + 1}.
                                                </span>
                                                <div className="flex-1">
                                                    {/* Question text — prefer RU */}
                                                    <p className="text-xs text-slate-700 font-medium mb-1">
                                                        {ans.question_text_ru || ans.question_text_kz || ans.question_text}
                                                    </p>

                                                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                                        {/* Category badge */}
                                                        <span
                                                            className="px-1.5 py-0.5 rounded"
                                                            style={
                                                                ans.category === "network"
                                                                    ? { background: "rgba(99,102,241,0.1)", color: "#6366f1" }
                                                                    : { background: "rgba(16,185,129,0.1)", color: "#10b981" }
                                                            }
                                                        >
                                                            {ans.category === "network"
                                                                ? t.admin.catNetwork
                                                                : t.admin.catDatabase}
                                                        </span>

                                                        {/* Status */}
                                                        {notAnswered ? (
                                                            <span className="text-slate-400 italic">
                                                                {ans.status ?? "— Не отвечено"}
                                                            </span>
                                                        ) : (
                                                            <>
                                                                <span>
                                                                    → {ans.chosen_text_ru ?? (ans.options_ru?.[ans.chosen_index])}
                                                                </span>
                                                                {!isCorrect && (
                                                                    <span className="text-emerald-600">
                                                                        ✓ {ans.correct_text_ru ?? (ans.options_ru?.[ans.correct_index])}
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}

                                                        {/* Timestamp */}
                                                        {ans.answered_at && (
                                                            <span className="text-slate-300 flex items-center gap-0.5">
                                                                <Clock size={10} />
                                                                {new Date(ans.answered_at).toLocaleTimeString("ru-RU")}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
