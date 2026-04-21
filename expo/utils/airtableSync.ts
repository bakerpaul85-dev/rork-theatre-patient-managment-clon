const AIRTABLE_API = 'https://api.airtable.com/v0';

interface AirtableTarget {
  baseId: string;
  tableId: string;
  recordId?: string;
}

const getPat = (): string => {
  const pat = process.env.EXPO_PUBLIC_AIRTABLE_PAT;
  if (!pat || !pat.trim()) throw new Error('Airtable PAT not configured');
  return pat.trim();
};

const sanitizeValue = (v: any): any => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  if (Array.isArray(v)) {
    const joined = v
      .map(item => {
        if (item == null) return '';
        if (typeof item === 'object') {
          if (item.uri) return '[photo]';
          return JSON.stringify(item);
        }
        return String(item);
      })
      .filter(Boolean)
      .join(', ');
    return joined;
  }
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
};

const cleanFields = (fields: Record<string, any>): Record<string, any> => {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    const sv = sanitizeValue(v);
    if (sv === undefined || sv === '') continue;
    out[k] = sv;
  }
  return out;
};

const patchOrPost = async (
  target: AirtableTarget,
  fields: Record<string, any>,
  pat: string
): Promise<{ ok: boolean; status: number; body: string; id?: string }> => {
  const base = `${AIRTABLE_API}/${target.baseId}/${target.tableId}`;
  const url = target.recordId ? `${base}/${target.recordId}` : base;
  const method = target.recordId ? 'PATCH' : 'POST';
  const body = target.recordId
    ? JSON.stringify({ fields, typecast: true })
    : JSON.stringify({ records: [{ fields }], typecast: true });
  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Content-Type': 'application/json',
    },
    body,
  });
  const text = await response.text();
  let id: string | undefined;
  if (response.ok) {
    try {
      const j = JSON.parse(text);
      id = j.id || j.records?.[0]?.id;
    } catch {}
  }
  return { ok: response.ok, status: response.status, body: text, id };
};

const extractUnknownFieldName = (body: string): string | null => {
  try {
    const j = JSON.parse(body);
    const msg: string = j?.error?.message || j?.error?.type || '';
    const m1 = msg.match(/Unknown field name:?\s*"([^"]+)"/i);
    if (m1) return m1[1];
    const m2 = msg.match(/field\s+"([^"]+)"/i);
    if (m2) return m2[1];
  } catch {}
  const m = body.match(/Unknown field name:?\s*"([^"]+)"/i);
  if (m) return m[1];
  return null;
};

export const syncFormToAirtable = async (
  target: AirtableTarget,
  rawFields: Record<string, any>
): Promise<{ success: boolean; recordId?: string; skippedFields: string[]; error?: string }> => {
  let pat: string;
  try {
    pat = getPat();
  } catch (e: any) {
    console.warn('[AirtableSync] PAT missing:', e?.message);
    return { success: false, skippedFields: [], error: e?.message };
  }

  let fields = cleanFields(rawFields);
  const skipped: string[] = [];
  console.log('[AirtableSync] Syncing', Object.keys(fields).length, 'fields to', target.recordId ? `record ${target.recordId}` : 'new record');

  for (let attempt = 0; attempt < 30; attempt++) {
    const res = await patchOrPost(target, fields, pat);
    if (res.ok) {
      console.log('[AirtableSync] Sync OK, id:', res.id || target.recordId, 'skipped:', skipped);
      return { success: true, recordId: res.id || target.recordId, skippedFields: skipped };
    }
    if (res.status === 422 || res.status === 400) {
      const unknown = extractUnknownFieldName(res.body);
      if (unknown && fields[unknown] !== undefined) {
        console.warn('[AirtableSync] Dropping unknown field:', unknown);
        skipped.push(unknown);
        delete fields[unknown];
        continue;
      }
    }
    console.error('[AirtableSync] Airtable error', res.status, res.body.substring(0, 400));
    return { success: false, skippedFields: skipped, error: `Airtable ${res.status}: ${res.body.substring(0, 200)}` };
  }

  return { success: false, skippedFields: skipped, error: 'Too many unknown fields' };
};

export interface FormAirtablePayload {
  [key: string]: any;
}

export const buildMedicalAidAirtablePayload = (form: any, meta: { submittedBy?: string; timestamp: string }): FormAirtablePayload => {
  return {
    'Patient Salutation': form.patientTitle,
    'Patient First Name': form.patientFirstName,
    'Patient Surname': form.patientLastName,
    'ID Number': form.idNumber,
    'Date of Birth': form.dateOfBirth,
    'Patient Telephone Cell': form.contactNumber,
    'Patient Email': form.email,
    'Hospital Service Provider': form.hospitalServiceProvider,
    'Ward': form.ward,
    'Referring Doctor': form.referringDoctor,
    'Doctor Practice Number': form.doctorPracticeNumber,
    'Main Member Salutation': form.mainMemberTitle,
    'Main Member First Name': form.mainMemberFirstName,
    'Main Member Surname': form.mainMemberLastName,
    'Main Member ID Number': form.mainMemberIdNumber,
    'Medical Aid Name': form.medicalAidName,
    'Medical Aid Plan': form.medicalAidPlan,
    'Membership Number': form.membershipNumber,
    'Dependant Code': form.dependantCode,
    'Next of Kin Name': form.nextOfKinName,
    'Next of Kin Contact Number': form.nextOfKinContactNumber,
    'Procedure': form.procedure,
    'ICD10 Code': form.icd10Code,
    'Time C Arm Taken In': form.timeCArmTakenIn,
    'Time C Arm Taken Out': form.timeCArmTakenOut,
    'Screening Time': form.screeningTimeText,
    'Reason for Time Discrepancy': form.reasonForTimeDiscrepancy,
    'Radiographer Name': form.radiographerName,
    'Radiographer Signature Timestamp': meta.timestamp,
    'Radiographer Signature Location': form.radiographerSignatureLocation,
    'Submission Latitude': form.submissionLatitude,
    'Submission Longitude': form.submissionLongitude,
    'Submitted By': meta.submittedBy,
    'Status': 'Submitted',
    'Case Status Medical Aid': 'Submitted',
    'Form Type': 'Medical Aid',
    'Submitted At': meta.timestamp,
  };
};

export const buildCoidaAirtablePayload = (form: any, meta: { submittedBy?: string; timestamp: string }): FormAirtablePayload => {
  const procedure = Array.isArray(form.procedure) ? form.procedure.join(', ') : form.procedure;
  return {
    'Patient Salutation': form.patientTitle,
    'Patient First Name': form.patientFirstName,
    'Patient Surname': form.patientLastName,
    'ID Number': form.idNumber,
    'Date of Birth': form.dateOfBirth,
    'Patient Telephone Cell': form.contactNumber,
    'Patient Email': form.email,
    'COIDA Number': form.coidaMemberNumber,
    'IOD Claim Number': form.patientIodClaimNumber,
    'Employer Name': form.employerName,
    'Employer Contact': form.employerContact,
    'Date of Incident': form.dateOfIncident,
    'Date of Procedure': form.dateOfProcedure,
    'Procedure': procedure,
    'ICD10 Code': form.icd10Code,
    'Time in Theatre': form.timeInTheatre,
    'Time out Theatre': form.timeOutTheatre,
    'Fluoroscopy Time': form.fluoroscopyTime,
    'Reason for Time Discrepancy': form.reasonForTimeDiscrepancy,
    'Radiographer Name': form.radiographerName,
    'Radiographer Signature Timestamp': meta.timestamp,
    'Radiographer Signature Location': form.radiographerSignatureLocation,
    'Submission Latitude': form.submissionLatitude,
    'Submission Longitude': form.submissionLongitude,
    'Submitted By': meta.submittedBy,
    'Status': 'Submitted',
    'Case Status WCA': 'Submitted',
    'Form Type': 'COIDA',
    'Submitted At': meta.timestamp,
  };
};
