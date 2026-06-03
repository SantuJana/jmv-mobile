# JMV Mobile

React Native + Expo mobile app for the JMV grocery ecommerce platform.

## Getting Started

```bash
npm install
cp .env.example .env
npm run start
```

## API Base URL

Set `EXPO_PUBLIC_API_BASE_URL` in `.env` based on where the app runs:

- iOS simulator: `http://localhost:5000/api/v1`
- Android emulator: `http://10.0.2.2:5000/api/v1`
- Physical device: `http://<your-machine-lan-ip>:5000/api/v1`

## Scripts

- `npm run start` - start Expo dev server
- `npm run android` - run app in Android emulator
- `npm run ios` - run app in iOS simulator
- `npm run web` - run app in web preview
- `npm run build:android:preview` - create an installable Android APK that does not need an Expo dev server
- `npm run build:android:production` - create an Android App Bundle for store upload
- `npm run typecheck` - run TypeScript checks

## Installable Test Build

Use the preview EAS profile when you want an APK that can be installed on an Android phone and tested without running `npm run start` or any Expo dev server:

```bash
npx eas-cli login
npm run build:android:preview
```

When the build finishes, EAS will provide an APK download link. Install that APK on your device. The app will use `https://api-jmv.vercel.app/api/v1` from the `preview` build profile.

## Included Starter Flows

- Customer login and register
- Category and product listing
- Add-to-cart, update quantity, remove, clear cart
- View customer orders (`/orders/mine`)
