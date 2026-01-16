import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import Content from "./Content"
import ContentWithBacklinks from "./ContentWithBacklinks"

const ConditionalContent: QuartzComponent = (props: QuartzComponentProps) => {
  const slug = props.fileData.slug || ""
  const isProjectsPage = slug.startsWith("projects/")
  const isHandlersPage = slug.startsWith("handlers/")
  
  if (isProjectsPage || isHandlersPage) {
    return <ContentWithBacklinks {...props} />
  }
  
  return <Content {...props} />
}

export default (() => ConditionalContent) satisfies QuartzComponentConstructor
