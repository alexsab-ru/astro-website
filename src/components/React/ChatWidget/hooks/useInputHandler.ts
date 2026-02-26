// ──────────────── Хук для обработки ввода данных ────────────────

import { useState, useCallback } from 'react';
import { phoneSchema } from '../validation';

interface UseInputHandlerParams {
  currentStep: string;
  answers: Record<string, any>;
  setAnswers: (answers: Record<string, any>) => void;
  addUserMessage: (text: string) => void;
  addBotMessage: (text: string) => void;
  sendLead: (data: Record<string, any>) => Promise<void>;
  handleAnswer: (value: string) => void;
}

/**
 * Хук для управления формой ввода
 * Обрабатывает ввод имени и телефона, валидацию и отправку формы
 * 
 * @param params - параметры хука
 * @returns объект с состоянием формы и функциями для работы с ней
 */
export function useInputHandler({
  currentStep,
  answers,
  setAnswers,
  addUserMessage,
  addBotMessage,
  sendLead,
  handleAnswer,
}: UseInputHandlerParams) {
  // Состояния формы ввода
  const [inputValue, setInputValue] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [agreeError, setAgreeError] = useState<string | null>(null);

  /**
   * Обрабатывает отправку формы ввода
   * Валидирует данные для шага телефона, для остальных шагов передает в handleAnswer
   */
  const handleInputSubmit = useCallback(async () => {
    if (!inputValue.trim()) return;

    // Если это шаг телефона — валидируем
    if (currentStep === "phone") {
      if (!consentChecked) {
        setAgreeError("Чтобы продолжить, установите флажок");
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
        addBotMessage(
          `Спасибо${userName ? ", " + userName : ""}! Ваша заявка отправляется...`
        );
        setInputValue("");

        await sendLead(updatedAnswers); // отправляем письмо
      } catch (err: any) {
        addBotMessage(err.message);
      }

      return;
    }

    // Для остальных шагов используем стандартную обработку
    handleAnswer(inputValue);
    setInputValue("");
  }, [
    inputValue,
    currentStep,
    consentChecked,
    answers,
    setAnswers,
    addUserMessage,
    addBotMessage,
    sendLead,
    handleAnswer,
  ]);

  return {
    inputValue,
    setInputValue,
    consentChecked,
    setConsentChecked,
    agreeError,
    setAgreeError,
    handleInputSubmit,
  };
}
