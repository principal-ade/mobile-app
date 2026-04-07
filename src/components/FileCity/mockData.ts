/**
 * Mock Data Generator for FileCity
 * Uses the official @principal-ai/file-city-builder package
 */

import {
  CodeCityBuilderWithGrid,
  buildFileSystemTreeFromFileInfoList,
} from '@principal-ai/file-city-builder';
import type { CityData, HighlightLayer } from '@principal-ai/file-city-builder';
import type { FileInfo } from '@principal-ai/repository-abstraction';

// Re-export types from the builder
export type { CityData, HighlightLayer };

interface SimpleFileInfo {
  path: string;
  size: number;
}

/**
 * Convert simple file info to full FileInfo format
 */
function toFileInfo(file: SimpleFileInfo): FileInfo {
  const parts = file.path.split('/');
  const name = parts[parts.length - 1];
  const extension = name.includes('.') ? '.' + name.split('.').pop() : '';

  return {
    path: file.path,
    name,
    extension,
    size: file.size,
    lastModified: new Date(),
    isDirectory: false,
    relativePath: file.path,
  };
}

// Sample file structures for different complexity levels
const FILE_STRUCTURES: Record<string, SimpleFileInfo[]> = {
  simple: [
    { path: 'README.md', size: 1500 },
    { path: 'package.json', size: 800 },
    { path: 'tsconfig.json', size: 400 },
    { path: 'src/index.ts', size: 500 },
    { path: 'src/App.tsx', size: 2000 },
    { path: 'src/types.ts', size: 800 },
    { path: 'src/components/Button.tsx', size: 1200 },
    { path: 'src/components/Header.tsx', size: 1500 },
    { path: 'src/components/Footer.tsx', size: 900 },
    { path: 'src/utils/helpers.ts', size: 600 },
    { path: 'src/utils/constants.ts', size: 300 },
  ],
  medium: [
    { path: 'README.md', size: 2500 },
    { path: 'package.json', size: 1200 },
    { path: 'tsconfig.json', size: 600 },
    { path: '.gitignore', size: 200 },
    { path: 'jest.config.js', size: 400 },
    { path: 'src/index.ts', size: 500 },
    { path: 'src/App.tsx', size: 3000 },
    { path: 'src/components/Button.tsx', size: 1500 },
    { path: 'src/components/Button.test.tsx', size: 800 },
    { path: 'src/components/Header.tsx', size: 2000 },
    { path: 'src/components/Footer.tsx', size: 1200 },
    { path: 'src/components/Modal.tsx', size: 1800 },
    { path: 'src/components/Card.tsx', size: 1400 },
    { path: 'src/components/forms/Input.tsx', size: 1100 },
    { path: 'src/components/forms/Select.tsx', size: 1300 },
    { path: 'src/components/forms/Checkbox.tsx', size: 800 },
    { path: 'src/components/forms/Form.tsx', size: 2200 },
    { path: 'src/hooks/useAuth.ts', size: 900 },
    { path: 'src/hooks/useApi.ts', size: 1100 },
    { path: 'src/hooks/useLocalStorage.ts', size: 600 },
    { path: 'src/hooks/useDebounce.ts', size: 400 },
    { path: 'src/services/api.ts', size: 2500 },
    { path: 'src/services/auth.ts', size: 1800 },
    { path: 'src/services/storage.ts', size: 700 },
    { path: 'src/services/analytics.ts', size: 1200 },
    { path: 'src/utils/helpers.ts', size: 1500 },
    { path: 'src/utils/constants.ts', size: 400 },
    { path: 'src/utils/validators.ts', size: 900 },
    { path: 'src/utils/formatters.ts', size: 800 },
    { path: 'src/types/index.ts', size: 300 },
    { path: 'src/types/api.ts', size: 1200 },
    { path: 'src/types/user.ts', size: 600 },
    { path: 'src/types/common.ts', size: 500 },
    { path: 'tests/setup.ts', size: 400 },
    { path: 'tests/utils.ts', size: 600 },
    { path: 'tests/unit/helpers.test.ts', size: 1500 },
    { path: 'tests/unit/validators.test.ts', size: 1200 },
    { path: 'tests/integration/api.test.ts', size: 2500 },
    { path: 'tests/integration/auth.test.ts', size: 1800 },
  ],
  complex: [
    { path: 'README.md', size: 4000 },
    { path: 'package.json', size: 2000 },
    { path: 'tsconfig.json', size: 800 },
    { path: '.gitignore', size: 300 },
    { path: 'jest.config.js', size: 600 },
    { path: 'babel.config.js', size: 400 },
    { path: '.prettierrc', size: 200 },
    { path: '.eslintrc.js', size: 1200 },
    { path: 'src/index.ts', size: 600 },
    { path: 'src/App.tsx', size: 4000 },
    { path: 'src/setupTests.ts', size: 500 },
    // Common components
    { path: 'src/components/common/Button.tsx', size: 1800 },
    { path: 'src/components/common/Input.tsx', size: 1500 },
    { path: 'src/components/common/Modal.tsx', size: 2200 },
    { path: 'src/components/common/Card.tsx', size: 1400 },
    { path: 'src/components/common/Badge.tsx', size: 800 },
    { path: 'src/components/common/Avatar.tsx', size: 1000 },
    { path: 'src/components/common/Spinner.tsx', size: 600 },
    // Layout components
    { path: 'src/components/layout/Header.tsx', size: 2500 },
    { path: 'src/components/layout/Footer.tsx', size: 1500 },
    { path: 'src/components/layout/Sidebar.tsx', size: 2800 },
    { path: 'src/components/layout/Navigation.tsx', size: 2200 },
    { path: 'src/components/layout/Container.tsx', size: 800 },
    // Form components
    { path: 'src/components/forms/Form.tsx', size: 3000 },
    { path: 'src/components/forms/FormField.tsx', size: 1500 },
    { path: 'src/components/forms/Select.tsx', size: 1800 },
    { path: 'src/components/forms/Checkbox.tsx', size: 900 },
    { path: 'src/components/forms/Radio.tsx', size: 850 },
    { path: 'src/components/forms/TextArea.tsx', size: 1100 },
    // Data components
    { path: 'src/components/data/Table.tsx', size: 3500 },
    { path: 'src/components/data/List.tsx', size: 1800 },
    { path: 'src/components/data/Grid.tsx', size: 2000 },
    { path: 'src/components/data/Chart.tsx', size: 2800 },
    { path: 'src/components/data/Pagination.tsx', size: 1200 },
    // Auth feature
    { path: 'src/features/auth/Login.tsx', size: 2500 },
    { path: 'src/features/auth/Register.tsx', size: 3000 },
    { path: 'src/features/auth/ForgotPassword.tsx', size: 1800 },
    { path: 'src/features/auth/authSlice.ts', size: 1500 },
    { path: 'src/features/auth/authApi.ts', size: 2000 },
    // Dashboard feature
    { path: 'src/features/dashboard/Dashboard.tsx', size: 3500 },
    { path: 'src/features/dashboard/DashboardCard.tsx', size: 1200 },
    { path: 'src/features/dashboard/DashboardChart.tsx', size: 2200 },
    { path: 'src/features/dashboard/dashboardSlice.ts', size: 1100 },
    // Settings feature
    { path: 'src/features/settings/Settings.tsx', size: 2800 },
    { path: 'src/features/settings/Profile.tsx', size: 2200 },
    { path: 'src/features/settings/Preferences.tsx', size: 1800 },
    { path: 'src/features/settings/settingsSlice.ts', size: 900 },
    // Hooks
    { path: 'src/hooks/useAuth.ts', size: 1200 },
    { path: 'src/hooks/useApi.ts', size: 1500 },
    { path: 'src/hooks/useLocalStorage.ts', size: 700 },
    { path: 'src/hooks/useDebounce.ts', size: 450 },
    { path: 'src/hooks/useMediaQuery.ts', size: 600 },
    { path: 'src/hooks/useTheme.ts', size: 800 },
    // Services
    { path: 'src/services/api.ts', size: 3500 },
    { path: 'src/services/auth.ts', size: 2200 },
    { path: 'src/services/storage.ts', size: 900 },
    { path: 'src/services/analytics.ts', size: 1500 },
    { path: 'src/services/notifications.ts', size: 1800 },
    // Store
    { path: 'src/store/index.ts', size: 600 },
    { path: 'src/store/rootReducer.ts', size: 800 },
    { path: 'src/store/middleware.ts', size: 1200 },
    // Utils
    { path: 'src/utils/helpers.ts', size: 2000 },
    { path: 'src/utils/constants.ts', size: 600 },
    { path: 'src/utils/validators.ts', size: 1200 },
    { path: 'src/utils/formatters.ts', size: 1000 },
    { path: 'src/utils/date.ts', size: 1500 },
    { path: 'src/utils/string.ts', size: 800 },
    // Types
    { path: 'src/types/index.ts', size: 400 },
    { path: 'src/types/api.ts', size: 1800 },
    { path: 'src/types/user.ts', size: 900 },
    { path: 'src/types/common.ts', size: 700 },
    { path: 'src/types/store.ts', size: 600 },
    // Styles
    { path: 'src/styles/global.css', size: 2000 },
    { path: 'src/styles/variables.css', size: 800 },
    { path: 'src/styles/theme.ts', size: 1500 },
    { path: 'src/styles/breakpoints.ts', size: 400 },
    // Tests
    { path: 'tests/setup.ts', size: 600 },
    { path: 'tests/utils.ts', size: 800 },
    { path: 'tests/mocks.ts', size: 1200 },
    { path: 'tests/unit/helpers.test.ts', size: 2000 },
    { path: 'tests/unit/validators.test.ts', size: 1500 },
    { path: 'tests/unit/formatters.test.ts', size: 1200 },
    { path: 'tests/integration/api.test.ts', size: 3000 },
    { path: 'tests/integration/auth.test.ts', size: 2200 },
    { path: 'tests/integration/store.test.ts', size: 1800 },
    { path: 'tests/e2e/login.spec.ts', size: 2500 },
    { path: 'tests/e2e/dashboard.spec.ts', size: 3000 },
    { path: 'tests/e2e/settings.spec.ts', size: 2200 },
    // Docs
    { path: 'docs/architecture.md', size: 5000 },
    { path: 'docs/api.md', size: 8000 },
    { path: 'docs/contributing.md', size: 3000 },
    { path: 'docs/changelog.md', size: 4000 },
    // Scripts
    { path: 'scripts/build.sh', size: 500 },
    { path: 'scripts/deploy.sh', size: 800 },
    { path: 'scripts/test.sh', size: 400 },
    { path: 'scripts/lint.sh', size: 300 },
  ],
};

/**
 * Generate mock city data using the official builder
 */
export function generateMockCityData(options?: {
  complexity?: 'simple' | 'medium' | 'complex';
}): CityData {
  const complexity = options?.complexity || 'medium';
  const simpleFiles = FILE_STRUCTURES[complexity];

  // Convert to full FileInfo format
  const files = simpleFiles.map(toFileInfo);

  // Build file tree from the file info list
  const fileTree = buildFileSystemTreeFromFileInfoList(files, 'mock-sha');

  // Build the city using the official builder
  const builder = new CodeCityBuilderWithGrid();
  const cityData = builder.buildCityFromFileSystem(fileTree, '');

  return cityData;
}

/**
 * Generate example highlight layers
 */
export function generateMockHighlightLayers(cityData: CityData): HighlightLayer[] {
  // Find TypeScript files for highlighting
  const tsFiles = cityData.buildings
    .filter((b) => b.path.endsWith('.ts') || b.path.endsWith('.tsx'))
    .slice(0, 5);

  // Find test files
  const testFiles = cityData.buildings
    .filter((b) => b.path.includes('.test.') || b.path.includes('.spec.'))
    .slice(0, 3);

  return [
    {
      id: 'typescript',
      name: 'TypeScript Files',
      enabled: true,
      color: '#3178c6',
      opacity: 1,
      borderWidth: 2,
      priority: 10,
      items: tsFiles.map((b) => ({
        path: b.path,
        type: 'file' as const,
        renderStrategy: 'border' as const,
      })),
    },
    {
      id: 'tests',
      name: 'Test Files',
      enabled: true,
      color: '#22c55e',
      opacity: 1,
      borderWidth: 2,
      priority: 20,
      items: testFiles.map((b) => ({
        path: b.path,
        type: 'file' as const,
        renderStrategy: 'border' as const,
      })),
    },
  ];
}
