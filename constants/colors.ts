const COLORS = {
  background: "#0A0A0A",
  card: "#161616",
  card2: "#1E1E1E",
  border: "#2C2C2E",
  text: "#FFFFFF",
  textSecondary: "#8A8A8E",
  textTertiary: "#48484A",
  tint: "#00C97A",
  green: "#00C97A",
  yellow: "#FFD60A",
  orange: "#FF9F0A",
  red: "#FF453A",
  blue: "#0A84FF",
  purple: "#BF5AF2",
  tabBarActive: "#00C97A",
  tabBarInactive: "#48484A",
};

export default {
  light: {
    text: COLORS.text,
    background: COLORS.background,
    tint: COLORS.tint,
    tabIconDefault: COLORS.tabBarInactive,
    tabIconSelected: COLORS.tabBarActive,
  },
  dark: {
    text: COLORS.text,
    background: COLORS.background,
    tint: COLORS.tint,
    tabIconDefault: COLORS.tabBarInactive,
    tabIconSelected: COLORS.tabBarActive,
  },
  ...COLORS,
};
