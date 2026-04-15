import { FirebaseApp } from 'firebase/app';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { readPhoto } from './photoStorage';

const ALL_PHOTO_TYPES = [
  'hospital', 'timeIn', 'timeOut', 'timeInClock', 'timeOutClock',
  'screening', 'firstMedical', 'patientId', 'referralLetter',
] as const;

export interface PhotoUrls {
  [key: string]: string;
}

export async function uploadFormPhotosToFirebase(
  app: FirebaseApp,
  formId: string,
  formType: string,
  counts?: {
    cArmImagesCount?: number;
    employerReportPhotosCount?: number;
    attachmentPhotosCount?: number;
    referralLetterPagesCount?: number;
  }
): Promise<PhotoUrls> {
  const storage = getStorage(app);
  const photoUrls: PhotoUrls = {};

  const uploadTasks: Array<{ key: string; photoType: string }> = [];

  for (const photoType of ALL_PHOTO_TYPES) {
    if (photoType === 'timeInClock' || photoType === 'timeOutClock' ||
        photoType === 'screening' || photoType === 'firstMedical' ||
        photoType === 'patientId' || photoType === 'referralLetter') {
      if (formType !== 'coida') continue;
    }
    uploadTasks.push({ key: `photo_${photoType}`, photoType });
  }

  if (formType === 'coida') {
    const cArmCount = counts?.cArmImagesCount ?? 0;
    for (let i = 0; i < cArmCount; i++) {
      uploadTasks.push({ key: `photo_cArm_${i}`, photoType: `cArm_${i}` });
    }

    const employerCount = counts?.employerReportPhotosCount ?? 0;
    for (let i = 0; i < employerCount; i++) {
      uploadTasks.push({ key: `photo_employer_${i}`, photoType: `employer_${i}` });
    }

    const attachmentCount = counts?.attachmentPhotosCount ?? 0;
    for (let i = 0; i < attachmentCount; i++) {
      uploadTasks.push({ key: `photo_attachment_${i}`, photoType: `attachment_${i}` });
    }

    const referralPageCount = counts?.referralLetterPagesCount ?? 0;
    for (let i = 0; i < referralPageCount; i++) {
      uploadTasks.push({ key: `photo_referralPage_${i}`, photoType: `referralPage_${i}` });
    }
  }

  const BATCH_SIZE = 3;
  for (let i = 0; i < uploadTasks.length; i += BATCH_SIZE) {
    const batch = uploadTasks.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (task) => {
        try {
          const base64Data = await readPhoto(formId, task.photoType);
          if (!base64Data) {
            console.log(`[FirebasePhotoSync] No local photo for ${task.photoType}, skipping`);
            return null;
          }

          const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
          if (!cleanBase64 || cleanBase64.length < 100) {
            console.log(`[FirebasePhotoSync] Photo ${task.photoType} too small, skipping`);
            return null;
          }

          const storagePath = `forms/${formId}/${task.photoType}.jpg`;
          const storageRef = ref(storage, storagePath);

          console.log(`[FirebasePhotoSync] Uploading ${task.photoType} (${(cleanBase64.length / 1024).toFixed(0)}KB)...`);
          await uploadString(storageRef, cleanBase64, 'base64', {
            contentType: 'image/jpeg',
          });

          const downloadUrl = await getDownloadURL(storageRef);
          console.log(`[FirebasePhotoSync] Uploaded ${task.photoType} successfully`);
          return { key: task.key, url: downloadUrl };
        } catch (error: any) {
          console.error(`[FirebasePhotoSync] Failed to upload ${task.photoType}:`, error?.message ?? error);
          return null;
        }
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        photoUrls[result.value.key] = result.value.url;
      }
    }
  }

  console.log(`[FirebasePhotoSync] Uploaded ${Object.keys(photoUrls).length} photos for form ${formId}`);
  return photoUrls;
}
