import { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
    ownerId: string | null;
    contractorId: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      ownerId: string | null;
      contractorId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    ownerId: string | null;
    contractorId: string | null;
  }
}
