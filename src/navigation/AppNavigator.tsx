import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import DiscoverScreen from "../screens/citizen/DiscoverScreen";
import MyEventsScreen from "../screens/citizen/MyEventsScreen";
import EventDetailScreen from "../screens/citizen/EventDetailScreen";
import ProfileScreen from "../screens/citizen/ProfileScreen";
import NotificationsScreen from "../screens/citizen/NotificationsScreen";

export type RootStackParamList = {
  Discover: undefined;
  MyEvents: undefined;
  EventDetail: { eventId: string };

  // Sprint 3
  Profile: undefined;
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Discover" component={DiscoverScreen} />
      <Stack.Screen name="MyEvents" component={MyEventsScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />

      {/* Sprint 3 */}
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}
