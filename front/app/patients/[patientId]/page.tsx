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
} from "lucide-react";

// Markdown (do obsługi bloczków kodu):
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ----- KONFIGURACJA ------------------------------------------------

// Stały tekst pacjenta (wyświetlamy go w UI, ale nie wysyłamy do backendu):
const PATIENT_MESSAGE = `
Hello, I'm Anna Novak. I'm 63 years old and have been experiencing a mild cough for the past 5 days. 
I also have a slight fever (around 37.8°C) and occasional headaches. I'm worried it might be the flu 
or something more serious. I also have mild hypertension, so I'm cautious about any new symptoms.
Could you help me figure out what I should do next?
`.trim();

// Stały case study (wysyłany do backendu w polu `case_study` za każdym razem):
const CASE_STUDY = PATIENT_MESSAGE; 
// (Możesz dać identyczny tekst albo inny – w zależności od wymagań)

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
  // W tym przykładzie rola pacjenta nie jest dalej wysyłana do backendu,
  // więc używamy formy "assistant" / "user" – a pacjenta potraktujemy jako
  // osobny, "statyczny" bąbelek (zrobimy go tylko do wyświetlenia).
  //
  // Inna opcja: dodać "patient" do typów i rozróżnić w UI.
  // Na potrzeby przykładu wystarczy "assistant" / "user".
  // Ale tutaj zrobimy "assistant" = pacjent, żeby mieć inny styl bąbelka niż user.
  //
  // Uwaga: jeśli wolisz wyróżnić to jako "patient", musisz dodać trzeci typ
  //        i w stylach obsłużyć je podobnie do "assistant".
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant", // tak stylujemy w UI na bąbelek po lewej
      content: PATIENT_MESSAGE,
    },
  ]);

  // Tekst w polu input
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Ref do scrollowania
  const messagesRef = useRef<HTMLDivElement>(null);

  // Scroll do dołu przy każdej zmianie "messages"
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  /**
   * Obsługa wysłania wiadomości przez użytkownika (lekarza).
   * - Dodajemy wiadomość "user" do stanu
   * - Wysyłamy zapytanie do backendu: case_study + historia (user, assistant – ale bez tego „pacjenta” startowego)
   * - Odbieramy odpowiedź i dodajemy do stanu jako "assistant"
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
      // Filtrujemy historię tak, aby pominąć TYLKO bąbelek pacjenta „startowy”.
      // Zakładamy, że to ten, który ma w content = PATIENT_MESSAGE.
      // Albo sprawdzamy, że to jest `index === 0`.
      //
      // Jeśli wolisz, możesz w ogóle trzymać w state osobno "staticPatientMsg"
      // i "messages" – wtedy nie musisz nic filtrować w fetchu.
      const conversationForBackend = newMessages.filter(
        (m) => m.content !== PATIENT_MESSAGE // pomijamy pacjenta startowego
      );

      // Budujemy body:
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
      // Załóżmy, że mamy { status: "success", response: "Treść AI" }
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
   * Funkcja "reload" – w razie potrzeby usuwa ostatnią wiadomość asystenta i ponawia zapytanie.
   * (Przykład funkcji; jeśli nie używasz tej logiki, możesz ją usunąć.)
   */
  async function reload() {
    if (messages.length < 2) return; // Nie ma co usuwać

    setIsLoading(true);
    setIsGenerating(true);

    // Usuwamy ostatnią wiadomość asystenta:
    const newMessages = messages.slice(0, -1);

    try {
      // Ostatnia wypowiedź usera jest teraz newMessages[newMessages.length - 1].
      // Filtrujemy, żeby pominąć pierwszą pacjenta, jeśli tam jest.
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
   * Gdy user naciśnie Enter (bez Shift) w polu tekstowym, wyślij wiadomość.
   */
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isGenerating || isLoading || !input) return;
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
                    // "assistant" => bąbelek 'received', "user" => 'sent'
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg"
                >
                  <Paperclip className="size-5" />
                  <span className="sr-only">Attach file</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg"
                >
                  <Mic className="size-5" />
                  <span className="sr-only">Use microphone</span>
                </Button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="relative flex flex-col w-full border-0 bg-slate-800 shadow-[0_0_15px_rgba(0,0,0,0.3)] rounded-xl"
              >
                <ChatInput
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!isGenerating && !isLoading && input.trim()) {
                        handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
                      }
                    }
                  }}
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
