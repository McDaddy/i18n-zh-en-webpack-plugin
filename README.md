# ts-auto-i18n-plugin

一个用于自动化处理国际化的`ts-loader` plugin

## 特性

- 自动化翻译中文到英文
- 命名空间管理
- 源代码中以中文显现国际化内容更直观
- 与你现有的i18n语法兼容
- Google Translate API 高翻译准确率



## 前提

- 工程必须使用[i18next](https://www.npmjs.com/package/i18next)作为国际化框架
- `typescript` 4.x
- 使用`ts-loader`作为代码转换loader
- 只处理中文转英文的国际化



## 安装

```bash
npm install ts-auto-i18n-plugin -D
```



## DEMO

1. fork 工程
2. `cd demo`
3. `npm install`
4. `npm start`
5. [localhost:8080](http://localhost:8080)



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



## 配置项

- localePath `string` - （必填）多语言locale文件夹的绝对路径，请确保路径下有`zh.json`与`en.json`两个文件

- ns `string[]` - 所有命名空间

  默认： [‘default’]
  
- include `string | string[]` - 此插件无视在`ts-loader`中配置的include，建议手动配置

  默认： 当前执行命令的路径

- exclude `string | string[]` - 在include基础上，去除不需要的目录文件（不支持glob）

  默认：[]

- lowerCaseFirstLetter `boolean` - 是否需要强制把首字母小写

   默认：`true`

- targetVariable `string` - 匹配的表达式变量名

   默认： `i18n`

- apiKey `string` - 当不配置此项时，插件会调用免费的谷歌翻译库[@vitalets/google-translate-api](https://www.npmjs.com/package/@vitalets/google-translate-api)进行翻译，但在此情况下，无法保证翻译的稳定性，在同一网关调用多次翻译后可能会出现403/429等错误，表示被谷歌限制。建议使用者申请一个[Google Cloud](https://cloud.google.com/translate/docs/)的账号，每月50万字符的免费流量基本可以保障一个中大型前端应用使用。完成申请后创建一个API凭证，即API key，配置之后就可以无限翻译了。



## 注意

1. 不支持带变量的国际化如 `i18n.t('add {name}', { name: i18n.t('caller') })`
2. 不支持运行时的变量翻译 如： `i18n.s(x === 'x' ? '哈哈': '嘿嘿')` 或 `i18n.s(variable)`


