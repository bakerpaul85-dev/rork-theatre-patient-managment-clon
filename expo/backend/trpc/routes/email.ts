import { z } from "zod";
import { Resend } from "resend";
import { createTRPCRouter, publicProcedure } from "../create-context";

const PhotoMetadataSchema = z.object({
  timestamp: z.union([z.number(), z.string()]),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
}).nullable().optional();

const FormDataSchema = z.object({
  id: z.string(),
  formType: z.enum(['medical-aid', 'coida']),
  date: z.string().optional(),
  dateOfBirth: z.string().optional(),
  patientTitle: z.string().optional(),
  patientFirstName: z.string().optional(),
  patientLastName: z.string().optional(),
  idNumber: z.string().optional(),
  contactNumber: z.string().optional(),
  email: z.string().optional(),
  // Medical aid fields
  mainMemberTitle: z.string().optional(),
  mainMemberFirstName: z.string().optional(),
  mainMemberLastName: z.string().optional(),
  mainMemberIdNumber: z.string().optional(),
  medicalAidName: z.string().optional(),
  medicalAidPlan: z.string().optional(),
  membershipNumber: z.string().optional(),
  dependantCode: z.string().optional(),
  hospitalServiceProvider: z.string().optional(),
  referringDoctor: z.string().optional(),
  doctorPracticeNumber: z.string().optional(),
  numberOfSessions: z.string().optional(),
  cArmOwnedByHospital: z.string().optional(),
  contrastUsage: z.string().optional(),
  contrastName: z.string().optional(),
  contrastAmount: z.string().optional(),
  // COIDA fields
  coidaMemberNumber: z.string().optional(),
  patientIodClaimNumber: z.string().optional(),
  employerName: z.string().optional(),
  employerContact: z.string().optional(),
  dateOfIncident: z.string().optional(),
  dateOfProcedure: z.string().optional(),
  timeInTheatre: z.string().optional(),
  timeOutTheatre: z.string().optional(),
  fluoroscopyTime: z.string().optional(),
  // General fields
  procedure: z.union([z.string(), z.array(z.string())]).optional(),
  icd10Code: z.string().optional(),
  timeCArmTakenIn: z.string().optional(),
  timeCArmTakenOut: z.string().optional(),
  screeningTimeText: z.string().optional(),
  reasonForTimeDiscrepancy: z.string().optional(),
  radiographerName: z.string().optional(),
  radiographerSignatureTimestamp: z.union([z.number(), z.string()]).optional(),
  radiographerSignatureLocation: z.string().optional(),
  submissionLatitude: z.number().optional(),
  submissionLongitude: z.number().optional(),
  createdAt: z.union([z.number(), z.string()]).optional(),
  updatedAt: z.union([z.number(), z.string()]).optional(),
  status: z.string().optional(),
  submittedBy: z.string().optional(),
  caseStatus: z.string().optional(),
  // Photo metadata
  hospitalStickerPhotoMetadata: PhotoMetadataSchema,
  timeInTheatrePhotoMetadata: PhotoMetadataSchema,
  timeOutTheatrePhotoMetadata: PhotoMetadataSchema,
  timeInTheatreClockPhotoMetadata: PhotoMetadataSchema,
  timeOutTheatreClockPhotoMetadata: PhotoMetadataSchema,
  screeningTimePhotoMetadata: PhotoMetadataSchema,
  firstMedicalReportPhotoMetadata: PhotoMetadataSchema,
  patientIdPhotoMetadata: PhotoMetadataSchema,
  // Generic catch-all for extra fields
  additionalData: z.record(z.string(), z.any()).optional(),
}).passthrough();

const AttachmentSchema = z.object({
  filename: z.string(),
  content: z.string(),
  contentType: z.string(),
});

const SendEmailInputSchema = z.object({
  form: FormDataSchema,
  attachments: z.array(AttachmentSchema).optional(),
  csvData: z.string().optional(),
  hl7Data: z.object({
    filename: z.string(),
    content: z.string(),
  }).optional(),
  excelData: z.object({
    filename: z.string(),
    content: z.string(),
  }).optional(),
});

export const emailRouter = createTRPCRouter({
  sendForm: publicProcedure
    .input(SendEmailInputSchema)
    .mutation(async ({ input }) => {
      const resendApiKey = process.env.RESEND_API_KEY;
      
      if (!resendApiKey) {
        console.error("RESEND_API_KEY not configured");
        throw new Error("Email service not configured");
      }

      const resend = new Resend(resendApiKey);
      const { form, attachments, csvData, hl7Data, excelData } = input;

      const patientName = [
        form.patientTitle,
        form.patientFirstName,
        form.patientLastName,
      ].filter(Boolean).join(' ').trim();

      const formTypeName = form.formType === 'medical-aid' ? 'Medical Aid' : 'COIDA';

      let locationText = '';
      if (form.submissionLatitude && form.submissionLongitude) {
        const googleMapsUrl = `https://www.google.com/maps?q=${form.submissionLatitude},${form.submissionLongitude}`;
        locationText = `Submission Location: ${form.submissionLatitude.toFixed(6)}, ${form.submissionLongitude.toFixed(6)}\nGoogle Maps: ${googleMapsUrl}\n`;
      }

      let photosMetadataText = '';
      const addPhotoMeta = (label: string, meta: any) => {
        if (!meta) return;
        const ts = typeof meta.timestamp === 'number'
          ? new Date(meta.timestamp).toLocaleString()
          : new Date(meta.timestamp).toLocaleString();
        photosMetadataText += `\n${label}: Timestamp: ${ts}`;
        if (meta.latitude != null && meta.longitude != null) {
          photosMetadataText += `\n  Location: ${meta.latitude.toFixed(6)}, ${meta.longitude.toFixed(6)}\n  Map: https://www.google.com/maps?q=${meta.latitude},${meta.longitude}`;
        }
      };
      addPhotoMeta('Hospital Sticker Photo', form.hospitalStickerPhotoMetadata);
      addPhotoMeta('Time In Theatre Photo', form.timeInTheatrePhotoMetadata);
      addPhotoMeta('Time Out Theatre Photo', form.timeOutTheatrePhotoMetadata);
      addPhotoMeta('Time In Theatre Clock Photo', form.timeInTheatreClockPhotoMetadata);
      addPhotoMeta('Time Out Theatre Clock Photo', form.timeOutTheatreClockPhotoMetadata);
      addPhotoMeta('Screening Time Photo', form.screeningTimePhotoMetadata);
      addPhotoMeta('First Medical Report Photo', form.firstMedicalReportPhotoMetadata);
      addPhotoMeta('Patient ID Photo', form.patientIdPhotoMetadata);

      const procedureStr = Array.isArray(form.procedure)
        ? form.procedure.join(', ')
        : (form.procedure || 'N/A');

      const signTimestamp = form.radiographerSignatureTimestamp
        ? (typeof form.radiographerSignatureTimestamp === 'number'
          ? new Date(form.radiographerSignatureTimestamp).toLocaleString()
          : new Date(form.radiographerSignatureTimestamp).toLocaleString())
        : 'N/A';

      const submittedDate = form.createdAt
        ? (typeof form.createdAt === 'number'
          ? new Date(form.createdAt).toLocaleString()
          : new Date(form.createdAt).toLocaleString())
        : new Date().toLocaleString();

      const formatScreeningTime = (t: string | undefined): string => {
        if (!t) return 'N/A';
        if (t.includes(':')) return t;
        const s = parseInt(t, 10);
        if (isNaN(s)) return t;
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${String(sec).padStart(2, '0')}`;
      };

      const emailBody = [
        `${formTypeName} Form Submission`,
        '',
        'Patient Information:',
        `Name: ${patientName || 'N/A'}`,
        `ID Number: ${form.idNumber || 'N/A'}`,
        `Date of Birth: ${form.dateOfBirth || 'N/A'}`,
        `Contact Number: ${form.contactNumber || 'N/A'}`,
        form.email ? `Email: ${form.email}` : null,
        '',
      ].filter(l => l !== null).join('\n');

      const medicalAidSection = form.formType === 'medical-aid' ? [
        'Medical Aid Information:',
        `Main Member: ${[form.mainMemberTitle, form.mainMemberFirstName, form.mainMemberLastName].filter(Boolean).join(' ')}`,
        `Main Member ID: ${form.mainMemberIdNumber || 'N/A'}`,
        `Medical Aid: ${form.medicalAidName || 'N/A'}`,
        `Medical Aid Plan: ${form.medicalAidPlan || 'N/A'}`,
        `Membership Number: ${form.membershipNumber || 'N/A'}`,
        `Dependant Code: ${form.dependantCode || 'N/A'}`,
      ] : [
        'Employer/COIDA Information:',
        `COIDA Number: ${form.coidaMemberNumber || 'N/A'}`,
        `IOD Claim Number: ${form.patientIodClaimNumber || 'N/A'}`,
        `Employer: ${form.employerName || 'N/A'}`,
        `Employer Contact: ${form.employerContact || 'N/A'}`,
        `Date of Incident: ${form.dateOfIncident || 'N/A'}`,
      ];

      const headerSection = form.formType === 'medical-aid' ? [
        `Hospital/Service Provider: ${form.hospitalServiceProvider || 'N/A'}`,
        `Referring Doctor: ${form.referringDoctor || 'N/A'}`,
        `Doctor Practice Number: ${form.doctorPracticeNumber || 'N/A'}`,
      ] : [];

      const procedureSection = [
        '',
        'Procedure Information:',
        `Procedure: ${procedureStr}`,
        `ICD10 Code: ${form.icd10Code || 'N/A'}`,
        `Date: ${form.date || form.dateOfProcedure || 'N/A'}`,
      ];

      const maExtra = form.formType === 'medical-aid' ? [
        `Number of Sessions (per 30 min): ${form.numberOfSessions || 'N/A'}`,
        `C-Arm Owned by Hospital: ${form.cArmOwnedByHospital || 'N/A'}`,
        `Contrast Usage: ${form.contrastUsage || 'N/A'}`,
        form.contrastUsage === 'Supplied by External'
          ? `Contrast Name: ${form.contrastName || 'N/A'}\nContrast Amount: ${form.contrastAmount || 'N/A'}`
          : null,
        `Time C Arm In: ${form.timeCArmTakenIn || 'N/A'}`,
        `Time C Arm Out: ${form.timeCArmTakenOut || 'N/A'}`,
        `Screening Time: ${formatScreeningTime(form.screeningTimeText)}`,
      ].filter(l => l !== null) : [
        `Time In Theatre: ${form.timeInTheatre || 'N/A'}`,
        `Time Out Theatre: ${form.timeOutTheatre || 'N/A'}`,
        `Fluoroscopy Time: ${formatScreeningTime(form.fluoroscopyTime)}`,
      ];

      const footer = [
        form.reasonForTimeDiscrepancy ? `Reason for Time Discrepancy: ${form.reasonForTimeDiscrepancy}` : null,
        '',
        'Radiographer Information:',
        `Name: ${form.radiographerName || 'N/A'}`,
        `Signed: ${signTimestamp}`,
        `Location: ${form.radiographerSignatureLocation || 'N/A'}`,
        locationText.trim() || null,
        form.submittedBy ? `Submitted by: ${form.submittedBy}` : null,
        `Submitted at: ${submittedDate}`,
        photosMetadataText.trim() ? `\nPhotos Metadata:${photosMetadataText}` : null,
      ].filter(l => l !== null);

      const fullBody = [
        emailBody,
        ...headerSection,
        ...medicalAidSection,
        ...procedureSection,
        ...maExtra,
        ...footer,
      ].join('\n');

      const emailAttachments: Array<{
        filename: string;
        content: Buffer;
        contentType?: string;
      }> = [];

      if (attachments) {
        for (const attachment of attachments) {
          emailAttachments.push({
            filename: attachment.filename,
            content: Buffer.from(attachment.content, 'base64'),
            contentType: attachment.contentType,
          });
        }
      }

      if (csvData) {
        const csvFilename = `${formTypeName}_${patientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
        emailAttachments.push({
          filename: csvFilename,
          content: Buffer.from(csvData, 'utf-8'),
          contentType: 'text/csv',
        });
      }

      if (hl7Data) {
        emailAttachments.push({
          filename: hl7Data.filename,
          content: Buffer.from(hl7Data.content, 'utf-8'),
          contentType: 'application/hl7-v2',
        });
      }

      if (excelData) {
        emailAttachments.push({
          filename: excelData.filename,
          content: Buffer.from(excelData.content, 'base64'),
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      }

      console.log(`Sending email for ${formTypeName} form - Patient: ${patientName}`);
      console.log(`Attachments: ${emailAttachments.length}`);

      try {
        const toRecipients = ['paul@intouchmedtech.co.za'];
        
        if (form.formType === 'medical-aid') {
          toRecipients.push('kevin@centaurimedical.co.za', 'jenny@centaurimedical.co.za');
        } else {
          toRecipients.push('nokuthula@debttec.co.za');
        }
        
        const result = await resend.emails.send({
          from: 'Theatre patient management <noreply@advanceddiagnostic.co.za>',
          to: toRecipients,
          cc: ['allan@medimarketing100.co.za'],
          subject: `${formTypeName} Form - ${patientName || 'Unknown Patient'}`,
          text: fullBody,
          attachments: emailAttachments.map(att => ({
            filename: att.filename,
            content: att.content,
          })),
        });

        console.log('Resend API response:', JSON.stringify(result, null, 2));

        if (result.error) {
          console.error('Resend returned error:', result.error);
          throw new Error(`Resend error: ${result.error.message || JSON.stringify(result.error)}`);
        }

        if (!result.data?.id) {
          console.error('No message ID returned from Resend');
          throw new Error('Email send failed - no confirmation received from Resend');
        }

        console.log('Email sent successfully! Message ID:', result.data.id);

        return {
          success: true,
          messageId: result.data.id,
        };
      } catch (error) {
        console.error('Failed to send email:', error);
        throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),
});
