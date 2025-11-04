import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

/**
 * GET /api/debug/session
 * Returns the current session (redacts sensitive tokens)
 * Useful for debugging authentication issues
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json(
        { session: null },
        { status: 200 }
      );
    }

    // Redact sensitive tokens
    const safeSession = {
      user: {
        id: session.user.id,
        email: session.user.email,
        // Redact access_token, refresh_token, etc.
        ...(session.user.app_metadata && { app_metadata: session.user.app_metadata }),
        ...(session.user.user_metadata && { user_metadata: session.user.user_metadata }),
      },
      // Don't expose session tokens
    };

    return NextResponse.json({ session: safeSession });
  } catch (error) {
    console.error('[GET /api/debug/session] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get session', session: null },
      { status: 500 }
    );
  }
}

