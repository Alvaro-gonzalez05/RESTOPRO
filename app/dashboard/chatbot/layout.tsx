import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Link from "next/link";

export default function ChatbotLayout({ children }: { children: React.ReactNode }) {
  return (
    <Tabs defaultValue="conexion">
      <TabsList>
        <TabsTrigger value="conexion" asChild>
          <Link href="/dashboard/chatbot/conexion">Conexión</Link>
        </TabsTrigger>
        <TabsTrigger value="negocio" asChild>
          <Link href="/dashboard/chatbot/config">Mi Negocio</Link>
        </TabsTrigger>
        <TabsTrigger value="ia" asChild>
          <Link href="/dashboard/chatbot/ai-config">Configuración IA</Link>
        </TabsTrigger>
        <TabsTrigger value="mensajes" asChild>
          <Link href="/dashboard/chatbot/messages">Mensajes</Link>
        </TabsTrigger>
        <TabsTrigger value="automatizaciones" asChild>
          <Link href="/dashboard/chatbot/automations">Automatizaciones</Link>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="conexion">{children}</TabsContent>
      <TabsContent value="negocio">{children}</TabsContent>
      <TabsContent value="ia">{children}</TabsContent>
      <TabsContent value="mensajes">{children}</TabsContent>
      <TabsContent value="automatizaciones">{children}</TabsContent>
    </Tabs>
  );
}