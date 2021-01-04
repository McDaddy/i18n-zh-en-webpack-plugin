/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
const { getOptions } = require('loader-utils');

const regex = /(?<=i18n\.s\()(?:'([^,]*?)'|'(.*?)',\s*'(.*?)')(?=\))/g;

/**
 * 将源文件中i18n.s替换成i18n.t，并替换相应的翻译内容
 * i18n.s('数据源名称', 'dl') => i18n.t('dl:data source name')
 * i18n.s('更新时间') => i18n.t('update time')
 * @param {*} source
 */
function i18nTransformLoader(source) {
  const options = getOptions(this);
  // loader options只能传基础类型和json对象
  const nsSourceMap = options.sourceData || {};

  let transformedSource = source;
  // 正则匹配两种形式
  // 1. 有namespace参数的 i18n.s('数据源名称', 'dl'),
  // 2. 无namespace参数的即default i18n.s('更新时间'),
  // 如果match[1]不为空表示匹配到的是default形式的
  // 相反如果match[2]和match[3]不为空，则匹配到了带namespace的形式
  let match = regex.exec(transformedSource);
  while (match) {
    let zhWord = match[1];
    let ns = 'default';
    if (!zhWord) {
      zhWord = match[2];
      ns = match[3];
    }
    const nsResources = nsSourceMap[ns];
    if (!nsResources) {
      throw new Error(`指定namespace：${ns} 不存在`);
    }
    const enWord = nsResources[zhWord];
    if (enWord) {
      let nsEnWord = enWord;
      if (ns !== 'default') {
        nsEnWord = `${ns}:${enWord}`;
      }
      // 替换源文件
      transformedSource = transformedSource.replace(`i18n.s(${match[0]})`, `i18n.t('${nsEnWord}')`);
    } else {
      throw new Error(`找不到对应的翻译：${zhWord}`);
    }
    match = regex.exec(transformedSource);
  }
  return transformedSource;
}

module.exports = i18nTransformLoader;
