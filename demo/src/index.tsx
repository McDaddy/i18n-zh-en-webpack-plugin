import React from "react";
import ReactDOM from "react-dom";
// import i18nClass from './i18n';
import i18next from "i18next";

const Entry = () => {
  return <div>{i18next.t("key")}</div>;
};

i18next
  .init({
    lng: "zh",
    debug: true,
    resources: {
      en: {
        translation: {
          key: "hello world",
        },
      },
      zh: {
        translation: {
          key: "你好",
        },
      },
    },
  })
  .then(function () {
    // initialized and ready to go!
    ReactDOM.render(<Entry />, document.getElementById("root"));
  });
