import { describe, it, expect, beforeEach, vi } from 'vitest'
import { downloadExport } from './index'

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('downloadExport', () => {
  // Éléments DOM factices réutilisés dans les tests
  let mockLink: {
    href: string
    download: string
    click: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.restoreAllMocks()

    // Lien DOM factice partagé
    mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    }

    vi.spyOn(document, 'createElement').mockReturnValue(
      mockLink as unknown as HTMLElement
    )
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as unknown as Node)
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as unknown as Node)
  })

  // ============================================================
  // Cas PDF data URI
  // ============================================================

  describe('PDF data URI', () => {
    const pdfResult = {
      filename: 'bulletin.pdf',
      content: 'data:application/pdf;base64,AAAA',
      mimeType: 'application/pdf',
    }

    it('devrait créer un élément <a>', () => {
      downloadExport(pdfResult)

      expect(document.createElement).toHaveBeenCalledWith('a')
    })

    it('devrait assigner href avec le contenu data URI', () => {
      downloadExport(pdfResult)

      expect(mockLink.href).toBe('data:application/pdf;base64,AAAA')
    })

    it('devrait assigner download avec le nom de fichier', () => {
      downloadExport(pdfResult)

      expect(mockLink.download).toBe('bulletin.pdf')
    })

    it('devrait appeler appendChild avant click', () => {
      const order: string[] = []
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => {
        order.push('appendChild')
        return mockLink as unknown as Node
      })
      mockLink.click.mockImplementation(() => order.push('click'))

      downloadExport(pdfResult)

      expect(order.indexOf('appendChild')).toBeLessThan(order.indexOf('click'))
    })

    it('devrait appeler link.click()', () => {
      downloadExport(pdfResult)

      expect(mockLink.click).toHaveBeenCalledOnce()
    })

    it('devrait appeler removeChild après click', () => {
      downloadExport(pdfResult)

      expect(document.body.removeChild).toHaveBeenCalledWith(mockLink)
    })

    it('ne devrait PAS appeler URL.createObjectURL pour un PDF data URI', () => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')

      downloadExport(pdfResult)

      expect(URL.createObjectURL).not.toHaveBeenCalled()
    })

    it('ne devrait PAS appeler URL.revokeObjectURL pour un PDF data URI', () => {
      vi.spyOn(URL, 'revokeObjectURL')

      downloadExport(pdfResult)

      expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    })

    it('devrait ignorer un PDF dont le contenu ne commence pas par "data:"', () => {
      // Si content ne commence pas par "data:", la branche PDF n'est pas prise
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
      vi.spyOn(URL, 'revokeObjectURL')

      downloadExport({
        filename: 'bulletin.pdf',
        content: 'not-a-data-uri',
        mimeType: 'application/pdf',
      })

      // La branche CSV/Blob doit être prise à la place
      expect(URL.createObjectURL).toHaveBeenCalled()
      expect(URL.revokeObjectURL).toHaveBeenCalled()
    })
  })

  // ============================================================
  // Cas CSV / non-PDF
  // ============================================================

  describe('CSV / format non-PDF', () => {
    const csvResult = {
      filename: 'declaration.csv',
      content: 'col1;col2\nval1;val2',
      mimeType: 'text/csv',
    }

    beforeEach(() => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
      vi.spyOn(URL, 'revokeObjectURL')
    })

    it('devrait créer un Blob avec le BOM UTF-8 préfixé au contenu', () => {
      const BlobSpy = vi.spyOn(globalThis, 'Blob')

      downloadExport(csvResult)

      expect(BlobSpy).toHaveBeenCalledWith(
        ['\uFEFF' + csvResult.content],
        { type: csvResult.mimeType }
      )
    })

    it('devrait appeler URL.createObjectURL avec le Blob', () => {
      downloadExport(csvResult)

      expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    })

    it('devrait créer un élément <a>', () => {
      downloadExport(csvResult)

      expect(document.createElement).toHaveBeenCalledWith('a')
    })

    it('devrait assigner href avec l\'URL blob retournée par createObjectURL', () => {
      downloadExport(csvResult)

      expect(mockLink.href).toBe('blob:mock')
    })

    it('devrait assigner download avec le nom de fichier', () => {
      downloadExport(csvResult)

      expect(mockLink.download).toBe('declaration.csv')
    })

    it('devrait appeler appendChild avant click', () => {
      const order: string[] = []
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => {
        order.push('appendChild')
        return mockLink as unknown as Node
      })
      mockLink.click.mockImplementation(() => order.push('click'))

      downloadExport(csvResult)

      expect(order.indexOf('appendChild')).toBeLessThan(order.indexOf('click'))
    })

    it('devrait appeler link.click()', () => {
      downloadExport(csvResult)

      expect(mockLink.click).toHaveBeenCalledOnce()
    })

    it('devrait appeler removeChild après click', () => {
      downloadExport(csvResult)

      expect(document.body.removeChild).toHaveBeenCalledWith(mockLink)
    })

    it('devrait appeler URL.revokeObjectURL avec l\'URL blob', () => {
      downloadExport(csvResult)

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
    })

    it('devrait appeler revokeObjectURL après removeChild', () => {
      const order: string[] = []
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => {
        order.push('removeChild')
        return mockLink as unknown as Node
      })
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {
        order.push('revokeObjectURL')
      })

      downloadExport(csvResult)

      expect(order.indexOf('removeChild')).toBeLessThan(order.indexOf('revokeObjectURL'))
    })

    it('devrait fonctionner pour mimeType text/plain', () => {
      downloadExport({
        filename: 'export.txt',
        content: 'Hello world',
        mimeType: 'text/plain',
      })

      expect(URL.createObjectURL).toHaveBeenCalled()
      expect(mockLink.download).toBe('export.txt')
      expect(mockLink.click).toHaveBeenCalledOnce()
    })
  })
})
