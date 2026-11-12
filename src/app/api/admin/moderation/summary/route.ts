import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getModerationSummary } from '@/lib/building-moderation-service';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const summary = await getModerationSummary();
    return NextResponse.json(summary, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao consultar resumo de moderação:', error);
    return NextResponse.json(
      { error: 'Erro interno ao consultar resumo da central de moderação.' },
      { status: 500 }
    );
  }
}

