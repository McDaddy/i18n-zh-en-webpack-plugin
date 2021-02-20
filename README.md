# ts-auto-i18n-plugin

一个用于自动化处理国际化的`ts-loader` plugin

## 特性

- 🚀 &nbsp; 自动化翻译中文到英文

- 💼 &nbsp; 自动化命名空间管理

- 🥽 &nbsp; 源代码中以中文显现国际化内容更直观

- 🤝 &nbsp; 不影响你现有的i18n实现

- 🍻 &nbsp; Google Translate API 高翻译准确率



![Kapture 2021-02-20 at 10.35.13](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/Kapture 2021-02-20 at 10.35.13.gif)

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
5. [localhost:20001](http://localhost:20001)



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
            ns: ['default', 'common', 'myNs'],
            localePath: path.resolve(__dirname, './src-path/locales'),
            include: [path.resolve(__dirname, "./src-path")],
          }),
          ...
        ]
      }),
    },
},
```

2. 如果有自己封装i18n的就在封装代码添加一个`.s`的方法， 否则就如下操作

```javascript
import i18next, { i18n as i18nInterface } from 'i18next';

type i18nType = i18nInterface & { s: (zhWords: string, _ns?: string) => string };
const i18n = i18next as i18nType;
// @ts-ignore i18n.s
i18n.s = (zhWords: string, _ns?: string) => zhWords;

export default i18n;
```

3. 在被引用的`js/ts/jsx/tsx`文件中将要翻译的中文用`i18n.s`包裹

```javascript
import i18n from 'i18n';

...
// 最终转义为 
// defaultLng: en => const title = i18n.t('myNs:title');
// defaultLng: zh => const title = i18n.t('myNs:标题');
const title = i18n.s('标题', 'myNs');
```

4. 如果是`development`模式，未翻译的中文将自动被翻译成英文，并写入到locale文件中。同时自动将`i18n.s`替换成`i18n.t`的形式。
5. 如果是`production`模式，自动将`i18n.s`替换成`i18n.t`的形式，如果发现未翻译内容，自动报错退出



## 流程图

![image-20210219175826813](demo.gif)



## 配置项

- localePath `string` - （必填）多语言locale文件夹的绝对路径，请确保路径下有`zh.json`与`en.json`两个文件

- ns `string[]` - 所有命名空间

  默认： [‘default’]
  
- include `string | string[]` - 此插件无视在`ts-loader`中配置的include，建议手动配置

  默认： 当前执行命令的路径

- exclude `string | string[]` - 在include基础上，去除不需要的目录文件（不支持glob），同时插件会强制忽略`node_modules`中的文件

  默认：[]

- lowerCaseFirstLetter `boolean` - 是否需要强制把英文首字母小写

   默认：`true`

- targetVariable `string` - 匹配的表达式变量名，可以自定义一个i18n变量 e.g. `myI18n`

   默认： `i18n`

- defaultLng `'en'|'zh'` - 与当前工程的locale key一致，如果为中文key那就必须手动设置

   默认：`en`

   ```json
   // defaultLng: 'zh'
   // zh.json
   {
   	"ns": { "中文": "中文" }
   }
   // en.json
   {
   	"ns": { "中文": "Chinese" }
   }
   
   // defaultLng: 'en'
   // zh.json
   {
   	"ns": { "Chinese": "中文" }
   }
   // en.json
   {
   	"ns": { "Chinese": "Chinese" }
   }
   ```

- defaultNs `string` - 默认的命名空间

   默认： 从`ns`属性中取第一个

- apiKey `string` - 当不配置此项时，插件会调用免费的谷歌翻译库[@vitalets/google-translate-api](https://www.npmjs.com/package/@vitalets/google-translate-api)进行翻译，但在此情况下，无法保证翻译的稳定性，在同一网关调用多次翻译后可能会出现403/429等错误，表示被谷歌限制。建议使用者申请一个[Google Cloud](https://cloud.google.com/translate/docs/)的账号，每月50万字符的免费流量基本可以保障一个中大型前端应用使用。完成申请后创建一个API凭证，即API key，配置之后就可以稳定翻译了。

- timeout `number` - 谷歌翻译超时时间

   默认： `5000` （5秒）

- customProps `Object` - 自定义的`i18next-scanner`[配置](https://github.com/i18next/i18next-scanner#options)，可以配置是否去除无用翻译，是否排序等属性

 

## 注意

1. 不支持带变量的国际化即[Interpolation](https://www.i18next.com/translation-function/interpolation)，如： `i18n.t('add {name}', { name: i18n.t('caller') })`
2. 不支持运行时的变量翻译，如： `i18n.s(isMale ? '他': '她')` 或 `i18n.s(variable)`
3. 不支持[Trans](https://react.i18next.com/latest/trans-component)组件， [Plurals](https://www.i18next.com/translation-function/plurals)
4. 手动修改locale文件不会自动发起重编译，此时刷新页面并不会出现修改后的内容，此时请在源文件上任意添加一个新词翻译或者重启项目来触发重编译
5. 在`defaultLng`为`en`的情况下，两个不同的中文可能会对应相同的自动翻译结果，此时插件会提示翻译发生了冲突，并将新翻译的词后加上`__CONFLICT__`，如下图。此时就需要使用者手动去修改locale文件。

![image-20210218135345022](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210218135345022.png)