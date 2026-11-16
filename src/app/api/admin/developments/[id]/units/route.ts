import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  createCommercialUnit,
  listCommercialUnitsPaginated,
  resolveHttpErrorStatus,
} from '@/lib/commercial-unit-service';
import { parseUnitListSearchParams } from '@/lib/commercial-unit-http';

interface RouteContext {
  params: Promise<{ id: string }>;
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

    const { id: developmentId } = await context.params;
    const filters = parseUnitListSearchParams(developmentId, req.nextUrl.searchParams);

    const result = await listCommercialUnitsPaginated(user, filters);
    if (!result) {
      return NextResponse.json({ error: 'Empreendimento não encontrado.' }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        units: result.items,
        pagination: result.pagination,
        summary: result.summary,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Erro ao listar unidades comerciais (ADMIN):', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao listar unidades comerciais.' },
      { status: resolveHttpErrorStatus(error) }
    );
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { id: developmentId } = await context.params;
    const body = await req.json();

    if (body.developmentId && body.developmentId !== developmentId) {
      return NextResponse.json(
        { error: 'Conflito de empreendimento: o developmentId do corpo diverge da URL.' },
        { status: 400 }
      );
    }

    const unit = await createCommercialUnit({
      ...body,
      developmentId,
      actorId: user.id,
      source: body.source || 'MANUAL_ADMIN',
    });

    return NextResponse.json({ success: true, unit }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar unidade comercial (ADMIN):', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao cadastrar unidade comercial.' },
      { status: resolveHttpErrorStatus(error) }
    );
  }
}

