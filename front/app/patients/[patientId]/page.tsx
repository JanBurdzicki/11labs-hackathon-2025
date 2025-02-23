"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

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

export default function PatientChatPage() {
  const { patientId } = useParams() as { patientId: string };
  const [isGenerating, setIsGenerating] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  if (!input.trim() || isLoading) return;

  setIsLoading(true);
  setIsGenerating(true);

  // Add user message immediately
  const userMessage: Message = { role: 'user', content: input };
  setMessages(prev => [...prev, userMessage]);
  setInput('');

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [...messages, userMessage],
        patientId
      }),
    });

    if (!response.ok) throw new Error('Failed to fetch response');

    const data = await response.json();
    const assistantMessage: Message = { role: 'assistant', content: data.content };
    setMessages(prev => [...prev, assistantMessage]);
  } catch (error) {
    console.error('AI error:', error);
  } finally {
    setIsLoading(false);
    setIsGenerating(false);
  }};

  // Reload/regenerate last response
  const reload = async () => {
    if (messages.length < 2) return;

    setIsLoading(true);
    setIsGenerating(true);

    // Remove last assistant message
    const lastUserMessageIndex = messages.length - 2;
    const newMessages = messages.slice(0, messages.length - 1);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          patientId
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch response');

      const data = await response.json();
      const assistantMessage: Message = { role: 'assistant', content: data.content };
      setMessages([...newMessages, assistantMessage]);
    } catch (error) {
      console.error('Error reloading:', error);
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  // Refy do przewijania wiadomości i do formularza
  const messagesRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Scrollujemy do najnowszych wiadomości
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  // Obsługa wysłania wiadomości
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsGenerating(true);
    handleSubmit(e);
  };

  // Obsługa klawisza Enter (z pominięciem SHIFT+Enter)
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Nie wysyłaj, jeśli AI generuje odpowiedź, trwa loading, lub brak inputu
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
      <main className="flex h-[85vh] w-full max-w-6xl flex-col bg-slate-900 rounded-xl border border-slate-800">
        {/* Nagłówek z ID pacjenta */}
        <h1 className="text-2xl font-bold p-4 text-white border-b border-slate-800">Chat with Patient {patientId}</h1>

        {/* Lista wiadomości */}
        <div className="flex-1 w-full overflow-y-auto py-4 px-4" ref={messagesRef}>
          <ChatMessageList className="space-y-4">
            {messages.map((message, index) => (
              <ChatBubble
                key={index}
                variant={message.role === "user" ? "sent" : "received"}
                className={`
                  ${message.role === "user"
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
                    ${message.role === "user" ? "order-last ml-3" : "mr-3"}
                    bg-slate-700 h-8 w-8 text-lg flex-shrink-0
                  `}
                />
                <ChatBubbleMessage className="text-white px-4 py-2.5 flex-1">
                  {/* Obsługa markdown + bloków kodu */}
                  {message.content.split("```").map((part, i) => {
                    // Co drugi fragment jest kodem
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
                        </pre>
                      );
                    }
                  })}

                  {/* Ikony "Copy"/"Refresh"/"Volume" przy ostatniej wiadomości asystenta */}
                  {message.role === "assistant" && messages.length - 1 === index && (
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
                              onClick={() => handleActionClick(icon.label, index)}
                            />
                          );
                        })}
                    </div>
                  )}
                </ChatBubbleMessage>
              </ChatBubble>
            ))}

            {isGenerating && (
              <ChatBubble variant="received" className="bg-slate-800 mr-auto rounded-[20px] max-w-[80%] shadow-lg flex items-center">
                <ChatBubbleAvatar src="" fallback="🤖" className="mr-3 bg-slate-700 h-8 w-8 text-lg flex-shrink-0" />
                <ChatBubbleMessage isLoading className="text-white px-4 py-2.5 flex-1" />
              </ChatBubble>
            )}
          </ChatMessageList>
        </div>

        {/* Bottom prompt box */}
        <div className="w-full px-4 pb-4">
          {/* Icons section */}
          <div className="flex items-center gap-2 px-2 pb-2">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg">
              <Paperclip className="size-5" />
              <span className="sr-only">Attach file</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg">
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
      </main>
    </div>
  );
}
