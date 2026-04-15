import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl, Platform,
  Dimensions, Alert,
} from 'react-native';
import {
  Database, Users, FileText, Search, Filter, RefreshCw,
  ChevronDown, ChevronUp, ArrowLeft, Download, Clock,
  CheckCircle, AlertTriangle, TrendingUp, Calendar,
  Mail, Phone, MapPin, User, Briefcase, Hash,
  X, Eye, BarChart3,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useCloudSync } from '@/contexts/CloudSyncContext';
import { useAuth } from '@/contexts/AuthContext';
import { FormData } from '@/contexts/FormsContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_WIDE = SCREEN_WIDTH > 700;

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

export default function PortalScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    isConfigured, fetchAllFormsFromCloud, fetchAllUsersFromCloud,
    isSyncing, lastSynced,
  } = useCloudSync();

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
      console.log(`[Portal] Loaded ${forms.length} forms, ${users.length} users from cloud`);
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
    void loadData();
  }, [loadData]);

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

    if (statusFilter !== 'all') {
      result = result.filter(f => f.status === statusFilter);
    }
    if (typeFilter !== 'all') {
      result = result.filter(f => f.formType === typeFilter);
    }
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
        case 'updatedAt':
          aVal = getDateStr(a.updatedAt);
          bVal = getDateStr(b.updatedAt);
          break;
        case 'patientLastName':
          aVal = (a.patientLastName ?? '').toLowerCase();
          bVal = (b.patientLastName ?? '').toLowerCase();
          break;
        case 'radiographerName':
          aVal = (a.radiographerName ?? '').toLowerCase();
          bVal = (b.radiographerName ?? '').toLowerCase();
          break;
        case 'formType':
          aVal = a.formType ?? '';
          bVal = b.formType ?? '';
          break;
        default:
          aVal = '';
          bVal = '';
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
      if (f.radiographerName) {
        counts[f.radiographerName] = (counts[f.radiographerName] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [cloudForms]);

  const recentForms = useMemo(() => {
    return [...cloudForms]
      .sort((a, b) => {
        const aD = getDateStr(a.updatedAt);
        const bD = getDateStr(b.updatedAt);
        return bD.localeCompare(aD);
      })
      .slice(0, 8);
  }, [cloudForms, getDateStr]);

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
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
    return d.toLocaleString('en-ZA', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }, []);

  const handleExportCSV = useCallback(() => {
    if (Platform.OS !== 'web') {
      Alert.alert('Export', 'CSV export is only available on web.');
      return;
    }
    const headers = [
      'ID', 'Type', 'Status', 'Patient Name', 'ID Number', 'DOB', 'Contact',
      'Email', 'Medical Aid', 'Membership #', 'Procedure', 'ICD10', 'Radiographer',
      'Submitted By', 'Date', 'Updated',
    ];
    const rows = filteredForms.map(f => [
      f.id,
      f.formType,
      f.status,
      `${f.patientTitle ?? ''} ${f.patientFirstName ?? ''} ${f.patientLastName ?? ''}`.trim(),
      f.idNumber ?? '',
      f.dateOfBirth ?? '',
      f.contactNumber ?? '',
      f.email ?? '',
      f.medicalAidName ?? '',
      f.membershipNumber ?? '',
      f.procedure ?? '',
      f.icd10Code ?? '',
      f.radiographerName ?? '',
      (f as any).userEmail ?? f.submittedBy ?? '',
      f.date ?? '',
      getDateStr(f.updatedAt),
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

  if (!isConfigured) {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={s.notConfigured}>
          <Database size={56} color="#CED4DA" />
          <Text style={s.notConfigTitle}>Firebase Not Connected</Text>
          <Text style={s.notConfigSub}>
            Connect Firebase in the Manager Portal settings to use the Data Portal.
          </Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={18} color="#FFF" />
            <Text style={s.backBtnTxt}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderDashboard = () => (
    <>
      <View style={s.statsRow}>
        {[
          { label: 'Total Forms', value: stats.total, icon: FileText, color: '#0A84FF', bg: '#0A84FF12' },
          { label: 'Submitted', value: stats.submitted, icon: CheckCircle, color: '#30D158', bg: '#30D15812' },
          { label: 'Drafts', value: stats.drafts, icon: AlertTriangle, color: '#FF9F0A', bg: '#FF9F0A12' },
          { label: 'Today', value: stats.today, icon: Calendar, color: '#5E5CE6', bg: '#5E5CE612' },
        ].map(item => (
          <View key={item.label} style={[s.statBox, { backgroundColor: item.bg }]}>
            <View style={s.statBoxHeader}>
              <item.icon size={16} color={item.color} />
              <Text style={[s.statBoxLabel, { color: item.color }]}>{item.label}</Text>
            </View>
            <Text style={[s.statBoxValue, { color: item.color }]}>{item.value}</Text>
          </View>
        ))}
      </View>

      <View style={s.statsRow}>
        {[
          { label: 'Medical Aid', value: stats.medAid, color: '#0A84FF', bg: '#0A84FF0A' },
          { label: 'COIDA', value: stats.coida, color: '#00A3A3', bg: '#00A3A30A' },
          { label: 'This Week', value: stats.thisWeek, color: '#5E5CE6', bg: '#5E5CE60A' },
          { label: 'Cloud Users', value: stats.users, color: '#FF375F', bg: '#FF375F0A' },
        ].map(item => (
          <View key={item.label} style={[s.miniStat, { backgroundColor: item.bg, borderColor: `${item.color}20` }]}>
            <Text style={[s.miniStatVal, { color: item.color }]}>{item.value}</Text>
            <Text style={s.miniStatLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={s.sectionRow}>
        <View style={[s.sectionCard, { flex: 1.2 }]}>
          <Text style={s.sectionTitle}>Top Radiographers</Text>
          {radLeaderboard.length === 0 && <Text style={s.emptyMsg}>No data yet</Text>}
          {radLeaderboard.map(([name, count], i) => (
            <View key={name} style={[s.leaderRow, i < radLeaderboard.length - 1 && s.leaderBorder]}>
              <View style={[s.leaderRank, { backgroundColor: i < 3 ? '#FF9F0A14' : '#F0F0F5' }]}>
                <Text style={[s.leaderRankTxt, { color: i < 3 ? '#FF9F0A' : '#8E8E93' }]}>{i + 1}</Text>
              </View>
              <Text style={s.leaderName} numberOfLines={1}>{name}</Text>
              <View style={s.leaderBadge}>
                <Text style={s.leaderBadgeTxt}>{count}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[s.sectionCard, { flex: 1 }]}>
          <Text style={s.sectionTitle}>Recent Activity</Text>
          {recentForms.length === 0 && <Text style={s.emptyMsg}>No forms yet</Text>}
          {recentForms.map((f, i) => {
            const pName = `${f.patientFirstName ?? ''} ${f.patientLastName ?? ''}`.trim() || 'Unknown';
            return (
              <View key={f.id ?? i} style={[s.activityRow, i < recentForms.length - 1 && s.leaderBorder]}>
                <View style={[s.activityDot, { backgroundColor: f.formType === 'coida' ? '#00A3A3' : '#0A84FF' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.activityName} numberOfLines={1}>{pName}</Text>
                  <Text style={s.activityMeta}>{formatDate(f.updatedAt)}</Text>
                </View>
                <View style={[s.statusChip, {
                  backgroundColor: f.status === 'submitted' ? '#30D15814' : '#FF9F0A14',
                }]}>
                  <Text style={[s.statusChipTxt, {
                    color: f.status === 'submitted' ? '#30D158' : '#FF9F0A',
                  }]}>{f.status}</Text>
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
      {
        title: 'Patient Information',
        icon: User,
        fields: [
          ['Name', `${form.patientTitle ?? ''} ${form.patientFirstName ?? ''} ${form.patientLastName ?? ''}`.trim()],
          ['ID Number', form.idNumber],
          ['Date of Birth', form.dateOfBirth],
          ['Contact', form.contactNumber],
          ['Email', form.email],
        ],
      },
      {
        title: 'Medical Details',
        icon: Briefcase,
        fields: [
          ['Form Type', form.formType === 'medical-aid' ? 'Medical Aid' : 'COIDA'],
          ['Procedure', form.procedure],
          ['ICD-10 Code', form.icd10Code],
          ['Medical Aid', form.medicalAidName],
          ['Membership #', form.membershipNumber],
          ['Dependant Code', form.dependantCode],
        ],
      },
      {
        title: 'Theatre Details',
        icon: Clock,
        fields: [
          ['Radiographer', form.radiographerName],
          ['Screening Time', form.screeningTimeText],
          ['C-Arm In', form.timeCArmTakenIn],
          ['C-Arm Out', form.timeCArmTakenOut],
          ['Signature Time', form.radiographerSignatureTimestamp],
          ['Signature Location', form.radiographerSignatureLocation],
        ],
      },
      {
        title: 'Submission Info',
        icon: CheckCircle,
        fields: [
          ['Status', form.status],
          ['Submitted By', anyForm.userEmail ?? form.submittedBy],
          ['Date', form.date],
          ['Created', formatDateTime(form.createdAt)],
          ['Updated', formatDateTime(form.updatedAt)],
          ['Cloud Synced', formatDateTime(anyForm.cloudSyncedAt)],
          ['GPS', form.submissionLatitude && form.submissionLongitude
            ? `${form.submissionLatitude.toFixed(5)}, ${form.submissionLongitude.toFixed(5)}`
            : undefined],
        ],
      },
    ];

    if (form.formType === 'coida') {
      sections.splice(2, 0, {
        title: 'COIDA / Employer Details',
        icon: Briefcase,
        fields: [
          ['Employer', anyForm.employerName],
          ['Employer Contact', anyForm.employerContactNumber],
          ['Employer Address', anyForm.employerAddress],
          ['W.Comp Number', anyForm.wCompNumber],
          ['Date of Injury', anyForm.dateOfInjury],
          ['Time of Injury', anyForm.timeOfInjury],
          ['Place of Accident', anyForm.placeOfAccident],
          ['Cause of Injury', anyForm.causeOfInjury],
          ['Nature of Injury', anyForm.natureOfInjury],
          ['Body Part Injured', anyForm.bodyPartInjured],
        ],
      });
    }

    return (
      <View style={s.detailOverlay}>
        <View style={s.detailCard}>
          <View style={s.detailHeader}>
            <Text style={s.detailTitle}>Form Detail</Text>
            <TouchableOpacity onPress={() => setSelectedFormDetail(null)} style={s.detailClose}>
              <X size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>
          <ScrollView style={s.detailScroll} contentContainerStyle={{ paddingBottom: 30 }}>
            <View style={s.detailIdRow}>
              <Hash size={14} color="#8E8E93" />
              <Text style={s.detailId} numberOfLines={1}>{form.id}</Text>
            </View>
            {sections.map(section => {
              const validFields = section.fields.filter(([, v]) => v != null && String(v).trim() !== '');
              if (validFields.length === 0) return null;
              return (
                <View key={section.title} style={s.detailSection}>
                  <View style={s.detailSectionHeader}>
                    <section.icon size={15} color="#0A84FF" />
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
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Search size={16} color="#8E8E93" />
          <TextInput
            style={s.searchInput}
            placeholder="Search patient, ID, radiographer, email..."
            placeholderTextColor="#ADB5BD"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>
        {Platform.OS === 'web' && (
          <TouchableOpacity style={s.exportBtn} onPress={handleExportCSV}>
            <Download size={15} color="#FFF" />
            <Text style={s.exportBtnTxt}>CSV</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.filtersRow}>
        <View style={s.filterGroup}>
          <Filter size={13} color="#8E8E93" />
          {(['all', 'submitted', 'draft'] as const).map(v => (
            <TouchableOpacity
              key={v}
              style={[s.filterChip, statusFilter === v && s.filterChipActive]}
              onPress={() => setStatusFilter(v)}
            >
              <Text style={[s.filterChipTxt, statusFilter === v && s.filterChipTxtActive]}>
                {v === 'all' ? 'All Status' : v.charAt(0).toUpperCase() + v.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.filterGroup}>
          {(['all', 'medical-aid', 'coida'] as const).map(v => (
            <TouchableOpacity
              key={v}
              style={[s.filterChip, typeFilter === v && s.filterChipActive]}
              onPress={() => setTypeFilter(v)}
            >
              <Text style={[s.filterChipTxt, typeFilter === v && s.filterChipTxtActive]}>
                {v === 'all' ? 'All Types' : v === 'medical-aid' ? 'Med Aid' : 'COIDA'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={s.sortRow}>
        <Text style={s.resultCount}>{filteredForms.length} result{filteredForms.length !== 1 ? 's' : ''}</Text>
        <View style={s.sortGroup}>
          <Text style={s.sortLabel}>Sort:</Text>
          {([
            ['updatedAt', 'Date'],
            ['patientLastName', 'Name'],
            ['radiographerName', 'Radiographer'],
          ] as [SortField, string][]).map(([field, label]) => (
            <TouchableOpacity
              key={field}
              style={[s.sortChip, sortField === field && s.sortChipActive]}
              onPress={() => toggleSort(field)}
            >
              <Text style={[s.sortChipTxt, sortField === field && s.sortChipTxtActive]}>{label}</Text>
              {sortField === field && (
                sortDir === 'desc'
                  ? <ChevronDown size={12} color="#0A84FF" />
                  : <ChevronUp size={12} color="#0A84FF" />
              )}
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
            <TouchableOpacity
              style={s.formRowMain}
              onPress={() => setExpandedFormId(expanded ? null : f.id)}
              activeOpacity={0.7}
            >
              <View style={[s.formTypeTag, { backgroundColor: isCoida ? '#00A3A30F' : '#0A84FF0F' }]}>
                <Text style={[s.formTypeTagTxt, { color: isCoida ? '#00A3A3' : '#0A84FF' }]}>
                  {isCoida ? 'COIDA' : 'Med Aid'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.formRowName} numberOfLines={1}>{pName}</Text>
                <Text style={s.formRowSub} numberOfLines={1}>
                  {f.radiographerName ?? '—'} · {(f as any).userEmail ?? f.submittedBy ?? '—'} · {formatDate(f.updatedAt)}
                </Text>
              </View>
              <View style={[s.statusChip, {
                backgroundColor: f.status === 'submitted' ? '#30D15814' : '#FF9F0A14',
              }]}>
                <Text style={[s.statusChipTxt, {
                  color: f.status === 'submitted' ? '#30D158' : '#FF9F0A',
                }]}>{f.status}</Text>
              </View>
              <TouchableOpacity
                style={s.viewBtn}
                onPress={() => setSelectedFormDetail(f)}
              >
                <Eye size={16} color="#0A84FF" />
              </TouchableOpacity>
              {expanded ? <ChevronUp size={16} color="#8E8E93" /> : <ChevronDown size={16} color="#8E8E93" />}
            </TouchableOpacity>
            {expanded && (
              <View style={s.formRowExpanded}>
                {[
                  ['ID Number', f.idNumber],
                  ['Procedure', f.procedure],
                  ['ICD-10', f.icd10Code],
                  isCoida ? ['Employer', (f as any).employerName] : ['Medical Aid', f.medicalAidName],
                  ['Contact', f.contactNumber],
                  ['Email', f.email],
                  ['Screening Time', f.screeningTimeText],
                  ['C-Arm In', f.timeCArmTakenIn],
                  ['C-Arm Out', f.timeCArmTakenOut],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <View key={String(label)} style={s.formRowDetail}>
                    <Text style={s.formRowDetailLabel}>{String(label)}</Text>
                    <Text style={s.formRowDetailValue}>{String(value)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
      {filteredForms.length === 0 && !loading && (
        <View style={s.emptyState}>
          <FileText size={40} color="#CED4DA" />
          <Text style={s.emptyStateTitle}>No forms found</Text>
          <Text style={s.emptyStateMsg}>Try adjusting your search or filters</Text>
        </View>
      )}
    </>
  );

  const renderUsers = () => (
    <>
      <Text style={s.resultCount}>{cloudUsers.length} cloud user{cloudUsers.length !== 1 ? 's' : ''}</Text>
      {cloudUsers.length === 0 && !loading && (
        <View style={s.emptyState}>
          <Users size={40} color="#CED4DA" />
          <Text style={s.emptyStateTitle}>No cloud users</Text>
          <Text style={s.emptyStateMsg}>Users who register via Firebase will appear here.</Text>
        </View>
      )}
      {cloudUsers.map((u, i) => {
        const initials = ((u.name || u.email || '?') as string)
          .split(' ')
          .map(w => w[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();
        const userForms = cloudForms.filter(f => (f as any).userEmail === u.email || (f as any).uid === u.uid);
        const submitted = userForms.filter(f => f.status === 'submitted').length;
        return (
          <View key={u.id ?? i} style={s.userRow}>
            <View style={s.userAvatar}>
              <Text style={s.userAvatarTxt}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.userRowName}>{u.name || 'Unnamed'}</Text>
              <View style={s.userMetaRow}>
                <Mail size={12} color="#8E8E93" />
                <Text style={s.userRowEmail}>{u.email ?? '—'}</Text>
              </View>
            </View>
            <View style={s.userStatsCol}>
              <Text style={s.userStatNum}>{userForms.length}</Text>
              <Text style={s.userStatLabel}>forms</Text>
            </View>
            <View style={s.userStatsCol}>
              <Text style={[s.userStatNum, { color: '#30D158' }]}>{submitted}</Text>
              <Text style={s.userStatLabel}>sent</Text>
            </View>
          </View>
        );
      })}
    </>
  );

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safeArea} edges={['top']}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.topBarBack}>
            <ArrowLeft size={20} color="#0A84FF" />
          </TouchableOpacity>
          <View style={s.topBarCenter}>
            <Database size={18} color="#0A84FF" />
            <Text style={s.topBarTitle}>Data Portal</Text>
          </View>
          <TouchableOpacity onPress={onRefresh} style={s.topBarAction}>
            {isSyncing || refreshing
              ? <ActivityIndicator size="small" color="#0A84FF" />
              : <RefreshCw size={18} color="#0A84FF" />
            }
          </TouchableOpacity>
        </View>

        <View style={s.tabBar}>
          {([
            { key: 'dashboard' as TabKey, label: 'Dashboard', icon: BarChart3 },
            { key: 'forms' as TabKey, label: 'Forms', icon: FileText },
            { key: 'users' as TabKey, label: 'Users', icon: Users },
          ]).map(t => (
            <TouchableOpacity
              key={t.key}
              style={[s.tabItem, activeTab === t.key && s.tabItemActive]}
              onPress={() => setActiveTab(t.key)}
            >
              <t.icon size={16} color={activeTab === t.key ? '#0A84FF' : '#8E8E93'} />
              <Text style={[s.tabItemTxt, activeTab === t.key && s.tabItemTxtActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {lastSynced && (
          <View style={s.syncBar}>
            <Clock size={11} color="#8E8E93" />
            <Text style={s.syncBarTxt}>Last synced: {formatDateTime(lastSynced)}</Text>
          </View>
        )}
      </SafeAreaView>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0A84FF" />}
      >
        {loading ? (
          <View style={s.loaderBox}>
            <ActivityIndicator size="large" color="#0A84FF" />
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

      {selectedFormDetail && renderFormDetail(selectedFormDetail)}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },
  safeArea: { backgroundColor: '#FFFFFF' },
  notConfigured: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16, backgroundColor: '#F2F2F7' },
  notConfigTitle: { fontSize: 20, fontWeight: '700' as const, color: '#3A3A3C' },
  notConfigSub: { fontSize: 14, color: '#8E8E93', textAlign: 'center', lineHeight: 21 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0A84FF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  backBtnTxt: { color: '#FFF', fontWeight: '600' as const, fontSize: 15 },

  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFFFFF', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D1D1D6' },
  topBarBack: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  topBarCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  topBarTitle: { fontSize: 17, fontWeight: '700' as const, color: '#1C1C1E' },
  topBarAction: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D1D1D6' },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: '#0A84FF' },
  tabItemTxt: { fontSize: 13, fontWeight: '600' as const, color: '#8E8E93' },
  tabItemTxtActive: { color: '#0A84FF' },

  syncBar: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingVertical: 5, backgroundColor: '#F9F9FB', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E5EA' },
  syncBarTxt: { fontSize: 11, color: '#8E8E93' },

  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  loaderBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 16 },
  loaderTxt: { fontSize: 14, color: '#8E8E93' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statBox: { flex: 1, borderRadius: 14, padding: 14 },
  statBoxHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  statBoxLabel: { fontSize: 11, fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  statBoxValue: { fontSize: 30, fontWeight: '800' as const },

  miniStat: { flex: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center', borderWidth: 1 },
  miniStatVal: { fontSize: 22, fontWeight: '700' as const },
  miniStatLabel: { fontSize: 10, color: '#8E8E93', fontWeight: '500' as const, marginTop: 2 },

  sectionRow: { flexDirection: IS_WIDE ? 'row' : 'column', gap: 12, marginTop: 4 },
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E5EA' },
  sectionTitle: { fontSize: 14, fontWeight: '700' as const, color: '#1C1C1E', marginBottom: 14 },

  leaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  leaderBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0F0F5' },
  leaderRank: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  leaderRankTxt: { fontSize: 13, fontWeight: '700' as const },
  leaderName: { flex: 1, fontSize: 14, color: '#1C1C1E', fontWeight: '500' as const },
  leaderBadge: { backgroundColor: '#0A84FF10', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  leaderBadgeTxt: { fontSize: 13, fontWeight: '700' as const, color: '#0A84FF' },

  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  activityDot: { width: 8, height: 8, borderRadius: 4 },
  activityName: { fontSize: 13, fontWeight: '500' as const, color: '#1C1C1E' },
  activityMeta: { fontSize: 11, color: '#8E8E93', marginTop: 1 },

  statusChip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7 },
  statusChipTxt: { fontSize: 11, fontWeight: '600' as const },

  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 12, gap: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: '#D1D1D6' },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 14, color: '#1C1C1E' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0A84FF', paddingHorizontal: 16, borderRadius: 12 },
  exportBtnTxt: { color: '#FFF', fontWeight: '600' as const, fontSize: 13 },

  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  filterGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5EA' },
  filterChipActive: { backgroundColor: '#0A84FF', borderColor: '#0A84FF' },
  filterChipTxt: { fontSize: 12, color: '#6C757D', fontWeight: '500' as const },
  filterChipTxtActive: { color: '#FFF', fontWeight: '700' as const },

  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  resultCount: { fontSize: 13, color: '#8E8E93', fontWeight: '500' as const },
  sortGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sortLabel: { fontSize: 12, color: '#8E8E93' },
  sortChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#F2F2F7' },
  sortChipActive: { backgroundColor: '#0A84FF14' },
  sortChipTxt: { fontSize: 11, color: '#8E8E93', fontWeight: '500' as const },
  sortChipTxtActive: { color: '#0A84FF' },

  formRow: { backgroundColor: '#FFFFFF', borderRadius: 13, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E5EA', overflow: 'hidden' },
  formRowMain: { flexDirection: 'row', alignItems: 'center', padding: 13, gap: 10 },
  formTypeTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7 },
  formTypeTagTxt: { fontSize: 10, fontWeight: '700' as const, textTransform: 'uppercase' as const },
  formRowName: { fontSize: 14, fontWeight: '600' as const, color: '#1C1C1E', marginBottom: 2 },
  formRowSub: { fontSize: 11, color: '#8E8E93' },
  viewBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#0A84FF10', alignItems: 'center', justifyContent: 'center' },
  formRowExpanded: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E5EA', padding: 14, backgroundColor: '#F9F9FB', gap: 6 },
  formRowDetail: { flexDirection: 'row', gap: 8 },
  formRowDetailLabel: { fontSize: 12, color: '#8E8E93', width: 100, fontWeight: '500' as const },
  formRowDetailValue: { fontSize: 12, color: '#1C1C1E', flex: 1 },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyStateTitle: { fontSize: 17, fontWeight: '600' as const, color: '#3A3A3C' },
  emptyStateMsg: { fontSize: 13, color: '#8E8E93' },
  emptyMsg: { fontSize: 13, color: '#8E8E93', textAlign: 'center', paddingVertical: 20 },

  userRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 13, padding: 14, marginBottom: 8, gap: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E5EA' },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0A84FF10', alignItems: 'center', justifyContent: 'center' },
  userAvatarTxt: { fontSize: 15, fontWeight: '700' as const, color: '#0A84FF' },
  userRowName: { fontSize: 15, fontWeight: '600' as const, color: '#1C1C1E', marginBottom: 3 },
  userMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  userRowEmail: { fontSize: 12, color: '#8E8E93' },
  userStatsCol: { alignItems: 'center', paddingHorizontal: 8 },
  userStatNum: { fontSize: 18, fontWeight: '700' as const, color: '#0A84FF' },
  userStatLabel: { fontSize: 10, color: '#8E8E93', fontWeight: '500' as const },

  detailOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center',
    padding: 20, zIndex: 100,
  },
  detailCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 520,
    maxHeight: '90%', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24,
    elevation: 10,
  },
  detailHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E5EA',
  },
  detailTitle: { fontSize: 17, fontWeight: '700' as const, color: '#1C1C1E' },
  detailClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F2F7', alignItems: 'center', justifyContent: 'center' },
  detailScroll: { paddingHorizontal: 20, paddingTop: 12 },
  detailIdRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  detailId: { fontSize: 11, color: '#8E8E93', fontFamily: 'monospace' },
  detailSection: { marginBottom: 20 },
  detailSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  detailSectionTitle: { fontSize: 13, fontWeight: '700' as const, color: '#0A84FF', textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  detailField: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0F0F5' },
  detailFieldLabel: { width: 120, fontSize: 12, color: '#8E8E93', fontWeight: '500' as const },
  detailFieldValue: { flex: 1, fontSize: 13, color: '#1C1C1E' },
});
