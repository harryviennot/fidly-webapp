'use client';

import { useTranslations } from 'next-intl';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SwitchProgramTypeDialogProps {
  open: boolean;
  /** Which type we are switching TO (drives the copy). */
  toType: 'stamp' | 'points';
  /** How many test cards will be converted in place. */
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirms an onboarding type switch when test cards already exist. Non
 * destructive: the card(s) are reused and update automatically — nobody has to
 * remove or re-add anything. Only shown when at least one test customer exists
 * (0 → the switch is silent; > MAX_SWITCH_CUSTOMERS → the CTA is blocked).
 */
export function SwitchProgramTypeDialog({
  open,
  toType,
  count,
  onConfirm,
  onCancel,
}: SwitchProgramTypeDialogProps) {
  const t = useTranslations(
    'onboardingBusiness.chapters.program.steps.program.switchDialog'
  );
  const target = toType === 'points' ? t('typePoints') : t('typeStamps');

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('title', { type: target })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('body', { count, type: target })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{t('confirm')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
