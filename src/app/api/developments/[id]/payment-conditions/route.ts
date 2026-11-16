import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { assertUserAcceptedTerms } from '@/lib/legal/service';
import {
  listCommercialPaymentConditions,
  resolveUnitPaymentConditions,
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
    const sp = req.nextUrl.searchParams;
    const unitId = sp.get('unitId') || sp.get('commercialUnitId');

    if (unitId) {
      const conditions = await resolveUnitPaymentConditions(
        unitId,
        user,
        undefined,
        developmentId
      );
      return NextResponse.json({ success: true, paymentConditions: conditions }, { status: 200 });
    }

    const conditions = await listCommercialPaymentConditions(user, {
      developmentId,
      blockId: sp.get('blockId'),
      typologyId: sp.get('typologyId'),
      includeInactive: false,
    });

    if (!conditions) {
      return NextResponse.json(
        { error: 'Empreendimento não encontrado ou não disponível.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, paymentConditions: conditions }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao consultar condições de pagamento do empreendimento:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao consultar condições de pagamento.' },
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
    { error: 'Apenas administradores podem cadastrar condições de pagamento.' },
    { status: 403 }
  );
}
