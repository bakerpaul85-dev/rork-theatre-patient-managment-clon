import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl, Platform,
  Dimensions, Alert, useWindowDimensions,
} from 'react-native';
import {
  Database, Users, FileText, Search, RefreshCw,
  ChevronDown, ChevronUp, Download, Clock,
  CheckCircle, AlertTriangle, Calendar,
  Mail, User, Briefcase, Hash,
  X, Eye, BarChart3, LogIn, Lock, Shield,
  Activity, TrendingUp, LogOut, ChevronRight,
} from 'lucide-react-native';
import { Stack, useRouter } from 'expo-router';
import { useCloudSync } from '@/contexts/CloudSyncContext';
import { useAuth } from '@/contexts/AuthContext';
import { FormData } from '@/contexts/FormsContext';
import { ADMIN_EMAILS } from '@/contexts/CloudSyncContext';

type TabKey = 'dashboard' | 'forms' | 'users';
type SortField = 'updatedAt' | 'patientLastName' | 'radiographerName' | 'formType';
type SortDir = 'asc' | 'desc';

interface CloudUser {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  uid?: string;
  [key: string]: any;
}

const ACCENT = '#1B6EF3';
const ACCENT_BG = '#1B6EF30D';
const SIDEBAR_W = 240;
const GREEN = '#22C55E';
const AMBER = '#F59E0B';
const RED = '#EF4444';
const TEAL = '#0D9488';
const SLATE = '#64748B';
const DARK = '#0F172A';
const CARD_BG = '#FFFFFF';
const PAGE_BG = '#F8FAFC';
const BORDER = '#E2E8F0';

export default function PortalScreen() {
  const router = useRouter();
  const { user, login } = useAuth();
  const {
    isConfigured, fetchAllFormsFromCloud, fetchAllUsersFromCloud,
    isSyncing, lastSynced,
  } = useCloudSync();

  const { width: windowWidth } = useWindowDimensions();
  const isWide = windowWidth > 860;

  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [cloudForms, setCloudForms] = useState<FormData[]>([]);
  const [cloudUsers, setCloudUsers] = useState<CloudUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'submitted'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'medical-aid' | 'coida'>('all');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedFormId, setExpandedFormId] = useState<string | null>(null);
  const [selectedFormDetail, setSelectedFormDetail] = useState<FormData | null>(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleLogin = useCallback(async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Please enter email and password');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    try {
      const success = await login(loginEmail.trim(), loginPassword);
      if (!success) {
        setLoginError('Invalid credentials. Please try again.');
      } else {
        console.log('[Portal] Login successful');
      }
    } catch (e) {
      console.error('[Portal] Login error:', e);
      setLoginError('Login failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  }, [loginEmail, loginPassword, login]);

  const loadData = useCallback(async () => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    try {
      const [forms, users] = await Promise.all([
        fetchAllFormsFromCloud(),
        fetchAllUsersFromCloud(),
      ]);
      console.log(`[Portal] Loaded ${forms.length} forms, ${users.length} users`);
      setCloudForms(forms);
      setCloudUsers(users as CloudUser[]);
    } catch (e) {
      console.error('[Portal] Load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isConfigured, fetchAllFormsFromCloud, fetchAllUsersFromCloud]);

  useEffect(() => {
    if (user && isConfigured) {
      void loadData();
    } else if (user && !isConfigured) {
      setLoading(false);
    }
  }, [user, isConfigured, loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadData();
  }, [loadData]);

  const getDateStr = useCallback((val: any): string => {
    if (!val) return '';
    if (val.toDate) return val.toDate().toISOString();
    return String(val);
  }, []);

  const filteredForms = useMemo(() => {
    let result = [...cloudForms];
    if (statusFilter !== 'all') result = result.filter(f => f.status === statusFilter);
    if (typeFilter !== 'all') result = result.filter(f => f.formType === typeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(f => {
        const name = `${f.patientFirstName ?? ''} ${f.patientLastName ?? ''}`.toLowerCase();
        const id = (f.idNumber ?? '').toLowerCase();
        const rad = (f.radiographerName ?? '').toLowerCase();
        const email = (f.email ?? '').toLowerCase();
        const proc = (f.procedure ?? '').toLowerCase();
        const submitter = ((f as any).userEmail ?? f.submittedBy ?? '').toLowerCase();
        return name.includes(q) || id.includes(q) || rad.includes(q) ||
          email.includes(q) || proc.includes(q) || submitter.includes(q);
      });
    }
    result.sort((a, b) => {
      let aVal: string;
      let bVal: string;
      switch (sortField) {
        case 'updatedAt': aVal = getDateStr(a.updatedAt); bVal = getDateStr(b.updatedAt); break;
        case 'patientLastName': aVal = (a.patientLastName ?? '').toLowerCase(); bVal = (b.patientLastName ?? '').toLowerCase(); break;
        case 'radiographerName': aVal = (a.radiographerName ?? '').toLowerCase(); bVal = (b.radiographerName ?? '').toLowerCase(); break;
        case 'formType': aVal = a.formType ?? ''; bVal = b.formType ?? ''; break;
        default: aVal = ''; bVal = '';
      }
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [cloudForms, statusFilter, typeFilter, searchQuery, sortField, sortDir, getDateStr]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    return {
      total: cloudForms.length,
      submitted: cloudForms.filter(f => f.status === 'submitted').length,
      drafts: cloudForms.filter(f => f.status === 'draft').length,
      medAid: cloudForms.filter(f => f.formType === 'medical-aid').length,
      coida: cloudForms.filter(f => f.formType === 'coida').length,
      today: cloudForms.filter(f => {
        const d = getDateStr(f.updatedAt);
        return d ? new Date(d).toDateString() === todayStr : false;
      }).length,
      thisWeek: cloudForms.filter(f => {
        const d = getDateStr(f.updatedAt);
        return d ? new Date(d) >= weekAgo : false;
      }).length,
      users: cloudUsers.length,
    };
  }, [cloudForms, cloudUsers, getDateStr]);

  const radLeaderboard = useMemo(() => {
    const counts: Record<string, number> = {};
    cloudForms.forEach(f => {
      if (f.radiographerName) counts[f.radiographerName] = (counts[f.radiographerName] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [cloudForms]);

  const recentForms = useMemo(() => {
    return [...cloudForms]
      .sort((a, b) => getDateStr(b.updatedAt).localeCompare(getDateStr(a.updatedAt)))
      .slice(0, 8);
  }, [cloudForms, getDateStr]);

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  }, [sortField]);

  const formatDate = useCallback((val: any): string => {
    if (!val) return '—';
    const d = val.toDate ? val.toDate() : new Date(val);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
  }, []);

  const formatDateTime = useCallback((val: any): string => {
    if (!val) return '—';
    const d = val.toDate ? val.toDate() : new Date(val);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }, []);

  const handleExportCSV = useCallback(() => {
    if (Platform.OS !== 'web') {
      Alert.alert('Export', 'CSV export is only available on web.');
      return;
    }
    const headers = ['ID', 'Type', 'Status', 'Patient Name', 'ID Number', 'DOB', 'Contact', 'Email', 'Medical Aid', 'Membership #', 'Procedure', 'ICD10', 'Radiographer', 'Submitted By', 'Date', 'Updated'];
    const rows = filteredForms.map(f => [
      f.id, f.formType, f.status,
      `${f.patientTitle ?? ''} ${f.patientFirstName ?? ''} ${f.patientLastName ?? ''}`.trim(),
      f.idNumber ?? '', f.dateOfBirth ?? '', f.contactNumber ?? '', f.email ?? '',
      f.medicalAidName ?? '', f.membershipNumber ?? '', f.procedure ?? '', f.icd10Code ?? '',
      f.radiographerName ?? '', (f as any).userEmail ?? f.submittedBy ?? '', f.date ?? '', getDateStr(f.updatedAt),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `theatre_forms_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredForms, getDateStr]);

  if (!user) {
    return (
      <View style={s.loginRoot}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.loginCard}>
          <View style={s.loginIconWrap}>
            <Shield size={32} color={ACCENT} />
          </View>
          <Text style={s.loginTitle}>Manager Portal</Text>
          <Text style={s.loginSubtitle}>Sign in to access the Theatre data dashboard</Text>

          {loginError ? (
            <View style={s.loginErrorBox}>
              <AlertTriangle size={14} color={RED} />
              <Text style={s.loginErrorTxt}>{loginError}</Text>
            </View>
          ) : null}

          <View style={s.loginField}>
            <Text style={s.loginLabel}>Email</Text>
            <View style={s.loginInputWrap}>
              <Mail size={16} color={SLATE} />
              <TextInput
                style={s.loginInput}
                placeholder="your@email.com"
                placeholderTextColor="#94A3B8"
                value={loginEmail}
                onChangeText={setLoginEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                testID="portal-email"
              />
            </View>
          </View>

          <View style={s.loginField}>
            <Text style={s.loginLabel}>Password</Text>
            <View style={s.loginInputWrap}>
              <Lock size={16} color={SLATE} />
              <TextInput
                style={s.loginInput}
                placeholder="Enter password"
                placeholderTextColor="#94A3B8"
                value={loginPassword}
                onChangeText={setLoginPassword}
                secureTextEntry
                testID="portal-password"
                onSubmitEditing={handleLogin}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[s.loginBtn, loginLoading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loginLoading}
            activeOpacity={0.8}
            testID="portal-login-btn"
          >
            {loginLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <LogIn size={18} color="#FFF" />
                <Text style={s.loginBtnTxt}>Sign In</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={s.loginBackLink}>
            <Text style={s.loginBackTxt}>Back to App</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!isConfigured) {
    return (
      <View style={s.loginRoot}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.loginCard}>
          <Database size={48} color="#CBD5E1" />
          <Text style={s.loginTitle}>Firebase Not Connected</Text>
          <Text style={s.loginSubtitle}>Connect Firebase in settings to use the portal.</Text>
          <TouchableOpacity style={s.loginBtn} onPress={() => router.back()}>
            <Text style={s.loginBtnTxt}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const sidebarItems: { key: TabKey; label: string; icon: typeof BarChart3 }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { key: 'forms', label: 'Forms', icon: FileText },
    { key: 'users', label: 'Users', icon: Users },
  ];

  const renderSidebar = () => (
    <View style={s.sidebar}>
      <View style={s.sidebarBrand}>
        <View style={s.sidebarLogo}>
          <Activity size={20} color="#FFF" />
        </View>
        <View>
          <Text style={s.sidebarBrandTitle}>Theatre Portal</Text>
          <Text style={s.sidebarBrandSub}>Management Dashboard</Text>
        </View>
      </View>

      <View style={s.sidebarNav}>
        {sidebarItems.map(item => {
          const active = activeTab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[s.sidebarItem, active && s.sidebarItemActive]}
              onPress={() => setActiveTab(item.key)}
              activeOpacity={0.7}
            >
              <item.icon size={18} color={active ? ACCENT : SLATE} />
              <Text style={[s.sidebarItemTxt, active && s.sidebarItemTxtActive]}>{item.label}</Text>
              {active && <View style={s.sidebarActiveIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={s.sidebarFooter}>
        <View style={s.sidebarUserInfo}>
          <View style={s.sidebarAvatar}>
            <Text style={s.sidebarAvatarTxt}>
              {(user?.name ?? user?.email ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.sidebarUserName} numberOfLines={1}>{user?.name ?? 'Manager'}</Text>
            <Text style={s.sidebarUserEmail} numberOfLines={1}>{user?.email ?? ''}</Text>
          </View>
        </View>
        {lastSynced && (
          <View style={s.sidebarSync}>
            <Clock size={10} color="#94A3B8" />
            <Text style={s.sidebarSyncTxt}>Synced {formatDateTime(lastSynced)}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderMobileHeader = () => (
    <View style={s.mobileHeader}>
      <View style={s.mobileHeaderTop}>
        <View style={s.mobileLogoSmall}>
          <Activity size={16} color="#FFF" />
        </View>
        <Text style={s.mobileHeaderTitle}>Theatre Portal</Text>
        <TouchableOpacity onPress={onRefresh} style={s.mobileRefreshBtn}>
          {isSyncing || refreshing
            ? <ActivityIndicator size="small" color={ACCENT} />
            : <RefreshCw size={18} color={ACCENT} />
          }
        </TouchableOpacity>
      </View>
      <View style={s.mobileTabBar}>
        {sidebarItems.map(item => {
          const active = activeTab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[s.mobileTab, active && s.mobileTabActive]}
              onPress={() => setActiveTab(item.key)}
            >
              <item.icon size={15} color={active ? ACCENT : SLATE} />
              <Text style={[s.mobileTabTxt, active && s.mobileTabTxtActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderStatCard = (label: string, value: number, Icon: typeof FileText, color: string, bgColor: string) => (
    <View key={label} style={s.statCard}>
      <View style={s.statCardTop}>
        <Text style={s.statCardLabel}>{label}</Text>
        <View style={[s.statCardIcon, { backgroundColor: bgColor }]}>
          <Icon size={16} color={color} />
        </View>
      </View>
      <Text style={s.statCardValue}>{value}</Text>
    </View>
  );

  const renderDashboard = () => (
    <>
      <View style={s.pageHeader}>
        <View>
          <Text style={s.pageTitle}>Dashboard</Text>
          <Text style={s.pageSubtitle}>Overview of all theatre data</Text>
        </View>
        {isWide && (
          <TouchableOpacity onPress={onRefresh} style={s.refreshBtn} activeOpacity={0.7}>
            {isSyncing || refreshing
              ? <ActivityIndicator size="small" color={ACCENT} />
              : <><RefreshCw size={15} color={ACCENT} /><Text style={s.refreshBtnTxt}>Refresh</Text></>
            }
          </TouchableOpacity>
        )}
      </View>

      <View style={s.statsGrid}>
        {renderStatCard('Total Forms', stats.total, FileText, ACCENT, '#1B6EF310')}
        {renderStatCard('Submitted', stats.submitted, CheckCircle, GREEN, '#22C55E10')}
        {renderStatCard('Drafts', stats.drafts, AlertTriangle, AMBER, '#F59E0B10')}
        {renderStatCard('Today', stats.today, Calendar, '#8B5CF6', '#8B5CF610')}
      </View>

      <View style={s.metricsRow}>
        {[
          { label: 'Medical Aid', value: stats.medAid, color: ACCENT },
          { label: 'COIDA', value: stats.coida, color: TEAL },
          { label: 'This Week', value: stats.thisWeek, color: '#8B5CF6' },
          { label: 'Cloud Users', value: stats.users, color: RED },
        ].map(m => (
          <View key={m.label} style={s.metricPill}>
            <Text style={[s.metricValue, { color: m.color }]}>{m.value}</Text>
            <Text style={s.metricLabel}>{m.label}</Text>
          </View>
        ))}
      </View>

      <View style={[s.dashboardPanels, isWide && { flexDirection: 'row' as const }]}>
        <View style={[s.panel, isWide && { flex: 1.3 }]}>
          <View style={s.panelHeader}>
            <TrendingUp size={15} color={DARK} />
            <Text style={s.panelTitle}>Top Radiographers</Text>
          </View>
          {radLeaderboard.length === 0 && <Text style={s.emptyMsg}>No data yet</Text>}
          {radLeaderboard.map(([name, count], i) => (
            <View key={name} style={[s.leaderRow, i < radLeaderboard.length - 1 && s.rowBorder]}>
              <View style={[s.leaderRank, i < 3 ? s.leaderRankTop : s.leaderRankNormal]}>
                <Text style={[s.leaderRankTxt, { color: i < 3 ? AMBER : SLATE }]}>{i + 1}</Text>
              </View>
              <Text style={s.leaderName} numberOfLines={1}>{name}</Text>
              <View style={s.leaderCount}>
                <Text style={s.leaderCountTxt}>{count}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[s.panel, isWide && { flex: 1 }]}>
          <View style={s.panelHeader}>
            <Activity size={15} color={DARK} />
            <Text style={s.panelTitle}>Recent Activity</Text>
          </View>
          {recentForms.length === 0 && <Text style={s.emptyMsg}>No forms yet</Text>}
          {recentForms.map((f, i) => {
            const pName = `${f.patientFirstName ?? ''} ${f.patientLastName ?? ''}`.trim() || 'Unknown';
            return (
              <View key={f.id ?? i} style={[s.activityRow, i < recentForms.length - 1 && s.rowBorder]}>
                <View style={[s.activityDot, { backgroundColor: f.formType === 'coida' ? TEAL : ACCENT }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.activityName} numberOfLines={1}>{pName}</Text>
                  <Text style={s.activityMeta}>{formatDate(f.updatedAt)}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: f.status === 'submitted' ? '#22C55E12' : '#F59E0B12' }]}>
                  <Text style={[s.statusBadgeTxt, { color: f.status === 'submitted' ? GREEN : AMBER }]}>
                    {f.status}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </>
  );

  const renderFormDetail = (form: FormData) => {
    const anyForm = form as any;
    const sections = [
      { title: 'Patient Information', icon: User, fields: [
        ['Name', `${form.patientTitle ?? ''} ${form.patientFirstName ?? ''} ${form.patientLastName ?? ''}`.trim()],
        ['ID Number', form.idNumber], ['Date of Birth', form.dateOfBirth],
        ['Contact', form.contactNumber], ['Email', form.email],
      ]},
      { title: 'Medical Details', icon: Briefcase, fields: [
        ['Form Type', form.formType === 'medical-aid' ? 'Medical Aid' : 'COIDA'],
        ['Procedure', form.procedure], ['ICD-10 Code', form.icd10Code],
        ['Medical Aid', form.medicalAidName], ['Membership #', form.membershipNumber],
        ['Dependant Code', form.dependantCode],
      ]},
      { title: 'Theatre Details', icon: Clock, fields: [
        ['Radiographer', form.radiographerName], ['Screening Time', form.screeningTimeText],
        ['C-Arm In', form.timeCArmTakenIn], ['C-Arm Out', form.timeCArmTakenOut],
        ['Signature Time', form.radiographerSignatureTimestamp],
        ['Signature Location', form.radiographerSignatureLocation],
      ]},
      { title: 'Submission Info', icon: CheckCircle, fields: [
        ['Status', form.status], ['Submitted By', anyForm.userEmail ?? form.submittedBy],
        ['Date', form.date], ['Created', formatDateTime(form.createdAt)],
        ['Updated', formatDateTime(form.updatedAt)], ['Cloud Synced', formatDateTime(anyForm.cloudSyncedAt)],
        ['GPS', form.submissionLatitude && form.submissionLongitude
          ? `${form.submissionLatitude.toFixed(5)}, ${form.submissionLongitude.toFixed(5)}` : undefined],
      ]},
    ];
    if (form.formType === 'coida') {
      sections.splice(2, 0, { title: 'COIDA / Employer', icon: Briefcase, fields: [
        ['Employer', anyForm.employerName], ['Employer Contact', anyForm.employerContactNumber],
        ['Employer Address', anyForm.employerAddress], ['W.Comp Number', anyForm.wCompNumber],
        ['Date of Injury', anyForm.dateOfInjury], ['Time of Injury', anyForm.timeOfInjury],
        ['Place of Accident', anyForm.placeOfAccident], ['Cause of Injury', anyForm.causeOfInjury],
        ['Nature of Injury', anyForm.natureOfInjury], ['Body Part Injured', anyForm.bodyPartInjured],
      ]});
    }
    return (
      <View style={s.detailOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setSelectedFormDetail(null)} activeOpacity={1} />
        <View style={s.detailCard}>
          <View style={s.detailHeader}>
            <Text style={s.detailTitle}>Form Details</Text>
            <TouchableOpacity onPress={() => setSelectedFormDetail(null)} style={s.detailClose}>
              <X size={18} color={SLATE} />
            </TouchableOpacity>
          </View>
          <ScrollView style={s.detailScroll} contentContainerStyle={{ paddingBottom: 30 }}>
            <View style={s.detailIdRow}>
              <Hash size={13} color="#94A3B8" />
              <Text style={s.detailId} numberOfLines={1}>{form.id}</Text>
            </View>
            {sections.map(section => {
              const validFields = section.fields.filter(([, v]) => v != null && String(v).trim() !== '');
              if (validFields.length === 0) return null;
              return (
                <View key={section.title} style={s.detailSection}>
                  <View style={s.detailSectionHeader}>
                    <section.icon size={14} color={ACCENT} />
                    <Text style={s.detailSectionTitle}>{section.title}</Text>
                  </View>
                  {validFields.map(([label, value]) => (
                    <View key={String(label)} style={s.detailField}>
                      <Text style={s.detailFieldLabel}>{String(label)}</Text>
                      <Text style={s.detailFieldValue}>{String(value)}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderForms = () => (
    <>
      <View style={s.pageHeader}>
        <View>
          <Text style={s.pageTitle}>Forms</Text>
          <Text style={s.pageSubtitle}>{filteredForms.length} of {cloudForms.length} records</Text>
        </View>
        <View style={{ flexDirection: 'row' as const, gap: 8 }}>
          {Platform.OS === 'web' && (
            <TouchableOpacity style={s.exportBtn} onPress={handleExportCSV} activeOpacity={0.7}>
              <Download size={14} color="#FFF" />
              <Text style={s.exportBtnTxt}>Export CSV</Text>
            </TouchableOpacity>
          )}
          {isWide && (
            <TouchableOpacity onPress={onRefresh} style={s.refreshBtn} activeOpacity={0.7}>
              <RefreshCw size={15} color={ACCENT} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Search size={16} color="#94A3B8" />
          <TextInput
            style={s.searchInput}
            placeholder="Search patient, ID, radiographer, email..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            testID="portal-search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}><X size={15} color="#94A3B8" /></TouchableOpacity>
          )}
        </View>
      </View>

      <View style={s.filtersRow}>
        {(['all', 'submitted', 'draft'] as const).map(v => (
          <TouchableOpacity key={v} style={[s.filterChip, statusFilter === v && s.filterChipActive]} onPress={() => setStatusFilter(v)}>
            <Text style={[s.filterChipTxt, statusFilter === v && s.filterChipTxtActive]}>
              {v === 'all' ? 'All Status' : v.charAt(0).toUpperCase() + v.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={s.filterDivider} />
        {(['all', 'medical-aid', 'coida'] as const).map(v => (
          <TouchableOpacity key={v} style={[s.filterChip, typeFilter === v && s.filterChipActive]} onPress={() => setTypeFilter(v)}>
            <Text style={[s.filterChipTxt, typeFilter === v && s.filterChipTxtActive]}>
              {v === 'all' ? 'All Types' : v === 'medical-aid' ? 'Med Aid' : 'COIDA'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.sortRow}>
        <Text style={s.resultCount}>{filteredForms.length} result{filteredForms.length !== 1 ? 's' : ''}</Text>
        <View style={s.sortGroup}>
          {([['updatedAt', 'Date'], ['patientLastName', 'Name'], ['radiographerName', 'Radiographer']] as [SortField, string][]).map(([field, label]) => (
            <TouchableOpacity key={field} style={[s.sortChip, sortField === field && s.sortChipActive]} onPress={() => toggleSort(field)}>
              <Text style={[s.sortChipTxt, sortField === field && s.sortChipTxtActive]}>{label}</Text>
              {sortField === field && (sortDir === 'desc' ? <ChevronDown size={11} color={ACCENT} /> : <ChevronUp size={11} color={ACCENT} />)}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {filteredForms.map(f => {
        const pName = `${f.patientTitle ?? ''} ${f.patientFirstName ?? ''} ${f.patientLastName ?? ''}`.trim() || 'Unnamed';
        const isCoida = f.formType === 'coida';
        const expanded = expandedFormId === f.id;
        return (
          <View key={f.id} style={s.formRow}>
            <TouchableOpacity style={s.formRowMain} onPress={() => setExpandedFormId(expanded ? null : f.id)} activeOpacity={0.7}>
              <View style={[s.formTypeTag, { backgroundColor: isCoida ? '#0D948812' : '#1B6EF310' }]}>
                <Text style={[s.formTypeTagTxt, { color: isCoida ? TEAL : ACCENT }]}>{isCoida ? 'COIDA' : 'MED AID'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.formRowName} numberOfLines={1}>{pName}</Text>
                <Text style={s.formRowSub} numberOfLines={1}>
                  {f.radiographerName ?? '—'} · {(f as any).userEmail ?? f.submittedBy ?? '—'} · {formatDate(f.updatedAt)}
                </Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: f.status === 'submitted' ? '#22C55E12' : '#F59E0B12' }]}>
                <Text style={[s.statusBadgeTxt, { color: f.status === 'submitted' ? GREEN : AMBER }]}>{f.status}</Text>
              </View>
              <TouchableOpacity style={s.viewBtn} onPress={() => setSelectedFormDetail(f)}>
                <Eye size={15} color={ACCENT} />
              </TouchableOpacity>
              {expanded ? <ChevronUp size={15} color={SLATE} /> : <ChevronDown size={15} color={SLATE} />}
            </TouchableOpacity>
            {expanded && (
              <View style={s.formRowExpanded}>
                {[
                  ['ID Number', f.idNumber], ['Procedure', f.procedure], ['ICD-10', f.icd10Code],
                  isCoida ? ['Employer', (f as any).employerName] : ['Medical Aid', f.medicalAidName],
                  ['Contact', f.contactNumber], ['Email', f.email],
                  ['Screening', f.screeningTimeText], ['C-Arm In', f.timeCArmTakenIn], ['C-Arm Out', f.timeCArmTakenOut],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <View key={String(label)} style={s.expandedDetail}>
                    <Text style={s.expandedLabel}>{String(label)}</Text>
                    <Text style={s.expandedValue}>{String(value)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
      {filteredForms.length === 0 && !loading && (
        <View style={s.emptyState}>
          <FileText size={36} color="#CBD5E1" />
          <Text style={s.emptyStateTitle}>No forms found</Text>
          <Text style={s.emptyStateMsg}>Try adjusting your search or filters</Text>
        </View>
      )}
    </>
  );

  const renderUsers = () => (
    <>
      <View style={s.pageHeader}>
        <View>
          <Text style={s.pageTitle}>Users</Text>
          <Text style={s.pageSubtitle}>{cloudUsers.length} registered user{cloudUsers.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>
      {cloudUsers.length === 0 && !loading && (
        <View style={s.emptyState}>
          <Users size={36} color="#CBD5E1" />
          <Text style={s.emptyStateTitle}>No cloud users</Text>
          <Text style={s.emptyStateMsg}>Users registered via Firebase will appear here.</Text>
        </View>
      )}
      {cloudUsers.map((u, i) => {
        const initials = ((u.name || u.email || '?') as string).split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
        const userForms = cloudForms.filter(f => (f as any).userEmail === u.email || (f as any).uid === u.uid);
        const submitted = userForms.filter(f => f.status === 'submitted').length;
        return (
          <View key={u.id ?? i} style={s.userCard}>
            <View style={s.userAvatar}>
              <Text style={s.userAvatarTxt}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.userCardName}>{u.name || 'Unnamed'}</Text>
              <View style={s.userMetaRow}>
                <Mail size={12} color="#94A3B8" />
                <Text style={s.userCardEmail}>{u.email ?? '—'}</Text>
              </View>
            </View>
            <View style={s.userStatBlock}>
              <Text style={s.userStatNum}>{userForms.length}</Text>
              <Text style={s.userStatLabel}>forms</Text>
            </View>
            <View style={s.userStatBlock}>
              <Text style={[s.userStatNum, { color: GREEN }]}>{submitted}</Text>
              <Text style={s.userStatLabel}>sent</Text>
            </View>
          </View>
        );
      })}
    </>
  );

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      {isWide && renderSidebar()}
      <View style={s.mainContent}>
        {!isWide && renderMobileHeader()}
        <ScrollView
          style={s.scrollView}
          contentContainerStyle={[s.scrollContent, isWide && { maxWidth: 960, alignSelf: 'center' as const, width: '100%' as const }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        >
          {loading ? (
            <View style={s.loaderBox}>
              <ActivityIndicator size="large" color={ACCENT} />
              <Text style={s.loaderTxt}>Loading cloud data...</Text>
            </View>
          ) : (
            <>
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'forms' && renderForms()}
              {activeTab === 'users' && renderUsers()}
            </>
          )}
        </ScrollView>
      </View>
      {selectedFormDetail && renderFormDetail(selectedFormDetail)}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: PAGE_BG },
  mainContent: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },

  sidebar: { width: SIDEBAR_W, backgroundColor: '#FFFFFF', borderRightWidth: 1, borderRightColor: BORDER },
  sidebarBrand: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: BORDER },
  sidebarLogo: { width: 36, height: 36, borderRadius: 10, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  sidebarBrandTitle: { fontSize: 15, fontWeight: '700' as const, color: DARK },
  sidebarBrandSub: { fontSize: 11, color: SLATE, marginTop: 1 },
  sidebarNav: { paddingTop: 16, paddingHorizontal: 12, gap: 2 },
  sidebarItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 10 },
  sidebarItemActive: { backgroundColor: '#1B6EF308' },
  sidebarItemTxt: { fontSize: 14, color: SLATE, fontWeight: '500' as const },
  sidebarItemTxtActive: { color: ACCENT, fontWeight: '600' as const },
  sidebarActiveIndicator: { position: 'absolute', left: 0, top: 10, bottom: 10, width: 3, borderRadius: 2, backgroundColor: ACCENT },
  sidebarFooter: { marginTop: 'auto' as const, borderTopWidth: 1, borderTopColor: BORDER, padding: 16 },
  sidebarUserInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sidebarAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1B6EF312', alignItems: 'center', justifyContent: 'center' },
  sidebarAvatarTxt: { fontSize: 14, fontWeight: '700' as const, color: ACCENT },
  sidebarUserName: { fontSize: 13, fontWeight: '600' as const, color: DARK },
  sidebarUserEmail: { fontSize: 11, color: SLATE },
  sidebarSync: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  sidebarSyncTxt: { fontSize: 10, color: '#94A3B8' },

  mobileHeader: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: BORDER },
  mobileHeaderTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12, gap: 10 },
  mobileLogoSmall: { width: 30, height: 30, borderRadius: 8, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  mobileHeaderTitle: { flex: 1, fontSize: 17, fontWeight: '700' as const, color: DARK },
  mobileRefreshBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1B6EF308', alignItems: 'center', justifyContent: 'center' },
  mobileTabBar: { flexDirection: 'row', paddingHorizontal: 12 },
  mobileTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  mobileTabActive: { borderBottomColor: ACCENT },
  mobileTabTxt: { fontSize: 13, fontWeight: '500' as const, color: SLATE },
  mobileTabTxtActive: { color: ACCENT, fontWeight: '600' as const },

  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: '700' as const, color: DARK },
  pageSubtitle: { fontSize: 13, color: SLATE, marginTop: 2 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF' },
  refreshBtnTxt: { fontSize: 13, color: ACCENT, fontWeight: '500' as const },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, minWidth: 140, backgroundColor: CARD_BG, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: BORDER },
  statCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  statCardLabel: { fontSize: 12, color: SLATE, fontWeight: '500' as const },
  statCardIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statCardValue: { fontSize: 28, fontWeight: '800' as const, color: DARK },

  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  metricPill: { flex: 1, alignItems: 'center', backgroundColor: CARD_BG, borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: BORDER },
  metricValue: { fontSize: 20, fontWeight: '700' as const },
  metricLabel: { fontSize: 10, color: SLATE, fontWeight: '500' as const, marginTop: 3 },

  dashboardPanels: { gap: 14 },
  panel: { backgroundColor: CARD_BG, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: BORDER },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  panelTitle: { fontSize: 15, fontWeight: '700' as const, color: DARK },

  leaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  leaderRank: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  leaderRankTop: { backgroundColor: '#FEF3C7' },
  leaderRankNormal: { backgroundColor: '#F1F5F9' },
  leaderRankTxt: { fontSize: 13, fontWeight: '700' as const },
  leaderName: { flex: 1, fontSize: 14, color: DARK, fontWeight: '500' as const },
  leaderCount: { backgroundColor: '#1B6EF30A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  leaderCountTxt: { fontSize: 13, fontWeight: '700' as const, color: ACCENT },

  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  activityDot: { width: 8, height: 8, borderRadius: 4 },
  activityName: { fontSize: 13, fontWeight: '500' as const, color: DARK },
  activityMeta: { fontSize: 11, color: '#94A3B8', marginTop: 1 },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeTxt: { fontSize: 11, fontWeight: '600' as const },

  searchRow: { marginBottom: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD_BG, borderRadius: 12, paddingHorizontal: 14, gap: 10, borderWidth: 1, borderColor: BORDER },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: DARK },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ACCENT, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  exportBtnTxt: { color: '#FFF', fontWeight: '600' as const, fontSize: 13 },

  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER },
  filterChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  filterChipTxt: { fontSize: 12, color: SLATE, fontWeight: '500' as const },
  filterChipTxtActive: { color: '#FFF', fontWeight: '600' as const },
  filterDivider: { width: 1, height: 20, backgroundColor: BORDER, marginHorizontal: 4 },

  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  resultCount: { fontSize: 13, color: SLATE, fontWeight: '500' as const },
  sortGroup: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sortChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#F1F5F9' },
  sortChipActive: { backgroundColor: '#1B6EF310' },
  sortChipTxt: { fontSize: 11, color: SLATE, fontWeight: '500' as const },
  sortChipTxtActive: { color: ACCENT, fontWeight: '600' as const },

  formRow: { backgroundColor: CARD_BG, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  formRowMain: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  formTypeTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7 },
  formTypeTagTxt: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.3 },
  formRowName: { fontSize: 14, fontWeight: '600' as const, color: DARK, marginBottom: 2 },
  formRowSub: { fontSize: 11, color: '#94A3B8' },
  viewBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#1B6EF30A', alignItems: 'center', justifyContent: 'center' },
  formRowExpanded: { borderTopWidth: 1, borderTopColor: '#F1F5F9', padding: 16, backgroundColor: '#FAFBFC', gap: 8 },
  expandedDetail: { flexDirection: 'row', gap: 8 },
  expandedLabel: { fontSize: 12, color: SLATE, width: 100, fontWeight: '500' as const },
  expandedValue: { fontSize: 12, color: DARK, flex: 1 },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyStateTitle: { fontSize: 16, fontWeight: '600' as const, color: '#475569' },
  emptyStateMsg: { fontSize: 13, color: '#94A3B8' },
  emptyMsg: { fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingVertical: 20 },

  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD_BG, borderRadius: 12, padding: 14, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: BORDER },
  userAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1B6EF310', alignItems: 'center', justifyContent: 'center' },
  userAvatarTxt: { fontSize: 15, fontWeight: '700' as const, color: ACCENT },
  userCardName: { fontSize: 14, fontWeight: '600' as const, color: DARK, marginBottom: 2 },
  userMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  userCardEmail: { fontSize: 12, color: '#94A3B8' },
  userStatBlock: { alignItems: 'center', paddingHorizontal: 10 },
  userStatNum: { fontSize: 18, fontWeight: '700' as const, color: ACCENT },
  userStatLabel: { fontSize: 10, color: SLATE, fontWeight: '500' as const },

  loaderBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100, gap: 16 },
  loaderTxt: { fontSize: 14, color: SLATE },

  loginRoot: { flex: 1, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', padding: 24 },
  loginCard: { width: '100%', maxWidth: 400, backgroundColor: CARD_BG, borderRadius: 20, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 4 },
  loginIconWrap: { width: 60, height: 60, borderRadius: 16, backgroundColor: '#1B6EF310', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  loginTitle: { fontSize: 22, fontWeight: '700' as const, color: DARK, marginBottom: 6 },
  loginSubtitle: { fontSize: 14, color: SLATE, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  loginErrorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, width: '100%', marginBottom: 16 },
  loginErrorTxt: { fontSize: 13, color: RED, flex: 1 },
  loginField: { width: '100%', marginBottom: 16 },
  loginLabel: { fontSize: 13, fontWeight: '600' as const, color: '#374151', marginBottom: 6 },
  loginInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: BORDER },
  loginInput: { flex: 1, paddingVertical: 13, fontSize: 14, color: DARK },
  loginBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', backgroundColor: ACCENT, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  loginBtnTxt: { color: '#FFF', fontSize: 15, fontWeight: '600' as const },
  loginBackLink: { marginTop: 16 },
  loginBackTxt: { fontSize: 13, color: ACCENT, fontWeight: '500' as const },

  detailOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 100 },
  detailCard: { backgroundColor: CARD_BG, borderRadius: 18, width: '100%', maxWidth: 540, maxHeight: '90%', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 10 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  detailTitle: { fontSize: 17, fontWeight: '700' as const, color: DARK },
  detailClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  detailScroll: { paddingHorizontal: 22, paddingTop: 14 },
  detailIdRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 14 },
  detailId: { fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' },
  detailSection: { marginBottom: 20 },
  detailSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  detailSectionTitle: { fontSize: 12, fontWeight: '700' as const, color: ACCENT, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  detailField: { flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  detailFieldLabel: { width: 130, fontSize: 12, color: SLATE, fontWeight: '500' as const },
  detailFieldValue: { flex: 1, fontSize: 13, color: DARK },
});
