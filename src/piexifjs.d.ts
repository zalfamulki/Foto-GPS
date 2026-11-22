declare module 'piexifjs' {
  interface ExifObj {
    '0th'?: Record<number, unknown>
    Exif?: Record<number, unknown>
    GPS?: Record<number, unknown>
    '1st'?: Record<number, unknown>
  }

  const piexif: {
    version: string
    dump(obj: ExifObj): string
    insert(exifStr: string, jpegDataUrl: string): string
    load(jpegData: string): ExifObj
    remove(jpegDataUrl: string): string
    ImageIFD: Record<string, number>
    ExifIFD: Record<string, number>
    GPSIFD: Record<string, number>
    InteropIFD: Record<string, number>
    TAGS: Record<string, unknown>
    GPSHelper: {
      degToDms(deg: number): { degrees: number; minutes: number; seconds: number }
      degToDmsRational(deg: number): [number, number][]
    }
  }

  export default piexif
}
