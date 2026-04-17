import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather, Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import Colors from "@/constants/colors";
import { MiningProvider } from "@/context/MiningContext";

function NativeTabLayout() {
  return (
    <MiningProvider>
      <NativeTabs>
        <NativeTabs.Trigger name="mine">
          <Icon sf={{ default: "hammer", selected: "hammer.fill" }} />
          <Label>Mine</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="wallet">
          <Icon sf={{ default: "wallet.pass", selected: "wallet.pass.fill" }} />
          <Label>Wallet</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <Icon sf={{ default: "person", selected: "person.fill" }} />
          <Label>Profile</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </MiningProvider>
  );
}

function ClassicTabLayout() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <MiningProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.gold,
          tabBarInactiveTintColor: Colors.textMuted,
          headerShown: false,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: isIOS ? "transparent" : Colors.surface,
            borderTopWidth: 1,
            borderTopColor: Colors.surfaceBorder,
            elevation: 0,
            ...(isWeb ? { height: 84 } : {}),
          },
          tabBarBackground: () =>
            isIOS ? (
              <BlurView
                intensity={80}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
            ) : isWeb ? (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.surface }]} />
            ) : null,
        }}
      >
        <Tabs.Screen
          name="mine"
          options={{
            title: "Mine",
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="hammer.fill" tintColor={color} size={22} />
              ) : (
                <Ionicons name="hammer" size={22} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="wallet"
          options={{
            title: "Wallet",
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="creditcard.fill" tintColor={color} size={22} />
              ) : (
                <Feather name="credit-card" size={22} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="person.fill" tintColor={color} size={22} />
              ) : (
                <Feather name="user" size={22} color={color} />
              ),
          }}
        />
      </Tabs>
    </MiningProvider>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
