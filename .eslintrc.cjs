module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true }
  },
  settings: {
    "import/resolver": {
      typescript: {
        project: "./tsconfig.json"
      }
    },
    "boundaries/include": ["src/**/*"],
    "boundaries/elements": [
      { type: "entry", pattern: "src/main.tsx" },
      { type: "app", pattern: "src/app/**" },
      { type: "processes", pattern: "src/processes/**" },
      { type: "pages", pattern: "src/pages/**" },
      { type: "widgets", pattern: "src/widgets/**" },
      { type: "features", pattern: "src/features/**" },
      { type: "entities", pattern: "src/entities/**" },
      { type: "shared", pattern: "src/shared/**" }
    ]
  },
  plugins: ["react-hooks", "react-refresh", "@typescript-eslint", "boundaries"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended"
  ],
  rules: {
    "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    "boundaries/element-types": [
      "error",
      {
        default: "disallow",
        rules: [
          { from: "entry", allow: ["app", "shared"] },
          { from: "app", allow: ["processes", "pages", "widgets", "features", "entities", "shared"] },
          { from: "processes", allow: ["pages", "widgets", "features", "entities", "shared"] },
          { from: "pages", allow: ["widgets", "features", "entities", "shared"] },
          { from: "widgets", allow: ["features", "entities", "shared"] },
          { from: "features", allow: ["entities", "shared"] },
          { from: "entities", allow: ["shared"] },
          { from: "shared", allow: ["shared"] }
        ]
      }
    ]
  }
};
