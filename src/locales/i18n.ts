/* eslint-disable import/no-named-as-default-member */
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { bitable } from '@lark-base-open/js-sdk';
import zhCN from '@douyinfe/semi-ui/lib/es/locale/source/zh_CN';
// import enGB from '@douyinfe/semi-ui/lib/es/locale/source/en_GB';
import enUS from '@douyinfe/semi-ui/lib/es/locale/source/en_US';
import koKR from '@douyinfe/semi-ui/lib/es/locale/source/ko_KR';
import jaJP from '@douyinfe/semi-ui/lib/es/locale/source/ja_JP';
import viVN from '@douyinfe/semi-ui/lib/es/locale/source/vi_VN';
// import ruRU from '@douyinfe/semi-ui/lib/es/locale/source/ru_RU';
import idID from '@douyinfe/semi-ui/lib/es/locale/source/id_ID';
// import msMY from '@douyinfe/semi-ui/lib/es/locale/source/ms_MY';
import thTH from '@douyinfe/semi-ui/lib/es/locale/source/th_TH';
// import trTR from '@douyinfe/semi-ui/lib/es/locale/source/tr_TR';
// import ptBR from '@douyinfe/semi-ui/lib/es/locale/source/pt_BR';
import zhTW from '@douyinfe/semi-ui/lib/es/locale/source/zh_TW';
// import svSE from '@douyinfe/semi-ui/lib/es/locale/source/sv_SE';
// import plPL from '@douyinfe/semi-ui/lib/es/locale/source/pl_PL';
// import nlNL from '@douyinfe/semi-ui/lib/es/locale/source/nl_NL';
// import ar from '@douyinfe/semi-ui/lib/es/locale/source/ar';
import es from '@douyinfe/semi-ui/lib/es/locale/source/es';
import it from '@douyinfe/semi-ui/lib/es/locale/source/it';
import de from '@douyinfe/semi-ui/lib/es/locale/source/de';
import fr from '@douyinfe/semi-ui/lib/es/locale/source/fr';
// import ro from '@douyinfe/semi-ui/lib/es/locale/source/ro';
import resources from './resources.json';

i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources,
    fallbackLng: 'en', // 指定降级文案为英文
    interpolation: {
      escapeValue: false,
    },
  });

try {
  bitable.bridge.getLanguage().then(lng => {
    if (i18next.language !== lng) {
      i18next.changeLanguage(lng);
    }
  });
} catch (_error: any) {}

export function getLocale(locale: string) {
  switch (locale) {
    case 'zh-CN':
      return zhCN;
    case 'en-US':
      return enUS;
    case 'ja-JP':
      return jaJP;
    case 'ko-KR':
      return koKR;
    case 'id-ID':
      return idID;
    case 'th-TH':
      return thTH;
    case 'zh-HK':
      return zhTW;
    case 'fr-FR':
      return fr;
    case 'es-ES':
      return es;
    case 'de-DE':
      return de;
    case 'it-IT':
      return it;
    case 'vi-VN':
      return viVN;
    default:
      return enUS;
  }
}
