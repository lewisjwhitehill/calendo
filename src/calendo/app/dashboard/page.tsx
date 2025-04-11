// app/dashboard/page.tsx

"use client"; // Required for using React hooks like `useSession`

import { getUserSession } from '@/lib/session';

export default function Dashboard() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <p>Loading...</p>;
  }

  if (!session) {
    return (
      <div>
        <p>You must be signed in to view the dashboard.</p>
        <a href="/api/auth/signin">Sign in</a>
      </div>
    );
  }

  return (
    <div>
      <h1>Welcome to your Dashboard, {session.user?.name}!</h1>
      <p>Email: {session.user?.email}</p>
      <img src={session.user?.image || ""} alt="Profile" />
    </div>
  );
}
