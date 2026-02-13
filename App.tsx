import React, { useCallback, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

const REELS = [
  {
    id: '1',
    title: "Joe's Coffee",
    subtitle: '30% OFF',
    handle: '@foodie_adventures',
    caption: 'Amazing latte art and cozy vibes! ☕',
    emoji: '🍔',
  },
  {
    id: '2',
    title: 'Sunset Bistro',
    subtitle: 'Free dessert',
    handle: '@taste_explorer',
    caption: 'Best view in town at golden hour 🌅',
    emoji: '☕',
  },
  {
    id: '3',
    title: 'Green Garden',
    subtitle: '15% OFF',
    handle: '@healthy_bites',
    caption: 'Fresh salads and smoothie bowls 🥗',
    emoji: '🥐',
  },
];

function ReelItem({
  item,
  index,
  total,
  height,
}: {
  item: (typeof REELS)[0];
  index: number;
  total: number;
  height: number;
}) {
  return (
    <View style={[styles.reelContainer, { height }]}>
      <LinearGradient
        colors={['#f97316', '#ec4899', '#a855f7']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.reelContent}>
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>{`${index + 1}/${total}`}</Text>
        </View>
        <View style={styles.centerBlock}>
          <View style={styles.emojiCard}>
            <Text style={styles.emoji}>{item.emoji}</Text>
          </View>
          <Text style={styles.reelTitle}>{item.title}</Text>
          <Text style={styles.reelSubtitle}>{item.subtitle}</Text>
        </View>
        <View style={styles.bottomSection}>
          <View style={styles.captionBlock}>
            <Text style={styles.captionHandle}>{item.handle}</Text>
            <Text style={styles.captionText}>{item.caption}</Text>
          </View>
          <TouchableOpacity style={styles.weGoButton} activeOpacity={0.8}>
            <Text style={styles.weGoButtonText}>We Go</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const SNAP_THRESHOLD = 0.3; // scroll past 30% → switch to next reel (never skip reels)

function ReelsScreen() {
  const { height } = useWindowDimensions();
  const listRef = useRef<FlatList>(null);
  const isProgrammaticScroll = useRef(false);
  const currentReelIndex = useRef(0);

  const renderItem = useCallback(
    ({ item, index }: { item: (typeof REELS)[0]; index: number }) => (
      <ReelItem item={item} index={index} total={REELS.length} height={height} />
    ),
    [height]
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: height,
      offset: height * index,
      index,
    }),
    [height]
  );

  const keyExtractor = useCallback((item: (typeof REELS)[0]) => item.id, []);

  const snapToReel = useCallback(
    (contentOffsetY: number) => {
      const index = Math.floor(contentOffsetY / height);
      const fraction = (contentOffsetY % height) / height;
      const naturalTarget = fraction > SNAP_THRESHOLD ? index + 1 : index;
      const current = currentReelIndex.current;
      const oneStep = Math.max(current - 1, Math.min(current + 1, naturalTarget));
      const clamped = Math.min(
        Math.max(0, oneStep),
        REELS.length - 1
      );
      currentReelIndex.current = clamped;
      const offset = clamped * height;
      isProgrammaticScroll.current = true;
      listRef.current?.scrollToOffset({ offset, animated: true });
    },
    [height]
  );

  const onScrollEndDrag = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      if (isProgrammaticScroll.current) return;
      snapToReel(e.nativeEvent.contentOffset.y);
    },
    [snapToReel]
  );

  const onMomentumScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      if (isProgrammaticScroll.current) {
        isProgrammaticScroll.current = false;
        return;
      }
      snapToReel(e.nativeEvent.contentOffset.y);
    },
    [snapToReel]
  );

  return (
    <View style={styles.reelsWrapper}>
      <FlatList
        ref={listRef}
        data={REELS}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}
      />
    </View>
  );
}

function MapPlaceholderScreen() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderTitle}>Active Raids</Text>
      <Text style={styles.placeholderSubtext}>Map placeholder</Text>
    </View>
  );
}

function LeaderboardPlaceholderScreen() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderSubtext}>Leaderboard (placeholder)</Text>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#22c55e',
            tabBarInactiveTintColor: '#374151',
            tabBarStyle: { backgroundColor: '#fff' },
          }}
        >
          <Tab.Screen
            name="Map"
            component={MapPlaceholderScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="map" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Reels"
            component={ReelsScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="videocam" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Leaderboard"
            component={LeaderboardPlaceholderScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="trophy" size={size} color={color} />
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  reelsWrapper: {
    flex: 1,
  },
  reelContainer: {
    width: '100%',
  },
  reelContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 100,
    justifyContent: 'space-between',
  },
  counterBadge: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  counterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  centerBlock: {
    alignItems: 'center',
  },
  emojiCard: {
    width: 120,
    height: 120,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emoji: {
    fontSize: 56,
  },
  reelTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  reelSubtitle: {
    fontSize: 18,
    color: '#86efac',
    fontWeight: '600',
  },
  bottomSection: {
    gap: 16,
  },
  captionBlock: {
    marginBottom: 8,
  },
  captionHandle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  captionText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
  },
  weGoButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weGoButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: '#6b7280',
  },
});
