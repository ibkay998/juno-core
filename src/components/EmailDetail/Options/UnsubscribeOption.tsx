import { useCallback } from 'react'
import { FiSlash } from 'react-icons/fi'
import modifierKey from '../../../utils/setModifierKey'
import CustomButton from '../../Elements/Buttons/CustomButton'
import * as global from '../../../constants/globalConstants'
import { useAppSelector } from '../../../store/hooks'
import { selectInSearch } from '../../../store/utilsSlice'
import useMultiKeyPress from '../../../Hooks/useMultiKeyPress'

const handleUnsubscribe = (link: string) => {
  window.open(link)
}

const actionKeys = [modifierKey, global.KEY_SHIFT, global.KEY_U]
const UNSUBSCRIBE = 'Unsubscribe'

const UnsubscribeOption = ({
  unsubscribeLink,
}: {
  unsubscribeLink: string
}) => {
  const inSearch = useAppSelector(selectInSearch)

  const handleEvent = useCallback(() => {
    handleUnsubscribe(unsubscribeLink)
  }, [unsubscribeLink])

  useMultiKeyPress(handleEvent, actionKeys, inSearch)

  return (
    <CustomButton
      icon={<FiSlash />}
      label={UNSUBSCRIBE}
      onClick={handleEvent}
      suppressed
    />
  )
}

export default UnsubscribeOption
