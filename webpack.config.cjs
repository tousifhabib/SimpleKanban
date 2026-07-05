const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const WebpackObfuscator = require('webpack-obfuscator');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: {
      main: ['./js/index.js', './css/styles.css', './css/gantt.css'],
    },

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'bundle.[contenthash].js',
      clean: true,
    },

    devtool: isProduction ? false : 'eval-source-map',

    devServer: {
      port: 8080,
      hot: false,
    },

    module: {
      rules: [
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
          ],
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'fonts/[name][ext][query]',
          },
        },
      ],
    },

    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          parallel: false,
        }),
      ],
    },

    plugins: [
      isProduction &&
        new WebpackObfuscator({
          rotateStringArray: true,
          stringArray: true,
          stringArrayThreshold: 0.75,
          deadCodeInjection: true,
          deadCodeInjectionThreshold: 0.4,
          controlFlowFlattening: true,
          controlFlowFlatteningThreshold: 0.75,
          splitStrings: true,
          splitStringsChunkLength: 5,
          simplify: true,
          disableConsoleOutput: true,
        }),

      new HtmlWebpackPlugin({
        template: './index.html',
        minify: isProduction && {
          removeComments: true,
          collapseWhitespace: true,
        },
      }),

      isProduction &&
        new MiniCssExtractPlugin({
          filename: 'styles.[contenthash].css',
        }),
    ].filter(Boolean),
  };
};
