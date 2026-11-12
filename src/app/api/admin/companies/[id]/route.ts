import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCompanyById, updateCompany, safeDeleteCompany } from '@/lib/company-service';

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
    const company = await getCompanyById(id, user.role);
    if (!company) {
      return NextResponse.json({ error: 'Construtora não encontrada.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, company }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao consultar construtora:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao consultar construtora.' },
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
    const updated = await updateCompany(id, body, user.id);
    return NextResponse.json({ success: true, company: updated }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao atualizar construtora:', error);
    const status = error.code === 'NOT_FOUND' ? 404 : error.code === 'CONFLICT' ? 409 : 400;
    return NextResponse.json(
      { error: error.message || 'Erro ao processar atualização de construtora.' },
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
    const result = await safeDeleteCompany(id, user.id);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao excluir construtora:', error);
    const status = error.code === 'NOT_FOUND' ? 404 : error.code === 'CONFLICT' ? 409 : 400;
    return NextResponse.json(
      { error: error.message || 'Erro ao excluir construtora.' },
      { status }
    );
  }
}

