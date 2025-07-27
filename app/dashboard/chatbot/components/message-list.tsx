
'use client'

import { Card, CardContent } from "@/components/ui/card";

export function MessageList({ messages }: { messages: any[] }) {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.is_from_bot ? "justify-start" : "justify-end"}`}>
            <div
              className={`px-4 py-2 rounded-lg max-w-xs lg:max-w-md ${message.is_from_bot
                  ? "bg-gray-200 text-gray-900"
                  : "bg-blue-600 text-white"
                }`}>
              <p>{message.message_text}</p>
              <p className="text-xs text-right mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
