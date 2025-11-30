
import { NextResponse } from 'next/server';
import { authService } from '../../../../services/authService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json({ success: false, error: 'Refresh token is required' }, { status: 400 });
    }

    const result = await authService.refreshAccessToken(refreshToken);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof Error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    console.error('Refresh token error:', error);
    return NextResponse.json({ success: false, error: 'An internal server error occurred' }, { status: 500 });
  }
}
