"use client";

import React, { useEffect, useRef, useState } from "react";
import Patient02 from "@/public/images/patient_11.png";
import { useParams } from "next/navigation";
import Image from "next/image";

// Komponenty chat-ui (shadcn-chat):
import {
  ChatBubble,
  ChatBubbleAction,
  ChatBubbleAvatar,
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

// Markdown + składnia do wyświetlania kodu:
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Definiujemy sobie listę akcji (ikony) dostępnych na końcu wiadomości asystenta
const ChatAiIcons = [
  {
    icon: CopyIcon,
    label: "Copy",
  },
  {
    icon: RefreshCcw,
    label: "Refresh",
  },
  {
    icon: Volume2,
    label: "Volume",
  },
];

// Typy wiadomości
interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function PatientChatPage() {
  const { patientId } = useParams() as { patientId: string };
  const patientName = "Anna Novak";
  const [isGenerating, setIsGenerating] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Refs do przewijania i formularza
  const messagesRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Scroll do najnowszych wiadomości przy każdej zmianie tablicy messages
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  // Obsługa zmiany inputu
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  // Obsługa wysłania wiadomości
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setIsGenerating(true);

    const userMessage: Message = { role: "user", content: input };
    // Lokalne dopisanie wiadomości użytkownika
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      // Wywołanie backendu
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: messages,            // całe dotychczasowe wiadomości
          message: userMessage.content
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      const data = await response.json();

      // Obsługa "error"
      if (data.status === "error") {
        console.error("AI error:", data.response);
        // Możesz też wyświetlić komunikat w UI, np. setError(data.response)
      } else {
        // Domyślnie traktujemy "continue" i "finished" tak samo —
        // w obu przypadkach wstawiamy wiadomość asystenta
        const assistantMessage: Message = {
          role: "assistant",
          content: data.response,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("AI error:", error);
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  // Odswieżenie ostatniej wiadomości asystenta
  const reload = async () => {
    // Musimy mieć przynajmniej 2 wiadomości: user + asystent
    if (messages.length < 2) return;

    setIsLoading(true);
    setIsGenerating(true);

    // Usuwamy ostatnią wiadomość asystenta
    const newMessages = messages.slice(0, messages.length - 1);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: newMessages, // wysyłamy historię bez ostatniej odpowiedzi asystenta
          message: newMessages[newMessages.length - 1]?.content || ""
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      const data = await response.json();

      if (data.status === "error") {
        console.error("Error reloading:", data.response);
      } else {
        const assistantMessage: Message = {
          role: "assistant",
          content: data.response,
        };
        setMessages([...newMessages, assistantMessage]);
      }
    } catch (error) {
      console.error("Error reloading:", error);
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  // Podpinamy handleSubmit do onSubmit
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    handleSubmit(e);
  };

  // Obsługa klawisza Enter (z pominięciem SHIFT+Enter)
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isGenerating || isLoading || !input) return;
      setIsGenerating(true);
      onSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
    }
  };

  // Obsługa akcji przycisków (Copy/Refresh/Volume) przy wiadomościach
  const handleActionClick = async (action: string, messageIndex: number) => {
    console.log("Action clicked:", action, "on message index:", messageIndex);

    // Odśwież ostatnią odpowiedź
    if (action === "Refresh") {
      setIsGenerating(true);
      try {
        await reload();
      } catch (error) {
        console.error("Error reloading:", error);
      } finally {
        setIsGenerating(false);
      }
    }

    // Skopiuj treść wiadomości asystenta
    if (action === "Copy") {
      const message = messages[messageIndex];
      if (message && message.role === "assistant") {
        navigator.clipboard.writeText(message.content);
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* Główny kontener */}
      <main className="flex h-[85vh] w-full max-w-6xl flex-col bg-slate-900 rounded-xl border border-slate-800">
        {/* Nagłówek z ID pacjenta (pełna szerokość) */}
        <h1 className="text-2xl font-bold p-4 text-white border-b border-slate-800">
          Chat with patient
        </h1>

        {/* Główna sekcja: lewa (czat) + prawa (panel z info o pacjencie) */}
        <div className="flex flex-1">
          {/* Lewa kolumna: czat */}
          <div className="flex flex-col w-7/10">
            <div className="flex-1 w-full overflow-y-auto py-4 px-4" ref={messagesRef}>
              <ChatMessageList className="space-y-4">
                {messages.map((message, index) => (
                  <ChatBubble
                    key={index}
                    variant={message.role === "user" ? "sent" : "received"}
                    className={`
                      ${
                        message.role === "user"
                          ? "bg-indigo-600 ml-auto rounded-[20px]"
                          : "bg-slate-800 mr-auto rounded-[20px]"
                      }
                      max-w-[80%] shadow-lg flex items-center
                    `}
                  >
                    <ChatBubbleAvatar
                      src=""
                      fallback={message.role === "user" ? "👨🏽" : "🤖"}
                      className={`
                        ${
                          message.role === "user"
                            ? "order-last ml-3"
                            : "mr-3"
                        }
                        bg-slate-700 h-8 w-8 text-lg flex-shrink-0
                      `}
                    />
                    <ChatBubbleMessage className="text-white px-4 py-2.5 flex-1">
                      {/* Obsługa markdown + bloków kodu */}
                      {message.content.split("```").map((part, i) => {
                        const isCodeBlock = i % 2 !== 0;
                        if (!isCodeBlock) {
                          // Zwykły tekst
                          return (
                            <Markdown key={i} remarkPlugins={[remarkGfm]}>
                              {part}
                            </Markdown>
                          );
                        } else {
                          // Fragment kodu
                          return (
                            <pre className="whitespace-pre-wrap pt-2" key={i}>
                              {part}
                            </pre>
                          );
                        }
                      })}

                      {/* Ikony "Copy"/"Refresh"/"Volume" przy ostatniej wiadomości asystenta */}
                      {message.role === "assistant" &&
                        messages.length - 1 === index && (
                          <div className="flex items-center mt-1.5 gap-1">
                            {!isGenerating &&
                              ChatAiIcons.map((icon, iconIndex) => {
                                const IconComp = icon.icon;
                                return (
                                  <ChatBubbleAction
                                    variant="outline"
                                    className="size-5"
                                    key={iconIndex}
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

                {/* Pokazujemy bąbelek "isLoading" gdy AI generuje odpowiedź */}
                {isGenerating && (
                  <ChatBubble
                    variant="received"
                    className="bg-slate-800 mr-auto rounded-[20px] max-w-[80%] shadow-lg flex items-center"
                  >
                    <ChatBubbleAvatar
                      src=""
                      fallback="🤖"
                      className="mr-3 bg-slate-700 h-8 w-8 text-lg flex-shrink-0"
                    />
                    <ChatBubbleMessage
                      isLoading
                      className="text-white px-4 py-2.5 flex-1"
                    />
                  </ChatBubble>
                )}
              </ChatMessageList>
            </div>

            {/* Dolny box na prompt (pole do wpisywania) */}
            <div className="w-full px-4 pb-4">
              {/* Sekcja ikon */}
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
                  <span className="sr-only">Use Microphone</span>
                </Button>
              </div>

              <form
                ref={formRef}
                onSubmit={onSubmit}
                className="relative flex flex-col w-full border-0 bg-slate-800 shadow-[0_0_15px_rgba(0,0,0,0.3)] rounded-xl focus-within:ring-1 focus-within:ring-indigo-500"
              >
                <ChatInput
                  value={input}
                  onKeyDown={onKeyDown}
                  onChange={handleInputChange}
                  placeholder="Type your message here..."
                  className="min-h-[60px] w-full resize-none bg-transparent py-[10px] pl-4 pr-14 focus-visible:ring-0 text-white placeholder-slate-400 rounded-xl"
                />
                <Button
                  disabled={!input || isLoading}
                  type="submit"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-slate-700/50 disabled:opacity-50 rounded-lg"
                >
                  <CornerDownLeft className="size-5" />
                  <span className="sr-only">Send Message</span>
                </Button>
              </form>
            </div>
          </div>

          {/* Prawa kolumna: panel informacyjny pacjenta */}
          <aside className="w-3/10 p-4 border-l border-slate-800 text-white flex flex-col items-center">
            {/* Zdjęcie pacjenta (podmień src na własne) */}
            <Image
                className="inline-flex w-32 h-32 object-cover rounded-full mb-4"
                src={Patient02}
                alt="Workflow 02"
            />

            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">
                {patientName}
              </h2>
            </div>
            <div className="mt-8 ml-2">
              <p className="mb-1">Age: 63 yo</p>
              <p className="mb-1">Blood type: 0+</p>
              <p className="mb-1">Weight: 45 kg</p>
              <p className="mb-1">Height: 165 cm</p>
              <p className="mb-1">Allergies: Penicillin</p>
              <p className="mb-1">Last Check-Up: 2023-08-10</p>
              <p className="mt-3 text-sm text-slate-400">
                Additional notes: <br/> Patient has mild hypertension. 
                Monitor blood pressure regularly and review 
                medication compliance on next visit.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
