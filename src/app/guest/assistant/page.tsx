import { requireGuestScope } from "@/lib/guest";
import { prisma } from "@/lib/prisma";
import GuestShell from "@/components/guest/GuestShell";
import GuestAssistantChat from "./GuestAssistantChat";

export default async function GuestAssistantPage() {
  const { reservation, property } = await requireGuestScope();

  const messages = await prisma.guestChatMessage.findMany({
    where: { reservationId: reservation.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <GuestShell title={`${property.name} · Assistant`} activeHref="/guest/assistant">
      <GuestAssistantChat
        propertyName={property.name}
        initialMessages={messages.map((m) => ({ id: m.id, role: m.role, content: m.content }))}
      />
    </GuestShell>
  );
}
