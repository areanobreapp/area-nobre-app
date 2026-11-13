import DevelopmentForm from '@/components/DevelopmentForm';

export default async function NovoEmpreendimentoPage({
  searchParams,
}: {
  searchParams?: Promise<{ companyId?: string; returnTo?: string }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  return (
    <DevelopmentForm
      initialCompanyId={sp?.companyId}
      returnTo={sp?.returnTo}
    />
  );
}
