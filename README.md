# i18n-webpack-plugin

一个用于自动化处理国际化的webpack plugin

## 特性

- 自动化翻译中文到英文
- 命名空间管理
- 源代码中以中文显现国际化内容更直观
- 与你现有的i18n语法兼容
- Google Translate Api翻译准确率高

## 前提

- 工程必须使用i18next作为国际化框架
- `typescript` 4.x
- 使用`ts-loader`
- 只处理中文转英文的国际化

## 安装

```bash
npm i @kuimo/i18n-webpack-plugin -D
```

## 快速开始

1. 在`webpack.config.js`中配置

```javascript
{
  loader: "ts-loader",
    options: {
      ...
      getCustomTransformers: () => ({
        before: [ 
          i18nReplacePlugin({
            ns: ['default', 'common', 'your-space'],
            localePath: path.resolve(__dirname, './src-path/locales'),
            include: [path.resolve(__dirname, "./src-path")],
            exclude: 'exclude-path'
          }),
          ...
        ]
      }),
    },
},
```

2. 在`i18n`文件中定义一个新方法

```javascript
i18n.s = (zhWords: string, ns?: string) => zhWords;
```

3. 在被引用的`js/ts/jsx/tsx`文件中将要翻译的中文用`i18n.s`包裹

```javascript
import i18n from 'i18n';

...
// 最终转义为 const title = i18n.t('ns:title');
const title = i18n.s('标题', 'ns');
```

4. 如果是`development`模式，未翻译的中文将自动被翻译成英文，并写入到locale文件中。同时自动将`i18n.s`替换成`i18n.t`的形式。
5. 如果是`production`模式，自动将`i18n.s`替换成`i18n.t`的形式，如果发现未翻译内容，自动报错退出



## 流程图

![i18n-plugin](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/i18n-plugin.png)



## 缺点

1. 不支持带变量的国际化如 `i18n.t('add {name}', { name: i18n.t('caller') })`
2. 不支持运行时的变量翻译 如： `i18n.s(x === 'x' ? '哈哈': '嘿嘿')` 或 `i18n.s(variable)`