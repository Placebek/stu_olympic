// src/pages/AdminPage.jsx
// Главный файл — только таб-бар и роутинг между вкладками
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, FileText, HelpCircle, BarChart2 } from "lucide-react";
import { useLang } from "../context/LangContext";

import TeamsTab     from "./admin/TeamsTab";
import UploadsTab   from "./admin/UploadsTab";
import QuestionsTab from "./admin/QuestionsTab";
import ResultsTab   from "./admin/ResultsTab";

const TABS = ["tabTeams", "tabUploads", "tabQuestions", "tabResults"];

const TAB_ICONS = {
    tabTeams:     <Users size={15} />,
    tabUploads:   <FileText size={15} />,
    tabQuestions: <HelpCircle size={15} />,
    tabResults:   <BarChart2 size={15} />,
};

export default function AdminPage() {
    const { t } = useLang();
    const [activeTab, setActiveTab] = useState("tabTeams");

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
                                          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                          color: "#fff",
                                          boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
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
                        {activeTab === "tabTeams"     && <TeamsTab     t={t} />}
                        {activeTab === "tabUploads"   && <UploadsTab   t={t} />}
                        {activeTab === "tabQuestions" && <QuestionsTab t={t} />}
                        {activeTab === "tabResults"   && <ResultsTab   t={t} />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
