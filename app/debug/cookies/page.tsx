"use client";

import { useEffect, useState } from "react";

/**
 * Diagnostic page to inspect cookies and their attributes
 * Visit /debug/cookies to see all cookies with their attributes
 */
export default function DebugCookiesPage() {
  const [cookieInfo, setCookieInfo] = useState<Array<{
    name: string;
    value: string;
    attributes: string;
  }>>([]);

  useEffect(() => {
    // Read all cookies from document.cookie
    const cookies = document.cookie.split(';').map(c => c.trim()).filter(Boolean);
    
    // Get cookie details from DevTools API if available
    const cookieDetails = cookies.map(cookie => {
      const [name, ...rest] = cookie.split('=');
      const value = rest.join('=');
      
      // Try to get cookie attributes (browser may not expose all)
      // Note: document.cookie doesn't expose attributes, only name=value
      // We'd need to check DevTools Application tab for full attributes
      
      return {
        name: name.trim(),
        value: decodeURIComponent(value),
        attributes: 'Check DevTools → Application → Cookies for full attributes'
      };
    });

    setCookieInfo(cookieDetails);
  }, []);

  const pkceCookies = cookieInfo.filter(c => 
    c.name.toLowerCase().includes('verifier') ||
    c.name.toLowerCase().includes('code-verifier') ||
    c.name.toLowerCase().includes('code_verifier')
  );

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Cookie Diagnostics</h1>
      
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="font-semibold mb-2">⚠️ Important:</p>
        <p className="text-sm">
          This page shows cookies from <code>document.cookie</code>, which only shows name=value pairs.
          To see full cookie attributes (SameSite, Secure, Domain, Path), open DevTools → Application → Cookies.
        </p>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">PKCE Cookies ({pkceCookies.length})</h2>
        {pkceCookies.length > 0 ? (
          <div className="space-y-2">
            {pkceCookies.map((cookie, i) => (
              <div key={i} className="p-3 bg-green-50 border border-green-200 rounded">
                <div className="font-mono text-sm">
                  <strong>Name:</strong> {cookie.name}
                </div>
                <div className="font-mono text-xs text-gray-600 mt-1">
                  <strong>Value:</strong> {cookie.value.substring(0, 50)}...
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {cookie.attributes}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-red-600">❌ No PKCE cookies found</p>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">All Cookies ({cookieInfo.length})</h2>
        {cookieInfo.length > 0 ? (
          <div className="space-y-2">
            {cookieInfo.map((cookie, i) => (
              <div key={i} className="p-3 bg-gray-50 border border-gray-200 rounded">
                <div className="font-mono text-sm">
                  <strong>Name:</strong> {cookie.name}
                </div>
                <div className="font-mono text-xs text-gray-600 mt-1">
                  <strong>Value:</strong> {cookie.value.substring(0, 100)}
                  {cookie.value.length > 100 && '...'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No cookies found</p>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-semibold mb-2">How to Check Cookie Attributes:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Open Chrome DevTools (F12)</li>
          <li>Go to Application tab</li>
          <li>Click "Cookies" in the left sidebar</li>
          <li>Select your domain</li>
          <li>Check each cookie's attributes:
            <ul className="list-disc list-inside ml-4 mt-1">
              <li><strong>SameSite:</strong> Should be "None" for OAuth</li>
              <li><strong>Secure:</strong> Should be checked (✓) in production</li>
              <li><strong>Path:</strong> Should be "/"</li>
              <li><strong>Domain:</strong> Should match your domain</li>
            </ul>
          </li>
        </ol>
      </div>
    </main>
  );
}

