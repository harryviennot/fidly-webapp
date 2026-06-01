'use client';

import { useRouter } from 'next/navigation';
import { KeyValueList } from '@/components/reusables';
import { cn } from '@/lib/utils';
import {
  getVariableDisplayName,
  type Locale,
  type VariableKey,
} from '@/lib/template-variables';

interface VariablesListProps {
  /** Variable keys to render, in order. */
  variables: readonly VariableKey[];
  /** Example value shown to the right of each row (e.g. "Westside"). */
  examples: Partial<Record<VariableKey, string>>;
  /** Locale used to localise the variable token shown to the user. */
  locale: Locale;
  /** Keys to render greyed out and non-insertable. */
  disabledVariables?: ReadonlySet<VariableKey>;
  /** Tooltip text per disabled key. Plain string. */
  disabledTooltips?: Partial<Record<VariableKey, string>>;
  /** Per-key destination when the user clicks a disabled row. The row becomes
   *  a button that pushes this href via Next router. */
  disabledHrefs?: Partial<Record<VariableKey, string>>;
}

/**
 * Sidebar reference list of template variables with their resolved sample
 * value. Mirrors `VariableChips`'s prop shape on purpose so adding a new
 * variable in the future is just:
 *   1. add the key to `VARIABLE_KEYS` in lib/template-variables.ts
 *   2. add an entry to `examples`
 *   3. (optional) include the key in `disabledVariables` + matching
 *      `disabledTooltips` / `disabledHrefs` entries when it should be locked
 */
export function VariablesList({
  variables,
  examples,
  locale,
  disabledVariables,
  disabledTooltips,
  disabledHrefs,
}: VariablesListProps) {
  const router = useRouter();

  const items = variables.map((key) => {
    const isDisabled = disabledVariables?.has(key) ?? false;
    const tooltip = isDisabled ? disabledTooltips?.[key] : undefined;
    const href = isDisabled ? disabledHrefs?.[key] : undefined;
    const example = examples[key] ?? '';

    const label = (
      <code
        className={cn(
          'text-[11px] font-mono font-bold',
          isDisabled
            ? 'text-[#A0A0A0] font-semibold'
            : 'text-[var(--accent)]'
        )}
      >
        {`{{${getVariableDisplayName(key, locale)}}}`}
      </code>
    );

    return {
      key,
      label,
      value: <>→ {example}</>,
      disabled: isDisabled,
      onClick: href ? () => router.push(href) : undefined,
      tooltip,
    };
  });

  return <KeyValueList items={items} />;
}
