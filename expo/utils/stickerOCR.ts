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
  hospitalName?: string;
}

export interface ExtractedReferralData {
  patientFirstName?: string;
  patientLastName?: string;
  idNumber?: string;
  coidaMemberNumber?: string;
  patientIodClaimNumber?: string;
  employerName?: string;
  employerContact?: string;
  dateOfIncident?: string;
  procedures?: string[];
  dateOfProcedure?: string;
  icd10Code?: string;
  hospitalName?: string;
  admissionDate?: string;
  admissionTime?: string;
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
  "hospitalName": ""
}

Rules:
- South African ID numbers: extract exactly as shown (13 digits).
- Dates: convert to DD/MM/YYYY for dateOfBirth, DDMMYYYY for admissionDate.
- Times: convert to HHMM (24h) for admissionTime.
- Phone numbers: extract the digits after the label. The label "WK" or "Work" means the patient's work number → put in workPhone. The label "HM" or "Home" or "H" means the patient's home/mobile number → put in homePhone. If the sticker has only one phone number with no label, put it in contactNumber.
- If a field is a label on the sticker with no value, leave it empty.
- If the main member is the same as the patient, still fill in main member fields.
- hospitalName: the name of the hospital printed on the sticker or letterhead.
- Return ONLY the JSON, no other text.`;

/**
 * Shared AI vision request: resizes the image, calls the OCR model via the
 * Rork proxy and parses the JSON response.
 */
const requestVisionJSON = async (prompt: string, photoUri: string): Promise<Record<string, unknown>> => {
  if (!TOOLKIT_URL) {
    throw new Error('Toolkit URL not configured');
  }

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
        content: 'You are a medical document OCR specialist. You extract structured data from medical documents and photos. You return only valid JSON, no markdown or explanations.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
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

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error('[StickerOCR] API error:', response.status, errorText);
    if (response.status === 402) {
      throw new Error('AI extraction is temporarily unavailable. Please fill in the fields manually and try again later.');
    }
    if (response.status === 401) {
      throw new Error('AI features are currently unavailable. Please restart the app.');
    }
    throw new Error(`OCR request failed (${response.status})`);
  }

  const data = await response.json();
  const content: string = data?.choices?.[0]?.message?.content || '';

  if (!content) {
    console.error('[StickerOCR] No content in response:', JSON.stringify(data).substring(0, 500));
    throw new Error('No OCR data returned from AI');
  }

  // Extract JSON from the response (handle cases where AI wraps in markdown)
  let jsonStr = content.trim();
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (parseError) {
    console.error('[StickerOCR] JSON parse error:', parseError, 'Raw:', jsonStr.substring(0, 500));
    throw new Error('Failed to parse OCR results');
  }

  return parsed;
};

const cleanStringFields = (parsed: Record<string, unknown>): Record<string, string> => {
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === 'string' && value.trim()) {
      cleaned[key] = value.trim();
    }
  }
  return cleaned;
};

/**
 * Extract structured data from a hospital sticker photo using AI vision OCR.
 * @param photoUri - The base64 data URI or file URI of the hospital sticker photo.
 * @returns Extracted fields that can be merged into form data.
 */
export const extractStickerData = async (photoUri: string): Promise<ExtractedStickerData> => {
  console.log('[StickerOCR] Starting AI extraction...');
  const parsed = await requestVisionJSON(EXTRACTION_PROMPT, photoUri);
  const cleaned = cleanStringFields(parsed) as ExtractedStickerData;
  console.log('[StickerOCR] Extracted fields:', Object.keys(cleaned).join(', '));
  return cleaned;
};

const REFERRAL_PROMPT = `You are a medical document OCR specialist. Examine this scanned COIDA referral letter / form from a doctor or hospital and extract the following details.

Return ONLY a JSON object (no markdown, no explanation) with these fields. Leave a field empty string "" if not present in the document:

{
  "patientFirstName": "",
  "patientLastName": "",
  "idNumber": "",
  "coidaMemberNumber": "",
  "patientIodClaimNumber": "",
  "employerName": "",
  "employerContact": "",
  "dateOfIncident": "DD/MM/YYYY",
  "procedures": [],
  "dateOfProcedure": "DD/MM/YYYY",
  "icd10Code": "",
  "hospitalName": "",
  "admissionDate": "DD/MM/YYYY",
  "admissionTime": "HHMM"
}

Rules:
- coidaMemberNumber: the COIDA / WCA / Compensation Fund number (digits only).
- patientIodClaimNumber: the IOD claim reference number.
- procedures: list each procedure / tariff code mentioned, one string per procedure in the format "CODE DESCRIPTION" (e.g. "00155 X-ray C-arm fluoroscopy in theatre per half hour").
- icd10Code: the ICD-10 diagnosis code (e.g. S72.0).
- dateOfIncident: the date of the injury / accident.
- dateOfProcedure: the date the procedure was performed.
- hospitalName: the hospital where the procedure took place or where the patient was admitted.
- Convert all dates to DD/MM/YYYY format.
- Convert admissionTime to 24h HHMM.
- Return ONLY the JSON, no other text.`;

/**
 * Extract COIDA claim details from a scanned referral letter page.
 */
export const extractReferralData = async (photoUri: string): Promise<ExtractedReferralData> => {
  console.log('[ReferralOCR] Starting AI extraction...');
  const parsed = await requestVisionJSON(REFERRAL_PROMPT, photoUri);

  const result: ExtractedReferralData = { ...cleanStringFields(parsed) } as ExtractedReferralData;

  if (Array.isArray(parsed.procedures)) {
    result.procedures = parsed.procedures.map((p) => String(p ?? '').trim()).filter(Boolean);
  } else if (typeof parsed.procedures === 'string' && parsed.procedures.trim()) {
    result.procedures = parsed.procedures.split(/;|,\s*/).map((p) => p.trim()).filter(Boolean);
  }

  console.log('[ReferralOCR] Extracted fields:', Object.keys(result).join(', '));
  return result;
};

const normalizeDateToDDMMYYYY = (value: string): string => {
  const trimmed = value.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 8) {
    // Could be DDMMYYYY or YYYYMMDD — prefer DDMMYYYY when the first 4 aren't a plausible year
    if (parseInt(digits.substring(0, 4), 10) > 1900 && parseInt(digits.substring(0, 4), 10) < 2100) {
      return `${digits.substring(6, 8)}/${digits.substring(4, 6)}/${digits.substring(0, 4)}`;
    }
    return `${digits.substring(0, 2)}/${digits.substring(2, 4)}/${digits.substring(4, 8)}`;
  }
  return trimmed;
};

/**
 * Map extracted referral data to valid COIDA form values.
 */
export const normalizeReferralData = (data: ExtractedReferralData): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  if (data.patientFirstName) result.patientFirstName = data.patientFirstName;
  if (data.patientLastName) result.patientLastName = data.patientLastName;
  if (data.idNumber) result.idNumber = data.idNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (data.coidaMemberNumber) result.coidaMemberNumber = data.coidaMemberNumber.replace(/\D/g, '');
  if (data.patientIodClaimNumber) result.patientIodClaimNumber = data.patientIodClaimNumber.replace(/\D/g, '');
  if (data.employerName) result.employerName = data.employerName;
  if (data.employerContact) result.employerContact = data.employerContact.replace(/[^0-9+\s]/g, '');
  if (data.dateOfIncident) result.dateOfIncident = normalizeDateToDDMMYYYY(data.dateOfIncident);
  if (data.procedures && data.procedures.length > 0) result.procedures = data.procedures;
  if (data.dateOfProcedure) result.dateOfProcedure = normalizeDateToDDMMYYYY(data.dateOfProcedure);
  if (data.icd10Code) result.icd10Code = data.icd10Code.toUpperCase().replace(/\s+/g, '');
  if (data.hospitalName) result.hospitalName = data.hospitalName;
  if (data.admissionDate) result.admissionDate = data.admissionDate.replace(/\D/g, '');
  if (data.admissionTime) {
    const numericTime = data.admissionTime.replace(/\D/g, '');
    if (numericTime.length >= 3) {
      result.admissionTime = `${numericTime.substring(0, 2)}H${numericTime.substring(2, 4)}`;
    }
  }

  return result;
};

export interface ExtractedMedAidReferralData {
  patientTitle?: string;
  patientFirstName?: string;
  patientLastName?: string;
  idNumber?: string;
  contactNumber?: string;
  referringDoctor?: string;
  doctorPracticeNumber?: string;
  medicalAidName?: string;
  membershipNumber?: string;
  dependantCode?: string;
  icd10Code?: string;
  procedure?: string;
  procedureDate?: string;
  admissionDate?: string;
  admissionTime?: string;
  theatreTimeIn?: string;
  theatreTimeOut?: string;
  hospitalServiceProvider?: string;
}

const MEDICAL_AID_REFERRAL_PROMPT = `You are a medical document OCR specialist. Examine this scanned referral letter / theatre screening tool from a doctor, hospital or radiography practice for a Medical Aid claim and extract the following details.

The document may be typed, handwritten, or contain a pasted hospital patient sticker (with patient name, medical aid scheme, membership number, dependant code, admission date/time). Read both the sticker and the handwritten fields.

Return ONLY a JSON object (no markdown, no explanation) with these fields. Leave a field empty string "" if not present in the document:

{
  "patientTitle": "",
  "patientFirstName": "",
  "patientLastName": "",
  "idNumber": "",
  "contactNumber": "",
  "referringDoctor": "",
  "doctorPracticeNumber": "",
  "medicalAidName": "",
  "membershipNumber": "",
  "dependantCode": "",
  "icd10Code": "",
  "procedure": "",
  "procedureDate": "DD/MM/YYYY",
  "admissionDate": "DD/MM/YYYY",
  "admissionTime": "HHMM",
  "theatreTimeIn": "HHMM",
  "theatreTimeOut": "HHMM",
  "hospitalServiceProvider": ""
}

Rules:
- patientTitle: one of Mr, Mrs, Miss, Ms, Dr, Prof.
- referringDoctor: the doctor's name from the "Doctor" field (e.g. "Azhar").
- doctorPracticeNumber: the "Practice number" field (digits only, e.g. "2001314" or "039 001 0483931" without spaces).
- medicalAidName: the medical aid scheme name from the sticker or form (e.g. "BONITAS", "Discovery Health", "GEMS").
- membershipNumber: the medical aid membership number (digits only, e.g. "12603904").
- dependantCode: the dependant number/code on the medical aid card (e.g. "01").
- procedure: the "Procedure" field as written, including the level/spine region if present (e.g. "Endoscopic discectomy L4-L5").
- procedureDate: the "Procedure date" field.
- admissionDate: the "Admitted" date on the sticker if present.
- admissionTime: the "Admitted" time on the sticker if present.
- theatreTimeIn: the "Theatre C-Arm time in" field (24h, e.g. "15:45" becomes "1545").
- theatreTimeOut: the "Theatre C-Arm time out" field (24h, e.g. "18:34" becomes "1834").
- icd10Code: ALL ICD-10 diagnosis codes from the "ICD-10 codes" box, separated by commas (e.g. "M47.26, M48.06").
- hospitalServiceProvider: the "Hospital" field (e.g. "The Fountain hospital").
- Convert all dates to DD/MM/YYYY format.
- Convert all times to 24h HHMM.
- Return ONLY the JSON, no other text.`;

/**
 * Extract Medical Aid claim details from a scanned referral letter page.
 */
export const extractMedicalAidReferralData = async (photoUri: string): Promise<ExtractedMedAidReferralData> => {
  console.log('[MedAidReferralOCR] Starting AI extraction...');
  const parsed = await requestVisionJSON(MEDICAL_AID_REFERRAL_PROMPT, photoUri);
  const result: ExtractedMedAidReferralData = { ...cleanStringFields(parsed) } as ExtractedMedAidReferralData;
  console.log('[MedAidReferralOCR] Extracted fields:', Object.keys(result).join(', '));
  return result;
};

/**
 * Map extracted referral data to valid Medical Aid form values.
 */
export const normalizeMedicalAidReferralData = (data: ExtractedMedAidReferralData): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  if (data.patientTitle) {
    const title = data.patientTitle.trim().toLowerCase();
    const matched = ['mr', 'mrs', 'miss', 'ms', 'dr', 'prof'].find(t => t === title);
    if (matched) result.patientTitle = matched.charAt(0).toUpperCase() + matched.slice(1);
  }
  if (data.patientFirstName) result.patientFirstName = data.patientFirstName;
  if (data.patientLastName) result.patientLastName = data.patientLastName;
  if (data.idNumber) result.idNumber = data.idNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (data.contactNumber) result.contactNumber = data.contactNumber.replace(/[^0-9+\s]/g, '');
  if (data.referringDoctor) result.referringDoctor = data.referringDoctor;
  if (data.doctorPracticeNumber) result.doctorPracticeNumber = data.doctorPracticeNumber.replace(/\D/g, '');
  if (data.medicalAidName) result.medicalAidName = data.medicalAidName;
  if (data.membershipNumber) result.membershipNumber = data.membershipNumber.replace(/[^a-zA-Z0-9]/g, '');
  if (data.dependantCode) result.dependantCode = data.dependantCode.trim();
  if (data.icd10Code) {
    // Keep multiple codes readable: "M47.26 M48.06" -> "M47.26, M48.06"
    const codes = data.icd10Code.toUpperCase().split(/[\s,;]+/).map(c => c.trim()).filter(Boolean);
    if (codes.length > 0) result.icd10Code = codes.join(', ');
  }
  if (data.procedure) result.procedure = data.procedure.trim();
  const admissionDate = data.admissionDate || data.procedureDate;
  if (admissionDate) result.admissionDate = admissionDate.replace(/\D/g, '');
  if (data.admissionTime) {
    const numericTime = data.admissionTime.replace(/\D/g, '');
    if (numericTime.length >= 3) {
      result.admissionTime = `${numericTime.substring(0, 2)}H${numericTime.substring(2, 4)}`;
    }
  }
  const theatreTimeIn = data.theatreTimeIn?.replace(/\D/g, '');
  if (theatreTimeIn && theatreTimeIn.length >= 3) {
    result.timeCArmTakenIn = `${theatreTimeIn.substring(0, 2)}H${theatreTimeIn.substring(2, 4)}`;
  }
  const theatreTimeOut = data.theatreTimeOut?.replace(/\D/g, '');
  if (theatreTimeOut && theatreTimeOut.length >= 3) {
    result.timeCArmTakenOut = `${theatreTimeOut.substring(0, 2)}H${theatreTimeOut.substring(2, 4)}`;
  }
  if (data.hospitalServiceProvider) result.hospitalServiceProvider = data.hospitalServiceProvider;

  return result;
};

const CLOCK_PROMPT = `Examine this photo of a hospital theatre wall clock (analogue or digital).

Read the time displayed on the clock. Return ONLY a JSON object (no markdown, no explanation):

{
  "time": "HHMM"
}

Rules:
- Use 24-hour format, e.g. 14H30 becomes "1430", 09H05 becomes "0905".
- For analogue clocks, read the hour and minute hands carefully.
- If the clock face is unreadable or there is no clock visible, return "" for time.
- Return ONLY the JSON, no other text.`;

/**
 * Read the time from a theatre clock photo and return it formatted as HHMM
 * (e.g. "14H30") for the form's time fields. Returns "" if unreadable.
 */
export const extractClockTime = async (photoUri: string): Promise<string> => {
  console.log('[ClockOCR] Starting AI extraction...');
  const parsed = await requestVisionJSON(CLOCK_PROMPT, photoUri);
  const raw = typeof parsed.time === 'string' ? parsed.time : '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 3) {
    console.log('[ClockOCR] No readable time in photo');
    return '';
  }
  const hh = Math.min(23, Math.max(0, parseInt(digits.substring(0, 2), 10) || 0));
  const mm = Math.min(59, Math.max(0, parseInt(digits.substring(2, 4).padEnd(2, '0'), 10) || 0));
  const formatted = `${String(hh).padStart(2, '0')}H${String(mm).padStart(2, '0')}`;
  console.log('[ClockOCR] Extracted time:', formatted);
  return formatted;
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
  if (data.contactNumber) result.contactNumber = data.contactNumber.replace(/\D/g, '');
  if (data.email) result.email = data.email;
  if (data.gender) {
    const match = validGenders.find(g => g.toLowerCase() === data.gender?.toLowerCase());
    if (match) result.gender = match;
  }
  if (data.patientAddress) result.patientAddress = data.patientAddress;
  if (data.homePhone) result.homePhone = data.homePhone.replace(/\D/g, '');
  if (data.workPhone) result.workPhone = data.workPhone.replace(/\D/g, '');
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
  if (data.hospitalName) result.hospitalName = data.hospitalName;
  if (data.hospitalServiceProvider) result.hospitalServiceProvider = data.hospitalServiceProvider;
  if (data.dap) result.dap = data.dap;
  if (data.fixedInstallation) {
    const match = validYesNo.find(v => v.toLowerCase() === data.fixedInstallation?.toLowerCase());
    if (match) result.fixedInstallation = match;
  }

  return result;
};

export interface ExtractedEmployerData {
  employerName?: string;
  employerCode?: string;
  employerContactPerson?: string;
  employerContact?: string;
  employerAddress?: string;
  dateOfIncident?: string;
  patientFirstName?: string;
  patientLastName?: string;
  idNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  contactNumber?: string;
  patientAddress?: string;
}

const EMPLOYER_PROMPT = `You are a document OCR specialist. Examine this photo of a South African Employers Report of an Accident form (COIDA / Compensation Fund W.Cl.2, FEMA, Rand Mutual Assurance (RMA) or similar) and extract ONLY the details from sections or fields that are marked "NB" on the form.

These forms print an "NB" mark (bold or red) next to specific sections or fields. Data from fields WITHOUT an NB marking must NOT be extracted.

Typical NB markings on these forms:
- COIDA W.Cl.2 (Compensation Fund): "NB" appears in the EMPLOYEE section header ("EMPLOYEE ... CERTIFIED COPY OF IDENTITY DOCUMENT TO BE ATTACHED") — extract the employee's details from that section.
- FEMA Part A: "NB" appears next to items "32. Date of accident" / "33. Time of accident" — extract the date of accident.
- RMA: "NB" appears on "Contact Details" next to "Telephone No" and "Cell No" — extract the contact number.

Return ONLY a JSON object (no markdown, no explanation) with these fields. Leave a field as empty string "" unless its source field/section on the photo carries an NB marking:

{
  "employerName": "",
  "employerCode": "",
  "employerContactPerson": "",
  "employerContact": "",
  "employerAddress": "",
  "dateOfIncident": "DD/MM/YYYY",
  "patientFirstName": "",
  "patientLastName": "",
  "idNumber": "",
  "dateOfBirth": "DD/MM/YYYY",
  "gender": "Male|Female",
  "contactNumber": "",
  "patientAddress": ""
}

Rules:
- FIRST locate the NB markings on the photo. Then read the values of only the NB-marked fields, or fields inside NB-marked sections.
- employerName / employerCode / employerContactPerson / employerContact / employerAddress: fill only if the EMPLOYER section or those specific fields carry an NB marking.
- dateOfIncident: the date of the accident ("Date of accident", "Date of incident") — fill only if it or its row carries an NB marking. Convert to DD/MM/YYYY format.
- Employee details feed the patient fields: patientFirstName (First names), patientLastName (Surname), idNumber (ID/Passport No), dateOfBirth, gender, contactNumber (Telephone No / Cell No), patientAddress (residential address on one line) — fill only if the EMPLOYEE section or those specific fields carry an NB marking.
- Do NOT guess, infer or fabricate values. If an NB-marked value is unreadable, return "" for it.
- Return ONLY the JSON, no other text.`;

/**
 * Extract employer and employee details from a captured Employers Report photo
 * (COIDA / Compensation Fund, RMA or FEMA form) using AI vision OCR.
 */
export const extractEmployerReport = async (photoUri: string): Promise<ExtractedEmployerData> => {
  console.log('[EmployerOCR] Starting AI extraction...');
  const parsed = await requestVisionJSON(EMPLOYER_PROMPT, photoUri);
  const cleaned = cleanStringFields(parsed) as ExtractedEmployerData;
  console.log('[EmployerOCR] Extracted fields:', Object.keys(cleaned).join(', '));
  return cleaned;
};

/**
 * Map extracted employer report data to valid COIDA form values.
 */
export const normalizeEmployerData = (data: ExtractedEmployerData): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const validGenders = ['Male', 'Female'];

  if (data.employerName) result.employerName = data.employerName;
  if (data.employerCode) result.employerCode = data.employerCode.replace(/\s+/g, ' ').trim();
  if (data.employerContactPerson) result.employerContactPerson = data.employerContactPerson;
  if (data.employerContact) result.employerContact = data.employerContact.replace(/[^0-9+\s]/g, '');
  if (data.employerAddress) result.employerAddress = data.employerAddress;
  if (data.dateOfIncident) result.dateOfIncident = normalizeDateToDDMMYYYY(data.dateOfIncident);
  if (data.patientFirstName) result.patientFirstName = data.patientFirstName;
  if (data.patientLastName) result.patientLastName = data.patientLastName;
  if (data.idNumber) result.idNumber = data.idNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (data.dateOfBirth) result.dateOfBirth = data.dateOfBirth;
  if (data.gender) {
    const match = validGenders.find(g => g.toLowerCase() === data.gender?.toLowerCase());
    if (match) result.gender = match;
  }
  if (data.contactNumber) result.contactNumber = data.contactNumber.replace(/\D/g, '');
  if (data.patientAddress) result.patientAddress = data.patientAddress;

  return result;
};
