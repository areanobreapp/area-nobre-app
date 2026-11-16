import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getCommercialUnitById,
  updateCommercialUnit,
  deleteCommercialUnit,
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
    const unit = await getCommercialUnitById(unitId, user, undefined, developmentId);

    if (!unit) {
      return NextResponse.json(
        { error: 'Unidade comercial não encontrada neste empreendimento.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, unit }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao consultar unidade comercial (ADMIN):', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao consultar unidade comercial.' },
      { status: resolveHttpErrorStatus(error) }
    );
  }
}

async function handleUpdateUnit(req: NextRequest, context: RouteContext) {
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

    if (body.developmentId && body.developmentId !== developmentId) {
      return NextResponse.json(
        { error: 'Não é permitido transferir uma unidade comercial para outro empreendimento.' },
        { status: 400 }
      );
    }

    const updated = await updateCommercialUnit(unitId, {
      ...body,
      expectedDevelopmentId: developmentId,
      actorId: user.id,
      source: body.source || 'MANUAL_ADMIN',
    });

    return NextResponse.json({ success: true, unit: updated }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao atualizar unidade comercial (ADMIN):', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar unidade comercial.' },
      { status: resolveHttpErrorStatus(error) }
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  return handleUpdateUnit(req, context);
}

export async function PUT(req: NextRequest, context: RouteContext) {
  return handleUpdateUnit(req, context);
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

    const { id: developmentId, unitId } = await context.params;
    const deleted = await deleteCommercialUnit({
      unitId,
      expectedDevelopmentId: developmentId,
      actorId: user.id,
    });

    return NextResponse.json(deleted, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao excluir unidade comercial (ADMIN):', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao excluir unidade comercial.' },
      { status: resolveHttpErrorStatus(error) }
    );
  }
}

