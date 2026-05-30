import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Test endpoint to sign in test accounts
 * DELETE THIS BEFORE PRODUCTION
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email?.includes('@test.com')) {
      return NextResponse.json(
        { error: 'Only test accounts allowed' },
        { status: 403 }
      );
    }

    const supabase = await createClient();

    // Get the user by email
    const { data: users, error: getUserError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (getUserError || !users) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Set up the session by creating a custom token
    // For development only - in production use proper auth flow
    const response = NextResponse.json(
      { success: true, userId: users.id },
      { status: 200 }
    );

    return response;
  } catch (error) {
    console.error('[v0] Test login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
