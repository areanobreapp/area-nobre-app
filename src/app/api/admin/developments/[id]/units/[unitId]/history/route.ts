import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  listCommercialUnitHistory,
  resolveHttpErrorStatus,
} from '@/lib/commercial-unit-service';

interface RouteContext {
  params: Promise<{ id: string; unitId: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { id: developmentId, unitId } = await context.params;
    const limitParam = Number(req.nextUrl.searchParams.get('limit')) || 100;

    const history = await listCommercialUnitHistory({
      developmentId,
      commercialUnitId: unitId,
      limit: limitParam,
    });

    return NextResponse.json({ success: true, history }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao consultar histórico da unidade comercial (ADMIN):', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao consultar histórico da unidade comercial.' },
      { status: resolveHttpErrorStatus(error) }
    );
  }
}

