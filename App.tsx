import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "react-native";
import { RootNavigator } from "./src/navigation/RootNavigator";

import { COLORS } from "./src/theme/design";

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar backgroundColor={COLORS.background} barStyle="dark-content" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
