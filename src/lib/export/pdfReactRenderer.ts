/**
 * Moteur de rendu React PDF → data URI.
 * Remplace l'ancien pipeline html2canvas → jsPDF.
 * Produit du PDF vectoriel (texte net et sélectionnable).
 */
import { pdf } from '@react-pdf/renderer'
import type { ReactElement } from 'react'

export async function renderReactPdf(element: ReactElement): Promise<string> {
  const blob = await pdf(element).toBlob()
  return blobToDataUri(blob)
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
