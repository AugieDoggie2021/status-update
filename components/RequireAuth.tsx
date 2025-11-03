import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";

export default async function RequireAuth({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/auth/sign-in");
  return <>{children}</>;
}


