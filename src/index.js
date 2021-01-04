/* eslint-disable no-console */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
const { NormalModule, Compilation } = require('webpack');
const { translate } = require('@paiva/translation-google');
const { prepareLocaleSource } = require('./prepare-i18n-source');
const { find } = require('lodash');
const path = require('path');
const chalk = require('chalk');

// 抠出i18n.s在编译后的片段
// label: i18n__WEBPACK_IMPORTED_MODULE_0__.default.s('中文'),
const regex = /(i18n__WEBPACK_IMPORTED_MODULE_\d+__.default\.s)\((?:'([^,]*?)'|'(.*?)',\s*'(.*?)')(\))/g;

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
 *  2.1 isProd 表示是开发模式还是生产打包模式 默认true
 *  2.2 localePath 表示工程存放locales文件的绝对路径 必填
 *  2.3 timeout 表示翻译中文时最大的等待时间，防止网络问题阻碍本地开发进程， 默认 5000（5秒）
 *  2.4 ns 表示工程的namespace集合，必填
 * 3. 将已经引用i18n代码中(js/jsx/ts/tsx)要翻译的中文用i18n.s包装。e.g. i18n.s('中文','namespace'), 其中第二个参数命名空间可以省略
 * 4. 在开发模式下，保存代码，插件会自动提取需要翻译的中文和命名空间
 *  4.1 如果此中文与命名空间的组合在locale文件中已经存在，则复用原有翻译
 *  4.2 如果翻译不存在，则使用google translate进行翻译。完成后自动输出到locale文件中，在提交代码前需要人工检查翻译是否合理
 *  4.3 插件会将i18n.s在运行时替换成i18n.t(namespace:enWord)
 *  4.4 在代码中注释或删除i18n.s片段，为了性能考虑，插件不会立刻自动删除locale文件中多余的翻译，将会在下次需要在线翻译时自动去除
 * 5. 在生产打包模式下，不会自动翻译中文，根据locale文件将i18n.s转换成i18n.t
 */
class I18nPlugin {
  constructor(options) {
    if (!options || !options.localePath) {
      throw new Error('I18nPlugin -> options -> localePath不得为空！！！');
    }
    if (!options.ns) {
      throw new Error('I18nPlugin -> options -> ns不得为空！！！');
    }
    this.options = { isProd: true, ...options };
    /**
     * 数据结构: { fileName: [{ ns, zhWord }, { ns2, zhWord2 }] }
     */
    this.requireTranslateWords = {};
    this.localeSourceData = prepareLocaleSource(options.localePath);
  }

  filterInvalidWord(enWord) {
    return enWord.replace(/:/g, '&#58;');
  }

  async doTranslate() {
    const toTransSet = new Set();
    // 集合所有需要翻译的中文（去重）
    Object.keys(this.requireTranslateWords).forEach(fileName => {
      this.requireTranslateWords[fileName].forEach(({ zhWord }) => toTransSet.add(zhWord));
    });
    const toTransList = Array.from(toTransSet);

    const promises = toTransList.map(async (word) => {
      const result = await translate(word, {
        tld: 'zh-cn',
        to: 'en',
      });
      return { zh: word, en: result.text };
    });
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        resolve('timeout');
      }, this.options.timeout || 5000);
    });
    // 如果翻译超时直接返回
    const translatedList = await Promise.race([timeoutPromise, Promise.allSettled(promises)]);
    if (translatedList === 'timeout') {
      console.log(chalk.red('翻译超时...下次修改文件后重试'));
      return {};
    }

    const translatedWords = {};
    // 将翻译结果集合到一个对象中
    translatedList.filter(item => item.status === 'fulfilled').forEach(({ value }) => {
      const { zh, en } = value;
      const [first, ...rest] = en;
      const enWord = this.filterInvalidWord(first.toLowerCase() + rest.join(''));
      console.log(chalk.cyan(zh, ':', enWord));
      translatedWords[zh] = enWord;
    });
    // 更新requireTranslateWords， 使其变成一个{ ns, zhWord, enWord }的结构
    Object.keys(this.requireTranslateWords).forEach(fileName => {
      const fileCollection = this.requireTranslateWords[fileName];
      this.requireTranslateWords[fileName] = fileCollection.map(({ zhWord, ns }) => {
        return { ns, zhWord, enWord: translatedWords[zhWord] || null };
      });
    });
    return translatedWords;
  }

  apply(compiler) {
    compiler.hooks.compilation.tap('AutoI18nPlugin', compilation => {
      // beforeLoaders hook 在loader编译开始前劫持加入i18n-loader
      NormalModule.getCompilationHooks(compilation).beforeLoaders.tap('AutoI18nPlugin', (_, normalModule) => {
        if (this.options.isProd) {
          // 如果是生产打包模式，不需要在线翻译，直接给文件添加一个loader
          const ext = path.extname(normalModule.userRequest);
          if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
            normalModule.loaders.push({
              loader: path.resolve(__dirname, './i18n-loader.js'),
              options: {
                sourceData: this.localeSourceData,
              },
            });
          }
        }
      });
      // processAssets hook 在编译完成之后写入asset文件之前，在webpack4中相当于emit hook
      compilation.hooks.processAssets.tapAsync(
        {
          name: 'AutoI18nPlugin',
          stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        async (assets, callback) => {
          if (this.options.isProd) {
            // 只有在dev模式开启在线翻译
            callback();
            return;
          }
          const nsSourceMap = this.localeSourceData;
          const fileNames = Object.keys(assets);
          // 每个asset对应一个文件(chunk),取出每个chunk的文件内容，通过正则做替换，原理同i18n-loader
          for (let i = 0; i < fileNames.length; i++) {
            const fileName = fileNames[i];
            const asset = assets[fileName];
            let content = asset.source();
            let match = regex.exec(content);
            while (match) {
              let zhWord = match[2];
              let ns = 'default';
              if (!zhWord) {
                zhWord = match[3];
                ns = match[4];
              }
              const i18nFunc = match[1];
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
                // i18n.s('数据源名称', 'dl') => i18n.t('dl:data source name')
                // i18n.s('更新时间') => i18n.t('update time')
                content = content.replace(`${match[0]}`, `${i18nFunc.slice(0, -1).concat('t')}('${nsEnWord}')`);
              } else {
                // 如果找不到翻译，就加入被翻译队列
                console.log(chalk.blue(`需要翻译：${zhWord}`));
                if (this.requireTranslateWords[fileName]) {
                  !find(this.requireTranslateWords[fileName], { zhWord, ns }) && this.requireTranslateWords[fileName].push({ ns, zhWord });
                } else {
                  this.requireTranslateWords[fileName] = [{ ns, zhWord }];
                }
              }
              match = regex.exec(content);
            }
            // 回写assets（不包含还未被翻译的部分）
            assets[fileName] = {
              source() {
                return content;
              },
              size() {
                return content.length;
              },
            };
          }
          let translatedWords = {};
          if (Object.keys(this.requireTranslateWords).length > 0) {
            console.log(chalk.green('开始翻译...'));
            translatedWords = await this.doTranslate();
            Object.keys(this.requireTranslateWords).forEach(fileName => {
              const asset = assets[fileName];
              let content = asset.source();
              let match = regex.exec(content);
              // 翻译完后重新正则一次替换
              while (match) {
                let zhWord = match[2];
                let ns = 'default';
                if (!zhWord) {
                  zhWord = match[3];
                  ns = match[4];
                }
                const i18nFunc = match[1];
                const translateList = this.requireTranslateWords[fileName];
                const target = find(translateList, { zhWord });
                if (target) {
                  let nsEnWord = target.enWord;
                  if (ns !== 'default') {
                    nsEnWord = `${ns}:${nsEnWord}`;
                  }
                  content = content.replace(`${match[0]}`, `${i18nFunc.slice(0, -1).concat('t')}('${nsEnWord}')`);
                } else {
                  console.log(chalk.red('翻译失败:', zhWord));
                }
                match = regex.exec(content);
              }
              // 回写assets（仅此次被翻译的部分）
              assets[fileName] = {
                source() {
                  return content;
                },
                size() {
                  return content.length;
                },
              };
            });
            if (Object.keys(translatedWords).length > 0) {
              // 输出到locale资源文件
              const { writeLocale } = require('./i18n-generate-locales');
              await writeLocale(translatedWords, this.localeSourceData, this.options.localePath, this.options.ns);
              // 更新locale资源供下次编译使用
              this.localeSourceData = prepareLocaleSource(this.options.localePath);
              // 如果是删除了某个i18n.s 需要删除locale文件
              // 这里性能考虑暂时不去删除locale文件中不需要翻译，当下次有新的词需要翻译的时候就会自动删除
            }
          }
          // 清空requireTranslateWords
          this.requireTranslateWords = {};
          // asyncSeriesHook回调
          callback();
        }
      );
    });
  }
}

module.exports = I18nPlugin;

