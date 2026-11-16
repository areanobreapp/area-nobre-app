import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  updateCommercialPaymentCondition,
  deleteCommercialPaymentCondition,
  resolveHttpErrorStatus,
} from '@/lib/commercial-unit-service';

interface RouteContext {
  params: Promise<{ id: string; conditionId: string }>;
}

async function handleUpdateCondition(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { id: developmentId, conditionId } = await context.params;
    const body = await req.json();

    const updated = await updateCommercialPaymentCondition(conditionId, {
      ...body,
      expectedDevelopmentId: developmentId,
      actorId: user.id,
    });

    return NextResponse.json({ success: true, paymentCondition: updated }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao atualizar condição de pagamento (ADMIN):', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar condição de pagamento.' },
      { status: resolveHttpErrorStatus(error) }
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  return handleUpdateCondition(req, context);
}

export async function PUT(req: NextRequest, context: RouteContext) {
  return handleUpdateCondition(req, context);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { id: developmentId, conditionId } = await context.params;
    const deleted = await deleteCommercialPaymentCondition({
      conditionId,
      expectedDevelopmentId: developmentId,
    });

    return NextResponse.json(deleted, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao excluir condição de pagamento (ADMIN):', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao excluir condição de pagamento.' },
      { status: resolveHttpErrorStatus(error) }
    );
  }
}

