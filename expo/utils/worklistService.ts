import * as XLSX from 'xlsx';

export interface WorklistPatient {
  id: string;
  patientFirstName: string;
  patientLastName: string;
  patientTitle: string;
  idNumber: string;
  dateOfBirth: string;
  contactNumber: string;
  email: string;
  patientAddress: string;
  mainMemberTitle: string;
  mainMemberFirstName: string;
  mainMemberLastName: string;
  mainMemberIdNumber: string;
  mainMemberEmail: string;
  mainMemberPhone: string;
  medicalAidName: string;
  medicalAidPlan: string;
  membershipNumber: string;
  dependantCode: string;
  procedure: string;
  icd10Code: string;
  doctorPracticeNumber: string;
  coidaNumber: string;
  iodClaimNumber: string;
  employerName: string;
  employerContact: string;
  dateOfIncident: string;
  referringDoctor: string;
  ward: string;
  hospital: string;
  dateOfProcedure: string;
  estimatedStartDateTime: string;
  estimatedEndDateTime: string;
  actualStartDateTime: string;
  actualEndDateTime: string;
  caseType: string;
  caseComments: string;
  radiographerComments: string;
  formType: 'medical-aid' | 'coida' | 'unknown';
  rawData: Record<string, string>;
  airtableRecordId?: string;
  airtableBaseId?: string;
  airtableTableId?: string;
}

const COLUMN_MAP: Record<string, keyof WorklistPatient> = {
  'first name': 'patientFirstName',
  'firstname': 'patientFirstName',
  'first_name': 'patientFirstName',
  'name': 'patientFirstName',
  'patient name': 'patientFirstName',
  'patient first name': 'patientFirstName',
  'patient_first_name': 'patientFirstName',
  'last name': 'patientLastName',
  'lastname': 'patientLastName',
  'last_name': 'patientLastName',
  'surname': 'patientLastName',
  'patient last name': 'patientLastName',
  'patient surname': 'patientLastName',
  'patient_last_name': 'patientLastName',
  'title': 'patientTitle',
  'patient title': 'patientTitle',
  'patient salutation': 'patientTitle',
  'salutation': 'patientTitle',
  'id number': 'idNumber',
  'id_number': 'idNumber',
  'id no': 'idNumber',
  'id': 'idNumber',
  'identity number': 'idNumber',
  'sa id': 'idNumber',
  'sa id number': 'idNumber',
  'passport': 'idNumber',
  'passport number': 'idNumber',
  'patient id number': 'idNumber',
  'date of birth': 'dateOfBirth',
  'dob': 'dateOfBirth',
  'birth date': 'dateOfBirth',
  'date_of_birth': 'dateOfBirth',
  'contact': 'contactNumber',
  'contact number': 'contactNumber',
  'phone': 'contactNumber',
  'phone number': 'contactNumber',
  'cell': 'contactNumber',
  'cell number': 'contactNumber',
  'cellphone': 'contactNumber',
  'mobile': 'contactNumber',
  'tel': 'contactNumber',
  'telephone': 'contactNumber',
  'contact_number': 'contactNumber',
  'patient telephone cell': 'contactNumber',
  'patient telephone home': 'contactNumber',
  'patient telephone work': 'contactNumber',
  'email': 'email',
  'email address': 'email',
  'e-mail': 'email',
  'patient email': 'email',
  'patient address': 'patientAddress',
  'main member salutation': 'mainMemberTitle',
  'main member title': 'mainMemberTitle',
  'main member first name': 'mainMemberFirstName',
  'main member surname': 'mainMemberLastName',
  'main member last name': 'mainMemberLastName',
  'main member id number': 'mainMemberIdNumber',
  'main member email': 'mainMemberEmail',
  'main member telephone cell': 'mainMemberPhone',
  'main member telephone home': 'mainMemberPhone',
  'main member telephone work': 'mainMemberPhone',
  'medical aid': 'medicalAidName',
  'medical aid name': 'medicalAidName',
  'medical_aid': 'medicalAidName',
  'med aid': 'medicalAidName',
  'scheme': 'medicalAidName',
  'scheme name': 'medicalAidName',
  'medical aid plan': 'medicalAidPlan',
  'plan': 'medicalAidPlan',
  'plan name': 'medicalAidPlan',
  'medical aid option': 'medicalAidPlan',
  'option': 'medicalAidPlan',
  'membership number': 'membershipNumber',
  'membership no': 'membershipNumber',
  'member number': 'membershipNumber',
  'member no': 'membershipNumber',
  'membership_number': 'membershipNumber',
  'medical aid number': 'membershipNumber',
  'dependant code': 'dependantCode',
  'dependant': 'dependantCode',
  'dep code': 'dependantCode',
  'dependent code': 'dependantCode',
  'dependant number': 'dependantCode',
  'dependent number': 'dependantCode',
  'procedure': 'procedure',
  'procedures': 'procedure',
  'examination': 'procedure',
  'exam': 'procedure',
  'study': 'procedure',
  'study description': 'procedure',
  'icd10': 'icd10Code',
  'icd10 code': 'icd10Code',
  'icd-10': 'icd10Code',
  'icd 10': 'icd10Code',
  'diagnosis code': 'icd10Code',
  'doctor practice number': 'doctorPracticeNumber',
  'practice number': 'doctorPracticeNumber',
  'coida number': 'coidaNumber',
  'coida no': 'coidaNumber',
  'coida': 'coidaNumber',
  'coida_number': 'coidaNumber',
  'wcomp number': 'coidaNumber',
  'w comp number': 'coidaNumber',
  'compensation number': 'coidaNumber',
  'iod claim number': 'iodClaimNumber',
  'iod claim': 'iodClaimNumber',
  'iod number': 'iodClaimNumber',
  'iod no': 'iodClaimNumber',
  'claim number': 'iodClaimNumber',
  'employer': 'employerName',
  'employer name': 'employerName',
  'employer_name': 'employerName',
  'company': 'employerName',
  'company name': 'employerName',
  'employer contact': 'employerContact',
  'employer phone': 'employerContact',
  'employer tel': 'employerContact',
  'employer_contact': 'employerContact',
  'date of incident': 'dateOfIncident',
  'date of injury': 'dateOfIncident',
  'incident date': 'dateOfIncident',
  'injury date': 'dateOfIncident',
  'date_of_incident': 'dateOfIncident',
  'referring doctor': 'referringDoctor',
  'ref doctor': 'referringDoctor',
  'doctor': 'referringDoctor',
  'referring': 'referringDoctor',
  'surgeon': 'referringDoctor',
  'name (from doctor surname)': 'referringDoctor',
  'ward': 'ward',
  'theatre': 'ward',
  'location': 'ward',
  'hospital': 'hospital',
  'facility': 'hospital',
  'hospital service provider': 'hospital',
  'service provider': 'hospital',
  'hospital name': 'hospital',
  'date of procedure': 'dateOfProcedure',
  'procedure date': 'dateOfProcedure',
  'date_of_procedure': 'dateOfProcedure',
  'scheduled date': 'dateOfProcedure',
  'appointment date': 'dateOfProcedure',
  'date': 'dateOfProcedure',
  'estimated start datetime': 'estimatedStartDateTime',
  'estimated end datetime': 'estimatedEndDateTime',
  'actual start datetime': 'actualStartDateTime',
  'actual end datetime': 'actualEndDateTime',
  'case type': 'caseType',
  'case comments': 'caseComments',
  'radiographer comments': 'radiographerComments',
  'form type': 'formType',
  'type': 'formType',
  'form': 'formType',
  'case status medical aid': 'formType',
  'case status wca': 'formType',
};

const normalizeHeader = (header: string): string => {
  return header.toLowerCase().trim().replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ');
};

const mapColumnToField = (header: string): keyof WorklistPatient | null => {
  const normalized = normalizeHeader(header);
  return COLUMN_MAP[normalized] || null;
};

const determineFormType = (patient: Partial<WorklistPatient>): 'medical-aid' | 'coida' | 'unknown' => {
  if (patient.coidaNumber || patient.iodClaimNumber || patient.employerName || patient.dateOfIncident) {
    return 'coida';
  }
  if (patient.medicalAidName || patient.membershipNumber) {
    return 'medical-aid';
  }
  const raw = patient.rawData || {};
  for (const [key, value] of Object.entries(raw)) {
    const lower = key.toLowerCase();
    if (lower.includes('coida') || lower.includes('iod') || lower.includes('compensation')) {
      if (value && value.trim()) return 'coida';
    }
  }
  return 'unknown';
};

const splitFullName = (fullName: string): { firstName: string; lastName: string } => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], lastName: parts[1] };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
};

const parseExcelDate = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
  }
  return String(value).trim();
};

export const parseSpreadsheetData = (data: ArrayBuffer): WorklistPatient[] => {
  try {
    console.log('[Worklist] Parsing spreadsheet data, size:', data.byteLength);
    const workbook = XLSX.read(data, { type: 'array' });
    console.log('[Worklist] Sheets found:', workbook.SheetNames);

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length < 2) {
      console.log('[Worklist] Not enough rows in spreadsheet');
      return [];
    }

    const headers = (rows[0] as any[]).map(h => String(h || '').trim());
    console.log('[Worklist] Headers found:', headers);

    const columnMapping: Record<number, keyof WorklistPatient> = {};
    headers.forEach((header, index) => {
      const field = mapColumnToField(header);
      if (field) {
        columnMapping[index] = field;
        console.log(`[Worklist] Mapped column "${header}" -> ${field}`);
      } else {
        console.log(`[Worklist] Unmapped column: "${header}"`);
      }
    });

    const patients: WorklistPatient[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as any[];
      if (!row || row.every(cell => !cell && cell !== 0)) continue;

      const rawData: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (header && row[index] != null) {
          rawData[header] = String(row[index]);
        }
      });

      const patient: Partial<WorklistPatient> = {
        id: `worklist_${i}_${Date.now()}`,
        patientFirstName: '',
        patientLastName: '',
        patientTitle: '',
        idNumber: '',
        dateOfBirth: '',
        contactNumber: '',
        email: '',
        patientAddress: '',
        mainMemberTitle: '',
        mainMemberFirstName: '',
        mainMemberLastName: '',
        mainMemberIdNumber: '',
        mainMemberEmail: '',
        mainMemberPhone: '',
        medicalAidName: '',
        medicalAidPlan: '',
        membershipNumber: '',
        dependantCode: '',
        procedure: '',
        icd10Code: '',
        doctorPracticeNumber: '',
        coidaNumber: '',
        iodClaimNumber: '',
        employerName: '',
        employerContact: '',
        dateOfIncident: '',
        referringDoctor: '',
        ward: '',
        hospital: '',
        dateOfProcedure: '',
        estimatedStartDateTime: '',
        estimatedEndDateTime: '',
        actualStartDateTime: '',
        actualEndDateTime: '',
        caseType: '',
        caseComments: '',
        radiographerComments: '',
        formType: 'unknown',
        rawData,
      };

      for (const [indexStr, field] of Object.entries(columnMapping)) {
        const idx = parseInt(indexStr);
        const cellValue = row[idx];
        if (cellValue == null) continue;

        if (field === 'dateOfBirth' || field === 'dateOfProcedure' || field === 'dateOfIncident') {
          (patient as any)[field] = parseExcelDate(cellValue);
        } else if (field === 'formType') {
          const val = String(cellValue).toLowerCase().trim();
          if (val.includes('coida') || val.includes('compensation') || val.includes('iod')) {
            patient.formType = 'coida';
          } else if (val.includes('medical') || val.includes('med aid')) {
            patient.formType = 'medical-aid';
          }
        } else {
          (patient as any)[field] = String(cellValue).trim();
        }
      }

      if (patient.patientFirstName && !patient.patientLastName) {
        const { firstName, lastName } = splitFullName(patient.patientFirstName);
        patient.patientFirstName = firstName;
        patient.patientLastName = lastName;
      }

      if (patient.formType === 'unknown') {
        patient.formType = determineFormType(patient);
      }

      const hasData = patient.patientFirstName || patient.patientLastName || patient.idNumber;
      if (hasData) {
        patients.push(patient as WorklistPatient);
      }
    }

    console.log(`[Worklist] Parsed ${patients.length} patients from spreadsheet`);
    return patients;
  } catch (error) {
    console.error('[Worklist] Error parsing spreadsheet:', error);
    throw error;
  }
};

export const parseCSVData = (csvText: string): WorklistPatient[] => {
  try {
    console.log('[Worklist] Parsing CSV data, length:', csvText.length);
    const workbook = XLSX.read(csvText, { type: 'string' });
    const sheetName = workbook.SheetNames[0];
    const _sheet = workbook.Sheets[sheetName];
    const arrayBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    return parseSpreadsheetData(arrayBuffer);
  } catch (error) {
    console.error('[Worklist] Error parsing CSV:', error);
    throw error;
  }
};

const convertOneDriveUrl = (shareUrl: string): string => {
  const base64 = btoa(shareUrl)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `https://api.onedrive.com/v1.0/shares/u!${base64}/root/content`;
};

const convertGoogleSheetsUrl = (url: string): string => {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    const sheetId = match[1];
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
  }
  return url;
};

export const parseAirtableUrl = (url: string): { baseId: string; tableId: string; viewId?: string } | null => {
  const match = url.match(/airtable\.com\/(app[a-zA-Z0-9]+)\/(tbl[a-zA-Z0-9]+)(?:\/(viw[a-zA-Z0-9]+))?/);
  if (match) {
    return {
      baseId: match[1],
      tableId: match[2],
      viewId: match[3] || undefined,
    };
  }
  return null;
};

const normalizeAirtableFieldName = (fieldName: string): keyof WorklistPatient | null => {
  const normalized = normalizeHeader(fieldName);
  return COLUMN_MAP[normalized] || null;
};

const fetchAirtableWorklist = async (url: string): Promise<WorklistPatient[]> => {
  const parsed = parseAirtableUrl(url);
  if (!parsed) {
    console.error('[Worklist] Failed to parse Airtable URL:', url);
    throw new Error('Invalid Airtable URL. Expected format: https://airtable.com/appXXX/tblXXX/viwXXX');
  }

  const pat = process.env.EXPO_PUBLIC_AIRTABLE_PAT;
  console.log('[Worklist] PAT available:', !!pat, 'PAT length:', pat?.length ?? 0, 'PAT prefix:', pat?.substring(0, 6) ?? 'N/A');
  if (!pat || pat.trim().length === 0) {
    throw new Error('Airtable Personal Access Token not configured. Please set EXPO_PUBLIC_AIRTABLE_PAT in environment variables.');
  }

  const trimmedPat = pat.trim();
  console.log('[Worklist] Fetching from Airtable - base:', parsed.baseId, 'table:', parsed.tableId, 'view:', parsed.viewId);

  const patients: WorklistPatient[] = [];
  let offset: string | undefined = undefined;

  do {
    let apiUrl = `https://api.airtable.com/v0/${parsed.baseId}/${parsed.tableId}?pageSize=100`;
    if (parsed.viewId) {
      apiUrl += `&view=${parsed.viewId}`;
    }
    if (offset) {
      apiUrl += `&offset=${offset}`;
    }

    console.log('[Worklist] Airtable API request URL:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${trimmedPat}`,
      },
    });
    console.log('[Worklist] Airtable response status:', response.status, response.statusText);

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (_e) {
        errorText = 'Could not read error response body';
      }
      console.error('[Worklist] Airtable API error:', response.status, errorText);
      if (response.status === 401) {
        throw new Error('Airtable authentication failed (401). Your Personal Access Token may have expired or been revoked. Please generate a new PAT at airtable.com/create/tokens and update EXPO_PUBLIC_AIRTABLE_PAT.');
      }
      if (response.status === 403) {
        throw new Error('Airtable access denied (403). Your PAT does not have permission to access this base/table. Check scopes include data.records:read for base ' + parsed.baseId);
      }
      if (response.status === 404) {
        throw new Error('Airtable table not found (404). The base, table, or view ID may have changed. Base: ' + parsed.baseId + ', Table: ' + parsed.tableId);
      }
      if (response.status === 422) {
        throw new Error('Airtable rejected the request (422). The view or table structure may have changed. ' + errorText.substring(0, 300));
      }
      if (response.status === 429) {
        throw new Error('Airtable rate limit reached (429). Please wait a moment and try again.');
      }
      throw new Error(`Airtable error ${response.status}: ${errorText.substring(0, 300)}`);
    }

    let data: any;
    try {
      data = await response.json();
    } catch (jsonErr) {
      console.error('[Worklist] Failed to parse Airtable JSON response:', jsonErr);
      throw new Error('Airtable returned an invalid response. Please try again.');
    }
    console.log('[Worklist] Airtable returned', data.records?.length ?? 0, 'records, offset:', !!data.offset);
    
    if (data.records && data.records.length > 0) {
      const sampleFields = Object.keys(data.records[0].fields || {});
      console.log('[Worklist] Sample record fields:', sampleFields.join(', '));
      console.log('[Worklist] Sample record values:', JSON.stringify(data.records[0].fields).substring(0, 300));
    } else {
      console.warn('[Worklist] Airtable returned 0 records for this page');
    }

    if (data.records && Array.isArray(data.records)) {
      for (let i = 0; i < data.records.length; i++) {
        const record = data.records[i];
        const fields = record.fields || {};

        const rawData: Record<string, string> = {};
        for (const [key, value] of Object.entries(fields)) {
          rawData[key] = String(value ?? '');
        }

        const patient: Partial<WorklistPatient> = {
          airtableRecordId: record.id,
          airtableBaseId: parsed.baseId,
          airtableTableId: parsed.tableId,
          id: `airtable_${record.id || i}_${Date.now()}`,
          patientFirstName: '',
          patientLastName: '',
          patientTitle: '',
          idNumber: '',
          dateOfBirth: '',
          contactNumber: '',
          email: '',
          patientAddress: '',
          mainMemberTitle: '',
          mainMemberFirstName: '',
          mainMemberLastName: '',
          mainMemberIdNumber: '',
          mainMemberEmail: '',
          mainMemberPhone: '',
          medicalAidName: '',
          medicalAidPlan: '',
          membershipNumber: '',
          dependantCode: '',
          procedure: '',
          icd10Code: '',
          doctorPracticeNumber: '',
          coidaNumber: '',
          iodClaimNumber: '',
          employerName: '',
          employerContact: '',
          dateOfIncident: '',
          referringDoctor: '',
          ward: '',
          hospital: '',
          dateOfProcedure: '',
          estimatedStartDateTime: '',
          estimatedEndDateTime: '',
          actualStartDateTime: '',
          actualEndDateTime: '',
          caseType: '',
          caseComments: '',
          radiographerComments: '',
          formType: 'unknown',
          rawData,
        };

        let mappedCount = 0;
        let unmappedFields: string[] = [];
        for (const [fieldName, fieldValue] of Object.entries(fields)) {
          if (fieldValue == null) continue;

          let stringValue = '';
          if (Array.isArray(fieldValue)) {
            stringValue = fieldValue.map(v => {
              if (v == null) return '';
              if (typeof v === 'object') return JSON.stringify(v);
              return String(v);
            }).filter(Boolean).join(', ');
          } else if (typeof fieldValue === 'object' && fieldValue !== null) {
            stringValue = JSON.stringify(fieldValue);
          } else {
            stringValue = String(fieldValue ?? '').trim();
          }

          const mappedField = normalizeAirtableFieldName(fieldName);
          if (mappedField) {
            mappedCount++;
            if (mappedField === 'formType') {
              const val = stringValue.toLowerCase();
              if (val.includes('coida') || val.includes('compensation') || val.includes('iod') || val.includes('wca')) {
                patient.formType = 'coida';
              } else if (val.includes('medical') || val.includes('med aid')) {
                patient.formType = 'medical-aid';
              }
            } else if (mappedField === 'estimatedStartDateTime' || mappedField === 'estimatedEndDateTime' || mappedField === 'actualStartDateTime' || mappedField === 'actualEndDateTime') {
              (patient as any)[mappedField] = stringValue;
              if (mappedField === 'estimatedStartDateTime' && stringValue && !patient.dateOfProcedure) {
                const d = new Date(stringValue);
                if (!isNaN(d.getTime())) {
                  const day = String(d.getDate()).padStart(2, '0');
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const year = d.getFullYear();
                  patient.dateOfProcedure = `${day}/${month}/${year}`;
                }
              }
            } else if (mappedField === 'contactNumber' && patient.contactNumber && patient.contactNumber.length > 0) {
              // skip if already set (prefer cell over home/work)
            } else if (mappedField === 'mainMemberPhone' && patient.mainMemberPhone && patient.mainMemberPhone.length > 0) {
              // skip if already set
            } else {
              (patient as any)[mappedField] = stringValue;
            }
          } else {
            unmappedFields.push(fieldName);
          }
        }
        if (i === 0) {
          console.log('[Worklist] First record: mapped', mappedCount, 'fields, unmapped:', unmappedFields.join(', '));
          console.log('[Worklist] First record patient name:', patient.patientFirstName, patient.patientLastName);
        }

        if (patient.patientFirstName && !patient.patientLastName) {
          const { firstName, lastName } = splitFullName(patient.patientFirstName);
          patient.patientFirstName = firstName;
          patient.patientLastName = lastName;
        }

        if (patient.formType === 'unknown') {
          patient.formType = determineFormType(patient);
        }

        const hasData = patient.patientFirstName || patient.patientLastName || patient.idNumber;
        if (hasData) {
          patients.push(patient as WorklistPatient);
        }
      }
    }

    offset = data.offset;
  } while (offset);

  console.log(`[Worklist] Total Airtable patients fetched: ${patients.length}`);
  return patients;
};

export const isAirtableUrl = (url: string): boolean => {
  return url.includes('airtable.com/');
};

export const fetchWorklist = async (url: string): Promise<WorklistPatient[]> => {
  console.log('[Worklist] Fetching worklist from:', url);

  if (isAirtableUrl(url)) {
    return fetchAirtableWorklist(url);
  }

  let fetchUrl = url;

  if (url.includes('docs.google.com/spreadsheets') || url.includes('sheets.google.com')) {
    fetchUrl = convertGoogleSheetsUrl(url);
    console.log('[Worklist] Converted Google Sheets URL to:', fetchUrl);
  } else if (url.includes('onedrive.live.com') || url.includes('1drv.ms')) {
    fetchUrl = convertOneDriveUrl(url);
    console.log('[Worklist] Converted OneDrive URL to:', fetchUrl);
  }

  const response = await fetch(fetchUrl, {
    headers: {
      'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv, */*',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch worklist: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  console.log('[Worklist] Response content type:', contentType);

  if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
    const text = await response.text();
    return parseCSVData(text);
  }

  const arrayBuffer = await response.arrayBuffer();
  return parseSpreadsheetData(arrayBuffer);
};
