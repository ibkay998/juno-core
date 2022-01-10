/* eslint-disable no-param-reassign */
import { createSlice } from '@reduxjs/toolkit'
import { push } from 'redux-first-history'
import threadApi from '../data/threadApi'
import {
  setIsLoading,
  setIsSilentLoading,
  setServiceUnavailable,
} from './utilsSlice'
import { setLoadedInbox } from './labelsSlice'
import emailListFilteredByLabel from '../utils/emailListFilteredByLabel'
import messageApi from '../data/messageApi'
import * as draft from '../constants/draftConstants'
import * as global from '../constants/globalConstants'
import type { AppThunk, RootState } from './store'
import {
  EmailListThreadItem,
  EmailListObject,
  EmailListState,
  EmailListObjectSearch,
} from './emailListTypes'
import {
  LoadEmailObject,
  MetaListThreadItem,
  UpdateRequestParams,
} from './metaEmailListTypes'
import sortThreads from '../utils/sortThreads'
import undoubleThreads from '../utils/undoubleThreads'
import { setCurrentEmail } from './emailDetailSlice'
import userApi from '../data/userApi'
import { setProfile } from './baseSlice'
import labelURL from '../utils/createLabelURL'

const initialState: EmailListState = Object.freeze({
  emailList: [],
  isFocused: false,
  isSorting: false,
  isFetching: false,
})

export const emailListSlice = createSlice({
  name: 'email',
  initialState,
  reducers: {
    setIsFocused: (state, action) => {
      state.isFocused = action.payload
    },
    setIsSorting: (state, action) => {
      state.isSorting = action.payload
    },
    setIsFetching: (state, action) => {
      state.isFetching = action.payload
    },
    listAddEmailList: (state, action) => {
      if (action.payload.labels) {
        // Find emailList sub-array index
        const arrayIndex: number = state.emailList
          .map((emailArray) => emailArray.labels)
          .flat(1)
          .findIndex((obj) =>
            obj ? obj.includes(action.payload.labels) : null
          )
        // If emailList sub-array index exists, if exists concat threads.
        // If not, push the new emailList
        if (arrayIndex > -1) {
          // It loops through all the newly fetched threads, and if check what to do with this.
          // Either push it to the tempArray, or update the entry in the emailList state.
          const tempArray: any = []
          let activeCount: number = 0
          const completeCount: number = action.payload.threads.length

          for (let i = 0; i < action.payload.threads.length; i += 1) {
            // Check if the object already exists on the Redux store.
            const objectIndex = state.emailList[arrayIndex].threads.findIndex(
              (item) => item.id === action.payload.threads[i].id
            )

            if (objectIndex === -1) {
              activeCount += 1
              tempArray.push(action.payload.threads[i])
            }

            if (objectIndex > -1) {
              activeCount += 1
              const currentState = state.emailList
              currentState[arrayIndex].threads[objectIndex] =
                action.payload.threads[i]
              state.emailList = currentState
            }

            if (activeCount === completeCount) {
              const currentState = state.emailList
              const sortedThreads = sortThreads(
                currentState[arrayIndex].threads.concat(tempArray)
              )

              const newObject: EmailListObject = {
                labels: action.payload.labels,
                threads: undoubleThreads(sortedThreads),
                nextPageToken:
                  action.payload.nextPageToken ??
                  currentState[arrayIndex].nextPageToken,
              }
              currentState[arrayIndex] = newObject
              state.emailList = currentState
            }
          }
        }
        if (arrayIndex === -1) {
          const sortedThreads = sortThreads(action.payload.threads)

          const sortedEmailList: EmailListObject = {
            ...action.payload,
            threads: undoubleThreads(sortedThreads),
          }
          state.emailList.push(sortedEmailList)
        }
      }
    },
    listAddItemDetail: (state, action) => {
      const {
        copyTargetEmailList,
        activEmailObjArray,
      }: {
        copyTargetEmailList: EmailListObject[]
        activEmailObjArray: EmailListThreadItem[]
      } = action.payload
      const objectIndex: number = copyTargetEmailList[0].threads.findIndex(
        (item) => item.id === activEmailObjArray[0].id
      )
      // If the object doesn't exist yet on the array, add it - otherwise do nothing since the item already exists.
      if (objectIndex === -1) {
        const newEmailListEntry: EmailListObject = {
          ...copyTargetEmailList[0],
          threads: sortThreads(
            copyTargetEmailList[0].threads.concat(activEmailObjArray)
          ),
        }

        const updatedEmailList: EmailListObject[] = [
          ...state.emailList.filter(
            (threadList) =>
              !threadList.labels.includes(copyTargetEmailList[0].labels[0])
          ),
          newEmailListEntry,
        ]
        state.emailList = updatedEmailList
      }
    },
    listRemoveItemDetail: (state, action) => {
      const { copyCurrentEmailList, messageId } = action.payload
      const newEmailListEntry: EmailListObject = {
        ...copyCurrentEmailList[0],
        threads: copyCurrentEmailList[0].threads.filter(
          (item: EmailListThreadItem) => item.id !== messageId
        ),
      }
      const updatedEmailList: EmailListObject[] = [
        ...state.emailList.filter(
          (threadList) =>
            !threadList.labels.includes(copyCurrentEmailList[0].labels[0])
        ),
        newEmailListEntry,
      ]
      state.emailList = updatedEmailList
    },
    listUpdateItemDetail: (state, action) => {
      const {
        copyCurrentEmailList,
        responseEmail,
      }: { copyCurrentEmailList: EmailListObject[]; responseEmail: any } =
        action.payload
      if (
        copyCurrentEmailList !== undefined &&
        copyCurrentEmailList.length > 0 &&
        responseEmail &&
        Object.keys(responseEmail).length > 0
      ) {
        const updatedEmailList = (): EmailListObject[] => {
          // Need to loop through the existing emailObject and replace the labelIds on each message.
          // The emailObject will be filtered from the old list, and the new object will be added.

          const objectIndex = copyCurrentEmailList[0].threads.findIndex(
            (thread: any) => thread.id === responseEmail.message.id
          )

          const updateEmailListObject = () => {
            if (
              Object.keys(copyCurrentEmailList[0].threads[objectIndex]).length >
              0
            ) {
              const updatedThreadMessages = (): any =>
                copyCurrentEmailList[0].threads[objectIndex].messages?.map(
                  (message: any) => {
                    const convertedObjectToArray = Object.entries(message)
                    const attributeIndex = convertedObjectToArray.findIndex(
                      (item) => item[0] === 'labelIds'
                    )

                    convertedObjectToArray[attributeIndex][1] =
                      responseEmail.message.messages[0].labelIds

                    const revertedObject = Object.fromEntries(
                      convertedObjectToArray
                    )

                    return revertedObject
                  }
                )

              const filteredCurrentEmailList = {
                ...copyCurrentEmailList[0],
                threads: copyCurrentEmailList[0].threads.filter(
                  (thread: any) => thread.id !== responseEmail.message.id
                ),
              }

              const newThreadObject = {
                ...copyCurrentEmailList[0].threads[objectIndex],
                messages: updatedThreadMessages(),
              }

              const newEmailListObject = {
                ...filteredCurrentEmailList,
                threads: sortThreads(
                  filteredCurrentEmailList.threads.concat(newThreadObject)
                ),
              }

              return newEmailListObject
            }
            return []
          }

          const emailStateWithoutActiveEmailListObject = [
            ...state.emailList.filter(
              (threadList) =>
                !threadList.labels.includes(copyCurrentEmailList[0].labels[0])
            ),
          ]

          const updatedEmailListObject: any =
            emailStateWithoutActiveEmailListObject.length > 0
              ? [
                  ...emailStateWithoutActiveEmailListObject,
                  updateEmailListObject(),
                ]
              : Array(updateEmailListObject())

          return updatedEmailListObject
        }

        if (updatedEmailList().length > 0) state.emailList = updatedEmailList()
      }
    },
  },
})

export const {
  setIsFocused,
  setIsSorting,
  setIsFetching,
  listAddEmailList,
  listAddItemDetail,
  listRemoveItemDetail,
  listUpdateItemDetail,
} = emailListSlice.actions

// If the received object doesn't have labels of its own.
// Check per threadObject on the most recent message's labelIds to decide where to store it.
export const storeSearchResults =
  (searchThreads: EmailListObjectSearch): AppThunk =>
  (dispatch, getState) => {
    const labelIndexes: number[] = []
    const { storageLabels } = getState().labels
    const idMapStorageLabels = storageLabels.map((label) => label.id)

    // Create emailListObjects first
    for (let i = 0; i < searchThreads.threads.length; i += 1) {
      const mostRecentMessagePerThread = () => {
        if (searchThreads.threads[i].messages) {
          return searchThreads.threads[i]!.messages![
            searchThreads.threads[i].messages!.length - 1
          ]
        }
        return searchThreads.threads[i].message!
      }
      const staticMostRecentMessagePerThread = mostRecentMessagePerThread()
      const messageHasLabelIds = Object.prototype.hasOwnProperty.call(
        staticMostRecentMessagePerThread,
        'labelIds'
      )
      if (messageHasLabelIds) {
        // Filter only on the relevant labelIds
        const indexArray: number[] =
          staticMostRecentMessagePerThread.labelIds.map((label) =>
            idMapStorageLabels.indexOf(label)
          )
        indexArray.forEach((foundIndex) => labelIndexes.push(foundIndex))
      }
      if (!messageHasLabelIds) {
        labelIndexes.push(-1)
      }
    }
    const [...uniqueLabelIndexes] = new Set(labelIndexes)

    // Create emailObjects to push the new found threads onto.
    const arrayOfEmailObjects: any[] = []
    uniqueLabelIndexes.forEach((labelIndex) => {
      const labels = storageLabels[labelIndex]?.id
        ? [storageLabels[labelIndex]?.id]
        : [global.ARCHIVE_LABEL]
      arrayOfEmailObjects.push({
        labels,
        threads: [],
      })
    })

    searchThreads.threads.forEach((thread: any) => {
      const mostRecentMessagePerThread =
        thread.messages[thread.messages.length - 1]
      const messageHasLabelIds = Object.prototype.hasOwnProperty.call(
        mostRecentMessagePerThread,
        'labelIds'
      )
      if (messageHasLabelIds) {
        // Filter only on the relevant labelIds
        const checkArray = mostRecentMessagePerThread.labelIds.map(
          (item: string) => ({
            labelId: item,
            labelExists: idMapStorageLabels.includes(item),
          })
        )
        const allLabelsAreIllegal = checkArray.every(
          (item: any) => item.labelExists === false
        )
        for (let j = 0; j < checkArray.length; j += 1) {
          // If some of the labels are allowed, push only these existing labeledThreads
          if (!allLabelsAreIllegal) {
            if (checkArray[j].labelExists) {
              const emailObjectIndex = arrayOfEmailObjects.findIndex(
                (emailObject) =>
                  emailObject.labels?.includes(checkArray[j].labelId)
              )
              arrayOfEmailObjects[emailObjectIndex].threads.push(thread)
            }
          }
        }
        // If none of these labels are allowed, push the illegal object only once to the Archive object.
        if (allLabelsAreIllegal) {
          const emailObjectIndex = arrayOfEmailObjects.findIndex(
            (emailObject) => emailObject.labels.includes(global.ARCHIVE_LABEL)
          )
          arrayOfEmailObjects[emailObjectIndex].threads.push(thread)
        }
      }
      // If the message has no labels left, it is considered Archived
      if (!messageHasLabelIds) {
        const emailObjectIndex = arrayOfEmailObjects.findIndex((emailObject) =>
          emailObject.labels.includes(global.ARCHIVE_LABEL)
        )
        arrayOfEmailObjects[emailObjectIndex].threads.push(thread)
      }
    })
    arrayOfEmailObjects.forEach((emailObject) =>
      dispatch(listAddEmailList(emailObject))
    )
  }

export const loadEmailDetails =
  (labeledThreads: EmailListObject): AppThunk =>
  async (dispatch, getState) => {
    try {
      const { threads, labels, nextPageToken } = labeledThreads
      if (threads) {
        const buffer: EmailListThreadItem[] = []
        const loadCount = threads.length

        if (threads.length > 0) {
          threads.forEach(async (item) => {
            const threadDetail = await threadApi().getThreadDetail(item.id)
            buffer.push(threadDetail.thread)
            if (buffer.length === loadCount) {
              dispatch(
                listAddEmailList({
                  labels,
                  threads: buffer,
                  nextPageToken: nextPageToken ?? null,
                })
              )
              dispatch(setLoadedInbox(labels))
              getState().utils.isLoading && dispatch(setIsLoading(false))
              getState().utils.isSilentLoading &&
                dispatch(setIsSilentLoading(false))
            }
          })
        }
      } else {
        if (
          !getState().base.baseLoaded &&
          labels.some(
            (val) => getState().labels.loadedInbox.flat(1).indexOf(val) === -1
          )
        ) {
          dispatch(setLoadedInbox(labels))
        }
        if (
          !getState().base.baseLoaded &&
          getState().labels.storageLabels.length ===
            getState().labels.loadedInbox.length
        ) {
          dispatch(setIsLoading(false))
          getState().utils.isSilentLoading &&
            dispatch(setIsSilentLoading(false))
        }
      }
    } catch (err) {
      console.log(err)
      dispatch(setServiceUnavailable('Error hydrating emails.'))
    }
  }

export const loadEmails =
  (params: LoadEmailObject): AppThunk =>
  async (dispatch, getState) => {
    try {
      const { labelIds, silentLoading } = params
      if (!silentLoading && !getState().utils.isLoading) {
        dispatch(setIsLoading(true))
      }
      if (silentLoading && !getState().utils.isSilentLoading) {
        dispatch(setIsSilentLoading(true))
      }
      const metaList = await threadApi().getThreads(params)
      if (metaList.resultSizeEstimate > 0) {
        const { threads, nextPageToken } = metaList

        // If there is a specific email array being sent as parameter, append that to the list of threads.
        const labeledThreads = {
          labels: labelIds,
          threads,
          nextPageToken: nextPageToken ?? null,
        }
        dispatch(loadEmailDetails(labeledThreads))
      } else {
        dispatch(setLoadedInbox(labelIds))
        getState().utils.isLoading && dispatch(setIsLoading(false))
        getState().utils.isSilentLoading && dispatch(setIsSilentLoading(false))
      }
    } catch (err) {
      console.log(err)
      getState().utils.isLoading && dispatch(setIsLoading(false))
      getState().utils.isSilentLoading && dispatch(setIsSilentLoading(false))
      dispatch(
        setServiceUnavailable('Something went wrong whilst loading data.')
      )
    }
  }

export const updateEmailListLabel = (props: UpdateRequestParams): AppThunk => {
  const {
    messageId,
    request,
    request: { addLabelIds, removeLabelIds },
    labelIds,
    location,
  } = props

  return async (dispatch, getState) => {
    try {
      const { emailList } = getState().email

      const filteredCurrentEmailList = (): EmailListObject[] => {
        if (emailList && (removeLabelIds || request.delete)) {
          if (removeLabelIds) {
            if (removeLabelIds.includes(global.UNREAD_LABEL)) {
              return emailListFilteredByLabel({
                emailList,
                labelIds,
              })
            }
            return emailListFilteredByLabel({
              emailList,
              labelIds: removeLabelIds,
            })
          }
          return emailListFilteredByLabel({ emailList, labelIds })
        }
        return []
      }

      const filteredTargetEmailList = () => {
        if (emailList && addLabelIds) {
          return emailListFilteredByLabel({ emailList, labelIds: addLabelIds })
        }
        return []
      }

      const staticFilteredCurrentEmailList = filteredCurrentEmailList()
      const staticFilteredTargetEmailList = filteredTargetEmailList()

      if (staticFilteredCurrentEmailList.length > 0) {
        if (
          location &&
          location.pathname.includes('/mail/') &&
          !getState().labels.labelIds.includes(draft.LABEL)
        ) {
          // The push method should only work when the action is Archive or ToDo via Detail actions.
          if (
            request &&
            request.removeLabelIds &&
            !request.removeLabelIds.includes(global.UNREAD_LABEL)
          ) {
            const { viewIndex } = getState().emailDetail

            const nextID = () =>
              staticFilteredCurrentEmailList[0].threads[viewIndex + 1] !==
              undefined
                ? staticFilteredCurrentEmailList[0].threads[viewIndex + 1].id
                : null

            const staticNextID = nextID()
            const staticLabelURL = labelURL(labelIds)

            if (staticNextID && staticLabelURL) {
              dispatch(setCurrentEmail(staticNextID))
              dispatch(push(`/mail/${staticLabelURL}/${staticNextID}/messages`))
            }
          }
        }

        const response: any = !request.delete
          ? await messageApi().updateMessage({ messageId, request })
          : await messageApi().thrashMessage({ messageId })

        if (response && response.status === 200) {
          if (addLabelIds && staticFilteredTargetEmailList.length > 0) {
            const activEmailObjArray =
              staticFilteredCurrentEmailList[0].threads.filter(
                (item: EmailListThreadItem) => item.id === messageId
              )
            const copyTargetEmailList: EmailListObject[] =
              staticFilteredTargetEmailList
            dispatch(
              listAddItemDetail({
                activEmailObjArray,
                copyTargetEmailList,
              })
            )
          }
          if (
            (removeLabelIds && !removeLabelIds.includes(global.UNREAD_LABEL)) ||
            request.delete
          ) {
            const copyCurrentEmailList: EmailListObject[] =
              staticFilteredCurrentEmailList
            dispatch(
              listRemoveItemDetail({
                messageId,
                copyCurrentEmailList,
              })
            )
          }

          // NOTE: The newly added threadObject doesn't have a historyId during this process. On refetch of list it will.
          if (removeLabelIds && removeLabelIds.includes(global.UNREAD_LABEL)) {
            const copyCurrentEmailList: EmailListObject[] =
              staticFilteredCurrentEmailList
            const responseEmail = response.data
            dispatch(
              listUpdateItemDetail({
                copyCurrentEmailList,
                responseEmail,
              })
            )
          }
        } else {
          dispatch(setServiceUnavailable('Error updating label.'))
        }
      }
    } catch (err) {
      console.log(err)
      dispatch(setServiceUnavailable('Error updating label.'))
    }
    return null
  }
}

// Use profile history id, compare this to the received history id. If the received history id is higher than stored version. Refetch the email list for inbox only.
export const refreshEmailFeed =
  (params: LoadEmailObject): AppThunk =>
  async (dispatch, getState) => {
    console.log(params)
    try {
      dispatch(setIsFetching(true))
      const savedHistoryId = parseInt(getState().base.profile.historyId, 10)
      const { threads, nextPageToken } = await threadApi().getThreads(params)
      const newEmailsIdx = threads.findIndex(
        (thread: MetaListThreadItem) =>
          parseInt(thread.historyId, 10) < savedHistoryId
      )
      if (newEmailsIdx > -1) {
        const newSlice = threads.slice(0, newEmailsIdx)
        if (newSlice.length > 0) {
          const user = await userApi().fetchUser()
          dispatch(setProfile(user?.data.data))
          const labeledThreads = {
            labels: params.labelIds,
            threads: newSlice,
            nextPageToken: nextPageToken ?? null,
          }
          dispatch(loadEmailDetails(labeledThreads))
        }
      }
    } catch (err) {
      console.log(err)
      dispatch(setServiceUnavailable('Cannot refresh feed'))
    } finally {
      dispatch(setIsFetching(false))
    }
  }

export const selectIsFocused = (state: RootState) => state.email.isFocused
export const selectIsSorting = (state: RootState) => state.email.isSorting
export const selectIsFetching = (state: RootState) => state.email.isFetching
export const selectEmailList = (state: RootState) => state.email.emailList
export const selectNextPageToken = (state: any) =>
  state.email.emailList.nextPageToken

export default emailListSlice.reducer
