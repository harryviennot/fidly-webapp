'use client';

import { cn } from '@/lib/utils';

interface WizardFieldProps {
  /** Visible label rendered above the field. Omit for label-less fields. */
  label?: string;
  /** When the field has a focusable input, link the label to it. */
  htmlFor?: string;
  /** Calm helper line rendered tightly under the control. */
  helper?: React.ReactNode;
  /** Red error line. Takes precedence over `helper` when set. */
  error?: React.ReactNode;
  /** When true, an accent asterisk is appended to the label. */
  required?: boolean;
  children: React.ReactNode;
}

/**
 * Wizard form field wrapper. Pairs a label with a control at `gap-3` (the
 * spacing used by the ProfileStep section headers) and renders an optional
 * helper / error line tightly underneath at `gap-1.5`. Use as the building
 * block for any form field in the wizard so spacing + label sizing stay
 * consistent.
 *
 *   <WizardField label="Business name">
 *     <Input id="biz-name" … />
 *   </WizardField>
 */
export function WizardField({
  label,
  htmlFor,
  helper,
  error,
  required,
  children,
}: WizardFieldProps) {
  const hasFooter = error !== undefined || helper !== undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col gap-3">
        {label && (
          <label
            htmlFor={htmlFor}
            className="wiz-body-sm font-medium text-[var(--foreground)]"
          >
            {label}
            {required && (
              <span
                aria-hidden="true"
                className="ml-0.5 text-[var(--accent)]"
              >
                *
              </span>
            )}
          </label>
        )}
        {children}
      </div>
      {hasFooter && (
        <p
          className={cn(
            'wiz-helper',
            error !== undefined ? 'text-red-600 font-medium' : 'text-[#999]'
          )}
        >
          {error ?? helper}
        </p>
      )}
    </div>
  );
}
