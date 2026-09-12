import { NextResponse } from 'next/server';
import { sequelize } from '@/lib/sequelize';

export async function GET() {
  try {
    await sequelize.authenticate();
    return NextResponse.json({ status: 'ok', db: 'connected' });
  } catch (error) {
    // El detalle del error de conexión (host, puerto, base, usuario) NO viaja al
    // cliente: /api/health es PÚBLICO y ese mensaje es reconocimiento gratis para
    // un atacante no autenticado (F3-07). El detalle queda solo en el log.
    console.error('Health check failed:', error);
    return NextResponse.json(
      { status: 'error', db: 'disconnected' },
      { status: 500 }
    );
  }
}
