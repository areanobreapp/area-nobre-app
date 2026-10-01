import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import PropertyForm from '@/components/PropertyForm';

export default async function NovoImovelPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return <PropertyForm />;
}
