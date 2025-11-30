
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '../../../../middleware/auth';
import { userService } from '../../../../services/userService'; // Assuming a user service exists to fetch user details

async function meHandler(request: AuthenticatedRequest) {
  try {
    const userId = request.user!.userId;
    // It's better to fetch fresh user data from the DB
    // The token data could be stale
    const user = await userService.getUserById(userId);

    if (!user) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('Me endpoint error:', error);
    return NextResponse.json({ success: false, error: 'An internal server error occurred' }, { status: 500 });
  }
}

// Protect the route for any authenticated user
export const GET = withAuth(meHandler);
