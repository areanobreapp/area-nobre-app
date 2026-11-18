import { NextRequest, NextResponse } from 'next/server';
import { getPublicMaterialWithAuthCheck } from '@/lib/commercial-material-service';
import { createMaterialStreamResponse } from '@/lib/material-storage';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const check = await getPublicMaterialWithAuthCheck(id, { requireDownload: true });
    if (!check.material) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    return await createMaterialStreamResponse(check.material, 'attachment');
  } catch (err: any) {
    console.error('[API Public Material Download Error]:', err);
    return NextResponse.json({ error: 'Erro ao acessar material público.' }, { status: 500 });
  }
}
