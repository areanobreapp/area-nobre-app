import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  updateCommercialMaterial,
  deleteCommercialMaterial,
  UpdateMaterialInput,
  MaterialVisibilityValue,
} from '@/lib/commercial-material-service';
import { uploadCommercialMaterialFile } from '@/lib/material-storage';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito à administração.' }, { status: 403 });
    }

    const { id } = await params;
    const material = await prisma.commercialMaterial.findUnique({
      where: { id },
      include: {
        development: { select: { id: true, name: true } },
        typology: { select: { id: true, name: true, propertyType: true } },
        block: { select: { id: true, name: true, blockType: true } },
        commercialUnit: { select: { id: true, unitCode: true } },
      },
    });

    if (!material) {
      return NextResponse.json({ error: 'Material comercial não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ material });
  } catch (err: any) {
    console.error('[API Admin Material GET Error]:', err);
    return NextResponse.json({ error: err.message || 'Erro ao carregar material.' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito à administração.' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.commercialMaterial.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Material comercial não encontrado.' }, { status: 404 });
    }

    const contentType = req.headers.get('content-type') || '';
    let payload: UpdateMaterialInput = {};

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const title = formData.get('title') as string | null;
      const category = formData.get('category') as string | null;
      const description = formData.get('description') as string | null;
      const visibility = formData.get('visibility') as string | null;
      const allowDownload = formData.get('allowDownload') as string | null;
      const allowBrokerShare = formData.get('allowBrokerShare') as string | null;
      const isActive = formData.get('isActive') as string | null;
      const displayOrder = formData.get('displayOrder') as string | null;
      const typologyId = formData.get('typologyId') as string | null;
      const blockId = formData.get('blockId') as string | null;
      const commercialUnitId = formData.get('commercialUnitId') as string | null;
      const versionLabel = formData.get('versionLabel') as string | null;
      const externalUrl = formData.get('externalUrl') as string | null;

      if (title !== null) payload.title = title;
      if (category !== null) payload.category = category;
      if (description !== null) payload.description = description;
      if (visibility !== null) payload.visibility = visibility as MaterialVisibilityValue;
      if (allowDownload !== null) payload.allowDownload = allowDownload !== 'false';
      if (allowBrokerShare !== null) payload.allowBrokerShare = allowBrokerShare !== 'false';
      if (isActive !== null) payload.isActive = isActive !== 'false';
      if (displayOrder !== null) payload.displayOrder = parseInt(displayOrder, 10);
      if (typologyId !== null) payload.typologyId = typologyId || null;
      if (blockId !== null) payload.blockId = blockId || null;
      if (commercialUnitId !== null) payload.commercialUnitId = commercialUnitId || null;
      if (versionLabel !== null) payload.versionLabel = versionLabel || null;

      if (file && file.size > 0 && existing.developmentId) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const uploadResult = await uploadCommercialMaterialFile(
          buffer,
          file.name,
          existing.developmentId,
          payload.visibility || (existing.visibility as any)
        );

        payload.fileUrl = uploadResult.url;
        payload.storagePath = uploadResult.storagePath;
        payload.fileType = uploadResult.fileType;
        payload.fileExtension = uploadResult.fileExtension;
        payload.fileSizeBytes = uploadResult.fileSizeBytes;
      } else if (externalUrl) {
        payload.fileUrl = externalUrl;
      }
    } else {
      payload = await req.json();
    }

    const updated = await updateCommercialMaterial(id, payload);

    return NextResponse.json({ material: updated });
  } catch (err: any) {
    console.error('[API Admin Material PATCH Error]:', err);
    return NextResponse.json({ error: err.message || 'Erro ao atualizar material.' }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito à administração.' }, { status: 403 });
    }

    const { id } = await params;
    await deleteCommercialMaterial(id);

    return NextResponse.json({ success: true, message: 'Material excluído com sucesso.' });
  } catch (err: any) {
    console.error('[API Admin Material DELETE Error]:', err);
    return NextResponse.json({ error: err.message || 'Erro ao excluir material.' }, { status: 400 });
  }
}
