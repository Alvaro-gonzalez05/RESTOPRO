
import { getWhatsAppConnection, getUserBotConfig, getBusinessInfo } from "@/app/actions/chatbot";
import { getCurrentUser } from "@/lib/auth";
import { ChatbotDashboardClient } from "./components/chatbot-client";
import { redirect } from 'next/navigation';

// Este es el componente de página principal que se renderiza en el servidor
export default async function ChatbotPage() {
  const user = await getCurrentUser();
  
  // Redirigir si no hay usuario es una buena práctica
  if (!user) {
    redirect('/login');
  }
  
  const initialConnection = await getWhatsAppConnection(user.id);
  const businessInfo = await getBusinessInfo(user.id);
  const userBotConfig = await getUserBotConfig(user.id);

  return <ChatbotDashboardClient initialConnection={initialConnection} userId={user.id} businessInfo={businessInfo} userBotConfig={userBotConfig} />;
}

