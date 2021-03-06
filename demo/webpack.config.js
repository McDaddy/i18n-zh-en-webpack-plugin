const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const tsAutoI18nPlugin = require('../src/index');

const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  mode: isProd ? 'production' : 'development',
  devtool: false,
  entry: './src/index.tsx',
  output: {
    path: path.join(__dirname, './public'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.js', '.jsx', '.tsx', '.ts', '.d.ts'],
  },
  module: {
    rules: [
      {
        test: /\.(tsx?|jsx?)$/,
        include: [path.resolve(__dirname, './src')],
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              getCustomTransformers: () => ({
                before: [
                  tsAutoI18nPlugin({
                    ns: ['default', 'common', 'myNs'],
                    localePath: path.resolve(__dirname, './src/locales'),
                    include: [path.resolve(__dirname, './src')],
                    lowerCaseFirstLetter: false,
                    // targetVariable: 'i18next',
                  }),
                ],
              }),
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html',
    }),
  ],
  devServer: {
    host: '127.0.0.1',
    port: 20001,
    compress: true,
    contentBase: path.join(__dirname, 'public'),
    index: 'index.html',
    open: true,
    hot: true,
    https: true,
    allowedHosts: [
      '*',
    ],
    watchOptions: {
      ignored: [
        'node_modules', 'public',
      ],
    },
    disableHostCheck: true,
    noInfo: false,
    progress: false,
    historyApiFallback: true,
    watchContentBase: false,
    liveReload: false,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
};
