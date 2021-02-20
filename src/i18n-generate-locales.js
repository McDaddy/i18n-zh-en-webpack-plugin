const scanner = require('i18next-scanner');
const vfs = require('vinyl-fs');
const fs = require('fs');
const { differenceWith, isEqual, unset, merge, invert, get } = require('lodash');
const flattenObjectKeys = require('i18next-scanner/lib/flatten-object-keys').default;
const omitEmptyObject = require('i18next-scanner/lib/omit-empty-object').default;
const chalk = require('chalk');

let zhSource = {};
let nsSourceMap = {};
let localePath = '';
let targetVariable;
let defaultLng;
let defaultNs;
let defaultNotTransValue;

// See options at https://github.com/i18next/i18next-scanner#options
const getOptions = (ns, customProps) => {
  const { defaultValue } = customProps || {};
  defaultNotTransValue = defaultValue || '__NOT_TRANSLATED__';
  return {
    removeUnusedKeys: true,
    sort: true,
    func: { // 此配置不能改变
      list: ['i18next.t', 'i18n.t'],
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
    defaultValue: defaultNotTransValue,
    resource: {
      jsonIndent: 2,
      lineEnding: '\n',
    },
    ...customProps,
    lngs: ['en', 'zh'], // 此配置不能改变
    ns,
    defaultLng,
    trans: false,
    keySeparator: false, // key separator if working with a flat json, it's recommended to set keySeparator to false
    nsSeparator: ':', // namespace separator 此配置不能改变
    defaultNs,
  };
};

function sortObject(unordered) {
  const ordered = {};
  Object.keys(unordered).sort().forEach((key) => {
    ordered[key] = typeof unordered[key] === 'object' ? sortObject(unordered[key]) : unordered[key];
  });
  return ordered;
}

function customFlush(done) {
  const { resStore } = this.parser;
  const { resource, removeUnusedKeys, sort, defaultValue } = this.parser.options;

  for (let index = 0; index < Object.keys(resStore).length; index++) {
    const lng = Object.keys(resStore)[index];
    const namespaces = resStore[lng]; // 所有被抠出来的英文key，对应的都是__not_translated，需要跟后面的source合并
    // 未翻译的英文的value和key保持一致
    if (lng === defaultLng) {
      Object.keys(namespaces).forEach((_ns) => {
        const obj = namespaces[_ns];
        Object.keys(obj).forEach((k) => {
          if (obj[k] === defaultValue) {
            obj[k] = k.replace('&#58;', ':'); // 转义冒号，免得和分割符冲突
          }
        });
      });
    }

    const oldContentBuffer = fs.readFileSync(lng === 'en' ? `${localePath}/en.json` : `${localePath}/zh.json`, { encoding: 'utf-8' });
    let oldContent = oldContentBuffer.length === 0 ? {} : JSON.parse(oldContentBuffer);

    // 移除废弃的key
    if (removeUnusedKeys) {
      const namespaceKeys = flattenObjectKeys(namespaces);
      const oldContentKeys = flattenObjectKeys(oldContent);
      const unusedKeys = differenceWith(
        oldContentKeys,
        namespaceKeys,
        isEqual,
      );

      for (let i = 0; i < unusedKeys.length; ++i) {
        unset(oldContent, unusedKeys[i]);
      }

      oldContent = omitEmptyObject(oldContent);
    }

    // 合并旧的内容
    let output = merge(namespaces, oldContent);
    if (sort) {
      output = sortObject(output);
    }

    // 已有翻译就替换
    if (lng !== defaultLng) {
      const enToZhWords = defaultLng === 'en' ? invert(zhSource) : zhSource;
      Object.keys(output).forEach((_ns) => {
        const obj = output[_ns];
        Object.keys(obj).forEach((k) => {
          if (obj[k] === defaultValue) {
            const zh = enToZhWords[k] || enToZhWords[`${_ns}:${k}`];
            if (zh) {
              obj[k] = zh;
            }
          }
        });
      });
    }

    if (isEqual(oldContent, output) && (index + 1) === Object.keys(resStore).length) {
      console.log(chalk.yellow('locale内容无改动...'));
      done();
      return;
    }

    fs.writeFileSync(lng === 'en' ? `${localePath}/en.json` : `${localePath}/zh.json`, JSON.stringify(output, null, resource.jsonIndent), 'utf8');
  }
  console.log(chalk.green('完成写入locale文件...'));

  done();
}

function customTransform(file, enc, done) {
  const { parser } = this;
  const content = fs.readFileSync(file.path, enc);

  parser.parseFuncFromString(content, { list: [`${targetVariable}.s`] }, (zhWord, defaultValue) => {
    // 所有i18n.s，都要扣出来
    const namespace = defaultValue.defaultValue || defaultNs;
    const nsResource = nsSourceMap[namespace]; // 老的资源
    const enValue = zhSource[zhWord] || nsResource[zhWord];
    if (enValue) { // enValue 存在说明这个中文的翻译存在于老的资源或者这次翻译的结果， 否则这就是一段被注释的代码， 不需要加入
      const keyWord = defaultLng === 'en' ? enValue : zhWord;
      parser.set(namespace ? `${namespace}:${keyWord}` : keyWord, defaultNotTransValue);
    }
  });
  done();
}

const FILE_EXTENSION = '/**/*.{js,jsx,ts,tsx}';

module.exports = {
  writeLocale: async (translatedSource, sourceMap, options) => {
    const { include, exclude, localePath: sourcePath, ns, targetVariable: tv, customProps, defaultLng: dl, defaultNs: dn } = options;
    targetVariable = tv;
    let paths = [`${process.cwd()}${FILE_EXTENSION}`];
    if (include) {
      paths = include.map((p) => `${p}${FILE_EXTENSION}`);
    }
    if (exclude.length > 0) {
      const excludePaths = exclude.map((p) => `!${p}${FILE_EXTENSION}`);
      paths = paths.concat(excludePaths);
    }
    zhSource = translatedSource || {};
    localePath = sourcePath || '';
    nsSourceMap = sourceMap;
    defaultLng = dl;
    defaultNs = dn;
    const promise = new Promise((resolve) => {
      vfs.src(paths)
        .pipe(scanner(getOptions(ns, customProps), customTransform, customFlush))
        .pipe(vfs.dest('./')).on('end', () => {
          resolve();
        });
    });
    await promise;
  },
};

