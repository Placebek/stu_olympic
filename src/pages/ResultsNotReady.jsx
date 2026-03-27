import { motion } from "framer-motion";
import { useState } from "react";
import { useLang } from "../context/LangContext";
import { Trophy, RefreshCw, Clock } from "lucide-react";

export default function ResultsNotReady() {
    const { t } = useLang();
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = () => {
        setRefreshing(true);
        setTimeout(() => {
            setRefreshing(false);
            // При необходимости можно добавить реальный рефреш данных
            console.log("🔄 Пользователь нажал «Обновить»");
        }, 1200);
    };

    return (
        <div className="min-h-screen pt-28 pb-16 px-4 relative z-10">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div
                        className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-4"
                        style={{
                            background: "linear-gradient(135deg,#fbbf24,#f59e0b)",
                            boxShadow: "0 8px 32px rgba(251,191,36,0.35)",
                        }}
                    >
                        <Trophy size={24} color="white" />
                    </div>

                    <h1
                        className="text-4xl font-bold text-slate-900 mb-2"
                        style={{ fontFamily: '"Clash Display", sans-serif' }}
                    >
                        {t.results.title}
                    </h1>

                    <p className="text-slate-500 text-sm">
                        {t.results.notReadyTitle}
                    </p>

                    {/* Формула-подсказка */}
                    <div
                        className="inline-flex items-center gap-3 mt-6 px-4 py-2 rounded-xl"
                        style={{
                            background: "rgba(99,102,241,0.07)",
                            border: "1px solid rgba(99,102,241,0.15)",
                        }}
                    >
                        <span className="text-xs text-indigo-600 font-medium flex items-center gap-1">
                            <Clock size={11} />
                            скоро
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                            <Trophy size={11} />
                            результаты
                        </span>
                    </div>

                    {/* Кнопка обновления */}
                    <div className="mt-8">
                        <motion.button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
                            style={{
                                background: "rgba(255,255,255,0.6)",
                                border: "1px solid rgba(255,255,255,0.8)",
                                boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
                            }}
                        >
                            <RefreshCw
                                size={16}
                                className={refreshing ? "animate-spin" : ""}
                                style={refreshing ? { animationDuration: "1s" } : {}}
                            />
                            {t.results.refresh}
                        </motion.button>
                    </div>
                </motion.div>

                {/* Главный блок ожидания */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="glass-card rounded-3xl p-10 text-center"
                >
                    {/* Большая иконка */}
                    <div className="mx-auto mb-6 flex justify-center">
                        <div
                            className="w-24 h-24 rounded-3xl flex items-center justify-center"
                            style={{
                                background: "linear-gradient(135deg, #e0f2fe, #bae6fd)",
                                boxShadow: "0 0 50px -10px rgb(14 165 233)",
                            }}
                        >
                            <Clock size={48} className="text-sky-500" />
                        </div>
                    </div>

                    <h2
                        className="text-3xl font-bold text-slate-800 mb-3"
                        style={{ fontFamily: '"Clash Display", sans-serif' }}
                    >
                        {t.results.notReadyTitle}
                    </h2>

                    <p className="text-slate-500 max-w-xs mx-auto text-lg leading-relaxed whitespace-pre-line">
                        {t.results.notReadySubtitle}
                    </p>

                    {/* Статус */}
                    <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <span>{t.results.publishingNote}</span>
                    </div>
                </motion.div>

                {/* Нижняя подсказка */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center text-xs text-slate-400 mt-8"
                >
                    {t.results.autoUpdateHint}
                </motion.p>
            </div>
        </div>
    );
}