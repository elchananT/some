'use client';

import React, { useMemo } from 'react';
import { sanitizeSVG } from '@/lib/security/sanitize';

interface SVGIllustrationProps {
  svgCode: string;
  className?: string;
}

export default function SVGIllustration({ svgCode, className }: SVGIllustrationProps) {
  // SECURITY: AI-generated SVG is untrusted — sanitize (strip <script>,
  // <foreignObject>, on*= handlers, javascript: URLs) before injection.
  const safe = useMemo(() => sanitizeSVG(svgCode), [svgCode]);

  if (!safe.includes('<svg')) {
    return <div className="bg-gray-100 p-4 rounded text-xs">Invalid SVG Code</div>;
  }

  return (
    <div
      className={`relative w-full overflow-hidden flex items-center justify-center ${className}`}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
