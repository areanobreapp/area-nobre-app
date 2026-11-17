import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  createCommercialMaterial,
  updateCommercialMaterial,
  deleteCommercialMaterial,
} from '@/lib/commercial-material-service';
import {
  uploadCommercialMaterialFile,
  validateMaterialMagicBytes,
} from '@/lib/material-storage';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { id: typologyId } = await params;

    const typology = await prisma.typology.findUnique({
      where: { id: typologyId },
      select: { id: true, name: true, developmentId: true },
    });

    if (!typology) {
      return NextResponse.json({ error: 'Tipologia não encontrada.' }, { status: 404 });
    }

    const plants = await prisma.commercialMaterial.findMany({
      where: {
        typologyId,
        category: 'PLANTA_TIPOLOGIA',
        isActive: true,
      },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ success: true, plants }, { status: 200 });
  } catch (err: any) {
    console.error('[API Typology Plants GET Error]:', err);
    return NextResponse.json({ error: 'Erro ao listar plantas da tipologia.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { id: typologyId } = await params;

    const typology = await prisma.typology.findUnique({
      where: { id: typologyId },
      include: {
        development: { select: { id: true, name: true } },
      },
    });

    if (!typology) {
      return NextResponse.json({ error: 'Tipologia não encontrada.' }, { status: 404 });
    }

    const contentType = req.headers.get('content-type') || '';

    // Caso 1: Upload de Arquivo via FormData
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const title = (formData.get('title') as string) || `Planta — ${typology.name}`;
      const isPrimary = formData.get('isPrimary') === 'true';
      const visibility = (formData.get('visibility') as string) || 'PUBLIC';

      if (!file) {
        return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const magicCheck = validateMaterialMagicBytes(buffer, file.name);
      if (!magicCheck.valid) {
        return NextResponse.json({ error: magicCheck.error }, { status: 400 });
      }

      // Upload seguro para o Supabase Storage ou fallback local
      const uploadRes = await uploadCommercialMaterialFile(
        buffer,
        file.name,
        typology.developmentId,
        (visibility as any) || 'PUBLIC'
      );

      // Quantidade atual de plantas vinculadas para calcular displayOrder
      const currentCount = await prisma.commercialMaterial.count({
        where: { typologyId, category: 'PLANTA_TIPOLOGIA' },
      });

      // Se for a primeira planta ou marcada como principal, displayOrder = 0
      const shouldBePrimary = isPrimary || currentCount === 0;

      if (shouldBePrimary && currentCount > 0) {
        // Empurra as existentes para displayOrder >= 1
        await prisma.commercialMaterial.updateMany({
          where: { typologyId, category: 'PLANTA_TIPOLOGIA' },
          data: { displayOrder: { increment: 1 } },
        });
      }

      const material = await createCommercialMaterial({
        developmentId: typology.developmentId,
        typologyId,
        title: title.trim(),
        category: 'PLANTA_TIPOLOGIA',
        fileUrl: uploadRes.url,
        storagePath: uploadRes.storagePath,
        fileType: uploadRes.fileType,
        fileExtension: uploadRes.fileExtension,
        fileSizeBytes: uploadRes.fileSizeBytes,
        visibility: (visibility as any) || 'PUBLIC',
        allowDownload: true,
        allowBrokerShare: true,
        displayOrder: shouldBePrimary ? 0 : currentCount,
        uploadedById: user.id,
      });

      return NextResponse.json({ success: true, plant: material }, { status: 201 });
    }

    // Caso 2: JSON payload (vinculação de material existente ou link externo)
    const body = await req.json();
    const { materialId, isPrimary } = body;

    if (materialId) {
      if (isPrimary) {
        await prisma.commercialMaterial.updateMany({
          where: { typologyId, category: 'PLANTA_TIPOLOGIA' },
          data: { displayOrder: { increment: 1 } },
        });
      }

      const updated = await updateCommercialMaterial(materialId, {
        typologyId,
        category: 'PLANTA_TIPOLOGIA',
        displayOrder: isPrimary ? 0 : undefined,
      });

      return NextResponse.json({ success: true, plant: updated }, { status: 200 });
    }

    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  } catch (err: any) {
    console.error('[API Typology Plants POST Error]:', err);
    return NextResponse.json({ error: err.message || 'Erro ao cadastrar planta.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { id: typologyId } = await params;
    const body = await req.json();
    const { materialId, isPrimary, title } = body;

    if (!materialId) {
      return NextResponse.json({ error: 'materialId é obrigatório.' }, { status: 400 });
    }

    // Se solicitada definição como principal:
    if (isPrimary === true) {
      // Outras plantas passam para displayOrder >= 1
      await prisma.commercialMaterial.updateMany({
        where: {
          typologyId,
          category: 'PLANTA_TIPOLOGIA',
          id: { not: materialId },
        },
        data: { displayOrder: { increment: 1 } },
      });

      await prisma.commercialMaterial.update({
        where: { id: materialId },
        data: {
          displayOrder: 0,
          title: title ? title.trim() : undefined,
        },
      });
    } else if (title) {
      await prisma.commercialMaterial.update({
        where: { id: materialId },
        data: { title: title.trim() },
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error('[API Typology Plants PATCH Error]:', err);
    return NextResponse.json({ error: 'Erro ao atualizar planta.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { id: typologyId } = await params;
    const url = new URL(req.url);
    const materialId = url.searchParams.get('materialId');

    if (!materialId) {
      return NextResponse.json({ error: 'materialId é obrigatório.' }, { status: 400 });
    }

    // Desvincula a planta da tipologia mantendo integridade
    await prisma.commercialMaterial.update({
      where: { id: materialId },
      data: { typologyId: null },
    });

    return NextResponse.json({ success: true, message: 'Planta desvinculada com sucesso.' }, { status: 200 });
  } catch (err: any) {
    console.error('[API Typology Plants DELETE Error]:', err);
    return NextResponse.json({ error: 'Erro ao desvincular planta.' }, { status: 500 });
  }
}
