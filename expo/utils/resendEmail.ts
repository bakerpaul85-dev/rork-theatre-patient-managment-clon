import * as MailComposer from 'expo-mail-composer';
import { Platform, Alert } from 'react-native';
import { FormData } from '@/contexts/FormsContext';

function buildMedicalAidEmail(form: FormData): { subject: string; body: string; recipients: string[] } {
  const patientName = `${form.patientTitle || ''} ${form.patientFirstName || ''} ${form.patientLastName || ''}`.trim();
  const subject = `Medical Aid Form - ${patientName} (Resent)`;
  const body =
    `Medical Aid Form Submission (Resent)\n\n` +
    `Patient: ${patientName}\n` +
    `ID Number: ${form.idNumber || ''}\n` +
    `Date of Birth: ${form.dateOfBirth || ''}\n` +
    `Contact: ${form.contactNumber || ''}\n` +
    `Email: ${form.email || ''}\n\n` +
    `Hospital/Service Provider: ${form.hospitalServiceProvider || ''}\n` +
    `Ward/Theatre: ${form.ward || ''}\n` +
    `Referring Doctor: ${form.referringDoctor || ''}\n` +
    `Doctor Practice Number: ${form.doctorPracticeNumber || ''}\n\n` +
    `Main Member: ${form.mainMemberTitle || ''} ${form.mainMemberFirstName || ''} ${form.mainMemberLastName || ''}\n` +
    `Main Member ID: ${form.mainMemberIdNumber || ''}\n` +
    `Medical Aid: ${form.medicalAidName || ''}\n` +
    `Medical Aid Plan: ${form.medicalAidPlan || ''}\n` +
    `Membership Number: ${form.membershipNumber || ''}\n` +
    `Dependant Code: ${form.dependantCode || ''}\n\n` +
    `Procedure: ${form.procedure || ''}\n` +
    `ICD10 Code: ${form.icd10Code || ''}\n\n` +
    `Time C Arm In: ${form.timeCArmTakenIn || ''}\n` +
    `Time C Arm Out: ${form.timeCArmTakenOut || ''}\n` +
    `Screening Time: ${form.screeningTimeText || ''}\n` +
    `${form.reasonForTimeDiscrepancy ? `Reason for Time Discrepancy: ${form.reasonForTimeDiscrepancy}\n` : ''}` +
    `\nRadiographer: ${form.radiographerName || ''}\n` +
    `Signed: ${form.radiographerSignatureTimestamp ? new Date(form.radiographerSignatureTimestamp).toLocaleString() : 'N/A'}\n` +
    `Location: ${form.radiographerSignatureLocation || ''}\n` +
    `\nOriginally submitted: ${form.updatedAt ? new Date(form.updatedAt).toLocaleString() : 'N/A'}\n` +
    `Submitted by: ${form.submittedBy || 'N/A'}\n`;

  return {
    subject,
    body,
    recipients: ['paul@intouchmedtech.co.za', 'jenny@centaurimedical.co.za', 'kevin@centaurimedical.co.za'],
  };
}

function buildCOIDAEmail(form: FormData): { subject: string; body: string; recipients: string[] } {
  const patientName = `${form.patientTitle || ''} ${form.patientFirstName || ''} ${form.patientLastName || ''}`.trim();
  const coidaForm = form as any;
  const proceduresList = Array.isArray(coidaForm.procedure)
    ? coidaForm.procedure.join(', ')
    : String(coidaForm.procedure || '');

  const subject = `COIDA Form - ${patientName} (Resent)`;
  const body =
    `COIDA Form Submission (Resent)\n\n` +
    `Patient: ${patientName}\n` +
    `ID Number: ${form.idNumber || ''}\n` +
    `Date of Birth: ${form.dateOfBirth || ''}\n` +
    `Contact: ${form.contactNumber || ''}\n` +
    `Email: ${form.email || ''}\n\n` +
    `COIDA Number: ${coidaForm.coidaMemberNumber || ''}\n` +
    `IOD Claim Number: ${coidaForm.patientIodClaimNumber || ''}\n` +
    `Employer: ${coidaForm.employerName || ''}\n` +
    `Employer Contact: ${coidaForm.employerContact || ''}\n` +
    `Date of Incident: ${coidaForm.dateOfIncident || ''}\n\n` +
    `ICD10 Code: ${form.icd10Code || 'N/A'}\n` +
    `Procedures: ${proceduresList}\n` +
    `Date of Procedure: ${coidaForm.dateOfProcedure || ''}\n\n` +
    `Time In Theatre: ${coidaForm.timeInTheatre || ''}\n` +
    `Time Out Theatre: ${coidaForm.timeOutTheatre || ''}\n` +
    `Fluoroscopy Time: ${coidaForm.fluoroscopyTime || ''}s\n` +
    `${coidaForm.reasonForTimeDiscrepancy ? `Reason for Time Discrepancy: ${coidaForm.reasonForTimeDiscrepancy}\n` : ''}` +
    `\nRadiographer: ${form.radiographerName || ''}\n` +
    `Signed: ${form.radiographerSignatureTimestamp ? new Date(form.radiographerSignatureTimestamp).toLocaleString() : 'N/A'}\n` +
    `Location: ${form.radiographerSignatureLocation || ''}\n` +
    `\nOriginally submitted: ${form.updatedAt ? new Date(form.updatedAt).toLocaleString() : 'N/A'}\n` +
    `Submitted by: ${form.submittedBy || 'N/A'}\n`;

  return {
    subject,
    body,
    recipients: ['paul@intouchmedtech.co.za', 'nokuthula@debttec.co.za', 'allan@medimarketing100.co.za'],
  };
}

export async function resendFormEmail(form: FormData): Promise<void> {
  console.log('[resendEmail] Resending email for form:', form.id, 'type:', form.formType);

  const { subject, body, recipients } = form.formType === 'coida'
    ? buildCOIDAEmail(form)
    : buildMedicalAidEmail(form);

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
      'No email client is configured on this device. Please set up an email account in your device settings and try again.'
    );
    return;
  }

  console.log('[resendEmail] Opening mail composer...');
  await MailComposer.composeAsync({
    recipients,
    subject,
    body,
  });
  console.log('[resendEmail] Mail composer closed');
}
