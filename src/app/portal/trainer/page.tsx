import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import TrainerChat from "./TrainerChat";

export default async function TrainerPage() {
  const user = await getSessionUser();
  const messages = user
    ? await prisma.chatMessage.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } })
    : [];

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="AI Trainer"
        subtitle="Onboard a property, draft pricing, or ask how AIPMS billing & AI features work."
      />
      <TrainerChat
        initialMessages={messages.map((m) => ({ id: m.id, role: m.role, content: m.content }))}
      />
    </div>
  );
}
