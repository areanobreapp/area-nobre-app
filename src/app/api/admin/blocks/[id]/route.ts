import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { updateDevelopmentBlock, deleteDevelopmentBlock } from '@/lib/development-service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
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
    const updated = await updateDevelopmentBlock(id, body, user.id);
    return NextResponse.json({ success: true, block: updated }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao atualizar torre/quadra:', error);
    const status = error.code === 'CONFLICT' ? 409 : error.code === 'NOT_FOUND' ? 404 : 400;
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar torre/quadra.' },
      { status }
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { id } = await context.params;
    const result = await deleteDevelopmentBlock(id, user.id);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao excluir torre/quadra:', error);
    const status = error.code === 'NOT_FOUND' ? 404 : 400;
    return NextResponse.json(
      { error: error.message || 'Erro ao excluir torre/quadra.' },
      { status }
    );
  }
}

