import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-config-prettier";

const browserGlobals = {
  AbortController: "readonly",
  Blob: "readonly",
  caches: "readonly",
  crypto: "readonly",
  document: "readonly",
  fetch: "readonly",
  File: "readonly",
  FileReader: "readonly",
  FormData: "readonly",
  Element: "readonly",
  localStorage: "readonly",
  navigator: "readonly",
  Response: "readonly",
  self: "readonly",
  sessionStorage: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  URL: "readonly",
  window: "readonly",
};

const nodeGlobals = {
  Buffer: "readonly",
  console: "readonly",
  process: "readonly",
};

const testGlobals = {
  describe: "readonly",
  expect: "readonly",
  it: "readonly",
  vi: "readonly",
  beforeEach: "readonly",
  afterEach: "readonly",
};

export default [
  {
    ignores: ["dist/**", "node_modules/**", "assets/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...browserGlobals,
        ...nodeGlobals,
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/set-state-in-effect": "off",
      "react/no-unescaped-entities": "off",
    },
  },
  {
    files: ["test/**/*.{js,jsx}"],
    languageOptions: {
      globals: testGlobals,
    },
  },
  prettier,
];
