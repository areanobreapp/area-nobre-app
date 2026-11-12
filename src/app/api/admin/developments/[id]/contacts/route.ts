import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { linkDevelopmentContact } from '@/lib/development-service';

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

    if (!body.contactId) {
      return NextResponse.json({ error: 'ID do contato (contactId) é obrigatório.' }, { status: 400 });
    }

    const link = await linkDevelopmentContact(
      id,
      body.contactId,
      { isPrimary: body.isPrimary, customRole: body.customRole },
      user.id
    );

    return NextResponse.json({ success: true, link }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao vincular contato ao empreendimento:', error);
    const status = error.code === 'CONFLICT' ? 409 : error.code === 'NOT_FOUND' ? 404 : 400;
    return NextResponse.json(
      { error: error.message || 'Erro ao vincular contato.' },
      { status }
    );
  }
}

