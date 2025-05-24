// app/dashboard/page.tsx (Server Component version)

import ClientDashboard from "@/app/components/ClientDashboard";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    // You might want to redirect or show an error message
    return <p>Access Denied. Please sign in.</p>;
  }

  return <ClientDashboard initialSession={session} />;
}
