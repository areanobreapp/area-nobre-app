import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertUserAcceptedTerms } from '@/lib/legal/service';
import {
  createCommercialUnitShareToken,
  getPublicCommercialUnitUrl,
} from '@/lib/commercial-unit-share';
import { normalizeBrazilianPhone, formatBrazilianPhoneDisplay } from '@/lib/whatsapp';
import { resolvePublicationStatus } from '@/lib/development-visibility';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
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
          },
        },
      },
    });

    if (!unit) {
      return NextResponse.json({ error: 'Unidade comercial não encontrada.' }, { status: 404 });
    }

    const profile = await prisma.brokerProfile.findUnique({
      where: { userId: user.id },
    });

    const rawPhone = profile?.phone || null;
    const normalizedPhone = normalizeBrazilianPhone(rawPhone);
    const hasWhatsApp = Boolean(normalizedPhone);

    const token = createCommercialUnitShareToken(unit.id, unit.developmentId, user.id);
    const publicUrl = getPublicCommercialUnitUrl(token, req);

    const devName = unit.development?.name || 'Empreendimento';
    const suggestedClientMessage = `Olá! Separei esta unidade comercial para você no ${devName}: Unidade ${unit.unitCode}.\nConfira a apresentação completa:\n${publicUrl}`;

    return NextResponse.json({
      success: true,
      token,
      publicUrl,
      suggestedClientMessage,
      unit: {
        id: unit.id,
        unitCode: unit.unitCode,
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
    console.error('[API Commercial Unit Share GET Error]:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao consultar compartilhamento da unidade.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
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
          },
        },
      },
    });

    if (!unit) {
      return NextResponse.json({ error: 'Unidade comercial não encontrada.' }, { status: 404 });
    }

    const dev = unit.development;
    const pubStatus = resolvePublicationStatus(dev.status);
    if (pubStatus !== 'PUBLICADO') {
      return NextResponse.json(
        { error: 'Empreendimento não está publicado para compartilhamento com clientes.' },
        { status: 403 }
      );
    }

    const profile = await prisma.brokerProfile.findUnique({
      where: { userId: user.id },
    });

    const rawPhone = profile?.phone || null;
    const normalizedPhone = normalizeBrazilianPhone(rawPhone);
    const hasWhatsApp = Boolean(normalizedPhone);

    // O token é gerado SEMPRE com o id do corretor autenticado
    const token = createCommercialUnitShareToken(unit.id, unit.developmentId, user.id);
    const publicUrl = getPublicCommercialUnitUrl(token, req);

    const devName = dev?.name || 'Empreendimento';
    const suggestedClientMessage = `Olá! Separei esta unidade comercial para você no ${devName}: Unidade ${unit.unitCode}.\nConfira a apresentação completa:\n${publicUrl}`;

    return NextResponse.json({
      success: true,
      token,
      publicUrl,
      suggestedClientMessage,
      unit: {
        id: unit.id,
        unitCode: unit.unitCode,
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
    console.error('[API Commercial Unit Share POST Error]:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao gerar compartilhamento da unidade.' },
      { status: 500 }
    );
  }
}
