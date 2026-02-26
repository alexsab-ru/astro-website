import { useState, useRef, useEffect, useCallback } from "react";
import {
  Header,
  Footer,
  Message,
  Typing,
  OptionsList,
  SuccessMessage,
  InputField,
} from "./components";

import type { ChatWidgetProps } from "./types";

// Импортируем утилиты из отдельных файлов
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
            <OptionsList
              options={cfg.options}
              currentStep={currentStep}
              onSelect={handleAnswer}
              onHide={() => setShowOptions(false)}
            />
          )}

          {isFinished && !isTyping && <SuccessMessage />}
        </div>

        {/* Input area */}
        {showOptions && !isTyping && cfg?.inputField && !isFinished && (
          <InputField
            inputField={cfg.inputField}
            currentStep={currentStep}
            inputValue={inputValue}
            setInputValue={setInputValue}
            consentChecked={consentChecked}
            setConsentChecked={setConsentChecked}
            agreeError={agreeError}
            setAgreeError={setAgreeError}
            isTyping={isTyping}
            onSubmit={handleInputSubmit}
          />
        )}
        
        <Footer dealer={dealer} />
      </div>
    </div>
  );
}