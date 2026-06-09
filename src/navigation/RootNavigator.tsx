import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MainTabs } from "./MainTabs";
import { ProductDetailScreen } from "../screens/product-detail-screen";
import { AddressesScreen } from "../screens/addresses-screen";
import { AddAddressScreen } from "../screens/add-address-screen";
import { OrderDetailScreen } from "../screens/order-detail-screen";
import { HelpSupportScreen } from "../screens/help-support-screen";
import { PrivacyPolicyScreen } from "../screens/privacy-policy-screen";
import { EditProfileScreen } from "../screens/edit-profile-screen";
import { AuthProvider } from "../providers/auth-provider";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, presentation: "modal" }}>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
          <Stack.Screen name="Addresses" component={AddressesScreen} />
          <Stack.Screen name="AddAddress" component={AddAddressScreen} />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ presentation: "card" }} />
          <Stack.Screen name="HelpSupport" component={HelpSupportScreen} options={{ presentation: "card" }} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ presentation: "card" }} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ presentation: "card" }} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}
