import { NavigatorScreenParams } from "@react-navigation/native";
import { Product } from "../types/api";

export type MainTabParamList = {
  ShopTab: undefined;
  CartTab: undefined;
  OrdersTab: undefined;
  AccountTab: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  ProductDetail: { product: Product };
  Addresses: undefined;
  AddAddress: undefined;
  OrderDetail: { orderId: string };
  HelpSupport: undefined;
  PrivacyPolicy: undefined;
  EditProfile: undefined;
};
