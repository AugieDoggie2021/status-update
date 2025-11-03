import { createClient } from "@/lib/supabase/server";

export default async function DebugAuth() {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();

  return (
    <pre className="p-4 text-sm">
      {JSON.stringify({ user, userErr }, null, 2)}
    </pre>
  );
}

