module.exports = (api) => {
  const isTest = api.env('test')
  // You can use isTest to determine what presets and plugins to use.

  return {
    presets: ['@babel/preset-env', '@babel/preset-typescript'],
  }
}
