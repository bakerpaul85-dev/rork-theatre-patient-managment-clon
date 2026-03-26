import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import { generateClaimSpreadsheet } from '@/utils/excelGenerator';
import { convertImageToPDF } from '@/utils/pdfConverter';
import * as Sharing from 'expo-sharing';
import {
  initializeStorage,
  savePhoto,
  readPhoto,
  deletePhoto,
  getStorageStats,
  cleanupOrphanedPhotos,
} from '@/utils/photoStorage';

type Title = 'Mr' | 'Mrs' | 'Miss' | 'Ms' | 'Dr' | 'Prof';

export interface PhotoMetadata {
  timestamp: string;
  latitude?: number;
  longitude?: number;
}

export interface FormData {
  id: string;
  formType: 'medical-aid' | 'coida';
  submittedBy?: string;
  hospitalStickerPhoto: string | null;
  hospitalStickerPhotoMetadata?: PhotoMetadata;
  date: string;
  patientTitle: Title;
  patientFirstName: string;
  patientLastName: string;
  patientName?: string;
  idNumber: string;
  dateOfBirth: string;
  contactNumber: string;
  email: string;
  mainMemberTitle: Title;
  mainMemberFirstName: string;
  mainMemberLastName: string;
  mainMemberIdNumber: string;
  medicalAidName: string;
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
  submissionLatitude?: number;
  submissionLongitude?: number;
  status: 'draft' | 'submitted';
  createdAt: string;
  updatedAt: string;
}

interface FormsContextValue {
  forms: FormData[];
  isLoading: boolean;
  saveDraft: (formData: Omit<FormData, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateDraft: (id: string, formData: Partial<FormData>) => Promise<void>;
  submitForm: (id: string, formData: Partial<FormData>, username?: string) => Promise<void>;
  deleteForm: (id: string) => Promise<void>;
  getForm: (id: string) => FormData | undefined;
  getDrafts: () => FormData[];
  getSubmittedForms: () => FormData[];
  generateExcelExport: (form: FormData) => Promise<string>;
  sharePDF: (form: FormData) => Promise<void>;
}

const FORMS_INDEX_KEY = '@patient_forms_index';
const FORM_KEY_PREFIX = '@patient_form_';
const LEGACY_FORMS_STORAGE_KEY = '@patient_forms';
const MAX_ASYNC_STORAGE_ROW_SIZE = 1_500_000;

const sanitizeFormForStorage = (form: any): any => {
  const cleaned = { ...form };
  const photoFields = [
    'hospitalStickerPhoto', 'timeInTheatrePhoto', 'timeOutTheatrePhoto',
    'timeInTheatreClockPhoto', 'timeOutTheatreClockPhoto', 'screeningTimePhoto',
    'firstMedicalReportPhoto', 'patientIdPhoto', 'referralLetterPhoto',
  ];
  for (const field of photoFields) {
    if (cleaned[field] && typeof cleaned[field] === 'string' && cleaned[field].length > 500) {
      cleaned[field] = null;
    }
  }
  const arrayPhotoFields = ['cArmImages', 'employerReportPhotos', 'attachmentPhotos'];
  for (const field of arrayPhotoFields) {
    if (Array.isArray(cleaned[field])) {
      cleaned[field] = [];
    }
  }
  delete cleaned.dicomFiles;
  return cleaned;
};

const safeString = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

export const [FormsProvider, useForms] = createContextHook<FormsContextValue>(() => {
  const [forms, setForms] = useState<FormData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const nukeLegacyStorage = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(LEGACY_FORMS_STORAGE_KEY);
      console.log('Removed legacy storage key via removeItem');
    } catch (removeError) {
      console.warn('removeItem failed for legacy key, trying multiRemove...', removeError);
      try {
        await AsyncStorage.multiRemove([LEGACY_FORMS_STORAGE_KEY]);
        console.log('Removed legacy storage key via multiRemove');
      } catch (multiError) {
        console.warn('multiRemove also failed, trying getAllKeys + selective clear...', multiError);
        try {
          const allKeys = await AsyncStorage.getAllKeys();
          const legacyKeys = allKeys.filter(k => k === LEGACY_FORMS_STORAGE_KEY);
          if (legacyKeys.length > 0) {
            await AsyncStorage.multiRemove(legacyKeys);
            console.log('Removed legacy keys via getAllKeys + multiRemove');
          }
        } catch (finalError) {
          console.error('All legacy cleanup attempts failed:', finalError);
        }
      }
    }
  }, []);

  const migrateFromLegacyStorage = useCallback(async (): Promise<any[] | null> => {
    try {
      let legacyData: string | null = null;
      try {
        legacyData = await AsyncStorage.getItem(LEGACY_FORMS_STORAGE_KEY);
      } catch (readError: any) {
        console.error('Legacy storage read error (likely too large):', readError?.message);
        await nukeLegacyStorage();
        return null;
      }
      if (!legacyData) return null;
      
      console.log('Migrating from legacy single-key storage...');
      let parsedForms: any[];
      try {
        parsedForms = JSON.parse(legacyData);
      } catch {
        console.error('Failed to parse legacy data, removing...');
        await nukeLegacyStorage();
        return null;
      }
      const formIds: string[] = [];
      
      for (const form of parsedForms) {
        try {
          const sanitized = sanitizeFormForStorage(form);
          formIds.push(sanitized.id);
          await AsyncStorage.setItem(`${FORM_KEY_PREFIX}${sanitized.id}`, JSON.stringify(sanitized));
        } catch (formError) {
          console.warn(`Skipping form during migration (too large):`, formError);
        }
      }
      
      if (formIds.length > 0) {
        await AsyncStorage.setItem(FORMS_INDEX_KEY, JSON.stringify(formIds));
      }
      await nukeLegacyStorage();
      console.log(`Migrated ${formIds.length} forms to individual storage`);
      return parsedForms;
    } catch (error: any) {
      console.error('Migration error:', error?.message || error);
      await nukeLegacyStorage();
      return null;
    }
  }, [nukeLegacyStorage]);

  const loadFormFromStorage = useCallback(async (formId: string): Promise<any> => {
    try {
      const data = await AsyncStorage.getItem(`${FORM_KEY_PREFIX}${formId}`);
      if (!data) return null;
      const parsed = JSON.parse(data);
      return sanitizeFormForStorage(parsed);
    } catch (error: any) {
      console.error(`Error loading form ${formId}:`, error?.message || error);
      if (error?.message?.includes('CursorWindow') || error?.message?.includes('Row too big')) {
        console.warn(`Form ${formId} is too large, attempting recovery...`);
        try {
          await AsyncStorage.removeItem(`${FORM_KEY_PREFIX}${formId}`);
          console.log(`Removed oversized form ${formId} from storage`);
        } catch (removeErr) {
          console.error(`Failed to remove oversized form ${formId}:`, removeErr);
        }
      }
      return null;
    }
  }, []);

  const loadFormWithPhotos = useCallback(async (form: any): Promise<any> => {
    const [hospitalPhoto, timeInPhoto, timeOutPhoto] = await Promise.all([
      readPhoto(form.id, 'hospital'),
      readPhoto(form.id, 'timeIn'),
      readPhoto(form.id, 'timeOut'),
    ]);
    
    const loadedForm: any = {
      ...form,
      hospitalStickerPhoto: hospitalPhoto,
      timeInTheatrePhoto: timeInPhoto,
      timeOutTheatrePhoto: timeOutPhoto,
    };

    if (form.formType === 'coida') {
      const cArmImages: Array<{ uri: string; metadata?: any }> = [];
      const cArmCount = form.cArmImagesCount || 0;
      for (let i = 0; i < cArmCount; i++) {
        const photo = await readPhoto(form.id, `cArm_${i}`);
        if (photo) {
          const metadata = form[`cArmMetadata_${i}`];
          cArmImages.push({ uri: photo, metadata });
        }
      }
      loadedForm.cArmImages = cArmImages;

      const employerReportPhotos: Array<{ uri: string; metadata?: any }> = [];
      const employerCount = form.employerReportPhotosCount || 0;
      for (let i = 0; i < employerCount; i++) {
        const photo = await readPhoto(form.id, `employer_${i}`);
        if (photo) {
          const metadata = form[`employerMetadata_${i}`];
          employerReportPhotos.push({ uri: photo, metadata });
        }
      }
      loadedForm.employerReportPhotos = employerReportPhotos;

      const attachmentPhotos: Array<{ uri: string; metadata?: any }> = [];
      const attachmentCount = form.attachmentPhotosCount || 0;
      for (let i = 0; i < attachmentCount; i++) {
        const photo = await readPhoto(form.id, `attachment_${i}`);
        if (photo) {
          const metadata = form[`attachmentMetadata_${i}`];
          attachmentPhotos.push({ uri: photo, metadata });
        }
      }
      loadedForm.attachmentPhotos = attachmentPhotos;

      const timeInClockPhoto = await readPhoto(form.id, 'timeInClock');
      if (timeInClockPhoto) loadedForm.timeInTheatreClockPhoto = timeInClockPhoto;

      const timeOutClockPhoto = await readPhoto(form.id, 'timeOutClock');
      if (timeOutClockPhoto) loadedForm.timeOutTheatreClockPhoto = timeOutClockPhoto;

      const screeningPhoto = await readPhoto(form.id, 'screening');
      if (screeningPhoto) loadedForm.screeningTimePhoto = screeningPhoto;

      const firstMedicalPhoto = await readPhoto(form.id, 'firstMedical');
      if (firstMedicalPhoto) loadedForm.firstMedicalReportPhoto = firstMedicalPhoto;

      const patientIdPhoto = await readPhoto(form.id, 'patientId');
      if (patientIdPhoto) loadedForm.patientIdPhoto = patientIdPhoto;

      const referralLetterPhoto = await readPhoto(form.id, 'referralLetter');
      if (referralLetterPhoto) loadedForm.referralLetterPhoto = referralLetterPhoto;
    }

    return loadedForm;
  }, []);

  const loadForms = useCallback(async () => {
    try {
      await initializeStorage();
      console.log('Photo storage initialized');
      
      const stats = await getStorageStats();
      console.log(`Current photo storage: ${stats.usedMB}MB (${stats.photoCount} photos)`);

      const migratedForms = await migrateFromLegacyStorage();
      
      let parsedForms: any[] = [];
      
      if (migratedForms) {
        parsedForms = migratedForms.map(f => sanitizeFormForStorage(f));
      } else {
        let indexData: string | null = null;
        try {
          indexData = await AsyncStorage.getItem(FORMS_INDEX_KEY);
        } catch (indexError: any) {
          console.error('Error reading form index:', indexError?.message);
        }
        if (indexData) {
          const formIds: string[] = JSON.parse(indexData);
          console.log(`Loading ${formIds.length} forms from individual storage...`);
          const loadedForms = await Promise.all(
            formIds.map(id => loadFormFromStorage(id))
          );
          parsedForms = loadedForms.filter(Boolean);
        }
      }

      if (parsedForms.length > 0) {
        const formsWithPhotos = await Promise.all(
          parsedForms.map(form => loadFormWithPhotos(form))
        );
        setForms(formsWithPhotos);
      }
    } catch (error) {
      console.error('Error loading forms:', error);
    } finally {
      setIsLoading(false);
    }
  }, [migrateFromLegacyStorage, loadFormFromStorage, loadFormWithPhotos]);

  const writePhotoToFile = async (formId: string, photoType: string, base64Data: string): Promise<void> => {
    const dataString = safeString(base64Data);
    if (!dataString || dataString.length === 0) {
      console.log(`Skipping empty photo data for ${photoType}`);
      return;
    }
    await savePhoto(formId, photoType, dataString);
  };

  const deletePhotoFile = async (formId: string, photoType: string): Promise<void> => {
    await deletePhoto(formId, photoType);
  };

  useEffect(() => {
    void loadForms();
  }, [loadForms]);

  const stripPhotosFromForm = useCallback((form: any): { strippedForm: any; photoSavePromises: Promise<void>[] } => {
    const photoSavePromises: Promise<void>[] = [];
    const strippedForm: any = { ...form };
    
    delete strippedForm.dicomFiles;

    if (form.hospitalStickerPhoto) {
      photoSavePromises.push(writePhotoToFile(form.id, 'hospital', form.hospitalStickerPhoto));
      strippedForm.hospitalStickerPhoto = null;
    }
    if (form.timeInTheatrePhoto) {
      photoSavePromises.push(writePhotoToFile(form.id, 'timeIn', form.timeInTheatrePhoto));
      strippedForm.timeInTheatrePhoto = null;
    }
    if (form.timeOutTheatrePhoto) {
      photoSavePromises.push(writePhotoToFile(form.id, 'timeOut', form.timeOutTheatrePhoto));
      strippedForm.timeOutTheatrePhoto = null;
    }

    if (form.formType === 'coida') {
      if (form.cArmImages && Array.isArray(form.cArmImages)) {
        const validImages = form.cArmImages.filter((img: any) => {
          if (!img.uri || typeof img.uri !== 'string') return false;
          const cleanUri = img.uri.replace(/^data:[^;]+;base64,/, '');
          return cleanUri && cleanUri.length > 100;
        });
        strippedForm.cArmImagesCount = validImages.length;
        validImages.forEach((img: any, i: number) => {
          photoSavePromises.push(writePhotoToFile(form.id, `cArm_${i}`, img.uri));
          if (img.metadata) strippedForm[`cArmMetadata_${i}`] = img.metadata;
        });
        strippedForm.cArmImages = [];
      }

      if (form.employerReportPhotos && Array.isArray(form.employerReportPhotos)) {
        const validPhotos = form.employerReportPhotos.filter((img: any) => {
          if (!img.uri || typeof img.uri !== 'string') return false;
          const cleanUri = img.uri.replace(/^data:[^;]+;base64,/, '');
          return cleanUri && cleanUri.length > 100;
        });
        strippedForm.employerReportPhotosCount = validPhotos.length;
        validPhotos.forEach((img: any, i: number) => {
          photoSavePromises.push(writePhotoToFile(form.id, `employer_${i}`, img.uri));
          if (img.metadata) strippedForm[`employerMetadata_${i}`] = img.metadata;
        });
        strippedForm.employerReportPhotos = [];
      }

      if (form.attachmentPhotos && Array.isArray(form.attachmentPhotos)) {
        const validPhotos = form.attachmentPhotos.filter((img: any) => {
          if (!img.uri || typeof img.uri !== 'string') return false;
          const cleanUri = img.uri.replace(/^data:[^;]+;base64,/, '');
          return cleanUri && cleanUri.length > 100;
        });
        strippedForm.attachmentPhotosCount = validPhotos.length;
        validPhotos.forEach((img: any, i: number) => {
          photoSavePromises.push(writePhotoToFile(form.id, `attachment_${i}`, img.uri));
          if (img.metadata) strippedForm[`attachmentMetadata_${i}`] = img.metadata;
        });
        strippedForm.attachmentPhotos = [];
      }

      if (form.timeInTheatreClockPhoto) {
        photoSavePromises.push(writePhotoToFile(form.id, 'timeInClock', form.timeInTheatreClockPhoto));
        strippedForm.timeInTheatreClockPhoto = null;
      }
      if (form.timeOutTheatreClockPhoto) {
        photoSavePromises.push(writePhotoToFile(form.id, 'timeOutClock', form.timeOutTheatreClockPhoto));
        strippedForm.timeOutTheatreClockPhoto = null;
      }
      if (form.screeningTimePhoto) {
        photoSavePromises.push(writePhotoToFile(form.id, 'screening', form.screeningTimePhoto));
        strippedForm.screeningTimePhoto = null;
      }
      if (form.firstMedicalReportPhoto) {
        photoSavePromises.push(writePhotoToFile(form.id, 'firstMedical', form.firstMedicalReportPhoto));
        strippedForm.firstMedicalReportPhoto = null;
      }
      if (form.patientIdPhoto) {
        photoSavePromises.push(writePhotoToFile(form.id, 'patientId', form.patientIdPhoto));
        strippedForm.patientIdPhoto = null;
      }
      if (form.referralLetterPhoto) {
        photoSavePromises.push(writePhotoToFile(form.id, 'referralLetter', form.referralLetterPhoto));
        strippedForm.referralLetterPhoto = null;
      }
    }
    
    return { strippedForm, photoSavePromises };
  }, []);

  const saveFormToStorage = useCallback(async (form: any): Promise<void> => {
    const cleaned = sanitizeFormForStorage(form);
    const jsonString = JSON.stringify(cleaned);
    if (jsonString.length > MAX_ASYNC_STORAGE_ROW_SIZE) {
      console.warn(`Form ${form.id} data is ${(jsonString.length / 1024 / 1024).toFixed(2)}MB, stripping extra fields...`);
      const minimal: any = {};
      const safeKeys = [
        'id', 'formType', 'status', 'createdAt', 'updatedAt', 'submittedBy',
        'date', 'patientTitle', 'patientFirstName', 'patientLastName', 'patientName',
        'idNumber', 'dateOfBirth', 'contactNumber', 'email',
        'mainMemberTitle', 'mainMemberFirstName', 'mainMemberLastName', 'mainMemberIdNumber',
        'medicalAidName', 'membershipNumber', 'dependantCode',
        'nextOfKinName', 'nextOfKinContactNumber',
        'procedure', 'icd10Code', 'screeningTimeText', 'reasonForTimeDiscrepancy',
        'timeCArmTakenIn', 'timeCArmTakenOut',
        'radiographerName', 'radiographerSignatureTimestamp', 'radiographerSignatureLocation',
        'submissionLatitude', 'submissionLongitude',
        'cArmImagesCount', 'employerReportPhotosCount', 'attachmentPhotosCount',
        'hospitalStickerPhotoMetadata', 'timeInTheatrePhotoMetadata', 'timeOutTheatrePhotoMetadata',
        'employerName', 'employerContactNumber', 'employerAddress',
        'dateOfInjury', 'timeOfInjury', 'placeOfAccident', 'causeOfInjury',
        'natureOfInjury', 'bodyPartInjured', 'wCompNumber',
      ];
      for (const key of safeKeys) {
        if (cleaned[key] !== undefined) minimal[key] = cleaned[key];
      }
      for (const key of Object.keys(cleaned)) {
        if (key.includes('Metadata_')) minimal[key] = cleaned[key];
      }
      const minimalJson = JSON.stringify(minimal);
      console.log(`Reduced form size to ${(minimalJson.length / 1024).toFixed(1)}KB`);
      await AsyncStorage.setItem(`${FORM_KEY_PREFIX}${form.id}`, minimalJson);
      return;
    }
    await AsyncStorage.setItem(`${FORM_KEY_PREFIX}${form.id}`, jsonString);
  }, []);

  const updateFormIndex = useCallback(async (formIds: string[]): Promise<void> => {
    await AsyncStorage.setItem(FORMS_INDEX_KEY, JSON.stringify(formIds));
  }, []);

  const saveForms = useCallback(async (updatedForms: any[]) => {
    try {
      const allPhotoPromises: Promise<void>[] = [];
      const formIds: string[] = [];
      
      for (const form of updatedForms) {
        const { strippedForm, photoSavePromises } = stripPhotosFromForm(form);
        allPhotoPromises.push(...photoSavePromises);
        formIds.push(form.id);
        await saveFormToStorage(strippedForm);
      }
      
      await Promise.all(allPhotoPromises);
      await updateFormIndex(formIds);
      
      setForms(updatedForms);
    } catch (error) {
      console.error('Error saving forms:', error);
      throw error;
    }
  }, [stripPhotosFromForm, saveFormToStorage, updateFormIndex]);

  const saveDraft = useCallback(async (formData: Omit<FormData, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const now = new Date().toISOString();
    const newForm: FormData = {
      ...formData,
      id: `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    
    const updatedForms = [...forms, newForm];
    await saveForms(updatedForms);
    return newForm.id;
  }, [forms, saveForms]);

  const updateDraft = useCallback(async (id: string, formData: Partial<FormData>) => {
    const updatedForms = forms.map(form => 
      form.id === id 
        ? { ...form, ...formData, updatedAt: new Date().toISOString() }
        : form
    );
    await saveForms(updatedForms);
  }, [forms, saveForms]);

  const submitForm = useCallback(async (id: string, formData: Partial<FormData>, username?: string) => {
    console.log('Running cleanup before submission...');
    try {
      const indexData2 = await AsyncStorage.getItem(FORMS_INDEX_KEY);
      if (indexData2) {
        const ids = JSON.parse(indexData2);
        await cleanupOrphanedPhotos(ids);
      }
    } catch (cleanupError) {
      console.error('Cleanup error (continuing anyway):', cleanupError);
    }
    
    let location: { latitude: number; longitude: number } | null = null;
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          location = {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          };
          console.log('Location captured:', location);
        } catch (locationError) {
          console.log('Failed to get current location (location unavailable or timeout):', locationError);
        }
      } else {
        console.log('Location permission not granted');
      }
    } catch (error) {
      console.log('Location permission request failed:', error);
    }
    
    const indexData = await AsyncStorage.getItem(FORMS_INDEX_KEY);
    const formIds: string[] = indexData ? JSON.parse(indexData) : [];
    const existingFormData = await AsyncStorage.getItem(`${FORM_KEY_PREFIX}${id}`);
    const existingForm = existingFormData ? JSON.parse(existingFormData) : null;
    
    if (!existingForm) {
      console.error('Form not found in storage:', id, 'Available forms:', formIds);
      throw new Error('Form not found');
    }
    
    const [hospitalPhoto, timeInPhoto, timeOutPhoto] = await Promise.all([
      readPhoto(id, 'hospital'),
      readPhoto(id, 'timeIn'),
      readPhoto(id, 'timeOut'),
    ]);
    
    const formWithPhotos: any = {
      ...existingForm,
      hospitalStickerPhoto: hospitalPhoto || existingForm.hospitalStickerPhoto,
      timeInTheatrePhoto: timeInPhoto || existingForm.timeInTheatrePhoto,
      timeOutTheatrePhoto: timeOutPhoto || existingForm.timeOutTheatrePhoto,
    };

    if (existingForm.formType === 'coida') {
      const cArmImages: Array<{ uri: string; metadata?: any }> = [];
      const cArmCount = existingForm.cArmImagesCount || 0;
      for (let i = 0; i < cArmCount; i++) {
        const photo = await readPhoto(id, `cArm_${i}`);
        if (photo) {
          const metadata = (existingForm as any)[`cArmMetadata_${i}`];
          cArmImages.push({ uri: photo, metadata });
        }
      }
      formWithPhotos.cArmImages = cArmImages;

      const employerReportPhotos: Array<{ uri: string; metadata?: any }> = [];
      const employerCount = (existingForm as any).employerReportPhotosCount || 0;
      for (let i = 0; i < employerCount; i++) {
        const photo = await readPhoto(id, `employer_${i}`);
        if (photo) {
          const metadata = (existingForm as any)[`employerMetadata_${i}`];
          employerReportPhotos.push({ uri: photo, metadata });
        }
      }
      formWithPhotos.employerReportPhotos = employerReportPhotos;

      const attachmentPhotos: Array<{ uri: string; metadata?: any }> = [];
      const attachmentCount = (existingForm as any).attachmentPhotosCount || 0;
      for (let i = 0; i < attachmentCount; i++) {
        const photo = await readPhoto(id, `attachment_${i}`);
        if (photo) {
          const metadata = (existingForm as any)[`attachmentMetadata_${i}`];
          attachmentPhotos.push({ uri: photo, metadata });
        }
      }
      formWithPhotos.attachmentPhotos = attachmentPhotos;

      const timeInClockPhoto = await readPhoto(id, 'timeInClock');
      if (timeInClockPhoto) formWithPhotos.timeInTheatreClockPhoto = timeInClockPhoto;

      const timeOutClockPhoto = await readPhoto(id, 'timeOutClock');
      if (timeOutClockPhoto) formWithPhotos.timeOutTheatreClockPhoto = timeOutClockPhoto;

      const screeningPhoto = await readPhoto(id, 'screening');
      if (screeningPhoto) formWithPhotos.screeningTimePhoto = screeningPhoto;

      const firstMedicalPhoto = await readPhoto(id, 'firstMedical');
      if (firstMedicalPhoto) formWithPhotos.firstMedicalReportPhoto = firstMedicalPhoto;

      const patientIdPhoto = await readPhoto(id, 'patientId');
      if (patientIdPhoto) formWithPhotos.patientIdPhoto = patientIdPhoto;

      const referralLetterPhoto = await readPhoto(id, 'referralLetter');
      if (referralLetterPhoto) formWithPhotos.referralLetterPhoto = referralLetterPhoto;
    }
    
    console.log('=== FORM SUBMISSION: SAVING FORM ===');
    
    console.log('Deleting photos to free storage...');
    const photoTypes = [
      'hospital', 'timeIn', 'timeOut', 'timeInClock', 'timeOutClock',
      'screening', 'firstMedical', 'patientId', 'referralLetter'
    ];
    
    const deletePromises: Promise<void>[] = [];
    for (const photoType of photoTypes) {
      deletePromises.push(deletePhotoFile(id, photoType));
    }
    for (let i = 0; i < 100; i++) {
      deletePromises.push(deletePhotoFile(id, `cArm_${i}`));
      deletePromises.push(deletePhotoFile(id, `employer_${i}`));
      deletePromises.push(deletePhotoFile(id, `attachment_${i}`));
    }
    
    try {
      await Promise.all(deletePromises);
      console.log('Photos deleted successfully for submitted form');
    } catch (deleteError) {
      console.error('Error deleting some photos:', deleteError);
    }
    
    const minimalForm: any = {
      id: existingForm.id,
      formType: existingForm.formType,
      status: 'submitted' as const,
      createdAt: existingForm.createdAt,
      updatedAt: new Date().toISOString(),
      submittedBy: username || existingForm.submittedBy,
      date: existingForm.date,
      patientTitle: existingForm.patientTitle,
      patientFirstName: existingForm.patientFirstName || '',
      patientLastName: existingForm.patientLastName || '',
      idNumber: existingForm.idNumber,
      procedure: existingForm.procedure,
      radiographerName: existingForm.radiographerName,
      submissionLatitude: location?.latitude,
      submissionLongitude: location?.longitude,
      hospitalStickerPhoto: null,
      timeInTheatrePhoto: null,
      timeOutTheatrePhoto: null,
      cArmImagesCount: 0,
      employerReportPhotosCount: 0,
      attachmentPhotosCount: 0,
    };
    
    console.log('Saving submitted form with status: submitted');
    
    try {
      await saveFormToStorage(minimalForm);
    } catch (saveError: any) {
      console.error('Error saving form status:', saveError);
      throw saveError;
    }
    
    const allFormIds = formIds.includes(id) ? formIds : [...formIds, id];
    const updatedFormsWithPhotos = await Promise.all(
      allFormIds.map(async (fId: string) => {
        const fData = await AsyncStorage.getItem(`${FORM_KEY_PREFIX}${fId}`);
        if (!fData) return null;
        const form = JSON.parse(fData);
        return loadFormWithPhotos(form);
      })
    );
    setForms(updatedFormsWithPhotos.filter(Boolean) as FormData[]);
    
    console.log('Form saved successfully with submitted status');
  }, [saveFormToStorage, loadFormWithPhotos]);

  const deleteForm = useCallback(async (id: string) => {
    const formToDelete = forms.find(form => form.id === id);
    const updatedForms = forms.filter(form => form.id !== id);
    
    const deletePromises: Promise<void>[] = [
      deletePhotoFile(id, 'hospital'),
      deletePhotoFile(id, 'timeIn'),
      deletePhotoFile(id, 'timeOut'),
    ];

    if (formToDelete && (formToDelete as any).formType === 'coida') {
      const cArmCount = (formToDelete as any).cArmImagesCount || 0;
      for (let i = 0; i < cArmCount; i++) {
        deletePromises.push(deletePhotoFile(id, `cArm_${i}`));
      }

      const employerCount = (formToDelete as any).employerReportPhotosCount || 0;
      for (let i = 0; i < employerCount; i++) {
        deletePromises.push(deletePhotoFile(id, `employer_${i}`));
      }

      const attachmentCount = (formToDelete as any).attachmentPhotosCount || 0;
      for (let i = 0; i < attachmentCount; i++) {
        deletePromises.push(deletePhotoFile(id, `attachment_${i}`));
      }

      deletePromises.push(
        deletePhotoFile(id, 'timeInClock'),
        deletePhotoFile(id, 'timeOutClock'),
        deletePhotoFile(id, 'screening'),
        deletePhotoFile(id, 'firstMedical'),
        deletePhotoFile(id, 'patientId'),
        deletePhotoFile(id, 'referralLetter')
      );
    }

    await Promise.all(deletePromises);
    await AsyncStorage.removeItem(`${FORM_KEY_PREFIX}${id}`);
    const indexData = await AsyncStorage.getItem(FORMS_INDEX_KEY);
    const currentIds: string[] = indexData ? JSON.parse(indexData) : [];
    await updateFormIndex(currentIds.filter(fId => fId !== id));
    setForms(updatedForms);
  }, [forms, updateFormIndex]);

  const getForm = useCallback((id: string) => {
    return forms.find(form => form.id === id);
  }, [forms]);

  const getDrafts = useCallback(() => {
    return forms.filter(form => form.status === 'draft').sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [forms]);

  const getSubmittedForms = useCallback(() => {
    return forms.filter(form => form.status === 'submitted').sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [forms]);

  const generateExcelExport = useCallback(async (form: FormData): Promise<string> => {
    return generateClaimSpreadsheet(form);
  }, []);

  const sharePDF = useCallback(async (form: FormData) => {
    try {
      console.log('Starting PDF share process...');
      
      const firstName = safeString(form.patientFirstName);
      const lastName = safeString(form.patientLastName);
      if (!firstName || !lastName) {
        throw new Error('Patient name is required to generate PDF');
      }

      const formTypeName = form.formType === 'medical-aid' ? 'Medical_Aid' : 'COIDA';
      const filename = `${formTypeName}_${lastName}_${firstName}_${new Date().toISOString().split('T')[0]}.pdf`;

      if (Platform.OS === 'web') {
        console.log('Generating PDF for web...');
        
        const images: string[] = [];
        if (form.hospitalStickerPhoto) images.push(form.hospitalStickerPhoto);
        if (form.timeInTheatrePhoto) images.push(form.timeInTheatrePhoto);
        if (form.timeOutTheatrePhoto) images.push(form.timeOutTheatrePhoto);

        if (form.formType === 'coida') {
          const coidaForm = form as any;
          if (coidaForm.timeInTheatreClockPhoto) images.push(coidaForm.timeInTheatreClockPhoto);
          if (coidaForm.cArmImages && Array.isArray(coidaForm.cArmImages)) {
            coidaForm.cArmImages.forEach((img: any) => {
              if (img.uri) images.push(img.uri);
            });
          }
          if (coidaForm.screeningTimePhoto) images.push(coidaForm.screeningTimePhoto);
          if (coidaForm.timeOutTheatreClockPhoto) images.push(coidaForm.timeOutTheatreClockPhoto);
          if (coidaForm.employerReportPhotos && Array.isArray(coidaForm.employerReportPhotos)) {
            coidaForm.employerReportPhotos.forEach((photo: any) => {
              if (photo.uri) images.push(photo.uri);
            });
          }
          if (coidaForm.firstMedicalReportPhoto) images.push(coidaForm.firstMedicalReportPhoto);
          if (coidaForm.patientIdPhoto) images.push(coidaForm.patientIdPhoto);
          if (coidaForm.referralLetterPhoto) images.push(coidaForm.referralLetterPhoto);
          if (coidaForm.attachmentPhotos && Array.isArray(coidaForm.attachmentPhotos)) {
            coidaForm.attachmentPhotos.forEach((photo: any) => {
              if (photo.uri) images.push(photo.uri);
            });
          }
        }

        if (images.length === 0) {
          throw new Error('No photos found to generate PDF');
        }

        console.log(`Converting ${images.length} images to PDF...`);
        const pdfResult = await convertImageToPDF(images[0], filename);
        
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${pdfResult.base64}`;
        link.download = pdfResult.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('PDF download initiated');
      } else {
        console.log('Generating PDF for mobile...');
        
        const tempDir = `${(FileSystem as any).cacheDirectory || ''}pdf_share/`;
        try {
          await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
        } catch {
        }

        const images: string[] = [];
        if (form.hospitalStickerPhoto) images.push(form.hospitalStickerPhoto);
        if (form.timeInTheatrePhoto) images.push(form.timeInTheatrePhoto);
        if (form.timeOutTheatrePhoto) images.push(form.timeOutTheatrePhoto);

        if (form.formType === 'coida') {
          const coidaForm = form as any;
          if (coidaForm.timeInTheatreClockPhoto) images.push(coidaForm.timeInTheatreClockPhoto);
          if (coidaForm.cArmImages && Array.isArray(coidaForm.cArmImages)) {
            coidaForm.cArmImages.forEach((img: any) => {
              if (img.uri) images.push(img.uri);
            });
          }
          if (coidaForm.screeningTimePhoto) images.push(coidaForm.screeningTimePhoto);
          if (coidaForm.timeOutTheatreClockPhoto) images.push(coidaForm.timeOutTheatreClockPhoto);
          if (coidaForm.employerReportPhotos && Array.isArray(coidaForm.employerReportPhotos)) {
            coidaForm.employerReportPhotos.forEach((photo: any) => {
              if (photo.uri) images.push(photo.uri);
            });
          }
          if (coidaForm.firstMedicalReportPhoto) images.push(coidaForm.firstMedicalReportPhoto);
          if (coidaForm.patientIdPhoto) images.push(coidaForm.patientIdPhoto);
          if (coidaForm.referralLetterPhoto) images.push(coidaForm.referralLetterPhoto);
          if (coidaForm.attachmentPhotos && Array.isArray(coidaForm.attachmentPhotos)) {
            coidaForm.attachmentPhotos.forEach((photo: any) => {
              if (photo.uri) images.push(photo.uri);
            });
          }
        }

        if (images.length === 0) {
          throw new Error('No photos found to generate PDF');
        }

        console.log(`Saving ${images.length} images as PDF pages...`);
        const pdfPath = `${tempDir}${filename}`;
        
        const firstImage = images[0];
        const base64Data = firstImage.replace(/^data:[^;]+;base64,/, '');
        await FileSystem.writeAsStringAsync(pdfPath, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
          throw new Error('Sharing is not available on this device');
        }

        console.log('Sharing file:', pdfPath);
        await Sharing.shareAsync(pdfPath, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ${formTypeName} Form`,
          UTI: 'com.adobe.pdf',
        });
        
        console.log('PDF shared successfully');
      }
    } catch (error) {
      console.error('Error sharing PDF:', error);
      throw error;
    }
  }, []);

  return useMemo(() => ({
    forms,
    isLoading,
    saveDraft,
    updateDraft,
    submitForm,
    deleteForm,
    getForm,
    getDrafts,
    getSubmittedForms,
    generateExcelExport,
    sharePDF,
  }), [forms, isLoading, saveDraft, updateDraft, submitForm, deleteForm, getForm, getDrafts, getSubmittedForms, generateExcelExport, sharePDF]);
});
