import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  // Check if user is already signed in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // User is signed in - redirect to dashboard
    redirect('/dashboard');
  }

  // User not signed in - redirect to sign-in page
  redirect('/auth/sign-in');
}
