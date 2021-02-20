const { invert } = require('lodash');
const fs = require('fs');
const path = require('path');

/**
 * 初始化资源，载入zh.json，将所有翻译资源准备成{ namespaceName: { "中文": "Chinese" } }的形式供运行时查找
 */
const prepareLocaleSource = (localePath, defaultLng) => {
  const nsSourceMap = {};
  const isEnDefault = defaultLng === 'en';
  const resource = fs.readFileSync(path.resolve(localePath, isEnDefault ? 'zh.json' : 'en.json'));
  if (resource.length === 0) {
    return nsSourceMap;
  }
  const zhResource = JSON.parse(resource); // 不能用直接require因为要动态读
  Object.keys(zhResource).forEach((namespaceKey) => {
    // 当前namespace下所有翻译
    const namespaceWords = zhResource[namespaceKey];
    let nsResources = namespaceWords;
    if (isEnDefault) { // 在英文为defaultLng的情况下
      // key-value 位置对换 变成 { '中文': 'Chinese' }的形式  前提假设在一个命名空间下，同一个中文只会对应一种英文
      nsResources = invert(namespaceWords);
    }
    nsSourceMap[namespaceKey] = nsResources;
  });
  return nsSourceMap;
};

module.exports = {
  prepareLocaleSource,
};
