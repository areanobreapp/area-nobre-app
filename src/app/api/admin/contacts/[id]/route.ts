import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCompanyContactById, updateCompanyContact, deleteCompanyContact } from '@/lib/company-service';

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
    const contact = await getCompanyContactById(id, user.role);
    if (!contact) {
      return NextResponse.json({ error: 'Contato não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, contact }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao consultar contato:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao consultar contato.' },
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
    const updated = await updateCompanyContact(id, body, user.id);
    return NextResponse.json({ success: true, contact: updated }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao atualizar contato:', error);
    const status = error.code === 'NOT_FOUND' ? 404 : 400;
    return NextResponse.json(
      { error: error.message || 'Erro ao processar atualização de contato.' },
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
    const result = await deleteCompanyContact(id, user.id);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao excluir contato:', error);
    const status = error.code === 'NOT_FOUND' ? 404 : 400;
    return NextResponse.json(
      { error: error.message || 'Erro ao excluir contato.' },
      { status }
    );
  }
}

