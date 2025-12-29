# Creating App Icon for Electron

For Windows Electron apps, you need an `.ico` file (multi-resolution icon) or a `.png` file.

## Option 1: Use Online Converter (Recommended)

1. Go to: https://convertio.co/svg-ico/ or https://cloudconvert.com/svg-to-ico
2. Upload `public/app-icon.svg`
3. Download the `.ico` file
4. Save it as `public/app-icon.ico`

## Option 2: Use ImageMagick (Command Line)

If you have ImageMagick installed:
```bash
magick convert public/app-icon.svg -resize 256x256 public/app-icon.ico
```

## Option 3: Use Simple PNG

1. Convert SVG to PNG (256x256) using any online tool
2. Save as `public/app-icon.png`
3. Update package.json to use `public/app-icon.png`

## After Creating Icon

Update `package.json`:
- Change `"icon": "public/logo-Photoroom.png"` to `"icon": "public/app-icon.ico"` (or `.png`)

Update `electron/main.js`:
- Change icon path references to use the new icon












