import { FormData, PhotoMetadata } from '@/contexts/FormsContext';

const FIELD_SEPARATOR = '|';
const COMPONENT_SEPARATOR = '^';
const REPETITION_SEPARATOR = '~';
const ESCAPE_CHARACTER = '\\';
const SUBCOMPONENT_SEPARATOR = '&';

const formatHL7DateTime = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

const formatHL7Date = (dateString: string): string => {
  try {
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}${month.padStart(2, '0')}${day.padStart(2, '0')}`;
    }
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    }
  } catch (e) {
    console.error('Error formatting date:', e);
  }
  return '';
};

const escapeHL7 = (text: any): string => {
  if (!text || typeof text !== 'string') return '';
  return String(text)
    .replace(/\\/g, '\\E\\')
    .replace(/\|/g, '\\F\\')
    .replace(/\^/g, '\\S\\')
    .replace(/&/g, '\\T\\')
    .replace(/~/g, '\\R\\')
    .replace(/\r/g, '\\X0D\\')
    .replace(/\n/g, '\\X0A\\');
};

const generateMSHSegment = (messageControlId: string, timestamp: Date): string => {
  const dateTime = formatHL7DateTime(timestamp);
  return `MSH${FIELD_SEPARATOR}${COMPONENT_SEPARATOR}${REPETITION_SEPARATOR}${ESCAPE_CHARACTER}${SUBCOMPONENT_SEPARATOR}${FIELD_SEPARATOR}MedicalFormsApp${FIELD_SEPARATOR}Radiography${FIELD_SEPARATOR}MedicalAid${FIELD_SEPARATOR}${FIELD_SEPARATOR}${dateTime}${FIELD_SEPARATOR}${FIELD_SEPARATOR}ORU${COMPONENT_SEPARATOR}R01${FIELD_SEPARATOR}${messageControlId}${FIELD_SEPARATOR}P${FIELD_SEPARATOR}2.5`;
};

const generatePIDSegment = (form: FormData): string => {
  const patientId = escapeHL7(form.idNumber || '');
  const patientName = `${escapeHL7(form.patientLastName || '')}${COMPONENT_SEPARATOR}${escapeHL7(form.patientFirstName || '')}${COMPONENT_SEPARATOR}${COMPONENT_SEPARATOR}${escapeHL7(form.patientTitle || '')}`;
  const dateOfBirth = formatHL7Date(form.dateOfBirth || '');
  
  let sex = '';
  const title = (form.patientTitle || '').toLowerCase();
  if (title === 'mr') sex = 'M';
  else if (title === 'mrs' || title === 'miss' || title === 'ms') sex = 'F';
  
  const address = '';
  const phoneHome = escapeHL7(form.contactNumber || '');
  const email = escapeHL7(form.email || '');
  
  return `PID${FIELD_SEPARATOR}1${FIELD_SEPARATOR}${FIELD_SEPARATOR}${patientId}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${patientName}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${dateOfBirth}${FIELD_SEPARATOR}${sex}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${address}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${phoneHome}${COMPONENT_SEPARATOR}${COMPONENT_SEPARATOR}${COMPONENT_SEPARATOR}${email}`;
};

const generatePV1Segment = (form: FormData): string => {
  const patientClass = 'O';
  const admissionDateTime = formatHL7DateTime(new Date(form.date));
  
  return `PV1${FIELD_SEPARATOR}1${FIELD_SEPARATOR}${patientClass}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${admissionDateTime}`;
};

const generateIN1Segment = (form: FormData): string => {
  const setId = '1';
  const insurancePlanId = escapeHL7(form.membershipNumber || '');
  const insuranceCompanyName = escapeHL7(form.medicalAidName || '');
  
  const groupName = `${escapeHL7(form.mainMemberLastName || '')}${COMPONENT_SEPARATOR}${escapeHL7(form.mainMemberFirstName || '')}${COMPONENT_SEPARATOR}${COMPONENT_SEPARATOR}${escapeHL7(form.mainMemberTitle || '')}`;
  const groupId = escapeHL7(form.mainMemberIdNumber || '');
  
  const dependantCode = escapeHL7(form.dependantCode || '');
  
  return `IN1${FIELD_SEPARATOR}${setId}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${insurancePlanId}${FIELD_SEPARATOR}${insuranceCompanyName}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${groupId}${FIELD_SEPARATOR}${groupName}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${dependantCode}`;
};

const generateNK1Segment = (form: FormData): string | null => {
  if (!form.nextOfKinName) return null;
  
  const setId = '1';
  const name = escapeHL7(form.nextOfKinName || '');
  const relationship = 'C';
  const phoneNumber = escapeHL7(form.nextOfKinContactNumber || '');
  
  return `NK1${FIELD_SEPARATOR}${setId}${FIELD_SEPARATOR}${name}${FIELD_SEPARATOR}${relationship}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${phoneNumber}`;
};

const generateOBRSegment = (form: FormData, setId: number): string => {
  const orderControlId = `${form.id}_${setId}`;
  const universalServiceId = `RAD${COMPONENT_SEPARATOR}${escapeHL7(form.procedure || '')}${COMPONENT_SEPARATOR}Radiology`;
  const observationDateTime = formatHL7DateTime(new Date(form.date || new Date()));
  const operatorName = escapeHL7(form.radiographerName || '');
  
  return `OBR${FIELD_SEPARATOR}${setId}${FIELD_SEPARATOR}${orderControlId}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${universalServiceId}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${observationDateTime}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${operatorName}`;
};

const generateOBXSegment = (setId: number, observationType: string, value: string, units?: string): string => {
  const valueType = 'TX';
  const observationId = `${observationType}${COMPONENT_SEPARATOR}${observationType}${COMPONENT_SEPARATOR}L`;
  const escapedValue = escapeHL7(value);
  const unitsField = units ? escapeHL7(units) : '';
  const observationResultStatus = 'F';
  
  return `OBX${FIELD_SEPARATOR}${setId}${FIELD_SEPARATOR}${valueType}${FIELD_SEPARATOR}${observationId}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${escapedValue}${FIELD_SEPARATOR}${unitsField}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${FIELD_SEPARATOR}${observationResultStatus}`;
};

const generateNTESegment = (setId: number, comment: string): string => {
  const escapedComment = escapeHL7(comment);
  return `NTE${FIELD_SEPARATOR}${setId}${FIELD_SEPARATOR}L${FIELD_SEPARATOR}${escapedComment}`;
};

const generatePhotoMetadataComment = (photoType: string, metadata?: PhotoMetadata): string | null => {
  if (!metadata) return null;
  
  const timestamp = new Date(metadata.timestamp).toLocaleString();
  let comment = `${photoType} taken at ${timestamp}`;
  
  if (metadata.latitude && metadata.longitude) {
    comment += ` at coordinates ${metadata.latitude.toFixed(6)}, ${metadata.longitude.toFixed(6)}`;
    comment += ` (Google Maps: https://www.google.com/maps?q=${metadata.latitude},${metadata.longitude})`;
  }
  
  return comment;
};

export const generateHL7Message = (form: FormData): string => {
  const segments: string[] = [];
  const messageControlId = `MSG${Date.now()}`;
  const timestamp = new Date();
  
  segments.push(generateMSHSegment(messageControlId, timestamp));
  
  segments.push(generatePIDSegment(form));
  
  segments.push(generatePV1Segment(form));
  
  segments.push(generateIN1Segment(form));
  
  const nk1 = generateNK1Segment(form);
  if (nk1) segments.push(nk1);
  
  segments.push(generateOBRSegment(form, 1));
  
  let obxCounter = 1;
  
  if (form.procedure) {
    segments.push(generateOBXSegment(obxCounter++, 'PROCEDURE', form.procedure || ''));
  }
  
  if (form.icd10Code) {
    segments.push(generateOBXSegment(obxCounter++, 'ICD10', form.icd10Code || ''));
  }
  
  if (form.timeCArmTakenIn) {
    segments.push(generateOBXSegment(obxCounter++, 'C_ARM_IN_TIME', form.timeCArmTakenIn || ''));
  }
  
  if (form.timeCArmTakenOut) {
    segments.push(generateOBXSegment(obxCounter++, 'C_ARM_OUT_TIME', form.timeCArmTakenOut || ''));
  }
  
  if (form.screeningTimeText) {
    segments.push(generateOBXSegment(obxCounter++, 'SCREENING_TIME', form.screeningTimeText || '', 'seconds'));
  }
  
  if (form.reasonForTimeDiscrepancy) {
    segments.push(generateOBXSegment(obxCounter++, 'TIME_DISCREPANCY_REASON', form.reasonForTimeDiscrepancy || ''));
  }
  
  segments.push(generateOBXSegment(obxCounter++, 'RADIOGRAPHER', form.radiographerName || ''));
  
  if (form.radiographerSignatureTimestamp) {
    const signatureDateTime = formatHL7DateTime(new Date(form.radiographerSignatureTimestamp));
    segments.push(generateOBXSegment(obxCounter++, 'SIGNATURE_TIMESTAMP', signatureDateTime));
  }
  
  if (form.radiographerSignatureLocation) {
    segments.push(generateOBXSegment(obxCounter++, 'SIGNATURE_LOCATION', form.radiographerSignatureLocation || ''));
  }
  
  if (form.submissionLatitude && form.submissionLongitude) {
    const location = `${form.submissionLatitude.toFixed(6)}, ${form.submissionLongitude.toFixed(6)}`;
    segments.push(generateOBXSegment(obxCounter++, 'SUBMISSION_LOCATION', location));
    
    const mapsUrl = `https://www.google.com/maps?q=${form.submissionLatitude},${form.submissionLongitude}`;
    segments.push(generateOBXSegment(obxCounter++, 'SUBMISSION_MAPS_URL', mapsUrl));
  }
  
  let nteCounter = 1;
  
  const hospitalStickerComment = generatePhotoMetadataComment('Hospital Sticker Photo', form.hospitalStickerPhotoMetadata);
  if (hospitalStickerComment) {
    segments.push(generateNTESegment(nteCounter++, hospitalStickerComment));
  }
  
  const timeInComment = generatePhotoMetadataComment('Time In Theatre Photo', form.timeInTheatrePhotoMetadata);
  if (timeInComment) {
    segments.push(generateNTESegment(nteCounter++, timeInComment));
  }
  
  const timeOutComment = generatePhotoMetadataComment('Time Out Theatre Photo', form.timeOutTheatrePhotoMetadata);
  if (timeOutComment) {
    segments.push(generateNTESegment(nteCounter++, timeOutComment));
  }
  
  segments.push(generateOBXSegment(obxCounter++, 'FORM_CREATED_AT', formatHL7DateTime(new Date(form.createdAt))));
  segments.push(generateOBXSegment(obxCounter++, 'FORM_SUBMITTED_AT', formatHL7DateTime(new Date(form.updatedAt))));
  
  return segments.join('\r');
};

export const generateHL7File = (form: FormData): { filename: string; content: string } => {
  const timestamp = new Date();
  const year = timestamp.getFullYear();
  const month = String(timestamp.getMonth() + 1).padStart(2, '0');
  const day = String(timestamp.getDate()).padStart(2, '0');
  const hours = String(timestamp.getHours()).padStart(2, '0');
  const minutes = String(timestamp.getMinutes()).padStart(2, '0');
  const seconds = String(timestamp.getSeconds()).padStart(2, '0');
  
  const patientName = `${form.patientFirstName || 'Unknown'}_${form.patientLastName || 'Patient'}`.replace(/\s+/g, '_');
  const filename = `HL7_${patientName}_${year}${month}${day}_${hours}${minutes}${seconds}.hl7`;
  
  const content = generateHL7Message(form);
  
  return { filename, content };
};
