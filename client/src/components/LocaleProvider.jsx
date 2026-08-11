import { useEffect } from 'react';
import { ConfigProvider, App as AntApp } from 'antd';
import { useTranslation } from 'react-i18next';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { DESIGN_TOKENS } from '../theme/designTokens.js';
import { syncDayjsLocale } from '../utils/displayMapping.js';

export default function LocaleProvider({ children }) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'en-US' ? enUS : zhCN;

  useEffect(() => {
    syncDayjsLocale(i18n.language);
  }, [i18n.language]);

  return (
    <ConfigProvider locale={locale} theme={{ token: DESIGN_TOKENS }}>
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  );
}
