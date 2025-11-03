# Fix Magic Link Redirecting to Localhost

If magic link emails are redirecting to `http://localhost:3000` instead of your production URL, you need to update your Supabase dashboard settings.

## Quick Fix

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Update these settings:

### Site URL
```
https://status-update-kfhy.vercel.app
```

### Redirect URLs
Add both production and localhost (for development):
```
https://status-update-kfhy.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

5. Click **Save**

## Why This Happens

Supabase generates magic link emails using the **Site URL** setting, not just the `emailRedirectTo` parameter we pass in code. Even if the code passes the correct production URL, Supabase will still use its configured Site URL unless you update it.

## Verification

After updating:
1. Request a new magic link from the production site
2. Check the email - the link should now point to `https://status-update-kfhy.vercel.app/auth/callback?...`
3. Click the link - you should be redirected to your production dashboard

## Environment Variable

Also ensure `NEXT_PUBLIC_BASE_URL` is set in Vercel:
- Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- Add: `NEXT_PUBLIC_BASE_URL` = `https://status-update-kfhy.vercel.app`
- Redeploy after adding

