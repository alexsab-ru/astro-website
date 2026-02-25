import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion } from "motion/react";
import { Send, User, CheckCircle2 } from "lucide-react";
import { Footer, Header, Message, Typing } from "./Elements";
import { getPair } from '@/js/utils/helpers';
import * as yup from 'yup';
import axios from 'axios';

const phoneSchema = yup.string()
  .required("Укажите номер телефона")
  .matches(/^\+7 \d{3} \d{3}-\d{2}-\d{2}$/, "Некорректный номер");

// ──────────────── helpers ────────────────
function parseTemplate(str: string, data: Record<string, any>) {
  return str.replace(/\{(.*?)\}/g, (_, key) => data[key] || "");
}

const maskPhone = (value: string) => {
  let num = value
    .replace(/^(\+7|8|7)/g, "")
    .replace(/\D/g, "")
    .split("");

  const i = num.length;

  if (i > 0) num.unshift("+7");
  if (i >= 1) num.splice(1, 0, " ");
  if (i >= 4) num.splice(5, 0, " ");
  if (i >= 7) num.splice(9, 0, "-");
  if (i >= 9) num.splice(12, 0, "-");

  return num.join("");
};

// ──────────────── types ────────────────

interface QuizIntro {
  title: string;
  description?: string;
  startButtonText?: string;
}

interface QuizQuestion {
  id: string;
  type: "radio" | "checkbox";
  title: string;
  answerOptions: string[];
}

interface QuizFinal {
  title: string;
  description?: string;
}

type QuizConfig = Array<QuizIntro | QuizQuestion | QuizFinal>;

interface StepConfig {
  botMessages: string[];
  options?: { label: string; value: string }[];
  inputField?: { placeholder: string; type: string };
  multiple?: boolean;
  nextStep: () => string;
}

interface ChatWidgetProps {
  config: QuizConfig;
  managerName?: string;
  managerPosition?: string;
  brand?: string;
  dealer?: string;
  legalCityWhere?: string;
  formName?: string;
}

// ──────────────── component ────────────────

export function ChatWidget({
  config,
  managerName = "Алексей",
  managerPosition = "руководитель отдела продаж",
  brand = "CHERY",
  dealer = "Официальный дилер",
  legalCityWhere = 'Самаре',
  formName = 'Квиз чат'
}: ChatWidgetProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState("welcome");
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showOptions, setShowOptions] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const hasInit = useRef(false);

  // ──────────────── dynamic steps builder ────────────────

  const steps = useMemo(() => {
  const intro = config[0] as QuizIntro;
  const questions = config.filter((q) => "id" in q) as QuizQuestion[];
  const final = config[config.length - 1] as QuizFinal;

  const map: Record<string, StepConfig> = {};

  const botIntroMessages = 
    Array.isArray(intro.title) ? intro.title : typeof intro.title === "string" ? [
      "Здравствуйте! 👋",
      `Меня зовут ${managerName}, ${managerPosition} официального дилера ${dealer} в ${legalCityWhere}!`,
      `Ответьте на несколько вопросов, и я смогу подобрать для Вас наиболее выгодное персональное предложение на новый ${brand}`,
      intro.title,
    ] : [];

  // ───── intro ─────
  map.intro = {
    botMessages: botIntroMessages,
    nextStep: () => questions[0]?.id || "done",
  };

  // ───── questions ─────
  questions.forEach((q, index) => {
    const next =
      index === questions.length - 1
        ? "name"
        : questions[index + 1].id;

    map[q.id] = {
      botMessages: [parseTemplate(q.title, answers)],
      options: q.answerOptions.map((opt) => ({
        label: opt,
        value: opt,
      })),
      multiple: q.type === "checkbox",
      nextStep: () => next,
    };
  });

  // ───── имя ─────
  map.name = {
    botMessages: [
      "Отлично 👍",
      "Как я могу к вам обращаться?",
    ],
    inputField: {
      placeholder: "Введите ваше имя",
      type: "text",
    },
    nextStep: () => "phone",
  };

  // ───── телефон ─────
  map.phone = {
    botMessages: [
      "Приятно познакомиться! 😊",
      final.title,
    ],
    inputField: {
      placeholder: "+7 (___) ___-__-__",
      type: "tel",
    },
    nextStep: () => "",
  };

  // ───── финал ─────
  map.done = {
    botMessages: [
      parseTemplate(
        "Спасибо, {name}! Ваша заявка принята ✅",
        answers
      ),
    ],
    nextStep: () => "done",
  };

  return map;
}, [config, answers]);

  // ──────────────── helpers ────────────────

  const scroll = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 80);
  }, []);

  const addBotMessages = useCallback(
    (texts: string[], onDone?: () => void) => {
      setIsTyping(true);
      setShowOptions(false);
      let i = 0;

      const next = () => {
        if (i >= texts.length) {
          setIsTyping(false);
          onDone?.();
          return;
        }

        const text = texts[i];
        i++;

        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            { id: `bot-${Date.now()}-${i}`, type: "bot", text },
          ]);
          scroll();
          next();
        }, 500 + text.length * 6);
      };

      next();
    },
    [scroll],
  );

  // init
  useEffect(() => {
    if (!hasInit.current) {
      hasInit.current = true;

      addBotMessages(steps.intro.botMessages, () => {
        const firstStep = steps.intro.nextStep();
        setCurrentStep(firstStep);

        addBotMessages(steps[firstStep].botMessages, () => {
          setShowOptions(true);
        });
      });
    }
  }, [addBotMessages, steps]);


  useEffect(() => {
    scroll();
  }, [messages, showOptions, scroll]);

  // ──────────────── answer handler ────────────────

  const sendLead = async (data: Record<string, any>) => {
    setIsTyping(true);
    const pairs = getPair();
    if(Object.keys(pairs).length > 0){
      Object.entries(pairs).forEach(function(pair){
        data[pair[0]] = pair[1];
      });
    }     

    data.form = formName;
    data.page_url = window.location.origin + window.location.pathname;

    console.log(data);

    const options = {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      credentials: "same-origin",
      headers: { "Content-Type": "application/x-www-form-urlencoded", },
      data: data,
      url: "/api/send-lead",
    };

    await axios(options)
    .then(function (response) {
      if (window.location.hostname == "localhost"){
        console.log('Отправка письма', response);
      }
      
      setIsFinished(true);
    })
    .catch(function (error) {
      if (window.location.hostname == "localhost"){
        console.log('Ошибка отправки письма', error);
      }
      setIsFinished(false);
      setCurrentStep('phone');
      setMessages(prev => [
        ...prev,
        {
          id: `bot-error-${Date.now()}`,
          type: "bot",
          text: "Упс 😔 Ошибка отправки. Попробуйте снова.",
        }
      ]);
    })
    .finally(function () {
      setIsTyping(false);
    });
  };

  const handleAnswer = useCallback(
    (value: string) => {
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, type: "user", text: value },
      ]);

      let updatedAnswers = answers;

      if (currentStep !== "intro") {
        updatedAnswers = {
          ...answers,
          [currentStep]: value,
        };
        setAnswers(updatedAnswers);
      }

      const nextKey = steps[currentStep].nextStep();
      setCurrentStep(nextKey);

      // if (nextKey === "done") setIsFinished(true);

      // 👇 персонализация здесь
      if (currentStep === "name") {
        addBotMessages(
          [
            `${value}, приятно познакомиться! 😊`,
            (config[config.length - 1] as any).title,
          ],
          () => setShowOptions(true),
        );
        return;
      }

      const nextCfg = steps[nextKey];

      if (nextCfg?.botMessages?.length) {
        addBotMessages(nextCfg.botMessages, () => {
          if (nextKey !== "done") setShowOptions(true);
        });
      }
    },
    [currentStep, steps, addBotMessages, answers, config],
  );


  const handleInputSubmit = async () => {
    if (!inputValue.trim()) return;

    // Если это шаг телефона — валидируем
    if (currentStep === "phone") {
      try {
        await phoneSchema.validate(inputValue);

        const updatedAnswers = {
          ...answers,
          phone: inputValue,
        };

        setAnswers(updatedAnswers);

        await sendLead(updatedAnswers); // отправляем письмо

        handleAnswer(inputValue);
        setInputValue("");

      } catch (err: any) {
        setMessages(prev => [
          ...prev,
          {
            id: `bot-error-${Date.now()}`,
            type: "bot",
            text: err.message,
          }
        ]);
      }

      return;
    }

    handleAnswer(inputValue);
    setInputValue("");
  };

  const cfg = steps[currentStep];

  // ──────────────── UI (ПОЛНОСТЬЮ СОХРАНЕН) ────────────────

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="flex flex-col rounded-2xl overflow-hidden border border-gray-200 shadow-xl min-h-[500px] h-[70vh]">
        <Header managerName={managerName} dealer={dealer} />

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-gray-50"
        >
          {messages.map((msg) => (
            <Message message={msg} key={msg.id} />
          ))}

          {isTyping && <Typing />}

          {showOptions && !isTyping && cfg?.options && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-2 pt-1"
            >
              {cfg.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setShowOptions(false);
                    handleAnswer(opt.value);
                  }}
                  className="bg-white px-4 py-2 rounded-full hover:shadow-md transition-all cursor-pointer shadow-sm text-sm font-medium border border-accent-500 text-accent-500"
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          )}

          {isFinished && !isTyping && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex justify-center pt-3"
            >
              <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-5 text-center">
                <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                <div className="text-green-800 text-sm font-semibold">
                  Заявка отправлена!
                </div>
                <div className="text-green-600 mt-1 text-xs">
                  Ожидайте звонка менеджера
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Input area */}
        {showOptions && !isTyping && cfg?.inputField && !isFinished && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 sm:px-5 py-3 bg-white border-t border-gray-100 shrink-0"
          >
            <div className="flex items-center gap-2">
              <input
                type={cfg.inputField.type}
                placeholder={cfg.inputField.placeholder}
                value={inputValue}
                onChange={(e) => {
                  if (currentStep === "phone") {
                    const masked = maskPhone(e.target.value);
                    setInputValue(masked);
                  } else {
                    setInputValue(e.target.value);
                  }
                }}
                onKeyDown={(e) =>
                  e.key === "Enter" && handleInputSubmit()
                }
                onFocus={() => {
                  if (currentStep === "phone" && !inputValue) {
                    setInputValue("+7 ");
                  }
                }}
                className="flex-1 bg-gray-100 rounded-full px-3 py-1.5 sm:px-4 sm:py-2.5 outline-none"
              />
              <button
                onClick={handleInputSubmit}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full text-white flex items-center justify-center shrink-0 bg-accent-500"
              >
                <Send className="size-3 sm:size-4" />
              </button>
            </div>
          </motion.div>
        )}

        <Footer dealer={dealer} />
      </div>
    </div>
  );
}