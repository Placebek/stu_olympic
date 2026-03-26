import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { validateQr, registerTeam, loginTeam } from "../utils/api";
import AuroraBackground from "../components/AuroraBackground";
import LangSwitcher from "../components/LangSwitcher";
import toast from "react-hot-toast";
import {
    Zap,
    Users,
    ArrowRight,
    AlertCircle,
    CheckCircle2,
} from "lucide-react";

export default function RegisterPage() {
    const { code } = useParams();
    const navigate = useNavigate();
    const { login } = useAuth();
    const { t } = useLang();

    const [step, setStep] = useState("validating");
    const [teamName, setTeamName] = useState("");
    const [existingTeamName, setExistingTeamName] = useState(null); // имя уже зарегистрированной команды
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!code) {
            setStep("error");
            return;
        }
        validateCode();
    }, [code]);

    const validateCode = async () => {
        try {
            const res = await validateQr(code);

            if (res.data.team_exists === false) {
                // Код свободен — регистрируем новую команду
                setStep("name");
            } else {
                // Команда уже существует
                setExistingTeamName(res.data.team_name);
                setStep("exists");
            }
        } catch (err) {
            console.error(err);
            setStep("error");
        }
    };

    // Регистрация новой команды
    const handleRegister = async (e) => {
        e.preventDefault();
        if (!teamName.trim() || teamName.trim().length < 2) {
            toast.error(t.register?.teamNameMin || "Название команды должно быть не менее 2 символов");
            return;
        }

        setLoading(true);
        try {
            const res = await registerTeam(code, teamName.trim());

            login(res.data.token, {
                name: teamName.trim(),
                variant: res.data.variant,
            });

            toast.success(t.register?.success || "Команда успешно зарегистрирована!");
            navigate("/");
        } catch (err) {
            toast.error(err.response?.data?.message || "Қате");
        } finally {
            setLoading(false);
        }
    };

    // Вход в уже существующую команду
    const handleLoginExisting = async (e) => {
        e.preventDefault();
        if (!teamName.trim()) {
            toast.error(t.register?.enterTeamName || "Введите название команды");
            return;
        }

        setLoading(true);
        try {
            const res = await loginTeam(code, teamName.trim());

            login(res.data.token, {
                name: teamName.trim(),
                variant: res.data.variant,
            });

            toast.success(t.register?.loginSuccess || "Вход выполнен успешно!");
            navigate("/");
        } catch (err) {
            toast.error(err.response?.data?.message || "Неверное название команды");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative p-4">
            <AuroraBackground />

            {/* Lang switcher */}
            <div className="fixed top-4 right-4 z-50">
                <LangSwitcher />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                className="relative z-10 w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4"
                        style={{
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            boxShadow: "0 8px 32px rgba(99,102,241,0.4)",
                        }}
                    >
                        <Zap size={28} color="white" fill="white" />
                    </motion.div>
                    <h1 className="text-3xl font-bold" style={{ fontFamily: '"Clash Display", sans-serif', color: "#1e1b4b" }}>
                        Olymp<span style={{ color: "#6366f1" }}>IQ</span>
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        {t.register.subtitle}
                    </p>
                </div>

                <div className="glass-strong rounded-3xl p-8">
                    <AnimatePresence mode="wait">
                        {/* Валидация QR */}
                        {step === "validating" && (
                            <motion.div key="validating" className="text-center py-8">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                    className="w-12 h-12 rounded-full border-2 border-indigo-200 border-t-indigo-500 mx-auto mb-4"
                                />
                                <p className="text-slate-500 text-sm">{t.register.validating}</p>
                            </motion.div>
                        )}

                        {/* Регистрация новой команды */}
                        {step === "name" && (
                            <motion.div
                                key="name"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                                        <CheckCircle2 size={20} className="text-green-500" />
                                    </div>
                                    <div>
                                        <h2 className="font-semibold text-slate-800" style={{ fontFamily: '"Clash Display", sans-serif' }}>
                                            {t.register.validTitle}
                                        </h2>
                                        <p className="text-xs text-slate-500">{t.register.validSub}</p>
                                    </div>
                                </div>

                                <form onSubmit={handleRegister} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-2">
                                            {t.register.teamLabel}
                                        </label>
                                        <div className="relative">
                                            <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                className="input-glass w-full pl-9 pr-4 py-3 rounded-xl text-sm"
                                                placeholder={t.register.teamPlaceholder}
                                                value={teamName}
                                                onChange={(e) => setTeamName(e.target.value)}
                                                maxLength={40}
                                                autoFocus
                                            />
                                        </div>
                                        <div className="flex justify-end mt-1">
                                            <span className="text-xs text-slate-400">{teamName.length}/40</span>
                                        </div>
                                    </div>

                                    <motion.button
                                        type="submit"
                                        disabled={loading}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="btn-primary w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <motion.div animate={{ rotate: 360 }} className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full" />
                                        ) : (
                                            <>
                                                {t.register.registerBtn} <ArrowRight size={16} />
                                            </>
                                        )}
                                    </motion.button>
                                </form>
                            </motion.div>
                        )}

                        {/* Команда уже существует — вход по названию */}
                        {step === "exists" && (
                            <motion.div
                                key="exists"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                                        <AlertCircle size={20} className="text-amber-500" />
                                    </div>
                                    <div>
                                        <h2 className="font-semibold text-red-800" style={{ fontFamily: '"Clash Display", sans-serif' }}>
                                            {t.register.teamAlreadyRegistered || "Команда уже зарегистрирована"}
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            {t.register.enterTeamName || "Введите название команды, чтобы присоединиться"}
                                        </p>
                                    </div>
                                </div>

                                <form onSubmit={handleLoginExisting} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-2">
                                            {t.register.teamLabel}
                                        </label>
                                        <div className="relative">
                                            <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                className="input-glass w-full pl-9 pr-4 py-3 rounded-xl text-sm"
                                                placeholder={t.register.teamPlaceholder}
                                                value={teamName}
                                                onChange={(e) => setTeamName(e.target.value)}
                                                maxLength={40}
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    <motion.button
                                        type="submit"
                                        disabled={loading}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="btn-primary w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <motion.div animate={{ rotate: 360 }} className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full" />
                                        ) : (
                                            <>
                                                {t.register.loginBtn || "Войти в команду"} <ArrowRight size={16} />
                                            </>
                                        )}
                                    </motion.button>
                                </form>
                            </motion.div>
                        )}

                        {/* Ошибка */}
                        {step === "error" && (
                            <motion.div key="error" className="text-center py-8">
                                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
                                    <AlertCircle size={28} className="text-red-500" />
                                </div>
                                <h2 className="font-semibold text-slate-800 mb-2" style={{ fontFamily: '"Clash Display", sans-serif' }}>
                                    {t.register.errorTitle}
                                </h2>
                                <p className="text-sm text-slate-500">{t.register.errorDesc}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <p className="text-center text-xs text-slate-400 mt-4">
                    {t.register.copyright} © {new Date().getFullYear()}
                </p>
            </motion.div>
        </div>
    );
}