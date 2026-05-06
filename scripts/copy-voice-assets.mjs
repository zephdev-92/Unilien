#!/usr/bin/env node
/**
 * Copie les assets statiques nécessaires à la nav vocale dans `public/`
 * (Silero VAD via @ricky0123/vad-web, runtime onnxruntime-web partagé avec
 * @huggingface/transformers).
 *
 * `public/` est servi à la racine par Vite (en dev et au build), donc :
 *   - en dev : http://localhost:5173/silero_vad_v5.onnx
 *   - en prod : https://unilien.app/silero_vad_v5.onnx
 *
 * Les fichiers sont gitignored (cf. .gitignore) — ils proviennent de
 * node_modules, on ne veut pas les versionner.
 *
 * Lancé automatiquement par `npm run dev` et `npm run build` via les hooks
 * `predev` et `prebuild` dans package.json.
 */
import { mkdirSync, copyFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const publicDir = join(root, 'public')

mkdirSync(publicDir, { recursive: true })

function copySingle(src, destName = basename(src)) {
  const fullSrc = join(root, src)
  if (!existsSync(fullSrc)) {
    console.warn(`⚠️  Source manquante: ${src} (skipped)`)
    return
  }
  copyFileSync(fullSrc, join(publicDir, destName))
}

function copyGlob(dir, predicate) {
  const fullDir = join(root, dir)
  if (!existsSync(fullDir)) {
    console.warn(`⚠️  Dossier manquant: ${dir} (skipped)`)
    return
  }
  for (const name of readdirSync(fullDir)) {
    if (predicate(name)) {
      copyFileSync(join(fullDir, name), join(publicDir, name))
    }
  }
}

// Silero VAD — modèle + worklet bundle
copySingle('node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js')
copySingle('node_modules/@ricky0123/vad-web/dist/silero_vad_v5.onnx')

// onnxruntime-web — runtimes WASM/MJS partagés (utilisés par VAD ET par
// @huggingface/transformers via env.backends.onnx.wasm.wasmPaths = '/')
copyGlob('node_modules/onnxruntime-web/dist', (name) => {
  return /^ort-wasm-.*\.(wasm|mjs)$/.test(name)
})

console.log('✅ Voice assets copied to public/')
