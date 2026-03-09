const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].[contenthash].js",
    clean: true,
    publicPath: "/",
  },
  resolve: { extensions: [".js", ".jsx"] },
  module: {
    rules: [{
      test: /\.(js|jsx)$/,
      exclude: /node_modules/,
      use: {
        loader: "babel-loader",
        options: { presets: ["@babel/preset-env", "@babel/preset-react"] },
      },
    }],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: "./public/index.html" }),
  ],
  devServer: {
    historyApiFallback: true,
    hot: true,
    port: 3000,
    proxy: [{
      context: ["/api"],
      target: "http://localhost:8888",
    }],
  },
};
