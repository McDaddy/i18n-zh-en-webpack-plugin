import React from 'react';
import ReactDOM from 'react-dom';
// import i18next from 'i18next';
import i18n from 'i18next';
import app_zhCN from './locales/zh.json';
import app_enUS from './locales/en.json';

// @ts-ignore i18n.s
i18n.s = (zhWords: string, _ns?: 'fdp') => zhWords;
// @ts-ignore i18next.s
// i18next.s = (zhWords: string, _ns?: 'fdp') => zhWords;

const Entry = () => {
  const [language, setLanguage] = React.useState('zh');

  const onSwitch = () => {
    const toLocale = language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(toLocale);
    setLanguage(toLocale);
  };

  return (
    <div>
      <p>{i18n.s('开心就好', 'myNs')}</p>
      <button onClick={onSwitch}>{i18n.s('切换语言', 'myNs')}</button>
    </div>
  );
};

i18n.init({
  lng: 'zh',
  resources: {
    zh: app_zhCN,
    en: app_enUS,
  },
}).then(() => {
  // initialized and ready to go!
  ReactDOM.render(<Entry />, document.getElementById('root'));
});
