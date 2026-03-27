import { useColorScheme } from "react-native";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";

export function useTheme() {
  const systemScheme = useColorScheme();
  const { settings } = useApp();

  const isDark =
    settings.colorScheme === "dark"
      ? true
      : settings.colorScheme === "light"
        ? false
        : systemScheme === "dark";

  const c = isDark ? Colors.dark : Colors.light;

  return { isDark, c, colors: c, Colors };
}
