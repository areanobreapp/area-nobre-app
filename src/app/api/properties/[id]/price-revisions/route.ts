import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertUserAcceptedTerms } from '@/lib/legal/service';
import { PriceRevisionService } from '@/lib/price-revision-service';
import { validateNonNegativeFloat } from '@/lib/validation';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const termsCheck = await assertUserAcceptedTerms(user);
    if (!termsCheck.allowed) {
      return termsCheck.errorResponse!;
    }

    const { id } = await params;
    const body = await req.json();
    const { justification, documentProofUrl } = body;
    const suggestedPrice = body.suggestedPrice !== undefined ? body.suggestedPrice : body.proposedPrice;

    if (suggestedPrice === undefined || suggestedPrice === null || String(suggestedPrice).trim() === '') {
      return NextResponse.json(
        { error: 'O preço sugerido é obrigatório.', code: 'INVALID_PRICE' },
        { status: 400 }
      );
    }

    const priceValidation = validateNonNegativeFloat(suggestedPrice, 'Preço sugerido', {
      required: true,
      isCurrencyString: true,
    });

    if (priceValidation.error || priceValidation.value === null || priceValidation.value <= 0) {
      return NextResponse.json(
        { error: 'O preço sugerido deve ser um valor numérico positivo maior que zero.', code: 'INVALID_PRICE' },
        { status: 400 }
      );
    }

    if (!justification || String(justification).trim().length === 0) {
      return NextResponse.json(
        { error: 'A justificativa para a solicitação de revisão é obrigatória.', code: 'INVALID_JUSTIFICATION' },
        { status: 400 }
      );
    }

    const result = await PriceRevisionService.createRequest({
      propertyId: id,
      requestingBrokerId: user.id,
      suggestedPrice: priceValidation.value,
      justification: String(justification).trim(),
      documentProofUrl: documentProofUrl ? String(documentProofUrl).trim() : null,
    });

    if (!result.success) {
      let statusCode = 400;
      if (result.reason === 'NOT_FOUND') statusCode = 404;
      else if (result.reason === 'NOT_OWNER' || result.reason === 'CANNOT_REQUEST_AS_PRIMARY') statusCode = 403;
      else if (result.reason === 'DUPLICATE_PENDING_REQUEST' || result.reason === 'SAME_PRICE') statusCode = 409;

      return NextResponse.json(
        { error: result.message, code: result.reason },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Solicitação de revisão de preço enviada com sucesso.',
      request: result.request,
    });
  } catch (error: any) {
    console.error('Erro ao criar solicitação de revisão de preço:', error);
    return NextResponse.json({ error: error.message || 'Falha ao processar solicitação.' }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id } = await params;
    const property = await prisma.property.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        responsibleBrokerId: true,
        physicalPropertyId: true,
        isPrimaryListing: true,
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Imóvel não encontrado.' }, { status: 404 });
    }

    if (!property.physicalPropertyId) {
      return NextResponse.json({ requests: [] });
    }

    const isAdmin = user.role === 'ADMIN';
    const isOwner = property.userId === user.id || property.responsibleBrokerId === user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'Você não tem permissão para visualizar as solicitações deste anúncio.' },
        { status: 403 }
      );
    }

    // Busca solicitações do imóvel físico
    const where: any = {
      physicalPropertyId: property.physicalPropertyId,
    };

    // Se não for admin nem o principal, só pode ver as solicitações que ele próprio abriu
    if (!isAdmin && !property.isPrimaryListing) {
      where.requestingBrokerId = user.id;
    }

    const requests = await prisma.priceRevisionRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        requestingBroker: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: { select: { commercialName: true, creci: true } },
          },
        },
        decidedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, requests });
  } catch (error: any) {
    console.error('Erro ao listar solicitações de revisão:', error);
    return NextResponse.json({ error: 'Falha ao buscar solicitações.' }, { status: 500 });
  }
}
