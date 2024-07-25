import { Outlet } from '@modern-js/runtime/router';
import { bitable } from '@lark-base-open/js-sdk';
import { useState } from 'react';
import { LocaleProvider } from '@douyinfe/semi-ui';
import { useAsyncEffect } from 'ahooks';
import { getLocale } from '@/locales/i18n';

bitable.bridge.getTheme().then(theme => updateTheme(theme));
bitable.bridge.onThemeChange(event => {
  updateTheme(event.data.theme);
});
const updateTheme = async (theme: string) => {
  if (theme === 'DARK') {
    // 设置为暗黑主题
    document.body.setAttribute('arco-theme', 'dark');
    document.body.setAttribute('theme-mode', 'dark');
  } else {
    // 恢复亮色主题
    document.body.removeAttribute('arco-theme');
    document.body.removeAttribute('theme-mode');
  }
};

export default function Layout() {
  const [locale, setLocale] = useState('zh-CN');
  useAsyncEffect(async () => {
    const locale = await bitable.bridge.getLocale();
    setLocale(locale);
  }, []);
  return (
    <LocaleProvider locale={getLocale(locale)}>
      <Outlet />
    </LocaleProvider>
  );
}
