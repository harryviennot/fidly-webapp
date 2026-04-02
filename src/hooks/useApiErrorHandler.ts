/**
 * Hook for handling API errors with translated messages.
 *
 * Maps backend error codes (BILLING_REQUIRED, FEATURE_NOT_AVAILABLE,
 * LIMIT_EXCEEDED) to translated strings from the features namespace.
 * Falls back to the raw error message if no translation mapping exists.
 */
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ApiError } from '@/api/client';

export function useApiErrorHandler() {
  const t = useTranslations('features');

  /**
   * Show a translated toast for an API error.
   * Pass the caught error — handles both ApiError and plain Error.
   */
  function handleError(err: unknown, fallback?: string) {
    const message = getTranslatedMessage(err, fallback);
    toast.error(message);
  }

  /**
   * Get a translated message from an error without showing a toast.
   */
  function getTranslatedMessage(err: unknown, fallback?: string): string {
    if (err instanceof ApiError && err.code) {
      switch (err.code) {
        case 'BILLING_REQUIRED':
          return t('errors.billingRequired');
        case 'FEATURE_NOT_AVAILABLE':
          return t('errors.featureNotAvailable', {
            tier: err.requiredTier
              ? t(`tiers.${err.requiredTier}` as Parameters<typeof t>[0])
              : '',
          });
        case 'LIMIT_EXCEEDED':
          if (err.feature === 'designs.max_active') {
            return t('errors.limitExceededDesigns');
          }
          if (err.feature === 'team.max_members') {
            return t('errors.limitExceededMembers');
          }
          return t('errors.limitExceeded');
        case 'MEMBER_PAUSED':
          return t('overLimit.toastFeatureLocked', { tier: '' });
        default:
          break;
      }
    }

    if (err instanceof Error && err.message) {
      return err.message;
    }

    return fallback || t('errors.limitExceeded');
  }

  return { handleError, getTranslatedMessage };
}
