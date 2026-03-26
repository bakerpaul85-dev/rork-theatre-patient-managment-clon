import React, { useState, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  UserPlus,
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
  AlertCircle,
  Settings,
} from 'lucide-react-native';
import { fetchWorklist, WorklistPatient } from '@/utils/worklistService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WORKLIST_URL_KEY = '@worklist_spreadsheet_url';

export default function WorklistScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<WorklistPatient | null>(null);
  const [showUrlConfig, setShowUrlConfig] = useState<boolean>(false);
  const [urlInput, setUrlInput] = useState<string>('');

  const savedUrlQuery = useQuery({
    queryKey: ['worklist-url'],
    queryFn: async () => {
      const saved = await AsyncStorage.getItem(WORKLIST_URL_KEY);
      return saved || process.env.EXPO_PUBLIC_GOOGLE_SHEET_URL || '';
    },
  });

  const spreadsheetUrl = savedUrlQuery.data || '';

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
      Alert.alert('Success', 'Spreadsheet URL saved. Refreshing worklist...');
    },
  });

  const patients = useMemo(() => worklistQuery.data || [], [worklistQuery.data]);

  const filteredPatients = useMemo(() => {
    if (!searchText.trim()) return patients;
    const lower = searchText.toLowerCase();
    return patients.filter((p) => {
      const fullName = `${p.patientFirstName} ${p.patientLastName}`.toLowerCase();
      const idMatch = p.idNumber.toLowerCase().includes(lower);
      const nameMatch = fullName.includes(lower);
      const procedureMatch = p.procedure.toLowerCase().includes(lower);
      const employerMatch = p.employerName.toLowerCase().includes(lower);
      const coidaMatch = p.coidaNumber.toLowerCase().includes(lower);
      const medAidMatch = p.medicalAidName.toLowerCase().includes(lower);
      return nameMatch || idMatch || procedureMatch || employerMatch || coidaMatch || medAidMatch;
    });
  }, [patients, searchText]);

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

  const getFormTypeBadge = (formType: string) => {
    if (formType === 'coida') {
      return { label: 'COIDA', color: '#00A3A3', bg: '#E7F9F9' };
    }
    if (formType === 'medical-aid') {
      return { label: 'Medical Aid', color: '#0066CC', bg: '#E8F0FE' };
    }
    return { label: 'Unknown', color: '#6C757D', bg: '#F0F0F0' };
  };

  const renderPatientCard = useCallback(({ item }: { item: WorklistPatient }) => {
    const badge = getFormTypeBadge(item.formType);
    const fullName = `${item.patientFirstName} ${item.patientLastName}`.trim();

    return (
      <TouchableOpacity
        style={styles.patientCard}
        onPress={() => handleSelectPatient(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          <View style={styles.avatarContainer}>
            <User size={20} color="#FFFFFF" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.patientName} numberOfLines={1}>
              {item.patientTitle ? `${item.patientTitle} ` : ''}{fullName || 'Unknown Patient'}
            </Text>
            {item.idNumber ? (
              <View style={styles.infoRow}>
                <Hash size={12} color="#8E8E93" />
                <Text style={styles.infoText}>{item.idNumber}</Text>
              </View>
            ) : null}
          </View>
          <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.typeBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        <View style={styles.cardBottom}>
          {item.procedure ? (
            <View style={styles.detailChip}>
              <Text style={styles.detailChipText} numberOfLines={1}>{item.procedure}</Text>
            </View>
          ) : null}
          {item.dateOfProcedure ? (
            <View style={styles.detailChip}>
              <Calendar size={10} color="#6C757D" />
              <Text style={styles.detailChipText}>{item.dateOfProcedure}</Text>
            </View>
          ) : null}
          {item.employerName ? (
            <View style={styles.detailChip}>
              <Building2 size={10} color="#6C757D" />
              <Text style={styles.detailChipText} numberOfLines={1}>{item.employerName}</Text>
            </View>
          ) : null}
          {item.medicalAidName ? (
            <View style={styles.detailChip}>
              <Text style={styles.detailChipText} numberOfLines={1}>{item.medicalAidName}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardArrow}>
          <ChevronRight size={18} color="#C7C7CC" />
        </View>
      </TouchableOpacity>
    );
  }, [handleSelectPatient]);

  const renderEmpty = () => {
    if (!spreadsheetUrl) {
      return (
        <View style={styles.emptyState}>
          <Settings size={48} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>No Spreadsheet Configured</Text>
          <Text style={styles.emptyText}>
            Tap the gear icon above to set your worklist spreadsheet URL.
            Supports Google Sheets and OneDrive Excel files.
          </Text>
          <TouchableOpacity style={styles.configButton} onPress={handleOpenUrlConfig}>
            <Text style={styles.configButtonText}>Configure Spreadsheet</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (worklistQuery.isLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.emptyTitle}>Loading Worklist...</Text>
          <Text style={styles.emptyText}>Fetching patient data from spreadsheet</Text>
        </View>
      );
    }

    if (worklistQuery.isError) {
      return (
        <View style={styles.emptyState}>
          <AlertCircle size={48} color="#DC3545" />
          <Text style={styles.emptyTitle}>Failed to Load Worklist</Text>
          <Text style={styles.emptyText}>
            {worklistQuery.error instanceof Error ? worklistQuery.error.message : 'Could not fetch spreadsheet data. Check that the URL is publicly accessible.'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => worklistQuery.refetch()}
          >
            <RefreshCw size={16} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.configButton, { marginTop: 8 }]}
            onPress={handleOpenUrlConfig}
          >
            <Text style={styles.configButtonText}>Change URL</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (searchText) {
      return (
        <View style={styles.emptyState}>
          <Search size={48} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>No Results</Text>
          <Text style={styles.emptyText}>No patients match "{searchText}"</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <UserPlus size={48} color="#C7C7CC" />
        <Text style={styles.emptyTitle}>No Patients Found</Text>
        <Text style={styles.emptyText}>The spreadsheet appears to be empty or has no recognizable patient data.</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <View style={styles.searchInputContainer}>
          <Search size={18} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search name, ID, procedure..."
            placeholderTextColor="#8E8E93"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <X size={18} color="#8E8E93" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity style={styles.gearButton} onPress={handleOpenUrlConfig}>
          <Settings size={20} color="#0066CC" />
        </TouchableOpacity>
      </View>

      {patients.length > 0 && (
        <View style={styles.statsBar}>
          <Text style={styles.statsText}>
            {filteredPatients.length} of {patients.length} patient{patients.length !== 1 ? 's' : ''}
          </Text>
          {worklistQuery.isFetching && (
            <ActivityIndicator size="small" color="#0066CC" style={{ marginLeft: 8 }} />
          )}
        </View>
      )}

      <FlatList
        data={filteredPatients}
        keyExtractor={(item) => item.id}
        renderItem={renderPatientCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={worklistQuery.isFetching && !worklistQuery.isLoading}
            onRefresh={() => worklistQuery.refetch()}
            tintColor="#0066CC"
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

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
                  <TouchableOpacity onPress={() => setSelectedPatient(null)}>
                    <X size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                <View style={styles.patientSummary}>
                  <View style={styles.summaryAvatar}>
                    <User size={28} color="#FFFFFF" />
                  </View>
                  <Text style={styles.summaryName}>
                    {selectedPatient.patientTitle ? `${selectedPatient.patientTitle} ` : ''}
                    {selectedPatient.patientFirstName} {selectedPatient.patientLastName}
                  </Text>
                  {selectedPatient.idNumber ? (
                    <View style={styles.summaryRow}>
                      <Hash size={14} color="#6C757D" />
                      <Text style={styles.summaryDetail}>{selectedPatient.idNumber}</Text>
                    </View>
                  ) : null}
                  {selectedPatient.contactNumber ? (
                    <View style={styles.summaryRow}>
                      <Phone size={14} color="#6C757D" />
                      <Text style={styles.summaryDetail}>{selectedPatient.contactNumber}</Text>
                    </View>
                  ) : null}
                  {selectedPatient.procedure ? (
                    <Text style={styles.summaryProcedure}>{selectedPatient.procedure}</Text>
                  ) : null}
                </View>

                <Text style={styles.chooseFormText}>Choose form type:</Text>

                <TouchableOpacity
                  style={styles.formTypeButton}
                  onPress={() => handleLoadIntoForm(selectedPatient, 'medical-aid')}
                >
                  <View style={[styles.formTypeIcon, { backgroundColor: '#E8F0FE' }]}>
                    <FileText size={22} color="#0066CC" />
                  </View>
                  <View style={styles.formTypeInfo}>
                    <Text style={styles.formTypeTitle}>Medical Aid Form</Text>
                    <Text style={styles.formTypeDesc}>Patient with medical aid coverage</Text>
                  </View>
                  <ChevronRight size={20} color="#C7C7CC" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.formTypeButton}
                  onPress={() => handleLoadIntoForm(selectedPatient, 'coida')}
                >
                  <View style={[styles.formTypeIcon, { backgroundColor: '#E7F9F9' }]}>
                    <ClipboardList size={22} color="#00A3A3" />
                  </View>
                  <View style={styles.formTypeInfo}>
                    <Text style={styles.formTypeTitle}>COIDA Form</Text>
                    <Text style={styles.formTypeDesc}>Compensation for occupational injuries</Text>
                  </View>
                  <ChevronRight size={20} color="#C7C7CC" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
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
              <TouchableOpacity onPress={() => setShowUrlConfig(false)}>
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.urlHelpText}>
              Enter the URL of your worklist spreadsheet. Supports:
            </Text>
            <View style={styles.urlHelpList}>
              <Text style={styles.urlHelpItem}>- Google Sheets (share link or published URL)</Text>
              <Text style={styles.urlHelpItem}>- OneDrive Excel (sharing link)</Text>
              <Text style={styles.urlHelpItem}>- Any direct URL to .xlsx or .csv file</Text>
            </View>

            <TextInput
              style={styles.urlInput}
              value={urlInput}
              onChangeText={setUrlInput}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              numberOfLines={3}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    gap: 10,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    height: 40,
  },
  gearButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  statsText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500' as const,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  separator: {
    height: 10,
  },
  patientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0066CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  patientName: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#1C1C1E',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  cardBottom: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingLeft: 52,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detailChipText: {
    fontSize: 12,
    color: '#6C757D',
    maxWidth: 140,
  },
  cardArrow: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -9,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  configButton: {
    marginTop: 20,
    backgroundColor: '#0066CC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  configButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  retryButton: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DC3545',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
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
    color: '#1C1C1E',
  },
  patientSummary: {
    alignItems: 'center',
    marginBottom: 24,
  },
  summaryAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0066CC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  summaryName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  summaryDetail: {
    fontSize: 15,
    color: '#6C757D',
  },
  summaryProcedure: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500' as const,
    marginTop: 8,
    textAlign: 'center',
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  chooseFormText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#8E8E93',
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  formTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F9F9F9',
    marginBottom: 10,
    gap: 14,
  },
  formTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTypeInfo: {
    flex: 1,
  },
  formTypeTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    marginBottom: 2,
  },
  formTypeDesc: {
    fontSize: 13,
    color: '#8E8E93',
  },
  urlModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
  },
  urlHelpText: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 8,
    lineHeight: 20,
  },
  urlHelpList: {
    marginBottom: 16,
    gap: 2,
  },
  urlHelpItem: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 20,
  },
  urlInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: '#1C1C1E',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  urlButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  urlCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  urlCancelText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#6C757D',
  },
  urlSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#0066CC',
    alignItems: 'center',
  },
  urlSaveButtonDisabled: {
    opacity: 0.5,
  },
  urlSaveText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
