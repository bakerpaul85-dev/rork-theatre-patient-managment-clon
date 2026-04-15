import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  FileText,
  ClipboardList,
  RefreshCw,
  X,
  User,
  Phone,
  Hash,
  Building2,
  Calendar,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Settings,
  BookOpen,
  Clock,
  Stethoscope,
  Activity,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { fetchWorklist, WorklistPatient } from '@/utils/worklistService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WORKLIST_URL_KEY = '@worklist_spreadsheet_url';
const MANUAL_ENTRIES_KEY = '@worklist_manual_entries';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ManualEntryForm {
  patientFirstName: string;
  patientLastName: string;
  patientTitle: string;
  idNumber: string;
  contactNumber: string;
  procedure: string;
  referringDoctor: string;
  hospital: string;
  ward: string;
  medicalAidName: string;
  membershipNumber: string;
  notes: string;
}

interface DiaryDay {
  date: string;
  displayDate: string;
  dayName: string;
  dayNumber: string;
  monthYear: string;
  patients: WorklistPatient[];
  isToday: boolean;
}

const formatDateKey = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return dateStr;
};

const parseToDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const getTodayKey = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const emptyManualForm: ManualEntryForm = {
  patientFirstName: '',
  patientLastName: '',
  patientTitle: '',
  idNumber: '',
  contactNumber: '',
  procedure: '',
  referringDoctor: '',
  hospital: '',
  ward: '',
  medicalAidName: '',
  membershipNumber: '',
  notes: '',
};

export default function WorklistScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<WorklistPatient | null>(null);
  const [showUrlConfig, setShowUrlConfig] = useState<boolean>(false);
  const [showAddEntry, setShowAddEntry] = useState<boolean>(false);
  const [manualForm, setManualForm] = useState<ManualEntryForm>({ ...emptyManualForm });
  const [urlInput, setUrlInput] = useState<string>('');
  const [selectedDateKey, setSelectedDateKey] = useState<string>(getTodayKey());
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const savedUrlQuery = useQuery({
    queryKey: ['worklist-url'],
    queryFn: async () => {
      const saved = await AsyncStorage.getItem(WORKLIST_URL_KEY);
      return saved || process.env.EXPO_PUBLIC_GOOGLE_SHEET_URL || '';
    },
  });

  const spreadsheetUrl = savedUrlQuery.data || '';

  const manualEntriesQuery = useQuery({
    queryKey: ['manual-entries'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(MANUAL_ENTRIES_KEY);
      return stored ? (JSON.parse(stored) as WorklistPatient[]) : [];
    },
  });

  const manualEntries = useMemo(() => manualEntriesQuery.data || [], [manualEntriesQuery.data]);

  const saveManualEntryMutation = useMutation({
    mutationFn: async (entry: WorklistPatient) => {
      const current = manualEntries;
      const updated = [...current, entry];
      await AsyncStorage.setItem(MANUAL_ENTRIES_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['manual-entries'], updated);
      setShowAddEntry(false);
      setManualForm({ ...emptyManualForm });
      Alert.alert('Success', 'Entry added to diary');
    },
  });

  const deleteManualEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const current = manualEntries;
      const updated = current.filter(e => e.id !== entryId);
      await AsyncStorage.setItem(MANUAL_ENTRIES_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['manual-entries'], updated);
      setSelectedPatient(null);
    },
  });

  const worklistQuery = useQuery({
    queryKey: ['worklist', spreadsheetUrl],
    queryFn: () => fetchWorklist(spreadsheetUrl),
    enabled: !!spreadsheetUrl,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const saveUrlMutation = useMutation({
    mutationFn: async (url: string) => {
      await AsyncStorage.setItem(WORKLIST_URL_KEY, url);
      return url;
    },
    onSuccess: (url) => {
      queryClient.setQueryData(['worklist-url'], url);
      void queryClient.invalidateQueries({ queryKey: ['worklist'] });
      setShowUrlConfig(false);
      Alert.alert('Success', 'Spreadsheet URL saved. Refreshing diary...');
    },
  });

  const patients = useMemo(() => {
    const sheetPatients = worklistQuery.data || [];
    return [...sheetPatients, ...manualEntries];
  }, [worklistQuery.data, manualEntries]);

  const diaryDays = useMemo(() => {
    const todayKey = getTodayKey();
    const grouped: Record<string, WorklistPatient[]> = {};

    for (const p of patients) {
      const dateField = p.dateOfProcedure || p.dateOfIncident || '';
      const key = formatDateKey(dateField) || 'unscheduled';

      if (searchText.trim()) {
        const lower = searchText.toLowerCase();
        const fullName = `${p.patientFirstName} ${p.patientLastName}`.toLowerCase();
        const match =
          fullName.includes(lower) ||
          p.idNumber.toLowerCase().includes(lower) ||
          p.procedure.toLowerCase().includes(lower) ||
          p.employerName.toLowerCase().includes(lower) ||
          p.medicalAidName.toLowerCase().includes(lower);
        if (!match) continue;
      }

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    }

    const days: DiaryDay[] = [];
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      if (a === 'unscheduled') return 1;
      if (b === 'unscheduled') return -1;
      return a.localeCompare(b);
    });

    for (const key of sortedKeys) {
      if (key === 'unscheduled') {
        days.push({
          date: key,
          displayDate: 'Unscheduled',
          dayName: '',
          dayNumber: '?',
          monthYear: 'No Date',
          patients: grouped[key],
          isToday: false,
        });
        continue;
      }

      const parts = key.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      if (isNaN(d.getTime())) continue;

      days.push({
        date: key,
        displayDate: `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
        dayName: DAY_NAMES[d.getDay()],
        dayNumber: String(d.getDate()),
        monthYear: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
        patients: grouped[key],
        isToday: key === todayKey,
      });
    }

    return days;
  }, [patients, searchText]);

  const weekDates = useMemo(() => {
    const parts = selectedDateKey.split('-');
    const selected = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const dayOfWeek = selected.getDay();
    const monday = new Date(selected);
    monday.setDate(selected.getDate() - ((dayOfWeek + 6) % 7));

    const todayKey = getTodayKey();
    const dates: Array<{ key: string; dayShort: string; dayNum: string; isToday: boolean; isSelected: boolean; hasEntries: boolean }> = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dates.push({
        key,
        dayShort: DAY_SHORT[d.getDay()],
        dayNum: String(d.getDate()),
        isToday: key === todayKey,
        isSelected: key === selectedDateKey,
        hasEntries: diaryDays.some(dd => dd.date === key),
      });
    }
    return dates;
  }, [selectedDateKey, diaryDays]);

  const selectedDayData = useMemo(() => {
    return diaryDays.find(d => d.date === selectedDateKey) || null;
  }, [diaryDays, selectedDateKey]);

  const selectedDateDisplay = useMemo(() => {
    const parts = selectedDateKey.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    if (isNaN(d.getTime())) return selectedDateKey;
    return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
  }, [selectedDateKey]);

  const navigateWeek = useCallback((direction: 1 | -1) => {
    const parts = selectedDateKey.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    d.setDate(d.getDate() + direction * 7);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setSelectedDateKey(key);
  }, [selectedDateKey]);

  const selectDate = useCallback((key: string) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.3, duration: 100, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setSelectedDateKey(key);
  }, [fadeAnim]);

  const goToToday = useCallback(() => {
    selectDate(getTodayKey());
  }, [selectDate]);

  const handleSelectPatient = useCallback((patient: WorklistPatient) => {
    setSelectedPatient(patient);
  }, []);

  const handleLoadIntoForm = useCallback((patient: WorklistPatient, formType: 'medical-aid' | 'coida') => {
    setSelectedPatient(null);

    const params: Record<string, string> = {};
    if (patient.patientFirstName) params.wl_firstName = patient.patientFirstName;
    if (patient.patientLastName) params.wl_lastName = patient.patientLastName;
    if (patient.patientTitle) params.wl_title = patient.patientTitle;
    if (patient.idNumber) params.wl_idNumber = patient.idNumber;
    if (patient.dateOfBirth) params.wl_dob = patient.dateOfBirth;
    if (patient.contactNumber) params.wl_contact = patient.contactNumber;
    if (patient.email) params.wl_email = patient.email;
    if (patient.procedure) params.wl_procedure = patient.procedure;
    if (patient.icd10Code) params.wl_icd10 = patient.icd10Code;
    if (patient.dateOfProcedure) params.wl_dateOfProcedure = patient.dateOfProcedure;

    if (formType === 'medical-aid') {
      if (patient.medicalAidName) params.wl_medicalAid = patient.medicalAidName;
      if (patient.membershipNumber) params.wl_membershipNumber = patient.membershipNumber;
      if (patient.dependantCode) params.wl_dependantCode = patient.dependantCode;
      if (patient.dateOfProcedure) params.wl_dateOfProcedure = patient.dateOfProcedure;
      router.push({ pathname: '/(tabs)/medical-aid', params } as any);
    } else {
      if (patient.coidaNumber) params.wl_coidaNumber = patient.coidaNumber;
      if (patient.iodClaimNumber) params.wl_iodClaim = patient.iodClaimNumber;
      if (patient.employerName) params.wl_employer = patient.employerName;
      if (patient.employerContact) params.wl_employerContact = patient.employerContact;
      if (patient.dateOfIncident) params.wl_dateOfIncident = patient.dateOfIncident;
      router.push({ pathname: '/(tabs)/coida', params } as any);
    }
  }, [router]);

  const handleOpenUrlConfig = useCallback(() => {
    setUrlInput(spreadsheetUrl);
    setShowUrlConfig(true);
  }, [spreadsheetUrl]);

  const handleOpenAddEntry = useCallback(() => {
    const parts = selectedDateKey.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    setManualForm({ ...emptyManualForm });
    setShowAddEntry(true);
  }, [selectedDateKey]);

  const handleSaveManualEntry = useCallback(() => {
    if (!manualForm.patientFirstName.trim() && !manualForm.patientLastName.trim()) {
      Alert.alert('Required', 'Please enter at least a patient name.');
      return;
    }

    const parts = selectedDateKey.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const dateStr = `${day}/${month}/${year}`;

    const entry: WorklistPatient = {
      id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      patientFirstName: manualForm.patientFirstName.trim(),
      patientLastName: manualForm.patientLastName.trim(),
      patientTitle: manualForm.patientTitle.trim(),
      idNumber: manualForm.idNumber.trim(),
      dateOfBirth: '',
      contactNumber: manualForm.contactNumber.trim(),
      email: '',
      medicalAidName: manualForm.medicalAidName.trim(),
      membershipNumber: manualForm.membershipNumber.trim(),
      dependantCode: '',
      procedure: manualForm.procedure.trim(),
      icd10Code: '',
      coidaNumber: '',
      iodClaimNumber: '',
      employerName: '',
      employerContact: '',
      dateOfIncident: '',
      referringDoctor: manualForm.referringDoctor.trim(),
      ward: manualForm.ward.trim(),
      hospital: manualForm.hospital.trim(),
      dateOfProcedure: dateStr,
      formType: manualForm.medicalAidName ? 'medical-aid' : 'unknown',
      rawData: { notes: manualForm.notes.trim(), source: 'manual' },
    };

    console.log('[Worklist] Saving manual entry:', entry);
    saveManualEntryMutation.mutate(entry);
  }, [manualForm, selectedDateKey, saveManualEntryMutation]);

  const handleDeleteManualEntry = useCallback((patient: WorklistPatient) => {
    Alert.alert(
      'Delete Entry',
      `Remove ${patient.patientFirstName} ${patient.patientLastName} from diary?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteManualEntryMutation.mutate(patient.id),
        },
      ]
    );
  }, [deleteManualEntryMutation]);

  const updateFormField = useCallback((field: keyof ManualEntryForm, value: string) => {
    setManualForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const getFormTypeBadge = (formType: string) => {
    if (formType === 'coida') {
      return { label: 'COIDA', color: '#D97706', bg: '#FEF3C7' };
    }
    if (formType === 'medical-aid') {
      return { label: 'Medical Aid', color: '#0369A1', bg: '#E0F2FE' };
    }
    return { label: 'Unknown', color: '#6B7280', bg: '#F3F4F6' };
  };

  const getTimelineColor = (index: number): string => {
    const colors = ['#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    return colors[index % colors.length];
  };

  const renderDiaryEntry = useCallback(({ item, index }: { item: WorklistPatient; index: number }) => {
    const badge = getFormTypeBadge(item.formType);
    const fullName = `${item.patientFirstName} ${item.patientLastName}`.trim();
    const timelineColor = getTimelineColor(index);

    const isManual = item.id.startsWith('manual_');

    return (
      <TouchableOpacity
        style={styles.diaryEntry}
        onPress={() => handleSelectPatient(item)}
        activeOpacity={0.7}
        testID={`diary-entry-${index}`}
      >
        <View style={styles.timelineIndicator}>
          <View style={[styles.timelineDot, { backgroundColor: timelineColor }]} />
          {index < (selectedDayData?.patients.length ?? 0) - 1 && (
            <View style={[styles.timelineLine, { backgroundColor: timelineColor + '30' }]} />
          )}
        </View>

        <View style={[styles.entryContent, isManual && styles.entryContentManual]}>
          <View style={styles.entryHeader}>
            <View style={styles.entryPatientInfo}>
              <Text style={styles.entryPatientName} numberOfLines={1}>
                {item.patientTitle ? `${item.patientTitle} ` : ''}{fullName || 'Unknown Patient'}
              </Text>
              {item.idNumber ? (
                <Text style={styles.entryIdNumber}>{item.idNumber}</Text>
              ) : null}
            </View>
            <View style={[styles.entryBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.entryBadgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          </View>

          {item.procedure ? (
            <View style={styles.entryProcedureRow}>
              <Stethoscope size={13} color="#6B7280" />
              <Text style={styles.entryProcedureText} numberOfLines={2}>{item.procedure}</Text>
            </View>
          ) : null}

          <View style={styles.entryDetailsRow}>
            {item.referringDoctor ? (
              <View style={styles.entryDetail}>
                <User size={11} color="#9CA3AF" />
                <Text style={styles.entryDetailText} numberOfLines={1}>Dr. {item.referringDoctor}</Text>
              </View>
            ) : null}
            {item.ward || item.hospital ? (
              <View style={styles.entryDetail}>
                <Building2 size={11} color="#9CA3AF" />
                <Text style={styles.entryDetailText} numberOfLines={1}>
                  {[item.ward, item.hospital].filter(Boolean).join(' · ')}
                </Text>
              </View>
            ) : null}
            {item.contactNumber ? (
              <View style={styles.entryDetail}>
                <Phone size={11} color="#9CA3AF" />
                <Text style={styles.entryDetailText}>{item.contactNumber}</Text>
              </View>
            ) : null}
            {item.medicalAidName ? (
              <View style={styles.entryDetail}>
                <Activity size={11} color="#9CA3AF" />
                <Text style={styles.entryDetailText} numberOfLines={1}>{item.medicalAidName}</Text>
              </View>
            ) : null}
            {item.employerName ? (
              <View style={styles.entryDetail}>
                <Building2 size={11} color="#9CA3AF" />
                <Text style={styles.entryDetailText} numberOfLines={1}>{item.employerName}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.entryFooter}>
            <View style={styles.entryFooterLeft}>
              {isManual && (
                <View style={styles.manualBadge}>
                  <Text style={styles.manualBadgeText}>Manual</Text>
                </View>
              )}
              {item.rawData?.notes ? (
                <Text style={styles.entryNotes} numberOfLines={1}>{item.rawData.notes}</Text>
              ) : null}
            </View>
            <Text style={styles.tapHint}>Tap to load</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [handleSelectPatient, selectedDayData, handleDeleteManualEntry]);

  const renderEmptyDay = () => {
    if (!spreadsheetUrl) {
      return (
        <View style={styles.emptyDay}>
          <Settings size={40} color="#D1D5DB" />
          <Text style={styles.emptyDayTitle}>No Spreadsheet Configured</Text>
          <Text style={styles.emptyDayText}>
            Connect your OneDrive or Google Sheet to see your daily patient diary.
          </Text>
          <TouchableOpacity style={styles.configBtn} onPress={handleOpenUrlConfig}>
            <Text style={styles.configBtnText}>Configure Spreadsheet</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (worklistQuery.isLoading) {
      return (
        <View style={styles.emptyDay}>
          <ActivityIndicator size="large" color="#0EA5E9" />
          <Text style={styles.emptyDayTitle}>Loading Diary...</Text>
          <Text style={styles.emptyDayText}>Fetching patient data from your spreadsheet</Text>
        </View>
      );
    }

    if (worklistQuery.isError) {
      return (
        <View style={styles.emptyDay}>
          <AlertCircle size={40} color="#EF4444" />
          <Text style={styles.emptyDayTitle}>Failed to Load</Text>
          <Text style={styles.emptyDayText}>
            {worklistQuery.error instanceof Error ? worklistQuery.error.message : 'Check that the URL is publicly accessible.'}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => worklistQuery.refetch()}>
            <RefreshCw size={14} color="#FFF" />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.configBtn, { marginTop: 8 }]} onPress={handleOpenUrlConfig}>
            <Text style={styles.configBtnText}>Change URL</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyDay}>
        <BookOpen size={40} color="#D1D5DB" />
        <Text style={styles.emptyDayTitle}>No Entries</Text>
        <Text style={styles.emptyDayText}>No patients scheduled for this day</Text>
      </View>
    );
  };

  const totalPatientsForWeek = useMemo(() => {
    let count = 0;
    for (const wd of weekDates) {
      const day = diaryDays.find(d => d.date === wd.key);
      if (day) count += day.patients.length;
    }
    return count;
  }, [weekDates, diaryDays]);

  return (
    <View style={styles.container}>
      <View style={styles.calendarHeader}>
        <View style={styles.weekNav}>
          <TouchableOpacity onPress={() => navigateWeek(-1)} style={styles.weekNavBtn} testID="prev-week">
            <ChevronLeft size={20} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToToday} style={styles.todayBtn} testID="today-btn">
            <Calendar size={14} color="#0EA5E9" />
            <Text style={styles.todayBtnText}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigateWeek(1)} style={styles.weekNavBtn} testID="next-week">
            <ChevronRight size={20} color="#374151" />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekStrip}>
          {weekDates.map((wd) => (
            <TouchableOpacity
              key={wd.key}
              style={[
                styles.dayCell,
                wd.isSelected && styles.dayCellSelected,
                wd.isToday && !wd.isSelected && styles.dayCellToday,
              ]}
              onPress={() => selectDate(wd.key)}
              testID={`day-${wd.key}`}
            >
              <Text style={[
                styles.dayCellLabel,
                wd.isSelected && styles.dayCellLabelSelected,
              ]}>
                {wd.dayShort}
              </Text>
              <Text style={[
                styles.dayCellNum,
                wd.isSelected && styles.dayCellNumSelected,
                wd.isToday && !wd.isSelected && styles.dayCellNumToday,
              ]}>
                {wd.dayNum}
              </Text>
              {wd.hasEntries && !wd.isSelected && (
                <View style={styles.dayDot} />
              )}
              {wd.isSelected && wd.hasEntries && (
                <View style={styles.dayDotSelected} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.dayHeader}>
        <View style={styles.dayHeaderLeft}>
          <Text style={styles.dayHeaderDate}>{selectedDateDisplay}</Text>
          <Text style={styles.dayHeaderCount}>
            {selectedDayData ? `${selectedDayData.patients.length} patient${selectedDayData.patients.length !== 1 ? 's' : ''}` : 'No patients'}
          </Text>
        </View>
        <View style={styles.dayHeaderRight}>
          <TouchableOpacity style={styles.searchToggle} onPress={handleOpenUrlConfig} testID="settings-btn">
            <Settings size={18} color="#6B7280" />
          </TouchableOpacity>
          {worklistQuery.isFetching && (
            <ActivityIndicator size="small" color="#0EA5E9" style={{ marginLeft: 8 }} />
          )}
        </View>
      </View>

      {searchText || patients.length > 0 ? (
        <View style={styles.searchBar}>
          <Search size={16} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search patients..."
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
            testID="search-input"
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText('')} testID="clear-search">
              <X size={16} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <Animated.View style={[styles.diaryContent, { opacity: fadeAnim }]}>
        <FlatList
          data={selectedDayData?.patients || []}
          keyExtractor={(item) => item.id}
          renderItem={renderDiaryEntry}
          contentContainerStyle={styles.entriesList}
          ListEmptyComponent={renderEmptyDay}
          refreshControl={
            <RefreshControl
              refreshing={worklistQuery.isFetching && !worklistQuery.isLoading}
              onRefresh={() => worklistQuery.refetch()}
              tintColor="#0EA5E9"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>

      <Modal
        visible={!!selectedPatient}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPatient(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedPatient && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Load Patient</Text>
                  <TouchableOpacity onPress={() => setSelectedPatient(null)} testID="close-modal">
                    <X size={24} color="#374151" />
                  </TouchableOpacity>
                </View>

                <View style={styles.patientSummary}>
                  <View style={styles.summaryAvatar}>
                    <User size={26} color="#FFFFFF" />
                  </View>
                  <Text style={styles.summaryName}>
                    {selectedPatient.patientTitle ? `${selectedPatient.patientTitle} ` : ''}
                    {selectedPatient.patientFirstName} {selectedPatient.patientLastName}
                  </Text>
                  {selectedPatient.idNumber ? (
                    <View style={styles.summaryRow}>
                      <Hash size={13} color="#6B7280" />
                      <Text style={styles.summaryDetail}>{selectedPatient.idNumber}</Text>
                    </View>
                  ) : null}
                  {selectedPatient.contactNumber ? (
                    <View style={styles.summaryRow}>
                      <Phone size={13} color="#6B7280" />
                      <Text style={styles.summaryDetail}>{selectedPatient.contactNumber}</Text>
                    </View>
                  ) : null}
                  {selectedPatient.procedure ? (
                    <View style={styles.summaryProcedureBadge}>
                      <Text style={styles.summaryProcedure}>{selectedPatient.procedure}</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.chooseFormText}>Choose form type:</Text>

                <TouchableOpacity
                  style={styles.formTypeButton}
                  onPress={() => handleLoadIntoForm(selectedPatient, 'medical-aid')}
                  testID="load-medical-aid"
                >
                  <View style={[styles.formTypeIcon, { backgroundColor: '#E0F2FE' }]}>
                    <FileText size={22} color="#0369A1" />
                  </View>
                  <View style={styles.formTypeInfo}>
                    <Text style={styles.formTypeTitle}>Medical Aid Form</Text>
                    <Text style={styles.formTypeDesc}>Patient with medical aid coverage</Text>
                  </View>
                  <ChevronRight size={20} color="#D1D5DB" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.formTypeButton}
                  onPress={() => handleLoadIntoForm(selectedPatient, 'coida')}
                  testID="load-coida"
                >
                  <View style={[styles.formTypeIcon, { backgroundColor: '#FEF3C7' }]}>
                    <ClipboardList size={22} color="#D97706" />
                  </View>
                  <View style={styles.formTypeInfo}>
                    <Text style={styles.formTypeTitle}>COIDA Form</Text>
                    <Text style={styles.formTypeDesc}>Compensation for occupational injuries</Text>
                  </View>
                  <ChevronRight size={20} color="#D1D5DB" />
                </TouchableOpacity>

                {selectedPatient.id.startsWith('manual_') && (
                  <TouchableOpacity
                    style={styles.deleteEntryButton}
                    onPress={() => handleDeleteManualEntry(selectedPatient)}
                    testID="delete-manual-entry"
                  >
                    <Trash2 size={16} color="#EF4444" />
                    <Text style={styles.deleteEntryText}>Delete Manual Entry</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAddEntry}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddEntry(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.addEntryModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Entry</Text>
              <TouchableOpacity onPress={() => setShowAddEntry(false)} testID="close-add-modal">
                <X size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <Text style={styles.addEntryDateLabel}>
              {selectedDateDisplay}
            </Text>

            <ScrollView style={styles.addEntryScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.formRow}>
                <View style={styles.formFieldSmall}>
                  <Text style={styles.formLabel}>Title</Text>
                  <TextInput
                    style={styles.formInput}
                    value={manualForm.patientTitle}
                    onChangeText={(v) => updateFormField('patientTitle', v)}
                    placeholder="Mr/Mrs"
                    placeholderTextColor="#C4C9D4"
                    testID="manual-title"
                  />
                </View>
                <View style={styles.formFieldLarge}>
                  <Text style={styles.formLabel}>First Name *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={manualForm.patientFirstName}
                    onChangeText={(v) => updateFormField('patientFirstName', v)}
                    placeholder="First name"
                    placeholderTextColor="#C4C9D4"
                    testID="manual-first-name"
                  />
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Last Name *</Text>
                <TextInput
                  style={styles.formInput}
                  value={manualForm.patientLastName}
                  onChangeText={(v) => updateFormField('patientLastName', v)}
                  placeholder="Last name"
                  placeholderTextColor="#C4C9D4"
                  testID="manual-last-name"
                />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.formLabel}>ID Number</Text>
                  <TextInput
                    style={styles.formInput}
                    value={manualForm.idNumber}
                    onChangeText={(v) => updateFormField('idNumber', v)}
                    placeholder="ID number"
                    placeholderTextColor="#C4C9D4"
                    keyboardType="numeric"
                    testID="manual-id"
                  />
                </View>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.formLabel}>Contact</Text>
                  <TextInput
                    style={styles.formInput}
                    value={manualForm.contactNumber}
                    onChangeText={(v) => updateFormField('contactNumber', v)}
                    placeholder="Phone number"
                    placeholderTextColor="#C4C9D4"
                    keyboardType="phone-pad"
                    testID="manual-contact"
                  />
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Procedure</Text>
                <TextInput
                  style={styles.formInput}
                  value={manualForm.procedure}
                  onChangeText={(v) => updateFormField('procedure', v)}
                  placeholder="e.g. X-ray left knee"
                  placeholderTextColor="#C4C9D4"
                  testID="manual-procedure"
                />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.formLabel}>Referring Doctor</Text>
                  <TextInput
                    style={styles.formInput}
                    value={manualForm.referringDoctor}
                    onChangeText={(v) => updateFormField('referringDoctor', v)}
                    placeholder="Doctor name"
                    placeholderTextColor="#C4C9D4"
                    testID="manual-doctor"
                  />
                </View>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.formLabel}>Ward / Theatre</Text>
                  <TextInput
                    style={styles.formInput}
                    value={manualForm.ward}
                    onChangeText={(v) => updateFormField('ward', v)}
                    placeholder="Ward"
                    placeholderTextColor="#C4C9D4"
                    testID="manual-ward"
                  />
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Hospital / Facility</Text>
                <TextInput
                  style={styles.formInput}
                  value={manualForm.hospital}
                  onChangeText={(v) => updateFormField('hospital', v)}
                  placeholder="Hospital name"
                  placeholderTextColor="#C4C9D4"
                  testID="manual-hospital"
                />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.formLabel}>Medical Aid</Text>
                  <TextInput
                    style={styles.formInput}
                    value={manualForm.medicalAidName}
                    onChangeText={(v) => updateFormField('medicalAidName', v)}
                    placeholder="Scheme name"
                    placeholderTextColor="#C4C9D4"
                    testID="manual-med-aid"
                  />
                </View>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.formLabel}>Member No.</Text>
                  <TextInput
                    style={styles.formInput}
                    value={manualForm.membershipNumber}
                    onChangeText={(v) => updateFormField('membershipNumber', v)}
                    placeholder="Membership #"
                    placeholderTextColor="#C4C9D4"
                    testID="manual-member-no"
                  />
                </View>
              </View>

              <View style={[styles.formField, { marginBottom: 24 }]}>
                <Text style={styles.formLabel}>Notes</Text>
                <TextInput
                  style={[styles.formInput, styles.formInputMulti]}
                  value={manualForm.notes}
                  onChangeText={(v) => updateFormField('notes', v)}
                  placeholder="Additional notes..."
                  placeholderTextColor="#C4C9D4"
                  multiline
                  numberOfLines={3}
                  testID="manual-notes"
                />
              </View>
            </ScrollView>

            <View style={styles.addEntryButtons}>
              <TouchableOpacity
                style={styles.addEntryCancelBtn}
                onPress={() => setShowAddEntry(false)}
              >
                <Text style={styles.addEntryCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.addEntrySaveBtn,
                  (!manualForm.patientFirstName.trim() && !manualForm.patientLastName.trim()) && styles.addEntrySaveBtnDisabled,
                ]}
                onPress={handleSaveManualEntry}
                disabled={saveManualEntryMutation.isPending}
                testID="save-manual-entry"
              >
                {saveManualEntryMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.addEntrySaveText}>Add Entry</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showUrlConfig}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUrlConfig(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.urlModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Spreadsheet URL</Text>
              <TouchableOpacity onPress={() => setShowUrlConfig(false)} testID="close-url-modal">
                <X size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <Text style={styles.urlHelpText}>
              Enter the URL of your worklist spreadsheet. Supports:
            </Text>
            <View style={styles.urlHelpList}>
              <Text style={styles.urlHelpItem}>• Airtable (table URL with PAT configured)</Text>
              <Text style={styles.urlHelpItem}>• OneDrive Excel (sharing link)</Text>
              <Text style={styles.urlHelpItem}>• Google Sheets (share link or published URL)</Text>
              <Text style={styles.urlHelpItem}>• Any direct URL to .xlsx or .csv file</Text>
            </View>

            <TextInput
              style={styles.urlInput}
              value={urlInput}
              onChangeText={setUrlInput}
              placeholder="https://airtable.com/appXXX/tblXXX/viwXXX"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              numberOfLines={3}
              testID="url-input"
            />

            <View style={styles.urlButtons}>
              <TouchableOpacity
                style={styles.urlCancelButton}
                onPress={() => setShowUrlConfig(false)}
              >
                <Text style={styles.urlCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.urlSaveButton, !urlInput.trim() && styles.urlSaveButtonDisabled]}
                onPress={() => saveUrlMutation.mutate(urlInput.trim())}
                disabled={!urlInput.trim() || saveUrlMutation.isPending}
                testID="save-url"
              >
                {saveUrlMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.urlSaveText}>Save & Load</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity
        style={styles.fab}
        onPress={handleOpenAddEntry}
        activeOpacity={0.85}
        testID="add-entry-fab"
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  calendarHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 12,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 16,
  },
  weekNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  todayBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#0EA5E9',
  },
  weekStrip: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 4,
    justifyContent: 'center',
    width: '100%',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    minWidth: 44,
    gap: 3,
  },
  dayCellSelected: {
    backgroundColor: '#0F172A',
  },
  dayCellToday: {
    backgroundColor: '#F0F9FF',
  },
  dayCellLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#9CA3AF',
    textTransform: 'uppercase' as const,
  },
  dayCellLabelSelected: {
    color: '#94A3B8',
  },
  dayCellNum: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1F2937',
  },
  dayCellNumSelected: {
    color: '#FFFFFF',
  },
  dayCellNumToday: {
    color: '#0EA5E9',
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#0EA5E9',
  },
  dayDotSelected: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#38BDF8',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dayHeaderLeft: {
    flex: 1,
    gap: 2,
  },
  dayHeaderDate: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#111827',
  },
  dayHeaderCount: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  dayHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchToggle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    height: 40,
  },
  diaryContent: {
    flex: 1,
  },
  entriesList: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  diaryEntry: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timelineIndicator: {
    width: 24,
    alignItems: 'center',
    paddingTop: 6,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  entryContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginLeft: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  entryPatientInfo: {
    flex: 1,
    gap: 2,
  },
  entryPatientName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
  },
  entryIdNumber: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500' as const,
  },
  entryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  entryBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  entryProcedureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F9FAFB',
  },
  entryProcedureText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  entryDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  entryDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  entryDetailText: {
    fontSize: 12,
    color: '#9CA3AF',
    maxWidth: 140,
  },
  entryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F9FAFB',
  },
  tapHint: {
    fontSize: 11,
    color: '#D1D5DB',
    fontWeight: '500' as const,
  },
  emptyDay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyDayTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#374151',
    marginTop: 14,
    marginBottom: 6,
  },
  emptyDayText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  configBtn: {
    marginTop: 18,
    backgroundColor: '#0F172A',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 10,
  },
  configBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  retryBtn: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EF4444',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#111827',
  },
  patientSummary: {
    alignItems: 'center',
    marginBottom: 24,
  },
  summaryAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  summaryName: {
    fontSize: 19,
    fontWeight: '700' as const,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  summaryDetail: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryProcedureBadge: {
    marginTop: 8,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  summaryProcedure: {
    fontSize: 13,
    color: '#0369A1',
    fontWeight: '500' as const,
    textAlign: 'center',
  },
  chooseFormText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#9CA3AF',
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  formTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
    gap: 12,
  },
  formTypeIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTypeInfo: {
    flex: 1,
  },
  formTypeTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
    marginBottom: 2,
  },
  formTypeDesc: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  urlModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
  },
  urlHelpText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  urlHelpList: {
    marginBottom: 16,
    gap: 3,
  },
  urlHelpItem: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  urlInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  urlButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  urlCancelButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  urlCancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#6B7280',
  },
  urlSaveButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    alignItems: 'center',
  },
  urlSaveButtonDisabled: {
    opacity: 0.4,
  },
  urlSaveText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  entryContentManual: {
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  manualBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  manualBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#059669',
  },
  entryFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  entryNotes: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic' as const,
    flex: 1,
  },
  deleteEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
  },
  deleteEntryText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#EF4444',
  },
  addEntryModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  addEntryDateLabel: {
    fontSize: 14,
    color: '#0EA5E9',
    fontWeight: '600' as const,
    marginBottom: 16,
    backgroundColor: '#EFF6FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addEntryScroll: {
    maxHeight: 400,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  formField: {
    marginBottom: 12,
  },
  formFieldSmall: {
    width: 80,
  },
  formFieldLarge: {
    flex: 1,
  },
  formFieldHalf: {
    flex: 1,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#6B7280',
    marginBottom: 5,
  },
  formInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  formInputMulti: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  addEntryButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  addEntryCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  addEntryCancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#6B7280',
  },
  addEntrySaveBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    alignItems: 'center',
  },
  addEntrySaveBtnDisabled: {
    opacity: 0.4,
  },
  addEntrySaveText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
