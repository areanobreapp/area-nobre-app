import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { linkDevelopmentToBuilding } from '@/lib/development-service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const updated = await linkDevelopmentToBuilding(id, body.buildingId || null, user.id);

    return NextResponse.json({ success: true, development: updated }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao vincular edifício ao empreendimento:', error);
    const status = error.code === 'NOT_FOUND' ? 404 : 400;
    return NextResponse.json(
      { error: error.message || 'Erro ao vincular edifício ao empreendimento.' },
      { status }
    );
  }
}

