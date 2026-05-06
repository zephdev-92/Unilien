#!/usr/bin/env node
/**
 * Copie les assets de Silero VAD (@ricky0123/vad-web) dans `public/` :
 *   - vad.worklet.bundle.min.js : chargé via audioWorklet.addModule(url)
 *   - silero_vad_v5.onnx        : chargé via fetch()
 *
 * `public/` est servi à la racine par Vite (dev et build), donc :
 *   - dev  : http://localhost:5173/silero_vad_v5.onnx
 *   - prod : https://unilien.app/silero_vad_v5.onnx
 *
 * Les fichiers sont gitignored (cf. .gitignore) — copiés depuis node_modules
 * à chaque dev/build, toujours synchronisés avec la version installée.
 *
 * NOTE : on ne self-host PAS les runtimes WASM d'onnxruntime-web. Ces fichiers
 * .mjs sont importés dynamiquement (ES module import()) et Vite refuse les
 * import() sur public/ ("file is in /public ... should not be imported from
 * source code"). Ils restent donc servis par cdn.jsdelivr.net (déjà autorisé
 * dans la CSP). Le worklet VAD ne pose pas ce problème car il est chargé
 * via l'API AudioWorkletNode, pas via import().
 */
import { mkdirSync, copyFileSync, existsSync } from 'node:fs'
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

// Silero VAD — modèle + worklet bundle
copySingle('node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js')
copySingle('node_modules/@ricky0123/vad-web/dist/silero_vad_v5.onnx')

console.log('✅ Voice assets copied to public/')
