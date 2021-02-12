import React from "react";
import ReactDOM from "react-dom";
import i18next from "i18next";
import app_zhCN from "./locales/zh.json";
import app_enUS from "./locales/en.json";

const i18n = i18next;
i18n.s = (zhWord: string, ns?: string) => zhWord;

const Entry = () => {
  const [language, setLanguage] = React.useState("zh");

  const onSwitch = () => {
    const toLocale = language === "zh" ? "en" : "zh";
    i18next.changeLanguage(toLocale);
    setLanguage(toLocale);
  };

  return (
    <div>
      <p>{i18n.s("你好")}</p>
      <button onClick={onSwitch}>切换语言</button>
    </div>
  );
};

i18n
  .init({
    lng: "zh",
    resources: {
      zh: app_zhCN,
      en: app_enUS,
    },
  })
  .then(function () {
    // initialized and ready to go!
    ReactDOM.render(<Entry />, document.getElementById("root"));
  });
