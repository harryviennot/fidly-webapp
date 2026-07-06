import { ConvertWizardShell } from '@/components/convert/ConvertWizardShell';

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function ConvertPage({ params }: PageProps) {
  const { slug } = await params;
  return <ConvertWizardShell slug={slug} />;
}
