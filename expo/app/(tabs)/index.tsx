import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { FileText, ClipboardList, AlertCircle, ListChecks } from 'lucide-react-native';

import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useForms } from '@/contexts/FormsContext';

interface FormOption {
  id: string;
  title: string;
  description: string;
  icon: typeof FileText;
  color: string;
  route: string;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { getDrafts } = useForms();
  const router = useRouter();

  const drafts = getDrafts();
  const draftCount = drafts.length;

  const handleFormPress = useCallback((formType: 'medical-aid' | 'coida' | 'worklist') => {
    if (formType === 'worklist') {
      router.push('/(tabs)/worklist' as any);
      return;
    }
    const route = formType === 'coida' ? '/(tabs)/coida' : '/(tabs)/medical-aid';
    router.push(route as any);
  }, [router]);

  const formOptions: FormOption[] = [
    {
      id: 'medical-aid',
      title: 'Medical Aid Form',
      description: 'Patient registration with medical aid coverage',
      icon: FileText,
      color: '#0066CC',
      route: '/(tabs)/medical-aid',
    },
    {
      id: 'coida',
      title: 'COIDA Form',
      description: 'Compensation for Occupational Injuries and Diseases',
      icon: ClipboardList,
      color: '#00A3A3',
      route: '/(tabs)/coida',
    },
    {
      id: 'worklist',
      title: 'Worklist',
      description: 'View daily patient diary and schedule',
      icon: ListChecks,
      color: '#7C3AED',
      route: '/(tabs)/worklist',
    },
  ];

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=2070' }}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <Text style={styles.subtitle}>Select a form type to begin</Text>
      </View>

      {draftCount > 0 && (
        <TouchableOpacity
          style={styles.warningBanner}
          onPress={() => router.push('/(tabs)/forms' as never)}
          activeOpacity={0.7}
        >
          <View style={styles.warningIconContainer}>
            <AlertCircle size={24} color="#FF9500" />
          </View>
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>
              {draftCount} {draftCount === 1 ? 'Draft' : 'Drafts'} Waiting
            </Text>
            <Text style={styles.warningText}>
              You have incomplete {draftCount === 1 ? 'form' : 'forms'} to complete. Tap to view.
            </Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.cardsContainer}>
        {formOptions.map((option) => {
          const IconComponent = option.icon;
          return (
            <TouchableOpacity
              key={option.id}
              style={styles.card}
              onPress={() => handleFormPress(option.id as 'medical-aid' | 'coida' | 'worklist')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${option.color}15` }]}>
                <IconComponent size={32} color={option.color} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{option.title}</Text>
                <Text style={styles.cardDescription}>{option.description}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  contentContainer: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  welcomeText: {
    fontSize: 16,
    color: '#6C757D',
    marginBottom: 4,
  },
  userName: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#0066CC',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6C757D',
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#333333',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6C757D',
    lineHeight: 20,
  },
  warningBanner: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  warningIconContainer: {
    marginRight: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FF9500',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#8B6F00',
    lineHeight: 20,
  },
});
