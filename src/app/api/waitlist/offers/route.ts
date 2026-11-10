import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PropertyWaitlistService } from '@/lib/waitlist-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const offers = await PropertyWaitlistService.getBrokerOffers(user.id);

    const draftIds = offers
      .map((o: any) => o.draftPropertyId)
      .filter((id: any): id is string => typeof id === 'string');

    const drafts = draftIds.length > 0
      ? await prisma.property.findMany({
          where: { id: { in: draftIds } },
          select: { id: true, title: true, price: true, status: true },
        })
      : [];
    const draftsMap = new Map(drafts.map((d) => [d.id, d]));

    const enrichedOffers = offers.map((o: any) => ({
      ...o,
      draftProperty: o.draftPropertyId ? draftsMap.get(o.draftPropertyId) || null : null,
    }));

    return NextResponse.json({
      success: true,
      count: enrichedOffers.length,
      offers: enrichedOffers,
    });
  } catch (error: any) {
    console.error('[GET /api/waitlist/offers] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao consultar ofertas da lista de espera.' },
      { status: 500 }
    );
  }
}

