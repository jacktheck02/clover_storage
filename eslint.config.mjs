import eslintConfigNext from "eslint-config-next";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".open-next/**",
      ".wrangler/**",
      "migration-output/**",
    ],
  },
  ...eslintConfigNext,
];

export default eslintConfig;
