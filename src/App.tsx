import React, { useState, useReducer, useEffect } from "react";
import { motion } from "framer-motion";

// Telegram Web App integration
declare const Telegram: any;
const tg = Telegram?.WebApp || { initDataUnsafe: { user: { first_name: "Guest", id: "test_id" } } };

// Secret key (must match the backend)
const SECRET_KEY = "your_secret_key_here";

// Define questionnaire structure
const questionnaires: { [key: string]: { name: string; label: string; type: string; validate: (value: string) => boolean }[] } = {
  website: [
    { name: "projectName", label: "What is the name of your business or project?", type: "text", validate: (value) => value.length >= 3 },
    { name: "projectDescription", label: "Describe your project briefly.", type: "text", validate: (value) => value.length >= 10 },
    { name: "targetAudience", label: "Who is your target audience?", type: "text", validate: (value) => value.length > 0 },
    { name: "primaryGoal", label: "What is the primary goal of your website?", type: "text", validate: (value) => value.length > 0 },
    { name: "brandingInfo", label: "Any branding guidelines or preferences?", type: "text", validate: () => true },
    { name: "requiredFeatures", label: "List any required features.", type: "text", validate: () => true },
  ],
  "Telegram-bot": [
    { name: "botPurpose", label: "What is the purpose of your bot?", type: "text", validate: (value) => value.length >= 5 },
    { name: "botName", label: "What should the bot be called?", type: "text", validate: (value) => value.length >= 3 },
    { name: "keyCommands", label: "List key commands for the bot.", type: "text", validate: () => true },
    { name: "userInteraction", label: "How should the bot interact with users?", type: "text", validate: () => true },
    { name: "integrationNeeds", label: "Any integration needs?", type: "text", validate: () => true },
  ],
  Logo: [
    { name: "companyName", label: "What is your company name?", type: "text", validate: (value) => value.length >= 3 },
    { name: "tagline", label: "What is your tagline (if any)?", type: "text", validate: () => true },
    { name: "stylePreference", label: "What style do you prefer for the logo?", type: "text", validate: () => true },
    { name: "brandColors", label: "What are your brand colors?", type: "text", validate: () => true },
    { name: "inspiration", label: "Any inspiration or examples?", type: "text", validate: () => true },
  ],
};

// State management with useReducer
type AnswerState = { [key: string]: string };
const initialState: AnswerState = {};
const reducer = (state: AnswerState, action: { type: string; payload: { questionId: string; value: string } }) => {
  switch (action.type) {
    case "SET_ANSWER":
      return { ...state, [action.payload.questionId]: action.payload.value };
    default:
      return state;
  }
};

// Utility to compute HMAC-SHA256 (client-side)
async function computeHmacSha256(message: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await window.crypto.subtle.sign("HMAC", cryptoKey, messageData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

const App: React.FC = () => {
  const [category, setCategory] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, dispatch] = useReducer(reducer, initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    tg.ready();
  }, []);

  const handleCategorySelect = (selectedCategory: string) => {
    setCategory(selectedCategory);
    setCurrentQuestionIndex(0);
  };

  const handleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window)) {
      tg.showAlert("Voice input is not supported in your browser.");
      return;
    }
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      dispatch({
        type: "SET_ANSWER",
        payload: { questionId: questionnaires[category!][currentQuestionIndex].name, value: transcript },
      });
      setIsRecording(false);
    };
    recognition.onerror = () => {
      tg.showAlert("Error with voice input. Please try again.");
      setIsRecording(false);
    };
    setIsRecording(true);
    recognition.start();
  };

  const handleNext = async () => {
    const question = questionnaires[category!][currentQuestionIndex];
    const answer = answers[question.name] || "";
    if (!question.validate(answer)) {
      tg.showAlert("Please provide a valid answer.");
      return;
    }

    if (currentQuestionIndex < questionnaires[category!].length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      await submitForm();
    }
  };

  const submitForm = async () => {
    setIsSubmitting(true);
    const user = tg.initDataUnsafe.user || {};
    const token = await computeHmacSha256(user.id + ":" + SECRET_KEY, SECRET_KEY);
    const payload = {
      category,
      token,
      telegram_user_id: user.id || "N/A",
      telegram_username: user.username || "N/A",
      telegram_first_name: user.first_name || "N/A",
      ...answers,
    };

    try {
      const response = await fetch("https://script.google.com/macros/s/your-web-app-id/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.status === "success") {
        tg.showAlert("Submission successful! We’ll get back to you soon.");
        setCategory(null);
        dispatch({ type: "SET_ANSWER", payload: { questionId: "", value: "" } }); // Reset
      } else {
        tg.showAlert(`Error: ${result.message}`);
      }
    } catch (error) {
      tg.showAlert(`Submission failed: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      {!category ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <h1>Welcome, {tg.initDataUnsafe.user.first_name}!</h1>
          <p>Select a service to start the questionnaire:</p>
          <button onClick={() => handleCategorySelect("website")}>Website</button>
          <button onClick={() => handleCategorySelect("Telegram-bot")}>Telegram Bot</button>
          <button onClick={() => handleCategorySelect("Logo")}>Logo</button>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <h2>{category} Questionnaire</h2>
          <label>{questionnaires[category][currentQuestionIndex].label}</label>
          <input
            type="text"
            value={answers[questionnaires[category][currentQuestionIndex].name] || ""}
            onChange={(e) =>
              dispatch({
                type: "SET_ANSWER",
                payload: { questionId: questionnaires[category][currentQuestionIndex].name, value: e.target.value },
              })
            }
            style={{ display: "block", margin: "10px 0", width: "100%" }}
          />
          <button onClick={handleVoiceInput} disabled={isRecording}>
            {isRecording ? "Recording..." : "🎤 Use Voice"}
          </button>
          <button onClick={handleNext} disabled={isSubmitting}>
            {currentQuestionIndex === questionnaires[category].length - 1 ? "Submit" : "Next"}
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default App;
