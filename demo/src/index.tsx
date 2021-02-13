import React from 'react';
import ReactDOM from 'react-dom';
import i18next from 'i18next';
import app_zhCN from './locales/zh.json';
import app_enUS from './locales/en.json';

const i18n = i18next;
i18next.s = (zhWord: string, _ns?: string) => zhWord;

const Entry = () => {
  const [language, setLanguage] = React.useState('zh');

  const onSwitch = () => {
    const toLocale = language === 'zh' ? 'en' : 'zh';
    i18next.changeLanguage(toLocale);
    setLanguage(toLocale);
  };

  return (
    <div>
      <p>{i18next.s('恢复回来', 'myNs')}</p>
      <button onClick={onSwitch}>{i18next.s('切换语言', 'myNs')}</button>
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
