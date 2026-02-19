import { motion } from "motion/react";

type TMessage = {
    message: {
        id: string;
        type: string;
        text: string;
    }
}

export function Message({ message }: TMessage){
    return (
        <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className={`flex ${
            message.type === "user"
                ? "justify-end"
                : "justify-start"
            }`}
        >
            <div
                className={`max-w-[75%] px-4 py-2.5 text-sm ${
                    message.type === "user"
                    ? "text-white rounded-2xl rounded-br-md bg-accent-500"
                    : "bg-white text-black rounded-2xl rounded-bl-md shadow-sm border border-gray-100"
                }`}
                dangerouslySetInnerHTML={{__html: message.text}}
            >
            </div>
        </motion.div>
    )
}