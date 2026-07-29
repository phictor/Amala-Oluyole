import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Alert, Switch, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { trpc } from '@/lib/trpc';

const LABELS = ['Popular', 'New', 'Best Seller', "Chef's Special", 'Spicy', 'Gluten-Free', 'Vegetarian'];

export default function AddEditMealScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!params.id;
  const mealId = params.id ? Number(params.id) : undefined;

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [prepTime, setPrepTime] = useState('15');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isPopular, setIsPopular] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [isChefSpecial, setIsChefSpecial] = useState(false);
  const [isSpicy, setIsSpicy] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState('0');

  // Load categories
  const { data: categories = [] } = trpc.menu.categories.useQuery();

  // Load existing meal data if editing
  const { data: allMeals = [] } = trpc.admin.allMeals.useQuery(undefined, { enabled: isEdit });
  useEffect(() => {
    if (isEdit && mealId && allMeals.length > 0) {
      const meal = allMeals.find(m => m.id === mealId);
      if (meal) {
        setName(meal.name);
        setDescription(meal.description ?? '');
        setPrice(String(parseFloat(String(meal.price))));
        setImageUrl(meal.imageUrl ?? '');
        setPrepTime(String(meal.preparationTime ?? 15));
        setCategoryId(meal.categoryId);
        setIsAvailable(meal.isAvailable);
        setIsPopular(meal.isPopular ?? false);
        setIsBestSeller(meal.isBestSeller ?? false);
        setIsChefSpecial(meal.isChefSpecial ?? false);
        setIsSpicy(meal.isSpicy ?? false);
        setSelectedLabels((meal.labels as string[]) ?? []);
        setSortOrder(String(meal.sortOrder ?? 0));
      }
    }
  }, [isEdit, mealId, allMeals]);

  const createMeal = trpc.admin.createMeal.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'Meal created successfully!');
      router.back();
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const updateMeal = trpc.admin.updateMeal.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'Meal updated successfully!');
      router.back();
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const isLoading = createMeal.isPending || updateMeal.isPending;

  const validate = () => {
    if (!name.trim()) { Alert.alert('Validation', 'Meal name is required.'); return false; }
    if (!price || isNaN(Number(price)) || Number(price) <= 0) { Alert.alert('Validation', 'Enter a valid price.'); return false; }
    if (!categoryId) { Alert.alert('Validation', 'Please select a category.'); return false; }
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      price: Number(price),
      imageUrl: imageUrl.trim() || undefined,
      preparationTime: Number(prepTime) || 15,
      categoryId: categoryId!,
      isAvailable,
      isPopular,
      isBestSeller,
      isChefSpecial,
      isSpicy,
      labels: selectedLabels,
      sortOrder: Number(sortOrder) || 0,
    };
    if (isEdit && mealId) {
      updateMeal.mutate({ id: mealId, ...payload });
    } else {
      createMeal.mutate(payload);
    }
  };

  const toggleLabel = (label: string) => {
    setSelectedLabels(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{isEdit ? 'Edit Meal' : 'Add New Meal'}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Name */}
        <Text style={s.label}>Meal Name *</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} placeholder="e.g. Amala & Ewedu" placeholderTextColor="#B09080" />

        {/* Description */}
        <Text style={s.label}>Description</Text>
        <TextInput style={[s.input, s.multiline]} value={description} onChangeText={setDescription}
          placeholder="Brief description of the meal..." placeholderTextColor="#B09080" multiline numberOfLines={3} />

        {/* Price */}
        <Text style={s.label}>Price (₦) *</Text>
        <TextInput style={s.input} value={price} onChangeText={setPrice} placeholder="e.g. 2500" placeholderTextColor="#B09080" keyboardType="numeric" />

        {/* Category */}
        <Text style={s.label}>Category *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.categoryRow}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[s.catChip, categoryId === cat.id && s.catChipActive]}
              onPress={() => setCategoryId(cat.id)}
            >
              <Text style={[s.catChipText, categoryId === cat.id && s.catChipTextActive]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Prep Time */}
        <Text style={s.label}>Preparation Time (minutes)</Text>
        <TextInput style={s.input} value={prepTime} onChangeText={setPrepTime} placeholder="15" placeholderTextColor="#B09080" keyboardType="numeric" />

        {/* Image URL */}
        <Text style={s.label}>Image URL</Text>
        <TextInput style={s.input} value={imageUrl} onChangeText={setImageUrl} placeholder="https://..." placeholderTextColor="#B09080" autoCapitalize="none" />

        {/* Sort Order */}
        <Text style={s.label}>Sort Order</Text>
        <TextInput style={s.input} value={sortOrder} onChangeText={setSortOrder} placeholder="0" placeholderTextColor="#B09080" keyboardType="numeric" />

        {/* Toggles */}
        <Text style={s.sectionTitle}>Availability & Flags</Text>
        {([
          ['Available', isAvailable, setIsAvailable],
          ['Popular', isPopular, setIsPopular],
          ['Best Seller', isBestSeller, setIsBestSeller],
          ["Chef's Special", isChefSpecial, setIsChefSpecial],
          ['Spicy', isSpicy, setIsSpicy],
        ] as [string, boolean, (v: boolean) => void][]).map(([label, val, setter]) => (
          <View key={label} style={s.toggleRow}>
            <Text style={s.toggleLabel}>{label}</Text>
            <Switch
              value={val}
              onValueChange={setter}
              trackColor={{ false: '#E8D5C4', true: '#C0392B' }}
              thumbColor={val ? '#FFF' : '#8B6F5E'}
            />
          </View>
        ))}

        {/* Labels */}
        <Text style={s.sectionTitle}>Labels</Text>
        <View style={s.labelsRow}>
          {LABELS.map(label => (
            <TouchableOpacity
              key={label}
              style={[s.labelChip, selectedLabels.includes(label) && s.labelChipActive]}
              onPress={() => toggleLabel(label)}
            >
              <Text style={[s.labelChipText, selectedLabels.includes(label) && s.labelChipTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save Button */}
        <TouchableOpacity style={[s.saveBtn, isLoading && { opacity: 0.6 }]} onPress={handleSave} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={s.saveBtnText}>{isEdit ? 'Save Changes' : 'Create Meal'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#C0392B',
  },
  backBtn: { padding: 8 },
  backText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  container: { flex: 1, backgroundColor: '#FDF8F3', paddingHorizontal: 16, paddingTop: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#5C3D2E', marginBottom: 6, marginTop: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#C0392B', marginTop: 22, marginBottom: 10 },
  input: {
    backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E8D5C4',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#2C1810',
  },
  multiline: { height: 80, textAlignVertical: 'top' },
  categoryRow: { marginBottom: 4 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
    borderColor: '#E8D5C4', backgroundColor: '#FFF', marginRight: 8,
  },
  catChipActive: { backgroundColor: '#C0392B', borderColor: '#C0392B' },
  catChipText: { fontSize: 13, color: '#5C3D2E', fontWeight: '500' },
  catChipTextActive: { color: '#FFF' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0E0D0',
  },
  toggleLabel: { fontSize: 15, color: '#2C1810' },
  labelsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  labelChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1,
    borderColor: '#E8D5C4', backgroundColor: '#FFF',
  },
  labelChipActive: { backgroundColor: '#FDF0E8', borderColor: '#C0392B' },
  labelChipText: { fontSize: 12, color: '#5C3D2E' },
  labelChipTextActive: { color: '#C0392B', fontWeight: '600' },
  saveBtn: {
    marginTop: 28, backgroundColor: '#C0392B', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  saveBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
