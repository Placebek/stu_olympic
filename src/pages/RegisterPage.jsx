// src/pages/RegisterPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { validateQr, registerTeam, loginTeam } from "../utils/api";
import AuroraBackground from "../components/AuroraBackground";
import LangSwitcher from "../components/LangSwitcher";
import toast from "react-hot-toast";
import { Zap, User, ArrowRight, AlertCircle, CheckCircle2, Hash } from "lucide-react";

const stepVariants = {
    enter:  { opacity: 0, x: 28 },
    center: { opacity: 1, x: 0  },
    exit:   { opacity: 0, x: -28 },
};

// ── NameForm вынесен ЗА пределы RegisterPage ─────────────────────
// Если объявить его ВНУТРИ родителя, React пересоздаёт его при каждом
// setState родителя → инпут теряет фокус при каждом нажатии клавиши.
function NameForm({ t, code, firstName, lastName, onFirstName, onLastName, onSubmit, onChangeCode, loading }) {
    return (
        <form onSubmit={onSubmit} className="space-y-3">
            <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    {t.register?.firstNameLabel || "Аты"}
                </label>
                <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        className="input-glass w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
                        placeholder={t.register?.firstNamePlaceholder || "Аты"}
                        value={firstName}
                        onChange={(e) => onFirstName(e.target.value)}
                        maxLength={30}
                        autoComplete="given-name"
                    />
                </div>
            </div>
            <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    {t.register?.lastNameLabel || "Тегі"}
                </label>
                <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        className="input-glass w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
                        placeholder={t.register?.lastNamePlaceholder || "Тегі"}
                        value={lastName}
                        onChange={(e) => onLastName(e.target.value)}
                        maxLength={30}
                        autoComplete="family-name"
                    />
                </div>
            </div>

            {/* Code reminder */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-500"
                style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)" }}>
                <Hash size={11} className="text-indigo-400" />
                <span>{t.register?.codeLabel || "Код"}:</span>
                <span className="font-mono font-semibold text-indigo-600 tracking-wider">
                    {code.trim().toUpperCase()}
                </span>
                <button type="button" onClick={onChangeCode}
                    className="ml-auto text-slate-400 hover:text-indigo-500 transition-colors underline text-[10px]">
                    {t.register?.changeCode || "Өзгерту"}
                </button>
            </div>

            <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="btn-primary w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mt-1"
            >
                {loading
                    ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <>{t.register?.registerBtn || "Тіркелу"} <ArrowRight size={16} /></>}
            </motion.button>
        </form>
    );
}

// ── Main page ─────────────────────────────────────────────────────
export default function RegisterPage() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const { t } = useLang();

    const [step, setStep]           = useState("code");
    const [code, setCode]           = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName]   = useState("");
    const [loading, setLoading]     = useState(false);

    const fullName = () => `${firstName.trim()} ${lastName.trim()}`;

    const handleValidateCode = async (e) => {
        e.preventDefault();
        const trimmed = code.trim();
        if (!trimmed) { toast.error(t.register?.codeRequired || "Кодты енгізіңіз"); return; }
        setLoading(true);
        try {
            const res = await validateQr(trimmed);
            setStep(res.data.team_exists === false ? "name" : "exists");
        } catch {
            setStep("error");
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!firstName.trim() || !lastName.trim()) { toast.error(t.register?.nameMin || "Аты-жөнді толтырыңыз"); return; }
        setLoading(true);
        try {
            const res = await registerTeam(code.trim(), firstName, lastName);
            login(res.data.token, { name: fullName(), variant: res.data.variant });
            toast.success(t.register?.success || "Тіркелді! 🎉");
            navigate("/");
        } catch (err) {
            toast.error(err.response?.data?.message || err.response?.data?.detail || "Қате");
        } finally {
            setLoading(false);
        }
    };

    const handleLoginExisting = async (e) => {
        e.preventDefault();
        if (!firstName.trim() || !lastName.trim()) { toast.error(t.register?.nameMin || "Аты-жөнді толтырыңыз"); return; }
        setLoading(true);
        try {
            const res = await loginTeam(code.trim(), firstName, lastName);
            login(res.data.token, { name: fullName(), variant: res.data.variant });
            toast.success(t.register?.loginSuccess || "Қош келдіңіз! 👋");
            navigate("/");
        } catch (err) {
            toast.error(err.response?.data?.message || err.response?.data?.detail || "Қате");
        } finally {
            setLoading(false);
        }
    };

    const handleChangeCode = () => {
        setStep("code");
        setFirstName("");
        setLastName("");
    };

    const nameFormProps = {
        t, code, firstName, lastName,
        onFirstName:  setFirstName,
        onLastName:   setLastName,
        onChangeCode: handleChangeCode,
        loading,
    };

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
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="icon-float inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4"
                        style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 8px 32px rgba(99,102,241,0.4)" }}>
                        <Zap size={28} color="white" fill="white" />
                    </div>
                    <h1 className="text-3xl font-bold"
                        style={{ fontFamily: '"Clash Display", sans-serif', color: "#1e1b4b" }}>
                        Olymp<span style={{ color: "#6366f1" }}>IQ</span>
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">{t.register?.subtitle}</p>
                </div>

                <div className="glass-strong rounded-3xl p-8">
                    <AnimatePresence mode="wait">

                        {/* ── code ── */}
                        {step === "code" && (
                            <motion.div key="code"
                                variants={stepVariants} initial="enter" animate="center" exit="exit"
                                transition={{ duration: 0.22 }}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))" }}>
                                        <Hash size={18} className="text-indigo-600" />
                                    </div>
                                    <div>
                                        <h2 className="font-semibold text-slate-800"
                                            style={{ fontFamily: '"Clash Display", sans-serif' }}>
                                            {t.register?.userCode || "Қатысушы коды"}
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            {t.register?.userCodeDesc || "Ұйымдастырушы берген кодты енгізіңіз"}
                                        </p>
                                    </div>
                                </div>
                                <form onSubmit={handleValidateCode} className="space-y-3">
                                    <div className="relative">
                                        <Hash size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            className="input-glass w-full pl-9 pr-4 py-3 rounded-xl text-sm font-mono tracking-widest uppercase"
                                            placeholder={t.register?.codePlaceholder || "XXXXXX"}
                                            value={code}
                                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                                            maxLength={20}
                                            autoFocus
                                            autoComplete="off"
                                            spellCheck={false}
                                        />
                                    </div>
                                    <motion.button
                                        type="submit"
                                        disabled={loading || !code.trim()}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="btn-primary w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {loading
                                            ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                            : <>{t.register?.validateBtn || "Тексеру"} <ArrowRight size={16} /></>}
                                    </motion.button>
                                </form>
                            </motion.div>
                        )}

                        {/* ── name ── */}
                        {step === "name" && (
                            <motion.div key="name"
                                variants={stepVariants} initial="enter" animate="center" exit="exit"
                                transition={{ duration: 0.22 }}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                                        <CheckCircle2 size={20} className="text-emerald-500" />
                                    </div>
                                    <div>
                                        <h2 className="font-semibold text-slate-800"
                                            style={{ fontFamily: '"Clash Display", sans-serif' }}>
                                            {t.register?.validTitle || "Код расталды"}
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            {t.register?.validSub || "Аты-жөніңізді енгізіңіз"}
                                        </p>
                                    </div>
                                </div>
                                <NameForm {...nameFormProps} onSubmit={handleRegister} />
                            </motion.div>
                        )}

                        {/* ── exists ── */}
                        {step === "exists" && (
                            <motion.div key="exists"
                                variants={stepVariants} initial="enter" animate="center" exit="exit"
                                transition={{ duration: 0.22 }}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                                        <AlertCircle size={20} className="text-amber-500" />
                                    </div>
                                    <div>
                                        <h2 className="font-semibold text-slate-800"
                                            style={{ fontFamily: '"Clash Display", sans-serif' }}>
                                            {t.register?.alreadyRegistered || "Код бос емес"}
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            {t.register?.enterName || "Өзіңіздің аты-жөніңізді растаңыз"}
                                        </p>
                                    </div>
                                </div>
                                <div className="rounded-xl px-3 py-2 mb-4 text-xs text-amber-700"
                                    style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                                    {t.register?.existsHint || "Бұл код басқа қатысушыға тіркелген. Егер сіз болсаңыз — аты-жөніңізді дәл енгізіңіз."}
                                </div>
                                <NameForm {...nameFormProps} onSubmit={handleLoginExisting} />
                            </motion.div>
                        )}

                        {/* ── error ── */}
                        {step === "error" && (
                            <motion.div key="error"
                                variants={stepVariants} initial="enter" animate="center" exit="exit"
                                transition={{ duration: 0.22 }}
                                className="text-center py-6">
                                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                                    style={{ background: "rgba(239,68,68,0.1)" }}>
                                    <AlertCircle size={28} className="text-red-500" />
                                </div>
                                <h2 className="font-semibold text-slate-800 mb-2"
                                    style={{ fontFamily: '"Clash Display", sans-serif' }}>
                                    {t.register?.errorTitle || "Код жарамсыз"}
                                </h2>
                                <p className="text-sm text-slate-500 mb-6">
                                    {t.register?.errorDesc || "Мұндай код табылмады. Тексеріп, қайталаңыз."}
                                </p>
                                <motion.button
                                    onClick={() => { setStep("code"); setCode(""); }}
                                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                    className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold">
                                    {t.register?.tryAgain || "Қайталау"}
                                </motion.button>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>

                <p className="text-center text-xs text-slate-400 mt-4">
                    {t.register?.copyright || "OlympIQ"} © {new Date().getFullYear()}
                </p>
            </motion.div>
        </div>
    );
}