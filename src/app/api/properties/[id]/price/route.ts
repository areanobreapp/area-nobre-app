import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertUserAcceptedTerms } from '@/lib/legal/service';
import { ListingSlotService } from '@/lib/listing-slot-service';
import { validateNonNegativeFloat } from '@/lib/validation';

export async function PATCH(
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
    const { price, reason } = body;

    if (price === undefined || price === null || String(price).trim() === '') {
      return NextResponse.json(
        { error: 'O novo preço é obrigatório.', code: 'INVALID_PRICE' },
        { status: 400 }
      );
    }

    const priceValidation = validateNonNegativeFloat(price, 'Preço', { required: true, isCurrencyString: true });
    if (priceValidation.error || priceValidation.value === null || priceValidation.value <= 0) {
      return NextResponse.json(
        { error: 'O preço deve ser um valor positivo maior que zero.', code: 'INVALID_PRICE' },
        { status: 400 }
      );
    }
    const numericPrice = priceValidation.value;

    const property = await prisma.property.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        responsibleBrokerId: true,
        physicalPropertyId: true,
        isPrimaryListing: true,
        price: true,
        status: true,
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Imóvel não encontrado.' }, { status: 404 });
    }

    // Se o imóvel estiver vinculado a um imóvel físico (PhysicalProperty)
    if (property.physicalPropertyId) {
      const isAdmin = user.role === 'ADMIN';
      const isOwner = property.userId === user.id || property.responsibleBrokerId === user.id;

      // Somente o anúncio principal ou ADMIN pode alterar o preço compartilhado
      if (!isAdmin && (!property.isPrimaryListing || !isOwner)) {
        return NextResponse.json(
          {
            error: 'Apenas o corretor do anúncio principal ou administradores podem atualizar o preço compartilhado.',
            code: 'UNAUTHORIZED',
          },
          { status: 403 }
        );
      }

      const result = await ListingSlotService.updateSharedPrice({
        physicalPropertyId: property.physicalPropertyId,
        userId: user.id,
        userRole: user.role,
        newPrice: numericPrice,
        reason: reason?.trim() || (isAdmin ? 'Ajuste administrativo de preço compartilhado.' : 'Atualização de preço pelo anúncio principal.'),
        source: isAdmin ? 'ADMIN_ADJUDICATION' : 'PRIMARY_BROKER',
      });

      if (!result.success) {
        const statusCode = result.reason === 'UNAUTHORIZED' ? 403 : 400;
        return NextResponse.json(
          { error: result.message, code: result.reason },
          { status: statusCode }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Preço compartilhado atualizado com sucesso.',
        oldPrice: result.oldPrice,
        newPrice: result.newPrice,
        updatedListingsCount: result.updatedListingsCount,
        historyId: result.historyId,
      });
    }

    // Caso de compatibilidade: Imóvel legado ou individual não vinculado a PhysicalProperty
    const isOwnerOrAdmin = user.role === 'ADMIN' || property.userId === user.id || property.responsibleBrokerId === user.id;
    if (!isOwnerOrAdmin) {
      return NextResponse.json(
        { error: 'Você não tem permissão para alterar o preço deste imóvel.', code: 'UNAUTHORIZED' },
        { status: 403 }
      );
    }

    const oldPrice = property.price;
    await prisma.property.update({
      where: { id },
      data: { price: numericPrice },
    });

    return NextResponse.json({
      success: true,
      message: 'Preço atualizado com sucesso.',
      oldPrice,
      newPrice: numericPrice,
      updatedListingsCount: 1,
    });
  } catch (error: any) {
    console.error('Erro ao atualizar preço do imóvel:', error);
    return NextResponse.json({ error: error.message || 'Falha ao atualizar preço.' }, { status: 500 });
  }
}

