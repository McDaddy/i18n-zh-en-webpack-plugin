const { invert } = require('lodash');
const fs = require('fs');
const path = require('path');

/**
 * 初始化资源，载入zh.json，将所有翻译资源准备成{ namespaceName: { "中文": "Chinese" } }的形式供运行时查找
 */
const prepareLocaleSource = (localePath) => {
  const nsSourceMap = {};
  const resource = fs.readFileSync(path.resolve(localePath, 'zh.json'));
  if (resource.length === 0) {
    return nsSourceMap;
  }
  const zhResource = JSON.parse(resource); // 不能用直接require因为要动态读
  Object.keys(zhResource).forEach((namespaceKey) => {
    const nsResources = {};
    nsSourceMap[namespaceKey] = nsResources;
    // 当前namespace下所有翻译
    const namespaceWords = zhResource[namespaceKey];
    // key-value 位置对换 变成 { '中文': 'Chinese' }的形式
    const invertTranslatedWords = invert(namespaceWords);
    Object.keys(invertTranslatedWords).forEach((zhWord) => {
      nsResources[zhWord] = invertTranslatedWords[zhWord];
    });
  });
  return nsSourceMap;
};

module.exports = {
  prepareLocaleSource,
};
