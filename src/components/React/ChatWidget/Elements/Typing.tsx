import { motion } from "motion/react";

export function Typing(){
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
        >
            <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-1.5">
            <span
                className="w-1.5 h-1.5 rounded-full animate-bounce bg-accent-500"
                style={{ animationDelay: "0ms" }}
            />
            <span
                className="w-1.5 h-1.5 rounded-full animate-bounce bg-accent-500"
                style={{ animationDelay: "150ms" }}
            />
            <span
                className="w-1.5 h-1.5 rounded-full animate-bounce bg-accent-500"
                style={{ animationDelay: "300ms" }}
            />
            </div>
        </motion.div>
    )
}