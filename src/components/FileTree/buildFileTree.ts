/**
 * Reshapes a File City `CityData` into a nested directory tree.
 *
 * The city stores files as a flat `buildings[]` (each a `CityBuilding` with a
 * full `path`); this rebuilds the folder hierarchy from those paths so a tree
 * view can mirror exactly what the canvas renders. File colors use the same
 * lookup the canvas does — `building.color || getFileColor(path)` — so a row
 * and its building share one identity.
 */

import { getFileColor } from '@principal-ai/file-city-builder';
import type { CityBuilding, CityData } from '../FileCity';

export interface FileTreeNode {
  /** Last path segment, e.g. `auth.ts` or `services`. */
  name: string;
  /** Full path, unique within the tree — used as a stable key. */
  path: string;
  type: 'file' | 'directory';
  /** Files only: the source building, for map reflection on press. */
  building?: CityBuilding;
  /** Files only: file-type color, identical to the canvas building. */
  color?: string;
  children: FileTreeNode[];
}

/**
 * Build the nested tree from a city's buildings. Directories are inferred from
 * path segments (only folders that actually contain files appear). The result
 * is sorted directories-first, then alphabetically.
 */
export function buildFileTree(city: CityData): FileTreeNode[] {
  const rootChildren: FileTreeNode[] = [];
  const dirs = new Map<string, FileTreeNode>();

  // Return the children array of a directory, creating it (and any missing
  // ancestors) on first use.
  const containerFor = (dirPath: string): FileTreeNode[] => {
    if (dirPath === '') return rootChildren;
    const existing = dirs.get(dirPath);
    if (existing) return existing.children;

    const slash = dirPath.lastIndexOf('/');
    const parentPath = slash === -1 ? '' : dirPath.slice(0, slash);
    const name = slash === -1 ? dirPath : dirPath.slice(slash + 1);
    const node: FileTreeNode = { name, path: dirPath, type: 'directory', children: [] };
    dirs.set(dirPath, node);
    containerFor(parentPath).push(node);
    return node.children;
  };

  for (const building of city.buildings) {
    const { path } = building;
    const slash = path.lastIndexOf('/');
    const dirPath = slash === -1 ? '' : path.slice(0, slash);
    const name = slash === -1 ? path : path.slice(slash + 1);
    containerFor(dirPath).push({
      name,
      path,
      type: 'file',
      building,
      color: building.color || getFileColor(path),
      children: [],
    });
  }

  sortNodes(rootChildren);
  return rootChildren;
}

function sortNodes(nodes: FileTreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const node of nodes) {
    if (node.children.length) sortNodes(node.children);
  }
}

export interface FlatRow {
  node: FileTreeNode;
  depth: number;
  /** Directories only: whether this row is currently expanded. */
  isExpanded: boolean;
}

/**
 * Flatten the tree to the rows currently visible given `expanded` (a set of
 * expanded directory paths). Recomputed whenever the expand state changes.
 */
export function flattenTree(
  nodes: FileTreeNode[],
  expanded: Set<string>,
  depth = 0,
  out: FlatRow[] = [],
): FlatRow[] {
  for (const node of nodes) {
    const isExpanded = node.type === 'directory' && expanded.has(node.path);
    out.push({ node, depth, isExpanded });
    if (isExpanded) flattenTree(node.children, expanded, depth + 1, out);
  }
  return out;
}

/** Every directory path in the tree — handy for an expand-all initial state. */
export function allDirectoryPaths(nodes: FileTreeNode[], out: Set<string> = new Set()): Set<string> {
  for (const node of nodes) {
    if (node.type === 'directory') {
      out.add(node.path);
      allDirectoryPaths(node.children, out);
    }
  }
  return out;
}
