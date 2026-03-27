// src/pages/admin/AdminShared.jsx
// Общие мини-компоненты, используемые во всех вкладках AdminPage

import { motion } from "framer-motion";

export function Spinner() {
    return (
        <div className="flex justify-center py-16">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-500"
            />
        </div>
    );
}
