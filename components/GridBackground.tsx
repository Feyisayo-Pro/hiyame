import { memo, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

const GRID_SPACING = 24;
const LINE_COLOR = 'rgba(75, 85, 99, 0.08)';

/**
 * Subtle concentric-square grid overlay.
 * Renders as an absolute fill behind content.
 * Pure RN Views, no SVG dependency.
 */
function GridBackgroundRaw() {
  const { width, height } = Dimensions.get('window');

  const lines = useMemo(() => {
    const hCount = Math.ceil(height / GRID_SPACING);
    const vCount = Math.ceil(width / GRID_SPACING);
    const els: React.JSX.Element[] = [];

    for (let i = 0; i < hCount; i++) {
      els.push(
        <View
          key={`h${i}`}
          style={{
            position: 'absolute',
            top: i * GRID_SPACING,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: LINE_COLOR,
          }}
        />
      );
    }

    for (let i = 0; i < vCount; i++) {
      els.push(
        <View
          key={`v${i}`}
          style={{
            position: 'absolute',
            left: i * GRID_SPACING,
            top: 0,
            bottom: 0,
            width: 1,
            backgroundColor: LINE_COLOR,
          }}
        />
      );
    }

    return els;
  }, [width, height]);

  return (
    <View style={styles.container} pointerEvents="none">
      {lines}
    </View>
  );
}

export const GridBackground = memo(GridBackgroundRaw);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
});
