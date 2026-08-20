import * as MailComposer from 'expo-mail-composer';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform, Alert } from 'react-native';
import { FormData } from '@/contexts/FormsContext';
import { readPhoto } from '@/utils/photoStorage';

export function buildMedicalAidEmail(form: FormData, customRecipients?: string[]): { subject: string; body: string; recipients: string[] } {
  const patientName = `${form.patientTitle || ''} ${form.patientFirstName || ''} ${form.patientLastName || ''}`.trim();
  const subject = `Medical Aid Form - ${patientName}`;
  const body =
    `Medical Aid Form Submission (Resent)\n\n` +
    `Patient: ${patientName}\n` +
    `ID Number: ${form.idNumber || ''}\n` +
    `Date of Birth: ${form.dateOfBirth || ''}\n` +
    `Gender: ${(form as any).gender || 'N/A'}\n` +
    `Contact: ${form.contactNumber || ''}\n` +
    `Home Phone: ${(form as any).homePhone || 'N/A'}\n` +
    `Work Phone: ${(form as any).workPhone || 'N/A'}\n` +
    `Email: ${form.email || ''}\n` +
    `Patient Address: ${(form as any).patientAddress || 'N/A'}\n\n` +
    `Hospital/Service Provider: ${form.hospitalServiceProvider || ''}\n` +
    `Admission Date: ${(form as any).admissionDate || 'N/A'}\n` +
    `Admission Time: ${(form as any).admissionTime || 'N/A'}\n` +
    `Referring Doctor: ${form.referringDoctor || ''}\n` +
    `Doctor Practice Number: ${form.doctorPracticeNumber || ''}\n` +
    `Authorization Code: ${(form as any).authorizationCode || 'N/A'}\n\n` +
    `Main Member: ${form.mainMemberTitle || ''} ${form.mainMemberFirstName || ''} ${form.mainMemberLastName || ''}\n` +
    `Main Member ID: ${form.mainMemberIdNumber || ''}\n` +
    `Medical Aid: ${form.medicalAidName || ''}\n` +
    `Medical Aid Plan: ${form.medicalAidPlan || ''}\n` +
    `Membership Number: ${form.membershipNumber || ''}\n` +
    `Dependant Code: ${form.dependantCode || ''}\n\n` +
    `Procedure: ${form.procedure || ''}\n` +
    `ICD10 Code: ${form.icd10Code || ''}\n` +
    `Number of Sessions: ${((form as any).numberOfSessions) || ''}\n` +
    `Theatre Time Witness: ${(form as any).theatreTimeWitness || 'N/A'}\n\n` +
    `C-Arm Owned by Hospital: ${((form as any).cArmOwnedByHospital) || ''}\n` +
    `Contrast Usage: ${((form as any).contrastUsage) || ''}\n` +
    ((form as any).contrastName ? `Contrast Name: ${(form as any).contrastName}\n` : '') +
    ((form as any).contrastAmount ? `Contrast Amount: ${(form as any).contrastAmount}\n` : '') +
    `Time C Arm In: ${form.timeCArmTakenIn || ''}\n` +
    `Time C Arm Out: ${form.timeCArmTakenOut || ''}\n` +
    `Screening Time: ${((): string => { const t = String(form.screeningTimeText ?? ''); if (!t) return 'N/A'; if (t.includes(':')) return t; const s = parseInt(t, 10); if (isNaN(s)) return t; const m = Math.floor(s / 60); const sec = s % 60; return `${m}:${String(sec).padStart(2, '0')}`; })()}\n` +
    `${form.reasonForTimeDiscrepancy ? `Reason for Time Discrepancy: ${form.reasonForTimeDiscrepancy}\n` : ''}` +
    `\nRadiographer: ${form.radiographerName || ''}\n` +
    `Signed: ${form.radiographerSignatureTimestamp ? new Date(form.radiographerSignatureTimestamp).toLocaleString() : 'N/A'}\n` +
    ((form as any).submissionLatitude && (form as any).submissionLongitude
      ? `Location: ${form.radiographerSignatureLocation || ''} — https://maps.google.com/?q=${(form as any).submissionLatitude},${(form as any).submissionLongitude}\n`
      : `Location: ${form.radiographerSignatureLocation || ''}\n`) +
    `\nOriginally submitted: ${form.updatedAt ? new Date(form.updatedAt).toLocaleString() : 'N/A'}\n` +
    `Submitted by: ${form.submittedBy || 'N/A'}\n`;

  return {
    subject,
    body,
    recipients: customRecipients || ['paul@intouchmedtech.co.za', 'jenny@centaurimedical.co.za', 'kevin@centaurimedical.co.za'],
  };
}

export function buildCOIDAEmail(form: FormData, customRecipients?: string[]): { subject: string; body: string; recipients: string[] } {
  const patientName = `${form.patientTitle || ''} ${form.patientFirstName || ''} ${form.patientLastName || ''}`.trim();
  const coidaForm = form as any;
  const proceduresList = Array.isArray(coidaForm.procedure)
    ? coidaForm.procedure.join(', ')
    : String(coidaForm.procedure || '');

  const subject = `COIDA Form - ${patientName}`;
  const body =
    `COIDA Form Submission (Resent)\n\n` +
    `Patient: ${patientName}\n` +
    `ID Number: ${form.idNumber || ''}\n` +
    `Date of Birth: ${form.dateOfBirth || ''}\n` +
    `Gender: ${coidaForm.gender || 'N/A'}\n` +
    `Contact: ${form.contactNumber || ''}\n` +
    `Home Phone: ${coidaForm.homePhone || 'N/A'}\n` +
    `Work Phone: ${coidaForm.workPhone || 'N/A'}\n` +
    `Email: ${form.email || ''}\n` +
    `Patient Address: ${coidaForm.patientAddress || 'N/A'}\n\n` +
    `Admission Date: ${coidaForm.admissionDate || 'N/A'}\n` +
    `Admission Time: ${coidaForm.admissionTime || 'N/A'}\n\n` +
    `COIDA Number: ${coidaForm.coidaMemberNumber || ''}\n` +
    `IOD Claim Number: ${coidaForm.patientIodClaimNumber || ''}\n` +
    `Employer: ${coidaForm.employerName || ''}\n` +
    `Employer Contact: ${coidaForm.employerContact || ''}\n` +
    `Date of Incident: ${coidaForm.dateOfIncident || ''}\n\n` +
    `ICD10 Code: ${form.icd10Code || 'N/A'}\n` +
    `Procedures: ${proceduresList}\n` +
    `Date of Procedure: ${coidaForm.dateOfProcedure || ''}\n` +
    `Theatre Time Witness: ${coidaForm.theatreTimeWitness || 'N/A'}\n` +
    `Fixed Installation: ${coidaForm.fixedInstallation || 'N/A'}\n\n` +
    `Time In Theatre: ${coidaForm.timeInTheatre || ''}\n` +
    `Time Out Theatre: ${coidaForm.timeOutTheatre || ''}\n` +
    `Fluoroscopy Time: ${((): string => { const t = String(coidaForm.fluoroscopyTime ?? ''); if (!t) return 'N/A'; if (t.includes(':')) return t; const s = parseInt(t, 10); if (isNaN(s)) return t; const m = Math.floor(s / 60); const sec = s % 60; return `${m}:${String(sec).padStart(2, '0')}`; })()}\n` +
    `${coidaForm.reasonForTimeDiscrepancy ? `Reason for Time Discrepancy: ${coidaForm.reasonForTimeDiscrepancy}\n` : ''}` +
    `\nRadiographer: ${form.radiographerName || ''}\n` +
    `Signed: ${form.radiographerSignatureTimestamp ? new Date(form.radiographerSignatureTimestamp).toLocaleString() : 'N/A'}\n` +
    ((form as any).submissionLatitude && (form as any).submissionLongitude
      ? `Location: ${form.radiographerSignatureLocation || ''} — https://maps.google.com/?q=${(form as any).submissionLatitude},${(form as any).submissionLongitude}\n`
      : `Location: ${form.radiographerSignatureLocation || ''}\n`) +
    `\nOriginally submitted: ${form.updatedAt ? new Date(form.updatedAt).toLocaleString() : 'N/A'}\n` +
    `Submitted by: ${form.submittedBy || 'N/A'}\n`;

  return {
    subject,
    body,
    recipients: customRecipients || ['paul@intouchmedtech.co.za', 'nokuthula@debttec.co.za', 'allan@medimarketing100.co.za'],
  };
}

async function loadPhotosForForm(form: FormData): Promise<Array<{ base64Uri: string; filename: string }>> {
  const photos: Array<{ base64Uri: string; filename: string }> = [];
  const formId = form.id;
  const coidaForm = form as any;

  console.log('[resendEmail] Loading photos from storage for form:', formId);

  const hospitalPhoto = await readPhoto(formId, 'hospital');
  if (hospitalPhoto) {
    photos.push({ base64Uri: hospitalPhoto, filename: 'hospital_sticker.jpg' });
    console.log('[resendEmail] Loaded hospital sticker photo');
  }

  const timeInPhoto = await readPhoto(formId, 'timeIn');
  if (timeInPhoto) {
    photos.push({ base64Uri: timeInPhoto, filename: 'clock_in_theatre.jpg' });
    console.log('[resendEmail] Loaded time in photo');
  }

  const timeOutPhoto = await readPhoto(formId, 'timeOut');
  if (timeOutPhoto) {
    photos.push({ base64Uri: timeOutPhoto, filename: 'clock_out_theatre.jpg' });
    console.log('[resendEmail] Loaded time out photo');
  }

  if (form.formType === 'coida') {
    const timeInClockPhoto = await readPhoto(formId, 'timeInClock');
    if (timeInClockPhoto) {
      photos.push({ base64Uri: timeInClockPhoto, filename: 'time_in_theatre_clock.jpg' });
      console.log('[resendEmail] Loaded time in clock photo');
    }

    const screeningPhoto = await readPhoto(formId, 'screening');
    if (screeningPhoto) {
      photos.push({ base64Uri: screeningPhoto, filename: 'screening_time.jpg' });
      console.log('[resendEmail] Loaded screening time photo');
    }

    const timeOutClockPhoto = await readPhoto(formId, 'timeOutClock');
    if (timeOutClockPhoto) {
      photos.push({ base64Uri: timeOutClockPhoto, filename: 'time_out_theatre_clock.jpg' });
      console.log('[resendEmail] Loaded time out clock photo');
    }

    const firstMedicalPhoto = await readPhoto(formId, 'firstMedical');
    if (firstMedicalPhoto) {
      photos.push({ base64Uri: firstMedicalPhoto, filename: 'first_medical_report.jpg' });
      console.log('[resendEmail] Loaded first medical report photo');
    }

    const patientIdPhoto = await readPhoto(formId, 'patientId');
    if (patientIdPhoto) {
      photos.push({ base64Uri: patientIdPhoto, filename: 'patient_id.jpg' });
      console.log('[resendEmail] Loaded patient ID photo');
    }

    const referralLetterPhoto = await readPhoto(formId, 'referralLetter');
    if (referralLetterPhoto) {
      photos.push({ base64Uri: referralLetterPhoto, filename: 'referral_letter.jpg' });
      console.log('[resendEmail] Loaded referral letter photo');
    }

    const cArmCount = coidaForm.cArmImagesCount || (coidaForm.cArmImages?.length || 0);
    for (let i = 0; i < cArmCount; i++) {
      const photo = await readPhoto(formId, `cArm_${i}`);
      if (photo) {
        photos.push({ base64Uri: photo, filename: `c_arm_image_${i + 1}.jpg` });
        console.log(`[resendEmail] Loaded c-arm image ${i + 1}`);
      }
    }

    const employerCount = coidaForm.employerReportPhotosCount || (coidaForm.employerReportPhotos?.length || 0);
    for (let i = 0; i < employerCount; i++) {
      const photo = await readPhoto(formId, `employer_${i}`);
      if (photo) {
        photos.push({ base64Uri: photo, filename: `employer_report_${i + 1}.jpg` });
        console.log(`[resendEmail] Loaded employer report ${i + 1}`);
      }
    }

    const attachmentCount = coidaForm.attachmentPhotosCount || (coidaForm.attachmentPhotos?.length || 0);
    for (let i = 0; i < attachmentCount; i++) {
      const photo = await readPhoto(formId, `attachment_${i}`);
      if (photo) {
        photos.push({ base64Uri: photo, filename: `attachment_${i + 1}.jpg` });
        console.log(`[resendEmail] Loaded attachment ${i + 1}`);
      }
    }

    const referralPageCount = coidaForm.referralLetterPagesCount || (coidaForm.referralLetterPages?.length || 0);
    for (let i = 0; i < referralPageCount; i++) {
      const photo = await readPhoto(formId, `referralPage_${i}`);
      if (photo) {
        photos.push({ base64Uri: photo, filename: `referral_letter_${i + 1}.jpg` });
        console.log(`[resendEmail] Loaded referral letter page ${i + 1}`);
      }
    }
  }

  console.log(`[resendEmail] Total photos loaded: ${photos.length}`);
  return photos;
}

export async function resendFormEmail(form: FormData, customRecipients?: string[]): Promise<void> {
  console.log('[resendEmail] Resending email for form:', form.id, 'type:', form.formType);

  const { subject, body, recipients } = form.formType === 'coida'
    ? buildCOIDAEmail(form, customRecipients)
    : buildMedicalAidEmail(form, customRecipients);

  const photos = await loadPhotosForForm(form);

  // On web, use mailto fallback
  if (Platform.OS === 'web') {
    const mailtoRecipients = recipients.join(',');
    const mailtoSubject = encodeURIComponent(subject);
    const mailtoBody = encodeURIComponent(body);
    const mailtoUrl = `mailto:${mailtoRecipients}?subject=${mailtoSubject}&body=${mailtoBody}`;
    window.open(mailtoUrl, '_blank');
    console.log('[resendEmail] Opened mailto link on web');
    return;
  }

  const isAvailable = await MailComposer.isAvailableAsync();
  if (!isAvailable) {
    console.log('[resendEmail] Mail composer not available');
    Alert.alert(
      'Mail Not Available',
      'No email client is configured on this device. Please set up an email account in your device settings.'
    );
    return;
  }

  const attachments: string[] = [];

  if (photos.length > 0) {
    const tempDir = `${(FileSystem as any).cacheDirectory || ''}resend_attachments/`;
    try {
      await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
    } catch {}

    for (const photo of photos) {
      try {
        const base64Data = photo.base64Uri.replace(/^data:[^;]+;base64,/, '');
        const filePath = `${tempDir}${photo.filename}`;
        await FileSystem.writeAsStringAsync(filePath, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        attachments.push(filePath);
        console.log('[resendEmail] Saved attachment:', photo.filename);
      } catch (err) {
        console.error('[resendEmail] Failed to save attachment:', photo.filename, err);
      }
    }
  }

  console.log(`[resendEmail] Opening mail composer with ${attachments.length} attachments...`);
  const mailResult = await MailComposer.composeAsync({
    recipients,
    subject,
    body,
    attachments,
  });
  console.log('[resendEmail] Mail composer result:', mailResult.status);
}

export async function forwardUserForms(
  forms: FormData[],
  userIdentifier: string,
  targetEmail: string = 'paul@intouchmedtech.co.za',
): Promise<{ sent: number; skipped: number }> {
  console.log(`[forwardUserForms] Forwarding ${forms.length} forms for user "${userIdentifier}" to ${targetEmail}`);

  const submittedForms = forms.filter(f => f.status === 'submitted');
  if (submittedForms.length === 0) {
    Alert.alert('No Submitted Forms', `User "${userIdentifier}" has no submitted forms to forward.`);
    return { sent: 0, skipped: forms.length };
  }

  if (Platform.OS === 'web') {
    // On web, combine all forms into a single email
    const subject = `[Forwarded] All submitted forms for ${userIdentifier}`;
    let body = `Forwarded Forms for ${userIdentifier}\n`;
    body += `Total forms: ${submittedForms.length}\n`;
    body += `${'='.repeat(50)}\n\n`;

    for (let i = 0; i < submittedForms.length; i++) {
      const f = submittedForms[i];
      const { body: formBody } = f.formType === 'coida'
        ? buildCOIDAEmail(f)
        : buildMedicalAidEmail(f);
      body += `--- Form ${i + 1} of ${submittedForms.length} ---\n`;
      body += formBody;
      body += `\n${'='.repeat(50)}\n\n`;
    }

    const mailtoUrl = `mailto:${encodeURIComponent(targetEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');
    console.log('[forwardUserForms] Opened combined mailto on web');
    Alert.alert('Forwarding', `Opening email with ${submittedForms.length} form(s) for ${userIdentifier} to ${targetEmail}.`);
    return { sent: submittedForms.length, skipped: 0 };
  }

  // On native, open MailComposer for each form sequentially
  const isAvailable = await MailComposer.isAvailableAsync();
  if (!isAvailable) {
    Alert.alert(
      'Mail Not Available',
      'No email client is configured on this device. Please set up an email account in your device settings.'
    );
    return { sent: 0, skipped: submittedForms.length };
  }

  let sent = 0;
  let skipped = 0;

  for (let i = 0; i < submittedForms.length; i++) {
    const form = submittedForms[i];
    try {
      console.log(`[forwardUserForms] Forwarding form ${i + 1}/${submittedForms.length}: ${form.id}`);

      const { subject, body } = form.formType === 'coida'
        ? buildCOIDAEmail(form, [targetEmail])
        : buildMedicalAidEmail(form, [targetEmail]);

      const photos = await loadPhotosForForm(form);
      const attachments: string[] = [];

      if (photos.length > 0) {
        const tempDir = `${(FileSystem as any).cacheDirectory || ''}forward_attachments/`;
        try {
          await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
        } catch {}

        for (const photo of photos) {
          try {
            const base64Data = photo.base64Uri.replace(/^data:[^;]+;base64,/, '');
            const filePath = `${tempDir}${photo.filename}`;
            await FileSystem.writeAsStringAsync(filePath, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            attachments.push(filePath);
          } catch (err) {
            console.error('[forwardUserForms] Failed to save attachment:', photo.filename, err);
          }
        }
      }

      const mailResult = await MailComposer.composeAsync({
        recipients: [targetEmail],
        subject: `[Forwarded: ${userIdentifier}] ${subject}`,
        body,
        attachments,
      });

      if (mailResult.status === 'sent') {
        sent++;
      } else {
        skipped++;
        console.log(`[forwardUserForms] Form ${form.id} not sent, status: ${mailResult.status}`);
      }
    } catch (err) {
      skipped++;
      console.error(`[forwardUserForms] Error forwarding form ${form.id}:`, err);
    }
  }

  const message = sent > 0
    ? `Forwarded ${sent} form(s) for ${userIdentifier} to ${targetEmail}.${skipped > 0 ? ` ${skipped} skipped.` : ''}`
    : `No forms were forwarded for ${userIdentifier}.`;
  Alert.alert('Forwarding Complete', message);
  console.log(`[forwardUserForms] Done: ${sent} sent, ${skipped} skipped`);
  return { sent, skipped };
}
