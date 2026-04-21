import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
  FlatList,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MailComposer from 'expo-mail-composer';
import * as FileSystem from 'expo-file-system/legacy';
import { Camera, X, Check, Save, FileSpreadsheet, ChevronDown, Scan, Plus, Trash, ScanLine, MapPin } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useForms, PhotoMetadata } from '@/contexts/FormsContext';
import { generateClaimSpreadsheet } from '@/utils/excelGenerator';
import { useLocalSearchParams, useRouter, Stack, useNavigation } from 'expo-router';
import DocumentScanner from '@/components/DocumentScanner';






type Title = 'Mr' | 'Mrs' | 'Miss' | 'Ms' | 'Dr' | 'Prof';

interface COIDAFormData {
  formType: 'medical-aid' | 'coida';
  hospitalStickerPhoto: string | null;
  hospitalStickerPhotoMetadata?: PhotoMetadata;
  date: string;
  dateOfProcedure: string;
  timeInTheatreClockPhoto: string | null;
  timeInTheatreClockPhotoMetadata?: PhotoMetadata;
  timeInTheatre: string;
  cArmImages: { uri: string; metadata?: PhotoMetadata }[];
  screeningTimePhoto: string | null;
  screeningTimePhotoMetadata?: PhotoMetadata;
  fluoroscopyTime: string;
  timeOutTheatreClockPhoto: string | null;
  timeOutTheatreClockPhotoMetadata?: PhotoMetadata;
  timeOutTheatre: string;
  reasonForTimeDiscrepancy: string;
  patientTitle: Title;
  patientFirstName: string;
  patientLastName: string;
  idNumber: string;
  dateOfBirth: string;
  contactNumber: string;
  email: string;
  coidaMemberNumber: string;
  patientIodClaimNumber: string;
  employerName: string;
  employerContact: string;
  dateOfIncident: string;
  procedure: string[];
  proceduresList?: string[];
  employerReportPhotos: { uri: string; metadata?: PhotoMetadata }[];
  firstMedicalReportPhoto: string | null;
  firstMedicalReportPhotoMetadata?: PhotoMetadata;
  patientIdPhoto: string | null;
  patientIdPhotoMetadata?: PhotoMetadata;
  referralLetterPages: { uri: string; metadata?: PhotoMetadata }[];
  referralLetterPDF?: string;

  attachmentPhotos: { uri: string; metadata?: PhotoMetadata }[];
  dicomFiles?: Record<string, { content: string; filename: string; size: number }>;

  icd10Code: string;
  radiographerName: string;
  radiographerSignatureTimestamp: string;
  radiographerSignatureLocation: string;
}

type CameraMode = 'hospitalSticker' | 'timeInTheatreClock' | 'cArmImage' | 'screeningTime' | 'timeOutTheatreClock' | 'employerReport' | 'firstMedicalReport' | 'patientId' | 'referralLetter' | 'attachment' | null;

const PROCEDURE_OPTIONS = [
  { code: '00140', name: 'X-ray fluoroscopy any region' },
  { code: '00150', name: 'X-ray C-Arm (equipment fee only, not procedure) per half hour' },
  { code: '00155', name: 'X-ray C-arm fluoroscopy in theatre per half hour (procedure only)' },
  { code: '01040', name: 'Radiographer attendance in theatre, per half hour' },
  { code: '51110', name: 'X-ray of the cervical spine, one or two views' },
  { code: '52100', name: 'X-ray of the thoracic spine, one or two views' },
  { code: '53110', name: 'X-ray of the lumbar spine, one or two views' },
  { code: '56100', name: 'X-ray of the left hip' },
  { code: '56110', name: 'X-ray of the right hip' },
  { code: '61130', name: 'X-ray of the left shoulder' },
  { code: '61135', name: 'X-ray of the right shoulder' },
  { code: '62100', name: 'X-ray of the left humerus' },
  { code: '62105', name: 'X-ray of the right humerus' },
  { code: '63100', name: 'X-ray of the left elbow' },
  { code: '63105', name: 'X-ray of the right elbow' },
  { code: '64100', name: 'X-ray of the left forearm' },
  { code: '64105', name: 'X-ray of the right forearm' },
  { code: '65100', name: 'X-ray of the left hand' },
  { code: '65105', name: 'X-ray of the right hand' },
  { code: '65120', name: 'X-ray of a finger' },
  { code: '65130', name: 'X-ray of the left wrist' },
  { code: '65135', name: 'X-ray of the right wrist' },
  { code: '71100', name: 'X-ray of the left femur' },
  { code: '71105', name: 'X-ray of the right femur' },
  { code: '72100', name: 'X-ray of the left knee one or two views' },
  { code: '72105', name: 'X-ray of the right knee one or two views' },
  { code: '73100', name: 'X-ray of the left lower leg' },
  { code: '73105', name: 'X-ray of the right lower leg' },
  { code: '74100', name: 'X-ray of the left ankle' },
  { code: '74105', name: 'X-ray of the right ankle' },
  { code: '74120', name: 'X-ray of the left foot' },
  { code: '74125', name: 'X-ray of the right foot' },
  { code: '74145', name: 'X-ray of a toe' },
  { code: '30150', name: 'X-ray of Ribs' },
  { code: '42150', name: 'Report on Retrograde CYSTOGRAM' },
  { code: '54100', name: 'X-ray Sacrum & Coccyx' },
  { code: '55100', name: 'X-ray Pelvis' },
  { code: '65140', name: 'X-ray Left Scaphoid' },
  { code: '65145', name: 'X-ray Right Scaphoid' },
  { code: '61100', name: 'X-ray Left Clavicle' },
  { code: '61105', name: 'X-ray Right Clavicle' },
  { code: '72140', name: 'X-ray Left Patella' },
  { code: '72145', name: 'X-ray Right Patella' },
  { code: '74130', name: 'X-ray Left Calcaneus' },
  { code: '74135', name: 'X-ray Right Calcaneus' },
];

export default function COIDAFormScreen() {
  const { user } = useAuth();
  const { saveDraft, updateDraft, submitForm, getForm, generateExcelExport } = useForms();
  const router = useRouter();
  const params = useLocalSearchParams<{ formId?: string; wl_firstName?: string; wl_lastName?: string; wl_title?: string; wl_idNumber?: string; wl_dob?: string; wl_contact?: string; wl_email?: string; wl_procedure?: string; wl_icd10?: string; wl_dateOfProcedure?: string; wl_coidaNumber?: string; wl_iodClaim?: string; wl_employer?: string; wl_employerContact?: string; wl_dateOfIncident?: string; wl_mainMemberTitle?: string; wl_mainMemberFirstName?: string; wl_mainMemberLastName?: string; wl_mainMemberIdNumber?: string; wl_referringDoctor?: string; wl_doctorPracticeNumber?: string; wl_fromWorklist?: string; wl_atRecordId?: string; wl_atBaseId?: string; wl_atTableId?: string }>();
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
  const [showProcedurePicker, setShowProcedurePicker] = useState(false);
  const [procedureSearch, setProcedureSearch] = useState('');
  const [showDocumentScanner, setShowDocumentScanner] = useState(false);



  const [exportingExcel, setExportingExcel] = useState(false);
  const [showDateOfProcedurePicker, setShowDateOfProcedurePicker] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number>(new Date().getDate());

  const _processAsScannedDocument = async (imageUri: string): Promise<string> => {
    try {
      console.log('Processing document scan...');
      
      const manipResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { resize: { width: 1600 } },
        ],
        { 
          compress: 1.0,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true 
        }
      );

      if (!manipResult.base64) {
        throw new Error('Failed to get base64 from manipulated image');
      }

      const enhancedBase64 = await enhanceDocumentImage(manipResult.base64);
      return `data:image/jpeg;base64,${enhancedBase64}`;
    } catch (error) {
      console.error('Error in processAsScannedDocument:', error);
      throw error;
    }
  };

  const enhanceDocumentImage = async (base64: string): Promise<string> => {
    try {
      if (Platform.OS !== 'web') {
        return base64;
      }

      console.log('Enhancing document image...');
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      const img = new (window as any).Image() as HTMLImageElement;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = `data:image/jpeg;base64,${base64}`;
      });

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        
        const contrast = 1.3;
        const brightness = 15;
        let enhanced = (gray - 128) * contrast + 128 + brightness;
        enhanced = Math.max(0, Math.min(255, enhanced));
        
        const threshold = 180;
        const sharpened = enhanced > threshold ? 255 : Math.max(0, enhanced * 1.2);
        
        data[i] = sharpened;
        data[i + 1] = sharpened;
        data[i + 2] = sharpened;
      }

      ctx.putImageData(imageData, 0, 0);

      const enhancedBase64 = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
      console.log('Document enhancement complete');
      
      return enhancedBase64;
    } catch (error) {
      console.error('Error enhancing document:', error);
      return base64;
    }
  };

  const convertImagesToPDF = async (base64Images: string[], filename: string = 'document.pdf'): Promise<{ 
    base64: string; 
    filename: string;
  } | null> => {
    try {
      const { convertImagesToPDF: pdfConvert } = await import('@/utils/pdfConverter');
      return pdfConvert(base64Images, filename, true);
    } catch (err) {
      console.error('PDF conversion failed:', err);
      return null;
    }
  };

  const formatDateToDDMMYYYY = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getInitialFormData = (): COIDAFormData => ({
    formType: 'coida',
    hospitalStickerPhoto: null,
    date: formatDateToDDMMYYYY(new Date()),
    dateOfProcedure: formatDateToDDMMYYYY(new Date()),
    timeInTheatreClockPhoto: null,
    timeInTheatre: '',
    cArmImages: [],
    screeningTimePhoto: null,
    fluoroscopyTime: '',
    timeOutTheatreClockPhoto: null,
    timeOutTheatre: '',
    reasonForTimeDiscrepancy: '',
    patientTitle: 'Mr',
    patientFirstName: '',
    patientLastName: '',
    idNumber: '',
    dateOfBirth: '',
    contactNumber: '',
    email: '',
    coidaMemberNumber: '',
    patientIodClaimNumber: '',
    employerName: '',
    employerContact: '',
    dateOfIncident: '',
    procedure: [],
    employerReportPhotos: [],
    firstMedicalReportPhoto: null,
    patientIdPhoto: null,
    referralLetterPages: [],
    attachmentPhotos: [],

    icd10Code: '',
    radiographerName: user?.name || 'Dr. Smith',
    radiographerSignatureTimestamp: '',
    radiographerSignatureLocation: '',
  });

  const [formData, setFormData] = useState<COIDAFormData>(getInitialFormData());

  const isReadOnly = formData.radiographerSignatureTimestamp !== '';

  useEffect(() => {
    if (params.formId && typeof params.formId === 'string') {
      const existingForm = getForm(params.formId);
      if (existingForm && existingForm.formType === 'coida') {
        const defaults = getInitialFormData();
        setFormData({ ...defaults, ...(existingForm as any), cArmImages: (existingForm as any).cArmImages ?? [], employerReportPhotos: (existingForm as any).employerReportPhotos ?? [], referralLetterPages: (existingForm as any).referralLetterPages ?? [], attachmentPhotos: (existingForm as any).attachmentPhotos ?? [], procedure: (existingForm as any).procedure ?? [] });
        setCurrentFormId(params.formId);
        hasUnsavedChangesRef.current = false;
      }
    } else {
      const freshForm = getInitialFormData();

      if (params.wl_firstName || params.wl_lastName || params.wl_idNumber) {
        console.log('[COIDA] Loading worklist patient data into form');
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
        if (params.wl_procedure) freshForm.procedure = [params.wl_procedure];
        if (params.wl_icd10) freshForm.icd10Code = params.wl_icd10;
        if (params.wl_dateOfProcedure) freshForm.dateOfProcedure = params.wl_dateOfProcedure;
        if (params.wl_coidaNumber) freshForm.coidaMemberNumber = params.wl_coidaNumber;
        if (params.wl_iodClaim) freshForm.patientIodClaimNumber = params.wl_iodClaim;
        if (params.wl_employer) freshForm.employerName = params.wl_employer;
        if (params.wl_employerContact) freshForm.employerContact = params.wl_employerContact;
        if (params.wl_dateOfIncident) freshForm.dateOfIncident = params.wl_dateOfIncident;
        if (params.wl_atRecordId) (freshForm as any).airtableRecordId = params.wl_atRecordId;
        if (params.wl_atBaseId) (freshForm as any).airtableBaseId = params.wl_atBaseId;
        if (params.wl_atTableId) (freshForm as any).airtableTableId = params.wl_atTableId;
      }

      setFormData(freshForm);
      setCurrentFormId(null);
      hasUnsavedChangesRef.current = false;
    }
  }, [params.formId, getForm, user?.name, params.wl_firstName, params.wl_lastName, params.wl_idNumber, params.wl_title, params.wl_dob, params.wl_contact, params.wl_email, params.wl_procedure, params.wl_icd10, params.wl_dateOfProcedure, params.wl_coidaNumber, params.wl_iodClaim, params.wl_employer, params.wl_employerContact, params.wl_dateOfIncident, params.wl_mainMemberTitle, params.wl_mainMemberFirstName, params.wl_mainMemberLastName, params.wl_mainMemberIdNumber, params.wl_referringDoctor, params.wl_doctorPracticeNumber]);

  useEffect(() => {
    const hasData = Boolean(
      formData.hospitalStickerPhoto ||
      formData.patientFirstName ||
      formData.patientLastName ||
      formData.idNumber ||
      formData.coidaMemberNumber ||
      formData.procedure ||
      formData.timeInTheatreClockPhoto ||
      (formData.cArmImages ?? []).length > 0 ||
      formData.timeOutTheatreClockPhoto ||
      formData.employerReportPhotos.length > 0
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
        // NEVER save DICOM files - they're too large
        const formDataWithoutDicom = { ...formData };
        delete formDataWithoutDicom.dicomFiles;
        
        if (currentFormId) {
          await updateDraft(currentFormId, formDataWithoutDicom as any);
        } else {
          const draftData = isFromWorklist ? { ...formDataWithoutDicom, caseStatus: 'case_started' as const } : formDataWithoutDicom;
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

  const handleIdNumberChange = (value: string) => {
    const alphanumericValue = (value || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const isNumericOnly = /^\d+$/.test(alphanumericValue);
    setFormData(prev => ({
      ...prev,
      idNumber: alphanumericValue,
      dateOfBirth: isNumericOnly && alphanumericValue.length === 13 ? parseSouthAfricanID(alphanumericValue) : prev.dateOfBirth,
    }));
  };

  const formatTimeWithH = (value: string): string => {
    const numericValue = (value || '').replace(/\D/g, '');
    if (numericValue.length <= 2) return numericValue;
    return `${numericValue.substring(0, 2)}H${numericValue.substring(2, 4)}`;
  };

  const handleTimeInput = (field: 'timeInTheatre' | 'timeOutTheatre', value: string) => {
    const formatted = formatTimeWithH(value);
    setFormData(prev => ({ ...prev, [field]: formatted }));
  };

  const handleNumericInput = (field: string, value: string) => {
    const numericValue = (value || '').replace(/\D/g, '');
    setFormData(prev => ({ ...prev, [field]: numericValue }));
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
    if (!cameraRef) {
      console.log('Camera ref not available');
      return;
    }

    try {
      console.log('Taking picture...');
      
      const currentMode = cameraMode;
      const currentScrollPosition = scrollPositionRef.current;
      
      // Use lower quality for referral letter to save storage space
      const quality = currentMode === 'referralLetter' ? 0.5 : 0.7;
      
      const photo = await cameraRef.takePictureAsync({ 
        base64: true,
        quality: quality,
        exif: false,
        skipProcessing: false,
      });
      console.log('Picture taken successfully with quality:', quality);
      
      if (!photo || !photo.base64) {
        throw new Error('Failed to capture photo data');
      }
      
      let photoUri = `data:image/jpeg;base64,${photo.base64}`;
      console.log('Photo URI created, length:', photoUri.length);

      try {
        const photoWidth = (photo as any).width ?? 0;
        const photoHeight = (photo as any).height ?? 0;
        console.log('Photo dimensions:', photoWidth, 'x', photoHeight);
        if (photoWidth > 0 && photoHeight > 0 && photoWidth > photoHeight) {
          console.log('Photo is landscape, rotating to portrait');
          const rotated = await ImageManipulator.manipulateAsync(
            photoUri,
            [{ rotate: -90 }],
            { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
          );
          if (rotated.base64) {
            photoUri = `data:image/jpeg;base64,${rotated.base64}`;
          }
        } else {
          const normalized = await ImageManipulator.manipulateAsync(
            photoUri,
            [],
            { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
          );
          if (normalized.base64) {
            photoUri = `data:image/jpeg;base64,${normalized.base64}`;
          }
        }
      } catch (rotErr) {
        console.log('Orientation normalization failed, using original:', rotErr);
      }
      
      setShowCamera(false);
      setCameraMode(null);


      const timestamp = new Date().toISOString();
      const photoMetadata: PhotoMetadata = {
        timestamp,
      };
      
      console.log('Saving photo for mode:', currentMode);
      
      switch (currentMode) {
        case 'hospitalSticker':
          console.log('Setting hospital sticker photo');
          setFormData(prev => ({ 
            ...prev, 
            hospitalStickerPhoto: photoUri,
            hospitalStickerPhotoMetadata: photoMetadata,
          }));
          break;
        case 'timeInTheatreClock':
          console.log('Setting time in theatre clock photo');
          setFormData(prev => ({ 
            ...prev, 
            timeInTheatreClockPhoto: photoUri,
            timeInTheatreClockPhotoMetadata: photoMetadata,
          }));
          break;
        case 'cArmImage':
          console.log('Adding C arm image');
          setFormData(prev => ({ 
            ...prev, 
            cArmImages: [...prev.cArmImages, { uri: photoUri, metadata: photoMetadata }],
          }));
          break;
        case 'screeningTime':
          console.log('Setting screening time photo');
          setFormData(prev => ({ 
            ...prev, 
            screeningTimePhoto: photoUri,
            screeningTimePhotoMetadata: photoMetadata,
          }));
          break;
        case 'timeOutTheatreClock':
          console.log('Setting time out theatre clock photo');
          setFormData(prev => ({ 
            ...prev, 
            timeOutTheatreClockPhoto: photoUri,
            timeOutTheatreClockPhotoMetadata: photoMetadata,
          }));
          break;
        case 'employerReport':
          console.log('Adding employer report photo');
          setFormData(prev => ({ 
            ...prev, 
            employerReportPhotos: [...prev.employerReportPhotos, { uri: photoUri, metadata: photoMetadata }],
          }));
          break;
        case 'firstMedicalReport':
          console.log('Setting first medical report photo');
          setFormData(prev => ({ 
            ...prev, 
            firstMedicalReportPhoto: photoUri,
            firstMedicalReportPhotoMetadata: photoMetadata,
          }));
          break;
        case 'patientId':
          console.log('Setting patient ID photo');
          setFormData(prev => ({ 
            ...prev, 
            patientIdPhoto: photoUri,
            patientIdPhotoMetadata: photoMetadata,
          }));
          break;
        case 'referralLetter':
          console.log('Setting referral letter photo');
          console.log('Processing as scanned document...');
          
          try {
            // Compress image AGGRESSIVELY to prevent database overflow
            const compressedImage = await ImageManipulator.manipulateAsync(
              photoUri,
              [{ resize: { width: 800 } }],  // Reduced from 1200 to 800
              { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG, base64: true }  // Reduced from 0.6 to 0.3
            );
            
            if (!compressedImage.base64) {
              throw new Error('Failed to compress image');
            }
            
            const compressedUri = `data:image/jpeg;base64,${compressedImage.base64}`;
            
            if (Platform.OS === 'web') {
              // Store ONLY the image, not the PDF to save storage
              console.log('Scanned document compressed');
              console.log('Original size:', photoUri.length, 'Compressed size:', compressedUri.length);
              
              setFormData(prev => ({ 
                ...prev, 
                referralLetterPages: [...prev.referralLetterPages, { uri: compressedUri, metadata: photoMetadata }],
                // Don't store PDF in form data - it will be generated fresh during submission
                referralLetterPDF: undefined,
              }));
              
              Alert.alert('Success', 'Referral letter page added');
            } else {
              console.log('Adding referral letter page (JPEG) - native platform');
              setFormData(prev => ({ 
                ...prev, 
                referralLetterPages: [...prev.referralLetterPages, { uri: compressedUri, metadata: photoMetadata }],
              }));
              
              Alert.alert('Success', 'Referral letter page added');
            }
          } catch (error) {
            console.error('Error processing scanned document:', error);
            Alert.alert('Error', `Failed to process referral letter: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or submit your current draft first to free up storage.`);
          }

          break;
        case 'attachment':
          console.log('Adding attachment photo');
          setFormData(prev => ({ 
            ...prev, 
            attachmentPhotos: [...prev.attachmentPhotos, { uri: photoUri, metadata: photoMetadata }],
          }));
          break;
      }
      
      console.log('Photo saved, restoring scroll position');
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: currentScrollPosition, animated: false });
      }, 100);
      

      
      void (async () => {
        try {
          let location: { latitude: number; longitude: number } | null = null;
          
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
            }
          } else {
            const currentLocation = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            location = {
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            };
          }
          
          if (location) {
            console.log('Photo location captured:', location);
            const updatedMetadata: PhotoMetadata = {
              timestamp,
              latitude: location.latitude,
              longitude: location.longitude,
            };
            
            switch (currentMode) {
              case 'hospitalSticker':
                setFormData(prev => ({ ...prev, hospitalStickerPhotoMetadata: updatedMetadata }));
                break;
              case 'timeInTheatreClock':
                setFormData(prev => ({ ...prev, timeInTheatreClockPhotoMetadata: updatedMetadata }));
                break;
              case 'cArmImage':
                setFormData(prev => ({
                  ...prev,
                  cArmImages: prev.cArmImages.map((img, idx) => 
                    idx === prev.cArmImages.length - 1 ? { ...img, metadata: updatedMetadata } : img
                  ),
                }));
                break;
              case 'screeningTime':
                setFormData(prev => ({ ...prev, screeningTimePhotoMetadata: updatedMetadata }));
                break;
              case 'timeOutTheatreClock':
                setFormData(prev => ({ ...prev, timeOutTheatreClockPhotoMetadata: updatedMetadata }));
                break;
              case 'employerReport':
                setFormData(prev => ({
                  ...prev,
                  employerReportPhotos: prev.employerReportPhotos.map((img, idx) => 
                    idx === prev.employerReportPhotos.length - 1 ? { ...img, metadata: updatedMetadata } : img
                  ),
                }));
                break;
              case 'firstMedicalReport':
                setFormData(prev => ({ ...prev, firstMedicalReportPhotoMetadata: updatedMetadata }));
                break;
              case 'patientId':
                setFormData(prev => ({ ...prev, patientIdPhotoMetadata: updatedMetadata }));
                break;
              case 'referralLetter':
                setFormData(prev => ({ ...prev, referralLetterPhotoMetadata: updatedMetadata }));
                break;
              case 'attachment':
                setFormData(prev => ({
                  ...prev,
                  attachmentPhotos: prev.attachmentPhotos.map((img, idx) => 
                    idx === prev.attachmentPhotos.length - 1 ? { ...img, metadata: updatedMetadata } : img
                  ),
                }));
                break;
            }
          }
        } catch (error) {
          console.error('Error getting photo location (will continue without location):', error);
        }
      })();
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
      setShowCamera(false);
      setCameraMode(null);
    }
  };



  const validateRequiredFields = (): boolean => {
    const requiredFields = [
      { field: formData.hospitalStickerPhoto, name: 'Hospital Sticker Photo' },
      { field: formData.date, name: 'Date' },
      { field: formData.timeInTheatreClockPhoto, name: 'Time In Theatre Clock Photo' },
      { field: formData.timeInTheatre, name: 'Time in Theatre' },
      { field: formData.cArmImages.length > 0, name: 'C Arm Images' },
      { field: formData.screeningTimePhoto, name: 'Screening Time Photo' },
      { field: formData.fluoroscopyTime, name: 'Fluoroscopy Time' },
      { field: formData.timeOutTheatreClockPhoto, name: 'Time Out Theatre Clock Photo' },
      { field: formData.timeOutTheatre, name: 'Time out Theatre' },
      { field: formData.patientFirstName, name: 'First Name' },
      { field: formData.patientLastName, name: 'Last Name' },
      { field: formData.idNumber, name: 'ID Number' },
      { field: formData.coidaMemberNumber, name: 'Coida Number' },
      { field: formData.procedure.length > 0, name: 'Procedure' },
      { field: formData.employerReportPhotos.length > 0, name: 'Employer Report Photos' },
      { field: formData.firstMedicalReportPhoto, name: 'First Medical Report Photo' },
      { field: formData.patientIdPhoto, name: 'Patient ID Photo' },
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
      // NEVER save DICOM files to storage - they're too large
      const formDataWithoutDicom = { ...formData };
      delete formDataWithoutDicom.dicomFiles;
      
      if (currentFormId) {
        await updateDraft(currentFormId, formDataWithoutDicom as any);
        Alert.alert('Success', 'Draft saved successfully!');
      } else {
        const draftData = isFromWorklist ? { ...formDataWithoutDicom, caseStatus: 'case_started' as const } : formDataWithoutDicom;
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
      
      // Don't include DICOM files in form data submission
      // They will be uploaded directly to Dropbox instead
      const updatedFormData = {
        ...formData,
        radiographerSignatureTimestamp: timestamp,
        radiographerSignatureLocation: `${location.coords.latitude}, ${location.coords.longitude}`,
        submissionLatitude: location.coords.latitude,
        submissionLongitude: location.coords.longitude,
      };

      // Save without DICOM files
      const formDataWithoutDicom = { ...updatedFormData };
      delete formDataWithoutDicom.dicomFiles;
      
      if (currentFormId) {
        await submitForm(currentFormId, formDataWithoutDicom as any, user?.username);
      } else {
        const newFormId = await saveDraft(formDataWithoutDicom as any);
        console.log('Draft saved with ID:', newFormId, 'Now submitting...');
        await new Promise(resolve => setTimeout(resolve, 500));
        await submitForm(newFormId, formDataWithoutDicom as any, user?.username);
      }

      try {
        const { syncFormToAirtable, buildCoidaAirtablePayload } = await import('@/utils/airtableSync');
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
          } catch (e) { console.warn('[COIDA] Could not resolve Airtable target:', e); }
        }
        if (baseId && tableId) {
          const payload = buildCoidaAirtablePayload(updatedFormData, { submittedBy: user?.username, timestamp });
          const result = await syncFormToAirtable({ baseId, tableId, recordId }, payload);
          console.log('[COIDA] Airtable sync result:', result);
        }
      } catch (atErr) {
        console.error('[COIDA] Airtable sync failed (form still submitted):', atErr);
      }

      setFormData(getInitialFormData());
      setCurrentFormId(null);
      hasUnsavedChangesRef.current = false;

      const patientName = `${updatedFormData.patientTitle} ${updatedFormData.patientFirstName} ${updatedFormData.patientLastName}`.trim();
      const proceduresList = Array.isArray(updatedFormData.procedure) ? updatedFormData.procedure.join(', ') : String(updatedFormData.procedure);
      const subject = `COIDA Form - ${patientName}`;
      const body =
        `COIDA Form Submission\n\n` +
        `Patient: ${patientName}\n` +
        `ID Number: ${updatedFormData.idNumber}\n` +
        `Date of Birth: ${updatedFormData.dateOfBirth}\n` +
        `Contact: ${updatedFormData.contactNumber}\n` +
        `Email: ${updatedFormData.email}\n\n` +
        `COIDA Number: ${updatedFormData.coidaMemberNumber}\n` +
        `IOD Claim Number: ${updatedFormData.patientIodClaimNumber}\n` +
        `Employer: ${updatedFormData.employerName}\n` +
        `Employer Contact: ${updatedFormData.employerContact}\n` +
        `Date of Incident: ${updatedFormData.dateOfIncident}\n\n` +
        `ICD10 Code: ${updatedFormData.icd10Code || 'N/A'}\n` +
        `Procedures: ${proceduresList}\n` +
        `Date of Procedure: ${updatedFormData.dateOfProcedure}\n\n` +
        `Time In Theatre: ${updatedFormData.timeInTheatre}\n` +
        `Time Out Theatre: ${updatedFormData.timeOutTheatre}\n` +
        `Fluoroscopy Time: ${updatedFormData.fluoroscopyTime}s\n` +
        `${updatedFormData.reasonForTimeDiscrepancy ? `Reason for Time Discrepancy: ${updatedFormData.reasonForTimeDiscrepancy}\n` : ''}\n` +
        `Radiographer: ${updatedFormData.radiographerName}\n` +
        `Signed: ${new Date(timestamp).toLocaleString()}\n` +
        `Location: ${updatedFormData.radiographerSignatureLocation}\n\n` +
        `--- Photo GPS Locations ---\n` +
        (updatedFormData.hospitalStickerPhotoMetadata?.latitude != null
          ? `Hospital Sticker Photo: ${updatedFormData.hospitalStickerPhotoMetadata.latitude}, ${updatedFormData.hospitalStickerPhotoMetadata.longitude} (${updatedFormData.hospitalStickerPhotoMetadata.timestamp})\n`
          : updatedFormData.hospitalStickerPhoto ? `Hospital Sticker Photo: No GPS data\n` : '') +
        (updatedFormData.timeInTheatreClockPhotoMetadata?.latitude != null
          ? `Time In Theatre Clock Photo: ${updatedFormData.timeInTheatreClockPhotoMetadata.latitude}, ${updatedFormData.timeInTheatreClockPhotoMetadata.longitude} (${updatedFormData.timeInTheatreClockPhotoMetadata.timestamp})\n`
          : updatedFormData.timeInTheatreClockPhoto ? `Time In Theatre Clock Photo: No GPS data\n` : '') +
        (updatedFormData.screeningTimePhotoMetadata?.latitude != null
          ? `Screening Time Photo: ${updatedFormData.screeningTimePhotoMetadata.latitude}, ${updatedFormData.screeningTimePhotoMetadata.longitude} (${updatedFormData.screeningTimePhotoMetadata.timestamp})\n`
          : updatedFormData.screeningTimePhoto ? `Screening Time Photo: No GPS data\n` : '') +
        (updatedFormData.timeOutTheatreClockPhotoMetadata?.latitude != null
          ? `Time Out Theatre Clock Photo: ${updatedFormData.timeOutTheatreClockPhotoMetadata.latitude}, ${updatedFormData.timeOutTheatreClockPhotoMetadata.longitude} (${updatedFormData.timeOutTheatreClockPhotoMetadata.timestamp})\n`
          : updatedFormData.timeOutTheatreClockPhoto ? `Time Out Theatre Clock Photo: No GPS data\n` : '') +
        (updatedFormData.firstMedicalReportPhotoMetadata?.latitude != null
          ? `First Medical Report Photo: ${updatedFormData.firstMedicalReportPhotoMetadata.latitude}, ${updatedFormData.firstMedicalReportPhotoMetadata.longitude} (${updatedFormData.firstMedicalReportPhotoMetadata.timestamp})\n`
          : updatedFormData.firstMedicalReportPhoto ? `First Medical Report Photo: No GPS data\n` : '') +
        (updatedFormData.patientIdPhotoMetadata?.latitude != null
          ? `Patient ID Photo: ${updatedFormData.patientIdPhotoMetadata.latitude}, ${updatedFormData.patientIdPhotoMetadata.longitude} (${updatedFormData.patientIdPhotoMetadata.timestamp})\n`
          : updatedFormData.patientIdPhoto ? `Patient ID Photo: No GPS data\n` : '') +
        (updatedFormData.cArmImages?.length
          ? updatedFormData.cArmImages.map((img, i) =>
              img.metadata?.latitude != null
                ? `C-Arm Image ${i + 1}: ${img.metadata.latitude}, ${img.metadata.longitude} (${img.metadata.timestamp})\n`
                : `C-Arm Image ${i + 1}: No GPS data\n`
            ).join('')
          : '') +
        (updatedFormData.employerReportPhotos?.length
          ? updatedFormData.employerReportPhotos.map((img, i) =>
              img.metadata?.latitude != null
                ? `Employer Report ${i + 1}: ${img.metadata.latitude}, ${img.metadata.longitude} (${img.metadata.timestamp})\n`
                : `Employer Report ${i + 1}: No GPS data\n`
            ).join('')
          : '') +
        (updatedFormData.referralLetterPages?.length
          ? updatedFormData.referralLetterPages.map((img, i) =>
              img.metadata?.latitude != null
                ? `Referral Letter Page ${i + 1}: ${img.metadata.latitude}, ${img.metadata.longitude} (${img.metadata.timestamp})\n`
                : `Referral Letter Page ${i + 1}: No GPS data\n`
            ).join('')
          : '') +
        (updatedFormData.attachmentPhotos?.length
          ? updatedFormData.attachmentPhotos.map((img, i) =>
              img.metadata?.latitude != null
                ? `Attachment ${i + 1}: ${img.metadata.latitude}, ${img.metadata.longitude} (${img.metadata.timestamp})\n`
                : `Attachment ${i + 1}: No GPS data\n`
            ).join('')
          : '');

      try {
        console.log('Opening native mail composer for COIDA form...');
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
          if (updatedFormData.timeInTheatreClockPhoto) {
            const path = await saveBase64ToFile(updatedFormData.timeInTheatreClockPhoto, 'time_in_theatre_clock.jpg');
            attachments.push(path);
          }
          if (updatedFormData.screeningTimePhoto) {
            const path = await saveBase64ToFile(updatedFormData.screeningTimePhoto, 'screening_time.jpg');
            attachments.push(path);
          }
          if (updatedFormData.timeOutTheatreClockPhoto) {
            const path = await saveBase64ToFile(updatedFormData.timeOutTheatreClockPhoto, 'time_out_theatre_clock.jpg');
            attachments.push(path);
          }
          if (updatedFormData.firstMedicalReportPhoto) {
            const path = await saveBase64ToFile(updatedFormData.firstMedicalReportPhoto, 'first_medical_report.jpg');
            attachments.push(path);
          }
          if (updatedFormData.patientIdPhoto) {
            const path = await saveBase64ToFile(updatedFormData.patientIdPhoto, 'patient_id.jpg');
            attachments.push(path);
          }
          if (updatedFormData.cArmImages?.length) {
            for (let i = 0; i < updatedFormData.cArmImages.length; i++) {
              const img = updatedFormData.cArmImages[i];
              if (img.uri) {
                const path = await saveBase64ToFile(img.uri, `c_arm_image_${i + 1}.jpg`);
                attachments.push(path);
              }
            }
          }
          if (updatedFormData.employerReportPhotos?.length) {
            for (let i = 0; i < updatedFormData.employerReportPhotos.length; i++) {
              const img = updatedFormData.employerReportPhotos[i];
              if (img.uri) {
                const path = await saveBase64ToFile(img.uri, `employer_report_${i + 1}.jpg`);
                attachments.push(path);
              }
            }
          }
          if (updatedFormData.referralLetterPages?.length) {
            try {
              if (updatedFormData.referralLetterPDF) {
                console.log('Using existing referral letter PDF');
                const path = await saveBase64ToFile(updatedFormData.referralLetterPDF, 'referral_letter.pdf');
                attachments.push(path);
              } else {
                console.log('Converting referral letter pages to PDF...');
                const imageUris = updatedFormData.referralLetterPages.map(p => p.uri).filter(Boolean);
                const result = await convertImagesToPDF(imageUris, 'referral_letter.pdf');
                const pdfBase64 = result?.base64;
                const pdfDataUri = `data:application/pdf;base64,${pdfBase64}`;
                const path = await saveBase64ToFile(pdfDataUri, 'referral_letter.pdf');
                attachments.push(path);
                console.log('Referral letter PDF created and attached');
              }
            } catch (pdfErr) {
              console.error('Failed to create referral letter PDF, falling back to JPEGs:', pdfErr);
              for (let i = 0; i < updatedFormData.referralLetterPages.length; i++) {
                const img = updatedFormData.referralLetterPages[i];
                if (img.uri) {
                  const path = await saveBase64ToFile(img.uri, `referral_letter_${i + 1}.jpg`);
                  attachments.push(path);
                }
              }
            }
          }
          if (updatedFormData.attachmentPhotos?.length) {
            for (let i = 0; i < updatedFormData.attachmentPhotos.length; i++) {
              const img = updatedFormData.attachmentPhotos[i];
              if (img.uri) {
                const path = await saveBase64ToFile(img.uri, `attachment_${i + 1}.jpg`);
                attachments.push(path);
              }
            }
          }

          try {
            console.log('Generating Excel spreadsheet for email attachment...');
            const excelFormData = {
              ...updatedFormData,
              id: currentFormId || 'temp',
              mainMemberTitle: 'Mr' as const,
              mainMemberFirstName: '',
              mainMemberLastName: '',
              mainMemberIdNumber: '',
              medicalAidName: '',
              membershipNumber: '',
              dependantCode: '',
              nextOfKinName: '',
              nextOfKinContact: '',
              referringDoctor: '',
              referringDoctorContact: '',
              authorisationNumber: '',
              status: 'submitted' as const,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            const base64Excel = generateClaimSpreadsheet(excelFormData as any);
            const excelFilename = `COIDA_${updatedFormData.patientLastName}_${updatedFormData.patientFirstName}_${new Date().toISOString().split('T')[0]}.xlsx`;
            const excelPath = await saveBase64ToFile(`data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64Excel}`, excelFilename);
            attachments.push(excelPath);
            console.log('Excel spreadsheet attached:', excelFilename);
          } catch (excelErr) {
            console.error('Failed to generate Excel attachment:', excelErr);
          }
        }

        console.log('Mail attachments count:', attachments.length);
        const isAvailable = await MailComposer.isAvailableAsync();
        if (isAvailable) {
          await MailComposer.composeAsync({
            recipients: ['paul@intouchmedtech.co.za', 'nokuthula@debttec.co.za', 'allan@medimarketing100.co.za'],
            subject,
            body,
            attachments,
          });
        } else {
          console.log('Mail composer not available on this device');
        }
        Alert.alert('Success', 'COIDA form completed successfully!', [
          { text: 'OK', onPress: () => router.push('/(tabs)/' as any) },
        ]);
      } catch (emailError) {
        console.error('Mail composer error:', emailError);
        Alert.alert(
          'Form Saved',
          'COIDA form was saved. You can share it from the forms list.',
          [{ text: 'OK', onPress: () => router.push('/(tabs)/' as any) }]
        );
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      Alert.alert('Error', `Failed to submit form: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleExportToExcel = async () => {
    if (!currentFormId) {
      Alert.alert('Error', 'No form data available to export');
      return;
    }

    setExportingExcel(true);

    try {
      const form = getForm(currentFormId);
      if (!form) {
        throw new Error('Form not found');
      }

      console.log('Generating Excel export...');
      const base64Excel = await generateExcelExport(form as any);
      
      const firstName = form.patientFirstName || '';
      const lastName = form.patientLastName || '';
      const filename = `COIDA_${lastName}_${firstName}_${new Date().toISOString().split('T')[0]}.xlsx`;

      if (Platform.OS === 'web') {
        const blob = new Blob(
          [Uint8Array.from(atob(base64Excel), c => c.charCodeAt(0))],
          { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
        );
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        const FileSystem = await import('expo-file-system/legacy');
        const Sharing = await import('expo-sharing');
        
        const fileUri = `${(FileSystem as any).cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, base64Excel, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: 'Export Excel File',
            UTI: 'com.microsoft.excel.xlsx',
          });
        } else {
          Alert.alert('Success', `Excel file saved to: ${fileUri}`);
        }
      }

      Alert.alert('Success', 'Excel file generated successfully!');
    } catch (error) {
      console.error('Error generating Excel:', error);
      Alert.alert('Error', 'Failed to generate Excel file. Please try again.');
    } finally {
      setExportingExcel(false);
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
      <Stack.Screen options={{ title: 'COIDA Form' }} />
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
                  disabled={isReadOnly}
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
              editable={!isReadOnly}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Last Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.patientLastName}
              onChangeText={(value) => setFormData(prev => ({ ...prev, patientLastName: value }))}
              placeholder="Enter last name"
              editable={!isReadOnly}
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
              editable={!isReadOnly}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Date of Birth</Text>
            <TextInput
              style={styles.input}
              value={formData.dateOfBirth}
              onChangeText={(value) => setFormData(prev => ({ ...prev, dateOfBirth: value }))}
              placeholder="DD/MM/YYYY (auto-filled for SA ID)"
              editable={!isReadOnly}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Contact Number</Text>
            <TextInput
              style={styles.input}
              value={formData.contactNumber}
              onChangeText={(value) => setFormData(prev => ({ ...prev, contactNumber: value }))}
              placeholder="Enter contact number"
              keyboardType="phone-pad"
              editable={!isReadOnly}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(value) => setFormData(prev => ({ ...prev, email: value }))}
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isReadOnly}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Coida Number *</Text>
            <TextInput
              style={styles.input}
              value={formData.coidaMemberNumber}
              onChangeText={(value) => handleNumericInput('coidaMemberNumber', value)}
              placeholder="Enter Coida number"
              keyboardType="numeric"
              editable={!isReadOnly}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Patient IOD Claim Number</Text>
            <TextInput
              style={styles.input}
              value={formData.patientIodClaimNumber}
              onChangeText={(value) => handleNumericInput('patientIodClaimNumber', value)}
              placeholder="Enter Patient IOD claim number"
              keyboardType="numeric"
              editable={!isReadOnly}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Employer Name</Text>
            <TextInput
              style={styles.input}
              value={formData.employerName}
              onChangeText={(value) => setFormData(prev => ({ ...prev, employerName: value }))}
              placeholder="Enter employer name"
              editable={!isReadOnly}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Employer Contact</Text>
            <TextInput
              style={styles.input}
              value={formData.employerContact}
              onChangeText={(value) => setFormData(prev => ({ ...prev, employerContact: value }))}
              placeholder="Enter employer contact"
              keyboardType="phone-pad"
              editable={!isReadOnly}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Date of Incident</Text>
            <TextInput
              style={styles.input}
              value={formData.dateOfIncident}
              onChangeText={(value) => setFormData(prev => ({ ...prev, dateOfIncident: value }))}
              placeholder="Enter date of incident (DD/MM/YYYY)"
              editable={!isReadOnly}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Procedures * (Multi-select)</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => !isReadOnly && setShowProcedurePicker(true)}
              disabled={isReadOnly}
            >
              <Text style={[styles.pickerButtonText, formData.procedure.length === 0 && styles.pickerPlaceholder]}>
                {formData.procedure.length > 0 ? `${formData.procedure.length} procedure${formData.procedure.length > 1 ? 's' : ''} selected` : 'Select procedures'}
              </Text>
              <ChevronDown size={20} color="#666" />
            </TouchableOpacity>
            {formData.procedure.length > 0 && (
              <View style={styles.selectedProceduresContainer}>
                {formData.procedure.map((proc, index) => (
                  <View key={index} style={styles.selectedProcedureTag}>
                    <Text style={styles.selectedProcedureText} numberOfLines={1}>{proc}</Text>
                    {!isReadOnly && (
                      <TouchableOpacity
                        onPress={() => {
                          setFormData(prev => ({
                            ...prev,
                            procedure: prev.procedure.filter((_, i) => i !== index)
                          }));
                        }}
                        style={styles.removeProcedureButton}
                      >
                        <X size={14} color="#00A3A3" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Date of Procedure *</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => {
                if (isReadOnly) return;
                const parts = formData.dateOfProcedure.split('/');
                if (parts.length === 3) {
                  const d = parseInt(parts[0], 10);
                  const m = parseInt(parts[1], 10) - 1;
                  const y = parseInt(parts[2], 10);
                  const parsed = new Date(y, m, d);
                  if (!isNaN(parsed.getTime())) {
                    setCalendarViewDate(new Date(y, m, 1));
                    setSelectedCalendarDay(d);
                  } else {
                    setCalendarViewDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
                    setSelectedCalendarDay(new Date().getDate());
                  }
                } else {
                  setCalendarViewDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
                  setSelectedCalendarDay(new Date().getDate());
                }
                setShowDateOfProcedurePicker(true);
              }}
              disabled={isReadOnly}
            >
              <Text style={[styles.datePickerButtonText, !formData.dateOfProcedure && styles.pickerPlaceholder]}>
                {formData.dateOfProcedure || 'Select date'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

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
                <Camera size={24} color="#00A3A3" />
                <Text style={styles.photoButtonText}>Take Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Date of Capture/Report *</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={formData.date}
              editable={false}
              placeholder="Auto-set on submission"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theatre Information</Text>

          <View style={styles.field}>
            <Text style={styles.label}>ICD10 Code</Text>
            <TextInput
              style={styles.input}
              value={formData.icd10Code}
              onChangeText={(value) => setFormData(prev => ({ ...prev, icd10Code: value }))}
              placeholder="Enter ICD10 code (e.g., S72.0)"
              autoCapitalize="characters"
              editable={!isReadOnly}
            />
          </View>

          <View style={styles.photoField}>
            <Text style={styles.label}>Photo of Theatre Clock for &quot;Time In Theatre&quot; *</Text>
            {formData.timeInTheatreClockPhoto ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: formData.timeInTheatreClockPhoto }} style={styles.photoImage} />
                {formData.timeInTheatreClockPhotoMetadata?.latitude != null && formData.timeInTheatreClockPhotoMetadata?.longitude != null && (
                  <View style={styles.gpsBadge}>
                    <MapPin size={12} color="#28A745" />
                    <Text style={styles.gpsText}>{formData.timeInTheatreClockPhotoMetadata.latitude.toFixed(6)}, {formData.timeInTheatreClockPhotoMetadata.longitude.toFixed(6)}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={() => openCamera('timeInTheatreClock')}
                  disabled={isReadOnly}
                >
                  <Text style={styles.retakeButtonText}>Retake</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => openCamera('timeInTheatreClock')}
                disabled={isReadOnly}
              >
                <Camera size={24} color="#00A3A3" />
                <Text style={styles.photoButtonText}>Take Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Time in Theatre *</Text>
            <TextInput
              style={styles.input}
              value={formData.timeInTheatre}
              onChangeText={(value) => handleTimeInput('timeInTheatre', value)}
              placeholder="Enter time (e.g., 14H30)"
              keyboardType="numeric"
              maxLength={5}
              editable={!isReadOnly}
            />
          </View>

          <View style={styles.photoField}>
            <Text style={styles.label}>Photo of Image from C Arm (Multiple Images) *</Text>
            {(formData.cArmImages ?? []).map((image, index) => (
              <View key={index} style={styles.photoPreview}>
                <Image source={{ uri: image.uri }} style={styles.photoImage} />
                {image.metadata?.latitude != null && image.metadata?.longitude != null && (
                  <View style={styles.gpsBadge}>
                    <MapPin size={12} color="#28A745" />
                    <Text style={styles.gpsText}>{image.metadata.latitude.toFixed(6)}, {image.metadata.longitude.toFixed(6)}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => {
                    setFormData(prev => ({
                      ...prev,
                      cArmImages: prev.cArmImages.filter((_, i) => i !== index),
                    }));
                  }}
                  disabled={isReadOnly}
                >
                  <Text style={styles.deleteButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.photoButton}
              onPress={() => openCamera('cArmImage')}
              disabled={isReadOnly}
            >
              <Camera size={24} color="#00A3A3" />
              <Text style={styles.photoButtonText}>Add C Arm Image</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.photoField}>
            <Text style={styles.label}>Photo of Screening Time (in seconds) *</Text>
            {formData.screeningTimePhoto ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: formData.screeningTimePhoto }} style={styles.photoImage} />
                {formData.screeningTimePhotoMetadata?.latitude != null && formData.screeningTimePhotoMetadata?.longitude != null && (
                  <View style={styles.gpsBadge}>
                    <MapPin size={12} color="#28A745" />
                    <Text style={styles.gpsText}>{formData.screeningTimePhotoMetadata.latitude.toFixed(6)}, {formData.screeningTimePhotoMetadata.longitude.toFixed(6)}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={() => openCamera('screeningTime')}
                  disabled={isReadOnly}
                >
                  <Text style={styles.retakeButtonText}>Retake</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => openCamera('screeningTime')}
                disabled={isReadOnly}
              >
                <Camera size={24} color="#00A3A3" />
                <Text style={styles.photoButtonText}>Take Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Fluoroscopy Time (in seconds) *</Text>
            <TextInput
              style={styles.input}
              value={formData.fluoroscopyTime}
              onChangeText={(value) => handleNumericInput('fluoroscopyTime', value)}
              placeholder="Enter time in seconds (e.g., 120)"
              keyboardType="numeric"
              editable={!isReadOnly}
            />
          </View>

          <View style={styles.photoField}>
            <Text style={styles.label}>Photo of &quot;Time Out of theatre&quot; *</Text>
            {formData.timeOutTheatreClockPhoto ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: formData.timeOutTheatreClockPhoto }} style={styles.photoImage} />
                {formData.timeOutTheatreClockPhotoMetadata?.latitude != null && formData.timeOutTheatreClockPhotoMetadata?.longitude != null && (
                  <View style={styles.gpsBadge}>
                    <MapPin size={12} color="#28A745" />
                    <Text style={styles.gpsText}>{formData.timeOutTheatreClockPhotoMetadata.latitude.toFixed(6)}, {formData.timeOutTheatreClockPhotoMetadata.longitude.toFixed(6)}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={() => openCamera('timeOutTheatreClock')}
                  disabled={isReadOnly}
                >
                  <Text style={styles.retakeButtonText}>Retake</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => openCamera('timeOutTheatreClock')}
                disabled={isReadOnly}
              >
                <Camera size={24} color="#00A3A3" />
                <Text style={styles.photoButtonText}>Take Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Time out Theatre *</Text>
            <TextInput
              style={styles.input}
              value={formData.timeOutTheatre}
              onChangeText={(value) => handleTimeInput('timeOutTheatre', value)}
              placeholder="Enter time (e.g., 16H45)"
              keyboardType="numeric"
              maxLength={5}
              editable={!isReadOnly}
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
                  disabled={isReadOnly}
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
                editable={!isReadOnly}
              />
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documents</Text>

          <View style={styles.photoField}>
            <Text style={styles.label}>Photo of Department of Labour &quot;Employers Report&quot; (Multiple Pages) *</Text>
            {formData.employerReportPhotos.map((photo, index) => (
              <View key={index} style={styles.photoPreview}>
                <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                {photo.metadata?.latitude != null && photo.metadata?.longitude != null && (
                  <View style={styles.gpsBadge}>
                    <MapPin size={12} color="#28A745" />
                    <Text style={styles.gpsText}>{photo.metadata.latitude.toFixed(6)}, {photo.metadata.longitude.toFixed(6)}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => {
                    setFormData(prev => ({
                      ...prev,
                      employerReportPhotos: prev.employerReportPhotos.filter((_, i) => i !== index),
                    }));
                  }}
                  disabled={isReadOnly}
                >
                  <Text style={styles.deleteButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.photoButton}
              onPress={() => openCamera('employerReport')}
              disabled={isReadOnly}
            >
              <Camera size={24} color="#00A3A3" />
              <Text style={styles.photoButtonText}>Add Employer Report Page</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.photoField}>
            <Text style={styles.label}>Photo of &quot;First Medical Report&quot; *</Text>
            {formData.firstMedicalReportPhoto ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: formData.firstMedicalReportPhoto }} style={styles.photoImage} />
                {formData.firstMedicalReportPhotoMetadata?.latitude != null && formData.firstMedicalReportPhotoMetadata?.longitude != null && (
                  <View style={styles.gpsBadge}>
                    <MapPin size={12} color="#28A745" />
                    <Text style={styles.gpsText}>{formData.firstMedicalReportPhotoMetadata.latitude.toFixed(6)}, {formData.firstMedicalReportPhotoMetadata.longitude.toFixed(6)}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={() => openCamera('firstMedicalReport')}
                  disabled={isReadOnly}
                >
                  <Text style={styles.retakeButtonText}>Retake</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => openCamera('firstMedicalReport')}
                disabled={isReadOnly}
              >
                <Camera size={24} color="#00A3A3" />
                <Text style={styles.photoButtonText}>Take Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.photoField}>
            <Text style={styles.label}>Photo of Patient ID *</Text>
            {formData.patientIdPhoto ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: formData.patientIdPhoto }} style={styles.photoImage} />
                {formData.patientIdPhotoMetadata?.latitude != null && formData.patientIdPhotoMetadata?.longitude != null && (
                  <View style={styles.gpsBadge}>
                    <MapPin size={12} color="#28A745" />
                    <Text style={styles.gpsText}>{formData.patientIdPhotoMetadata.latitude.toFixed(6)}, {formData.patientIdPhotoMetadata.longitude.toFixed(6)}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={() => openCamera('patientId')}
                  disabled={isReadOnly}
                >
                  <Text style={styles.retakeButtonText}>Retake</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => openCamera('patientId')}
                disabled={isReadOnly}
              >
                <Camera size={24} color="#00A3A3" />
                <Text style={styles.photoButtonText}>Take Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.photoField}>
            <Text style={styles.label}>Photo of Referral Letter</Text>
            <Text style={styles.labelSubtitle}>Document will be automatically enhanced and converted to PDF</Text>
            {formData.referralLetterPages.length > 0 ? (
              <>
                {formData.referralLetterPages.map((page, index) => (
                  <View key={index} style={styles.photoPreview}>
                    <Text style={styles.pageNumber}>Page {index + 1} of {formData.referralLetterPages.length}</Text>
                    <Image source={{ uri: page.uri }} style={styles.photoImage} />
                    {page.metadata?.latitude != null && page.metadata?.longitude != null && (
                      <View style={styles.gpsBadge}>
                        <MapPin size={12} color="#28A745" />
                        <Text style={styles.gpsText}>{page.metadata.latitude.toFixed(6)}, {page.metadata.longitude.toFixed(6)}</Text>
                      </View>
                    )}
                    {!isReadOnly && (
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => {
                          setFormData(prev => ({
                            ...prev,
                            referralLetterPages: prev.referralLetterPages.filter((_, i) => i !== index),
                            referralLetterPDF: undefined,
                          }));
                        }}
                      >
                        <Trash size={16} color="#FFFFFF" />
                        <Text style={styles.deleteButtonText}>Remove Page</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {formData.referralLetterPDF && (
                  <View style={styles.scanBadge}>
                    <Scan size={16} color="#00A3A3" />
                    <Text style={styles.scanBadgeText}>Scanned & Converted to PDF</Text>
                  </View>
                )}
                {!isReadOnly && (
                  <TouchableOpacity
                    style={[styles.photoButton, { marginTop: 12 }]}
                    onPress={() => setShowDocumentScanner(true)}
                  >
                    <Plus size={20} color="#00A3A3" />
                    <Text style={styles.photoButtonText}>Add More Pages</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => !isReadOnly && setShowDocumentScanner(true)}
                disabled={isReadOnly}
              >
                <ScanLine size={24} color="#00A3A3" />
                <Text style={styles.photoButtonText}>Scan Document</Text>
              </TouchableOpacity>
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

        {isReadOnly && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Export</Text>
            <TouchableOpacity 
              style={styles.excelButton} 
              onPress={handleExportToExcel}
              disabled={exportingExcel}
            >
              <FileSpreadsheet size={20} color="#FFFFFF" />
              <Text style={styles.excelButtonText}>
                {exportingExcel ? 'Generating Excel...' : 'Export to Excel'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.uploadHint}>
              Generate Excel file with billing information
            </Text>
          </View>
        )}

        {!isReadOnly && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.draftButton} onPress={handleSaveDraft}>
              <Save size={20} color="#00A3A3" />
              <Text style={styles.draftButtonText}>Save Draft</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal
        visible={showProcedurePicker}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowProcedurePicker(false);
          setProcedureSearch('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Procedures</Text>
              <TouchableOpacity onPress={() => {
                setShowProcedurePicker(false);
                setProcedureSearch('');
              }}>
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.selectedCountBadge}>
              <Text style={styles.selectedCountText}>
                {formData.procedure.length} selected
              </Text>
            </View>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                value={procedureSearch}
                onChangeText={setProcedureSearch}
                placeholder="Search by code or name..."
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <FlatList
              data={PROCEDURE_OPTIONS.filter(item => {
                if (!procedureSearch) return true;
                const searchLower = procedureSearch.toLowerCase();
                return (
                  item.code.toLowerCase().includes(searchLower) ||
                  item.name.toLowerCase().includes(searchLower)
                );
              })}
              keyExtractor={(item) => item.code}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Text style={styles.emptyListText}>No procedures found</Text>
                </View>
              }
              renderItem={({ item }) => {
                const procedureString = `${item.code} ${item.name}`;
                const isSelected = formData.procedure.includes(procedureString);
                return (
                  <TouchableOpacity
                    style={[
                      styles.procedureItem,
                      isSelected && styles.procedureItemSelected,
                    ]}
                    onPress={() => {
                      setFormData(prev => ({
                        ...prev,
                        procedure: isSelected
                          ? prev.procedure.filter(p => p !== procedureString)
                          : [...prev.procedure, procedureString]
                      }));
                    }}
                  >
                    <View style={styles.procedureItemContent}>
                      <View style={styles.procedureItemText}>
                        <Text style={styles.procedureCode}>{item.code}</Text>
                        <Text style={styles.procedureName}>{item.name}</Text>
                      </View>
                      {isSelected && (
                        <View style={styles.checkmark}>
                          <Check size={20} color="#00A3A3" />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDateOfProcedurePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDateOfProcedurePicker(false)}
      >
        <View style={styles.dateModalOverlay}>
          <View style={styles.dateModalContainer}>
            <View style={styles.dateModalHeader}>
              <Text style={styles.dateModalTitle}>Select Date of Procedure</Text>
            </View>
            {(() => {
              const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
              const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
              const viewYear = calendarViewDate.getFullYear();
              const viewMonth = calendarViewDate.getMonth();
              const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
              const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
              const calendarCells: (number | null)[] = [];
              for (let i = 0; i < firstDayOfMonth; i++) calendarCells.push(null);
              for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
              const goToPrevMonth = () => {
                setCalendarViewDate(new Date(viewYear, viewMonth - 1, 1));
              };
              const goToNextMonth = () => {
                setCalendarViewDate(new Date(viewYear, viewMonth + 1, 1));
              };
              return (
                <View style={styles.calendarContainer}>
                  <View style={styles.calendarNav}>
                    <TouchableOpacity onPress={goToPrevMonth} style={styles.calendarNavButton}>
                      <Text style={styles.calendarNavButtonText}>{"<"}</Text>
                    </TouchableOpacity>
                    <Text style={styles.calendarMonthYear}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
                    <TouchableOpacity onPress={goToNextMonth} style={styles.calendarNavButton}>
                      <Text style={styles.calendarNavButtonText}>{">"}  </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.calendarDayLabels}>
                    {DAY_LABELS.map((label) => (
                      <View key={label} style={styles.calendarDayLabelCell}>
                        <Text style={styles.calendarDayLabelText}>{label}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.calendarGrid}>
                    {calendarCells.map((day, idx) => (
                      <TouchableOpacity
                        key={`cal-${idx}`}
                        style={[
                          styles.calendarDayCell,
                          day === selectedCalendarDay && styles.calendarDayCellSelected,
                        ]}
                        onPress={() => {
                          if (day) setSelectedCalendarDay(day);
                        }}
                        disabled={!day}
                      >
                        <Text style={[
                          styles.calendarDayText,
                          day === selectedCalendarDay && styles.calendarDayTextSelected,
                          !day && { color: 'transparent' },
                        ]}>
                          {day ?? ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })()}
            <View style={styles.dateModalSelectedDisplay}>
              <Text style={styles.dateModalSelectedText}>
                Selected: {String(selectedCalendarDay).padStart(2, '0')}/{String(calendarViewDate.getMonth() + 1).padStart(2, '0')}/{calendarViewDate.getFullYear()}
              </Text>
            </View>
            <View style={styles.dateModalButtons}>
              <TouchableOpacity
                style={styles.dateModalCancelButton}
                onPress={() => setShowDateOfProcedurePicker(false)}
              >
                <Text style={styles.dateModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateModalConfirmButton}
                onPress={() => {
                  const day = String(selectedCalendarDay).padStart(2, '0');
                  const month = String(calendarViewDate.getMonth() + 1).padStart(2, '0');
                  const year = calendarViewDate.getFullYear();
                  setFormData(prev => ({
                    ...prev,
                    dateOfProcedure: `${day}/${month}/${year}`,
                  }));
                  setShowDateOfProcedurePicker(false);
                }}
              >
                <Text style={styles.dateModalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <DocumentScanner
        visible={showDocumentScanner}
        onClose={() => setShowDocumentScanner(false)}
        onComplete={(pdfBase64, pages) => {
          console.log('Document scanner complete:', pages.length, 'pages');
          
          const pagesWithMetadata = pages.map(page => ({
            uri: page.uri,
            metadata: {
              timestamp: page.timestamp,
              ...(page.latitude != null && { latitude: page.latitude }),
              ...(page.longitude != null && { longitude: page.longitude }),
            },
          }));
          
          setFormData(prev => ({
            ...prev,
            referralLetterPages: [...prev.referralLetterPages, ...pagesWithMetadata],
            referralLetterPDF: pdfBase64 ? `data:application/pdf;base64,${pdfBase64}` : prev.referralLetterPDF,
          }));
          
          setShowDocumentScanner(false);
          
          if (pdfBase64) {
            Alert.alert('Success', `${pages.length} page(s) scanned and converted to PDF`);
          } else {
            Alert.alert('Success', `${pages.length} page(s) added (images only on native)`);
          }
        }}
      />
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
    color: '#00A3A3',
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
  labelSubtitle: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: -4,
    marginBottom: 8,
    fontStyle: 'italic' as const,
  },
  scanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E7F9F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  scanBadgeText: {
    fontSize: 12,
    color: '#00A3A3',
    fontWeight: '600' as const,
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
    backgroundColor: '#00A3A3',
    borderColor: '#00A3A3',
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
    backgroundColor: '#E7F9F9',
    borderWidth: 2,
    borderColor: '#00A3A3',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    gap: 8,
  },
  photoButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#00A3A3',
  },
  photoPreview: {
    alignItems: 'center',
    gap: 8,
  },
  photoImage: {
    width: '100%',
    height: 200,
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
    backgroundColor: '#00A3A3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retakeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  deleteButton: {
    backgroundColor: '#DC3545',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  pageNumber: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#00A3A3',
    marginBottom: 8,
    textAlign: 'center' as const,
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
    borderColor: '#00A3A3',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  draftButtonText: {
    color: '#00A3A3',
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
  bottomSpacer: {
    height: 40,
  },
  excelButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 12,
    backgroundColor: '#217346',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#217346',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  excelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  uploadHint: {
    fontSize: 13,
    color: '#6C757D',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic' as const,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E1E4E8',
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#333333',
    flex: 1,
  },
  pickerPlaceholder: {
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E4E8',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#333333',
  },
  procedureItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  procedureItemSelected: {
    backgroundColor: '#E7F9F9',
  },
  procedureCode: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#00A3A3',
    marginBottom: 4,
  },
  procedureName: {
    fontSize: 14,
    color: '#666666',
  },
  searchContainer: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E4E8',
  },
  searchInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E1E4E8',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333333',
  },
  emptyList: {
    padding: 32,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 16,
    color: '#999',
  },
  selectedProceduresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  selectedProcedureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E7F9F9',
    borderWidth: 1,
    borderColor: '#00A3A3',
    borderRadius: 8,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
    gap: 8,
    maxWidth: '100%',
  },
  selectedProcedureText: {
    fontSize: 13,
    color: '#00A3A3',
    fontWeight: '600' as const,
    flex: 1,
  },
  removeProcedureButton: {
    padding: 2,
  },
  procedureItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  procedureItemText: {
    flex: 1,
  },
  checkmark: {
    marginLeft: 12,
  },
  selectedCountBadge: {
    backgroundColor: '#E7F9F9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E4E8',
  },
  selectedCountText: {
    fontSize: 14,
    color: '#00A3A3',
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  datePickerButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E1E4E8',
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#333333',
  },
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dateModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  dateModalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E4E8',
  },
  dateModalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#333333',
    textAlign: 'center',
  },
  calendarContainer: {
    padding: 16,
  },
  calendarNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calendarNavButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  calendarNavButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#00A3A3',
  },
  calendarMonthYear: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#333',
  },
  calendarDayLabels: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  calendarDayLabelCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  calendarDayLabelText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#999',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayCell: {
    width: '14.28%' as any,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDayCellSelected: {
    backgroundColor: '#00A3A3',
    borderRadius: 20,
  },
  calendarDayText: {
    fontSize: 15,
    color: '#333',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
  },
  dateModalSelectedDisplay: {
    padding: 16,
    backgroundColor: '#E7F9F9',
    borderTopWidth: 1,
    borderTopColor: '#E1E4E8',
  },
  dateModalSelectedText: {
    fontSize: 16,
    color: '#00A3A3',
    textAlign: 'center',
    fontWeight: '600' as const,
  },
  dateModalButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
  },
  dateModalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E1E4E8',
  },
  dateModalCancelText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600' as const,
  },
  dateModalConfirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#00A3A3',
  },
  dateModalConfirmText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600' as const,
  },

});
