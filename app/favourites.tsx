import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image, StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from '@/lib/store/app-store';
import { MEALS } from '@/lib/data/mock-data';

export default function FavouritesScreen() {
  const { state, dispatch } = useAppStore();
  const favourites = MEALS.filter(m => state.favouriteMealIds.includes(m.id));

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Favourites</Text>
      </View>

      <FlatList
        data={favourites}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🤍</Text>
            <Text style={styles.emptyTitle}>No favourites yet</Text>
            <Text style={styles.emptySubtitle}>Tap the heart icon on any meal to save it here</Text>
            <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(tabs)/menu' as never)}>
              <Text style={styles.browseBtnText}>Browse Menu</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.mealCard}
            onPress={() => router.push({ pathname: '/meal/[id]' as never, params: { id: item.id } })}
          >
            <Image source={{ uri: item.imageUrl }} style={styles.mealImage} />
            <View style={styles.mealInfo}>
              <Text style={styles.mealName}>{item.name}</Text>
              <Text style={styles.mealDesc} numberOfLines={2}>{item.description}</Text>
              <Text style={styles.mealPrice}>₦{item.price.toLocaleString()}</Text>
            </View>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => dispatch({ type: 'TOGGLE_FAVOURITE', payload: item.id })}
            >
              <Text style={styles.removeIcon}>❤️</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  backText: { color: '#D02010', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#201060' },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  mealCard: {
    flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 14, padding: 12,
    marginBottom: 10, alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#E8E6F4',
  },
  mealImage: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#F0EEF9' },
  mealInfo: { flex: 1 },
  mealName: { fontSize: 15, fontWeight: '700', color: '#201060', marginBottom: 4 },
  mealDesc: { fontSize: 12, color: '#6B6490', marginBottom: 6 },
  mealPrice: { fontSize: 15, fontWeight: '800', color: '#D02010' },
  removeBtn: { padding: 8 },
  removeIcon: { fontSize: 22 },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#201060', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#6B6490', textAlign: 'center', marginBottom: 24 },
  browseBtn: { backgroundColor: '#D02010', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 28 },
  browseBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});

