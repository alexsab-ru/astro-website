import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Send, CheckCircle2 } from "lucide-react";
import { Footer, Header, Message, Typing } from "./Elements";

import { AGREE_LABEL } from "@/const";
import type { ChatWidgetProps } from "./types";

// Импортируем утилиты из отдельных файлов
import { maskPhone } from './utils';
import { phoneSchema } from './validation';

// Импортируем хуки
import { useChatScroll } from './hooks/useChatScroll';
import { useChatMessages } from './hooks/useChatMessages';
import { useChatSteps } from './hooks/useChatSteps';
import { useFormSubmission } from './hooks/useFormSubmission';

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
  // Хук для автоскролла
  const { scrollRef, scroll } = useChatScroll();

  // Хук для управления шагами
  const {
    currentStep,
    setCurrentStep,
    answers,
    setAnswers,
    showOptions,
    setShowOptions,
    steps,
  } = useChatSteps({
    config,
    managerName,
    managerPosition,
    brand,
    dealer,
    legalCityWhere,
  });

  // Локальные состояния для формы ввода (объявляем до использования в хуках)
  const [inputValue, setInputValue] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [agreeError, setAgreeError] = useState<string | null>(null);

  // Хук для управления сообщениями
  const {
    messages,
    setMessages,
    isTyping,
    setIsTyping,
    addUserMessage,
    addBotMessage,
    addBotMessages,
  } = useChatMessages(scroll, setShowOptions);

  // Хук для отправки формы
  const {
    isFinished,
    setIsFinished,
    sendLead,
  } = useFormSubmission({
    formName,
    setIsTyping,
    setMessages,
    setInputValue,
    setCurrentStep,
    scroll,
  });

  const hasInit = useRef(false);

  // Инициализация чата при первом рендере
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
  }, [addBotMessages, steps, setCurrentStep, setShowOptions]);

  // Автоскролл при изменении сообщений или опций
  useEffect(() => {
    scroll();
  }, [messages, showOptions, scroll]);

  // ──────────────── answer handler ────────────────

  const handleAnswer = useCallback(
    (value: string) => {
      // Добавляем сообщение пользователя
      addUserMessage(value);

      // Сохраняем ответ пользователя
      let updatedAnswers = answers;
      if (currentStep !== "intro") {
        updatedAnswers = {
          ...answers,
          [currentStep]: value,
        };
        setAnswers(updatedAnswers);
      }

      // Переходим к следующему шагу
      const nextKey = steps[currentStep].nextStep();
      setCurrentStep(nextKey);

      // Персонализация для шага ввода имени
      if (currentStep === "name") {
        const final = config[config.length - 1] as any;
        addBotMessages(
          [
            `${value}, приятно познакомиться! 😊`,
            final.title,
          ],
          () => setShowOptions(true),
        );
        return;
      }

      // Показываем сообщения следующего шага
      const nextCfg = steps[nextKey];
      if (nextCfg?.botMessages?.length) {
        addBotMessages(nextCfg.botMessages, () => {
          if (nextKey !== "done") setShowOptions(true);
        });
      }
    },
    [currentStep, steps, addBotMessages, addUserMessage, answers, setAnswers, setCurrentStep, setShowOptions, config],
  );


  const handleInputSubmit = async () => {
    if (!inputValue.trim()) return;

    // Если это шаг телефона — валидируем
    if (currentStep === "phone") {
      if(!consentChecked){
        setAgreeError('Чтобы продолжить, установите флажок')
        return;
      }
      try {
        await phoneSchema.validate(inputValue);

        const updatedAnswers = {
          ...answers,
          phone: inputValue,
        };

        setAnswers(updatedAnswers);

        // Показываем сообщение о начале отправки
        const userName = answers.name || "";
        addUserMessage(inputValue);
        addBotMessage(`Спасибо${userName ? ', ' + userName : ''}! Ваша заявка отправляется...`);
        setInputValue("");

        await sendLead(updatedAnswers); // отправляем письмо

      } catch (err: any) {
        addBotMessage(err.message);
      }

      return;
    }

    handleAnswer(inputValue);
    setInputValue("");
  };

  const cfg = steps[currentStep];

  // ──────────────── UI (ПОЛНОСТЬЮ СОХРАНЕН) ────────────────

  return (
    <div className="w-full max-w-7xl mx-auto px-0 md:px-5">
      <div className="flex flex-col rounded-xl md:rounded-2xl overflow-hidden border border-gray-200 shadow-xl min-h-[500px] h-[70vh]">
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
              className={`pt-1 ${currentStep === "model" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" : "flex flex-wrap gap-2"}`}
            >
              {cfg.options.map((opt) => {
                // Карточки с изображениями для шага выбора модели
                if (opt.image && currentStep === "model") {
                  return (
                    <motion.button
                      key={opt.value}
                      onClick={() => {
                        setShowOptions(false);
                        handleAnswer(opt.value);
                      }}
                      className="flex flex-col bg-white border-2 border-gray-200 rounded-md sm:rounded-xl overflow-hidden hover:shadow-lg hover:border-red-500 transition-all cursor-pointer group"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="aspect-video w-full overflow-hidden bg-gray-100 relative">
                        <img
                          src={opt.image}
                          alt={opt.label}
                          className="absolute inset-0 w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-2 sm:p-3 text-center">
                        <div
                          className="font-semibold text-xs sm:text-sm text-accent-500"
                        >
                          {opt.label}
                        </div>
                        {opt.description && (
                          <div
                            className="text-gray-500 mt-0.5 text-[10px] sm:text-xs"
                          >
                            {opt.description}
                          </div>
                        )}
                      </div>
                    </motion.button>
                  );
                }
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setShowOptions(false);
                      handleAnswer(opt.value);
                    }}
                    className="bg-white px-4 py-2 rounded-full hover:shadow-md transition-all cursor-pointer shadow-sm text-xs sm:text-sm font-medium border border-accent-500 text-accent-500"
                  >
                    {opt.label}
                  </button>
                )
              })}
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
            {/* Чекбокс согласия для шага ввода телефона */}
            {currentStep === "phone" && (
              <label className="cursor-pointer block mb-4">
                <input
                  type="checkbox"
                  id="consent"
                  name="agree"
                  checked={consentChecked}
                  onChange={(e) => {
                    setConsentChecked(e.target.checked)
                    if(!e.target.checked){
                      setAgreeError('Чтобы продолжить, установите флажок')
                    }else{
                      setAgreeError(null)
                    }                  
                  }}
                  className="sr-only"
                />
                <div className={`text-black/80 text-xs sm:text-sm flex items-start`}>
                  <span className={`fake-checkbox-black mr-2`}></span>
                  <div>
                    <div dangerouslySetInnerHTML={{__html: AGREE_LABEL}}></div>
                    {agreeError && (<div className="error-message mt-2 text-xs text-red-500">{agreeError}</div>)}
                  </div>
                </div>
              </label>
            )}
            <div className="flex items-center gap-2">
              <input
                type={cfg.inputField.type}
                name={cfg.inputField.name}
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
                className="flex-1 bg-gray-100 rounded-full px-3 sm:px-4 py-2.5 outline-none text-xs sm:text-sm"
              />
              <button
                onClick={handleInputSubmit}
                disabled={isTyping}
                className="size-8 sm:size-10 rounded-full text-white flex items-center justify-center shrink-0 bg-accent-500"
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