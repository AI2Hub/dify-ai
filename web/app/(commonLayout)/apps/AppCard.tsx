'use client'

import { useContext, useContextSelector } from 'use-context-selector'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import cn from 'classnames'
import style from '../list.module.css'
import AppModeLabel from './AppModeLabel'
import s from './style.module.css'
import SettingsModal from '@/app/components/app/overview/settings'
import type { ConfigParams } from '@/app/components/app/overview/settings'
import type { App } from '@/types/app'
import Confirm from '@/app/components/base/confirm'
import { ToastContext } from '@/app/components/base/toast'
import { copyApp, deleteApp, exportAppConfig, fetchAppDetail, updateAppSiteConfig } from '@/service/apps'
import DuplicateAppModal from '@/app/components/app/duplicate-modal'
import type { DuplicateAppModalProps } from '@/app/components/app/duplicate-modal'
import AppIcon from '@/app/components/base/app-icon'
import AppsContext, { useAppContext } from '@/context/app-context'
import type { HtmlContentProps } from '@/app/components/base/popover'
import CustomPopover from '@/app/components/base/popover'
import Divider from '@/app/components/base/divider'
import { asyncRunSafe } from '@/utils'
import { getRedirection } from '@/utils/app-redirection'
import { useProviderContext } from '@/context/provider-context'
import { NEED_REFRESH_APP_LIST_KEY } from '@/config'

export type AppCardProps = {
  app: App
  onRefresh?: () => void
}

const AppCard = ({ app, onRefresh }: AppCardProps) => {
  const { t } = useTranslation()
  const { notify } = useContext(ToastContext)
  const { isCurrentWorkspaceManager } = useAppContext()
  const { onPlanInfoChanged } = useProviderContext()
  const { push } = useRouter()

  const mutateApps = useContextSelector(
    AppsContext,
    state => state.mutateApps,
  )

  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [detailState, setDetailState] = useState<{
    loading: boolean
    detail?: App
  }>({ loading: false })

  const onConfirmDelete = useCallback(async () => {
    try {
      await deleteApp(app.id)
      notify({ type: 'success', message: t('app.appDeleted') })
      if (onRefresh)
        onRefresh()
      mutateApps()
      onPlanInfoChanged()
    }
    catch (e: any) {
      notify({
        type: 'error',
        message: `${t('app.appDeleteFailed')}${'message' in e ? `: ${e.message}` : ''}`,
      })
    }
    setShowConfirmDelete(false)
  }, [app.id])

  const getAppDetail = async () => {
    setDetailState({ loading: true })
    const [err, res] = await asyncRunSafe(
      fetchAppDetail({ url: '/apps', id: app.id }),
    )
    if (!err)
      setDetailState({ loading: false, detail: res })
    else
      setDetailState({ loading: false })
  }

  const onSaveSiteConfig = useCallback(
    async (params: ConfigParams) => {
      const [err] = await asyncRunSafe(
        updateAppSiteConfig({
          url: `/apps/${app.id}/site`,
          body: params,
        }),
      )
      if (!err) {
        notify({
          type: 'success',
          message: t('common.actionMsg.modifiedSuccessfully'),
        })
        if (onRefresh)
          onRefresh()
        mutateApps()
      }
      else {
        notify({
          type: 'error',
          message: t('common.actionMsg.modifiedUnsuccessfully'),
        })
      }
    },
    [app.id],
  )

  const onCopy: DuplicateAppModalProps['onConfirm'] = async ({ name, icon, icon_background }) => {
    try {
      const newApp = await copyApp({
        appID: app.id,
        name,
        icon,
        icon_background,
        mode: app.mode,
      })
      setShowDuplicateModal(false)
      notify({
        type: 'success',
        message: t('app.newApp.appCreated'),
      })
      localStorage.setItem(NEED_REFRESH_APP_LIST_KEY, '1')
      mutateApps()
      onPlanInfoChanged()
      getRedirection(isCurrentWorkspaceManager, newApp, push)
    }
    catch (e) {
      notify({ type: 'error', message: t('app.newApp.appCreateFailed') })
    }
  }

  const onExport = async () => {
    try {
      const { data } = await exportAppConfig(app.id)
      const a = document.createElement('a')
      const file = new Blob([data], { type: 'application/yaml' })
      a.href = URL.createObjectURL(file)
      a.download = `${app.name}.yml`
      a.click()
    }
    catch (e) {
      notify({ type: 'error', message: t('app.exportFailed') })
    }
  }

  const Operations = (props: HtmlContentProps) => {
    const onClickSettings = async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      props.onClick?.()
      e.preventDefault()
      await getAppDetail()
      setShowSettingsModal(true)
    }
    const onClickDuplicate = async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      props.onClick?.()
      e.preventDefault()
      setShowDuplicateModal(true)
    }
    const onClickExport = async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      props.onClick?.()
      e.preventDefault()
      onExport()
    }
    const onClickDelete = async (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation()
      props.onClick?.()
      e.preventDefault()
      setShowConfirmDelete(true)
    }
    return (
      <div className="w-full py-1">
        <button className={s.actionItem} onClick={onClickSettings} disabled={detailState.loading}>
          <span className={s.actionName}>{t('common.operation.settings')}</span>
        </button>
        <Divider className="!my-1" />
        {app.mode !== 'completion' && (
          <>
            <button className={s.actionItem} onClick={onClickDuplicate} disabled={detailState.loading}>
              <span className={s.actionName}>{t('app.duplicate')}</span>
            </button>
            <button className={s.actionItem} onClick={onClickExport} disabled={detailState.loading}>
              <span className={s.actionName}>{t('app.export')}</span>
            </button>
            <Divider className="!my-1" />
          </>
        )}
        <div
          className={cn(s.actionItem, s.deleteActionItem, 'group')}
          onClick={onClickDelete}
        >
          <span className={cn(s.actionName, 'group-hover:text-red-500')}>
            {t('common.operation.delete')}
          </span>
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        onClick={(e) => {
          if (showSettingsModal)
            return
          e.preventDefault()
          getRedirection(isCurrentWorkspaceManager, app, push)
        }}
        className={style.listItem}
      >
        <div className={style.listItemTitle}>
          <AppIcon
            size="large"
            icon={app.icon}
            background={app.icon_background}
          />
          <div className={style.listItemHeading}>
            <div className={style.listItemHeadingContent}>{app.name}</div>
          </div>
          {isCurrentWorkspaceManager && <CustomPopover
            htmlContent={<Operations />}
            position="br"
            trigger="click"
            btnElement={<div className={cn(s.actionIcon, s.commonIcon)} />}
            btnClassName={open =>
              cn(
                open ? '!bg-gray-100 !shadow-none' : '!bg-transparent',
                style.actionIconWrapper,
              )
            }
            className={'!w-[128px] h-fit !z-20'}
            manualClose
          />}
        </div>
        <div className={style.listItemDescription}>
          {app.description}
        </div>
        <div className={style.listItemFooter}>
          <AppModeLabel mode={app.mode} />
        </div>
        {showSettingsModal && detailState.detail && (
          <SettingsModal
            appInfo={detailState.detail}
            isShow={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            onSave={onSaveSiteConfig}
          />
        )}
        {showDuplicateModal && (
          <DuplicateAppModal
            appName={app.name}
            icon={app.icon}
            icon_background={app.icon_background}
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
    </>
  )
}

export default AppCard
