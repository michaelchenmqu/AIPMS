import { ReactNode } from "react";
import { requireContractorScope } from "@/lib/contractor";
import ContractorShell from "@/components/contractor/ContractorShell";

export default async function ContractorLayout({ children }: { children: ReactNode }) {
  const { contractor } = await requireContractorScope();
  return <ContractorShell contractorName={contractor.name}>{children}</ContractorShell>;
}
