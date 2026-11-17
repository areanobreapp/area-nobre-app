import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { listCommercialMaterialsForBroker } from '@/lib/commercial-material-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Autenticação necessária para consultar materiais.' }, { status: 401 });
    }

    const { id: developmentId } = await params;
    const materials = await listCommercialMaterialsForBroker(developmentId);

    return NextResponse.json({ materials });
  } catch (err: any) {
    console.error('[API Broker Materials GET Error]:', err);
    return NextResponse.json({ error: err.message || 'Erro ao consultar materiais.' }, { status: 500 });
  }
}
