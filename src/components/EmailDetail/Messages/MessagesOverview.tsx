import { memo, useEffect, useState } from 'react'
import CircularProgress from '@mui/material/CircularProgress'
import EmailDetailOptions from './EmailDetailOptions'
import DraftMessage from './DisplayVariants/DraftMessage'
import ReadUnreadMessage from './DisplayVariants/ReadUnreadMessage'
import ComposeEmail from '../../Compose/ComposeEmail'
import * as local from '../../../constants/emailDetailConstants'
import * as global from '../../../constants/globalConstants'
import * as ES from '../EmailDetailStyles'
import {
  IEmailListThreadItem,
  IEmailMessage,
} from '../../../Store/storeTypes/emailListTypes'
import { useAppDispatch } from '../../../Store/hooks'
import markEmailAsRead from '../../../utils/markEmailAsRead'
import findPayloadHeadersData from '../../../utils/findPayloadHeadersData'
import convertToContact from '../../../utils/convertToContact'
import findPayloadData from '../../../utils/findPayloadBodyData'
import { decodeBase64 } from '../../../utils/decodeBase64'

const fromEmail = (threadDetail: IEmailListThreadItem) => {
  const query = 'From'
  if (threadDetail) {
    const data: string = findPayloadHeadersData(query, threadDetail)
    return convertToContact(data)
  }
  return null
}

const bccEmail = (threadDetail: IEmailListThreadItem) => {
  const query = 'Bcc'
  if (threadDetail) {
    const data: string = findPayloadHeadersData(query, threadDetail)
    return convertToContact(data)
  }
  return null
}

const ccEmail = (threadDetail: IEmailListThreadItem) => {
  const query = 'Cc'
  if (threadDetail) {
    const data: string = findPayloadHeadersData(query, threadDetail)
    return convertToContact(data)
  }
  return null
}

const emailSubject = (threadDetail: IEmailListThreadItem) => {
  const query = 'Subject'
  if (threadDetail) {
    return findPayloadHeadersData(query, threadDetail)
  }
  return null
}

const emailBody = (
  threadDetail: IEmailListThreadItem,
  selectedIndex: number
) => {
  const query = 'Body'
  if (threadDetail) {
    return decodeBase64(findPayloadData(query, threadDetail, selectedIndex))
  }
  return null
}

interface IDetailDisplaySelector {
  message: IEmailMessage
  threadDetail: IEmailListThreadItem
  index: number
  setUnsubscribeLink: Function
  setContentRendered: (value: boolean) => void
  indexMessageListener: (value: number) => void
}

const DetailDisplaySelector = ({
  message,
  threadDetail,
  index,
  setUnsubscribeLink,
  setContentRendered,
  indexMessageListener,
}: IDetailDisplaySelector) => {
  if (Object.prototype.hasOwnProperty.call(message, 'labelIds')) {
    if (message.labelIds.includes(global.DRAFT_LABEL)) {
      return (
        <DraftMessage
          message={message}
          draftIndex={index}
          indexMessageListener={indexMessageListener}
        />
      )
    }
    return (
      <ReadUnreadMessage
        message={message}
        threadDetail={threadDetail}
        messageIndex={index}
        setUnsubscribeLink={setUnsubscribeLink}
        setContentRendered={setContentRendered}
      />
    )
  }
  return (
    <ReadUnreadMessage
      message={message}
      threadDetail={threadDetail}
      messageIndex={index}
      setUnsubscribeLink={setUnsubscribeLink}
      setContentRendered={setContentRendered}
    />
  )
}

const MappedMessages = ({
  threadDetail,
  setUnsubscribeLink,
  setContentRendered,
  indexMessageListener,
}: {
  threadDetail: IEmailListThreadItem
  setUnsubscribeLink: Function
  setContentRendered: (value: boolean) => void
  indexMessageListener: (value: number) => void
}) =>
  threadDetail.messages ? (
    <>
      {threadDetail.messages
        .slice(0)
        .reverse()
        .map((message, index) => (
          <div key={message.id}>
            <DetailDisplaySelector
              message={message}
              threadDetail={threadDetail}
              index={index}
              setUnsubscribeLink={setUnsubscribeLink}
              setContentRendered={setContentRendered}
              indexMessageListener={indexMessageListener}
            />
          </div>
        ))}
    </>
  ) : (
    <p>{global.NOTHING_TO_SEE}</p>
  )

interface IMessagesOverview {
  threadDetail: IEmailListThreadItem
  isLoading: boolean
  isReplying: boolean
  isForwarding: boolean
  labelIds: string[]
  setContentRendered: (value: boolean) => void
}

const MessagesOverview = memo(
  ({
    threadDetail,
    isLoading,
    isReplying,
    isForwarding,
    labelIds,
    setContentRendered,
  }: IMessagesOverview) => {
    const dispatch = useAppDispatch()
    const [unsubscribeLink, setUnsubscribeLink] = useState<string | null>(null)
    // Create a local copy of threadDetail to manipulate. Is used by discarding and opening a threadDetail draft.
    const [localThreadDetail, setLocalThreadDetail] =
      useState<IEmailListThreadItem | null>(null)
    const [selectedIndex, setSelectedIndex] = useState<number | undefined>(
      undefined
    )

    useEffect(() => {
      setLocalThreadDetail(threadDetail)
    }, [threadDetail])

    const messageOverviewListener = (messageId: string) => {
      if (localThreadDetail && localThreadDetail.messages) {
        setLocalThreadDetail({
          ...localThreadDetail,
          messages: localThreadDetail.messages.filter(
            (message) => message.id !== messageId
          ),
        })
      }
    }

    useEffect(() => {
      if (localThreadDetail && Object.keys(localThreadDetail).length > 0) {
        if (
          localThreadDetail.messages &&
          localThreadDetail.messages.length > 0
        ) {
          if (
            localThreadDetail.messages.filter(
              (message) =>
                message.labelIds?.includes(global.UNREAD_LABEL) === true
            ).length > 0
          ) {
            markEmailAsRead({
              messageId: localThreadDetail.id,
              dispatch,
              labelIds,
            })
          }
        }
      }
    }, [localThreadDetail])

    /**
     * @function indexMessageListener
     * This function will listen to the selected draft messsage. This is used to get a body value when opening the composer.
     * @param value - number of the index of the selected Draft Message
     * @returns {void} - returns the found object or undefined if not found as a change on the state.
     */
    const indexMessageListener = (value: number) => {
      console.log(value)
      console.log(
        localThreadDetail?.messages &&
          localThreadDetail.messages[
            localThreadDetail.messages.length - 1 - value
          ]
      )
      setSelectedIndex(value)
    }

    return (
      <>
        <ES.DetailRow>
          <ES.EmailDetailContainer tabbedView={isReplying || isForwarding}>
            <ES.DetailBase>
              <ES.CardFullWidth>
                {localThreadDetail?.messages && !isLoading ? (
                  <MappedMessages
                    threadDetail={localThreadDetail}
                    setUnsubscribeLink={setUnsubscribeLink}
                    setContentRendered={setContentRendered}
                    indexMessageListener={indexMessageListener}
                  />
                ) : (
                  <ES.LoadingErrorWrapper>
                    <CircularProgress />
                  </ES.LoadingErrorWrapper>
                )}
                {!localThreadDetail && (
                  <ES.LoadingErrorWrapper>
                    {isLoading && <CircularProgress />}
                    {!isLoading && <p>{local.ERROR_EMAIL}</p>}
                  </ES.LoadingErrorWrapper>
                )}
              </ES.CardFullWidth>
            </ES.DetailBase>
          </ES.EmailDetailContainer>
          {localThreadDetail &&
            !isReplying &&
            !isForwarding &&
            localThreadDetail.messages && (
              <EmailDetailOptions
                threadDetail={localThreadDetail}
                unsubscribeLink={unsubscribeLink}
              />
            )}
        </ES.DetailRow>
        {isReplying && localThreadDetail && localThreadDetail.messages && (
          <ES.ComposeWrapper>
            <ComposeEmail
              to={fromEmail(localThreadDetail)}
              cc={ccEmail(localThreadDetail)}
              bcc={bccEmail(localThreadDetail)}
              subject={emailSubject(localThreadDetail)}
              foundBody={
                selectedIndex !== undefined
                  ? emailBody(
                      localThreadDetail,
                      localThreadDetail.messages.length - 1 - selectedIndex
                    )
                  : undefined
              }
              threadId={localThreadDetail.id}
              messageOverviewListener={messageOverviewListener}
            />
          </ES.ComposeWrapper>
        )}
        {isForwarding && localThreadDetail && localThreadDetail.messages && (
          <ES.ComposeWrapper>
            <ComposeEmail
              subject={emailSubject(localThreadDetail)}
              threadId={localThreadDetail.id}
              messageOverviewListener={messageOverviewListener}
            />
          </ES.ComposeWrapper>
        )}
      </>
    )
  }
)
export default MessagesOverview
