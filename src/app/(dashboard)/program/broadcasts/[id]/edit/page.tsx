'use client';

import { use } from 'react';
import { BroadcastWizardEntry } from '../../_wizard';

interface EditBroadcastPageProps {
  params: Promise<{ id: string }>;
}

export default function EditBroadcastPage({
  params,
}: Readonly<EditBroadcastPageProps>) {
  const { id } = use(params);
  return <BroadcastWizardEntry forcedEditId={id} />;
}
