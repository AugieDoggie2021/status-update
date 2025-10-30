import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function TroubleshootingPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Troubleshooting</h1>
        <p className="text-muted-foreground">
          Common issues and solutions for the Advisory Status Tracker
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>A. OpenAI 500 on /api/parse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm"><strong>Symptoms:</strong> API returns 500 error when parsing notes.</p>
          <p className="text-sm"><strong>Solutions:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-sm ml-4">
            <li>Ensure <code className="bg-muted px-1 rounded">OPENAI_API_KEY</code> is set in <code className="bg-muted px-1 rounded">.env.local</code> and restart dev server</li>
            <li>Check API key is valid and has sufficient credits</li>
            <li>If model is unsupported, the code automatically falls back to naive parser (you&apos;ll see <code className="bg-muted px-1 rounded">_fallback: true</code> in response)</li>
            <li>Check server logs for specific OpenAI error messages (without exposing secrets)</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>B. Supabase 500 on /api/apply-update</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm"><strong>Symptoms:</strong> Database writes fail, API returns 500.</p>
          <p className="text-sm"><strong>Solutions:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-sm ml-4">
            <li>Ensure <code className="bg-muted px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> is present in <code className="bg-muted px-1 rounded">.env.local</code> (server-side only)</li>
            <li>Verify enum alignment matches database schema:
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Status: <code className="bg-muted px-1 rounded">GREEN</code>, <code className="bg-muted px-1 rounded">YELLOW</code>, <code className="bg-muted px-1 rounded">RED</code></li>
                <li>Severity: <code className="bg-muted px-1 rounded">LOW</code>, <code className="bg-muted px-1 rounded">MEDIUM</code>, <code className="bg-muted px-1 rounded">HIGH</code></li>
                <li>Risk Status: <code className="bg-muted px-1 rounded">OPEN</code>, <code className="bg-muted px-1 rounded">MITIGATED</code>, <code className="bg-muted px-1 rounded">CLOSED</code></li>
                <li>Action Status: <code className="bg-muted px-1 rounded">OPEN</code>, <code className="bg-muted px-1 rounded">IN_PROGRESS</code>, <code className="bg-muted px-1 rounded">DONE</code></li>
              </ul>
            </li>
            <li>Check upsert logic: workstreams by <code className="bg-muted px-1 rounded">program_id + lower(name)</code>, risks/actions by <code className="bg-muted px-1 rounded">program_id + lower(title)</code></li>
            <li>Verify database schema matches <code className="bg-muted px-1 rounded">scripts/seed.sql</code></li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>C. Empty Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm"><strong>Symptoms:</strong> Dashboard loads but shows no workstreams.</p>
          <p className="text-sm"><strong>Solutions:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-sm ml-4">
            <li>Ensure <code className="bg-muted px-1 rounded">.env.local</code> has the correct <code className="bg-muted px-1 rounded">NEXT_PUBLIC_PROGRAM_ID</code> from seed.sql</li>
            <li>Verify seeded program exists: Run <code className="bg-muted px-1 rounded">SELECT * FROM programs WHERE id = &apos;YOUR-PROGRAM-ID&apos;;</code> in Supabase SQL Editor</li>
            <li>Restart dev server after changing environment variables (<code className="bg-muted px-1 rounded">npm run dev</code>)</li>
            <li>Check browser console for API errors</li>
            <li>Verify API route <code className="bg-muted px-1 rounded">/api/workstreams?programId=...</code> returns data</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>D. CORS/Base URL Issues</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm"><strong>Symptoms:</strong> Fetch errors, network failures in production.</p>
          <p className="text-sm"><strong>Solutions:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-sm ml-4">
            <li>Development: Set <code className="bg-muted px-1 rounded">NEXT_PUBLIC_BASE_URL="http://localhost:3000"</code> in <code className="bg-muted px-1 rounded">.env.local</code></li>
            <li>Production (Vercel): Set <code className="bg-muted px-1 rounded">NEXT_PUBLIC_BASE_URL="https://yourapp.vercel.app"</code> in Vercel environment variables</li>
            <li>Internal API calls use relative paths, so this mainly affects external integrations</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>E. Secret Leakage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm"><strong>Symptoms:</strong> Security concern about exposed keys.</p>
          <p className="text-sm"><strong>Verification:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-sm ml-4">
            <li>Search codebase: <code className="bg-muted px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> should <strong>only</strong> appear in:
              <ul className="list-disc list-inside ml-4 mt-1">
                <li><code className="bg-muted px-1 rounded">lib/supabase.ts</code> (server-side function)</li>
                <li>API route handlers (<code className="bg-muted px-1 rounded">app/api/**</code>) - server-side only</li>
              </ul>
            </li>
            <li>Never appears in:
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Client components (<code className="bg-muted px-1 rounded">app/**/page.tsx</code>, <code className="bg-muted px-1 rounded">components/**</code>)</li>
                <li>Client-side JavaScript bundles</li>
              </ul>
            </li>
            <li>To verify: Inspect browser Network tab, search for service role key → should not appear</li>
          </ul>
        </CardContent>
      </Card>

      <div className="pt-4">
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}

