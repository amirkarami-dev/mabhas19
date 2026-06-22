import { useEffect } from "react";
import { ConfigProvider } from "antd";
import faIR from "antd/locale/fa_IR";
import enUS from "antd/locale/en_US";
import { buildAntdTheme, applyCssVars, type ThemeMode, type BrandTokens } from "./theme";

export function ThemeProvider(props: {
  mode: ThemeMode;
  brand: BrandTokens;
  dir: "rtl" | "ltr";
  locale: "fa" | "en";
  children: React.ReactNode;
}) {
  const { mode, brand, dir, locale, children } = props;
  useEffect(() => {
    applyCssVars(mode, brand);
  }, [mode, brand]);

  // Extract direction out of the theme object — ConfigProvider takes it as a top-level prop.
  const { direction: _dir, ...antdTheme } = buildAntdTheme(mode, brand, dir);
  return (
    <ConfigProvider
      theme={antdTheme}
      locale={locale === "fa" ? faIR : enUS}
      direction={_dir}
    >
      {children}
    </ConfigProvider>
  );
}
