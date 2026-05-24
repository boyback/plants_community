import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  images: string[];
  visible: boolean;
  initialIndex?: number;
  onClose: () => void;
};

export function ImagePreview({ images, visible, initialIndex = 0, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (visible) setIndex(initialIndex);
  }, [initialIndex, visible]);

  const current = images[index];
  const canPrev = index > 0;
  const canNext = index < images.length - 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.topBar}>
          <Text style={styles.counter}>{images.length ? `${index + 1}/${images.length}` : ''}</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
        <View style={styles.stage}>
          {current ? <Image source={{ uri: current }} resizeMode="contain" style={styles.image} /> : null}
          {canPrev ? (
            <Pressable onPress={() => setIndex((value) => Math.max(0, value - 1))} style={[styles.navButton, styles.prevButton]}>
              <Text style={styles.navText}>‹</Text>
            </Pressable>
          ) : null}
          {canNext ? (
            <Pressable onPress={() => setIndex((value) => Math.min(images.length - 1, value + 1))} style={[styles.navButton, styles.nextButton]}>
              <Text style={styles.navText}>›</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 52,
    paddingBottom: 12,
  },
  counter: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  closeText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 30,
  },
  stage: {
    flex: 1,
    justifyContent: 'center',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  navButton: {
    position: 'absolute',
    top: '45%',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    width: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  prevButton: {
    left: 14,
  },
  nextButton: {
    right: 14,
  },
  navText: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 38,
  },
});
