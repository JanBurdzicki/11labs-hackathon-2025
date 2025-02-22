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

// Hook do obsługi chatu (zamiast `ai/react` -> `@ai-sdk/react`):
import { useChat } from "@ai-sdk/react";

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

  // Stan do kontrolowania "czy aktualnie generuje się odpowiedź"
  const [isGenerating, setIsGenerating] = useState(false);

  // Hook z biblioteki ai-sdk (lub innej) obsługujący chat
  const {
    messages,
    setMessages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    reload,
  } = useChat({
    onResponse(response) {
      if (response) {
        console.log("AI response:", response);
        setIsGenerating(false);
      }
    },
    onError(error) {
      console.error("AI error:", error);
      setIsGenerating(false);
    },
  });

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
    <main className="flex h-screen w-full max-w-3xl flex-col items-center mx-auto">
      {/* Nagłówek z ID pacjenta */}
      <h1 className="text-2xl font-bold mb-4">Chat with Patient {patientId}</h1>

      {/* Lista wiadomości */}
      <div className="flex-1 w-full overflow-y-auto py-6" ref={messagesRef}>
        <ChatMessageList>
          {/* Pierwszy komunikat powitalny, gdy brak wiadomości */}
          {messages.length === 0 && (
            <div className="w-full bg-background shadow-sm border rounded-lg p-8 flex flex-col gap-2">
              <h1 className="font-bold">Welcome to this example app.</h1>
              <p className="text-muted-foreground text-sm">
                This is a simple Next.JS example application created using{" "}
                <a
                  href="https://github.com/jakobhoeg/shadcn-chat"
                  className="font-bold inline-flex flex-1 justify-center gap-1 leading-4 hover:underline"
                >
                  shadcn-chat
                  <svg
                    aria-hidden="true"
                    height="7"
                    viewBox="0 0 6 6"
                    width="7"
                    className="opacity-70"
                  >
                    <path
                      d="M1.25215 5.54731L0.622742 4.9179L3.78169 1.75597H1.3834L1.38936 0.890915H5.27615V4.78069H4.40513L4.41109 2.38538L1.25215 5.54731Z"
                      fill="currentColor"
                    ></path>
                  </svg>
                </a>{" "}
                components. It uses{" "}
                <a
                  href="https://sdk.vercel.ai/"
                  className="font-bold inline-flex flex-1 justify-center gap-1 leading-4 hover:underline"
                >
                  Vercel AI SDK
                  <svg
                    aria-hidden="true"
                    height="7"
                    viewBox="0 0 6 6"
                    width="7"
                    className="opacity-70"
                  >
                    <path
                      d="M1.25215 5.54731L0.622742 4.9179L3.78169 1.75597H1.3834L1.38936 0.890915H5.27615V4.78069H4.40513L4.41109 2.38538L1.25215 5.54731Z"
                      fill="currentColor"
                    ></path>
                  </svg>
                </a>{" "}
                for the AI integration. Build chat interfaces like this at
                lightspeed with shadcn-chat.
              </p>
              <p className="text-muted-foreground text-sm">
                Make sure to also checkout the shadcn-chat support component at
                the bottom right corner.
              </p>
            </div>
          )}

          {/* Właściwe wiadomości */}
          {messages.map((message, index) => (
            <ChatBubble
              key={index}
              variant={message.role === "user" ? "sent" : "received"}
            >
              <ChatBubbleAvatar
                src=""
                fallback={message.role === "user" ? "👨🏽" : "🤖"}
              />
              <ChatBubbleMessage>
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

          {/* Gdy generuje się nowa odpowiedź, pokaż "isLoading" */}
          {isGenerating && (
            <ChatBubble variant="received">
              <ChatBubbleAvatar src="" fallback="🤖" />
              <ChatBubbleMessage isLoading />
            </ChatBubble>
          )}
        </ChatMessageList>
      </div>

      {/* Pole do wpisywania wiadomości na dole */}
      <div className="w-full px-4 pb-4">
        <form
          ref={formRef}
          onSubmit={onSubmit}
          className="relative rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring"
        >
          <ChatInput
            value={input}
            onKeyDown={onKeyDown}
            onChange={handleInputChange}
            placeholder="Type your message here..."
            className="rounded-lg bg-background border-0 shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center p-3 pt-0">
            <Button variant="ghost" size="icon">
              <Paperclip className="size-4" />
              <span className="sr-only">Attach file</span>
            </Button>

            <Button variant="ghost" size="icon">
              <Mic className="size-4" />
              <span className="sr-only">Use Microphone</span>
            </Button>

            <Button
              disabled={!input || isLoading}
              type="submit"
              size="sm"
              className="ml-auto gap-1.5"
            >
              Send Message
              <CornerDownLeft className="size-3.5" />
            </Button>
          </div>
        </form>

        {/* Stopka z linkiem do GitHuba */}
        <div className="pt-4 flex gap-2 items-center justify-center">
          <p className="text-xs">
            <a
              href="https://github.com/jakobhoeg/shadcn-chat"
              className="font-bold inline-flex flex-1 justify-center gap-1 leading-4 hover:underline"
            >
              shadcn-chat
              <svg
                aria-hidden="true"
                height="7"
                viewBox="0 0 6 6"
                width="7"
                className="opacity-70"
              >
                <path
                  d="M1.25215 5.54731L0.622742 4.9179L3.78169 1.75597H1.3834L1.38936 0.890915H5.27615V4.78069H4.40513L4.41109 2.38538L1.25215 5.54731Z"
                  fill="currentColor"
                ></path>
              </svg>
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
