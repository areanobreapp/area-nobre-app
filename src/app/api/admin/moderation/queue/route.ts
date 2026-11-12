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
    const status = searchParams.get('status') || 'PENDING';
    const city = searchParams.get('city') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);

    const queueResult = await getModerationQueue({
      type,
      status,
      city,
      search,
      limit,
      page,
    });

    return NextResponse.json(queueResult, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao consultar fila de moderação:', error);
    return NextResponse.json(
      { error: 'Erro interno ao consultar fila da central de moderação.' },
      { status: 500 }
    );
  }
}

