
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { AiConfig } from "../components/ai-config";

export default async function ChatbotAiConfigPage() {
  const user = await getCurrentUser();
  const userId = user?.id;

  let initialConfig = null;
  if (userId) {
    const [config] = await sql(`SELECT * FROM user_bots WHERE user_id = $1`, [userId]);
    initialConfig = config;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Configuración de IA del Chatbot</h1>
      <p className="mb-6">
        Personaliza el comportamiento de la inteligencia artificial de tu chatbot.
      </p>
      <AiConfig initialConfig={initialConfig} userId={userId} />
    </div>
  );
}
