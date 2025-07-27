import { getCurrentUser } from "@/lib/auth";
import { getWhatsAppConnection } from "@/app/actions/chatbot";
import { QRCodeDisplay } from "../components/qr-code";

export default async function ChatbotConnectionPage() {
  const user = await getCurrentUser();
  const connection = await getWhatsAppConnection(user?.id);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Conexión de WhatsApp</h1>
      <p className="mb-6">
        Conecta tu cuenta de WhatsApp para activar el chatbot y empezar a
        automatizar tus conversaciones.
      </p>
      <QRCodeDisplay connection={connection} userId={user?.id} />
    </div>
  );
}