/** 1:1 vector copy of docs/assets/logo-light.svg; keep both marks in sync. */
import Svg, { Path } from "react-native-svg";
import { THEME } from "@/lib/theme";
import { useColorScheme } from "@/lib/use-color-scheme";

interface DidianLogoProps {
  size?: number;
  color?: string;
}

export function DidianLogo({ size = 48, color }: DidianLogoProps) {
  const { isDarkColorScheme } = useColorScheme();
  const resolvedColor =
    color ?? (isDarkColorScheme ? THEME.dark.foreground : THEME.light.foreground);

  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Path
        d="M51 8c5 0 9 4 9 9v46c0 5-4 9-9 9H35C18.5 72 7 59 7 40S18.5 8 35 8h16Zm-16 17c-8.2 0-13.5 6-13.5 15S26.8 55 35 55h10V25H35Z"
        fill={resolvedColor}
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </Svg>
  );
}
