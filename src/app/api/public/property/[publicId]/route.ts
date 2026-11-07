import { NextRequest, NextResponse } from 'next/server';
import { toPublicPropertyDTO } from '@/lib/public-property-dto';
import { resolvePublicOffer } from '@/lib/public-offer-resolver';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await context.params;

    if (!publicId || typeof publicId !== 'string') {
      return NextResponse.json(
        { isAvailable: false, error: 'Identificador inválido.' },
        { status: 400, headers: { 'X-Robots-Tag': 'noindex, nofollow' } }
      );
    }

    const offer = await resolvePublicOffer(publicId);

    if (!offer) {
      return NextResponse.json(
        {
          isAvailable: false,
          message: 'Este imóvel não está mais disponível para visualização.',
        },
        { status: 404, headers: { 'X-Robots-Tag': 'noindex, nofollow' } }
      );
    }

    if (!offer.isAvailable || !offer.entity) {
      return NextResponse.json(
        {
          isAvailable: false,
          message: offer.unavailabilityReason || 'Este imóvel não está mais disponível para visualização.',
        },
        { status: 200, headers: { 'X-Robots-Tag': 'noindex, nofollow' } }
      );
    }

    const dto = toPublicPropertyDTO(offer.entity, offer.offerType, offer.brokerOverride);

    return NextResponse.json(
      { isAvailable: true, property: dto },
      {
        headers: {
          'X-Robots-Tag': 'noindex, nofollow',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('Erro na consulta pública do imóvel:', err);
    return NextResponse.json(
      { isAvailable: false, error: 'Erro interno ao consultar o anúncio.' },
      { status: 500, headers: { 'X-Robots-Tag': 'noindex, nofollow' } }
    );
  }
}
