/**
 * AI-powered OCR extraction from hospital sticker photos.
 * Uses GPT-4o mini vision model via the Rork AI proxy to extract
 * patient demographics, medical aid details, and hospital info
 * from a captured hospital sticker photo, then auto-fills form fields.
 */

import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

const TOOLKIT_URL = process.env.EXPO_PUBLIC_TOOLKIT_URL;
const SECRET_KEY = process.env.EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY;

const STICKER_OCR_MODEL = 'openai/gpt-4o-mini';

/** Maximum base64 payload size before Vercel's 4.5MB request body limit (with 33% overhead + JSON envelope). */
const MAX_BASE64_BYTES = 2_800_000;

export interface ExtractedStickerData {
  patientTitle?: string;
  patientFirstName?: string;
  patientLastName?: string;
  idNumber?: string;
  dateOfBirth?: string;
  contactNumber?: string;
  email?: string;
  gender?: string;
  patientAddress?: string;
  homePhone?: string;
  workPhone?: string;
  ward?: string;
  bed?: string;
  admissionDate?: string;
  admissionTime?: string;
  caseNumber?: string;
  authorizationCode?: string;
  medicalAidName?: string;
  medicalAidPlan?: string;
  membershipNumber?: string;
  dependantCode?: string;
  mainMemberTitle?: string;
  mainMemberFirstName?: string;
  mainMemberLastName?: string;
  mainMemberIdNumber?: string;
  referringDoctor?: string;
  doctorPracticeNumber?: string;
  hospitalServiceProvider?: string;
  dap?: string;
  fixedInstallation?: string;
  theatreTimeWitness?: string;
}

const stripDataUriPrefix = (uri: string): string => {
  if (!uri.startsWith('data:')) return uri;
  const comma = uri.indexOf(',');
  return comma === -1 ? uri : uri.slice(comma + 1);
};

/**
 * Resize image to fit within the Vercel request body budget.
 * Uses an iterative ladder of decreasing quality / dimensions.
 */
const resizeForUpload = async (imageUri: string): Promise<string> => {
  const steps: Array<{ width: number; quality: number }> = [
    { width: 1280, quality: 0.82 },
    { width: 1024, quality: 0.78 },
    { width: 832, quality: 0.74 },
    { width: 640, quality: 0.70 },
  ];

  for (const step of steps) {
    const result = await manipulateAsync(
      imageUri,
      [{ resize: { width: step.width } }],
      { compress: step.quality, format: SaveFormat.JPEG, base64: true },
    );

    if (result.base64) {
      const sizeEstimate = Math.ceil(result.base64.length * 0.75);
      if (sizeEstimate <= MAX_BASE64_BYTES) {
        return result.base64;
      }
    }
  }

  // Last resort: smallest size
  const result = await manipulateAsync(
    imageUri,
    [{ resize: { width: 512 } }],
    { compress: 0.65, format: SaveFormat.JPEG, base64: true },
  );
  return result.base64 || '';
};

const EXTRACTION_PROMPT = `You are a medical document OCR specialist. Examine this hospital sticker / patient label photo and extract ALL visible information.

Return ONLY a JSON object (no markdown, no explanation) with these fields. Leave a field empty string "" if not visible on the sticker:

{
  "patientTitle": "Mr|Mrs|Miss|Ms|Dr|Prof",
  "patientFirstName": "",
  "patientLastName": "",
  "idNumber": "",
  "dateOfBirth": "DD/MM/YYYY",
  "contactNumber": "",
  "email": "",
  "gender": "Male|Female|Other",
  "patientAddress": "",
  "homePhone": "",
  "workPhone": "",
  "ward": "",
  "bed": "",
  "admissionDate": "DDMMYYYY",
  "admissionTime": "HHMM",
  "caseNumber": "",
  "authorizationCode": "",
  "medicalAidName": "",
  "medicalAidPlan": "",
  "membershipNumber": "",
  "dependantCode": "",
  "mainMemberTitle": "Mr|Mrs|Miss|Ms|Dr|Prof",
  "mainMemberFirstName": "",
  "mainMemberLastName": "",
  "mainMemberIdNumber": "",
  "referringDoctor": "",
  "doctorPracticeNumber": "",
  "hospitalServiceProvider": "",
  "dap": "",
  "fixedInstallation": "Yes|No",
  "theatreTimeWitness": ""
}

Rules:
- South African ID numbers: extract exactly as shown (13 digits).
- Dates: convert to DD/MM/YYYY for dateOfBirth, DDMMYYYY for admissionDate.
- Times: convert to HHMM (24h) for admissionTime.
- If a field is a label on the sticker with no value, leave it empty.
- If the main member is the same as the patient, still fill in main member fields.
- Return ONLY the JSON, no other text.`;

/**
 * Extract structured data from a hospital sticker photo using AI vision OCR.
 * @param photoUri - The base64 data URI or file URI of the hospital sticker photo.
 * @returns Extracted fields that can be merged into form data.
 */
export const extractStickerData = async (photoUri: string): Promise<ExtractedStickerData> => {
  if (!TOOLKIT_URL) {
    throw new Error('Toolkit URL not configured');
  }

  console.log('[StickerOCR] Starting AI extraction...');

  // Resize image to fit within request body limit
  const resizedBase64 = await resizeForUpload(photoUri);
  if (!resizedBase64) {
    throw new Error('Failed to process image for OCR');
  }

  console.log('[StickerOCR] Image resized, base64 length:', resizedBase64.length);

  const requestBody = {
    model: STICKER_OCR_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are a medical document OCR specialist. You extract structured data from hospital patient stickers. You return only valid JSON, no markdown or explanations.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: EXTRACTION_PROMPT },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${resizedBase64}` },
          },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 2000,
  };

  const endpoint = `${TOOLKIT_URL}/v2/vercel/v1/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // On native platforms, include the secret key. On web, the runtime injects auth.
  if (Platform.OS !== 'web' && SECRET_KEY) {
    headers['Authorization'] = `Bearer ${SECRET_KEY}`;
  }

  console.log('[StickerOCR] Sending request to:', endpoint);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error('[StickerOCR] API error:', response.status, errorText);
    throw new Error(`OCR request failed (${response.status})`);
  }

  const data = await response.json();
  const content: string = data?.choices?.[0]?.message?.content || '';

  if (!content) {
    console.error('[StickerOCR] No content in response:', JSON.stringify(data).substring(0, 500));
    throw new Error('No OCR data returned from AI');
  }

  console.log('[StickerOCR] Raw AI response length:', content.length);

  // Extract JSON from the response (handle cases where AI wraps in markdown)
  let jsonStr = content.trim();
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  let parsed: ExtractedStickerData;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (parseError) {
    console.error('[StickerOCR] JSON parse error:', parseError, 'Raw:', jsonStr.substring(0, 500));
    throw new Error('Failed to parse OCR results');
  }

  // Clean up: remove empty strings and normalize
  const cleaned: ExtractedStickerData = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === 'string' && value.trim()) {
      (cleaned as any)[key] = value.trim();
    }
  }

  console.log('[StickerOCR] Extracted fields:', Object.keys(cleaned).join(', '));
  return cleaned;
};

/**
 * Map extracted sticker data to valid form field values.
 * Normalizes titles, gender, and other fields to match form expectations.
 */
export const normalizeStickerData = (data: ExtractedStickerData): Partial<Record<string, string>> => {
  const result: Partial<Record<string, string>> = {};
  const validTitles = ['Mr', 'Mrs', 'Miss', 'Ms', 'Dr', 'Prof'];
  const validGenders = ['Male', 'Female', 'Other'];
  const validYesNo = ['Yes', 'No'];

  if (data.patientTitle) {
    const match = validTitles.find(t => t.toLowerCase() === data.patientTitle?.toLowerCase());
    if (match) result.patientTitle = match;
  }
  if (data.patientFirstName) result.patientFirstName = data.patientFirstName;
  if (data.patientLastName) result.patientLastName = data.patientLastName;
  if (data.idNumber) result.idNumber = data.idNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (data.dateOfBirth) result.dateOfBirth = data.dateOfBirth;
  if (data.contactNumber) result.contactNumber = data.contactNumber;
  if (data.email) result.email = data.email;
  if (data.gender) {
    const match = validGenders.find(g => g.toLowerCase() === data.gender?.toLowerCase());
    if (match) result.gender = match;
  }
  if (data.patientAddress) result.patientAddress = data.patientAddress;
  if (data.homePhone) result.homePhone = data.homePhone;
  if (data.workPhone) result.workPhone = data.workPhone;
  if (data.ward) result.ward = data.ward;
  if (data.bed) result.bed = data.bed;
  if (data.admissionDate) result.admissionDate = data.admissionDate.replace(/\D/g, '');
  if (data.admissionTime) {
    const numericTime = data.admissionTime.replace(/\D/g, '');
    if (numericTime.length >= 3) {
      result.admissionTime = `${numericTime.substring(0, 2)}H${numericTime.substring(2, 4)}`;
    }
  }
  if (data.caseNumber) result.caseNumber = data.caseNumber;
  if (data.authorizationCode) result.authorizationCode = data.authorizationCode;
  if (data.medicalAidName) result.medicalAidName = data.medicalAidName;
  if (data.medicalAidPlan) result.medicalAidPlan = data.medicalAidPlan;
  if (data.membershipNumber) result.membershipNumber = data.membershipNumber;
  if (data.dependantCode) result.dependantCode = data.dependantCode;
  if (data.mainMemberTitle) {
    const match = validTitles.find(t => t.toLowerCase() === data.mainMemberTitle?.toLowerCase());
    if (match) result.mainMemberTitle = match;
  }
  if (data.mainMemberFirstName) result.mainMemberFirstName = data.mainMemberFirstName;
  if (data.mainMemberLastName) result.mainMemberLastName = data.mainMemberLastName;
  if (data.mainMemberIdNumber) result.mainMemberIdNumber = data.mainMemberIdNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (data.referringDoctor) result.referringDoctor = data.referringDoctor;
  if (data.doctorPracticeNumber) result.doctorPracticeNumber = data.doctorPracticeNumber;
  if (data.hospitalServiceProvider) result.hospitalServiceProvider = data.hospitalServiceProvider;
  if (data.dap) result.dap = data.dap;
  if (data.fixedInstallation) {
    const match = validYesNo.find(v => v.toLowerCase() === data.fixedInstallation?.toLowerCase());
    if (match) result.fixedInstallation = match;
  }
  if (data.theatreTimeWitness) result.theatreTimeWitness = data.theatreTimeWitness;

  return result;
};
