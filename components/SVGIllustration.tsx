'use client';

import React from 'react';

interface SVGIllustrationProps {
  svgCode: string;
  className?: string;
}

export default function SVGIllustration({ svgCode, className }: SVGIllustrationProps) {
  // Simple check to ensure we have an SVG
  if (!svgCode.includes('<svg')) {
    return <div className="bg-gray-100 p-4 rounded text-xs">Invalid SVG Code</div>;
  }

  // We use dangerouslySetInnerHTML because we trust the AI output in this sandboxed context
  // and we want to render the raw SVG.
  return (
    <div 
      className={`relative w-full overflow-hidden flex items-center justify-center ${className}`}
      dangerouslySetInnerHTML={{ __html: svgCode }}
    />
  );
}
