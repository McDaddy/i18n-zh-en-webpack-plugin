/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
const ts = require('typescript');
const { prepareLocaleSource } = require('./utils');

const { factory } = ts;
let eventHub;

let nsSourceMap;
let localePath;

function createTransformer() {
  nsSourceMap = prepareLocaleSource(localePath);
  eventHub.on('onLocaleFileChange', () => {
    nsSourceMap = prepareLocaleSource(localePath);
  });

  return (context) => {
    let fileName;
    const visitor = (node) => {
      if (ts.isSourceFile(node)) { // 如果是文件入口，开始遍历子节点
        fileName = node.fileName; // 记录下当前的文件名，如果有翻译内容，结束后自动重新save
        return ts.visitEachChild(node, visitor, context);
      }

      if (ts.SyntaxKind.CallExpression === node.kind) {
        // 首先这是一个CallExpression
        const callExpression = node;
        const { expression } = callExpression;
        if (expression.kind === ts.SyntaxKind.PropertyAccessExpression) {
          // 其次callee是一个PropertyAccessExpression， 且为i18n.s
          const { name, expression: identifierExpression } = expression;
          if (
            name.escapedText === 's' &&
            identifierExpression.escapedText === 'i18n'
          ) {
            const { arguments: args } = callExpression;
            const params = args.map((arg) => arg.text);
            const zhWord = params[0];
            const ns = params[1] || 'default';
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
              const newNode = factory.createCallExpression(
                factory.createPropertyAccessExpression(
                  factory.createIdentifier('i18n'),
                  factory.createIdentifier('t'),
                ),
                undefined,
                [factory.createStringLiteral(nsEnWord)],
              );
              return newNode;
            } else if (process.env.NODE_ENV === 'production') {
              // 在生产模式下，不用自动翻译，找不到就报错
              throw new Error(`找不到对应翻译：${zhWord}`);
            } else {
              // 开发模式下，通知轮询器准备翻译
              eventHub.emit('requireTranslate', { zhWord, ns, fileName });
            }
          }
        }
      }
      // 不匹配就返回原来的node，并且遍历，因为表达式里面可能嵌套i18n
      return ts.visitEachChild(node, visitor, context);
    };

    return (node) => ts.visitNode(node, visitor);
  };
}

module.exports = (eventEmitter, localePathInput) => {
  localePath = localePathInput;
  eventHub = eventEmitter;
  return createTransformer;
};
