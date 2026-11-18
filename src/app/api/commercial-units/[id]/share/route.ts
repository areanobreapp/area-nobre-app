import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertUserAcceptedTerms } from '@/lib/legal/service';
import {
  CommercialShareConfigError,
  createCommercialUnitShareToken,
  evaluateCommercialUnitShareStatus,
  getPublicCommercialUnitUrl,
} from '@/lib/commercial-unit-share';
import { normalizeBrazilianPhone, formatBrazilianPhoneDisplay } from '@/lib/whatsapp';
import { isDevelopmentPubliclyShareable } from '@/lib/development-visibility';

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function handleCommercialUnitShareRequest(
  req: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const termsCheck = await assertUserAcceptedTerms(user);
    if (!termsCheck.allowed) {
      return termsCheck.errorResponse!;
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Corretor inativo na plataforma.' }, { status: 403 });
    }

    const { id: unitId } = await params;

    const unit = await prisma.commercialUnit.findUnique({
      where: { id: unitId },
      include: {
        development: {
          select: {
            id: true,
            name: true,
            status: true,
            companyId: true,
            company: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!unit || !unit.development) {
      return NextResponse.json({ error: 'Unidade comercial não encontrada.' }, { status: 404 });
    }

    const dev = unit.development;

    // FUNC-02: Empreendimento publicado e construtora ativa (quando vinculada)
    const devCheck = isDevelopmentPubliclyShareable(dev);
    if (!devCheck.allowed) {
      const errorMsg =
        devCheck.reasonCode === 'COMPANY_INACTIVE'
          ? 'A construtora responsável por este empreendimento está inativa e não permite novos compartilhamentos.'
          : 'Empreendimento não está publicado para compartilhamento com clientes.';
      return NextResponse.json({ error: errorMsg }, { status: 403 });
    }

    // FUNC-01: Regras de disponibilidade da unidade (permite DISPONIVEL e RESERVADA; bloqueia VENDIDA, INDISPONIVEL_TEMPORARIAMENTE e demais)
    const statusEval = evaluateCommercialUnitShareStatus(unit.commercialStatus);
    if (!statusEval.canCreateShare) {
      return NextResponse.json(
        {
          error:
            statusEval.shareBlockedError ||
            'Esta unidade não está disponível para compartilhamento no momento.',
          code: statusEval.unavailabilityCode,
        },
        { status: 403 }
      );
    }

    const profile = await prisma.brokerProfile.findUnique({
      where: { userId: user.id },
    });

    const rawPhone = profile?.phone || null;
    const normalizedPhone = normalizeBrazilianPhone(rawPhone);
    const hasWhatsApp = Boolean(normalizedPhone);

    // O token é gerado SEMPRE com o id do corretor autenticado e validado por COMMERCIAL_SHARE_SECRET (SEG-01)
    const token = createCommercialUnitShareToken(unit.id, unit.developmentId, user.id);
    const publicUrl = getPublicCommercialUnitUrl(token, req);

    const devName = dev.name || 'Empreendimento';
    const suggestedClientMessage = statusEval.isReserved
      ? `Olá! Separei esta unidade comercial (atualmente reservada) no ${devName}: Unidade ${unit.unitCode}.\nConfira a apresentação e consulte condições comigo:\n${publicUrl}`
      : `Olá! Separei esta unidade comercial para você no ${devName}: Unidade ${unit.unitCode}.\nConfira a apresentação completa:\n${publicUrl}`;

    return NextResponse.json({
      success: true,
      token,
      publicUrl,
      suggestedClientMessage,
      unit: {
        id: unit.id,
        unitCode: unit.unitCode,
        commercialStatus: unit.commercialStatus,
        developmentId: unit.developmentId,
        developmentName: devName,
      },
      broker: {
        id: user.id,
        name: user.name,
        commercialName: profile?.commercialName || user.name,
        creci: profile?.creci || null,
        phone: rawPhone,
        formattedPhone: formatBrazilianPhoneDisplay(rawPhone),
        hasWhatsApp,
        avatarUrl: profile?.avatarUrl || null,
      },
    });
  } catch (err: any) {
    if (err instanceof CommercialShareConfigError || err?.code === 'SHARE_SECRET_MISCONFIGURED') {
      return NextResponse.json(
        { error: 'O serviço de compartilhamento público está temporariamente indisponível.' },
        { status: 503 }
      );
    }
    console.error('[API Commercial Unit Share Error]:', err?.message || 'Erro interno');
    return NextResponse.json(
      { error: 'Não foi possível gerar o compartilhamento da unidade no momento.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest, context: RouteContext) {
  return handleCommercialUnitShareRequest(req, context);
}

export async function POST(req: NextRequest, context: RouteContext) {
  return handleCommercialUnitShareRequest(req, context);
}

