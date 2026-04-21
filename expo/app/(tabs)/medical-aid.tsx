import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  Keyboard,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import * as MailComposer from 'expo-mail-composer';
import { generateHL7File } from '@/utils/hl7Generator';
import { FormData as ContextFormData } from '@/contexts/FormsContext';
import { Camera, X, Check, Save, Search, ChevronDown, XCircle, CheckSquare, Square, MapPin } from 'lucide-react-native';
import { MEDICAL_AID_NAMES } from '@/constants/medicalAids';
import { useAuth } from '@/contexts/AuthContext';
import { useForms, PhotoMetadata } from '@/contexts/FormsContext';
import { useLocalSearchParams, useRouter, Stack, useNavigation } from 'expo-router';


type Title = 'Mr' | 'Mrs' | 'Miss' | 'Ms' | 'Dr' | 'Prof';

interface FormData {
  formType: 'medical-aid' | 'coida';
  hospitalStickerPhoto: string | null;
  hospitalStickerPhotoMetadata?: PhotoMetadata;
  date: string;
  patientTitle: Title;
  patientFirstName: string;
  patientLastName: string;
  idNumber: string;
  dateOfBirth: string;
  contactNumber: string;
  email: string;
  hospitalServiceProvider: string;
  ward: string;
  referringDoctor: string;
  doctorPracticeNumber: string;
  mainMemberTitle: Title;
  mainMemberFirstName: string;
  mainMemberLastName: string;
  mainMemberIdNumber: string;
  medicalAidName: string;
  medicalAidPlan: string;
  membershipNumber: string;
  dependantCode: string;
  nextOfKinName: string;
  nextOfKinContactNumber: string;
  procedure: string;
  icd10Code: string;
  timeInTheatrePhoto: string | null;
  timeInTheatrePhotoMetadata?: PhotoMetadata;
  screeningTimeText: string;
  reasonForTimeDiscrepancy?: string;
  timeCArmTakenIn: string;
  timeOutTheatrePhoto: string | null;
  timeOutTheatrePhotoMetadata?: PhotoMetadata;
  timeCArmTakenOut: string;
  radiographerName: string;
  radiographerSignatureTimestamp: string;
  radiographerSignatureLocation: string;
}

type CameraMode = 'hospitalSticker' | 'timeInTheatre' | 'timeOutTheatre' | null;

interface MedicalAidDropdownProps {
  value: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
}

function MedicalAidDropdown({ value, onSelect, disabled }: MedicalAidDropdownProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');

  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return [...MEDICAL_AID_NAMES];
    const lower = searchText.toLowerCase();
    return MEDICAL_AID_NAMES.filter(name => name.toLowerCase().includes(lower));
  }, [searchText]);

  const handleSelect = useCallback((item: string) => {
    onSelect(item);
    setSearchText('');
    setIsOpen(false);
    Keyboard.dismiss();
  }, [onSelect]);

  const handleClear = useCallback(() => {
    onSelect('');
    setSearchText('');
  }, [onSelect]);

  const handleOpen = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    setSearchText('');
  }, [disabled]);

  if (isOpen) {
    return (
      <View style={dropdownStyles.field}>
        <Text style={dropdownStyles.label}>Medical Aid Name *</Text>
        <View style={dropdownStyles.searchContainer}>
          <Search size={18} color="#999" />
          <TextInput
            style={dropdownStyles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search medical aid..."
            autoFocus
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => { setIsOpen(false); setSearchText(''); }}>
            <X size={20} color="#666" />
          </TouchableOpacity>
        </View>
        <View style={dropdownStyles.listContainer}>
          <ScrollView
            style={dropdownStyles.list}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {filteredItems.length === 0 ? (
              <View style={dropdownStyles.emptyContainer}>
                <Text style={dropdownStyles.emptyText}>No results found</Text>
              </View>
            ) : (
              filteredItems.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    dropdownStyles.listItem,
                    value === item && dropdownStyles.listItemActive,
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text
                    style={[
                      dropdownStyles.listItemText,
                      value === item && dropdownStyles.listItemTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                  {value === item && <Check size={16} color="#0066CC" />}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={dropdownStyles.field}>
      <Text style={dropdownStyles.label}>Medical Aid Name *</Text>
      <TouchableOpacity
        style={dropdownStyles.selector}
        onPress={handleOpen}
        disabled={disabled}
      >
        <Text
          style={[
            dropdownStyles.selectorText,
            !value && dropdownStyles.selectorPlaceholder,
          ]}
          numberOfLines={1}
        >
          {value || 'Select medical aid'}
        </Text>
        <View style={dropdownStyles.selectorIcons}>
          {value ? (
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <XCircle size={20} color="#999" />
            </TouchableOpacity>
          ) : null}
          <ChevronDown size={20} color="#666" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const dropdownStyles = StyleSheet.create({
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#333333',
    marginBottom: 8,
  },
  selector: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E1E4E8',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorText: {
    fontSize: 16,
    color: '#333333',
    flex: 1,
  },
  selectorPlaceholder: {
    color: '#999999',
  },
  selectorIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchContainer: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#0066CC',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    padding: 0,
  },
  listContainer: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E1E4E8',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    maxHeight: 220,
    overflow: 'hidden',
  },
  list: {
    maxHeight: 220,
  },
  listItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listItemActive: {
    backgroundColor: '#E7F3FF',
  },
  listItemText: {
    fontSize: 15,
    color: '#333333',
    flex: 1,
  },
  listItemTextActive: {
    color: '#0066CC',
    fontWeight: '600' as const,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999999',
  },
});

export default function MedicalAidFormScreen() {
  const { user } = useAuth();
  const { saveDraft, updateDraft, submitForm, getForm } = useForms();
  const router = useRouter();
  const params = useLocalSearchParams<{ formId?: string; wl_firstName?: string; wl_lastName?: string; wl_title?: string; wl_idNumber?: string; wl_dob?: string; wl_contact?: string; wl_email?: string; wl_procedure?: string; wl_icd10?: string; wl_medicalAid?: string; wl_medicalAidPlan?: string; wl_membershipNumber?: string; wl_dependantCode?: string; wl_dateOfProcedure?: string; wl_mainMemberTitle?: string; wl_mainMemberFirstName?: string; wl_mainMemberLastName?: string; wl_mainMemberIdNumber?: string; wl_referringDoctor?: string; wl_doctorPracticeNumber?: string; wl_hospital?: string; wl_ward?: string; wl_fromWorklist?: string; wl_atRecordId?: string; wl_atBaseId?: string; wl_atTableId?: string }>();
  const isFromWorklist = params.wl_fromWorklist === 'true';
  const [currentFormId, setCurrentFormId] = useState<string | null>(params.formId || null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>(null);
  const [cameraRef, setCameraRef] = useState<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollPositionRef = useRef<number>(0);
  const navigation = useNavigation();
  const hasUnsavedChangesRef = useRef<boolean>(false);

  const formatDateToDDMMYYYY = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}${month}${year}`;
  };

  const matchMedicalAidName = (input: string): string => {
    if (!input) return '';
    const exact = MEDICAL_AID_NAMES.find(n => n === input);
    if (exact) return exact;
    const lower = input.toLowerCase().trim();
    const caseMatch = MEDICAL_AID_NAMES.find(n => n.toLowerCase() === lower);
    if (caseMatch) return caseMatch;
    const partialMatch = MEDICAL_AID_NAMES.find(n => n.toLowerCase().includes(lower) || lower.includes(n.toLowerCase()));
    if (partialMatch) return partialMatch;
    console.log('[MedicalAid] No match found for medical aid name:', input, '- using raw value');
    return input;
  };

  const getInitialFormData = (): FormData => ({
    formType: 'medical-aid',
    hospitalStickerPhoto: null,
    date: formatDateToDDMMYYYY(new Date()),
    patientTitle: 'Mr',
    patientFirstName: '',
    patientLastName: '',
    idNumber: '',
    dateOfBirth: '',
    contactNumber: '',
    email: '',
    hospitalServiceProvider: '',
    ward: '',
    referringDoctor: '',
    doctorPracticeNumber: '',
    mainMemberTitle: 'Mr',
    mainMemberFirstName: '',
    mainMemberLastName: '',
    mainMemberIdNumber: '',
    medicalAidName: '',
    medicalAidPlan: '',
    membershipNumber: '',
    dependantCode: '',
    nextOfKinName: '',
    nextOfKinContactNumber: '',
    procedure: '',
    icd10Code: '',
    timeInTheatrePhoto: null,
    screeningTimeText: '',
    reasonForTimeDiscrepancy: '',
    timeCArmTakenIn: '',
    timeOutTheatrePhoto: null,
    timeCArmTakenOut: '',
    radiographerName: user?.name || 'Dr. Smith',
    radiographerSignatureTimestamp: '',
    radiographerSignatureLocation: '',
  });

  const [formData, setFormData] = useState<FormData>(getInitialFormData());
  const [sameAsPatient, setSameAsPatient] = useState<boolean>(false);

  const isReadOnly = formData.radiographerSignatureTimestamp !== '';

  useEffect(() => {
    if (params.formId && typeof params.formId === 'string') {
      const existingForm = getForm(params.formId);
      if (existingForm) {
        setFormData(existingForm);
        setCurrentFormId(params.formId);
        hasUnsavedChangesRef.current = false;
      }
    } else {
      const freshForm = getInitialFormData();

      if (params.wl_firstName || params.wl_lastName || params.wl_idNumber) {
        console.log('[MedicalAid] Loading worklist patient data into form');
        if (params.wl_firstName) freshForm.patientFirstName = params.wl_firstName;
        if (params.wl_lastName) freshForm.patientLastName = params.wl_lastName;
        if (params.wl_title) {
          const validTitles: Title[] = ['Mr', 'Mrs', 'Miss', 'Ms', 'Dr', 'Prof'];
          const matched = validTitles.find(t => t.toLowerCase() === params.wl_title?.toLowerCase());
          if (matched) freshForm.patientTitle = matched;
        }
        if (params.wl_idNumber) {
          freshForm.idNumber = params.wl_idNumber;
          const isNumericOnly = /^\d+$/.test(params.wl_idNumber);
          if (isNumericOnly && params.wl_idNumber.length === 13) {
            freshForm.dateOfBirth = parseSouthAfricanID(params.wl_idNumber);
          }
        }
        if (params.wl_dob) freshForm.dateOfBirth = params.wl_dob;
        if (params.wl_contact) freshForm.contactNumber = params.wl_contact;
        if (params.wl_email) freshForm.email = params.wl_email;
        if (params.wl_procedure) freshForm.procedure = params.wl_procedure;
        if (params.wl_icd10) freshForm.icd10Code = params.wl_icd10;
        if (params.wl_medicalAid) freshForm.medicalAidName = matchMedicalAidName(params.wl_medicalAid);
        if (params.wl_medicalAidPlan) freshForm.medicalAidPlan = params.wl_medicalAidPlan;
        if (params.wl_membershipNumber) freshForm.membershipNumber = params.wl_membershipNumber;
        if (params.wl_dependantCode) freshForm.dependantCode = params.wl_dependantCode;
        if (params.wl_dateOfProcedure) {
          const stripped = params.wl_dateOfProcedure.replace(/\//g, '');
          if (stripped.length === 8) freshForm.date = stripped;
        }
        if (params.wl_mainMemberTitle) {
          const validTitles: Title[] = ['Mr', 'Mrs', 'Miss', 'Ms', 'Dr', 'Prof'];
          const matched = validTitles.find(t => t.toLowerCase() === params.wl_mainMemberTitle?.toLowerCase());
          if (matched) freshForm.mainMemberTitle = matched;
        }
        if (params.wl_mainMemberFirstName) freshForm.mainMemberFirstName = params.wl_mainMemberFirstName;
        if (params.wl_mainMemberLastName) freshForm.mainMemberLastName = params.wl_mainMemberLastName;
        if (params.wl_mainMemberIdNumber) freshForm.mainMemberIdNumber = params.wl_mainMemberIdNumber;
        if (params.wl_hospital) freshForm.hospitalServiceProvider = params.wl_hospital;
        if (params.wl_ward) freshForm.ward = params.wl_ward;
        if (params.wl_referringDoctor) freshForm.referringDoctor = params.wl_referringDoctor;
        if (params.wl_doctorPracticeNumber) freshForm.doctorPracticeNumber = params.wl_doctorPracticeNumber;
        if (params.wl_atRecordId) (freshForm as any).airtableRecordId = params.wl_atRecordId;
        if (params.wl_atBaseId) (freshForm as any).airtableBaseId = params.wl_atBaseId;
        if (params.wl_atTableId) (freshForm as any).airtableTableId = params.wl_atTableId;
      }

      setFormData(freshForm);
      setCurrentFormId(null);
      hasUnsavedChangesRef.current = false;
    }
  }, [params.formId, getForm, user?.name, params.wl_firstName, params.wl_lastName, params.wl_idNumber, params.wl_title, params.wl_dob, params.wl_contact, params.wl_email, params.wl_procedure, params.wl_icd10, params.wl_medicalAid, params.wl_medicalAidPlan, params.wl_membershipNumber, params.wl_dependantCode, params.wl_dateOfProcedure, params.wl_mainMemberTitle, params.wl_mainMemberFirstName, params.wl_mainMemberLastName, params.wl_mainMemberIdNumber, params.wl_referringDoctor, params.wl_doctorPracticeNumber, params.wl_hospital, params.wl_ward]);

  useEffect(() => {
    const hasData = Boolean(
      formData.hospitalStickerPhoto ||
      formData.patientFirstName ||
      formData.patientLastName ||
      formData.idNumber ||
      formData.contactNumber ||
      formData.mainMemberFirstName ||
      formData.mainMemberLastName ||
      formData.medicalAidName ||
      formData.membershipNumber ||
      formData.procedure ||
      formData.icd10Code ||
      formData.timeInTheatrePhoto ||
      formData.timeOutTheatrePhoto
    );
    
    hasUnsavedChangesRef.current = hasData && !isReadOnly;
  }, [formData, isReadOnly]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove' as any, async (e: any) => {
      if (!hasUnsavedChangesRef.current || isReadOnly) {
        return;
      }

      e.preventDefault();

      try {
        if (currentFormId) {
          await updateDraft(currentFormId, formData);
        } else {
          const draftData = isFromWorklist ? { ...formData, caseStatus: 'case_started' as const } : formData;
          const newFormId = await saveDraft(draftData as any);
          setCurrentFormId(newFormId);
        }
        
        hasUnsavedChangesRef.current = false;
        navigation.dispatch(e.data.action);
      } catch (error) {
        console.error('Error auto-saving draft:', error);
        navigation.dispatch(e.data.action);
      }
    });

    return unsubscribe;
  }, [navigation, currentFormId, formData, isReadOnly, isFromWorklist, saveDraft, updateDraft]);

  const parseSouthAfricanID = (idNumber: string): string => {
    if (idNumber.length !== 13) return '';
    
    const year = idNumber.substring(0, 2);
    const month = idNumber.substring(2, 4);
    const day = idNumber.substring(4, 6);
    
    const currentYear = new Date().getFullYear();
    const currentCentury = Math.floor(currentYear / 100) * 100;
    const previousCentury = currentCentury - 100;
    
    const fullYear = parseInt(year) <= (currentYear % 100) ? currentCentury + parseInt(year) : previousCentury + parseInt(year);
    
    return `${day}/${month}/${fullYear}`;
  };

  const handleSameAsPatientToggle = useCallback((checked: boolean) => {
    setSameAsPatient(checked);
    if (checked) {
      setFormData(prev => ({
        ...prev,
        mainMemberTitle: prev.patientTitle,
        mainMemberFirstName: prev.patientFirstName,
        mainMemberLastName: prev.patientLastName,
        mainMemberIdNumber: prev.idNumber.replace(/[^0-9]/g, ''),
      }));
    }
  }, []);

  useEffect(() => {
    if (sameAsPatient) {
      setFormData(prev => ({
        ...prev,
        mainMemberTitle: prev.patientTitle,
        mainMemberFirstName: prev.patientFirstName,
        mainMemberLastName: prev.patientLastName,
        mainMemberIdNumber: prev.idNumber.replace(/[^0-9]/g, ''),
      }));
    }
  }, [sameAsPatient, formData.patientTitle, formData.patientFirstName, formData.patientLastName, formData.idNumber]);

  const handleIdNumberChange = (value: string) => {
    const alphanumericValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const isNumericOnly = /^\d+$/.test(alphanumericValue);
    setFormData(prev => ({
      ...prev,
      idNumber: alphanumericValue,
      dateOfBirth: isNumericOnly && alphanumericValue.length === 13 ? parseSouthAfricanID(alphanumericValue) : prev.dateOfBirth,
    }));
  };

  const formatTimeWithH = (value: string): string => {
    const numericValue = value.replace(/\D/g, '');
    if (numericValue.length <= 2) return numericValue;
    return `${numericValue.substring(0, 2)}H${numericValue.substring(2, 4)}`;
  };

  const handleTimeInput = (field: 'timeCArmTakenIn' | 'timeCArmTakenOut', value: string) => {
    const formatted = formatTimeWithH(value);
    setFormData(prev => ({ ...prev, [field]: formatted }));
  };

  const openCamera = async (mode: CameraMode) => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        return;
      }
    }
    setCameraMode(mode);
    setShowCamera(true);
  };

  const takePicture = async () => {
    if (cameraRef) {
      try {
        const photo = await cameraRef.takePictureAsync({ base64: true });
        const photoUri = `data:image/jpeg;base64,${photo.base64}`;
        
        const timestamp = new Date().toISOString();
        let location: { latitude: number; longitude: number } | null = null;
        
        try {
          if (!locationPermission?.granted) {
            const result = await requestLocationPermission();
            if (result.granted) {
              const currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });
              location = {
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
              };
              console.log('Photo location captured:', location);
            }
          } else {
            const currentLocation = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            location = {
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            };
            console.log('Photo location captured:', location);
          }
        } catch (error) {
          console.error('Error getting photo location:', error);
        }
        
        const metadata: PhotoMetadata = {
          timestamp,
          ...(location && { latitude: location.latitude, longitude: location.longitude }),
        };
        
        switch (cameraMode) {
          case 'hospitalSticker':
            setFormData(prev => ({ 
              ...prev, 
              hospitalStickerPhoto: photoUri,
              hospitalStickerPhotoMetadata: metadata,
            }));
            break;
          case 'timeInTheatre':
            setFormData(prev => ({ 
              ...prev, 
              timeInTheatrePhoto: photoUri,
              timeInTheatrePhotoMetadata: metadata,
            }));
            break;
          case 'timeOutTheatre':
            setFormData(prev => ({ 
              ...prev, 
              timeOutTheatrePhoto: photoUri,
              timeOutTheatrePhotoMetadata: metadata,
            }));
            break;
        }
        
        setShowCamera(false);
        setCameraMode(null);
        
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: scrollPositionRef.current, animated: false });
        }, 100);
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to take picture. Please try again.');
      }
    }
  };

  const validateRequiredFields = (): boolean => {
    const requiredFields = [
      { field: formData.hospitalStickerPhoto, name: 'Hospital Sticker Photo' },
      { field: formData.patientFirstName, name: 'Patient First Name' },
      { field: formData.patientLastName, name: 'Patient Last Name' },
      { field: formData.idNumber, name: 'ID Number' },
      { field: formData.contactNumber, name: 'Contact Number' },
      { field: formData.mainMemberFirstName, name: 'Main Member First Name' },
      { field: formData.mainMemberLastName, name: 'Main Member Last Name' },
      { field: formData.mainMemberIdNumber, name: 'Main Member ID Number' },
      { field: formData.medicalAidName, name: 'Medical Aid Name' },
      { field: formData.membershipNumber, name: 'Membership Number' },
      { field: formData.dependantCode, name: 'Dependant Code' },
      { field: formData.procedure, name: 'Procedure' },
      { field: formData.timeInTheatrePhoto, name: 'Clock In Theatre Photo' },
      { field: formData.timeCArmTakenIn, name: 'Time C Arm Taken In' },
      { field: formData.timeOutTheatrePhoto, name: 'Clock Out Theatre Photo' },
      { field: formData.timeCArmTakenOut, name: 'Time C Arm Taken Out' },
    ];

    const missingFields = requiredFields.filter(({ field }) => !field);
    
    if (missingFields.length > 0) {
      Alert.alert(
        'Missing Required Fields',
        `Please fill in: ${missingFields.map(f => f.name).join(', ')}`
      );
      return false;
    }
    
    return true;
  };

  const handleSaveDraft = async () => {
    try {
      if (currentFormId) {
        await updateDraft(currentFormId, formData);
        Alert.alert('Success', 'Draft saved successfully!');
      } else {
        const draftData = isFromWorklist ? { ...formData, caseStatus: 'case_started' as const } : formData;
        const newFormId = await saveDraft(draftData as any);
        setCurrentFormId(newFormId);
        Alert.alert('Success', 'Draft saved successfully!');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      Alert.alert('Error', 'Failed to save draft. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!validateRequiredFields()) {
      return;
    }

    if (!locationPermission?.granted) {
      const result = await requestLocationPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Location permission is required to complete the form.');
        return;
      }
    }

    try {
      const location = await Location.getCurrentPositionAsync({});
      const timestamp = new Date().toISOString();
      
      const updatedFormData = {
        ...formData,
        radiographerSignatureTimestamp: timestamp,
        radiographerSignatureLocation: `${location.coords.latitude}, ${location.coords.longitude}`,
        submissionLatitude: location.coords.latitude,
        submissionLongitude: location.coords.longitude,
      };

      if (currentFormId) {
        await submitForm(currentFormId, updatedFormData, user?.username);
      } else {
        const newFormId = await saveDraft(updatedFormData);
        console.log('Draft saved with ID:', newFormId, 'Now submitting...');
        await new Promise(resolve => setTimeout(resolve, 500));
        await submitForm(newFormId, updatedFormData, user?.username);
      }

      try {
        const { syncFormToAirtable, buildMedicalAidAirtablePayload } = await import('@/utils/airtableSync');
        const { parseAirtableUrl } = await import('@/utils/worklistService');
        const anyForm = formData as any;
        let baseId = anyForm.airtableBaseId || params.wl_atBaseId;
        let tableId = anyForm.airtableTableId || params.wl_atTableId;
        const recordId = anyForm.airtableRecordId || params.wl_atRecordId;
        if (!baseId || !tableId) {
          try {
            const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
            const savedUrl = await AsyncStorage.getItem('@worklist_spreadsheet_url');
            const defaultUrl = 'https://airtable.com/appSowzeF74zHsf6y/tblH5vCdGTVlY2tqt/viwVGGMsqLmvR2hEc';
            const parsed = parseAirtableUrl(savedUrl || defaultUrl);
            if (parsed) { baseId = baseId || parsed.baseId; tableId = tableId || parsed.tableId; }
          } catch (e) { console.warn('[MedicalAid] Could not resolve Airtable target:', e); }
        }
        if (baseId && tableId) {
          const payload = buildMedicalAidAirtablePayload(updatedFormData, { submittedBy: user?.username, timestamp });
          const result = await syncFormToAirtable({ baseId, tableId, recordId }, payload);
          console.log('[MedicalAid] Airtable sync result:', result);
        }
      } catch (atErr) {
        console.error('[MedicalAid] Airtable sync failed (form still submitted):', atErr);
      }

      setFormData(getInitialFormData());
      setCurrentFormId(null);
      hasUnsavedChangesRef.current = false;

      const patientName = `${updatedFormData.patientTitle} ${updatedFormData.patientFirstName} ${updatedFormData.patientLastName}`.trim();
      const subject = `Medical Aid Form - ${patientName}`;
      const body =
        `Medical Aid Form Submission\n\n` +
        `Patient: ${patientName}\n` +
        `ID Number: ${updatedFormData.idNumber}\n` +
        `Date of Birth: ${updatedFormData.dateOfBirth}\n` +
        `Contact: ${updatedFormData.contactNumber}\n` +
        `Email: ${updatedFormData.email}\n\n` +
        `Hospital/Service Provider: ${updatedFormData.hospitalServiceProvider}\n` +
        `Ward/Theatre: ${updatedFormData.ward}\n` +
        `Referring Doctor: ${updatedFormData.referringDoctor}\n` +
        `Doctor Practice Number: ${updatedFormData.doctorPracticeNumber}\n\n` +
        `Main Member: ${updatedFormData.mainMemberTitle} ${updatedFormData.mainMemberFirstName} ${updatedFormData.mainMemberLastName}\n` +
        `Main Member ID: ${updatedFormData.mainMemberIdNumber}\n` +
        `Medical Aid: ${updatedFormData.medicalAidName}\n` +
        `Medical Aid Plan: ${updatedFormData.medicalAidPlan}\n` +
        `Membership Number: ${updatedFormData.membershipNumber}\n` +
        `Dependant Code: ${updatedFormData.dependantCode}\n\n` +
        `Procedure: ${updatedFormData.procedure}\n` +
        `ICD10 Code: ${updatedFormData.icd10Code}\n\n` +
        `Time C Arm In: ${updatedFormData.timeCArmTakenIn}\n` +
        `Time C Arm Out: ${updatedFormData.timeCArmTakenOut}\n` +
        `Screening Time: ${updatedFormData.screeningTimeText}\n` +
        `${updatedFormData.reasonForTimeDiscrepancy ? `Reason for Time Discrepancy: ${updatedFormData.reasonForTimeDiscrepancy}\n` : ''}\n` +
        `Radiographer: ${updatedFormData.radiographerName}\n` +
        `Signed: ${new Date(timestamp).toLocaleString()}\n` +
        `Location: ${updatedFormData.radiographerSignatureLocation}\n\n` +
        `--- Photo GPS Locations ---\n` +
        (updatedFormData.hospitalStickerPhotoMetadata?.latitude != null
          ? `Hospital Sticker Photo: ${updatedFormData.hospitalStickerPhotoMetadata.latitude}, ${updatedFormData.hospitalStickerPhotoMetadata.longitude} (${updatedFormData.hospitalStickerPhotoMetadata.timestamp})\n`
          : updatedFormData.hospitalStickerPhoto ? `Hospital Sticker Photo: No GPS data\n` : '') +
        (updatedFormData.timeInTheatrePhotoMetadata?.latitude != null
          ? `Time In Theatre Photo: ${updatedFormData.timeInTheatrePhotoMetadata.latitude}, ${updatedFormData.timeInTheatrePhotoMetadata.longitude} (${updatedFormData.timeInTheatrePhotoMetadata.timestamp})\n`
          : updatedFormData.timeInTheatrePhoto ? `Time In Theatre Photo: No GPS data\n` : '') +
        (updatedFormData.timeOutTheatrePhotoMetadata?.latitude != null
          ? `Time Out Theatre Photo: ${updatedFormData.timeOutTheatrePhotoMetadata.latitude}, ${updatedFormData.timeOutTheatrePhotoMetadata.longitude} (${updatedFormData.timeOutTheatrePhotoMetadata.timestamp})\n`
          : updatedFormData.timeOutTheatrePhoto ? `Time Out Theatre Photo: No GPS data\n` : '');

      try {
        console.log('Opening native mail composer for Medical Aid form...');
        const attachments: string[] = [];

        if (Platform.OS !== 'web') {
          const tempDir = `${(FileSystem as any).cacheDirectory || ''}email_attachments/`;
          try {
            await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
          } catch {}

          const saveBase64ToFile = async (base64Uri: string, filename: string): Promise<string> => {
            const base64Data = base64Uri.replace(/^data:[^;]+;base64,/, '');
            const filePath = `${tempDir}${filename}`;
            await FileSystem.writeAsStringAsync(filePath, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            console.log('Saved attachment file:', filePath);
            return filePath;
          };

          if (updatedFormData.hospitalStickerPhoto) {
            const path = await saveBase64ToFile(updatedFormData.hospitalStickerPhoto, 'hospital_sticker.jpg');
            attachments.push(path);
          }
          if (updatedFormData.timeInTheatrePhoto) {
            const path = await saveBase64ToFile(updatedFormData.timeInTheatrePhoto, 'clock_in_theatre.jpg');
            attachments.push(path);
          }
          if (updatedFormData.timeOutTheatrePhoto) {
            const path = await saveBase64ToFile(updatedFormData.timeOutTheatrePhoto, 'clock_out_theatre.jpg');
            attachments.push(path);
          }

          try {
            const hl7FormData = {
              ...updatedFormData,
              id: currentFormId || `form_${Date.now()}`,
              status: 'submitted' as const,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as ContextFormData;
            const hl7File = generateHL7File(hl7FormData);
            const hl7Path = `${tempDir}${hl7File.filename}`;
            await FileSystem.writeAsStringAsync(hl7Path, hl7File.content, {
              encoding: FileSystem.EncodingType.UTF8,
            });
            attachments.push(hl7Path);
            console.log('HL7 file saved:', hl7Path);
          } catch (hl7Error) {
            console.error('Error generating HL7 file:', hl7Error);
          }
        }

        console.log('Mail attachments count:', attachments.length);
        const isAvailable = await MailComposer.isAvailableAsync();
        if (isAvailable) {
          await MailComposer.composeAsync({
            recipients: ['paul@intouchmedtech.co.za', 'jenny@centaurimedical.co.za', 'kevin@centaurimedical.co.za'],
            subject,
            body,
            attachments,
          });
        } else {
          console.log('Mail composer not available on this device');
        }
        Alert.alert('Success', 'Medical Aid form completed successfully!', [
          { text: 'OK', onPress: () => router.push('/') },
        ]);
      } catch (emailError) {
        console.error('Mail composer error:', emailError);
        Alert.alert(
          'Form Saved',
          'Medical Aid form was saved. You can share it from the forms list.',
          [{ text: 'OK', onPress: () => router.push('/') }]
        );
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      Alert.alert('Error', 'Failed to submit form. Please try again.');
    }
  };

  if (showCamera && Platform.OS !== 'web') {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          ref={(ref) => setCameraRef(ref)}
        >
          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => {
                setShowCamera(false);
                setCameraMode(null);
              }}
            >
              <X size={32} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  const titles: Title[] = ['Mr', 'Mrs', 'Miss', 'Ms', 'Dr', 'Prof'];

  return (
    <>
      <Stack.Screen options={{ title: 'Medical Aid Form' }} />
      <ScrollView 
        ref={scrollViewRef}
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        onScroll={(event) => {
          scrollPositionRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hospital Information</Text>
          
          <View style={styles.photoField}>
            <Text style={styles.label}>Hospital Sticker Photo *</Text>
            {formData.hospitalStickerPhoto ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: formData.hospitalStickerPhoto }} style={styles.photoImage} />
                {formData.hospitalStickerPhotoMetadata?.latitude != null && formData.hospitalStickerPhotoMetadata?.longitude != null && (
                  <View style={styles.gpsBadge}>
                    <MapPin size={12} color="#28A745" />
                    <Text style={styles.gpsText}>{formData.hospitalStickerPhotoMetadata.latitude.toFixed(6)}, {formData.hospitalStickerPhotoMetadata.longitude.toFixed(6)}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={() => openCamera('hospitalSticker')}
                >
                  <Text style={styles.retakeButtonText}>Retake</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => openCamera('hospitalSticker')}
              >
                <Camera size={24} color="#0066CC" />
                <Text style={styles.photoButtonText}>Take Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Date *</Text>
            <TextInput
              style={styles.input}
              value={formData.date}
              onChangeText={(value) => {
                const numericValue = value.replace(/\D/g, '');
                setFormData(prev => ({ ...prev, date: numericValue }));
              }}
              placeholder="DDMMYYYY"
              keyboardType="numeric"
              maxLength={8}
              editable={!isReadOnly}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>Title *</Text>
            <View style={styles.titleContainer}>
              {titles.map((title) => (
                <TouchableOpacity
                  key={title}
                  style={[
                    styles.titleButton,
                    formData.patientTitle === title && styles.titleButtonActive,
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, patientTitle: title }))}
                >
                  <Text
                    style={[
                      styles.titleButtonText,
                      formData.patientTitle === title && styles.titleButtonTextActive,
                    ]}
                  >
                    {title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.patientFirstName}
              onChangeText={(value) => setFormData(prev => ({ ...prev, patientFirstName: value }))}
              placeholder="Enter first name"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Last Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.patientLastName}
              onChangeText={(value) => setFormData(prev => ({ ...prev, patientLastName: value }))}
              placeholder="Enter last name"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>ID Number/Passport Number *</Text>
            <TextInput
              style={styles.input}
              value={formData.idNumber}
              onChangeText={handleIdNumberChange}
              placeholder="Enter ID or Passport number"
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Patient Date of Birth *</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={formData.dateOfBirth}
              editable={false}
              placeholder="Auto-populated from ID"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Contact Number *</Text>
            <TextInput
              style={styles.input}
              value={formData.contactNumber}
              onChangeText={(value) => setFormData(prev => ({ ...prev, contactNumber: value }))}
              placeholder="Enter contact number"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(value) => setFormData(prev => ({ ...prev, email: value }))}
              placeholder="Enter email (optional)"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hospital / Facility</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Hospital / Service Provider *</Text>
            <TextInput
              style={styles.input}
              value={formData.hospitalServiceProvider}
              onChangeText={(value) => setFormData(prev => ({ ...prev, hospitalServiceProvider: value }))}
              placeholder="Enter hospital or service provider"
              editable={!isReadOnly}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Ward / Theatre</Text>
            <TextInput
              style={styles.input}
              value={formData.ward}
              onChangeText={(value) => setFormData(prev => ({ ...prev, ward: value }))}
              placeholder="Enter ward or theatre (optional)"
              editable={!isReadOnly}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Referring Doctor</Text>
            <TextInput
              style={styles.input}
              value={formData.referringDoctor}
              onChangeText={(value) => setFormData(prev => ({ ...prev, referringDoctor: value }))}
              placeholder="Enter referring doctor name (optional)"
              editable={!isReadOnly}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Doctor Practice Number</Text>
            <TextInput
              style={styles.input}
              value={formData.doctorPracticeNumber}
              onChangeText={(value) => setFormData(prev => ({ ...prev, doctorPracticeNumber: value }))}
              placeholder="Enter practice number (optional)"
              editable={!isReadOnly}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical Aid Information</Text>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => handleSameAsPatientToggle(!sameAsPatient)}
            activeOpacity={0.7}
            disabled={isReadOnly}
          >
            {sameAsPatient ? (
              <CheckSquare size={22} color="#0066CC" />
            ) : (
              <Square size={22} color="#999" />
            )}
            <Text style={styles.checkboxLabel}>Main member is same as patient</Text>
          </TouchableOpacity>
          
          <View style={styles.field}>
            <Text style={styles.label}>Main Member Title *</Text>
            <View style={styles.titleContainer}>
              {titles.map((title) => (
                <TouchableOpacity
                  key={title}
                  style={[
                    styles.titleButton,
                    formData.mainMemberTitle === title && styles.titleButtonActive,
                  ]}
                  onPress={() => {
                    if (!sameAsPatient) setFormData(prev => ({ ...prev, mainMemberTitle: title }));
                  }}
                  disabled={sameAsPatient}
                >
                  <Text
                    style={[
                      styles.titleButtonText,
                      formData.mainMemberTitle === title && styles.titleButtonTextActive,
                    ]}
                  >
                    {title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Main Member First Name *</Text>
            <TextInput
              value={formData.mainMemberFirstName}
              style={[styles.input, sameAsPatient && styles.inputDisabled]}
              onChangeText={(value) => { if (!sameAsPatient) setFormData(prev => ({ ...prev, mainMemberFirstName: value })); }}
              placeholder="Enter first name"
              editable={!sameAsPatient && !isReadOnly}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Main Member Last Name *</Text>
            <TextInput
              style={[styles.input, sameAsPatient && styles.inputDisabled]}
              value={formData.mainMemberLastName}
              onChangeText={(value) => { if (!sameAsPatient) setFormData(prev => ({ ...prev, mainMemberLastName: value })); }}
              placeholder="Enter last name"
              editable={!sameAsPatient && !isReadOnly}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Main Member ID Number *</Text>
            <TextInput
              style={[styles.input, sameAsPatient && styles.inputDisabled]}
              value={formData.mainMemberIdNumber}
              onChangeText={(value) => { if (!sameAsPatient) setFormData(prev => ({ ...prev, mainMemberIdNumber: value.replace(/\D/g, '') })); }}
              placeholder="Enter 13-digit ID number"
              keyboardType="numeric"
              maxLength={13}
              editable={!sameAsPatient && !isReadOnly}
            />
          </View>

          <MedicalAidDropdown
            value={formData.medicalAidName}
            onSelect={(value) => setFormData(prev => ({ ...prev, medicalAidName: value }))}
            disabled={isReadOnly}
          />

          <View style={styles.field}>
            <Text style={styles.label}>Medical Aid Plan</Text>
            <TextInput
              style={styles.input}
              value={formData.medicalAidPlan}
              onChangeText={(value) => setFormData(prev => ({ ...prev, medicalAidPlan: value }))}
              placeholder="Enter medical aid plan (optional)"
              editable={!isReadOnly}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Membership Number *</Text>
            <TextInput
              style={styles.input}
              value={formData.membershipNumber}
              onChangeText={(value) => setFormData(prev => ({ ...prev, membershipNumber: value }))}
              placeholder="Enter membership number"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Dependant Code *</Text>
            <TextInput
              style={styles.input}
              value={formData.dependantCode}
              onChangeText={(value) => setFormData(prev => ({ ...prev, dependantCode: value }))}
              placeholder="Enter dependant code"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Next of Kin</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>Next of Kin Name</Text>
            <TextInput
              style={styles.input}
              value={formData.nextOfKinName}
              onChangeText={(value) => setFormData(prev => ({ ...prev, nextOfKinName: value }))}
              placeholder="Enter next of kin name (optional)"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Next of Kin Contact Number</Text>
            <TextInput
              style={styles.input}
              value={formData.nextOfKinContactNumber}
              onChangeText={(value) => setFormData(prev => ({ ...prev, nextOfKinContactNumber: value }))}
              placeholder="Enter contact number (optional)"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Procedure Information</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>Procedure *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.procedure}
              onChangeText={(value) => setFormData(prev => ({ ...prev, procedure: value }))}
              placeholder="Enter procedure details"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>ICD10 Code</Text>
            <TextInput
              style={styles.input}
              value={formData.icd10Code}
              onChangeText={(value) => setFormData(prev => ({ ...prev, icd10Code: value }))}
              placeholder="Enter ICD10 code"
            />
          </View>

          <View style={styles.photoField}>
            <Text style={styles.label}>Clock In Theatre *</Text>
            {formData.timeInTheatrePhoto ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: formData.timeInTheatrePhoto }} style={styles.photoImage} />
                {formData.timeInTheatrePhotoMetadata?.latitude != null && formData.timeInTheatrePhotoMetadata?.longitude != null && (
                  <View style={styles.gpsBadge}>
                    <MapPin size={12} color="#28A745" />
                    <Text style={styles.gpsText}>{formData.timeInTheatrePhotoMetadata.latitude.toFixed(6)}, {formData.timeInTheatrePhotoMetadata.longitude.toFixed(6)}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={() => openCamera('timeInTheatre')}
                >
                  <Text style={styles.retakeButtonText}>Retake</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => openCamera('timeInTheatre')}
              >
                <Camera size={24} color="#0066CC" />
                <Text style={styles.photoButtonText}>Take Photo of Theatre Clock</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Time C Arm Taken In *</Text>
            <TextInput
              style={styles.input}
              value={formData.timeCArmTakenIn}
              onChangeText={(value) => handleTimeInput('timeCArmTakenIn', value)}
              placeholder="Enter time (e.g., 14H30)"
              keyboardType="numeric"
              maxLength={5}
            />
          </View>

          <View style={styles.photoField}>
            <Text style={styles.label}>Clock Out Theatre *</Text>
            {formData.timeOutTheatrePhoto ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: formData.timeOutTheatrePhoto }} style={styles.photoImage} />
                {formData.timeOutTheatrePhotoMetadata?.latitude != null && formData.timeOutTheatrePhotoMetadata?.longitude != null && (
                  <View style={styles.gpsBadge}>
                    <MapPin size={12} color="#28A745" />
                    <Text style={styles.gpsText}>{formData.timeOutTheatrePhotoMetadata.latitude.toFixed(6)}, {formData.timeOutTheatrePhotoMetadata.longitude.toFixed(6)}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={() => openCamera('timeOutTheatre')}
                >
                  <Text style={styles.retakeButtonText}>Retake</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => openCamera('timeOutTheatre')}
              >
                <Camera size={24} color="#0066CC" />
                <Text style={styles.photoButtonText}>Take Photo of Theatre Clock</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Time C Arm Taken Out *</Text>
            <TextInput
              style={styles.input}
              value={formData.timeCArmTakenOut}
              onChangeText={(value) => handleTimeInput('timeCArmTakenOut', value)}
              placeholder="Enter time (e.g., 16H45)"
              keyboardType="numeric"
              maxLength={5}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Screening Time (Seconds)</Text>
            <TextInput
              style={styles.input}
              value={formData.screeningTimeText}
              onChangeText={(value) => setFormData(prev => ({ ...prev, screeningTimeText: value }))}
              placeholder="Enter screening time (optional)"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Reason for time in theatre longer than anesthetic time</Text>
            <View style={styles.titleContainer}>
              {['Surgeon Delay', 'Anaesthetist Delay', 'Technical Issue', 'Other'].map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.titleButton,
                    formData.reasonForTimeDiscrepancy === reason && styles.titleButtonActive,
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, reasonForTimeDiscrepancy: reason }))}
                >
                  <Text
                    style={[
                      styles.titleButtonText,
                      formData.reasonForTimeDiscrepancy === reason && styles.titleButtonTextActive,
                    ]}
                  >
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {formData.reasonForTimeDiscrepancy === 'Other' && (
              <TextInput
                style={[styles.input, styles.textArea, { marginTop: 12 }]}
                value={(formData as any).reasonForTimeDiscrepancyOther || ''}
                onChangeText={(value) => setFormData(prev => ({ ...prev, reasonForTimeDiscrepancyOther: value } as any))}
                placeholder="Please specify other reason"
                multiline
                numberOfLines={3}
              />
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Radiographer Signature</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>Name and Surname of Radiographer *</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={formData.radiographerName}
              editable={false}
            />
          </View>

          {formData.radiographerSignatureTimestamp && (
            <>
              <View style={styles.signatureInfo}>
                <Check size={20} color="#00A3A3" />
                <Text style={styles.signatureInfoText}>
                  Signed on {new Date(formData.radiographerSignatureTimestamp).toLocaleString()}
                </Text>
              </View>
              <View style={styles.signatureInfo}>
                <Text style={styles.signatureInfoText}>
                  Location: {formData.radiographerSignatureLocation}
                </Text>
              </View>
            </>
          )}
        </View>

        {!isReadOnly && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.draftButton} onPress={handleSaveDraft}>
              <Save size={20} color="#0066CC" />
              <Text style={styles.draftButtonText}>Save Draft</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0066CC',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E1E4E8',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333333',
  },
  inputDisabled: {
    backgroundColor: '#E9ECEF',
    color: '#6C757D',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  titleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  titleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E1E4E8',
    backgroundColor: '#FFFFFF',
  },
  titleButtonActive: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  titleButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#333333',
  },
  titleButtonTextActive: {
    color: '#FFFFFF',
  },
  photoField: {
    marginBottom: 16,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7F3FF',
    borderWidth: 2,
    borderColor: '#0066CC',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    gap: 8,
  },
  photoButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#0066CC',
  },
  photoPreview: {
    alignItems: 'center',
    gap: 8,
  },
  photoImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  gpsText: {
    fontSize: 11,
    color: '#28A745',
    fontWeight: '500' as const,
  },
  retakeButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retakeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  signatureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#E7F9F9',
    borderRadius: 8,
  },
  signatureInfoText: {
    fontSize: 14,
    color: '#00A3A3',
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  draftButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  draftButtonText: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#00A3A3',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#00A3A3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: 20,
  },
  cameraButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#333333',
  },
  bottomSpacer: {
    height: 40,
  },
});
