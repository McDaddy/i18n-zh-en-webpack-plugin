/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
const { find } = require('lodash');
const EventEmitter = require('events');
const chalk = require('chalk');
const translate = require('@vitalets/google-translate-api');
const fs = require('fs');
const i18nReplacePlugin = require('./i18n-replace-plugin');
const { writeLocale } = require('./i18n-generate-locales');

const eventHub = new EventEmitter();
let localePath;
let nsList;
let include;
let exclude;
let translateTimeout = 5000;

/**
 * I18nPlugin 用于自动化处理国际化的webpack plugin
 *
 * 前提：
 * 1. 工程必须使用i18next作为国际化框架
 * 2. 使用webpack 5构建工程
 * 3. 只处理中文转英文的国际化
 *
 * 使用方法：
 * 1. 不管有没有单独维护一个i18n.js/ts文件，保证给i18n这个导出对象添加一个.s的方法： i18n.s = (zhWords: string, ns?: string) => zhWords;
 * 2. 插件三个option
 *  2.1 localePath 表示工程存放locales文件的绝对路径 必填
 *  2.2 timeout 表示翻译中文时最大的等待时间，防止网络问题阻碍本地开发进程， 默认 5000（5秒）
 *  2.3 ns 表示工程的namespace集合，必填
 * 3. 将已经引用i18n代码中(js/jsx/ts/tsx)要翻译的中文用i18n.s包装。e.g. i18n.s('中文','namespace'), 其中第二个参数命名空间可以省略
 * 4. 在开发模式下，保存代码，插件会自动提取需要翻译的中文和命名空间
 *  4.1 如果此中文与命名空间的组合在locale文件中已经存在，则复用原有翻译
 *  4.2 如果翻译不存在，则使用google translate进行翻译。完成后自动输出到locale文件中，在提交代码前需要人工检查翻译是否合理
 *  4.3 插件会将i18n.s在运行时替换成i18n.t(namespace:enWord)
 *  4.4 在代码中注释或删除i18n.s片段，为了性能考虑，插件不会立刻自动删除locale文件中多余的翻译，将会在下次需要在线翻译时自动去除
 *  4.5 直接修改locale文件无法直接使ts/js代码重新编译，需要手动重新save源代码生效
 * 5. 在生产打包模式下，不会自动翻译中文，根据locale文件将i18n.s转换成i18n.t
 */
exports.i18nReplacePlugin = (options) => {
  if (!options || !options.localePath) {
    throw new Error('I18nPlugin -> options -> localePath不得为空！！！');
  }
  if (!options.ns) {
    throw new Error('I18nPlugin -> options -> ns不得为空！！！');
  }
  localePath = options.localePath;
  nsList = options.ns;
  include = options.include;
  exclude = options.exclude;
  translateTimeout = options.timeout || 5000;
  return i18nReplacePlugin(eventHub, localePath)(exclude);
};

const fileList = [];
const waitingTranslatePool = [];

eventHub.on('requireTranslate', (params) => {
  const { zhWord, ns, fileName } = params;
  if (!find(waitingTranslatePool, { zhWord, ns })) {
    waitingTranslatePool.push({ ns, zhWord });
  }
  if (!fileList.includes(fileName)) {
    fileList.push(fileName);
  }
});

const filterInvalidWord = (enWord) => {
  return enWord.replace(/:/g, '&#58;');
};

const doTranslate = async (waitingTranslateList) => {
  const toTransSet = new Set();
  waitingTranslateList.forEach(({ zhWord }) => toTransSet.add(zhWord));
  const toTransList = Array.from(toTransSet);

  const promises = toTransList.map(async (word) => {
    try {
      const result = await translate(word, {
        // tld: 'zh-cn',
        to: 'en',
      });
      return { zh: word, en: result.text };
    } catch (error) {
      console.log(chalk.red('翻译失败...' + error));
      throw error;
    }
  });
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      resolve('timeout');
    }, translateTimeout);
  });

    // 如果翻译超时直接返回
  const  translatedList = await Promise.race([timeoutPromise, Promise.allSettled(promises)]);
  if (translatedList === 'timeout') {
    console.log(chalk.red('翻译超时...下次修改文件后重试'));
    return {};
  }

  const translatedWords = {};
  // 将翻译结果集合到一个对象中
  translatedList.filter((item) => item.status === 'fulfilled').forEach(({ value }) => {
    const { zh, en } = value;
    const [first, ...rest] = en;
    const enWord = filterInvalidWord(first.toLowerCase() + rest.join(''));
    console.log(chalk.cyan(zh, ':', enWord));
    translatedWords[zh] = enWord;
  });
  return translatedWords;
};

if (process.env.NODE_ENV !== 'production') {
  setInterval(async () => {
    if (fileList.length > 0 && waitingTranslatePool.length > 0) {
      console.log(chalk.green('开始翻译...'));
      const fileListCp = [...fileList];
      const waitingTranslatePoolCp = [...waitingTranslatePool];
      fileList.length = 0;
      waitingTranslatePool.length = 0;
      const translatedWords = await doTranslate(waitingTranslatePoolCp);
      if (Object.keys(translatedWords).length > 0) {
        // 输出到locale资源文件
        await writeLocale(translatedWords, include,exclude, localePath, nsList);
        // 如果是删除了某个i18n.s 需要删除locale文件
        // 这里性能考虑暂时不去删除locale文件中不需要翻译，当下次有新的词需要翻译的时候就会自动删除
        eventHub.emit('onLocaleFileChange');
        fileListCp.forEach((filePath) => { // 为了强制刷新
          const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
          fs.writeFile(filePath, content, () => {});
        });
      }
    }
  }, 5000);
}
