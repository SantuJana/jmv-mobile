import { useEffect, useRef } from "react";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../providers/auth-provider";
import type { RootStackParamList } from "../navigation/types";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true
  }),
});

export function usePushNotifications() {
  const { isAuthenticated, authorizedRequest } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;

    async function registerForPushNotificationsAsync() {
      let token;

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("order-status", {
          name: "Order Updates",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#004B2D",
        });
      }

      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted") {
          console.log("Failed to get push token for push notification!");
          return;
        }

        try {
          const projectId =
            Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
          const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId,
          });
          token = tokenData.data;
          
          // Send the token to the backend
          if (isMounted && token) {
            await authorizedRequest("/notifications/token", {
              method: "POST",
              body: JSON.stringify({ token }),
            });
            console.log("Push token registered successfully:", token);
          }
        } catch (error: any) {
          if (error.message && error.message.includes("removed from Expo Go")) {
            console.log("Push notifications are not supported in Expo Go on Android for SDK 53+. Please create a development build to test push notifications.");
          } else {
            console.log("Error getting or sending push token:", error);
          }
        }
      } else {
        console.log("Must use physical device for Push Notifications");
      }
    }

    void registerForPushNotificationsAsync();

    // Set up interactive actions category
    void Notifications.setNotificationCategoryAsync("ORDER_STATUS_ACTIONS", [
      {
        identifier: "VIEW_ORDER",
        buttonTitle: "View Order 📦",
        options: {
          opensAppToForeground: true,
        },
      },
    ]);

    // Listeners for foreground notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log("Notification received:", notification);
    });

    // Check if the app was opened from a cold start via a notification
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response && isMounted) {
        const data = response.notification.request.content.data;
        if (data?.orderId) {
          // Add a tiny delay to ensure navigator is mounted
          setTimeout(() => {
            navigation.navigate("OrderDetail", { orderId: data.orderId as string });
          }, 100);
        }
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log("Notification clicked:", response);
      const data = response.notification.request.content.data;
      if (data?.orderId) {
        navigation.navigate("OrderDetail", { orderId: data.orderId as string });
      }
    });

    return () => {
      isMounted = false;
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [isAuthenticated, authorizedRequest, navigation]);
}

export function PushNotificationManager() {
  usePushNotifications();
  return null;
}
