const tintColorLight = "#0066CC";

export const Colors = {
  primary: '#0066CC',
  primaryLight: '#E8F0FE',
  primaryBorder: '#B3D4FC',
  teal: '#00897B',
  tealLight: '#E0F2F1',
  text: '#1C1C1E',
  textSecondary: '#6C757D',
  textTertiary: '#ADB5BD',
  background: '#F2F2F7',
  white: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E5E5EA',
  borderStrong: '#C7C7CC',
  danger: '#DC3545',
  dangerLight: '#FFE5E5',
  warning: '#FF9500',
  warningLight: '#FFF3E0',
  success: '#34C759',
  successLight: '#E7F9F0',
};

export default {
  light: {
    text: Colors.text,
    background: Colors.background,
    tint: tintColorLight,
    tabIconDefault: Colors.textTertiary,
    tabIconSelected: tintColorLight,
  },
};
