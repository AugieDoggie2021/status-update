export async function apiJson<T = any>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('API error', url, res.status, text);
    if (url.includes('/workstreams') || url.includes('/risks') || url.includes('/actions')) {
      return [] as any;
    }
    throw new Error(`API ${res.status}`);
  }
  return res.json();
}


