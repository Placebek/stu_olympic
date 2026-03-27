import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { validateQr, registerTeam, loginTeam } from "../utils/api";
import AuroraBackground from "../components/AuroraBackground";
import LangSwitcher from "../components/LangSwitcher";
import toast from "react-hot-toast";
import { Zap, User, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
    const { code } = useParams();
    const navigate = useNavigate();
    const { login } = useAuth();
    const { t } = useLang();

    const [step, setStep] = useState("validating");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!code) { setStep("error"); return; }
        validateCode();
    }, [code]);

    const validateCode = async () => {
        try {
            const res = await validateQr(code);
            if (res.data.team_exists === false) {
                setStep("name");
            } else {
                setStep("exists");
            }
        } catch {
            setStep("error");
        }
    };

    const fullName = () => `${firstName.trim()} ${lastName.trim()}`;

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!firstName.trim() || !lastName.trim()) {
            toast.error(t.register.nameMin);
            return;
        }
        setLoading(true);
        try {
            const res = await registerTeam(code, firstName, lastName);
            login(res.data.token, { name: fullName(), variant: res.data.variant });
            toast.success(t.register.success);
            navigate("/");
        } catch (err) {
            toast.error(err.response?.data?.message || "Қате");
        } finally {
            setLoading(false);
        }
    };

    const handleLoginExisting = async (e) => {
        e.preventDefault();
        if (!firstName.trim() || !lastName.trim()) {
            toast.error(t.register.nameMin);
            return;
        }
        setLoading(true);
        try {
            const res = await loginTeam(code, firstName, lastName);
            login(res.data.token, { name: fullName(), variant: res.data.variant });
            toast.success(t.register.loginSuccess);
            navigate("/");
        } catch (err) {
            toast.error(err.response?.data?.message || "Қате");
        } finally {
            setLoading(false);
        }
    };

    const nameForm = (onSubmit) => (
        <form onSubmit={onSubmit} className="space-y-3">
            <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    {t.register.firstNameLabel}
                </label>
                <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        className="input-glass w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
                        placeholder={t.register.firstNamePlaceholder}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        maxLength={30}
                        autoFocus
                    />
                </div>
            </div>
            <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    {t.register.lastNameLabel}
                </label>
                <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        className="input-glass w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
                        placeholder={t.register.lastNamePlaceholder}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        maxLength={30}
                    />
                </div>
            </div>
            <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="btn-primary w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mt-1"
            >
                {loading ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                    <>{t.register.registerBtn} <ArrowRight size={16} /></>
                )}
            </motion.button>
        </form>
    );

    return (
        <div className="min-h-screen flex items-center justify-center relative p-4">
            <AuroraBackground />

            <div className="fixed top-4 right-4 z-50">
                <LangSwitcher />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                className="relative z-10 w-full max-w-md"
            >
                <div className="text-center mb-8">
                    {/* CSS float animation — no JS overhead */}
                    <div
                        className="icon-float inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4"
                        style={{
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            boxShadow: "0 8px 32px rgba(99,102,241,0.4)",
                        }}
                    >
                        <Zap size={28} color="white" fill="white" />
                    </div>
                    <h1 className="text-3xl font-bold" style={{ fontFamily: '"Clash Display", sans-serif', color: "#1e1b4b" }}>
                        Olymp<span style={{ color: "#6366f1" }}>IQ</span>
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">{t.register.subtitle}</p>
                </div>

                <div className="glass-strong rounded-3xl p-8">
                    <AnimatePresence mode="wait">
                        {step === "validating" && (
                            <motion.div key="validating" className="text-center py-8">
                                <div
                                    className="w-12 h-12 rounded-full border-2 border-indigo-200 border-t-indigo-500 mx-auto mb-4 animate-spin"
                                    style={{ animationDuration: '1.5s' }}
                                />
                                <p className="text-slate-500 text-sm">{t.register.validating}</p>
                            </motion.div>
                        )}

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
                                {nameForm(handleRegister)}
                            </motion.div>
                        )}

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
                                            {t.register.alreadyRegistered}
                                        </h2>
                                        <p className="text-xs text-slate-500">{t.register.enterName}</p>
                                    </div>
                                </div>
                                {nameForm(handleLoginExisting)}
                            </motion.div>
                        )}

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
