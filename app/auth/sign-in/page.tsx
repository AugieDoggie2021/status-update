export const dynamic = "force-static";

export default function SignInStub() {
  return (
    <main className="min-h-screen grid place-items-center bg-gradient-to-br from-emerald-200/40 via-sky-100 to-white">
      <div className="rounded-2xl p-8 bg-white shadow-xl">
        <h1 className="text-2xl font-semibold">Sign-in route alive ✅</h1>
        <p className="text-slate-600 mt-2">
          This is a static stub to verify routing. If you can see this on Vercel, the route is working.
        </p>
      </div>
    </main>
  );
}
