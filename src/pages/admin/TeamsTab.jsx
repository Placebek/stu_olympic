// src/pages/admin/TeamsTab.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { adminGetTeams } from "../../utils/api";
import { Spinner } from "./AdminShared";

export default function TeamsTab({ t }) {
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
                                {team.first_name || "Имя"} {team.last_name || "Команды"}
                            </p>
                            <p className="text-xs text-slate-500">
                                ID: {team.id} · QR: {team.qr_code_id} ·{" "}
                                {new Date(team.created_at).toLocaleString("ru-RU")}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
