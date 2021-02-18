const ts = require('typescript');

const { factory } = ts;
let eventHub;

let nsSourceMap;
let targetVariable;

function createTransformer(sourceMap, exclude) {
  nsSourceMap = sourceMap;
  eventHub.on('onLocaleFileChange', (sm) => {
    nsSourceMap = sm;
  });

  return (context) => {
    let fileName;
    const visitor = (node) => {
      if (ts.isSourceFile(node)) { // 如果是文件入口，开始遍历子节点
        fileName = node.fileName; // 记录下当前的文件名，如果有翻译内容，结束后自动重新save
        if (fileName.includes('node_modules')) {
          return node;
        }
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
            identifierExpression.escapedText === targetVariable
          ) {
            const { arguments: args } = callExpression;
            const params = args.map((arg) => arg.text);
            const zhWord = params[0];
            const ns = params[1] || 'default';
            const nsResources = nsSourceMap[ns] || {};
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

      if (node.getChildCount()) {
        return ts.visitEachChild(node, visitor, context);
      }
      return node;
    };

    return (node) => ts.visitNode(node, visitor);
  };
}

module.exports = (eventEmitter, options) => {
  const { targetVariable: tv } = options;
  targetVariable = tv;
  eventHub = eventEmitter;
  return createTransformer;
};
