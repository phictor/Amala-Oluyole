import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { ScreenContainer } from '@/components/screen-container';

const LOGO_CHEF = require('@/assets/images/logo-chef.png');

const BRANCHES = [
  {
    id: 1,
    name: 'Amala Oluyole — Main Branch',
    address: 'Plot 4, Block 1, Opp. Sumal Industry, Oluyole Town Planning Area, Ibadan, Oyo State',
    phone: '+234 803 000 0001',
    whatsapp: '+2348030000001',
    hours: 'Mon – Sun: 8:00 AM – 10:00 PM',
    mapUrl: 'https://maps.google.com/?q=Oluyole+Town+Planning+Area+Ibadan',
  },
  {
    id: 2,
    name: 'Amala Oluyole Bistro',
    address: 'Plot 4, Block 1, Opp. Sumal Industry, Oluyole Town Planning Area, Ibadan, Oyo State',
    phone: '+234 803 000 0002',
    whatsapp: '+2348030000002',
    hours: 'Mon – Sun: 10:00 AM – 11:00 PM',
    mapUrl: 'https://maps.google.com/?q=Oluyole+Town+Planning+Area+Ibadan',
  },
  {
    id: 3,
    name: 'Amala Oluyole Fine Dining',
    address: 'Plot 4, Block 1, Opp. Sumal Industry, Oluyole Town Planning Area, Ibadan, Oyo State',
    phone: '+234 803 000 0003',
    whatsapp: '+2348030000003',
    hours: 'Tue – Sun: 12:00 PM – 10:00 PM',
    mapUrl: 'https://maps.google.com/?q=Oluyole+Town+Planning+Area+Ibadan',
  },
];

const SOCIAL = [
  { label: 'Instagram', emoji: '📸', url: 'https://instagram.com/amalaoluyole' },
  { label: 'Facebook', emoji: '📘', url: 'https://facebook.com/amalaoluyole' },
  { label: 'Twitter / X', emoji: '🐦', url: 'https://twitter.com/amalaoluyole' },
  { label: 'TikTok', emoji: '🎵', url: 'https://tiktok.com/@amalaoluyole' },
];

function openUrl(url: string) {
  Linking.canOpenURL(url).then(ok => {
    if (ok) Linking.openURL(url);
    else Alert.alert('Cannot open link', url);
  });
}

function callPhone(phone: string) {
  openUrl(`tel:${phone.replace(/\s/g, '')}`);
}

function openWhatsApp(number: string, name: string) {
  const msg = encodeURIComponent(`Hello Amala Oluyole (${name}), I'd like to make an enquiry.`);
  openUrl(`https://wa.me/${number.replace(/[^0-9]/g, '')}?text=${msg}`);
}

export default function ContactScreen() {
  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Header */}
        <LinearGradient colors={['#201060', '#150B50', '#0D0A2E']} style={s.header}>
          <Image source={LOGO_CHEF} style={s.headerLogo} contentFit="contain" />
          <Text style={s.headerTitle}>Contact Us</Text>
          <Text style={s.headerSub}>We'd love to hear from you</Text>
        </LinearGradient>

        {/* Branches */}
        {BRANCHES.map(branch => (
          <View key={branch.id} style={s.card}>
            <Text style={s.branchName}>{branch.name}</Text>

            {/* Address */}
            <TouchableOpacity style={s.row} onPress={() => openUrl(branch.mapUrl)} activeOpacity={0.75}>
              <Text style={s.rowIcon}>📍</Text>
              <View style={s.rowBody}>
                <Text style={s.rowLabel}>Address</Text>
                <Text style={s.rowValue}>{branch.address}</Text>
                <Text style={s.rowLink}>View on map →</Text>
              </View>
            </TouchableOpacity>

            {/* Hours */}
            <View style={s.row}>
              <Text style={s.rowIcon}>🕐</Text>
              <View style={s.rowBody}>
                <Text style={s.rowLabel}>Opening Hours</Text>
                <Text style={s.rowValue}>{branch.hours}</Text>
              </View>
            </View>

            {/* Action buttons */}
            <View style={s.actionRow}>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#201060' }]}
                onPress={() => callPhone(branch.phone)}
                activeOpacity={0.8}
              >
                <Text style={s.actionIcon}>📞</Text>
                <Text style={s.actionLabel}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#25D366' }]}
                onPress={() => openWhatsApp(branch.whatsapp, branch.name)}
                activeOpacity={0.8}
              >
                <Text style={s.actionIcon}>💬</Text>
                <Text style={s.actionLabel}>WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#D02010' }]}
                onPress={() => openUrl(branch.mapUrl)}
                activeOpacity={0.8}
              >
                <Text style={s.actionIcon}>🗺️</Text>
                <Text style={s.actionLabel}>Directions</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Email */}
        <View style={s.card}>
          <Text style={s.branchName}>General Enquiries</Text>
          <TouchableOpacity style={s.row} onPress={() => openUrl('mailto:hello@amalaoluyole.com')} activeOpacity={0.75}>
            <Text style={s.rowIcon}>✉️</Text>
            <View style={s.rowBody}>
              <Text style={s.rowLabel}>Email</Text>
              <Text style={s.rowValue}>hello@amalaoluyole.com</Text>
              <Text style={s.rowLink}>Send us a message →</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={s.row} onPress={() => openUrl('mailto:events@amalaoluyole.com')} activeOpacity={0.75}>
            <Text style={s.rowIcon}>🎉</Text>
            <View style={s.rowBody}>
              <Text style={s.rowLabel}>Events & Private Dining</Text>
              <Text style={s.rowValue}>events@amalaoluyole.com</Text>
              <Text style={s.rowLink}>Book an event →</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Social Media */}
        <View style={s.card}>
          <Text style={s.branchName}>Follow Us</Text>
          <View style={s.socialGrid}>
            {SOCIAL.map(item => (
              <TouchableOpacity
                key={item.label}
                style={s.socialBtn}
                onPress={() => openUrl(item.url)}
                activeOpacity={0.8}
              >
                <Text style={s.socialEmoji}>{item.emoji}</Text>
                <Text style={s.socialLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: {
    paddingTop: 24, paddingBottom: 32, paddingHorizontal: 20,
    alignItems: 'center', gap: 8,
  },
  headerLogo: { width: 64, height: 64, marginBottom: 4 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#FFF' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },

  card: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#FFF', borderRadius: 18,
    padding: 20,
    shadowColor: '#1A1640', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  branchName: { fontSize: 16, fontWeight: '800', color: '#201060', marginBottom: 14 },

  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  rowIcon: { fontSize: 22, marginTop: 2 },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 11, fontWeight: '700', color: '#9B94C4', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  rowValue: { fontSize: 14, color: '#201060', lineHeight: 20 },
  rowLink: { fontSize: 13, color: '#D02010', fontWeight: '600', marginTop: 4 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 12,
  },
  actionIcon: { fontSize: 16 },
  actionLabel: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  socialGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  socialBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F4F3FB', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  socialEmoji: { fontSize: 18 },
  socialLabel: { fontSize: 13, fontWeight: '600', color: '#201060' },
});
