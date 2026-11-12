import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createCompanyContact, listCompanyContacts } from '@/lib/company-service';

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
    const contacts = await listCompanyContacts(id, user.role);
    return NextResponse.json({ success: true, contacts }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao listar contatos da construtora:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao consultar contatos.' },
      { status: 500 }
    );
  }
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
    const contact = await createCompanyContact(id, body, user.id);
    return NextResponse.json({ success: true, contact }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar contato da construtora:', error);
    const status = error.code === 'NOT_FOUND' ? 404 : 400;
    return NextResponse.json(
      { error: error.message || 'Erro ao cadastrar contato.' },
      { status }
    );
  }
}

