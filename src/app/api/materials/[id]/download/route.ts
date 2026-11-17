import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMaterialWithAuthCheck } from '@/lib/commercial-material-service';
import { createMaterialStreamResponse } from '@/lib/material-storage';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const check = await getMaterialWithAuthCheck(id, user);
    if (!check.material) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    if (!check.material.allowDownload && user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'O download deste documento não foi autorizado pelo administrador.' },
        { status: 403 }
      );
    }

    return await createMaterialStreamResponse(check.material, 'attachment');
  } catch (err: any) {
    console.error('[API Material Download Error]:', err);
    return NextResponse.json({ error: 'Erro ao baixar material.' }, { status: 500 });
  }
}
