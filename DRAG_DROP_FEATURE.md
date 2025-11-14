# Drag & Drop Stop Reordering Feature - Complete Code Reference

## Overview
This feature allows users to reorder stops in a trip by dragging and dropping them. A blue indicator line shows where the stop will be placed.

---

## 1. TripDetailScreen.tsx - Main Implementation

### Import Addition (Line 32-36)
```typescript
// Memoized drop indicator for performance
const DropIndicator = React.memo(({ style }: { style: any }) => (
  <View style={style} />
));
DropIndicator.displayName = 'DropIndicator';
```

### State Variables (Lines 43-52)
```typescript
// Drag state
const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);
const stopCardHeights = useRef<{ [key: number]: { y: number, height: number } }>({}).current;
const stopAnimatedPositions = useRef<{ [key: number]: Animated.Value }>({}).current;

// Auto-scroll state
const scrollViewRef = useRef<ScrollView>(null);
const autoScrollInterval = useRef<NodeJS.Timeout | null>(null);
const currentScrollY = useRef(0);
```

### Initialize Animated Positions (Lines 133-140)
```typescript
// Initialize animated positions for each stop
useEffect(() => {
  sortedStops.forEach((_, index) => {
    if (!stopAnimatedPositions[index]) {
      stopAnimatedPositions[index] = new Animated.Value(0);
    }
  });
}, [sortedStops.length]);
```

### Keep Cards at Normal Position (Lines 142-148)
```typescript
// Keep all cards at their normal position (no slide-aside animation)
useEffect(() => {
  // Always keep all cards at position 0
  Object.keys(stopAnimatedPositions).forEach(key => {
    stopAnimatedPositions[parseInt(key)]?.setValue(0);
  });
}, [draggingIndex, dragTargetIndex, sortedStops.length]);
```

### Handle Card Layout (Lines 326-329)
```typescript
// Handle layout for tracking card positions
const handleCardLayout = (index: number, y: number, height: number) => {
  stopCardHeights[index] = { y, height };
};
```

### Handle Drag Start (Lines 332-339)
```typescript
// Drag and drop handlers
const handleDragStart = (index: number) => {
  setDraggingIndex(index);
  setDragTargetIndex(index);
  // Capture the current scroll position
  dragStartScrollY.current = currentScrollY.current;
  scrollCompensation.current = 0;
  lastGestureTranslation.current = 0;
};
```

### Handle Drag (Lines 306-329) - CRITICAL
```typescript
const handleDrag = (index: number, absoluteY: number, translationY: number) => {
  // Store the last gesture translation
  lastGestureTranslation.current = translationY;

  // Calculate target position based on how far we've dragged
  // We need to pass at least half a card height to move to the next position
  const avgCardHeight = showTransport ? 240 : 160; // Account for transport cards
  const threshold = avgCardHeight * 0.6; // 60% of card height to trigger swap

  // Calculate how many positions we've moved
  let newTargetIndex = index;

  if (Math.abs(translationY) > threshold) {
    const positionsMoved = Math.round(translationY / avgCardHeight);
    newTargetIndex = index + positionsMoved;

    // Clamp to valid range [0, sortedStops.length]
    newTargetIndex = Math.max(0, Math.min(sortedStops.length, newTargetIndex));
  }

  if (newTargetIndex !== dragTargetIndex) {
    console.log(`📍 Drag update: dragging index ${index}, target ${newTargetIndex}, translationY: ${translationY.toFixed(0)}`);
    setDragTargetIndex(newTargetIndex);
  }

  // Auto-scroll logic continues below...
};
```

### Handle Drag End (Lines 390-436) - CRITICAL
```typescript
const handleDragEnd = async (fromIndex: number, toIndex: number) => {
  if (draggingIndex === null) return;

  // Capture the drag state before resetting
  const finalIndex = dragTargetIndex !== null ? dragTargetIndex : toIndex;

  console.log(`🎯 Drop: moving stop from ${fromIndex} to ${finalIndex}`);

  // Reset drag state IMMEDIATELY so the card releases visually
  setDraggingIndex(null);
  setDragTargetIndex(null);

  // Clean up auto-scroll interval and reset speed
  if (autoScrollInterval.current) {
    clearInterval(autoScrollInterval.current);
    autoScrollInterval.current = null;
  }
  autoScrollSpeed.current = 0;
  scrollCompensation.current = 0;
  lastGestureTranslation.current = 0;

  // Don't reorder if dropping in the same position
  if (fromIndex === finalIndex) {
    console.log('⏸️  No reorder needed - same position');
    return;
  }

  const reorderedStops = [...sortedStops];
  const [movedStop] = reorderedStops.splice(fromIndex, 1);

  // Insert at new position
  reorderedStops.splice(finalIndex, 0, movedStop);

  console.log(`✅ Reordered: ${reorderedStops.map(s => s.name).join(' → ')}`);

  // Update order property for all stops
  const updatedStops = reorderedStops.map((stop, idx) => ({
    ...stop,
    order: idx,
  }));

  // Call the store function to persist changes
  await reorderStops(trip.id, updatedStops);

  // Regenerate transport segments instantly after reordering
  await regenerateAllTransportSegments(trip.id);
};
```

### Drop Indicator Style (Lines 864-871)
```typescript
dropIndicator: {
  height: 4,
  backgroundColor: theme.colors.primary,
  marginHorizontal: 32,
  marginVertical: 4,
  borderRadius: 2,
  opacity: 0.8,
},
```

### Render StopCards with Drop Indicator (Lines 1086-1137)
```typescript
{dayStops
  .sort((a, b) => a.order - b.order)
  .map((stop) => {
    const globalIndex = sortedStops.findIndex(s => s.id === stop.id);
    const transportToNext = showTransport ? getTransportToNext(stop, globalIndex) : null;
    const isFirstStop = globalIndex === 0;

    return (
      <React.Fragment key={stop.id}>
        {/* Drop indicator BEFORE first card if dropping at the very beginning */}
        {isFirstStop &&
         draggingIndex !== null &&
         dragTargetIndex === 0 &&
         draggingIndex !== 0 && (
          <DropIndicator style={styles.dropIndicator} />
        )}

        <View
          style={{
            zIndex: draggingIndex === globalIndex ? 10000 : 1,
            elevation: draggingIndex === globalIndex ? 10000 : 0
          }}
        >
          <StopCard
            stop={stop}
            index={globalIndex}
            isEditMode={false}
            onDelete={() => handleDeleteStop(stop.id)}
            onEdit={() => handleEditStop(stop)}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            isDragging={draggingIndex === globalIndex}
            scrollCompensationRef={scrollCompensation}
            lastTranslationRef={lastGestureTranslation}
            transportToNext={transportToNext}
            animatedPosition={stopAnimatedPositions[globalIndex]}
            onLayout={handleCardLayout}
          />
        </View>

        {/* Drop indicator AFTER this card if dropping right after it */}
        {draggingIndex !== null &&
         dragTargetIndex !== null &&
         draggingIndex !== dragTargetIndex &&
         dragTargetIndex === globalIndex + 1 && (
          <DropIndicator style={styles.dropIndicator} />
        )}
      </React.Fragment>
    );
  })
}
```

---

## 2. StopCard.tsx - Component Updates

### Interface Update (Lines 16-37)
```typescript
interface StopCardProps {
  stop: Stop;
  index: number;
  isEditMode: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onDragStart?: (index: number) => void;
  onDrag?: (index: number, absoluteY: number, translationY: number) => void;
  onDragEnd?: (fromIndex: number, toIndex: number) => void;
  isDragging?: boolean;
  scrollCompensationRef?: React.MutableRefObject<number>;
  lastTranslationRef?: React.MutableRefObject<number>;
  animatedPosition?: Animated.Value;  // NEW
  onLayout?: (index: number, y: number, height: number) => void;  // NEW
  transportToNext?: {
    mode: 'driving' | 'walking' | 'bicycling' | 'flight';
    distance: number;
    duration: number;
    toStop: Stop;
    onModeChange: (mode: 'driving' | 'walking' | 'bicycling' | 'flight') => void;
  } | null;
}
```

### Function Props (Lines 57-72)
```typescript
function StopCard({
  stop,
  index,
  isEditMode,
  onDelete,
  onEdit,
  onDragStart,
  onDrag,
  onDragEnd,
  isDragging = false,
  scrollCompensationRef,
  lastTranslationRef,
  animatedPosition,  // NEW
  onLayout,  // NEW
  transportToNext,
}: StopCardProps) {
```

### Combined Translate Y (Lines 89-97)
```typescript
// Combine drag position and slide-aside position
// When dragging: translateY is active, animatedPosition is 0
// When not dragging: translateY is 0, animatedPosition slides the card
const combinedTranslateY = React.useMemo(() => {
  return Animated.add(
    translateY,
    animatedPosition || new Animated.Value(0)
  );
}, [translateY, animatedPosition]);
```

### Container with Layout Callback (Lines 328-350)
```typescript
const containerRef = useRef<View>(null);

// Report layout position when mounted and when index changes
React.useEffect(() => {
  if (containerRef.current && onLayout) {
    containerRef.current.measure((x, y, width, height, pageX, pageY) => {
      onLayout(index, pageY, height);
    });
  }
}, [index, onLayout]);

return (
  <View
    ref={containerRef}
    style={styles.container}
    onLayout={(event) => {
      const { height } = event.nativeEvent.layout;
      // Get position relative to window
      containerRef.current?.measure((x, y, width, h, pageX, pageY) => {
        onLayout?.(index, pageY, height);
      });
    }}
  >
```

### Animated View with Combined Transform (Lines 334-342)
```typescript
<Animated.View
  style={[
    styles.stopCardContainer,
    {
      transform: [{ translateY: combinedTranslateY }],  // UPDATED
      zIndex: isPressed || isDragging ? 10000 : 1,
      elevation: isPressed || isDragging ? 10000 : 1,
    },
  ]}
>
```

### Memo Comparison Update (Lines 448-461)
```typescript
export default memo(StopCard, (prevProps, nextProps) => {
  return (
    prevProps.stop.id === nextProps.stop.id &&
    prevProps.index === nextProps.index &&
    prevProps.transportToNext?.mode === nextProps.transportToNext?.mode &&
    prevProps.transportToNext?.distance === nextProps.transportToNext?.distance &&  // NEW
    prevProps.transportToNext?.duration === nextProps.transportToNext?.duration &&  // NEW
    prevProps.stop.order === nextProps.stop.order &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.scrollCompensationRef === nextProps.scrollCompensationRef &&
    prevProps.lastTranslationRef === nextProps.lastTranslationRef &&
    prevProps.animatedPosition === nextProps.animatedPosition &&  // NEW
    prevProps.onLayout === nextProps.onLayout  // NEW
  );
});
```

---

## Key Concepts

### How Drag Detection Works:
1. **Threshold-based**: Must drag 60% of card height (~96-144px) to trigger swap
2. **Distance calculation**: `Math.round(translationY / avgCardHeight)` determines positions moved
3. **Index clamping**: Ensures `newTargetIndex` stays within `[0, sortedStops.length]`

### Visual Indicator Logic:
- **Before first card**: When `dragTargetIndex === 0 && draggingIndex !== 0`
- **After any card**: When `dragTargetIndex === globalIndex + 1`
- **Blue line appears** exactly where the stop will be inserted

### Reordering Logic:
1. Remove stop from original position: `reorderedStops.splice(fromIndex, 1)`
2. Insert at new position: `reorderedStops.splice(finalIndex, 0, movedStop)`
3. Update all order properties: `map((stop, idx) => ({ ...stop, order: idx }))`
4. Persist to database: `await reorderStops(trip.id, updatedStops)`
5. Update transport: `await regenerateAllTransportSegments(trip.id)`

### Performance Optimizations:
- Memoized `DropIndicator` component
- Simple opacity instead of shadows
- Skip reorder if `fromIndex === finalIndex`
- Memo comparison includes transport data for instant updates

---

## Testing Checklist

- [ ] Drag stop down 1 position
- [ ] Drag stop up 1 position
- [ ] Drag stop to first position
- [ ] Drag stop to last position
- [ ] Drag across multiple days
- [ ] Verify blue line appears correctly
- [ ] Verify transport times update after drop
- [ ] Test with transport cards visible/hidden
- [ ] Check console logs for correct indices
- [ ] Verify no frame drops during drag

---

## Debug Console Messages

```
📍 Drag update: dragging index 2, target 3, translationY: 150
🎯 Drop: moving stop from 2 to 3
✅ Reordered: Stop A → Stop B → Stop D → Stop C
```
