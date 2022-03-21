module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  settings: {
    "preact-i18n": {
      languageFiles: [
        { name: "bg", path: "src/translations/bg.json" },
        { name: "en", path: "src/translations/en.json" },
        { name: "es", path: "src/translations/es.json" },
        { name: "fr", path: "src/translations/fr.json" },
        { name: "pt", path: "src/translations/pt.json" },
        { name: "zh", path: "src/translations/zh.json" },
      ],
    },
  },
};
