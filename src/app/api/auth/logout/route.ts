
import { NextResponse } from 'next/server';
import { authService } from '../../../../services/authService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json({ success: false, error: 'Refresh token is required' }, { status: 400 });
    }

    await authService.logout(refreshToken);

    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ success: false, error: 'An internal server error occurred' }, { status: 500 });
  }
}
