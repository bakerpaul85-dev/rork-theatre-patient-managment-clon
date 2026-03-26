import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useForms, FormData } from '@/contexts/FormsContext';
import { useRouter } from 'expo-router';
import { FileText, Clock, CheckCircle, Trash2 } from 'lucide-react-native';

export default function FormsListScreen() {
  const { getDrafts, getSubmittedForms, deleteForm } = useForms();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'drafts' | 'submitted'>('drafts');
  const [deletingFormId, setDeletingFormId] = useState<string | null>(null);

  const drafts = getDrafts();
  const submittedForms = getSubmittedForms();

  const handleContinueForm = (form: FormData) => {
    const pathname = form.formType === 'medical-aid' ? '/(tabs)/medical-aid' : '/(tabs)/coida';
    router.push({ pathname, params: { formId: form.id } } as any);
  };

  const handleDeleteForm = (form: FormData) => {
    const patientName = `${form.patientTitle} ${form.patientFirstName} ${form.patientLastName}`.trim() || 'Unnamed Patient';
    Alert.alert(
      'Delete Draft',
      `Are you sure you want to delete the draft for ${patientName}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingFormId(form.id);
            try {
              await deleteForm(form.id);
              Alert.alert('Success', 'Draft deleted successfully');
            } catch (error) {
              console.error('Error deleting form:', error);
              Alert.alert('Error', 'Failed to delete draft. Please try again.');
            } finally {
              setDeletingFormId(null);
            }
          },
        },
      ]
    );
  };

  const renderFormCard = (form: FormData) => {
    const patientName = `${form.patientTitle} ${form.patientFirstName} ${form.patientLastName}`.trim();
    const displayName = patientName || 'Unnamed Patient';
    const date = new Date(form.updatedAt).toLocaleDateString();
    const time = new Date(form.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View key={form.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <FileText size={24} color="#0066CC" />
            <View style={styles.cardHeaderText}>
              <Text style={styles.patientName}>{displayName}</Text>
              <Text style={styles.cardDate}>
                {date} at {time}
              </Text>
            </View>
          </View>
          {form.status === 'draft' && (
            <View style={styles.draftBadge}>
              <Clock size={14} color="#FF9500" />
              <Text style={styles.draftBadgeText}>Draft</Text>
            </View>
          )}
          {form.status === 'submitted' && (
            <View style={styles.submittedBadge}>
              <CheckCircle size={14} color="#00A3A3" />
              <Text style={styles.submittedBadgeText}>Submitted</Text>
            </View>
          )}
        </View>

        <View style={styles.cardDetails}>
          {form.idNumber && (
            <Text style={styles.detailText}>ID: {form.idNumber}</Text>
          )}
          {form.procedure && (
            <Text style={styles.detailText} numberOfLines={2}>
              Procedure: {form.procedure}
            </Text>
          )}
          {form.medicalAidName && (
            <Text style={styles.detailText}>Medical Aid: {form.medicalAidName}</Text>
          )}
        </View>

        <View style={styles.cardActions}>
          {form.status === 'draft' && (
            <>
              <TouchableOpacity
                style={styles.continueButton}
                onPress={() => handleContinueForm(form)}
              >
                <Text style={styles.continueButtonText}>Continue</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteButton, deletingFormId === form.id && styles.deleteButtonDisabled]}
                onPress={() => handleDeleteForm(form)}
                disabled={deletingFormId === form.id}
              >
                {deletingFormId === form.id ? (
                  <ActivityIndicator size="small" color="#DC3545" />
                ) : (
                  <Trash2 size={20} color="#DC3545" />
                )}
              </TouchableOpacity>
            </>
          )}
          {form.status === 'submitted' && (
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => handleContinueForm(form)}
            >
              <Text style={styles.viewButtonText}>View</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'drafts' && styles.tabActive]}
          onPress={() => setActiveTab('drafts')}
        >
          <Text style={[styles.tabText, activeTab === 'drafts' && styles.tabTextActive]}>
            Drafts ({drafts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'submitted' && styles.tabActive]}
          onPress={() => setActiveTab('submitted')}
        >
          <Text style={[styles.tabText, activeTab === 'submitted' && styles.tabTextActive]}>
            Submitted ({submittedForms.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'drafts' && (
          <>
            {drafts.length === 0 ? (
              <View style={styles.emptyState}>
                <Clock size={48} color="#CCC" />
                <Text style={styles.emptyStateTitle}>No Draft Forms</Text>
                <Text style={styles.emptyStateText}>
                  Start a new form and save it as a draft to continue later
                </Text>
              </View>
            ) : (
              drafts.map(renderFormCard)
            )}
          </>
        )}

        {activeTab === 'submitted' && (
          <>
            {submittedForms.length === 0 ? (
              <View style={styles.emptyState}>
                <CheckCircle size={48} color="#CCC" />
                <Text style={styles.emptyStateTitle}>No Submitted Forms</Text>
                <Text style={styles.emptyStateText}>
                  Completed forms will appear here
                </Text>
              </View>
            ) : (
              submittedForms.map(renderFormCard)
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E4E8',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#0066CC',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#6C757D',
  },
  tabTextActive: {
    color: '#0066CC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#333333',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 14,
    color: '#6C757D',
  },
  draftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  draftBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FF9500',
  },
  submittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E7F9F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  submittedBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#00A3A3',
  },
  cardDetails: {
    marginBottom: 12,
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#6C757D',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  continueButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  viewButton: {
    backgroundColor: '#00A3A3',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  deleteButton: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DC3545',
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#333333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 24,
  },
});
