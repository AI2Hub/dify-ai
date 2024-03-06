import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { useContext, useContextSelector } from 'use-context-selector'
import cn from 'classnames'
import React, { useCallback, useState } from 'react'
import AppIcon from '../base/app-icon'
import {
  PortalToFollowElem,
  PortalToFollowElemContent,
  PortalToFollowElemTrigger,
} from '@/app/components/base/portal-to-follow-elem'
import { ChevronDown } from '@/app/components/base/icons/src/vender/line/arrows'
import Divider from '@/app/components/base/divider'
import Confirm from '@/app/components/base/confirm'
import { useStore as useAppStore } from '@/app/components/app/store'
import { ToastContext } from '@/app/components/base/toast'
import AppsContext from '@/context/app-context'
import { useProviderContext } from '@/context/provider-context'
import { copyApp, deleteApp, exportAppConfig, updateAppInfo } from '@/service/apps'
import DuplicateAppModal from '@/app/components/app/duplicate-modal'
import type { DuplicateAppModalProps } from '@/app/components/app/duplicate-modal'
import CreateAppModal from '@/app/components/explore/create-app-modal'
import type { CreateAppModalProps } from '@/app/components/explore/create-app-modal'
import { NEED_REFRESH_APP_LIST_KEY } from '@/config'
import { getRedirection } from '@/utils/app-redirection'

export type IAppInfoProps = {
  expand: boolean
}

const AppInfo = ({ expand }: IAppInfoProps) => {
  const { t } = useTranslation()
  const { notify } = useContext(ToastContext)
  const { replace } = useRouter()
  const { onPlanInfoChanged } = useProviderContext()
  const appDetail = useAppStore(state => state.appDetail)
  const setAppDetail = useAppStore(state => state.setAppDetail)
  const [open, setOpen] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  const mutateApps = useContextSelector(
    AppsContext,
    state => state.mutateApps,
  )

  const onEdit: CreateAppModalProps['onConfirm'] = useCallback(async ({
    name,
    icon,
    icon_background,
    description,
  }) => {
    if (!appDetail)
      return
    try {
      const app = await updateAppInfo({
        appID: appDetail.id,
        name,
        icon,
        icon_background,
        description,
      })
      setShowEditModal(false)
      notify({
        type: 'success',
        message: t('app.editDone'),
      })
      console.log(app.description)
      setAppDetail(app)
      mutateApps()
    }
    catch (e) {
      notify({ type: 'error', message: t('app.editFailed') })
    }
  }, [appDetail, mutateApps, notify, setAppDetail, t])

  const onCopy: DuplicateAppModalProps['onConfirm'] = async ({ name, icon, icon_background }) => {
    if (!appDetail)
      return
    try {
      const newApp = await copyApp({
        appID: appDetail.id,
        name,
        icon,
        icon_background,
        mode: appDetail.mode,
      })
      setShowDuplicateModal(false)
      notify({
        type: 'success',
        message: t('app.newApp.appCreated'),
      })
      localStorage.setItem(NEED_REFRESH_APP_LIST_KEY, '1')
      mutateApps()
      onPlanInfoChanged()
      getRedirection(true, newApp, replace)
    }
    catch (e) {
      notify({ type: 'error', message: t('app.newApp.appCreateFailed') })
    }
  }

  const onExport = async () => {
    if (!appDetail)
      return
    try {
      const { data } = await exportAppConfig(appDetail.id)
      const a = document.createElement('a')
      const file = new Blob([data], { type: 'application/yaml' })
      a.href = URL.createObjectURL(file)
      a.download = `${appDetail.name}.yml`
      a.click()
    }
    catch (e) {
      notify({ type: 'error', message: t('app.exportFailed') })
    }
  }

  const onConfirmDelete = useCallback(async () => {
    if (!appDetail)
      return
    try {
      await deleteApp(appDetail.id)
      notify({ type: 'success', message: t('app.appDeleted') })
      mutateApps()
      onPlanInfoChanged()
      replace('/apps')
    }
    catch (e: any) {
      notify({
        type: 'error',
        message: `${t('app.appDeleteFailed')}${'message' in e ? `: ${e.message}` : ''}`,
      })
    }
    setShowConfirmDelete(false)
  }, [appDetail, mutateApps, notify, onPlanInfoChanged, replace, t])

  if (!appDetail)
    return null

  return (
    <PortalToFollowElem
      open={open}
      onOpenChange={setOpen}
      placement='bottom-start'
      offset={4}
    >
      <div className='relative'>
        <PortalToFollowElemTrigger
          onClick={() => setOpen(v => !v)}
          className='block'
        >
          <div className='flex cursor-pointer'>
            <div className='shrink-0 mr-2'>
              <AppIcon icon={appDetail.icon} background={appDetail.icon_background} />
            </div>
            {expand && (
              <div className="grow w-0 pt-[2px]">
                <div className='flex justify-between items-center text-sm leading-4 font-medium text-gray-900'>
                  <div className='truncate' title={appDetail.name}>{appDetail.name}</div>
                  <ChevronDown className='shrink-0 ml-[2px] w-3 h-3 text-gray-500' />
                </div>
                <div className='flex items-center text-xs leading-[18px] font-medium text-gray-500 gap-1'>
                  {appDetail.mode === 'advanced-chat' && (
                    <>
                      <div className='shrink-0 px-1 border bg-white border-[rgba(0,0,0,0.08)] rounded-[5px] truncate'>{t('app.types.chatbot').toUpperCase()}</div>
                      <div title={t('app.newApp.advanced') || ''} className='px-1 border bg-white border-[rgba(0,0,0,0.08)] rounded-[5px] truncate'>{t('app.newApp.advanced').toUpperCase()}</div>
                    </>
                  )}
                  {appDetail.mode === 'agent-chat' && (
                    <div className='shrink-0 px-1 border bg-white border-[rgba(0,0,0,0.08)] rounded-[5px] truncate'>{t('app.types.agent').toUpperCase()}</div>
                  )}
                  {appDetail.mode === 'chat' && (
                    <>
                      <div className='shrink-0 px-1 border bg-white border-[rgba(0,0,0,0.08)] rounded-[5px] truncate'>{t('app.types.chatbot').toUpperCase()}</div>
                      <div title={t('app.newApp.basic') || ''} className='px-1 border bg-white border-[rgba(0,0,0,0.08)] rounded-[5px] truncate'>{(t('app.newApp.basic').toUpperCase())}</div>
                    </>
                  )}
                  {appDetail.mode === 'completion' && (
                    <div className='shrink-0 px-1 border bg-white border-[rgba(0,0,0,0.08)] rounded-[5px] truncate'>{t('app.types.completion').toUpperCase()}</div>
                  )}
                  {appDetail.mode === 'workflow' && (
                    <div className='shrink-0 px-1 border bg-white border-[rgba(0,0,0,0.08)] rounded-[5px] truncate'>{t('app.types.workflow').toUpperCase()}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </PortalToFollowElemTrigger>
        <PortalToFollowElemContent className='z-[1002]'>
          <div className='w-[320px] bg-white rounded-2xl shadow-xl'>
            {/* header */}
            <div className={cn('flex pl-4 pt-3 pr-3', !appDetail.description && 'pb-2')}>
              <div className='shrink-0 mr-2'>
                <AppIcon icon={appDetail.icon} background={appDetail.icon_background} />
              </div>
              <div className='grow w-0 pt-[2px]'>
                <div title={appDetail.name} className='flex justify-between items-center text-sm leading-4 font-medium text-gray-900 truncate'>{appDetail.name}</div>
                <div className='flex items-center text-xs leading-[18px] font-medium text-gray-500 gap-1'>
                  {appDetail.mode === 'advanced-chat' && (
                    <>
                      <div className='shrink-0 px-1 border bg-white border-[rgba(0,0,0,0.08)] rounded-[5px] truncate'>{t('app.types.chatbot').toUpperCase()}</div>
                      <div title={t('app.newApp.advanced') || ''} className='px-1 border bg-white border-[rgba(0,0,0,0.08)] rounded-[5px] truncate'>{t('app.newApp.advanced').toUpperCase()}</div>
                    </>
                  )}
                  {appDetail.mode === 'agent-chat' && (
                    <div className='shrink-0 px-1 border bg-white border-[rgba(0,0,0,0.08)] rounded-[5px] truncate'>{t('app.types.agent').toUpperCase()}</div>
                  )}
                  {appDetail.mode === 'chat' && (
                    <>
                      <div className='shrink-0 px-1 border bg-white border-[rgba(0,0,0,0.08)] rounded-[5px] truncate'>{t('app.types.chatbot').toUpperCase()}</div>
                      <div title={t('app.newApp.basic') || ''} className='px-1 border bg-white border-[rgba(0,0,0,0.08)] rounded-[5px] truncate'>{(t('app.newApp.basic').toUpperCase())}</div>
                    </>
                  )}
                  {appDetail.mode === 'completion' && (
                    <div className='shrink-0 px-1 border bg-white border-[rgba(0,0,0,0.08)] rounded-[5px] truncate'>{t('app.types.completion').toUpperCase()}</div>
                  )}
                  {appDetail.mode === 'workflow' && (
                    <div className='shrink-0 px-1 border bg-white border-[rgba(0,0,0,0.08)] rounded-[5px] truncate'>{t('app.types.workflow').toUpperCase()}</div>
                  )}
                </div>
              </div>
            </div>
            {/* desscription */}
            {appDetail.description && (
              <div className='px-4 py-2 text-gray-500 text-xs leading-[18px]'>{appDetail.description}</div>
            )}
            {/* operations */}
            <div></div>
            <Divider className="!my-1" />
            <div className="w-full py-1">
              <div className='h-9 py-2 px-3 mx-1 flex items-center hover:bg-gray-50 rounded-lg cursor-pointer' onClick={() => {
                setOpen(false)
                setShowEditModal(true)
              }}>
                <span className='text-gray-700 text-sm leading-5'>{t('app.editApp')}</span>
              </div>
              {appDetail.mode !== 'completion' && (
                <>
                  <div className='h-9 py-2 px-3 mx-1 flex items-center hover:bg-gray-50 rounded-lg cursor-pointer' onClick={() => {
                    setOpen(false)
                    setShowDuplicateModal(true)
                  }}>
                    <span className='text-gray-700 text-sm leading-5'>{t('app.duplicate')}</span>
                  </div>
                  <div className='h-9 py-2 px-3 mx-1 flex items-center hover:bg-gray-50 rounded-lg cursor-pointer' onClick={onExport}>
                    <span className='text-gray-700 text-sm leading-5'>{t('app.export')}</span>
                  </div>
                </>
              )}
              <Divider className="!my-1" />
              <div className='group h-9 py-2 px-3 mx-1 flex items-center hover:bg-red-50 rounded-lg cursor-pointer' onClick={() => {
                setOpen(false)
                setShowConfirmDelete(true)
              }}>
                <span className='text-gray-700 text-sm leading-5 group-hover:text-red-500'>
                  {t('common.operation.delete')}
                </span>
              </div>
            </div>
          </div>
        </PortalToFollowElemContent>
        {showEditModal && (
          <CreateAppModal
            isEditModal
            appIcon={appDetail.icon}
            appIconBackground={appDetail.icon_background}
            appName={appDetail.name}
            appDescription={appDetail.description}
            show={showEditModal}
            onConfirm={onEdit}
            onHide={() => setShowEditModal(false)}
          />
        )}
        {showDuplicateModal && (
          <DuplicateAppModal
            appName={appDetail.name}
            icon={appDetail.icon}
            icon_background={appDetail.icon_background}
            show={showDuplicateModal}
            onConfirm={onCopy}
            onHide={() => setShowDuplicateModal(false)}
          />
        )}
        {showConfirmDelete && (
          <Confirm
            title={t('app.deleteAppConfirmTitle')}
            content={t('app.deleteAppConfirmContent')}
            isShow={showConfirmDelete}
            onClose={() => setShowConfirmDelete(false)}
            onConfirm={onConfirmDelete}
            onCancel={() => setShowConfirmDelete(false)}
          />
        )}
      </div>
    </PortalToFollowElem>
  )
}

export default React.memo(AppInfo)
