import { NextResponse } from 'next/server';
import { guestService } from '@/services/guestService';

export async function PUT(
  request: Request,
  { params }: { params: { guestId: string } }
) {
  try {
    const { guestId } = params;
    const body = await request.json();
    const updatedGuest = await guestService.updateGuest(guestId, body);
    return NextResponse.json(updatedGuest);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { guestId: string } }
) {
  try {
    const { guestId } = params;
    await guestService.deleteGuest(guestId);
    return NextResponse.json({ message: 'Guest deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
