"use client";

import React, { useEffect, useRef, useState } from "react";
import Patient02 from "@/public/images/patient_11.png";
import { useParams } from "next/navigation";
import Image from "next/image";

// Komponenty chat-ui (shadcn-chat):
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

// Markdown + składnia do wyświetlania kodu:
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Define actions (icons) for assistant messages
const ChatAiIcons = [
  { icon: CopyIcon, label: "Copy" },
  { icon: RefreshCcw, label: "Refresh" },
  { icon: Volume2, label: "Volume" },
];

export default function PatientChatPage() {
  // In case you still want an ID from route
  const { patientId } = useParams() as { patientId: string };
  // Demo name for the patient
  const patientName = "Anna Novak";

  // States
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Refs
  const messagesRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false); // to ensure we run the initial case only once
  const formRef = useRef<HTMLFormElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  // 1. On mount, add an initial patient message that includes a short case study
  //    Then automatically send it to the backend to get the assistant’s first answer.
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      initializeChatWithCaseStudy();
    }
  }, []);

  /**
   * Initializes the conversation by:
   *  - Creating a user (patient) message with a case study
   *  - Sending that message to backend to immediately get the AI's answer
   */
  async function initializeChatWithCaseStudy() {
    // Example case study text
    const caseStudyText = `
Hello, I'm Anna Novak. I'm 63 years old and have been experiencing a mild cough for the past 5 days. 
I also have a slight fever (around 37.8°C) and occasional headaches. I'm worried it might be the flu 
or something more serious. I also have mild hypertension, so I'm cautious about any new symptoms.
Could you help me figure out what I should do next?
    `.trim();

    // Create the initial user message
    const initialUserMessage: Message = {
      role: "patient",
      content: caseStudyText,
    };

    // Put it into our local messages state
    setMessages([initialUserMessage]);

    // Immediately send it to backend
    setIsLoading(true);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: [], // no previous messages
          message: caseStudyText,
        }),
      });
      if (!response.ok) throw new Error("Failed to fetch initial response");

      const data = await response.json();

      if (data.status === "error") {
        console.error("Error from AI:", data.response);
        // You might show an error message in the UI
      } else {
        // If "continue" or "finished", we treat them the same: add AI's response
        const assistantMessage: Message = {
          role: "assistant",
          content: data.response,
        };
        setMessages([initialUserMessage, assistantMessage]);
      }
    } catch (error) {
      console.error("Error sending initial case study:", error);
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  }

  // Handle normal user input
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  // Handle normal form submission (user typed a new message)
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setIsGenerating(true);

    // 1. Add user message locally
    const userMessage: Message = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");

    try {
      // 2. Send new messages array to backend
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: newMessages,
          message: userMessage.content,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      const data = await response.json();

      if (data.status === "error") {
        console.error("AI error:", data.response);
      } else {
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

  // Handle Enter (without SHIFT) as "send message"
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isGenerating || isLoading || !input) return;
      handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
    }
  };

  // Reload last assistant message
  async function reload() {
    if (messages.length < 2) return;

    setIsLoading(true);
    setIsGenerating(true);

    // Drop the last assistant message
    const newMessages = messages.slice(0, messages.length - 1);

    try {
      const lastUserContent =
        newMessages[newMessages.length - 1]?.content || "";
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: newMessages,
          message: lastUserContent,
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
  }

  // Handle icons (copy / refresh / volume) on assistant bubble
  const handleActionClick = async (action: string, messageIndex: number) => {
    console.log("Action clicked:", action, "on message index:", messageIndex);

    if (action === "Refresh") {
      setIsGenerating(true);
      try {
        await reload();
      } catch (error) {
        console.error("Error reloading:", error);
      } finally {
        setIsGenerating(false);
      }
    } else if (action === "Copy") {
      const message = messages[messageIndex];
      if (message?.role === "assistant") {
        navigator.clipboard.writeText(message.content);
      }
    }
    // "Volume" could trigger TTS or similar
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* Outer container */}
      <main className="flex h-[85vh] w-full max-w-6xl flex-col bg-slate-900 rounded-xl border border-slate-800">
        {/* Header (full width) */}
        <h1 className="text-2xl font-bold p-4 text-white border-b border-slate-800">
          Chat with patient
        </h1>

        {/* Main content: left (chat) + right (patient info) */}
        <div className="flex flex-1">
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
                      // We check if the role is "assistant" OR "patient" => "received"
                      variant={
                        message.role === "assistant" || message.role === "patient"
                          ? "received"
                          : "sent"
                      }
                      className={`
                        ${
                          message.role === "assistant" || message.role === "patient"
                            ? "bg-slate-800 mr-auto rounded-[20px]"
                            : "bg-indigo-600 ml-auto rounded-[20px]"
                        }
                        max-w-[80%] shadow-lg flex items-center
                      `}
                    >
                    <ChatBubbleMessage className="text-white px-4 py-2.5 flex-1">
                      {/* Handle markdown + code blocks */}
                      {message.content.split("```").map((part, i) => {
                        const isCodeBlock = i % 2 !== 0;
                        return isCodeBlock ? (
                          <pre
                            key={i}
                            className="whitespace-pre-wrap pt-2"
                          >
                            {part}
                          </pre>
                        ) : (
                          <Markdown key={i} remarkPlugins={[remarkGfm]}>
                            {part}
                          </Markdown>
                        );
                      })}

                      {/* Icons (Copy, Refresh, Volume) on the last assistant message */}
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

                {/* Loading bubble while assistant is "thinking" */}
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
                ref={formRef}
                onSubmit={handleSubmit}
                className="relative flex flex-col w-full border-0 bg-slate-800 shadow-[0_0_15px_rgba(0,0,0,0.3)] rounded-xl focus-within:ring-1 focus-within:ring-indigo-500"
              >
                <ChatInput
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={onKeyDown}
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
              <p className="mb-1">Last Check-Up: 2023-08-10</p>
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
