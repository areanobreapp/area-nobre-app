import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { assertUserAcceptedTerms } from '@/lib/legal/service';
import {
  listDevelopmentBlocksWithSummary,
  resolveHttpErrorStatus,
} from '@/lib/commercial-unit-service';

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
    const blocks = await listDevelopmentBlocksWithSummary(developmentId, user);

    if (!blocks) {
      return NextResponse.json(
        { error: 'Empreendimento não encontrado ou não disponível.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, blocks, items: blocks }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao consultar torres e quadras do empreendimento:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao consultar torres e quadras.' },
      { status: resolveHttpErrorStatus(error) }
    );
  }
}

