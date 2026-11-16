import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { assertUserAcceptedTerms } from '@/lib/legal/service';
import {
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
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const termsCheck = await assertUserAcceptedTerms(user);
    if (!termsCheck.allowed) {
      return termsCheck.errorResponse!;
    }

    const { id: developmentId } = await context.params;
    const filters = parseUnitListSearchParams(developmentId, req.nextUrl.searchParams);

    const result = await listCommercialUnitsPaginated(user, filters);
    if (!result) {
      return NextResponse.json(
        { error: 'Empreendimento não encontrado ou não disponível.' },
        { status: 404 }
      );
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
    console.error('Erro ao consultar unidades comerciais do empreendimento:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao consultar unidades comerciais.' },
      { status: resolveHttpErrorStatus(error) }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
  return NextResponse.json(
    { error: 'Apenas administradores podem modificar o estoque oficial das construtoras.' },
    { status: 403 }
  );
}

