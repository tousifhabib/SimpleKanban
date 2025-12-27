import js from "@eslint/js";
import prettier from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

export default [
  {
    files: ["**/*.js"],
    ignores: ["node_modules/**", "dist/**"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },

    plugins: {
      prettier,
    },

    rules: {
      ...js.configs.recommended.rules,
      ...prettierConfig.rules,

      "prettier/prettier": "error",
    },
  },
];
