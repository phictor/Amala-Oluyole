import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Platform, useWindowDimensions, StatusBar,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAppStore } from '@/lib/store/app-store';

export type PortalType = 'admin' | 'kitchen' | 'rider';

interface NavItem {
  key: string;
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

const ADMIN_NAV: NavItem[] = [
  { key: 'index',    label: 'Finance',   icon: '₦',  route: '/(portal-admin)/' },
  { key: 'orders',   label: 'Orders',    icon: '🧾', route: '/(portal-admin)/orders' },
  { key: 'kitchen',  label: 'Kitchen',   icon: '🍲', route: '/(portal-admin)/kitchen' },
  { key: 'riders',   label: 'Riders',    icon: '🛵', route: '/(portal-admin)/riders' },
  { key: 'meals',    label: 'Menu',      icon: '🍽️', route: '/(portal-admin)/meals' },
  { key: 'staff',    label: 'Staff',     icon: '👥', route: '/(portal-admin)/staff' },
  { key: 'settings', label: 'Settings',  icon: '⚙️', route: '/(portal-admin)/settings' },
];

const KITCHEN_NAV: NavItem[] = [
  { key: 'index',     label: 'Orders',    icon: '🧾', route: '/(portal-kitchen)/' },
  { key: 'inventory', label: 'Inventory', icon: '📦', route: '/(portal-kitchen)/inventory' },
  { key: 'report',    label: 'Report',    icon: '📊', route: '/(portal-kitchen)/report' },
];

const RIDER_NAV: NavItem[] = [
  { key: 'index',   label: 'Deliveries', icon: '📦', route: '/(portal-rider)/' },
  { key: 'map',     label: 'Map',        icon: '🗺️', route: '/(portal-rider)/map' },
];

const NAV_MAP: Record<PortalType, NavItem[]> = {
  admin: ADMIN_NAV,
  kitchen: KITCHEN_NAV,
  rider: RIDER_NAV,
};

const PORTAL_TITLES: Record<PortalType, string> = {
  admin: 'Finance & Operations',
  kitchen: 'Kitchen Portal',
  rider: 'Rider Portal',
};

interface PortalLayoutProps {
  portal: PortalType;
  title: string;
  children: React.ReactNode;
  /** Live badge counts to show on nav items */
  badges?: Partial<Record<string, number>>;
}

export function PortalLayout({ portal, title, children, badges = {} }: PortalLayoutProps) {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 900;
  const router = useRouter();
  const pathname = usePathname();
  const { dispatch } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = NAV_MAP[portal];

  const isActive = (item: NavItem) => {
    const seg = pathname.split('/').pop() ?? '';
    return seg === item.key || (item.key === 'index' && (seg === '' || seg === portal));
  };

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' });
    router.replace('/(tabs)/' as never);
  };

  if (!isDesktop) {
    // Mobile: simple header + content
    return (
      <View style={styles.mobileRoot}>
        <View style={styles.mobileHeader}>
          <Text style={styles.mobileTitle}>{title}</Text>
          <View style={styles.mobileHeaderRight}>
            {navItems.map(item => (
              <TouchableOpacity
                key={item.key}
                style={[styles.mobileNavBtn, isActive(item) && styles.mobileNavBtnActive]}
                onPress={() => router.push(item.route as never)}
              >
                <Text style={styles.mobileNavIcon}>{item.icon}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
          {children}
        </ScrollView>
      </View>
    );
  }

  // Desktop: sidebar + main content
  const sidebarWidth = sidebarOpen ? 220 : 64;

  return (
    <View style={styles.desktopRoot}>
      {/* Sidebar */}
      <View style={[styles.sidebar, { width: sidebarWidth }]}>
        {/* Logo / brand */}
        <View style={styles.sidebarBrand}>
          <View style={styles.brandDot} />
          {sidebarOpen && (
            <View style={{ flex: 1 }}>
              <Text style={styles.brandName}>Amala Oluyole</Text>
              <Text style={styles.brandSub}>{PORTAL_TITLES[portal]}</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => setSidebarOpen(v => !v)} style={styles.collapseBtn}>
            <Text style={styles.collapseBtnText}>{sidebarOpen ? '◀' : '▶'}</Text>
          </TouchableOpacity>
        </View>

        {/* Nav items */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {navItems.map(item => {
            const active = isActive(item);
            const badge = badges[item.key] ?? item.badge ?? 0;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.navItem, active && styles.navItemActive]}
                onPress={() => router.push(item.route as never)}
              >
                <View style={styles.navIconWrap}>
                  <Text style={styles.navIcon}>{item.icon}</Text>
                  {badge > 0 && (
                    <View style={styles.navBadge}>
                      <Text style={styles.navBadgeText}>{badge > 99 ? '99+' : badge}</Text>
                    </View>
                  )}
                </View>
                {sidebarOpen && (
                  <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                    {item.label}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutIcon}>⏻</Text>
          {sidebarOpen && <Text style={styles.logoutLabel}>Sign out</Text>}
        </TouchableOpacity>
      </View>

      {/* Main content area */}
      <View style={styles.mainArea}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>{title}</Text>
          <View style={styles.topBarRight}>
            <Text style={styles.topBarTime}>{new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          </View>
        </View>
        {/* Page content */}
        <ScrollView style={styles.pageScroll} contentContainerStyle={styles.pageContent}>
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

const NAV = '#201060';
const NAV_ACTIVE = '#D02010';
const NAV_TEXT = '#EDE9FF';
const NAV_MUTED = '#9B94C4';
const BG = '#F4F3FB';
const TOPBAR = '#FFFFFF';

const styles = StyleSheet.create({
  // ── Desktop ──────────────────────────────────────────────────────────────
  desktopRoot: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: BG,
    minHeight: '100%' as never,
  },
  sidebar: {
    backgroundColor: NAV,
    paddingTop: (StatusBar.currentHeight ?? 0) + 8,
    paddingBottom: 16,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sidebarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
    gap: 10,
  },
  brandDot: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: NAV_ACTIVE,
    flexShrink: 0,
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  brandSub: {
    color: NAV_MUTED,
    fontSize: 11,
    marginTop: 1,
  },
  collapseBtn: {
    padding: 4,
    marginLeft: 'auto',
  },
  collapseBtnText: {
    color: NAV_MUTED,
    fontSize: 11,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 8,
    gap: 12,
  },
  navItemActive: {
    backgroundColor: 'rgba(208,32,16,0.18)',
  },
  navIconWrap: {
    position: 'relative',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  navIcon: {
    fontSize: 16,
  },
  navBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: NAV_ACTIVE,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  navBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
  navLabel: {
    color: NAV_TEXT,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  navLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  logoutIcon: {
    fontSize: 16,
    color: NAV_MUTED,
  },
  logoutLabel: {
    color: NAV_MUTED,
    fontSize: 13,
  },
  mainArea: {
    flex: 1,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  topBar: {
    backgroundColor: TOPBAR,
    borderBottomWidth: 1,
    borderBottomColor: '#D8D4EE',
    paddingHorizontal: 28,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#201060',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  topBarTime: {
    fontSize: 13,
    color: '#6B6490',
  },
  pageScroll: {
    flex: 1,
  },
  pageContent: {
    padding: 28,
    paddingBottom: 48,
  },
  // ── Mobile ───────────────────────────────────────────────────────────────
  mobileRoot: {
    flex: 1,
    backgroundColor: BG,
  },
  mobileHeader: {
    backgroundColor: NAV,
    paddingTop: (StatusBar.currentHeight ?? 0) + 8,
    paddingBottom: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mobileTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  mobileHeaderRight: {
    flexDirection: 'row',
    gap: 4,
  },
  mobileNavBtn: {
    padding: 8,
    borderRadius: 8,
  },
  mobileNavBtnActive: {
    backgroundColor: 'rgba(208,32,16,0.25)',
  },
  mobileNavIcon: {
    fontSize: 18,
  },
});
