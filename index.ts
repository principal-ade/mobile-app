import 'react-native-reanimated';
import { registerRootComponent } from 'expo';

import App from './App';

// Toggle between Storybook and normal app
const enableStorybook = process.env.EXPO_PUBLIC_STORYBOOK === 'true';

if (enableStorybook) {
  const StorybookUI = require('./.rnstorybook').default;
  registerRootComponent(StorybookUI);
} else {
  // registerRootComponent calls AppRegistry.registerComponent('main', () => App);
  // It also ensures that whether you load the app in Expo Go or in a native build,
  // the environment is set up appropriately
  registerRootComponent(App);
}
