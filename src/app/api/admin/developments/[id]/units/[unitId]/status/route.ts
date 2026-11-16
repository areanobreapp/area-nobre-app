import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  updateCommercialUnitStatus,
  resolveHttpErrorStatus,
} from '@/lib/commercial-unit-service';

interface RouteContext {
  params: Promise<{ id: string; unitId: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { id: developmentId, unitId } = await context.params;
    const body = await req.json();

    const newStatus = body.commercialStatus || body.newStatus || body.status;
    if (!newStatus) {
      return NextResponse.json(
        { error: 'O campo commercialStatus é obrigatório para alterar disponibilidade.' },
        { status: 400 }
      );
    }

    const updated = await updateCommercialUnitStatus({
      unitId,
      expectedDevelopmentId: developmentId,
      newStatus,
      reservedUntil: body.reservedUntil,
      reservedByNote: body.reservedByNote,
      soldAt: body.soldAt,
      reason: body.reason,
      source: body.source || 'MANUAL_ADMIN',
      importBatchId: body.importBatchId,
      actorId: user.id,
    });

    return NextResponse.json({ success: true, unit: updated }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao alterar disponibilidade da unidade comercial (ADMIN):', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao alterar disponibilidade da unidade comercial.' },
      { status: resolveHttpErrorStatus(error) }
    );
  }
}

