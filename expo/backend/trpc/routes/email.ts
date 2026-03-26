import { z } from "zod";
import { Resend } from "resend";
import { createTRPCRouter, publicProcedure } from "../create-context";

const PhotoMetadataSchema = z.object({
  timestamp: z.number(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
}).nullable().optional();

const FormDataSchema = z.object({
  id: z.string(),
  formType: z.enum(['medical-aid', 'coida']),
  date: z.string(),
  patientTitle: z.string(),
  patientFirstName: z.string(),
  patientLastName: z.string(),
  idNumber: z.string(),
  dateOfBirth: z.string(),
  contactNumber: z.string(),
  email: z.string().optional(),
  mainMemberTitle: z.string().optional(),
  mainMemberFirstName: z.string().optional(),
  mainMemberLastName: z.string().optional(),
  mainMemberIdNumber: z.string().optional(),
  medicalAidName: z.string().optional(),
  membershipNumber: z.string().optional(),
  dependantCode: z.string().optional(),
  nextOfKinName: z.string().optional(),
  nextOfKinContactNumber: z.string().optional(),
  employerName: z.string().optional(),
  employerContactNumber: z.string().optional(),
  dateOfIncident: z.string().optional(),
  procedure: z.string(),
  icd10Code: z.string().optional(),
  timeCArmTakenIn: z.string(),
  timeCArmTakenOut: z.string(),
  screeningTimeText: z.string().optional(),
  radiographerName: z.string(),
  radiographerSignatureTimestamp: z.number(),
  radiographerSignatureLocation: z.string(),
  submissionLatitude: z.number().optional(),
  submissionLongitude: z.number().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  hospitalStickerPhotoMetadata: PhotoMetadataSchema,
  timeInTheatrePhotoMetadata: PhotoMetadataSchema,
  timeOutTheatrePhotoMetadata: PhotoMetadataSchema,
});

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

      const patientName = `${form.patientTitle} ${form.patientFirstName} ${form.patientLastName}`.trim();
      const formTypeName = form.formType === 'medical-aid' ? 'Medical Aid' : 'COIDA';

      let locationText = '';
      if (form.submissionLatitude && form.submissionLongitude) {
        const googleMapsUrl = `https://www.google.com/maps?q=${form.submissionLatitude},${form.submissionLongitude}`;
        locationText = `
Submission Location:
Coordinates: ${form.submissionLatitude.toFixed(6)}, ${form.submissionLongitude.toFixed(6)}
Google Maps: ${googleMapsUrl}
`;
      }

      let photosMetadataText = '';
      if (form.hospitalStickerPhotoMetadata) {
        photosMetadataText += `\nHospital Sticker Photo:\nTimestamp: ${new Date(form.hospitalStickerPhotoMetadata.timestamp).toLocaleString()}`;
        if (form.hospitalStickerPhotoMetadata.latitude && form.hospitalStickerPhotoMetadata.longitude) {
          photosMetadataText += `\nLocation: ${form.hospitalStickerPhotoMetadata.latitude.toFixed(6)}, ${form.hospitalStickerPhotoMetadata.longitude.toFixed(6)}\nMap: https://www.google.com/maps?q=${form.hospitalStickerPhotoMetadata.latitude},${form.hospitalStickerPhotoMetadata.longitude}`;
        }
      }
      if (form.timeInTheatrePhotoMetadata) {
        photosMetadataText += `\n\nTime In Theatre Photo:\nTimestamp: ${new Date(form.timeInTheatrePhotoMetadata.timestamp).toLocaleString()}`;
        if (form.timeInTheatrePhotoMetadata.latitude && form.timeInTheatrePhotoMetadata.longitude) {
          photosMetadataText += `\nLocation: ${form.timeInTheatrePhotoMetadata.latitude.toFixed(6)}, ${form.timeInTheatrePhotoMetadata.longitude.toFixed(6)}\nMap: https://www.google.com/maps?q=${form.timeInTheatrePhotoMetadata.latitude},${form.timeInTheatrePhotoMetadata.longitude}`;
        }
      }
      if (form.timeOutTheatrePhotoMetadata) {
        photosMetadataText += `\n\nTime Out Theatre Photo:\nTimestamp: ${new Date(form.timeOutTheatrePhotoMetadata.timestamp).toLocaleString()}`;
        if (form.timeOutTheatrePhotoMetadata.latitude && form.timeOutTheatrePhotoMetadata.longitude) {
          photosMetadataText += `\nLocation: ${form.timeOutTheatrePhotoMetadata.latitude.toFixed(6)}, ${form.timeOutTheatrePhotoMetadata.longitude.toFixed(6)}\nMap: https://www.google.com/maps?q=${form.timeOutTheatrePhotoMetadata.latitude},${form.timeOutTheatrePhotoMetadata.longitude}`;
        }
      }

      const emailBody = `
${formTypeName} Form Submission

Patient Information:
Name: ${patientName}
ID Number: ${form.idNumber}
Date of Birth: ${form.dateOfBirth}
Contact Number: ${form.contactNumber}
${form.email ? `Email: ${form.email}\n` : ''}
${form.formType === 'medical-aid' ? `
Medical Aid Information:
Main Member: ${form.mainMemberTitle || ''} ${form.mainMemberFirstName || ''} ${form.mainMemberLastName || ''}
Medical Aid: ${form.medicalAidName || ''}
Membership Number: ${form.membershipNumber || ''}
Dependant Code: ${form.dependantCode || ''}
` : `
Employer Information:
Employer Name: ${form.employerName || 'N/A'}
Employer Contact: ${form.employerContactNumber || 'N/A'}
`}
Procedure Information:
Procedure: ${form.procedure}
ICD10 Code: ${form.icd10Code || 'N/A'}
Date: ${form.date}
Time C Arm Taken In: ${form.timeCArmTakenIn}
Time C Arm Taken Out: ${form.timeCArmTakenOut}
${form.screeningTimeText ? `Screening Time: ${form.screeningTimeText} minutes\n` : ''}
Radiographer Information:
Name: ${form.radiographerName}
Signed on: ${new Date(form.radiographerSignatureTimestamp).toLocaleString()}
Location: ${form.radiographerSignatureLocation}
${locationText}
${photosMetadataText ? `\nPhotos Metadata:${photosMetadataText}` : ''}
      `.trim();

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
          subject: `${formTypeName} Form - ${patientName}`,
          text: emailBody,
          attachments: emailAttachments.map(att => ({
            filename: att.filename,
            content: att.content,
          })),
        });

        console.log('Resend API response:', JSON.stringify(result, null, 2));

        // Check if Resend returned an error in the response
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
