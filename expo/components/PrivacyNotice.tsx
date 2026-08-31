import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { ShieldCheck, X } from 'lucide-react-native';

interface PrivacyNoticeProps {
  visible: boolean;
  onClose: () => void;
}

const NOTICE_SECTIONS: { heading: string; body: string }[] = [
  {
    heading: '1. Who is responsible for your information',
    body: 'This app is operated by In Touch Med Tech on behalf of the radiography practice that uses it (the "Responsible Party"). The radiographer capturing your details is responsible for the personal information recorded about you, in terms of the Protection of Personal Information Act 4 of 2013 (POPIA).',
  },
  {
    heading: '2. What information is collected',
    body: 'Your name, surname and identity number, hospital and admission details, clinical and procedure information (including theatre times), medical scheme or COIDA claim details, employer information where relevant, and photographs of documents such as hospital stickers, referral letters, theatre clocks and your ID document. Photo location (GPS) data is also recorded for verification purposes.',
  },
  {
    heading: '3. Why your information is processed',
    body: 'Your information is processed only to prepare and submit your radiology claim to your medical scheme, or to submit your COIDA (Compensation for Occupational Injuries and Diseases Act) claim, and for lawful billing and record-keeping. It is not used for marketing or any other unrelated purpose.',
  },
  {
    heading: '4. Health information (special personal information)',
    body: 'Health information is special personal information under POPIA. It is processed only with your informed consent, or where otherwise permitted by section 32 of POPIA (for example, for the proper treatment and care of the patient, or as required by law).',
  },
  {
    heading: '5. Who receives your information',
    body: 'Your information is shared only with the parties necessary to process your claim: your medical scheme, the COIDA claims administrator, the referring medical practitioner, and the billing practice. Information is sent by secure email or direct system integration, and is never sold or shared for unrelated purposes.',
  },
  {
    heading: '6. Automated processing of photographs (AI)',
    body: 'Photographs you capture (hospital stickers, referral letters, theatre clocks) may be analysed by an automated third-party artificial intelligence service to pre-fill form fields and reduce manual typing. Images are transmitted over an encrypted connection for this purpose only. A radiographer verifies every auto-filled field before the form is submitted.',
  },
  {
    heading: '7. How your information is kept secure',
    body: 'Access to the app is restricted to authorised radiographers using individual accounts. Data is stored securely, photographs remain on the practice device until submitted, and all transmissions are encrypted. Appropriate technical and organisational measures are applied in accordance with section 19 of POPIA.',
  },
  {
    heading: '8. How long your information is kept',
    body: 'Your information is retained only for as long as necessary to process your claim and to meet legal record-keeping obligations (which for health and billing records may require retention of several years). Thereafter it is de-identified or securely destroyed.',
  },
  {
    heading: '9. Your rights',
    body: 'You have the right to be notified that your information is being collected, to request access to or correction of your personal information, to object to its processing, to withdraw consent, and to lodge a complaint with the Information Regulator of South Africa (inforeg@justice.gov.za).',
  },
  {
    heading: '10. Contact the Information Officer',
    body: 'For any privacy question, access request or objection, contact the practice\'s Information Officer, or the app operator: paul@intouchmedtech.co.za.',
  },
];

/**
 * POPIA privacy notice modal. Presented from both patient forms so that
 * patients / radiographers can review how personal information is processed
 * before consent is captured.
 */
export default function PrivacyNotice({ visible, onClose }: PrivacyNoticeProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <ShieldCheck size={22} color="#00A3A3" />
            <Text style={styles.headerTitle}>Privacy Notice (POPIA)</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityLabel="Close privacy notice">
            <X size={22} color="#333333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          <Text style={styles.intro}>
            Protection of Personal Information Act 4 of 2013 — how your personal
            and health information is collected, used and protected.
          </Text>

          {NOTICE_SECTIONS.map((section) => (
            <View key={section.heading} style={styles.section}>
              <Text style={styles.sectionHeading}>{section.heading}</Text>
              <Text style={styles.sectionBody}>{section.body}</Text>
            </View>
          ))}

          <Text style={styles.footer}>
            By capturing patient information on this form, the radiographer confirms
            that the patient (or their authorised representative) has been informed
            of this notice and has given consent as required by POPIA.
          </Text>
        </ScrollView>

        <View style={styles.footerBar}>
          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  intro: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555555',
    marginBottom: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#006670',
    marginBottom: 6,
  },
  sectionBody: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#333333',
  },
  footer: {
    fontSize: 13,
    lineHeight: 19,
    color: '#555555',
    fontStyle: 'italic',
    marginTop: 8,
  },
  footerBar: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  doneButton: {
    backgroundColor: '#00A3A3',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
