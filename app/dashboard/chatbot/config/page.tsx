import { getBusinessInfo } from "@/app/actions/chatbot";
import { getCurrentUser } from "@/lib/auth";
import { BusinessInfo } from "../components/business-info";

export default async function ChatbotConfigPage() {
  const user = await getCurrentUser();
  const businessInfo = await getBusinessInfo(user?.id);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Configuración del Negocio</h1>
      <p className="mb-6">
        Esta información será utilizada por el chatbot para responder a las preguntas de tus clientes.
      </p>
      <BusinessInfo businessInfo={businessInfo} />
    </div>
  );
}