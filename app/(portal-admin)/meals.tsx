import React, { useState } from 'react';
import { FlatList, View, Text, TouchableOpacity, StyleSheet, Switch, RefreshControl, Alert } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { AdminMenu } from '@/components/admin-menu';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'expo-router';

export default function AdminMealsScreen() {
  const router = useRouter();
  const { data: meals, refetch, isRefetching } = trpc.admin.allMeals.useQuery();
  const toggleAvail = trpc.kitchen.toggleMealAvailability.useMutation({ onSuccess: () => refetch() });
  const deleteMeal = trpc.admin.deleteMeal.useMutation({ onSuccess: () => refetch() });
  const { data: orders } = trpc.admin.activeOrders.useQuery(undefined, { refetchInterval: 10000 });
  const pendingCount = orders?.filter((o: { status: string }) => o.status === 'pending').length ?? 0;
  const kitchenCount = orders?.filter((o: { status: string }) => ['accepted','preparing'].includes(o.status)).length ?? 0;

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={styles.header}>
        <Text style={styles.title}>Menu</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/admin/add-meal' as never)}>
          <Text style={styles.addText}>+ Add Meal</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={meals ?? []}
        keyExtractor={(item: { id: number }) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#201060" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        ListEmptyComponent={<Text style={styles.empty}>No meals yet. Tap + Add Meal to get started.</Text>}
        renderItem={({ item }: { item: { id: number; name: string; price: string; isAvailable: boolean; branchId?: number; category?: { name: string } } }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mealName}>{item.name}</Text>
              <Text style={styles.mealSub}>{item.category?.name ?? '—'} · ₦{Number(item.price).toLocaleString()}</Text>
            </View>
            <Switch
              value={item.isAvailable}
              onValueChange={() => toggleAvail.mutate({ mealId: item.id, branchId: item.branchId ?? 1, isAvailable: !item.isAvailable })}
              trackColor={{ true: '#1A5C2A', false: '#ccc' }}
              thumbColor="#fff"
            />
            <TouchableOpacity style={styles.editBtn} onPress={() => router.push({ pathname: '/admin/add-meal', params: { mealId: item.id } } as never)}>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => {
              const msg = 'Remove "' + item.name + '"?';
              Alert.alert('Delete Meal', msg, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteMeal.mutate({ id: item.id }) }]);
            }}>
              <Text style={styles.deleteText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      <AdminMenu activeSection="menu" pendingOrders={pendingCount} kitchenOrders={kitchenCount} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#201060' },
  addBtn: { backgroundColor: '#201060', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#6B6490', marginTop: 40, fontSize: 15 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2, gap: 8 },
  mealName: { fontSize: 15, fontWeight: '700', color: '#201060' },
  mealSub: { fontSize: 12, color: '#6B6490', marginTop: 2 },
  editBtn: { backgroundColor: '#F4F3FB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  editText: { fontSize: 12, color: '#201060', fontWeight: '600' },
  deleteBtn: { backgroundColor: '#FFF0F0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  deleteText: { fontSize: 12, color: '#D02010', fontWeight: '700' },
});
