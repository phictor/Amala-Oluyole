import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from '@/lib/store/app-store';
import { trpc } from '@/lib/trpc';

const LABELS = ['Home','Work','Other'];

export default function AddressesScreen() {
  const { state } = useAppStore();
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('Home');
  const [fullAddress, setFullAddress] = useState('');
  const [landmark, setLandmark] = useState('');

  const { data: addresses = [], isLoading } = trpc.addresses.list.useQuery(undefined, { enabled: state.isAuthenticated && !state.isGuest });
  const create = trpc.addresses.create.useMutation({
    onSuccess: () => { utils.addresses.list.invalidate(); setShowForm(false); setFullAddress(''); setLandmark(''); },
    onError: (e) => Alert.alert('Error', e.message),
  });
  const del = trpc.addresses.delete.useMutation({ onSuccess: () => utils.addresses.list.invalidate(), onError: (e) => Alert.alert('Error', e.message) });

  const handleAdd = () => {
    if (!fullAddress.trim()) { Alert.alert('Error', 'Please enter a full address.'); return; }
    create.mutate({ label, fullAddress: fullAddress.trim(), landmark: landmark.trim() || undefined });
  };
  const handleDelete = (id: number) => Alert.alert('Delete Address','Remove this address?',[
    {text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>del.mutate({id})},
  ]);

  if (!state.isAuthenticated || state.isGuest) return (
    <View style={s.guest}><Text style={s.guestEmoji}>📍</Text><Text style={s.guestTitle}>Sign in to manage addresses</Text>
      <TouchableOpacity style={s.signIn} onPress={() => router.push('/auth/login' as never)}><Text style={s.signInTxt}>Sign In</Text></TouchableOpacity>
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>← Back</Text></TouchableOpacity>
        <Text style={s.title}>Saved Addresses</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowForm(!showForm)}>
          <Text style={s.addBtnTxt}>{showForm ? 'Cancel' : '+ Add'}</Text>
        </TouchableOpacity>
      </View>
      {showForm && (
        <View style={s.form}>
          <Text style={s.formLabel}>Label</Text>
          <View style={s.labelRow}>
            {LABELS.map(l => (
              <TouchableOpacity key={l} style={[s.chip, label===l && s.chipActive]} onPress={() => setLabel(l)}>
                <Text style={[s.chipTxt, label===l && s.chipTxtActive]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.formLabel}>Full Address *</Text>
          <TextInput style={s.input} placeholder="e.g. 12 Oluyole Estate Road, Ibadan" placeholderTextColor="#8B88B0" value={fullAddress} onChangeText={setFullAddress} multiline />
          <Text style={s.formLabel}>Landmark (optional)</Text>
          <TextInput style={s.input} placeholder="e.g. Near Shoprite" placeholderTextColor="#8B88B0" value={landmark} onChangeText={setLandmark} />
          <TouchableOpacity style={[s.saveBtn, create.isPending && s.saveBtnDis]} onPress={handleAdd} disabled={create.isPending}>
            <Text style={s.saveBtnTxt}>{create.isPending ? 'Saving...' : 'Save Address'}</Text>
          </TouchableOpacity>
        </View>
      )}
      {isLoading ? <View style={s.center}><ActivityIndicator size="large" color="#D02010" /></View> : (
        <FlatList data={addresses} keyExtractor={(item: any) => String(item.id)} contentContainerStyle={s.list} showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={s.empty}><Text style={s.emptyEmoji}>📍</Text><Text style={s.emptyTitle}>No saved addresses</Text><Text style={s.emptySub}>Add an address for faster checkout</Text></View>}
          renderItem={({ item }: { item: any }) => (
            <View style={s.card}>
              <View style={s.cardLeft}>
                <View style={s.iconBox}><Text style={s.iconTxt}>{item.label==='Home'?'🏠':item.label==='Work'?'🏢':'📍'}</Text></View>
                <View style={s.info}>
                  <Text style={s.addrLabel}>{item.label}</Text>
                  <Text style={s.addrStreet}>{item.fullAddress}</Text>
                  {item.landmark && <Text style={s.addrLandmark}>Near {item.landmark}</Text>}
                </View>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={s.delBtn}><Text style={s.delIc}>🗑️</Text></TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F8F7FF'}, center:{flex:1,alignItems:'center',justifyContent:'center'},
  header:{paddingTop:56,paddingHorizontal:20,paddingBottom:16,backgroundColor:'#FFF',borderBottomWidth:1,borderBottomColor:'#E8E6F4',flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between'},
  back:{color:'#D02010',fontSize:16,fontWeight:'600'}, title:{fontSize:22,fontWeight:'800',color:'#201060'},
  addBtn:{backgroundColor:'#D02010',borderRadius:10,paddingHorizontal:14,paddingVertical:8}, addBtnTxt:{color:'#FFF',fontSize:14,fontWeight:'700'},
  form:{backgroundColor:'#FFF',margin:16,borderRadius:14,padding:16,borderWidth:1,borderColor:'#E8E6F4'},
  formLabel:{fontSize:13,fontWeight:'700',color:'#201060',marginBottom:6,marginTop:10},
  labelRow:{flexDirection:'row',gap:8},
  chip:{borderWidth:1.5,borderColor:'#E8E6F4',borderRadius:8,paddingHorizontal:14,paddingVertical:8},
  chipActive:{borderColor:'#D02010',backgroundColor:'#FFF5F5'},
  chipTxt:{fontSize:14,color:'#6B6490',fontWeight:'600'}, chipTxtActive:{color:'#D02010'},
  input:{backgroundColor:'#F4F3FB',borderWidth:1.5,borderColor:'#E8E6F4',borderRadius:10,paddingHorizontal:14,paddingVertical:12,fontSize:15,color:'#201060'},
  saveBtn:{backgroundColor:'#D02010',borderRadius:12,paddingVertical:14,alignItems:'center',marginTop:12},
  saveBtnDis:{opacity:0.7}, saveBtnTxt:{color:'#FFF',fontSize:16,fontWeight:'700'},
  list:{padding:16,paddingBottom:40},
  card:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:'#FFF',borderRadius:14,padding:14,marginBottom:10,borderWidth:1,borderColor:'#E8E6F4'},
  cardLeft:{flexDirection:'row',alignItems:'center',gap:12,flex:1},
  iconBox:{width:44,height:44,borderRadius:22,backgroundColor:'#F4F3FB',alignItems:'center',justifyContent:'center'}, iconTxt:{fontSize:22},
  info:{flex:1}, addrLabel:{fontSize:15,fontWeight:'700',color:'#201060',marginBottom:2},
  addrStreet:{fontSize:13,color:'#6B6490'}, addrLandmark:{fontSize:12,color:'#8B88B0',marginTop:2},
  delBtn:{padding:8}, delIc:{fontSize:18},
  empty:{alignItems:'center',paddingTop:80,gap:8}, emptyEmoji:{fontSize:56}, emptyTitle:{fontSize:18,fontWeight:'700',color:'#201060'}, emptySub:{fontSize:14,color:'#9BA1A6'},
  guest:{flex:1,alignItems:'center',justifyContent:'center',gap:16,padding:32},
  guestEmoji:{fontSize:56}, guestTitle:{fontSize:18,fontWeight:'700',color:'#201060',textAlign:'center'},
  signIn:{backgroundColor:'#D02010',borderRadius:12,paddingHorizontal:32,paddingVertical:14}, signInTxt:{color:'#FFF',fontSize:16,fontWeight:'700'},
});
