import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';

import {
  getFirestore, Firestore, doc, setDoc, deleteDoc, getDocs,
  collection, query, orderBy,
} from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { FormData } from './FormsContext';

const FIREBASE_CONFIG_KEY = '@firebase_config';
export const ADMIN_EMAILS = ['paul@btstech.co.za', 'allan@medimarketing100.co.za'];

const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: 'AIzaSyCgllczOlYOAJq0VVO-KrG3Uk--DO929Uk',
  authDomain: 'theatre-18690.firebaseapp.com',
  projectId: 'theatre-18690',
  storageBucket: 'theatre-18690.firebasestorage.app',
  messagingSenderId: '751356683754',
  appId: '1:751356683754:web:0d3bb15634eafbc1ddfe93',
};

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

interface CloudSyncContextValue {
  isConfigured: boolean;
  isSyncing: boolean;
  lastSynced: string | null;
  syncError: string | null;
  firebaseConfig: FirebaseConfig | null;
  saveConfig: (config: FirebaseConfig) => Promise<void>;
  clearConfig: () => Promise<void>;
  syncFormToCloud: (form: FormData) => Promise<boolean>;
  syncUserToCloud: () => Promise<boolean>;
  deleteFormFromCloud: (formId: string) => Promise<void>;
  fetchAllFormsFromCloud: () => Promise<FormData[]>;
  fetchAllUsersFromCloud: () => Promise<any[]>;
  isAdmin: boolean;
}

function getOrCreateApp(config: FirebaseConfig): FirebaseApp {
  const apps = getApps();
  if (apps.length > 0) return getApp();
  return initializeApp(config);
}

export const [CloudSyncProvider, useCloudSync] = createContextHook<CloudSyncContextValue>(() => {
  const { user } = useAuth();
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const dbRef = useRef<Firestore | null>(null);


  const getDB = useCallback((): Firestore | null => {
    if (dbRef.current) return dbRef.current;
    if (!firebaseConfig) return null;
    try {
      const app = getOrCreateApp(firebaseConfig);
      dbRef.current = getFirestore(app);
      return dbRef.current;
    } catch (e) {
      console.error('[CloudSync] getDB error:', e);
      return null;
    }
  }, [firebaseConfig]);

  useEffect(() => {
    AsyncStorage.getItem(FIREBASE_CONFIG_KEY).then(raw => {
      if (raw) {
        try {
          const cfg = JSON.parse(raw) as FirebaseConfig;
          setFirebaseConfig(cfg);
          setIsConfigured(true);
          console.log('[CloudSync] Loaded Firebase config from storage');
          return;
        } catch {}
      }
      console.log('[CloudSync] Using default Firebase config');
      setFirebaseConfig(DEFAULT_FIREBASE_CONFIG);
      setIsConfigured(true);
    }).catch(() => {
      console.log('[CloudSync] Storage error, using default Firebase config');
      setFirebaseConfig(DEFAULT_FIREBASE_CONFIG);
      setIsConfigured(true);
    });
  }, []);

  useEffect(() => {
    if (firebaseConfig && !dbRef.current) {
      try {
        const app = getOrCreateApp(firebaseConfig);
        dbRef.current = getFirestore(app);
        console.log('[CloudSync] Firestore initialized successfully');
      } catch (e: any) {
        setSyncError('Firebase init failed: ' + (e?.message ?? String(e)));
      }
    }
  }, [firebaseConfig]);

  const saveConfig = useCallback(async (config: FirebaseConfig) => {
    await AsyncStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
    dbRef.current = null;
    setFirebaseConfig(config);
    setIsConfigured(true);
    setSyncError(null);
  }, []);

  const clearConfig = useCallback(async () => {
    await AsyncStorage.removeItem(FIREBASE_CONFIG_KEY);
    dbRef.current = null;
    setFirebaseConfig(null);
    setIsConfigured(false);
    setSyncError(null);
  }, []);

  const syncFormToCloud = useCallback(async (form: FormData): Promise<boolean> => {
    const db = getDB();
    if (!db || !user) {
      console.log('[CloudSync] syncFormToCloud skipped - db:', !!db, 'user:', !!user);
      return false;
    }
    setIsSyncing(true);
    setSyncError(null);
    try {
      const anyForm = form as any;
      const cloudForm: Record<string, any> = {
        id: form.id,
        formType: form.formType,
        status: form.status,
        uid: user.email,
        userEmail: user.email,
        userName: user.name,
        date: form.date ?? '',
        patientTitle: form.patientTitle ?? '',
        patientFirstName: form.patientFirstName ?? '',
        patientLastName: form.patientLastName ?? '',
        idNumber: form.idNumber ?? '',
        dateOfBirth: form.dateOfBirth ?? '',
        contactNumber: form.contactNumber ?? '',
        email: form.email ?? '',
        procedure: form.procedure ?? '',
        icd10Code: form.icd10Code ?? '',
        screeningTimeText: form.screeningTimeText ?? '',
        timeCArmTakenIn: form.timeCArmTakenIn ?? '',
        timeCArmTakenOut: form.timeCArmTakenOut ?? '',
        radiographerName: form.radiographerName ?? '',
        radiographerSignatureTimestamp: form.radiographerSignatureTimestamp ?? '',
        radiographerSignatureLocation: form.radiographerSignatureLocation ?? '',
        nextOfKinName: form.nextOfKinName ?? '',
        nextOfKinContactNumber: form.nextOfKinContactNumber ?? '',
        medicalAidName: form.medicalAidName ?? '',
        membershipNumber: form.membershipNumber ?? '',
        dependantCode: form.dependantCode ?? '',
        mainMemberTitle: form.mainMemberTitle ?? '',
        mainMemberFirstName: form.mainMemberFirstName ?? '',
        mainMemberLastName: form.mainMemberLastName ?? '',
        mainMemberIdNumber: form.mainMemberIdNumber ?? '',
        submittedBy: form.submittedBy ?? '',
        createdAt: form.createdAt ?? '',
        updatedAt: form.updatedAt ?? '',
        caseStatus: anyForm.caseStatus ?? 'case_loaded',
        caseStatusHistory: JSON.stringify(anyForm.caseStatusHistory ?? []),
        cloudSyncedAt: new Date().toISOString(),
      };
      // COIDA extra fields
      const coidaFields = [
        'employerName','employerContactNumber','employerAddress','wCompNumber',
        'dateOfInjury','timeOfInjury','placeOfAccident','natureOfInjury',
        'bodyPartInjured','submissionLatitude','submissionLongitude',
        'causeOfInjury','reasonForTimeDiscrepancy',
      ];
      for (const f of coidaFields) {
        if (anyForm[f] != null && anyForm[f] !== '') cloudForm[f] = anyForm[f];
      }
      await setDoc(doc(db, 'forms', form.id), cloudForm, { merge: true });
      console.log('[CloudSync] Form metadata synced to cloud');
      setLastSynced(new Date().toISOString());
      return true;
    } catch (e: any) {
      const msg = e?.message ?? 'Sync error';
      setSyncError(msg);
      console.error('[CloudSync] syncFormToCloud:', msg);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [getDB, user]);

  const deleteFormFromCloud = useCallback(async (formId: string) => {
    const db = getDB();
    if (!db) return;
    try { await deleteDoc(doc(db, 'forms', formId)); }
    catch (e) { console.error('[CloudSync] delete failed:', e); }
  }, [getDB]);

  const fetchAllFormsFromCloud = useCallback(async (): Promise<FormData[]> => {
    const db = getDB();
    if (!db) return [];
    try {
      const q = query(collection(db, 'forms'), orderBy('updatedAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as FormData));
    } catch (e: any) {
      setSyncError(e?.message ?? 'Fetch failed');
      return [];
    }
  }, [getDB]);

  const fetchAllUsersFromCloud = useCallback(async (): Promise<any[]> => {
    const db = getDB();
    if (!db) return [];
    try {
      const snap = await getDocs(collection(db, 'users'));
      return snap.docs.map(d => ({ ...d.data(), id: d.id }));
    } catch (e) {
      console.error('[CloudSync] fetchUsers:', e);
      return [];
    }
  }, [getDB]);

  const syncUserToCloud = useCallback(async (): Promise<boolean> => {
    const db = getDB();
    if (!db || !user) {
      console.log('[CloudSync] syncUserToCloud skipped - db:', !!db, 'user:', !!user);
      return false;
    }
    try {
      const email = (user.email ?? '').toLowerCase();
      if (!email) return false;
      const userId = email.replace(/[^a-zA-Z0-9]/g, '_');
      const userData: Record<string, any> = {
        name: user.name ?? '',
        email,
        uid: email,
        role: ADMIN_EMAILS.includes(email) ? 'admin' : 'user',
        lastLoginAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', userId), userData, { merge: true });
      console.log('[CloudSync] User synced to cloud:', email);
      return true;
    } catch (e: any) {
      console.error('[CloudSync] syncUserToCloud error:', e?.message ?? e);
      return false;
    }
  }, [getDB, user]);

  const isAdmin = useMemo(() => ADMIN_EMAILS.includes(user?.email ?? ''), [user]);

  useEffect(() => {
    if (user && isConfigured) {
      console.log('[CloudSync] User detected, syncing profile to cloud');
      void syncUserToCloud();
    }
  }, [user, isConfigured, syncUserToCloud]);

  return useMemo(() => ({
    isConfigured, isSyncing, lastSynced, syncError, firebaseConfig,
    saveConfig, clearConfig, syncFormToCloud, syncUserToCloud, deleteFormFromCloud,
    fetchAllFormsFromCloud, fetchAllUsersFromCloud, isAdmin,
  }), [
    isConfigured, isSyncing, lastSynced, syncError, firebaseConfig,
    saveConfig, clearConfig, syncFormToCloud, syncUserToCloud, deleteFormFromCloud,
    fetchAllFormsFromCloud, fetchAllUsersFromCloud, isAdmin,
  ]);
});
