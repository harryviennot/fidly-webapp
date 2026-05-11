import { WizardShell } from '@/components/onboarding/WizardShell';

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function OnboardingBusinessPage({ params }: PageProps) {
  const { slug } = await params;
  return <WizardShell slug={slug} />;
}
