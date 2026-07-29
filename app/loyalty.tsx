import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '@/lib/store/app-store';
import { trpc } from '@/lib/trpc';

const TIER_CFG = {
  bronze: { label:'Bronze', emoji:'🥉', grad:['#F0C000','#B8860B'] as [string,string] },
  silver: { label:'Silver', emoji:'🥈', grad:['#A8A9AD','#6B6B6B'] as [string,string] },
  gold: { label:'Gold', emoji:'🥇', grad:['#F39C12','#E67E22'] as [string,string] },
  platinum: { label:'Platinum', emoji:'💎', grad:['#8E44AD','#6C3483'] as [string,string] },
};
const TIERS = ['bronze','silver','gold','platinum'] as const;
const THRESHOLDS: Record<string,number> = { bronze:0, silver:1000, gold:5000, platinum:10000 };
const BENEFITS: Record<string,string[]> = {
  bronze:['5% discount on orders','Birthday bonus points','Early access to promotions'],
  silver:['8% discount on orders','Free delivery on orders above ₦5,000','Priority support'],
  gold:['12% discount on orders','Free delivery on all orders','Monthly surprise gift'],
  platinum:['15% discount on orders','Free delivery always','Dedicated account manager','VIP event invites'],
};

export default function LoyaltyScreen() {
  const { state } = useAppStore();
  const { data: account, isLoading } = trpc.loyalty.account.useQuery(undefined, { enabled: state.isAuthenticated && !state.isGuest });
  const { data: txs = [] } = trpc.loyalty.transactions.useQuery({ limit: 20 }, { enabled: state.isAuthenticated && !state.isGuest });

  if (!state.isAuthenticated || state.isGuest) return (
    <View style={s.guest}><Text style={s.guestEmoji}>⭐</Text><Text style={s.guestTitle}>Sign in to view loyalty rewards</Text>
      <TouchableOpacity style={s.signIn} onPress={() => router.push('/auth/login' as never)}><Text style={s.signInText}>Sign In</Text></TouchableOpacity>
    </View>
  );
  if (isLoading) return <View style={s.center}><ActivityIndicator size="large" color="#D02010" /></View>;
  if (!account) return <View style={s.center}><Text style={s.empty}>No loyalty account found.</Text></View>;

  const tier = TIER_CFG[account.tier as keyof typeof TIER_CFG] ?? TIER_CFG.bronze;
  const idx = TIERS.indexOf(account.tier as any);
  const nextTier = idx < TIERS.length - 1 ? TIER_CFG[TIERS[idx + 1]] : null;
  const nextThreshold = nextTier ? THRESHOLDS[TIERS[idx + 1]] : account.totalPointsEarned;
  const toNext = Math.max(0, nextThreshold - account.totalPointsEarned);
  const benefits = BENEFITS[account.tier] ?? BENEFITS.bronze;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>← Back</Text></TouchableOpacity>
        <Text style={s.title}>Loyalty Rewards</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={tier.grad} style={s.hero} start={{x:0,y:0}} end={{x:1,y:1}}>
          <Text style={s.tierEmoji}>{tier.emoji}</Text>
          <Text style={s.tierLabel}>{tier.label} Member</Text>
          <Text style={s.pts}>{account.points.toLocaleString()}</Text>
          <Text style={s.ptsLabel}>Available Points</Text>
          {nextTier && (
            <View style={s.prog}><View style={s.progBar}><View style={[s.progFill,{width:`${Math.min(100,(account.totalPointsEarned/nextThreshold)*100)}%` as any}]} /></View>
              <Text style={s.progText}>{toNext.toLocaleString()} pts to {nextTier.emoji} {nextTier.label}</Text></View>
          )}
        </LinearGradient>
        <View style={s.statsRow}>
          {[['Total Earned', account.totalPointsEarned],['Redeemed', account.totalPointsRedeemed],['Balance', account.points]].map(([l,v]) => (
            <View key={String(l)} style={s.stat}><Text style={s.statVal}>{Number(v).toLocaleString()}</Text><Text style={s.statLabel}>{l}</Text></View>
          ))}
        </View>
        <View style={s.section}>
          <Text style={s.secTitle}>{tier.emoji} {tier.label} Benefits</Text>
          {benefits.map((b,i) => <View key={i} style={s.benRow}><Text style={s.benDot}>•</Text><Text style={s.benText}>{b}</Text></View>)}
        </View>
        <View style={s.section}>
          <Text style={s.secTitle}>How to Earn Points</Text>
          {[['🛒','₦100 spent = 10 points'],['🎂','Birthday bonus: 500 points'],['👥','Refer a friend: 200 points'],['⭐','Leave a review: 50 points']].map(([ic,t]) => (
            <View key={t} style={s.earnRow}><Text style={s.earnIc}>{ic}</Text><Text style={s.earnTxt}>{t}</Text></View>
          ))}
        </View>
        {txs.length > 0 && (
          <View style={s.section}>
            <Text style={s.secTitle}>Recent Activity</Text>
            {(txs as any[]).map((tx: any) => (
              <View key={tx.id} style={s.txRow}>
                <View style={s.txLeft}><Text style={s.txIc}>{tx.type==='earned'?'⬆️':'⬇️'}</Text>
                  <View><Text style={s.txDesc}>{tx.description}</Text><Text style={s.txDate}>{new Date(tx.createdAt).toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'})}</Text></View>
                </View>
                <Text style={[s.txPts, tx.type==='earned'?s.txEarned:s.txRed]}>{tx.type==='earned'?'+':'-'}{tx.points}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={{height:32}} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F8F7FF'}, center:{flex:1,alignItems:'center',justifyContent:'center'}, empty:{fontSize:16,color:'#6B6490'},
  header:{paddingTop:56,paddingHorizontal:20,paddingBottom:16,backgroundColor:'#FFF',borderBottomWidth:1,borderBottomColor:'#E8E6F4'},
  back:{color:'#D02010',fontSize:16,fontWeight:'600',marginBottom:8}, title:{fontSize:26,fontWeight:'800',color:'#201060'},
  hero:{margin:16,borderRadius:20,padding:24,alignItems:'center',gap:4},
  tierEmoji:{fontSize:40}, tierLabel:{color:'#FFF',fontSize:16,fontWeight:'700',opacity:0.9},
  pts:{color:'#FFF',fontSize:48,fontWeight:'900',marginTop:8}, ptsLabel:{color:'#FFF',fontSize:14,opacity:0.8},
  prog:{width:'100%',marginTop:12,gap:6}, progBar:{height:8,backgroundColor:'rgba(255,255,255,0.3)',borderRadius:4,overflow:'hidden'},
  progFill:{height:'100%',backgroundColor:'#FFF',borderRadius:4}, progText:{color:'#FFF',fontSize:12,textAlign:'center',opacity:0.9},
  statsRow:{flexDirection:'row',gap:12,marginHorizontal:16,marginBottom:4},
  stat:{flex:1,backgroundColor:'#FFF',borderRadius:12,padding:14,alignItems:'center',borderWidth:1,borderColor:'#E8E6F4'},
  statVal:{fontSize:18,fontWeight:'800',color:'#201060'}, statLabel:{fontSize:11,color:'#9BA1A6',marginTop:2},
  section:{backgroundColor:'#FFF',margin:16,marginTop:12,borderRadius:14,padding:16,borderWidth:1,borderColor:'#E8E6F4'},
  secTitle:{fontSize:16,fontWeight:'800',color:'#201060',marginBottom:12},
  benRow:{flexDirection:'row',gap:8,paddingVertical:4}, benDot:{color:'#D02010',fontSize:16}, benText:{fontSize:14,color:'#201060',flex:1},
  earnRow:{flexDirection:'row',gap:10,paddingVertical:6,alignItems:'center'}, earnIc:{fontSize:20}, earnTxt:{fontSize:14,color:'#201060'},
  txRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#F4F3FB'},
  txLeft:{flexDirection:'row',gap:10,alignItems:'center',flex:1}, txIc:{fontSize:20},
  txDesc:{fontSize:13,color:'#201060',fontWeight:'600'}, txDate:{fontSize:11,color:'#9BA1A6',marginTop:2},
  txPts:{fontSize:16,fontWeight:'800'}, txEarned:{color:'#22C55E'}, txRed:{color:'#D02010'},
  guest:{flex:1,alignItems:'center',justifyContent:'center',gap:16,padding:32},
  guestEmoji:{fontSize:56}, guestTitle:{fontSize:18,fontWeight:'700',color:'#201060',textAlign:'center'},
  signIn:{backgroundColor:'#D02010',borderRadius:12,paddingHorizontal:32,paddingVertical:14},
  signInText:{color:'#FFF',fontSize:16,fontWeight:'700'},
});
