module.exports = {
   env: {
      browser: true,
      es2021: true,
   },
   extends: [
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended",
      "prettier",
      "plugin:@typescript-eslint/recommended-requiring-type-checking",
   ],
   parser: "@typescript-eslint/parser",
   parserOptions: {
      ecmaVersion: 13,
      sourceType: "module",
      project: ["./tsconfig.json"],
      tsconfigRootDir: __dirname,
   },
   plugins: ["@typescript-eslint"],
   ignorePatterns: ["node_modules", "dist"],
}
