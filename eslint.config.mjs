import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([
    globalIgnores(["**/node_modules", "**/.cache", "**/public", "**/.next", "**/data"]),
    {
        extends: [
            ...compat.extends("eslint:recommended"),
            ...compat.extends("plugin:prettier/recommended"),
            ...compat.extends("plugin:react/recommended")
        ],

        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.browser,
            },

            ecmaVersion: 2020,
            sourceType: "module",
        },

        rules: {
            "object-curly-spacing": ["error", "always"],
            "react/prop-types": 0,
            "linebreak-style": "off",

            "prettier/prettier": ["error", {
                endOfLine: "lf",
            }],
        },
    },
]);