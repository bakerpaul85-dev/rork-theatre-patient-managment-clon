export type CaseStatus =
  | 'case_loaded'
  | 'case_started'
  | 'case_ended'
  | 'incomplete_info'
  | 'complete_info'
  | 'billed';

export interface CaseStatusConfig {
  key: CaseStatus;
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  icon: string;
  order: number;
}

export const CASE_STATUSES: CaseStatusConfig[] = [
  { key: 'case_loaded', label: 'Case Loaded', shortLabel: 'Loaded', color: '#6366F1', bgColor: '#EEF2FF', icon: 'download', order: 0 },
  { key: 'case_started', label: 'Case Started', shortLabel: 'Started', color: '#0EA5E9', bgColor: '#E0F2FE', icon: 'play', order: 1 },
  { key: 'case_ended', label: 'Case Ended', shortLabel: 'Ended', color: '#F59E0B', bgColor: '#FEF3C7', icon: 'square', order: 2 },
  { key: 'incomplete_info', label: 'Incomplete Information', shortLabel: 'Incomplete', color: '#EF4444', bgColor: '#FEE2E2', icon: 'alert-circle', order: 3 },
  { key: 'complete_info', label: 'Complete Information', shortLabel: 'Complete', color: '#10B981', bgColor: '#D1FAE5', icon: 'check-circle', order: 4 },
  { key: 'billed', label: 'Billed', shortLabel: 'Billed', color: '#059669', bgColor: '#ECFDF5', icon: 'receipt', order: 5 },
];

export const getCaseStatusConfig = (status?: CaseStatus | null): CaseStatusConfig => {
  if (!status) return CASE_STATUSES[0];
  return CASE_STATUSES.find(s => s.key === status) ?? CASE_STATUSES[0];
};

export const getNextStatus = (current?: CaseStatus | null): CaseStatus | null => {
  if (!current) return 'case_loaded';
  const currentConfig = CASE_STATUSES.find(s => s.key === current);
  if (!currentConfig) return 'case_loaded';
  const nextOrder = currentConfig.order + 1;
  const next = CASE_STATUSES.find(s => s.order === nextOrder);
  return next?.key ?? null;
};
