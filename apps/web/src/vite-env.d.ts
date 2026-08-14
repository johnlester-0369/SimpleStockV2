/**
 * Type declarations for vite-plugin-svgr
 * Allows importing SVG files as React components using ?react suffix
 *
 * @example
 * import Logo from './logo.svg?react'
 * <Logo className="w-6 h-6" />
 */
declare module '*.svg?react' {
  import type React from 'react'
  const SVGComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>
  export default SVGComponent
}

/**
 * Type declaration for regular SVG imports
 */
declare module '*.svg' {
  const content: string
  export default content
}
