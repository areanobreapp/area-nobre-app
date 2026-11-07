import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserLegalStatus } from '@/lib/legal/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    const status = await getUserLegalStatus(user?.id);

    return NextResponse.json(status, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[api/legal/status] Erro ao consultar status legal:', error);
    return NextResponse.json(
      { error: 'Erro ao consultar status dos documentos legais.' },
      { status: 500 }
    );
  }
}
