import { getAutomationRules } from "@/app/actions/chatbot";
import { getCurrentUser } from "@/lib/auth";
import { AutomationList } from "../components/automation-list";

export default async function AutomationsPage() {
  const user = await getCurrentUser();
  const rules = await getAutomationRules(user?.id);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Automatizaciones</h1>
      <p className="mb-6">
        Crea reglas para automatizar tus conversaciones y acciones de marketing.
      </p>
      <AutomationList rules={rules} />
    </div>
  );
}