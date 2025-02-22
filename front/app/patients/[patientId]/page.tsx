"use client"

import { FC } from "react";
import { useChat } from "@ai-sdk/react"

import { Chat } from "@/components/ui/chat"

interface PatientChatPageProps {
  params: {
    patientId: string;
  };
}

const PatientChatPage: FC<PatientChatPageProps> = ({ params }) => {
  const { patientId } = params;
  const { messages, input, handleInputChange, handleSubmit, isLoading, stop } =  useChat()


  return (
    <section className="mx-auto max-w-2xl p-4">
      <h1 className="text-2xl font-bold mb-4">Chat with Patient {patientId}</h1>
        <Chat
          messages={messages}
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isGenerating={isLoading}
          stop={stop}
        />
    </section>
  );
};

export default PatientChatPage;
