import { GestureResponderEvent } from "react-native";

export type CartDropSource = {
  imageUri?: string | null;
  x: number;
  y: number;
};

export const getCartDropSourceFromEvent = (
  event: GestureResponderEvent,
  imageUri?: string | null
): CartDropSource => ({
  imageUri,
  x: event.nativeEvent.pageX,
  y: event.nativeEvent.pageY
});
