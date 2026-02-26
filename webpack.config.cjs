const path = require('path');

module.exports = {
  entry: './src/app.js',
  output: {
    filename: 'app.js',
    path: path.resolve(__dirname, 'public/assets'),
    clean: true,
  },
  mode: 'production',
  devtool: false,
};
