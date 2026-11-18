// Renders the SVG sources next to this file into the PNGs @capacitor/assets reads from mobile/assets/.
// Usage: NODE_PATH=<dir with sharp> node mobile/assets/source/render.cjs
const path = require('path');
const sharp = require('sharp');
const names = ['icon-only', 'icon-foreground', 'icon-background', 'splash'];
Promise.all(
  names.map((name) =>
    sharp(path.join(__dirname, `${name}.svg`), { density: 72 })
      .png()
      .toFile(path.join(__dirname, '..', `${name}.png`)),
  ),
).then(() => console.log('rendered', names.join(', ')));
