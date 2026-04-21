'use client';

import React, { useState } from 'react';
import type { ColorPalette, StyleVariant, VariantKey, WorkbookStyle } from '@/lib/themes';
import { getVariants, mergePalette } from '@/lib/themes';

interface StyleCardProps {
  style: WorkbookStyle;
  selected?: boolean;
  onSelect: (style: WorkbookStyle, variant: StyleVariant) => void;
}

/**
 * Live, token-driven preview of a workbook style as a tiny SVG spread.
 * Users can pick Warm / Cool / Bold variants to re-tint the preview instantly,
 * and the selected variant is passed upward on click.
 */
export default function StyleCard({ style, selected, onSelect }: StyleCardProps) {
  const variants = getVariants(style);
  const [variantKey, setVariantKey] = useState<VariantKey>(variants[0].key);
  const variant = variants.find(v => v.key === variantKey) || variants[0];
  const palette = mergePalette(style.palette, variant.paletteOverride);

  const fontClass =
    style.fontFamily === 'serif'
      ? 'font-serif'
      : style.fontFamily === 'mono'
        ? 'font-mono'
        : 'font-sans';

  return (
    <div
      className={`group flex flex-col rounded-2xl border transition-all cursor-pointer overflow-hidden ${
        selected
          ? 'border-[var(--color-accent,#CC785C)] shadow-md'
          : 'border-[var(--color-border,#E8E4DC)] hover:border-[var(--color-accent,#CC785C)]/60'
      }`}
      onClick={() => onSelect(style, variant)}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(style, variant);
      }}
    >
      <MiniSpread palette={palette} fontFamily={style.fontFamily} name={style.name} />

      <div className={`p-4 bg-[var(--color-surface,#FFFFFF)] ${fontClass}`}>
        <h4 className="text-sm font-semibold text-[var(--color-ink,#1F1F1C)]">{style.name}</h4>
        <p className="text-xs text-[var(--color-muted,#7A756B)] mt-1 line-clamp-2">
          {style.description}
        </p>

        <div className="mt-3 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          {variants.map(v => {
            const p = mergePalette(style.palette, v.paletteOverride);
            const active = v.key === variantKey;
            return (
              <button
                key={v.key}
                onClick={() => setVariantKey(v.key)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] uppercase tracking-widest border transition-all ${
                  active
                    ? 'border-[var(--color-accent,#CC785C)] bg-[var(--color-accent,#CC785C)]/10 text-[var(--color-ink,#1F1F1C)]'
                    : 'border-[var(--color-border,#E8E4DC)] text-[var(--color-muted,#7A756B)] hover:text-[var(--color-ink,#1F1F1C)]'
                }`}
                aria-pressed={active}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: p.accent }}
                  aria-hidden
                />
                {v.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MiniSpread({
  palette,
  fontFamily,
  name,
}: {
  palette: ColorPalette;
  fontFamily: WorkbookStyle['fontFamily'];
  name: string;
}) {
  const headingFont =
    fontFamily === 'serif'
      ? 'Source Serif 4, Georgia, serif'
      : fontFamily === 'mono'
        ? 'JetBrains Mono, monospace'
        : 'Inter, system-ui, sans-serif';

  return (
    <svg
      viewBox="0 0 320 180"
      className="w-full h-auto block"
      role="img"
      aria-label={`Preview of ${name} style`}
    >
      <rect width="320" height="180" fill={palette.background} />
      {/* Accent top rule */}
      <rect x="20" y="20" width="40" height="3" fill={palette.accent} rx="1.5" />
      {/* Heading */}
      <text
        x="20"
        y="48"
        fill={palette.primary}
        fontFamily={headingFont}
        fontSize="16"
        fontWeight="600"
      >
        {name}
      </text>
      {/* Body lines */}
      {[62, 72, 82, 92, 102].map((y, i) => (
        <rect
          key={y}
          x="20"
          y={y}
          width={i === 4 ? 140 : 220}
          height="3"
          fill={palette.text}
          opacity={0.25}
          rx="1.5"
        />
      ))}
      {/* Accent shape */}
      <circle cx="270" cy="55" r="18" fill={palette.accent} opacity={0.85} />
      <rect x="250" y="90" width="50" height="50" fill={palette.secondary} rx="6" />
      <rect x="260" y="102" width="30" height="2" fill={palette.primary} opacity={0.5} />
      <rect x="260" y="110" width="22" height="2" fill={palette.primary} opacity={0.5} />
      <rect x="260" y="118" width="28" height="2" fill={palette.primary} opacity={0.5} />
      <rect x="260" y="126" width="18" height="2" fill={palette.primary} opacity={0.5} />
      {/* Footer rule */}
      <rect x="20" y="160" width="280" height="1" fill={palette.text} opacity={0.2} />
    </svg>
  );
}
