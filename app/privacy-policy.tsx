'use client';
import { ScrollView, Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';

export default function PrivacyPolicyScreen() {
  const colors = useColors();
  return (
    <ScreenContainer>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.updated, { color: colors.muted }]}>Last updated: July 2026</Text>

        <Text style={[styles.intro, { color: colors.foreground }]}>
          Amala Oluyole Restaurant (“we”, “our”, or “us”) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and share information about you when you use our mobile application.
        </Text>

        {[
          {
            title: '1. Information We Collect',
            body: 'We collect information you provide directly to us, such as your name, email address, phone number, and delivery addresses when you create an account or place an order. We also collect information about your orders, preferences, and interactions with the app. When you use our location features, we may collect your device location to show nearby branches and calculate delivery routes.',
          },
          {
            title: '2. How We Use Your Information',
            body: 'We use the information we collect to process and fulfil your orders, send you order status updates and notifications, personalise your experience, manage your loyalty points and rewards, respond to your support requests, improve our services and app functionality, and comply with legal obligations.',
          },
          {
            title: '3. Sharing of Information',
            body: 'We do not sell your personal information. We share your information only with our delivery riders (name and delivery address for order fulfilment), payment processors to handle transactions securely, and service providers who assist us in operating the app. All third parties are bound by confidentiality agreements.',
          },
          {
            title: '4. Data Storage & Security',
            body: 'Your data is stored on secure servers. We use industry-standard encryption (TLS/SSL) for data in transit and at rest. We retain your data for as long as your account is active or as needed to provide services. You may request deletion of your account and data at any time by contacting us.',
          },
          {
            title: '5. Push Notifications',
            body: 'With your permission, we send push notifications about your order status, promotions, and loyalty rewards. You can disable notifications at any time in your device settings.',
          },
          {
            title: '6. Location Data',
            body: 'We request location access to show you the nearest branch and to enable accurate delivery tracking. Location data is only used during active app sessions and is not shared with third parties beyond our delivery partners for active deliveries.',
          },
          {
            title: '7. Your Rights',
            body: 'You have the right to access, correct, or delete your personal data. You may also request a copy of your data or object to certain processing activities. To exercise these rights, contact us at privacy@amalaoluyole.com.',
          },
          {
            title: '8. Children\'s Privacy',
            body: 'Our app is not directed to children under 13. We do not knowingly collect personal information from children under 13.',
          },
          {
            title: '9. Changes to This Policy',
            body: 'We may update this Privacy Policy from time to time. We will notify you of significant changes through the app or by email. Continued use of the app after changes constitutes acceptance of the updated policy.',
          },
          {
            title: '10. Contact Us',
            body: 'If you have questions about this Privacy Policy, please contact us at:\n\nAmala Oluyole Restaurant\nEmail: privacy@amalaoluyole.com\nPhone: 0812-345-6789\nAddress: 12 Oluyole Estate Road, Ibadan, Oyo State, Nigeria',
          },
        ].map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{section.title}</Text>
            <Text style={[styles.sectionBody, { color: colors.muted }]}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 60 },
  backText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 60 },
  updated: { fontSize: 13, marginBottom: 16, fontStyle: 'italic' },
  intro: { fontSize: 15, lineHeight: 24, marginBottom: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  sectionBody: { fontSize: 14, lineHeight: 22 },
});
