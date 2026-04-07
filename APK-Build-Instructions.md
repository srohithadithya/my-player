# Building AuraPlay as an Android APK

Since AuraPlay is built using modern web technologies (React + Vite), the easiest and most performant way to turn it into an Android application (.apk) is by using **CapacitorJS**. Capacitor acts as a bridge between the web app and native mobile functions.

Follow these steps directly in your `my player` project folder to generate your APK:

## 1. Install Capacitor
First, run these commands in the terminal inside your `my player` folder to install the Capacitor core and CLI tools:

```bash
npm install @capacitor/core
npm install -D @capacitor/cli
```

## 2. Initialize Capacitor
Run the initialization command. When prompted, you can name the app "AuraPlay" and the App ID something like "com.auraplay.app":

```bash
npx cap init
```

*Note: In the generated `capacitor.config.ts`, make sure the `webDir` is set to `dist` (which is standard for Vite).*

## 3. Add the Android Platform
Next, add the Android package and platform tools to your project:

```bash
npm install @capacitor/android
npx cap add android
```

## 4. Build Your Web Assets
Capacitor works by taking a compiled version of your web app. Run building command first to generate the `dist` folder:

```bash
npm run build
```

## 5. Sync Web Code to Native App
Sync the newly built React code over to your Android wrapper folder:

```bash
npx cap sync android
```

## 6. Open Android Studio & Build APK
Finally, use Android Studio to compile the `.apk` file:
1. Open the project in Android Studio by running:
   ```bash
   npx cap open android
   ```
2. Wait for Android Studio to index the files and download Gradle dependencies.
3. In the top toolbar, go to **Build -> Build Bundle(s) / APK(s) -> Build APK(s)**.
4. Once completed, Android Studio will show a popup on the bottom right. Click **Locate**, and there you will find your generated `.apk` file!

You can then test the APK on your mobile device by saving it to your phone or running an emulator from Android Studio directly.
