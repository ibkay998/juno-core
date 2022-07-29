import styled from 'styled-components'
import * as GS from '../../../styles/globalStyles'

const Wrapper = styled.div`
  display: flex;
  flex-flow: column;
  justify-content: center;
  align-items: center;
  user-select: none;
`

const SVGWrapper = styled.div`
  min-width: 200px;
  width: 100vw;
  max-width: 400px;
  height: auto;
`

const EmptyStateTemplate = ({
  header,
  paragraph,
  SVG,
}: {
  header: string
  paragraph: string
  SVG: JSX.Element
}) => (
  <Wrapper>
    <SVGWrapper>{SVG}</SVGWrapper>
    <p>
      <strong>{header}</strong>
    </p>
    <GS.TextMutedParagraph style={{ marginTop: 0 }}>
      {paragraph}
    </GS.TextMutedParagraph>
  </Wrapper>
)

export default EmptyStateTemplate