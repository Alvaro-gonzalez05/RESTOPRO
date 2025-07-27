
import { glob } from "glob";
import { readFile } from "fs/promises";
import path from "path";
import { MessageList } from "@/app/dashboard/chatbot/components/message-list";

export async function generateStaticParams() {
  const conversations = await glob("conversations/*.json");
  return conversations.map((conversation) => ({
    id: path.basename(conversation, ".json"),
  }));
}

async function getConversation(id: string) {
  try {
    const filePath = path.join(process.cwd(), "conversations", `${id}.json`);
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

export default async function ChatbotConversationPage({ params }: { params: { id: string } }) {
  const conversation = await getConversation(params.id);

  if (!conversation) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Conversación no encontrada</h1>
        <p>La conversación que buscas no existe o ha sido eliminada.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Conversación con {conversation.customer_phone}</h1>
      <MessageList messages={conversation.messages} />
    </div>
  );
}
