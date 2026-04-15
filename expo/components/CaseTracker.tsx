import React, { useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import {
  Download,
  Play,
  Square,
  AlertCircle,
  CheckCircle2,
  Receipt,
  ChevronRight,
} from 'lucide-react-native';
import { CaseStatus, CASE_STATUSES, getCaseStatusConfig } from '@/constants/caseStatus';

interface CaseTrackerProps {
  currentStatus: CaseStatus;
  onStatusChange: (status: CaseStatus) => void;
  compact?: boolean;
  disabled?: boolean;
}

const STATUS_ICONS: Record<CaseStatus, typeof Download> = {
  case_loaded: Download,
  case_started: Play,
  case_ended: Square,
  incomplete_info: AlertCircle,
  complete_info: CheckCircle2,
  billed: Receipt,
};

function CaseTracker({ currentStatus, onStatusChange, compact = false, disabled = false }: CaseTrackerProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const currentConfig = getCaseStatusConfig(currentStatus);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const handleStatusPress = useCallback((status: CaseStatus) => {
    if (disabled) return;
    onStatusChange(status);
  }, [disabled, onStatusChange]);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={[styles.compactBadge, { backgroundColor: currentConfig.bgColor }]}>
          {React.createElement(STATUS_ICONS[currentStatus] || Download, {
            size: 12,
            color: currentConfig.color,
          })}
          <Text style={[styles.compactBadgeText, { color: currentConfig.color }]}>
            {currentConfig.shortLabel}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Case Progress</Text>

      <View style={styles.progressTrack}>
        {CASE_STATUSES.map((statusConfig, index) => {
          const isActive = statusConfig.key === currentStatus;
          const isPast = statusConfig.order < currentConfig.order;
          const isFuture = statusConfig.order > currentConfig.order;
          const IconComponent = STATUS_ICONS[statusConfig.key] || Download;

          return (
            <View key={statusConfig.key} style={styles.stepContainer}>
              <View style={styles.stepRow}>
                {index > 0 && (
                  <View
                    style={[
                      styles.connector,
                      isPast && { backgroundColor: statusConfig.color },
                      isActive && { backgroundColor: statusConfig.color },
                      isFuture && { backgroundColor: '#E5E7EB' },
                    ]}
                  />
                )}

                <TouchableOpacity
                  onPress={() => handleStatusPress(statusConfig.key)}
                  disabled={disabled}
                  activeOpacity={0.7}
                  testID={`case-status-${statusConfig.key}`}
                >
                  <Animated.View
                    style={[
                      styles.stepDot,
                      {
                        backgroundColor: isPast || isActive ? statusConfig.color : '#E5E7EB',
                        borderColor: isPast || isActive ? statusConfig.color : '#D1D5DB',
                      },
                      isActive && { transform: [{ scale: pulseAnim }] },
                    ]}
                  >
                    <IconComponent
                      size={14}
                      color={isPast || isActive ? '#FFFFFF' : '#9CA3AF'}
                    />
                  </Animated.View>
                </TouchableOpacity>
              </View>

              <Text
                style={[
                  styles.stepLabel,
                  isActive && { color: statusConfig.color, fontWeight: '700' as const },
                  isPast && { color: '#6B7280' },
                  isFuture && { color: '#D1D5DB' },
                ]}
                numberOfLines={2}
              >
                {statusConfig.shortLabel}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={[styles.currentStatusBar, { backgroundColor: currentConfig.bgColor, borderColor: currentConfig.color + '30' }]}>
        {React.createElement(STATUS_ICONS[currentStatus] || Download, {
          size: 18,
          color: currentConfig.color,
        })}
        <View style={styles.currentStatusInfo}>
          <Text style={[styles.currentStatusLabel, { color: currentConfig.color }]}>
            {currentConfig.label}
          </Text>
          <Text style={styles.currentStatusHint}>Tap a step above to update status</Text>
        </View>
      </View>
    </View>
  );
}

export function CaseStatusBadge({ status }: { status?: CaseStatus | null }) {
  const config = getCaseStatusConfig(status);
  const IconComponent = STATUS_ICONS[status || 'case_loaded'] || Download;

  return (
    <View style={[badgeStyles.badge, { backgroundColor: config.bgColor }]}>
      <IconComponent size={11} color={config.color} />
      <Text style={[badgeStyles.badgeText, { color: config.color }]}>{config.shortLabel}</Text>
    </View>
  );
}

export function CaseStatusSelector({
  currentStatus,
  onSelect,
  disabled = false,
}: {
  currentStatus: CaseStatus;
  onSelect: (status: CaseStatus) => void;
  disabled?: boolean;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={selectorStyles.container}>
      {CASE_STATUSES.map((statusConfig) => {
        const isActive = statusConfig.key === currentStatus;
        const IconComponent = STATUS_ICONS[statusConfig.key] || Download;

        return (
          <TouchableOpacity
            key={statusConfig.key}
            style={[
              selectorStyles.chip,
              { borderColor: isActive ? statusConfig.color : '#E5E7EB' },
              isActive && { backgroundColor: statusConfig.bgColor },
            ]}
            onPress={() => !disabled && onSelect(statusConfig.key)}
            disabled={disabled}
            activeOpacity={0.7}
            testID={`status-chip-${statusConfig.key}`}
          >
            <IconComponent size={14} color={isActive ? statusConfig.color : '#9CA3AF'} />
            <Text
              style={[
                selectorStyles.chipText,
                { color: isActive ? statusConfig.color : '#6B7280' },
                isActive && { fontWeight: '700' as const },
              ]}
            >
              {statusConfig.shortLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#374151',
    marginBottom: 16,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  progressTrack: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    position: 'relative',
  },
  connector: {
    position: 'absolute',
    left: -2,
    right: '50%',
    height: 3,
    borderRadius: 1.5,
    top: 13,
    zIndex: -1,
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  stepLabel: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 13,
    color: '#9CA3AF',
  },
  currentStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
  },
  currentStatusInfo: {
    flex: 1,
  },
  currentStatusLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  currentStatusHint: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  compactContainer: {},
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  compactBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
});

const badgeStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
});

const selectorStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
});

export default React.memo(CaseTracker);
