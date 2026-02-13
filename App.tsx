import React, { useCallback, useRef, useState, memo, useEffect, createContext, useContext } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TouchableOpacity, GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  ViewToken,
  Alert,
  Platform,
  Animated,
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
    remainingCodes: 3,
  },
  {
    id: '2',
    title: 'Sunset Bistro',
    subtitle: 'Free dessert',
    handle: '@taste_explorer',
    caption: 'Best view in town at golden hour 🌅',
    emoji: '☕',
    remainingCodes: 5,
  },
  {
    id: '3',
    title: 'Green Garden',
    subtitle: '15% OFF',
    handle: '@healthy_bites',
    caption: 'Fresh salads and smoothie bowls 🥗',
    emoji: '🥐',
    remainingCodes: 4,
  },
];

const ReelItem = memo(function ReelItem({
  item,
  index,
  total,
  height,
  isActive,
  remainingCount,
  onWeGoPress,
}: {
  item: (typeof REELS)[0];
  index: number;
  total: number;
  height: number;
  isActive: boolean;
  remainingCount: number;
  onWeGoPress?: (reelIndex: number) => void;
}) {
  return (
    <View style={[styles.reelContainer, { height }]}>
      <LinearGradient
        colors={['#f97316', '#ec4899', '#a855f7']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.reelContent}>
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>
            Remaining codes: {remainingCount}
          </Text>
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
          <TouchableOpacity
            style={styles.weGoButton}
            activeOpacity={0.8}
            onPress={() => onWeGoPress?.(index)}
          >
            <Text style={styles.weGoButtonText}>We Go</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

// When a reel hits this visibility, it becomes the "active" screen (for playback, etc.)
const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 70,
};

type TimerContextValue = {
  remainingCodesByIndex: number[];
  onWeGoPress: (reelIndex: number) => void;
  showTimerOverlay: boolean;
  code: string;
  secondsLeft: number;
  currentRouteName: string;
};

const TimerContext = createContext<TimerContextValue | null>(null);

function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
}

function generateSixDigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function LostFeedbackOverlay({ onDismiss }: { onDismiss: () => void }) {
  const redHeartOpacity = useRef(new Animated.Value(1)).current;
  const blackHeartOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const duration = 600;
    Animated.parallel([
      Animated.timing(redHeartOpacity, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(blackHeartOpacity, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
    ]).start();
  }, [redHeartOpacity, blackHeartOpacity]);

  return (
    <View style={styles.lostFeedbackOverlay} pointerEvents="box-none">
      <View style={styles.lostFeedbackCard}>
        <Text style={styles.lostFeedbackPoints}>You lost 5 points (-5)</Text>
        <Text style={styles.lostFeedbackHeartLabel}>Lost one heart</Text>
        <View style={styles.lostFeedbackHeartsRow}>
          <View style={styles.lostFeedbackHeartSlot}>
            <Animated.View
              style={[styles.lostFeedbackHeartPixel, { opacity: redHeartOpacity }]}
              pointerEvents="none"
            >
              <Ionicons name="heart" size={32} color="#ef4444" />
            </Animated.View>
            <Animated.View
              style={[
                styles.lostFeedbackHeartPixel,
                styles.lostFeedbackHeartBlack,
                { opacity: blackHeartOpacity },
              ]}
              pointerEvents="none"
            >
              <Ionicons name="heart" size={32} color="#1a1a1a" />
            </Animated.View>
          </View>
          <View style={styles.lostFeedbackHeartPixelStatic}>
            <Ionicons name="heart" size={32} color="#ef4444" />
          </View>
          <View style={styles.lostFeedbackHeartPixelStatic}>
            <Ionicons name="heart" size={32} color="#ef4444" />
          </View>
        </View>
        <TouchableOpacity
          style={styles.lostFeedbackDismiss}
          onPress={onDismiss}
          activeOpacity={0.8}
        >
          <Text style={styles.lostFeedbackDismissText}>OK</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ReelsScreen() {
  const { remainingCodesByIndex, onWeGoPress: handleWeGoPress } = useTimer();
  const { height } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const setActiveIndexRef = useRef(setActiveIndex);
  setActiveIndexRef.current = setActiveIndex;

  const onViewableItemsChanged = useCallback(
    (info: { viewableItems: ViewToken[] }) => {
      const first = info.viewableItems[0];
      if (first?.index != null) setActiveIndexRef.current(first.index);
    },
    []
  );
  const viewabilityConfigRef = useRef(VIEWABILITY_CONFIG);

  const renderItem = useCallback(
    ({ item, index }: { item: (typeof REELS)[0]; index: number }) => (
      <ReelItem
        item={item}
        index={index}
        total={REELS.length}
        height={height}
        isActive={activeIndex === index}
        remainingCount={remainingCodesByIndex[index]}
        onWeGoPress={handleWeGoPress}
      />
    ),
    [height, activeIndex, remainingCodesByIndex, handleWeGoPress]
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

  const { showTimerOverlay, code, secondsLeft, currentRouteName } = useTimer();
  const showReelsFullOverlay = showTimerOverlay && currentRouteName === 'Reels';

  return (
    <View style={styles.reelsWrapper}>
      <FlatList
        data={REELS}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfigRef.current}
        pagingEnabled
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        bounces={true}
      />
      {showReelsFullOverlay && (
        <View
          style={[styles.timerOverlay, { height }]}
          pointerEvents="auto"
        >
          <View style={styles.timerTint} />
          <View style={styles.timerContent}>
            <Text style={styles.timerCode}>{code}</Text>
            <Text style={styles.timerCountdown}>{formatTimer(secondsLeft)}</Text>
          </View>
        </View>
      )}
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
  const [remainingCodesByIndex, setRemainingCodesByIndex] = useState(() =>
    REELS.map((r) => r.remainingCodes)
  );
  const [showTimerOverlay, setShowTimerOverlay] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [code, setCode] = useState('');
  const [showLostFeedback, setShowLostFeedback] = useState(false);
  const [currentRouteName, setCurrentRouteName] = useState('Map');
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reelIndexWhenTimerStartedRef = useRef<number>(0);

  useEffect(() => {
    if (!showTimerOverlay) return;
    timerIntervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          setShowTimerOverlay(false);
          setCode('');
          setRemainingCodesByIndex((prevCodes) => {
            const next = [...prevCodes];
            const idx = reelIndexWhenTimerStartedRef.current;
            next[idx] = next[idx] + 1;
            return next;
          });
          setShowLostFeedback(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [showTimerOverlay]);

  const handleWeGoPress = useCallback((reelIndex: number) => {
    const message =
      'This action cannot be undone. Are you sure you want to continue?';
    const onConfirm = () => {
      reelIndexWhenTimerStartedRef.current = reelIndex;
      setRemainingCodesByIndex((prev) => {
        const next = [...prev];
        next[reelIndex] = Math.max(0, next[reelIndex] - 1);
        return next;
      });
      setCode(generateSixDigitCode());
      setSecondsLeft(10);
      setShowTimerOverlay(true);
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(message)) {
        onConfirm();
      }
    } else {
      Alert.alert('Confirm', message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: onConfirm },
      ]);
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <TimerContext.Provider
          value={{
            remainingCodesByIndex,
            onWeGoPress: handleWeGoPress,
            showTimerOverlay,
            code,
            secondsLeft,
            currentRouteName,
          }}
        >
          <View style={styles.appRoot}>
            <NavigationContainer
              onStateChange={(state) => {
                if (state?.routes?.[state.index]?.name) {
                  setCurrentRouteName(state.routes[state.index].name);
                }
              }}
            >
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
          {showTimerOverlay && currentRouteName !== 'Reels' && (
            <View style={styles.timerBar} pointerEvents="box-none">
              <Text style={styles.timerBarCode}>{code}</Text>
              <Text style={styles.timerBarCountdown}>{formatTimer(secondsLeft)}</Text>
            </View>
          )}
          {showLostFeedback && (
            <LostFeedbackOverlay onDismiss={() => setShowLostFeedback(false)} />
          )}
          </View>
        </TimerContext.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
  },
  reelsWrapper: {
    flex: 1,
  },
  timerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerOverlayGlobal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingTop: 48,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  timerBarCode: {
    fontSize: 22,
    fontWeight: '700',
    color: '#22c55e',
    letterSpacing: 4,
  },
  timerBarCountdown: {
    fontSize: 24,
    fontWeight: '600',
    color: '#22c55e',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 2,
  },
  timerTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  timerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerCode: {
    fontSize: 42,
    fontWeight: '700',
    color: '#22c55e',
    letterSpacing: 8,
  },
  timerCountdown: {
    fontSize: 28,
    fontWeight: '600',
    color: '#22c55e',
    marginTop: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 4,
  },
  lostFeedbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lostFeedbackCard: {
    backgroundColor: '#2d3748',
    borderRadius: 4,
    padding: 24,
    alignItems: 'center',
    minWidth: 260,
    borderWidth: 4,
    borderColor: '#1a202c',
  },
  lostFeedbackPoints: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  lostFeedbackHeartLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  lostFeedbackHeartsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  lostFeedbackHeartSlot: {
    width: 36,
    height: 36,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lostFeedbackHeartPixel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
  },
  lostFeedbackHeartPixelStatic: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lostFeedbackHeartBlack: {
    position: 'absolute',
  },
  lostFeedbackDismiss: {
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 4,
    borderWidth: 3,
    borderColor: '#166534',
  },
  lostFeedbackDismissText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
