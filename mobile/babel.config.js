module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Alias '@' -> ./src để Metro resolve import '@/...' lúc runtime
      // (tsconfig đã khai báo paths cho TypeScript; plugin này lo phần bundler).
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: { '@': './src' },
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      ],
    ],
  };
};
