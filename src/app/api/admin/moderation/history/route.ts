import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getModerationQueue, ModerationItemType } from '@/lib/building-moderation-service';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = (searchParams.get('type') || 'ALL') as 'ALL' | ModerationItemType;
    const status = searchParams.get('status') || 'ALL'; // Aceita ACCEPTED, REJECTED, SUPERSEDED ou ALL
    const city = searchParams.get('city') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);

    // Se o status for ALL ou não especificado para o histórico, buscamos os decididos
    const effectiveStatus = status === 'ALL' ? 'ALL' : status;

    const historyResult = await getModerationQueue({
      type,
      status: effectiveStatus,
      city,
      search,
      limit,
      page,
    });

    // Filtra apenas contribuições que já foram decididas quando status for ALL
    if (status === 'ALL') {
      historyResult.items = historyResult.items.filter((item) =>
        ['ACCEPTED', 'REJECTED', 'SUPERSEDED'].includes(item.status)
      );
      historyResult.total = historyResult.items.length;
    }

    return NextResponse.json(historyResult, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao consultar histórico de moderação:', error);
    return NextResponse.json(
      { error: 'Erro interno ao consultar histórico da central de moderação.' },
      { status: 500 }
    );
  }
}

