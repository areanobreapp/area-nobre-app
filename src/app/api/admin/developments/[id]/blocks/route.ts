import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createDevelopmentBlock } from '@/lib/development-service';

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
    const block = await createDevelopmentBlock(id, body, user.id);
    return NextResponse.json({ success: true, block }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao adicionar torre/quadra ao empreendimento:', error);
    const status = error.code === 'CONFLICT' ? 409 : error.code === 'NOT_FOUND' ? 404 : 400;
    return NextResponse.json(
      { error: error.message || 'Erro ao criar torre/quadra.' },
      { status }
    );
  }
}

