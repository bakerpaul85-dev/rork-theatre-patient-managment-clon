import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, TextInput,
} from 'react-native';
import {
  BarChart2, Users, FileText,
  RefreshCw, Cloud, CloudOff,
  ChevronDown, ChevronUp, AlertCircle,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCloudSync, FirebaseConfig } from '@/contexts/CloudSyncContext';
import { useForms } from '@/contexts/FormsContext';

const USERS_STORAGE_KEY = '@theatre_users';

export default function ManagerPortalScreen() {
  const { isConfigured, isSyncing, lastSynced, firebaseConfig, saveConfig, clearConfig, fetchAllFormsFromCloud, fetchAllUsersFromCloud, isAdmin } = useCloudSync();
  const { forms: localForms } = useForms();
  const router = useRouter();

  const [tab, setTab] = useState<'overview' | 'forms' | 'users' | 'settings'>('overview');
  const [cloudForms, setCloudForms] = useState<any[]>([]);
  const [cloudUsers, setCloudUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showConfig, setShowConfig] = useState(!isConfigured);
  const [configInput, setConfigInput] = useState(firebaseConfig ? JSON.stringify(firebaseConfig, null, 2) : '');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'submitted'>('all');
  const [filterType, setFilterType] = useState<'all' | 'medical-aid' | 'coida'>('all');
  const [expandedForm, setExpandedForm] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!isConfigured) return;
    setLoading(true);
    try {
      const [forms, users] = await Promise.all([
        fetchAllFormsFromCloud(),
        fetchAllUsersFromCloud(),
      ]);
      setCloudForms(forms);
      setCloudUsers(users);
    } catch (e) {
      Alert.alert('Error', 'Could not load data from cloud. Check your Firebase config and Firestore rules.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isConfigured, fetchAllFormsFromCloud, fetchAllUsersFromCloud]);

  const handleSaveConfig = async () => {
    try {
      const cfg = JSON.parse(configInput.trim()) as FirebaseConfig;
      if (!cfg.apiKey || !cfg.projectId) {
        Alert.alert('Invalid config', 'Config must include apiKey and projectId');
        return;
      }
      await saveConfig(cfg);
      setShowConfig(false);
      Alert.alert('Connected', 'Firebase connected! Loading data...', [{ text: 'OK', onPress: loadData }]);
    } catch {
      Alert.alert('Invalid JSON', 'Please paste a valid Firebase config object.');
    }
  };

  const handleDisconnect = () => {
    Alert.alert('Disconnect Firebase', 'Remove Firebase config? Local data will not be affected.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: async () => { await clearConfig(); setCloudForms([]); setCloudUsers([]); } },
    ]);
  };

  const onRefresh = () => { setRefreshing(true); void loadData(); };

  React.useEffect(() => { if (isConfigured) void loadData(); }, [isConfigured]);

  const allForms = cloudForms.length > 0 ? cloudForms : localForms;
  const filteredForms = allForms.filter(f => {
    if (filterStatus !== 'all' && f.status !== filterStatus) return false;
    if (filterType !== 'all' && f.formType !== filterType) return false;
    return true;
  });

  const stats = {
    total: allForms.length,
    submitted: allForms.filter(f => f.status === 'submitted').length,
    drafts: allForms.filter(f => f.status === 'draft').length,
    medAid: allForms.filter(f => f.formType === 'medical-aid').length,
    coida: allForms.filter(f => f.formType === 'coida').length,
    today: allForms.filter(f => {
      const d = f.updatedAt?.toDate ? f.updatedAt.toDate() : f.updatedAt ? new Date(f.updatedAt) : null;
      if (!d) return false;
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length,
  };

  const radCount: Record<string, number> = {};
  allForms.forEach(f => { if (f.radiographerName) radCount[f.radiographerName] = (radCount[f.radiographerName] || 0) + 1; });
  const topRads = Object.entries(radCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (!isAdmin) {
    return (
      <View style={s.centered}>
        <AlertCircle size={52} color="#CED4DA" />
        <Text style={s.noAccessTitle}>Access Restricted</Text>
        <Text style={s.noAccessText}>The Manager Portal is only available to admin accounts.</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Tab bar */}
      <View style={s.tabBar}>
        {(['overview', 'forms', 'users', 'settings'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Open Portal Button */}
      <TouchableOpacity style={s.portalBtn} onPress={() => router.push('/portal' as never)} activeOpacity={0.7}>
        <BarChart2 size={16} color="#FFF" />
        <Text style={s.portalBtnTxt}>Open Data Portal</Text>
      </TouchableOpacity>

      {/* Cloud status bar */}
      <View style={s.statusBar}>
        {isConfigured
          ? <><Cloud size={14} color="#1D9E75" /><Text style={[s.statusTxt, { color: '#1D9E75' }]}>Firebase connected{lastSynced ? ` · Last sync: ${new Date(lastSynced).toLocaleTimeString()}` : ''}</Text></>
          : <><CloudOff size={14} color="#FF9500" /><Text style={[s.statusTxt, { color: '#FF9500' }]}>Not connected — tap Settings to configure Firebase</Text></>
        }
        {isSyncing && <ActivityIndicator size="small" color="#0066CC" style={{ marginLeft: 8 }} />}
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0066CC" />}
      >
        {/* OVERVIEW */}
        {tab === 'overview' && (
          <>
            <Text style={s.sectionLabel}>Summary {cloudForms.length > 0 ? '(Cloud)' : '(Local)'}</Text>
            <View style={s.statsGrid}>
              {[
                { label: 'Total forms', value: stats.total, color: '#0066CC', bg: '#E8F0FE' },
                { label: 'Submitted', value: stats.submitted, color: '#1D9E75', bg: '#E1F5EE' },
                { label: 'Drafts', value: stats.drafts, color: '#FF9500', bg: '#FFF3E0' },
                { label: 'Today', value: stats.today, color: '#0066CC', bg: '#F0F4FF' },
                { label: 'Medical Aid', value: stats.medAid, color: '#0066CC', bg: '#E8F0FE' },
                { label: 'COIDA', value: stats.coida, color: '#00A3A3', bg: '#E7F9F9' },
              ].map(item => (
                <View key={item.label} style={[s.statCard, { backgroundColor: item.bg }]}>
                  <Text style={[s.statVal, { color: item.color }]}>{item.value}</Text>
                  <Text style={s.statLbl}>{item.label}</Text>
                </View>
              ))}
            </View>

            {loading && <ActivityIndicator color="#0066CC" style={{ marginVertical: 20 }} />}

            <Text style={s.sectionLabel}>Top radiographers</Text>
            <View style={s.card}>
              {topRads.length === 0
                ? <Text style={s.emptyTxt}>No data yet</Text>
                : topRads.map(([name, count], i) => (
                  <View key={name} style={[s.rankRow, i < topRads.length - 1 && s.rankBorder]}>
                    <View style={s.rankNum}><Text style={s.rankNumTxt}>{i + 1}</Text></View>
                    <Text style={s.rankName} numberOfLines={1}>{name}</Text>
                    <View style={s.rankBadge}><Text style={s.rankBadgeTxt}>{count} form{count !== 1 ? 's' : ''}</Text></View>
                  </View>
                ))
              }
            </View>

            <Text style={s.sectionLabel}>Recent activity</Text>
            <View style={s.card}>
              {allForms.slice(0, 10).map((f, i) => {
                const name = [f.patientTitle, f.patientFirstName, f.patientLastName].filter(Boolean).join(' ') || 'Unknown';
                const dt = f.updatedAt?.toDate ? f.updatedAt.toDate().toLocaleDateString() : f.updatedAt ? new Date(f.updatedAt).toLocaleDateString() : '';
                return (
                  <View key={f.id ?? i} style={[s.recentRow, i < 9 && s.rankBorder]}>
                    <View style={[s.dot, { backgroundColor: f.formType === 'coida' ? '#00A3A3' : '#0066CC' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.recentName} numberOfLines={1}>{name}</Text>
                      <Text style={s.recentMeta}>{f.userEmail ?? f.submittedBy ?? ''} · {dt}</Text>
                    </View>
                    <View style={[s.statusPill, { backgroundColor: f.status === 'submitted' ? '#E1F5EE' : '#FFF3E0' }]}>
                      <Text style={[s.statusPillTxt, { color: f.status === 'submitted' ? '#1D9E75' : '#FF9500' }]}>{f.status}</Text>
                    </View>
                  </View>
                );
              })}
              {allForms.length === 0 && <Text style={s.emptyTxt}>No forms yet</Text>}
            </View>
          </>
        )}

        {/* FORMS */}
        {tab === 'forms' && (
          <>
            <View style={s.filterRow}>
              {(['all', 'submitted', 'draft'] as const).map(v => (
                <TouchableOpacity key={v} style={[s.filterBtn, filterStatus === v && s.filterBtnActive]} onPress={() => setFilterStatus(v)}>
                  <Text style={[s.filterTxt, filterStatus === v && s.filterTxtActive]}>{v === 'all' ? 'All' : v.charAt(0).toUpperCase() + v.slice(1)}</Text>
                </TouchableOpacity>
              ))}
              <View style={{ width: 1, backgroundColor: '#E5E5EA', marginHorizontal: 4 }} />
              {(['all', 'medical-aid', 'coida'] as const).map(v => (
                <TouchableOpacity key={v} style={[s.filterBtn, filterType === v && s.filterBtnActive]} onPress={() => setFilterType(v)}>
                  <Text style={[s.filterTxt, filterType === v && s.filterTxtActive]}>{v === 'all' ? 'All types' : v === 'medical-aid' ? 'Med Aid' : 'COIDA'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.countTxt}>{filteredForms.length} form{filteredForms.length !== 1 ? 's' : ''}</Text>
            {loading && <ActivityIndicator color="#0066CC" style={{ marginBottom: 16 }} />}
            {filteredForms.map(f => {
              const name = [f.patientTitle, f.patientFirstName, f.patientLastName].filter(Boolean).join(' ') || 'Unnamed';
              const dt = f.updatedAt?.toDate ? f.updatedAt.toDate().toLocaleString() : f.updatedAt ? new Date(f.updatedAt).toLocaleString() : '';
              const isCoida = f.formType === 'coida';
              const expanded = expandedForm === f.id;
              return (
                <View key={f.id} style={s.formCard}>
                  <TouchableOpacity style={s.formCardHeader} onPress={() => setExpandedForm(expanded ? null : f.id)} activeOpacity={0.7}>
                    <View style={[s.formIcon, { backgroundColor: isCoida ? '#E7F9F9' : '#E8F0FE' }]}>
                      <FileText size={18} color={isCoida ? '#00A3A3' : '#0066CC'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.formName}>{name}</Text>
                      <Text style={s.formMeta} numberOfLines={1}>{f.userEmail ?? f.submittedBy ?? ''} · {dt}</Text>
                      <View style={s.formBadgeRow}>
                        <View style={[s.pill, { backgroundColor: isCoida ? '#E7F9F9' : '#E8F0FE' }]}>
                          <Text style={[s.pillTxt, { color: isCoida ? '#00A3A3' : '#0066CC' }]}>{isCoida ? 'COIDA' : 'Med Aid'}</Text>
                        </View>
                        <View style={[s.pill, { backgroundColor: f.status === 'submitted' ? '#E1F5EE' : '#FFF3E0' }]}>
                          <Text style={[s.pillTxt, { color: f.status === 'submitted' ? '#1D9E75' : '#FF9500' }]}>{f.status}</Text>
                        </View>
                      </View>
                    </View>
                    {expanded ? <ChevronUp size={18} color="#8E8E93" /> : <ChevronDown size={18} color="#8E8E93" />}
                  </TouchableOpacity>
                  {expanded && (
                    <View style={s.formDetails}>
                      {[
                        ['ID Number', f.idNumber],
                        ['Procedure', f.procedure],
                        isCoida ? ['Employer', f.employerName] : ['Medical Aid', f.medicalAidName],
                        ['Radiographer', f.radiographerName],
                        ['Contact', f.contactNumber],
                        ['Email', f.email],
                      ].map(([label, value]) => value ? (
                        <View key={label} style={s.detailRow}>
                          <Text style={s.detailLabel}>{label}</Text>
                          <Text style={s.detailValue} numberOfLines={2}>{value}</Text>
                        </View>
                      ) : null)}
                    </View>
                  )}
                </View>
              );
            })}
            {filteredForms.length === 0 && !loading && <Text style={s.emptyTxt}>No forms match the selected filters</Text>}
          </>
        )}

        {/* USERS */}
        {tab === 'users' && (
          <>
            <Text style={s.countTxt}>{cloudUsers.length > 0 ? cloudUsers.length : '—'} cloud users · {localForms.length} local forms</Text>
            {loading && <ActivityIndicator color="#0066CC" style={{ marginBottom: 16 }} />}
            {cloudUsers.length === 0 && !loading && (
              <View style={s.emptyBox}>
                <Users size={48} color="#CED4DA" />
                <Text style={s.emptyTitle}>No cloud users</Text>
                <Text style={s.emptyText}>Users who register via Firebase Auth will appear here once they're stored in Firestore.</Text>
              </View>
            )}
            {cloudUsers.map((u, i) => {
              const initials = (u.name || u.email || '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
              const userForms = allForms.filter(f => f.userEmail === u.email || f.uid === u.uid);
              return (
                <View key={u.id ?? i} style={s.userCard}>
                  <View style={s.userAvatar}><Text style={s.userAvatarTxt}>{initials}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.userName}>{u.name || 'Unnamed'}</Text>
                    <Text style={s.userEmail}>{u.email}</Text>
                    <Text style={s.userMeta}>{userForms.length} form{userForms.length !== 1 ? 's' : ''} · Role: {u.role || 'user'}</Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && (
          <>
            <Text style={s.sectionLabel}>Firebase configuration</Text>
            <View style={s.card}>
              {isConfigured
                ? <>
                  <View style={s.connectedRow}>
                    <Cloud size={20} color="#1D9E75" />
                    <View style={{ flex: 1 }}>
                      <Text style={s.connectedTitle}>Connected to Firebase</Text>
                      <Text style={s.connectedSub}>Project: {firebaseConfig?.projectId}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={s.refreshBtn} onPress={loadData}>
                    <RefreshCw size={16} color="#0066CC" />
                    <Text style={s.refreshBtnTxt}>Refresh data from cloud</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.disconnectBtn} onPress={handleDisconnect}>
                    <CloudOff size={16} color="#FF3B30" />
                    <Text style={s.disconnectBtnTxt}>Disconnect Firebase</Text>
                  </TouchableOpacity>
                </>
                : <>
                  <Text style={s.configHelp}>Paste your Firebase web app config below to connect the Manager Portal to your cloud database.</Text>
                  <View style={s.configSteps}>
                    <Text style={s.configStep}>1. Go to console.firebase.google.com</Text>
                    <Text style={s.configStep}>2. Project Settings → Your apps → Web app</Text>
                    <Text style={s.configStep}>3. Copy the firebaseConfig object</Text>
                    <Text style={s.configStep}>4. Paste it below and tap Connect</Text>
                  </View>
                  <TextInput
                    style={s.configInput}
                    value={configInput}
                    onChangeText={setConfigInput}
                    placeholder={'{\n  "apiKey": "AIza...",\n  "authDomain": "...",\n  "projectId": "...",\n  ....\n}'}
                    placeholderTextColor="#ADB5BD"
                    multiline
                    numberOfLines={8}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity style={s.connectBtn} onPress={handleSaveConfig}>
                    <Cloud size={16} color="#FFF" />
                    <Text style={s.connectBtnTxt}>Connect to Firebase</Text>
                  </TouchableOpacity>
                </>
              }
            </View>

            <Text style={s.sectionLabel}>Firestore security rules</Text>
            <View style={s.card}>
              <Text style={s.configHelp}>Paste these rules in Firebase Console → Firestore → Rules:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <Text style={s.rulesCode}>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.auth.uid == userId;
    }
    match /forms/{formId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null
        && resource.data.uid == request.auth.uid;
    }
  }
}`}</Text>
              </ScrollView>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 },
  noAccessTitle: { fontSize: 20, fontWeight: '700', color: '#495057' },
  noAccessText: { fontSize: 14, color: '#6C757D', textAlign: 'center', lineHeight: 20 },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#0066CC' },
  tabTxt: { fontSize: 13, color: '#8E8E93', fontWeight: '500' },
  tabTxtActive: { color: '#0066CC', fontWeight: '700' },
  statusBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  statusTxt: { fontSize: 12, fontWeight: '500' },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10, marginTop: 6 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  statCard: { borderRadius: 12, padding: 14, minWidth: '30%', flex: 1 },
  statVal: { fontSize: 28, fontWeight: '700', marginBottom: 2 },
  statLbl: { fontSize: 12, color: '#6C757D' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: '#E1E4E8', overflow: 'hidden' },
  rankRow: { flexDirection: 'row', alignItems: 'center', padding: 13, gap: 10 },
  rankBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rankNum: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#E7F9F9', alignItems: 'center', justifyContent: 'center' },
  rankNumTxt: { fontSize: 13, fontWeight: '700', color: '#00A3A3' },
  rankName: { flex: 1, fontSize: 14, color: '#212529' },
  rankBadge: { backgroundColor: '#E7F9F9', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7 },
  rankBadgeTxt: { fontSize: 12, fontWeight: '600', color: '#00A3A3' },
  recentRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  recentName: { fontSize: 14, fontWeight: '500', color: '#212529', marginBottom: 1 },
  recentMeta: { fontSize: 12, color: '#6C757D' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  statusPillTxt: { fontSize: 11, fontWeight: '600' },
  emptyTxt: { fontSize: 14, color: '#6C757D', textAlign: 'center', padding: 24 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5EA' },
  filterBtnActive: { backgroundColor: '#0066CC', borderColor: '#0066CC' },
  filterTxt: { fontSize: 12, color: '#6C757D', fontWeight: '500' },
  filterTxtActive: { color: '#FFF', fontWeight: '700' },
  countTxt: { fontSize: 13, color: '#6C757D', marginBottom: 10, fontWeight: '500' },
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 13, marginBottom: 10, borderWidth: 1, borderColor: '#E1E4E8', overflow: 'hidden' },
  formCardHeader: { flexDirection: 'row', alignItems: 'center', padding: 13, gap: 11 },
  formIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  formName: { fontSize: 14, fontWeight: '600', color: '#212529', marginBottom: 2 },
  formMeta: { fontSize: 11, color: '#6C757D', marginBottom: 5 },
  formBadgeRow: { flexDirection: 'row', gap: 5 },
  pill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  pillTxt: { fontSize: 11, fontWeight: '600' },
  formDetails: { borderTopWidth: 1, borderTopColor: '#F0F0F0', padding: 13, gap: 8, backgroundColor: '#F8F9FA' },
  detailRow: { flexDirection: 'row', gap: 8 },
  detailLabel: { fontSize: 12, color: '#8E8E93', width: 90, fontWeight: '500' },
  detailValue: { fontSize: 12, color: '#212529', flex: 1 },
  emptyBox: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#495057' },
  emptyText: { fontSize: 14, color: '#6C757D', textAlign: 'center', lineHeight: 20 },
  userCard: { backgroundColor: '#FFFFFF', borderRadius: 13, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E1E4E8' },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8F0FE', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  userAvatarTxt: { fontSize: 15, fontWeight: '700', color: '#0066CC' },
  userName: { fontSize: 15, fontWeight: '600', color: '#212529', marginBottom: 1 },
  userEmail: { fontSize: 13, color: '#0066CC', marginBottom: 2 },
  userMeta: { fontSize: 12, color: '#8E8E93' },
  connectedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  connectedTitle: { fontSize: 15, fontWeight: '600', color: '#1D9E75' },
  connectedSub: { fontSize: 12, color: '#6C757D' },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  refreshBtnTxt: { fontSize: 15, color: '#0066CC', fontWeight: '500' },
  disconnectBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  disconnectBtnTxt: { fontSize: 15, color: '#FF3B30', fontWeight: '500' },
  configHelp: { fontSize: 13, color: '#6C757D', lineHeight: 20, padding: 14, paddingBottom: 8 },
  configSteps: { paddingHorizontal: 14, paddingBottom: 14, gap: 4 },
  configStep: { fontSize: 13, color: '#6C757D', lineHeight: 20 },
  configInput: { margin: 14, marginTop: 0, backgroundColor: '#F8F9FA', borderRadius: 10, padding: 12, fontSize: 12, fontFamily: 'monospace', color: '#212529', minHeight: 160, textAlignVertical: 'top', borderWidth: 1, borderColor: '#E1E4E8' },
  connectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 14, marginTop: 0, backgroundColor: '#0066CC', paddingVertical: 14, borderRadius: 12 },
  connectBtnTxt: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  rulesCode: { fontFamily: 'monospace', fontSize: 12, color: '#212529', padding: 14, lineHeight: 20 },
  portalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 12, backgroundColor: '#0A84FF', paddingVertical: 13, borderRadius: 12 },
  portalBtnTxt: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});
