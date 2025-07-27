
import { glob } from "glob";
import { redirect } from "next/navigation";

export default async function ChatbotMessagesPage() {
  const conversations = await glob("conversations/*.json");

  if (conversations.length > 0) {
    const latestConversation = conversations.sort().pop();
    if (latestConversation) {
      const conversationId = latestConversation.split("/").pop()?.replace(".json", "");
      redirect(`/dashboard/chatbot/messages/${conversationId}`);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Conversaciones</h1>
      <p>No hay conversaciones disponibles.</p>
    </div>
  );
}
