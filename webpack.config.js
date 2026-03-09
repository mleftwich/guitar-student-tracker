const path = require("path");
const fs   = require("fs");
const HtmlWebpackPlugin = require("html-webpack-plugin");

// Copies static files from public/ into dist/ without an extra npm package
class CopyPublicPlugin {
  apply(compiler) {
    compiler.hooks.emit.tapAsync("CopyPublicPlugin", (compilation, cb) => {
      ["manifest.json", "sw.js", "favicon.svg"].forEach(file => {
        const src = path.resolve(__dirname, "public", file);
        if (fs.existsSync(src)) {
          const content = fs.readFileSync(src, "utf8");
          compilation.assets[file] = { source: () => content, size: () => Buffer.byteLength(content) };
        }
      });
      cb();
    });
  }
}

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
    new CopyPublicPlugin(),
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
