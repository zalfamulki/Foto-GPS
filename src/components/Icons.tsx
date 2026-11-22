interface IconProps {
  size?: number
  className?: string
}

function svgProps(size: number, className?: string) {
  return {
    viewBox: '0 0 24 24',
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    'aria-hidden': true,
  } as const
}

export function IconCamera({ size = 24, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6a2 2 0 0 0 1.7-.94l.5-.81a1 1 0 0 1 .83-.25h1.74a1 1 0 0 1 .83.25l.5.81A2 2 0 0 0 15.9 6h1.6A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
      <circle cx="12" cy="12.5" r="3.4" />
    </svg>
  )
}

export function IconGallery({ size = 24, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="9.5" r="1.6" />
      <path d="M3.5 15.5 8.6 11l4 3.6 2.8-2.4 5.1 4.3" />
    </svg>
  )
}

export function IconSliders({ size = 24, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M4 7h3" />
      <circle cx="11" cy="7" r="2" />
      <path d="M14 7h6" />
      <path d="M4 12h7" />
      <circle cx="15" cy="12" r="2" />
      <path d="M18 12h2" />
      <path d="M4 17h4" />
      <circle cx="12" cy="17" r="2" />
      <path d="M15 17h5" />
    </svg>
  )
}

export function IconPin({ size = 24, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 21s-6.5-5.4-6.5-10.2a6.5 6.5 0 0 1 13 0C18.5 15.6 12 21 12 21z" />
      <circle cx="12" cy="10.6" r="2.3" />
    </svg>
  )
}

export function IconFlip({ size = 24, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M17 3.5v3.5h-3.5" />
      <path d="M16.9 6.6A7 7 0 0 0 5.6 9.3" />
      <path d="M7 20.5V17h3.5" />
      <path d="M7.1 17.4a7 7 0 0 0 11.3-2.7" />
    </svg>
  )
}

export function IconUpload({ size = 24, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 15V4.5" />
      <path d="m7.5 9 4.5-4.5L16.5 9" />
      <path d="M5 19h14" />
    </svg>
  )
}

export function IconClose({ size = 24, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  )
}

export function IconDownload({ size = 24, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 4v10.5" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M5 19h14" />
    </svg>
  )
}
