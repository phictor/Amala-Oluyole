import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from '@/lib/store/app-store';
import { trpc } from '@/lib/trpc';

const TYPE_CFG: Record<string,{icon:string;color:string}> = {
  order_update:{icon:'🛵',color:'#D02010'}, payment:{icon:'💳',color:'#22C55E'},
  promotion:{icon:'🎁',color:'#F59E0B'}, loyalty:{icon:'⭐',color:'#F0C000'},
  reservation:{icon:'📅',color:'#0a7ea4'}, system:{icon:'🔔',color:'#6B6490'},
};

function NotifCard({ notif, onPress }: { notif: any; onPress: () => void }) {
  const cfg = TYPE_CFG[notif.type] ?? TYPE_CFG.system;
  return (
    <TouchableOpacity style={[s.card, !notif.isRead && s.cardUnread]} onPress={onPress}>
      <View style={[s.icon, { backgroundColor: cfg.color + '20' }]}><Text style={s.iconTxt}>{cfg.icon}</Text></View>
      <View style={s.content}>
        <Text style={s.title}>{notif.title}</Text>
        <Text style={s.msg} numberOfLines={2}>{notif.body}</Text>
        <Text style={s.time}>{new Date(notif.createdAt).toLocaleDateString('en-NG',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</Text>
      </View>
      {!notif.isRead && <View style={s.dot} />}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const { state } = useAppStore();
  const utils = trpc.useUtils();
  const { data: notifs = [], isLoading, refetch, isRefetching } = trpc.notifications.list.useQuery({ limit: 50 }, { enabled: state.isAuthenticated && !state.isGuest });
  const markRead = trpc.notifications.markRead.useMutation({ onSuccess: () => utils.notifications.list.invalidate() });
  const markAll = trpc.notifications.markAllRead.useMutation({ onSuccess: () => utils.notifications.list.invalidate() });
  const unread = (notifs as any[]).filter((n: any) => !n.isRead).length;

  const onPress = (n: any) => {
    if (!n.isRead) markRead.mutate({ id: n.id });
    if (n.orderId) router.push({ pathname: '/order/[id]' as never, params: { id: String(n.orderId) } });
  };

  if (!state.isAuthenticated || state.isGuest) return (
    <View style={s.guest}><Text style={s.guestEmoji}>🔔</Text><Text style={s.guestTitle}>Sign in to view notifications</Text>
      <TouchableOpacity style={s.signIn} onPress={() => router.push('/auth/login' as never)}><Text style={s.signInTxt}>Sign In</Text></TouchableOpacity>
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>← Back</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Notifications</Text>
        {unread > 0 && <TouchableOpacity onPress={() => markAll.mutate()}><Text style={s.markAll}>Mark all read</Text></TouchableOpacity>}
      </View>
      {isLoading ? <View style={s.center}><ActivityIndicator size="large" color="#D02010" /></View> : (
        <FlatList data={notifs} keyExtractor={(item: any) => String(item.id)} contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#D02010" />}
          ListEmptyComponent={<View style={s.empty}><Text style={s.emptyEmoji}>🔔</Text><Text style={s.emptyTxt}>No notifications yet</Text></View>}
          renderItem={({ item }) => <NotifCard notif={item} onPress={() => onPress(item)} />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F8F7FF'}, center:{flex:1,alignItems:'center',justifyContent:'center'},
  header:{paddingTop:56,paddingHorizontal:20,paddingBottom:16,backgroundColor:'#FFF',borderBottomWidth:1,borderBottomColor:'#E8E6F4',flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between'},
  back:{color:'#D02010',fontSize:16,fontWeight:'600'}, headerTitle:{fontSize:24,fontWeight:'800',color:'#201060'}, markAll:{color:'#D02010',fontSize:14,fontWeight:'600'},
  list:{padding:16,paddingBottom:40},
  card:{flexDirection:'row',backgroundColor:'#FFF',borderRadius:14,padding:14,marginBottom:10,borderWidth:1,borderColor:'#E8E6F4',gap:12,alignItems:'flex-start'},
  cardUnread:{borderColor:'#D02010',backgroundColor:'#FFF5F5'},
  icon:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center'}, iconTxt:{fontSize:20},
  content:{flex:1}, title:{fontSize:14,fontWeight:'700',color:'#201060',marginBottom:2},
  msg:{fontSize:13,color:'#6B6490',lineHeight:18}, time:{fontSize:11,color:'#9BA1A6',marginTop:4},
  dot:{width:8,height:8,borderRadius:4,backgroundColor:'#D02010',marginTop:4},
  empty:{alignItems:'center',paddingTop:80,gap:12}, emptyEmoji:{fontSize:56}, emptyTxt:{fontSize:18,fontWeight:'700',color:'#201060'},
  guest:{flex:1,alignItems:'center',justifyContent:'center',gap:16,padding:32},
  guestEmoji:{fontSize:56}, guestTitle:{fontSize:18,fontWeight:'700',color:'#201060',textAlign:'center'},
  signIn:{backgroundColor:'#D02010',borderRadius:12,paddingHorizontal:32,paddingVertical:14}, signInTxt:{color:'#FFF',fontSize:16,fontWeight:'700'},
});
