import { NextResponse } from 'next/server';
import { sequelize } from '@/lib/sequelize';

export async function GET() {
  try {
    await sequelize.authenticate();
    return NextResponse.json({ status: 'ok', db: 'connected' });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { status: 'error', db: 'disconnected', error: (error as Error).message },
      { status: 500 }
    );
  }
}
