import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  canPropertyBePubliclyExposed,
  recordPropertyAuthorization,
  revokePropertyAuthorization,
  getPropertyAuthorizationAuditHistory,
  getLatestPropertyAuthorizationDocument,
  assertUserAcceptedTerms,
} from '@/lib/legal/service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const termsCheck = await assertUserAcceptedTerms(user);
    if (!termsCheck.allowed) {
      return termsCheck.errorResponse!;
    }

    const { id } = await params;
    const property = await prisma.property.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        userId: true,
        responsibleBrokerId: true,
        status: true,
        isPublic: true,
        legacyExemptFromAuthorization: true,
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Imóvel não encontrado.' }, { status: 404 });
    }

    const isResponsible =
      user.role === 'ADMIN' ||
      property.userId === user.id ||
      property.responsibleBrokerId === user.id;

    if (!isResponsible) {
      return NextResponse.json(
        { error: 'Você não tem permissão para gerenciar a autorização deste imóvel.' },
        { status: 403 }
      );
    }

    const [exposureCheck, history, doc] = await Promise.all([
      canPropertyBePubliclyExposed(property.id),
      getPropertyAuthorizationAuditHistory(property.id),
      getLatestPropertyAuthorizationDocument(),
    ]);

    const latest = history[0] || null;

    return NextResponse.json({
      propertyId: property.id,
      title: property.title,
      propertyStatus: property.status,
      isPublic: property.isPublic,
      isLegacyExempt: property.legacyExemptFromAuthorization,
      canBePubliclyExposed: exposureCheck.allowed,
      exposureReason: exposureCheck.reason || null,
      currentStatus: latest ? latest.status : (property.legacyExemptFromAuthorization ? 'LEGACY_EXEMPT' : 'NOT_CONFIRMED'),
      activeAuthorization: exposureCheck.authorization || null,
      declarationDocument: doc
        ? {
            id: doc.id,
            version: doc.version,
            title: doc.title,
            status: doc.status,
          }
        : null,
      history: history.map((h) => ({
        id: h.id,
        status: h.status,
        documentVersion: h.documentVersion,
        confirmedAt: h.confirmedAt,
        revokedAt: h.revokedAt,
        revocationReason: h.revocationReason,
        brokerName: h.broker.name,
      })),
    });
  } catch (error: any) {
    console.error('Erro ao consultar autorização do imóvel:', error);
    return NextResponse.json(
      { error: 'Falha ao consultar autorização do imóvel.' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const property = await prisma.property.findUnique({
      where: { id },
    });

    if (!property) {
      return NextResponse.json({ error: 'Imóvel não encontrado.' }, { status: 404 });
    }

    // Permissão estrita: apenas o corretor responsável ou ADMIN
    const isResponsible =
      user.role === 'ADMIN' ||
      property.userId === user.id ||
      property.responsibleBrokerId === user.id;

    if (!isResponsible) {
      return NextResponse.json(
        { error: 'Você não tem permissão para alterar a autorização deste imóvel.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === 'confirm') {
      const brokerId = user.id;
      const createdAuth = await recordPropertyAuthorization({
        propertyId: property.id,
        brokerId,
        documentId: body.documentId,
      });

      return NextResponse.json({
        success: true,
        action: 'confirmed',
        message: 'Autorização de divulgação confirmada com sucesso.',
        authorization: createdAuth,
      });
    }

    if (action === 'revoke') {
      const brokerId = property.responsibleBrokerId || property.userId || user.id;
      const revokedAuth = await revokePropertyAuthorization({
        propertyId: property.id,
        brokerId,
        revokedByUserId: user.id,
        reason: body.reason?.trim() || 'Revogação declarada pelo corretor responsável.',
      });

      return NextResponse.json({
        success: true,
        action: 'revoked',
        message: 'Autorização revogada e divulgação do imóvel suspensa.',
        authorization: revokedAuth,
      });
    }

    return NextResponse.json(
      { error: 'Ação inválida. Use "confirm" ou "revoke".' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Erro ao processar autorização do imóvel:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao processar autorização do imóvel.' },
      { status: 500 }
    );
  }
}
