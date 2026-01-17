import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/language-detection.inline"

const LanguageDetection: QuartzComponent = () => {
  return null // This component only adds scripts, no UI
}

LanguageDetection.afterDOMLoaded = script

export default (() => LanguageDetection) satisfies QuartzComponentConstructor
