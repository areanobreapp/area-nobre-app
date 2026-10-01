import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { uploadFileBuffer, UploadOptions } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const entityType = (formData.get('entityType') as UploadOptions['entityType']) || 'general';
    const entityId = (formData.get('entityId') as string) || undefined;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    // Validação de Autorização sobre o registro relacionado (Fase 5.5B - Seção 13)
    if (entityId) {
      if (entityType === 'property') {
        const property = await prisma.property.findUnique({
          where: { id: entityId },
          select: { userId: true, responsibleBrokerId: true },
        });
        if (property && user.role !== 'ADMIN' && property.userId !== user.id && property.responsibleBrokerId !== user.id) {
          return NextResponse.json(
            { error: 'Você não tem permissão para alterar mídias deste imóvel.' },
            { status: 403 }
          );
        }
      } else if (entityType === 'development') {
        const dev = await prisma.development.findUnique({
          where: { id: entityId },
          select: { userId: true, responsibleBrokerId: true },
        });
        if (dev && user.role !== 'ADMIN' && dev.userId !== user.id && dev.responsibleBrokerId !== user.id) {
          return NextResponse.json(
            { error: 'Você não tem permissão para alterar mídias deste empreendimento.' },
            { status: 403 }
          );
        }
      } else if ((entityType === 'avatar' || entityType === 'logo') && entityId !== user.id && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Você não tem permissão para alterar o perfil de outro corretor.' },
          { status: 403 }
        );
      }
    }

    const uploadedUrls: string[] = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      try {
        const result = await uploadFileBuffer(buffer, file.name, {
          entityType,
          entityId,
          userId: user.id,
          originalFilename: file.name,
        });
        uploadedUrls.push(result.url);
      } catch (uploadErr: any) {
        console.warn(`[Upload Warning]: ${uploadErr.message}`);
        // Se arquivo falhar validação (ex: não é imagem válida), ignora ou retorna erro se for único
        if (files.length === 1) {
          return NextResponse.json({ error: uploadErr.message }, { status: 400 });
        }
      }
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma imagem válida foi enviada. Formatos suportados: JPG, PNG, WEBP.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
    });
  } catch (error: any) {
    console.error('Erro no upload de fotos:', error);
    return NextResponse.json({ error: error.message || 'Falha ao processar upload.' }, { status: 500 });
  }
}
