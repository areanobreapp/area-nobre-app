import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { assertUserAcceptedTerms } from '@/lib/legal/service';
import {
  getCommercialUnitById,
  resolveHttpErrorStatus,
} from '@/lib/commercial-unit-service';

interface RouteContext {
  params: Promise<{ id: string; unitId: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const termsCheck = await assertUserAcceptedTerms(user);
    if (!termsCheck.allowed) {
      return termsCheck.errorResponse!;
    }

    const { id: developmentId, unitId } = await context.params;
    const unit = await getCommercialUnitById(unitId, user, undefined, developmentId);

    if (!unit) {
      return NextResponse.json(
        { error: 'Unidade comercial não encontrada ou não disponível.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, unit }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao consultar detalhe da unidade comercial:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao consultar detalhe da unidade comercial.' },
      { status: resolveHttpErrorStatus(error) }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
  return NextResponse.json(
    { error: 'Apenas administradores podem modificar o estoque oficial das construtoras.' },
    { status: 403 }
  );
}

export async function PUT(req: NextRequest) {
  return PATCH(req);
}

export async function DELETE(req: NextRequest) {
  return PATCH(req);
}

