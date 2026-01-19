# EAS Workflows - Build Strategy

## 🎯 Build Strategy (Hemat Credits)

Untuk menghemat EAS build credits (10 free builds/bulan), workflow dikonfigurasi sebagai berikut:

### **Production Build (Auto-trigger)**
- **Trigger:** Push tag version (v1.0.0, v1.1.0, dll)
- **Actions:** Build AAB + Auto-submit ke Google Play Internal Testing
- **File:** `.eas/workflows/production-build.yml`

**Cara trigger:**
```bash
# 1. Commit changes
git add .
git commit -m "Release v1.0.0"

# 2. Create & push tag
git tag v1.0.0
git push origin v1.0.0

# Workflow akan auto-trigger build & submit
```

---

### **Preview Build (Manual trigger)**
- **Trigger:** Manual dari EAS dashboard
- **Actions:** Build APK untuk testing
- **File:** `.eas/workflows/preview-build.yml`

**Cara trigger:**
1. Buka: https://expo.dev/accounts/hackwit/projects/pirinku/workflows
2. Pilih workflow "Preview Build"
3. Klik "Run workflow"

---

### **Pull Request Check (Auto-trigger)**
- **Trigger:** Pull request ke main/develop
- **Actions:** Lint & type check (tidak build)
- **File:** `.eas/workflows/pull-request-check.yml`
- **Cost:** GRATIS (tidak pakai build credits)

---

### **Manual Build (CLI)**
Untuk testing lokal atau build manual:

```bash
# Build production
npx eas build --platform android --profile production

# Build preview
npx eas build --platform android --profile preview

# Submit manual
npx eas submit --platform android --profile production
```

---

## 💰 Estimasi Penggunaan Build Credits

Dengan strategi ini:
- **Production release:** 1-2 builds/bulan (saat push tag)
- **Preview/testing:** 0 builds (pakai lokal atau manual trigger)
- **PR checks:** 0 builds (hanya lint/type check)

**Total:** ~2-3 builds/bulan dari 10 yang tersedia ✅

---

## 🏠 Build Lokal (Gratis Unlimited)

Untuk development sehari-hari:

```bash
# Run di emulator/device
npx expo run:android

# Atau
npm run android
```

Tidak pakai EAS cloud, gratis unlimited!

---

## 📝 Release Checklist

Saat mau release version baru:

1. ✅ Update version di `app.json` (opsional, auto-increment aktif)
2. ✅ Commit semua changes
3. ✅ Create tag: `git tag v1.x.x`
4. ✅ Push tag: `git push origin v1.x.x`
5. ✅ Workflow auto-trigger → Build → Submit
6. ✅ Cek di Google Play Console → Internal Testing

Done! 🎉
