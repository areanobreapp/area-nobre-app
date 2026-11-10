import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { PropertyWaitlistService } from '@/lib/waitlist-service';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem disparar convocações da lista de espera.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const result = await PropertyWaitlistService.dispatchOfferNotification({
      waitlistId: id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Oferta disponibilizada com sucesso. O prazo de 48 horas foi iniciado.',
      waitlistEntry: result.waitlistEntry,
    });
  } catch (error: any) {
    console.error('[POST /api/waitlist/[id]/notify] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao disponibilizar oferta.' },
      { status: 500 }
    );
  }
}

