import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import {
  getLegalAcceptancesAudit,
  getPropertyAuthorizationsAudit,
} from '@/lib/legal/service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: 'Acesso negado. Esta rota é restrita a administradores da Área Nobre.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const tab = searchParams.get('tab') || 'acceptances';
    const search = searchParams.get('search') || undefined;
    const type = searchParams.get('type') || undefined;
    const version = searchParams.get('version') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (tab === 'authorizations') {
      const data = await getPropertyAuthorizationsAudit({
        status,
        search,
        limit,
        offset,
      });
      return NextResponse.json({
        success: true,
        tab: 'authorizations',
        ...data,
      });
    }

    // Padrão: aceites e ciências gerais
    const data = await getLegalAcceptancesAudit({
      type,
      version,
      search,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      tab: 'acceptances',
      ...data,
    });
  } catch (error: any) {
    console.error('[api/admin/legal/audit] Erro ao consultar auditoria:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao consultar auditoria legal.' },
      { status: 500 }
    );
  }
}
