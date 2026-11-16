import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  createCommercialPaymentCondition,
  listCommercialPaymentConditions,
  resolveHttpErrorStatus,
} from '@/lib/commercial-unit-service';

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
    const sp = req.nextUrl.searchParams;

    const conditions = await listCommercialPaymentConditions(user, {
      developmentId,
      blockId: sp.get('blockId'),
      typologyId: sp.get('typologyId'),
      commercialUnitId: sp.get('commercialUnitId') || sp.get('unitId'),
      includeInactive: sp.get('includeInactive') !== 'false',
    });

    if (!conditions) {
      return NextResponse.json({ error: 'Empreendimento não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, paymentConditions: conditions }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao listar condições de pagamento (ADMIN):', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao listar condições de pagamento.' },
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
        { error: 'Conflito de empreendimento: o developmentId diverge da URL.' },
        { status: 400 }
      );
    }

    const condition = await createCommercialPaymentCondition({
      ...body,
      developmentId,
      actorId: user.id,
    });

    return NextResponse.json({ success: true, paymentCondition: condition }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar condição de pagamento (ADMIN):', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao cadastrar condição de pagamento.' },
      { status: resolveHttpErrorStatus(error) }
    );
  }
}

