/**
 * A collapsible file tree that mirrors a File City map. Each file row carries
 * the same color its building has on the canvas, so the tree reads as a flat,
 * scannable index of the city.
 *
 * Renders as plain rows (no internal scroll view) so it composes inside an
 * existing ScrollView without nesting two virtualized lists. That's fine for
 * the onboarding fixture (~40 files); for a real repo's thousands of files,
 * render this through a FlashList/FlatList at the top level instead.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';
import type { Theme } from '@principal-ade/industry-theme';

import type { CityBuilding, CityData } from '../FileCity';
import {
  allDirectoryPaths,
  buildFileTree,
  flattenTree,
  type FlatRow,
} from './buildFileTree';

export interface FileTreeProps {
  /** The city whose buildings become the tree. */
  city: CityData;
  /** Called when a file row is tapped (directories toggle instead). */
  onFilePress?: (building: CityBuilding) => void;
  /** Path of the currently selected file, highlighted in the tree. */
  selectedPath?: string | null;
  /** Initial expand state. Defaults to fully expanded. */
  collapsedByDefault?: boolean;
  /**
   * Called with the set of file paths currently visible in the tree (i.e. not
   * hidden under a collapsed folder) whenever the expand state changes. Lets a
   * parent reflect tree visibility elsewhere, e.g. greying hidden files on a map.
   */
  onVisibleFilesChange?: (visibleFilePaths: Set<string>) => void;
  /**
   * Called with the set of folder paths that are currently open — i.e. expanded
   * and themselves visible (no collapsed ancestor) — whenever expansion changes.
   */
  onOpenFoldersChange?: (openFolderPaths: Set<string>) => void;
  style?: StyleProp<ViewStyle>;
}

export function FileTree({
  city,
  onFilePress,
  selectedPath,
  collapsedByDefault = false,
  onVisibleFilesChange,
  onOpenFoldersChange,
  style,
}: FileTreeProps) {
  const { theme } = useTheme();
  const tree = useMemo(() => buildFileTree(city), [city]);
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    collapsedByDefault ? new Set<string>() : allDirectoryPaths(tree),
  );

  const rows = useMemo(() => flattenTree(tree, expanded), [tree, expanded]);

  // Report tree visibility so a parent can mirror it on the map: which files
  // are showing (grey out the rest) and which folders are open (highlight them).
  useEffect(() => {
    if (onVisibleFilesChange) {
      const visible = new Set<string>();
      for (const row of rows) {
        if (row.node.type === 'file') visible.add(row.node.path);
      }
      onVisibleFilesChange(visible);
    }
    if (onOpenFoldersChange) {
      const open = new Set<string>();
      for (const row of rows) {
        if (row.node.type === 'directory' && row.isExpanded) open.add(row.node.path);
      }
      onOpenFoldersChange(open);
    }
  }, [rows, onVisibleFilesChange, onOpenFoldersChange]);

  const toggle = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  return (
    <View style={style}>
      {rows.map((row) => (
        <FileTreeRow
          key={row.node.path}
          row={row}
          theme={theme}
          selected={row.node.path === selectedPath}
          onPress={() =>
            row.node.type === 'directory'
              ? toggle(row.node.path)
              : row.node.building && onFilePress?.(row.node.building)
          }
        />
      ))}
    </View>
  );
}

const INDENT = 16;

function FileTreeRow({
  row,
  theme,
  selected,
  onPress,
}: {
  row: FlatRow;
  theme: Theme;
  selected: boolean;
  onPress: () => void;
}) {
  const { node, depth, isExpanded } = row;
  const isDir = node.type === 'directory';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.row,
        {
          paddingLeft: 8 + depth * INDENT,
          backgroundColor: selected ? theme.colors.background : 'transparent',
        },
      ]}
    >
      <Text style={[styles.chevron, { color: theme.colors.textSecondary }]}>
        {isDir ? (isExpanded ? '▾' : '▸') : ''}
      </Text>

      {isDir ? (
        <View style={[styles.folderTab, { borderColor: theme.colors.textSecondary }]} />
      ) : (
        <View style={[styles.swatch, { backgroundColor: node.color ?? theme.colors.textSecondary }]} />
      )}

      <Text
        numberOfLines={1}
        style={[
          styles.name,
          {
            color: theme.colors.text,
            fontWeight: isDir ? '600' : '400',
          },
        ]}
      >
        {node.name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingRight: 8,
    borderRadius: 8,
    gap: 8,
  },
  chevron: {
    width: 12,
    fontSize: 11,
    textAlign: 'center',
  },
  // Files: a color chip matching the building on the map.
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  // Directories: a small folder-ish outline tab (no icon dependency).
  folderTab: {
    width: 13,
    height: 11,
    borderRadius: 2,
    borderWidth: 1.5,
  },
  name: {
    flex: 1,
    fontSize: 14,
  },
});
