import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import PropertyForm from '@/components/PropertyForm';

export default async function EditarImovelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;

  const property = await prisma.property.findFirst({
    where: { id, userId: user.id },
    include: {
      images: {
        orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
      },
    },
  });

  if (!property) {
    redirect('/imoveis');
  }

  return <PropertyForm initialData={property} isEditing={true} />;
}
