"use client";

import React, { useEffect, useRef, useState } from "react";
import Patient02 from "@/public/images/patient_11.png";
import { useParams } from "next/navigation";
import Image from "next/image";

// Komponenty chat-ui (shadcn-chat)
import {
  ChatBubble,
  ChatBubbleAction,
  ChatBubbleMessage,
} from "@/src/components/ui/chat/chat-bubble";
import { ChatInput } from "@/src/components/ui/chat/chat-input";
import { ChatMessageList } from "@/src/components/ui/chat/chat-message-list";
import { Button } from "@/components/ui/button";

// Ikony:
import {
  CopyIcon,
  CornerDownLeft,
  Mic,
  Paperclip,
  RefreshCcw,
  Volume2,
  StopCircle,
} from "lucide-react";

// Markdown (do obsługi bloczków kodu):
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ----- KONFIGURACJA ------------------------------------------------

// Stały tekst pacjenta (wyświetlamy go w UI, ale nie wysyłamy do backendu)
const PATIENT_MESSAGE = `
Hi, I'm Anna Novak. I'm 63 years old and I’ve been feeling dizzy and unsteady, with occasional numbness in my hands and feet. I’ve also been more forgetful lately. I’m not in pain, but I feel more tired. Should I be concerned?`.trim();

// Stały case study (wysyłany do backendu w polu `case_study` za każdym razem)
const CASE_STUDY = `
Chief Complaint:
The patient reports experiencing progressive neurological symptoms over the past few months, including episodes of dizziness, occasional balance disturbances, and intermittent numbness in the hands and feet. Additionally, they describe mild memory difficulties, such as forgetting recent conversations or misplacing objects.

History of Present Illness:

Symptoms started approximately six months ago with occasional dizziness and lightheadedness. The frequency of these episodes has increased, particularly when standing up quickly.
The patient notes a gradual onset of balance issues, reporting feeling unsteady when walking, especially on uneven surfaces. No reported falls but increased reliance on handrails.
Reports occasional tingling and numbness in the hands and feet, particularly in the evening. No known injuries or new medications that could explain these sensations.
Family members have noticed the patient occasionally struggling to recall words mid-conversation or repeating questions.
No significant headaches, loss of consciousness, or sudden episodes of confusion.
No difficulty swallowing or major speech disturbances.
Associated Symptoms:

Mild fatigue but no severe weakness.
Occasional muscle cramps, more noticeable in the legs.
No reported visual disturbances, seizures, or loss of coordination beyond balance difficulties.
No significant mood changes, though the patient admits to some frustration due to memory lapses.
Review of Systems:

Cardiovascular: Reports mild hypertension, but no chest pain, palpitations, or shortness of breath.
Gastrointestinal: No nausea, vomiting, or recent changes in bowel habits.
Genitourinary: No issues with urination or incontinence.
Respiratory: No chronic cough or difficulty breathing.
Musculoskeletal: No recent falls, but some mild joint stiffness in the mornings.
Additional Notes:
The patient's symptoms suggest a possible progressive neurological disorder, such as early-stage neurodegenerative disease (e.g., Parkinson's disease, mild cognitive impairment, or peripheral neuropathy). Further evaluation is recommended, including neurological examination, blood tests (to rule out vitamin deficiencies or metabolic causes), and imaging (MRI/CT brain) to assess structural changes.

Next Steps:
Neurological assessment (gait, reflexes, coordination tests)
Cognitive screening (MMSE/MoCA)
Routine blood work (B12, thyroid function, glucose)
MRI brain to rule out structural abnormalities
Follow-up visit in four weeks to review findings and adjust treatment plan accordingly
Blood Test Results (Dodane wyniki krwi):

Complete Blood Count (CBC):

Hemoglobin (Hb): 11.5 g/dL (Slightly below the normal range)
Hematocrit (Hct): 34% (Below normal limits)
Mean Corpuscular Volume (MCV): 105 fL (Elevated, indicating macrocytosis)
White Blood Cell (WBC) Count: 6.2 x 10³/µL (Within normal limits)
Platelet Count: 240 x 10³/µL (Normal)
Metabolic Panel:

Glucose: 98 mg/dL (Normal)
Electrolytes (Sodium, Potassium, Chloride, Bicarbonate): Within normal limits
Creatinine: 0.9 mg/dL (Normal)
Blood Urea Nitrogen (BUN): 14 mg/dL (Normal)
Thyroid Function:

TSH: 2.1 mIU/L (Normal)
Vitamin Levels:

Vitamin B12: 180 pg/mL (Below the normal range of approximately 200–900 pg/mL, suggesting deficiency)
Folate: 6.5 ng/mL (Normal)
`;

// Typ wiadomości w stanie frontendu
interface Message {
  role: "user" | "assistant";
  content: string;
}

// Ikony akcji w bąbelku asystenta
const ChatAiIcons = [
  { icon: CopyIcon, label: "Copy" },
  { icon: RefreshCcw, label: "Refresh" },
  { icon: Volume2, label: "Volume" },
];

export default function PatientChatPage() {
  const { patientId } = useParams() as { patientId: string };
  const patientName = "Anna Novak"; // demo

  // Stan czatu – zaczynamy od jednej wiadomości „pacjenta” tylko w UI
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: PATIENT_MESSAGE,
    },
  ]);

  // Tekst w polu input
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // --- STANY do obsługi mikrofonu ---
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  // Ref do scrollowania
  const messagesRef = useRef<HTMLDivElement>(null);

  // Scroll do dołu przy każdej zmianie "messages"
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  // Funkcja do odczytu tekstu przez TTS
// Funkcja do odczytu tekstu przez TTS przy użyciu API backendu
const speakText = async (text: string) => {
  console.log("Fetching TTS audio for:", text);
  try {
    const response = await fetch("http://172.20.10.5:8000/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      throw new Error("Failed to fetch TTS audio");
    }
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
  } catch (error) {
    console.error("TTS error:", error);
  }
};

// W useEffect wywołujemy asynchronicznie funkcję speakText po otrzymaniu wiadomości asystenta
useEffect(() => {
  if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === "assistant") {
      (async () => {
        await speakText(lastMessage.content);
      })();
    }
  }
}, [messages]);
  /**
   * Obsługa wysłania wiadomości przez użytkownika (lekarza).
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Dodaj wiadomość usera
    const userMsg: Message = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");

    setIsLoading(true);
    setIsGenerating(true);

    try {
      // Pomijamy pierwszą wiadomość pacjenta (PATIENT_MESSAGE)
      const conversationForBackend = newMessages.filter(
        (m) => m.content !== PATIENT_MESSAGE
      );

      const requestBody = {
        patient: patientName,
        case_study: CASE_STUDY,
        history: conversationForBackend.map((m) => ({
          type: m.role,
          message: m.content,
        })),
        last_message: userMsg.content,
      };

      // Fetch do backendu
      const response = await fetch("http://172.20.10.5:8000/api/webhook_form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        throw new Error("Błąd przy fetchu (handleSubmit).");
      }

      const data = await response.json();
      if (data.status === "error") {
        console.error("Błąd od AI (user submit):", data.response);
      } else {
        // Dodajemy odpowiedź asystenta
        const assistantMsg: Message = {
          role: "assistant",
          content: data.response || "(Brak odpowiedzi)",
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (error) {
      console.error("Błąd handleSubmit:", error);
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  /**
   * Funkcja "reload" – usuwa ostatnią wiadomość asystenta i ponawia zapytanie
   */
  async function reload() {
    if (messages.length < 2) return;
    setIsLoading(true);
    setIsGenerating(true);

    // Usuwamy ostatnią wiadomość asystenta:
    const newMessages = messages.slice(0, -1);

    try {
      const conversationForBackend = newMessages.filter(
        (m) => m.content !== PATIENT_MESSAGE
      );
      const lastUserContent =
        conversationForBackend[conversationForBackend.length - 1]?.content ||
        "";

      const requestBody = {
        patient: patientName,
        case_study: CASE_STUDY,
        history: conversationForBackend.map((m) => ({
          type: m.role,
          message: m.content,
        })),
        last_message: lastUserContent,
      };

      const response = await fetch("http://172.20.10.5:8000/api/webhook_form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        throw new Error("Błąd reloadu.");
      }

      const data = await response.json();
      if (data.status === "error") {
        console.error("Błąd reloadu:", data.response);
      } else {
        const assistantMsg: Message = {
          role: "assistant",
          content: data.response || "(Brak odpowiedzi)",
        };
        setMessages([...newMessages, assistantMsg]);
      }
    } catch (error) {
      console.error("Błąd reload:", error);
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  }

  /**
   * Obsługa klawisza Enter
   */
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isGenerating || isLoading || !input.trim()) return;
      handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
    }
  };

  /**
   * Kliknięcia w ikony (Copy/Refresh/Volume) w bąbelku asystenta
   */
  const handleActionClick = async (action: string, messageIndex: number) => {
    console.log("Kliknięto akcję:", action, "dla wiadomości nr:", messageIndex);
    if (action === "Refresh") {
      setIsGenerating(true);
      try {
        await reload();
      } catch (error) {
        console.error("Błąd reload:", error);
      } finally {
        setIsGenerating(false);
      }
    } else if (action === "Copy") {
      const message = messages[messageIndex];
      if (message?.role === "assistant") {
        navigator.clipboard.writeText(message.content);
      }
    }
    // "Volume" => TTS, itp.
  };

  // ---------------------------------------------
  // OBSŁUGA MIKROFONU
  // ---------------------------------------------
  const handleMicClick = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US"; // ustaw język na angielski
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
      console.log("Speech recognition started");
      // Możesz ustawić stan, jeśli chcesz zmienić wygląd przycisku
      setIsRecording(true);
    };
  
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log("Recognized speech:", transcript);
      // Ustawiamy rozpoznany tekst w polu input
      setInput(transcript);
    };
  
    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      alert("Speech recognition error: " + event.error);
    };
  
    recognition.onend = () => {
      console.log("Speech recognition ended");
      setIsRecording(false);
    };
  
    recognition.start();
  };
  
  return (
    <div className="flex items-center justify-center p-4">
      <main className="mt-6 flex h-[85vh] w-full max-w-6xl flex-col bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <h1 className="text-2xl font-bold p-4 text-white border-b border-slate-800">
          Chat with patient
        </h1>

        <div className="flex flex-1 overflow-y-hidden">
          {/* LEFT: Chat Column */}
          <div className="flex flex-col w-7/10">
            <div
              ref={messagesRef}
              className="flex-1 w-full overflow-y-auto py-4 px-4"
            >
              <ChatMessageList className="space-y-4">
                {messages.map((message, index) => (
                  <ChatBubble
                    key={index}
                    variant={
                      message.role === "assistant" ? "received" : "sent"
                    }
                    className={`
                      ${
                        message.role === "assistant"
                          ? "bg-slate-800 mr-auto"
                          : "bg-indigo-600 ml-auto"
                      }
                      rounded-[20px] max-w-[80%] shadow-lg flex items-center
                    `}
                  >
                    <ChatBubbleMessage className="text-white px-4 py-2.5 flex-1">
                      {message.content.split("```").map((part, i) => {
                        const isCodeBlock = i % 2 !== 0;
                        return isCodeBlock ? (
                          <pre key={i} className="whitespace-pre-wrap pt-2">
                            {part}
                          </pre>
                        ) : (
                          <Markdown key={i} remarkPlugins={[remarkGfm]}>
                            {part}
                          </Markdown>
                        );
                      })}

                      {/* Ikonki akcji (tylko dla ostatniego bąbelka asystenta) */}
                      {message.role === "assistant" &&
                        index === messages.length - 1 && (
                          <div className="flex items-center mt-1.5 gap-1">
                            {!isGenerating &&
                              ChatAiIcons.map((icon, iconIndex) => {
                                const IconComp = icon.icon;
                                return (
                                  <ChatBubbleAction
                                    key={iconIndex}
                                    variant="outline"
                                    className="size-5"
                                    icon={<IconComp className="size-3" />}
                                    onClick={() =>
                                      handleActionClick(icon.label, index)
                                    }
                                  />
                                );
                              })}
                          </div>
                        )}
                    </ChatBubbleMessage>
                  </ChatBubble>
                ))}

                {/* Bąbelek loadera w czasie generowania odpowiedzi */}
                {isGenerating && (
                  <ChatBubble
                    variant="received"
                    className="bg-slate-800 mr-auto rounded-[20px] max-w-[80%] shadow-lg flex items-center"
                  >
                    <ChatBubbleMessage
                      isLoading
                      className="text-white px-4 py-2.5 flex-1"
                    />
                  </ChatBubble>
                )}
              </ChatMessageList>
            </div>

            {/* Chat Input Box */}
            <div className="w-full px-4 pb-4">
              <div className="flex items-center gap-2 px-2 pb-2">
                {/* Przycisk "Attach file" */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg"
                >
                  <Paperclip className="size-5" />
                  <span className="sr-only">Attach file</span>
                </Button>

                {/* Przycisk mikrofonu */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleMicClick}
                  className={`h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg
                    ${isRecording ? "text-red-400 animate-pulse" : ""}
                  `}
                >
                  {!isRecording ? (
                    <Mic className="size-5" />
                  ) : (
                    <StopCircle className="size-5" />
                  )}
                  <span className="sr-only">
                    {isRecording ? "Stop recording" : "Use microphone"}
                  </span>
                </Button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="relative flex flex-col w-full border-0 bg-slate-800 shadow-[0_0_15px_rgba(0,0,0,0.3)] rounded-xl"
              >
                <ChatInput
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Type your message here..."
                  className="min-h-[60px] w-full resize-none bg-transparent py-[10px] pl-4 pr-14 text-white placeholder-slate-400 rounded-xl"
                />
                <Button
                  disabled={!input || isLoading}
                  type="submit"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-slate-700/50 disabled:opacity-50 rounded-lg"
                >
                  <CornerDownLeft className="size-5" />
                  <span className="sr-only">Send message</span>
                </Button>
              </form>
            </div>
          </div>

          {/* RIGHT: Patient Info Column */}
          <aside className="w-3/10 p-4 border-l border-slate-800 text-white flex flex-col items-center">
            <Image
              className="inline-flex w-32 h-32 object-cover rounded-full mb-4"
              src={Patient02}
              alt="Patient Photo"
            />
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">{patientName}</h2>
            </div>
            <div className="mt-8 ml-2">
              <p className="mb-1">Age: 63 years</p>
              <p className="mb-1">Blood type: O+</p>
              <p className="mb-1">Weight: 45 kg</p>
              <p className="mb-1">Height: 165 cm</p>
              <p className="mb-1">Allergies: Penicillin</p>
              <p className="mt-3 text-sm text-slate-400">
                Additional notes: <br />
                Patient has mild hypertension. Monitor blood pressure regularly
                and review medication compliance on next visit.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
