import React from 'react';
import Svg, { SvgProps, Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

/**
 * Lucide icon paths
 * SVGs from https://lucide.dev (ISC License)
 */
const ICON_PATHS: Record<string, string> = {
  List: '<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>',
  Grid3x3: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/>',
  Search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  Bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
  Info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  User: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  Home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
};

interface LucideIconProps extends Omit<SvgProps, 'viewBox'> {
  name: keyof typeof ICON_PATHS;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * Parse SVG path string and render SVG elements
 * This is a simplified parser for Lucide icons which use a consistent format
 */
function parseSvgPath(pathString: string, color: string, strokeWidth: number) {
  const elements: React.ReactElement[] = [];
  const regex = /<(\w+)([^>]*)\/?>(?:<\/\1>)?/g;
  let match;
  let index = 0;

  while ((match = regex.exec(pathString)) !== null) {
    const tagName = match[1];
    const attributes = match[2];

    // Parse attributes
    const attrs: Record<string, string> = {};
    const attrRegex = /(\w+)="([^"]*)"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attributes)) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }

    const commonProps = {
      key: `${tagName}-${index++}`,
      stroke: color,
      strokeWidth,
      strokeLinecap: 'round' as const,
      strokeLinejoin: 'round' as const,
      fill: 'none',
    };

    switch (tagName) {
      case 'circle':
        elements.push(
          <Circle
            {...commonProps}
            cx={attrs.cx}
            cy={attrs.cy}
            r={attrs.r}
          />
        );
        break;
      case 'line':
        elements.push(
          <Line
            {...commonProps}
            x1={attrs.x1}
            y1={attrs.y1}
            x2={attrs.x2}
            y2={attrs.y2}
          />
        );
        break;
      case 'path':
        elements.push(
          <Path
            {...commonProps}
            d={attrs.d}
          />
        );
        break;
      case 'polyline':
        elements.push(
          <Polyline
            {...commonProps}
            points={attrs.points}
          />
        );
        break;
      case 'rect':
        elements.push(
          <Rect
            {...commonProps}
            width={attrs.width}
            height={attrs.height}
            x={attrs.x}
            y={attrs.y}
            rx={attrs.rx}
            ry={attrs.ry}
          />
        );
        break;
    }
  }

  return elements;
}

export function LucideIcon({
  name,
  size = 24,
  color = '#000',
  strokeWidth = 2,
  ...props
}: LucideIconProps) {
  const pathString = ICON_PATHS[name];

  if (!pathString) {
    console.warn(`LucideIcon: Icon "${name}" not found`);
    return null;
  }

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...props}
    >
      {parseSvgPath(pathString, color, strokeWidth)}
    </Svg>
  );
}
