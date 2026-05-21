import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  ProductDetail: { id: string };
  Search: undefined;
  Login: undefined;
  Register: undefined;
  Checkout: undefined;
  Orders: undefined;
};

export type TabParamList = {
  Home: undefined;
  Products: { cat?: string } | undefined;
  Drinks: undefined;
  Cart: undefined;
  Profile: undefined;
};
