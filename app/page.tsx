import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';

export default async function Home() {
  // Check if user is already signed in
  const session = await getServerSession();
  
  if (session) {
    // User is signed in - redirect to dashboard
    redirect('/dashboard');
  }

  // User not signed in - redirect to sign-in page
  redirect('/auth/sign-in');
}
