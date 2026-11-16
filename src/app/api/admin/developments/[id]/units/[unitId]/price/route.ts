import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  updateCommercialUnitPrice,
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

    if (body.listPrice === undefined) {
      return NextResponse.json(
        { error: 'O campo listPrice é obrigatório para atualização de preço.' },
        { status: 400 }
      );
    }

    const updated = await updateCommercialUnitPrice({
      unitId,
      expectedDevelopmentId: developmentId,
      listPrice: body.listPrice,
      promotionalPrice: body.promotionalPrice,
      reason: body.reason,
      source: body.source || 'MANUAL_ADMIN',
      importBatchId: body.importBatchId,
      actorId: user.id,
    });

    return NextResponse.json({ success: true, unit: updated }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao atualizar preço da unidade comercial (ADMIN):', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar preço da unidade comercial.' },
      { status: resolveHttpErrorStatus(error) }
    );
  }
}

