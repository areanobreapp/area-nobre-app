import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDevelopmentById, updateDevelopment, toggleDevelopmentStatus } from '@/lib/development-service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { id } = await context.params;
    const development = await getDevelopmentById(id, user.role);
    if (!development) {
      return NextResponse.json({ error: 'Empreendimento não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, development }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao consultar empreendimento:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao consultar empreendimento.' },
      { status: 500 }
    );
  }
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
    const updated = await updateDevelopment(id, body, user.id);
    return NextResponse.json({ success: true, development: updated }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao atualizar empreendimento:', error);
    const status = error.code === 'NOT_FOUND' ? 404 : error.code === 'CONFLICT' ? 409 : 400;
    return NextResponse.json(
      { error: error.message || 'Erro ao processar atualização de empreendimento.' },
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
    const updated = await toggleDevelopmentStatus(id, user.id);
    return NextResponse.json(
      { success: true, message: `Status do empreendimento alterado para ${updated.status}.`, development: updated },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Erro ao alterar status de empreendimento:', error);
    const status = error.code === 'NOT_FOUND' ? 404 : 400;
    return NextResponse.json(
      { error: error.message || 'Erro ao alterar status do empreendimento.' },
      { status }
    );
  }
}

