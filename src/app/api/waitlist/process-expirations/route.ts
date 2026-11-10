import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { PropertyWaitlistService } from '@/lib/waitlist-service';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Valida autorização da requisição.
 * Aceita:
 * 1. Segredo de Cron (CRON_SECRET) via header Authorization: Bearer <token> ou x-cron-secret: <token>
 * 2. Sessão autenticada de usuário com perfil ADMIN
 */
async function authorizeCronOrAdmin(req: NextRequest): Promise<{
  authorized: boolean;
  status?: number;
  error?: string;
  triggeredBy?: 'CRON' | 'ADMIN';
  user?: any;
}> {
  // 1. Validação via segredo de cron configurado em ambiente
  const expectedCronSecret = process.env.CRON_SECRET;
  if (expectedCronSecret && expectedCronSecret.trim().length > 0) {
    const authHeader = req.headers.get('authorization');
    const xCronHeader = req.headers.get('x-cron-secret');

    let providedToken: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      providedToken = authHeader.slice(7).trim();
    } else if (xCronHeader) {
      providedToken = xCronHeader.trim();
    }

    if (providedToken) {
      const a = Buffer.from(providedToken);
      const b = Buffer.from(expectedCronSecret.trim());
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        return { authorized: true, triggeredBy: 'CRON' };
      }
    }
  }

  // 2. Validação via usuário autenticado como ADMIN
  const user = await getCurrentUser(req);
  if (!user) {
    return {
      authorized: false,
      status: 401,
      error: 'Não autorizado. Requer sessão de administrador ou token de cron válido.',
    };
  }

  if (user.role !== 'ADMIN') {
    return {
      authorized: false,
      status: 403,
      error: 'Acesso negado. Apenas administradores ou tarefas agendadas autorizadas podem executar esta rotina.',
    };
  }

  return { authorized: true, triggeredBy: 'ADMIN', user };
}

/**
 * Endpoint acionado por Vercel Cron (que envia requisições GET) ou consultas manuais autorizadas.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeCronOrAdmin(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(req.url);
    const physicalPropertyId = searchParams.get('physicalPropertyId') || undefined;

    const result = await PropertyWaitlistService.processExpiredOffers({
      physicalPropertyId,
    });

    return NextResponse.json({
      success: true,
      message: `Processamento concluído. ${result.processedCount} ofertas expiradas processadas, ${result.promotedCount} novos corretores convocados.`,
      triggeredBy: auth.triggeredBy,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error: any) {
    console.error('[GET /api/waitlist/process-expirations] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao processar expirações da lista de espera.' },
      { status: 500 }
    );
  }
}

/**
 * Endpoint acionado pelo painel de controle administrativo (/admin) ou webhooks autorizados.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeCronOrAdmin(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { physicalPropertyId } = body;

    const result = await PropertyWaitlistService.processExpiredOffers({
      physicalPropertyId,
    });

    return NextResponse.json({
      success: true,
      message: `Processamento concluído. ${result.processedCount} ofertas expiradas processadas, ${result.promotedCount} novos corretores convocados.`,
      triggeredBy: auth.triggeredBy,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error: any) {
    console.error('[POST /api/waitlist/process-expirations] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao processar expirações da lista de espera.' },
      { status: 500 }
    );
  }
}
