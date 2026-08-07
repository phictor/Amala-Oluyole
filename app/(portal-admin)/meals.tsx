import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert, Image, Platform } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { trpc } from '@/lib/trpc';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

export default function AdminMealsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const mealsQ = trpc.admin.allMeals.useQuery(undefined, { staleTime: 30_000 });
  const utils = trpc.useUtils();
  const toggleMeal = trpc.kitchen.toggleMealAvailability.useMutation({ onSuccess: () => utils.admin.allMeals.invalidate() });
  const deleteMeal = trpc.admin.deleteMeal.useMutation({ onSuccess: () => utils.admin.allMeals.invalidate() });
  const uploadImage = trpc.admin.uploadMealImage.useMutation({
    onSuccess: () => { utils.admin.allMeals.invalidate(); setUploadingId(null); },
    onError: (err) => { Alert.alert('Upload Failed', err.message || 'Could not upload photo.'); setUploadingId(null); },
  });

  const meals = mealsQ.data ?? [];

  const onRefresh = async () => { setRefreshing(true); await mealsQ.refetch(); setRefreshing(false); };

  const handleDelete = (id: number, name: string) => {
    Alert.alert('Remove Meal', `Remove "${name}" from the menu?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteMeal.mutate({ id }) },
    ]);
  };

  const handleUploadPhoto = async (mealId: number, mealName: string) => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Allow access to your photo library to upload meal photos.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!asset.base64) { Alert.alert('Error', 'Could not read image data.'); return; }
    setUploadingId(mealId);
    const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    uploadImage.mutate({ mealId, base64: asset.base64, fileName: `${mealName.replace(/\s+/g, '-').toLowerCase()}.${ext}` });
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <View>
          <Text style={s.title}>Menu Management</Text>
          <Text style={s.sub}>{meals.length} items</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => router.push('/admin/add-meal' as any)} activeOpacity={0.8}>
          <Text style={s.addBtnText}>+ Add Meal</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {meals.map((meal: any) => (
          <View key={meal.id} style={s.card}>
            {/* Photo thumbnail — tap to upload */}
            <TouchableOpacity style={s.photoThumb} onPress={() => handleUploadPhoto(meal.id, meal.name)} activeOpacity={0.8}>
              {meal.imageUrl ? (
                <Image source={{ uri: meal.imageUrl }} style={s.thumbImg} />
              ) : (
                <View style={s.thumbPlaceholder}><Text style={s.thumbIcon}>📷</Text></View>
              )}
              {uploadingId === meal.id && (
                <View style={s.thumbOverlay}><Text style={s.thumbOverlayText}>Uploading…</Text></View>
              )}
            </TouchableOpacity>
            <View style={s.cardLeft}>
              <Text style={s.mealName}>{meal.name}</Text>
              <Text style={s.mealPrice}>₦{Number(meal.price).toLocaleString()}</Text>
              <View style={[s.availBadge, { backgroundColor: meal.isAvailable ? '#DCFCE7' : '#FEE2E2' }]}>
                <Text style={[s.availText, { color: meal.isAvailable ? '#166534' : '#991B1B' }]}>
                  {meal.isAvailable ? 'Available' : 'Unavailable'}
                </Text>
              </View>
            </View>
            <View style={s.cardActions}>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#EFF6FF' }]}
                onPress={() => handleUploadPhoto(meal.id, meal.name)}
                activeOpacity={0.8}
              >
                <Text style={[s.actionBtnText, { color: '#1D4ED8' }]}>📷 Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: meal.isAvailable ? '#FEF3C7' : '#DCFCE7' }]}
                onPress={() => toggleMeal.mutate({ mealId: meal.id, branchId: meal.branchId ?? 1, isAvailable: !meal.isAvailable })}
                activeOpacity={0.8}
              >
                <Text style={[s.actionBtnText, { color: meal.isAvailable ? '#92400E' : '#166534' }]}>
                  {meal.isAvailable ? 'Disable' : 'Enable'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#FEE2E2' }]}
                onPress={() => handleDelete(meal.id, meal.name)}
                activeOpacity={0.8}
              >
                <Text style={[s.actionBtnText, { color: '#991B1B' }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 22, fontWeight: '900', color: '#111827' },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  addBtn: { backgroundColor: '#1A3C5E', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft: { flex: 1 },
  mealName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  mealPrice: { fontSize: 14, fontWeight: '700', color: '#1A3C5E', marginBottom: 6 },
  availBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  availText: { fontSize: 11, fontWeight: '700' },
  cardActions: { gap: 8 },
  actionBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
  photoThumb: { width: 56, height: 56, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  thumbImg: { width: 56, height: 56 },
  thumbPlaceholder: { width: 56, height: 56, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  thumbIcon: { fontSize: 22 },
  thumbOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  thumbOverlayText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
});
