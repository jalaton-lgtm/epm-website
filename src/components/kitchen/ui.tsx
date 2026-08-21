// Shared interface pieces.
//
// Every component in this folder is declared at module scope. That sounds like
// a truism, but the prototype declared all five of its screens inside the body
// of the root component, which gives them a new identity on every parent
// render: React tears the old tree down and builds a new one, so an open
// dialog closes and a half-typed search box empties whenever anything upstream
// changes. Keeping them out here is the fix.

import { useEffect, useRef } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

// ---------------------------------------------------------------------------

export function Bar({
  label,
  current,
  target,
  unit = 'g',
  tone = 'accent',
}: {
  label: string;
  current: number;
  target: number;
  unit?: string;
  tone?: 'accent' | 'protein' | 'carbs' | 'fat';
}) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const over = target > 0 && current > target * 1.05;
  const rounded = Math.round(current);

  return (
    <div class="k-bar">
      <div class="k-bar-head">
        <span>{label}</span>
        {/* The numbers are the accessible content; the bar is decoration, so
            it is aria-hidden rather than given a redundant role. */}
        <span class={over ? 'k-over' : ''}>
          {rounded}<span class="k-dim">/{target}{unit}</span>
        </span>
      </div>
      <div class={`k-bar-track k-tone-${tone}`} aria-hidden="true">
        <div class={`k-bar-fill${over ? ' k-bar-over' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

/**
 * A dialog that can actually be dismissed.
 *
 * The prototype's modal had no Escape handler, no focus management and no
 * backdrop click — once open on a phone the only way out was the browser back
 * button. Escape, backdrop, an autofocused close, and focus returned to
 * whatever opened it.
 */
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ComponentChildren;
  wide?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    opener.current = document.activeElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !panel.current) return;
      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLElement>('button, input')?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [onClose]);

  return (
    <div class="k-backdrop" onClick={onClose}>
      <div
        class={`k-modal${wide ? ' k-modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={panel}
        onClick={(e) => e.stopPropagation()}
      >
        <div class="k-modal-head">
          <h3>{title}</h3>
          <button class="k-icon" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div class="k-modal-body">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ComponentChildren;
}) {
  return (
    <label class="k-field">
      <span class="k-field-label">{label}</span>
      {children}
      {hint && <span class="k-field-hint">{hint}</span>}
    </label>
  );
}

export function NumberInput({
  value,
  onInput,
  step = 1,
  min,
  max,
  suffix,
}: {
  value: number;
  onInput: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <span class="k-numwrap">
      <input
        type="number"
        class="k-input"
        value={Number.isFinite(value) ? value : ''}
        step={step}
        min={min}
        max={max}
        onInput={(e) => {
          const raw = (e.target as HTMLInputElement).value;
          // An empty box means "mid-edit", not zero — clobbering it with 0
          // makes the field impossible to clear and retype.
          if (raw === '') return;
          const n = Number(raw);
          if (Number.isFinite(n)) onInput(n);
        }}
      />
      {suffix && <span class="k-suffix">{suffix}</span>}
    </span>
  );
}

/**
 * −/+ stepper. The training toggle, and the portion control.
 *
 * Hands back BOTH the value it computed and the direction it moved, because
 * the value is derived from a prop that may already be stale. Two taps inside
 * one render both read the same `value` and both resolve to the same result,
 * so the second is swallowed — measurable with two synthetic clicks in a
 * single tick, and reachable by a fast double-tap on a phone. Callers that
 * care take `delta` and apply it to current state inside their updater, which
 * cannot go stale.
 */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 9,
  step = 1,
  label,
}: {
  value: number;
  onChange: (n: number, delta: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n / step) * step));
  return (
    <span class="k-stepper">
      <button
        type="button"
        onClick={() => onChange(clamp(value - step), -step)}
        disabled={value <= min}
        aria-label={`Decrease ${label}`}
      >
        −
      </button>
      <span class="k-stepper-value" aria-live="polite">
        {Number.isInteger(value) ? value : value.toFixed(1)}
      </span>
      <button
        type="button"
        onClick={() => onChange(clamp(value + step), step)}
        disabled={value >= max}
        aria-label={`Increase ${label}`}
      >
        +
      </button>
    </span>
  );
}

export function Empty({ children }: { children: ComponentChildren }) {
  return <p class="k-empty">{children}</p>;
}
