'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { cn } from '@/lib/utils';
import {
  VARIABLE_PATTERN,
  getVariableDisplayName,
  type Locale,
} from '@/lib/template-variables';

export interface VariableEditorHandle {
  /** Insert a variable at the current cursor position (or append if unfocused). */
  insertVariable: (key: string) => void;
  /** Move focus into the editor. */
  focus: () => void;
}

interface VariableEditorProps {
  /** The current raw template value, e.g. `You have {{stamp_count}} stamps.` */
  value: string;
  /** Called with the updated raw template whenever the user types or a pill is added/removed. */
  onChange: (next: string) => void;
  /** Locale to use when rendering pill display names. */
  locale: Locale;
  /** Placeholder shown when the editor is empty. */
  placeholder?: string;
  /** Optional aria-label. */
  ariaLabel?: string;
  className?: string;
}

const PILL_KEY_ATTR = 'data-variable-key';
const PILL_REMOVE_ATTR = 'data-variable-remove';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderPillHtml(key: string, label: string): string {
  const safeKey = escapeHtml(key);
  const safeLabel = escapeHtml(label);
  return (
    `<span class="var-pill" contenteditable="false" ${PILL_KEY_ATTR}="${safeKey}">` +
    `<span class="var-pill-label">{{${safeLabel}}}</span>` +
    `<button type="button" class="var-pill-remove" ${PILL_REMOVE_ATTR} ` +
    `aria-label="Remove ${safeLabel}" tabindex="-1">` +
    `<svg viewBox="0 0 12 12" aria-hidden="true" width="10" height="10">` +
    `<path d="M3 3 L9 9 M9 3 L3 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />` +
    `</svg>` +
    `</button>` +
    `</span>`
  );
}

/** Convert a plain template string to pill-annotated HTML for the editor. */
function renderHtml(value: string, locale: Locale): string {
  if (!value) return '';
  const parts: string[] = [];
  let lastIndex = 0;
  VARIABLE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = VARIABLE_PATTERN.exec(value)) !== null) {
    if (match.index > lastIndex) {
      parts.push(escapeHtml(value.substring(lastIndex, match.index)));
    }
    const key = match[1];
    const label = getVariableDisplayName(key, locale);
    parts.push(renderPillHtml(key, label));
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < value.length) {
    parts.push(escapeHtml(value.substring(lastIndex)));
  }
  return parts.join('');
}

/** Walk the editor DOM and serialize it back to a plain template string. */
function serializeDom(root: HTMLElement): string {
  let out = '';
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? '';
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const varKey = el.getAttribute(PILL_KEY_ATTR);
    if (varKey) {
      out += `{{${varKey}}}`;
      return;
    }
    if (el.tagName === 'BR') {
      out += '\n';
      return;
    }
    for (const child of Array.from(el.childNodes)) walk(child);
  };
  for (const child of Array.from(root.childNodes)) walk(child);
  return out;
}

export const VariableEditor = forwardRef<VariableEditorHandle, VariableEditorProps>(
  function VariableEditor(
    { value, onChange, locale, placeholder, ariaLabel, className },
    ref
  ) {
    const editorRef = useRef<HTMLDivElement>(null);
    // Last value we wrote into the DOM — lets us avoid re-rendering (and
    // losing the cursor) when the incoming value prop is just an echo of
    // our own emit from handleInput.
    const lastSyncedRef = useRef<string>('');

    // Keep the DOM in sync with the value prop when the source is external
    // (tab switch, reset button, external insertion via the ref handle).
    // Typing is handled in handleInput which bypasses this because it calls
    // onChange with the same string we just serialized.
    useEffect(() => {
      const el = editorRef.current;
      if (!el) return;
      if (lastSyncedRef.current === value) return;
      const currentText = serializeDom(el);
      if (currentText === value) {
        lastSyncedRef.current = value;
        return;
      }
      el.innerHTML = renderHtml(value, locale);
      lastSyncedRef.current = value;
    }, [value, locale]);

    const emit = useCallback(() => {
      const el = editorRef.current;
      if (!el) return;
      const text = serializeDom(el);
      lastSyncedRef.current = text;
      onChange(text);
    }, [onChange]);

    const handleInput = useCallback(() => {
      emit();
    }, [emit]);

    // Delegated click handler — catches X-button taps inside pills.
    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        const removeBtn = target.closest(`[${PILL_REMOVE_ATTR}]`);
        if (!removeBtn) return;
        const pill = removeBtn.closest(`[${PILL_KEY_ATTR}]`);
        if (pill?.parentNode) {
          pill.parentNode.removeChild(pill);
          emit();
        }
      },
      [emit]
    );

    const insertVariableAtCursor = useCallback(
      (key: string) => {
        const el = editorRef.current;
        if (!el) return;
        const label = getVariableDisplayName(key, locale);
        const template = document.createElement('template');
        template.innerHTML = renderPillHtml(key, label);
        const pillNode = template.content.firstChild;
        if (!pillNode) return;

        el.focus();
        const selection = window.getSelection();
        const range =
          selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

        if (range && el.contains(range.commonAncestorContainer)) {
          range.deleteContents();
          range.insertNode(pillNode);
          // Move caret after the inserted pill.
          const after = document.createRange();
          after.setStartAfter(pillNode);
          after.collapse(true);
          selection?.removeAllRanges();
          selection?.addRange(after);
        } else {
          el.appendChild(pillNode);
          // Place caret at end.
          const after = document.createRange();
          after.selectNodeContents(el);
          after.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(after);
        }
        emit();
      },
      [emit, locale]
    );

    useImperativeHandle(
      ref,
      () => ({
        insertVariable: insertVariableAtCursor,
        focus: () => editorRef.current?.focus(),
      }),
      [insertVariableAtCursor]
    );

    return (
      <div
        ref={editorRef}
        role="textbox"
        aria-label={ariaLabel}
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={handleInput}
        onClick={handleClick}
        className={cn(
          'var-editor min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs',
          'outline-none transition-[color,box-shadow]',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'whitespace-pre-wrap break-words',
          className
        )}
      />
    );
  }
);
