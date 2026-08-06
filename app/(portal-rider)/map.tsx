import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { TouchableOpacity } from 'react-native';

export default function RiderMapScreen() {
  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <Text style={s.title}>Delivery Map</Text>
      </View>
      <View style={s.body}>
        <Text style={s.icon}>🗺️</Text>
        <Text style={s.text}>Interactive map available in the full rider portal</Text>
        <TouchableOpacity style={s.btn} onPress={() => router.push('/rider' as any)} activeOpacity={0.8}>
          <Text style={s.btnText}>Open Full Rider Portal →</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 22, fontWeight: '900', color: '#111827' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  icon: { fontSize: 64, marginBottom: 16 },
  text: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  btn: { backgroundColor: '#DCFCE7', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  btnText: { fontSize: 14, fontWeight: '700', color: '#166534' },
});
