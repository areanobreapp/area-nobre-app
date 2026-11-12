import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { unlinkDevelopmentContact } from '@/lib/development-service';

interface RouteContext {
  params: Promise<{ id: string; contactId: string }>;
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

    const { id, contactId } = await context.params;
    const result = await unlinkDevelopmentContact(id, contactId, user.id);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao desvincular contato do empreendimento:', error);
    const status = error.code === 'NOT_FOUND' ? 404 : 400;
    return NextResponse.json(
      { error: error.message || 'Erro ao desvincular contato.' },
      { status }
    );
  }
}

