import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  listCommercialMaterialsForAdmin,
  createCommercialMaterial,
  CreateMaterialInput,
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

    const { id: developmentId } = await params;
    const materials = await listCommercialMaterialsForAdmin(developmentId);

    return NextResponse.json({ materials });
  } catch (err: any) {
    console.error('[API Admin Materials GET Error]:', err);
    return NextResponse.json({ error: err.message || 'Erro ao carregar materiais.' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito à administração.' }, { status: 403 });
    }

    const { id: developmentId } = await params;
    const contentType = req.headers.get('content-type') || '';

    let payload: CreateMaterialInput;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const title = (formData.get('title') as string) || '';
      const category = (formData.get('category') as string) || 'OUTRO';
      const description = (formData.get('description') as string) || null;
      const visibility = ((formData.get('visibility') as string) || 'BROKERS_ONLY') as MaterialVisibilityValue;
      const allowDownload = formData.get('allowDownload') !== 'false';
      const allowBrokerShare = formData.get('allowBrokerShare') !== 'false';
      const displayOrder = parseInt((formData.get('displayOrder') as string) || '0', 10);
      const typologyId = (formData.get('typologyId') as string) || null;
      const blockId = (formData.get('blockId') as string) || null;
      const commercialUnitId = (formData.get('commercialUnitId') as string) || null;
      const versionLabel = (formData.get('versionLabel') as string) || null;
      const externalUrl = (formData.get('externalUrl') as string) || null;

      if (file && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const uploadResult = await uploadCommercialMaterialFile(
          buffer,
          file.name,
          developmentId,
          visibility
        );

        payload = {
          developmentId,
          title: title || file.name.replace(/\.[^/.]+$/, ''),
          category,
          description,
          fileUrl: uploadResult.url,
          storagePath: uploadResult.storagePath,
          fileType: uploadResult.fileType,
          fileExtension: uploadResult.fileExtension,
          fileSizeBytes: uploadResult.fileSizeBytes,
          versionLabel,
          visibility,
          allowDownload,
          allowBrokerShare,
          displayOrder,
          typologyId,
          blockId,
          commercialUnitId,
          uploadedById: user.id,
        };
      } else if (externalUrl) {
        payload = {
          developmentId,
          title,
          category,
          description,
          fileUrl: externalUrl,
          versionLabel,
          visibility,
          allowDownload,
          allowBrokerShare,
          displayOrder,
          typologyId,
          blockId,
          commercialUnitId,
          uploadedById: user.id,
        };
      } else {
        return NextResponse.json(
          { error: 'É necessário enviar um arquivo ou fornecer um endereço externo.' },
          { status: 400 }
        );
      }
    } else {
      // JSON payload
      const body = await req.json();
      payload = {
        ...body,
        developmentId,
        uploadedById: user.id,
      };
    }

    const material = await createCommercialMaterial(payload);

    return NextResponse.json({ material }, { status: 201 });
  } catch (err: any) {
    console.error('[API Admin Materials POST Error]:', err);
    return NextResponse.json({ error: err.message || 'Erro ao cadastrar material.' }, { status: 400 });
  }
}
