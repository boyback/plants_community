# 肉友社 Mobile

Expo + React Native mobile app for iOS and Android.

## Requirements

- Node.js 20.20.2 or newer compatible Node 20/22.
- npm.

## Commands

```bash
npm install
npm run start
npm run android
npm run ios
npm run typecheck
```

## API

The app reads the API host from:

```bash
EXPO_PUBLIC_API_BASE_URL=https://plantcommunity.cn
```

Copy `.env.example` to `.env.local` when local overrides are needed.

## Current Note

This app lives under the existing Next.js repository. `expo-doctor` may report a duplicate `react` dependency because it also detects the parent web project's `node_modules/react`. Mobile TypeScript checks pass, and mobile autolinking is limited to `./node_modules` in `package.json`.
