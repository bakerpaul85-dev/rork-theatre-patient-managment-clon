import * as XLSX from 'xlsx';
import { FormData } from '@/contexts/FormsContext';
import { findRadiographerByEmail, RADIOGRAPHERS } from '@/constants/radiographers';

const safeString = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

export const generateClaimSpreadsheet = (form: FormData): string => {
  const firstName = safeString(form.patientFirstName);
  const lastName = safeString(form.patientLastName);
  const patientInitials = firstName ? firstName.charAt(0).toUpperCase() : '';
  const patientTitle = safeString(form.patientTitle);
  const idNumber = safeString(form.idNumber);
  const dateOfBirth = safeString(form.dateOfBirth).replace(/\//g, '').replace(/-/g, '');
  
  const coidaForm = form as any;
  const practiceNumber = safeString(coidaForm.practiceNumber || '3804658');
  const practiceName = safeString(coidaForm.practiceName || 'SWARTZBERG J');
  const accountNumber = dateOfBirth + idNumber.slice(-4);
  const serviceDate = safeString(coidaForm.dateOfProcedure || form.date).replace(/-/g, '').replace(/\//g, '');
  const proceduresList = Array.isArray(form.procedure) ? form.procedure : [safeString(form.procedure)];
  const icd10Code = safeString(form.icd10Code);
  const contactNumber = safeString(coidaForm.contactNumber || '');
  const email = safeString(coidaForm.email || '');
  const coidaMemberNumber = safeString(coidaForm.coidaMemberNumber || '');
  const patientIodClaimNumber = safeString(coidaForm.patientIodClaimNumber || '');
  const claimNumber = patientIodClaimNumber ? `X/${patientIodClaimNumber}/25/EMP` : '';
  const employerName = safeString(coidaForm.employerName || '');
  const employerContact = safeString(coidaForm.employerContact || '');
  const dateOfIncident = safeString(coidaForm.dateOfIncident || '');
  
  const radiographerName = safeString(coidaForm.radiographerName || '');
  const radiographerEmail = safeString(coidaForm.radiographerEmail || '');
  const radiographer = radiographerEmail
    ? findRadiographerByEmail(radiographerEmail)
    : RADIOGRAPHERS.find(r => r.name.toLowerCase() === radiographerName.toLowerCase());
  const radiographerPrefix = radiographer?.prefix || '';
  const radiographerDisplayName = radiographer?.name || radiographerName;

  const timeInTheatre = safeString(coidaForm.timeInTheatre || '');
  const timeOutTheatre = safeString(coidaForm.timeOutTheatre || '');
  const fluoroscopyTimeSeconds = parseInt(safeString(coidaForm.fluoroscopyTime || '0')) || 0;
  const employeeNo = safeString(coidaForm.employeeNumber || '');
  const dateOfInjury = safeString(coidaForm.dateOfIncident || '').replace(/-/g, '').replace(/\//g, '');
  
  const genderFromId = idNumber.length === 13 ? (parseInt(idNumber.substring(6, 10)) >= 5000 ? 'M' : 'F') : '';
  const patientGender = safeString(coidaForm.patientGender || genderFromId);
  
  const parseTime = (timeStr: string): number => {
    const match = timeStr.match(/(\d+)H(\d+)/);
    if (match) {
      return parseInt(match[1]) * 60 + parseInt(match[2]);
    }
    return 0;
  };
  
  const formatTimeAsHHMM = (timeStr: string): string => {
    const match = timeStr.match(/(\d+)H(\d+)/);
    if (match) {
      const hours = match[1].padStart(2, '0');
      const minutes = match[2].padStart(2, '0');
      return hours + minutes;
    }
    return '';
  };
  
  const timeInMinutes = parseTime(timeInTheatre);
  const timeOutMinutes = parseTime(timeOutTheatre);
  const totalTheatreTimeMinutes = timeOutMinutes - timeInMinutes;
  const fluoroscopyTimeMinutes = Math.round(fluoroscopyTimeSeconds / 60);
  
  const halfHours = Math.ceil(fluoroscopyTimeMinutes / 30);
  
  const rows: any[] = [];
  
  proceduresList.forEach((procedureItem: string) => {
    const procMatch = procedureItem.match(/^(\d+)\s+(.+)$/);
    const tariffCode = procMatch ? procMatch[1] : '';
    const description = procMatch ? procMatch[2] : procedureItem;
    
    let quantity = 1;
    let cost = 0;
    
    if (tariffCode === '00150' || tariffCode === '00155' || tariffCode === '01040') {
      quantity = halfHours;
      if (tariffCode === '00150') cost = 447.99 * halfHours;
      if (tariffCode === '00155') cost = 1240.97 * halfHours;
      if (tariffCode === '01040') cost = 350.00 * halfHours;
    } else {
      quantity = 1;
      if (tariffCode === '00140') cost = 447.99;
    }
    
    rows.push({
      'ClaimNumber (WCA)': claimNumber,
      'PatientSurname': lastName,
      'Patient Initials': patientInitials,
      'PatientName': firstName,
      'PracticeNumber': practiceNumber,
      'SysIDNumer': tariffCode,
      'PatientNumber (Account No#)': accountNumber,
      'MedicalItemType (Type of service)': 'Radiologist',
      'DateOfService': serviceDate,
      'Quantity (Time in Minutes)': quantity,
      'Cost (Service Amount)': cost > 0 ? cost.toFixed(2) : '',
      'Discount': '',
      'Description (Of Treatment)': description,
      'TarrifCode': tariffCode,
      'Duty': '',
      'Mod1': '',
      'Mod2': '',
      'Mod3': '',
      'Mod4': '',
      'InvoiceNumber': tariffCode,
      'PracticeName': practiceName,
      'ReferringPractice': '',
      'NappiCode': '',
      'ReferredTo': '',
      'DateOfBirth': dateOfBirth,
      'TransactionNumber': serviceDate,
      'HospitalIndicator': '',
      'PreAuthNumber': '',
      'ResubmissionFlag': '',
      'ICD10Code': icd10Code,
      'AttendingPracticeNo': '',
      'DosageDuration': fluoroscopyTimeSeconds > 0 ? fluoroscopyTimeSeconds.toString() : '',
      'ToothNo': '',
      'PatientGender': patientGender,
      'AttendingDoctorHSPA': '',
      'CPC': '',
      'TarrifType': '',
      'CPTCode': tariffCode,
      'Text': description,
      'PlaceOfService': '',
      'SPBatchNo': '',
      'QEDIFundNo': coidaMemberNumber,
      'ReferringHSPCA': '',
      'TrackingNo': '',
      'OptomReadingAdds': '',
      'OptomLens': '',
      'OptomDensity': '',
      'BHFPracDesc': '',
      'Employer': employerName,
      'EmployeeNo': employeeNo,
      'DateOfInjury': dateOfInjury,
      'IODReference': patientIodClaimNumber,
      'SEP': '',
      'DispenseFee': '',
      'ServiceTime': fluoroscopyTimeMinutes > 0 ? fluoroscopyTimeMinutes.toString() : '',
      '60': '',
      '61': '',
      '62': '',
      '63': '',
      'TreatmentDateFrom': serviceDate,
      'TreatmentTime (HHMM)': formatTimeAsHHMM(timeInTheatre),
      'TreatmentDateto': serviceDate,
      'TreatmentTime': formatTimeAsHHMM(timeOutTheatre),
      'dateAdmission': '',
      'TimeAdmitted': formatTimeAsHHMM(timeInTheatre),
      'datrDischarge': '',
      'TimeDischarged': formatTimeAsHHMM(timeOutTheatre),
      'SurgeonBHF': '',
      'AnaesthetistBHF': '',
      'AssistantBHF': '',
      'HospTariffType': '',
      'PerDiem': '',
      'LengthOfStay': totalTheatreTimeMinutes > 0 ? totalTheatreTimeMinutes.toString() : '',
      'TypeOfFund': 'COIDA',
      'RadiogrpaherName': radiographerDisplayName,
      'RadiogrpaherPrefix': radiographerPrefix,
    });
  });
  
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Claims');
  
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
  
  return wbout;
};
