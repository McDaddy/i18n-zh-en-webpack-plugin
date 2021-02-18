const scanner = require('i18next-scanner');
const vfs = require('vinyl-fs');
const fs = require('fs');
const { differenceWith, isEqual, unset, merge } = require('lodash');
const flattenObjectKeys = require('i18next-scanner/lib/flatten-object-keys').default;
const omitEmptyObject = require('i18next-scanner/lib/omit-empty-object').default;
const chalk = require('chalk');
const { prepareLocaleSource } = require('./utils');

let zhSource = {};
let nsSourceMap = {};
let localePath = '';
let targetVariable;

// See options at https://github.com/i18next/i18next-scanner#options
const getOptions = (ns, customProps) => ({
  removeUnusedKeys: true,
  sort: true,
  func: { // 此配置不能改变
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
  trans: { // 用于组件形式 i18next-react
    component: 'Trans',
    i18nKey: 'i18nKey',
    defaultsKey: 'defaults',
    extensions: [], // 禁用
    fallbackKey(_ns, value) {
      return value;
    },
    acorn: {
      ecmaVersion: 10, // defaults to 10
      sourceType: 'module', // defaults to 'module'
    },
  },
  defaultLng: 'en',
  defaultNs: 'default',
  defaultValue: '__NOT_TRANSLATED__',
  resource: {
    jsonIndent: 2,
    lineEnding: '\n',
  },
  nsSeparator: ':', // namespace separator 此配置不能改变
  keySeparator: false, // key separator if working with a flat json, it's recommended to set keySeparator to false
  interpolation: {
    prefix: '{{',
    suffix: '}}',
  },
  ...customProps,
  lngs: ['en', 'zh'], // 此配置不能改变
  ns,
});

function revertObjectKV(obj) {
  const result = {};
  if (typeof obj === 'object') {
    Object.keys(obj).forEach((k) => {
      if (typeof obj[k] === 'string') {
        result[obj[k]] = k;
      }
    });
  }
  return result;
}

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
    const namespaces = resStore[lng];
    // 未翻译的英文的value和key保持一致
    if (lng === 'en') {
      Object.keys(namespaces).forEach((_ns) => {
        const obj = namespaces[_ns];
        Object.keys(obj).forEach((k) => {
          if (obj[k] === defaultValue) {
            obj[k] = k.replace('&#58;', ':');
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
    if (lng === 'zh') {
      const enToZhWords = revertObjectKV(zhSource);
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
    // 不管有没有翻译过，都要扣出来
    const namespace = defaultValue.defaultValue || 'default';
    let enValue = zhSource[zhWord];
    if (enValue) {
      parser.set(namespace ? `${namespace}:${enValue}` : enValue, '__NOT_TRANSLATED__');
    } else {
      const nsResource = nsSourceMap[namespace];
      enValue = nsResource[zhWord];
      parser.set(namespace ? `${namespace}:${enValue}` : enValue, '__NOT_TRANSLATED__');
    }
  });
  done();
}

const FILE_EXTENSION = '/**/*.{js,jsx,ts,tsx}';

module.exports = {
  writeLocale: async (translatedSource, options) => {
    const { include, exclude, localePath: sourcePath, ns, targetVariable: tv, customProps } = options;
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
    nsSourceMap = prepareLocaleSource(localePath);
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

