import { useState, type ReactNode } from 'react';
import type { StoreApi } from 'zustand';
import { buildShareLink, type ShareLinkResult } from '../../share/link';
import type { PitchStore } from '../../state/store';
import { ShareDialog } from '../chrome/ShareDialog';
import { SHARE_LABEL } from '../copy';
import { ExportDialog } from '../export/ExportDialog';
import type { ExportFrameProps } from '../export/ExportFrame';
import { Dialog } from '../feedback/Dialog';
import { exportFrameProps, type ExportSnapshot } from './export-frame-props';

export interface ShareExport {
  share: () => void;
  openExport: (snapshot: ExportSnapshot) => void;
  dialogs: ReactNode;
}

export function useShareExport(store: StoreApi<PitchStore>): ShareExport {
  const [shareLink, setShareLink] = useState<ShareLinkResult | null>(null);
  const [exportFrame, setExportFrame] = useState<ExportFrameProps | null>(null);

  const share = () => {
    const { tactic, ui } = store.getState();
    setShareLink(buildShareLink({ tactic, mode: ui.mode }));
  };
  const openExport = (snapshot: ExportSnapshot) => setExportFrame(exportFrameProps(snapshot));

  const dialogs = (
    <>
      {shareLink?.status === 'ok' ? (
        <ShareDialog link={shareLink.url} onClose={() => setShareLink(null)} />
      ) : null}
      {shareLink?.status === 'error' ? (
        <Dialog title={SHARE_LABEL} onClose={() => setShareLink(null)}>
          <p>{shareLink.message}</p>
        </Dialog>
      ) : null}
      {exportFrame ? (
        <ExportDialog frame={exportFrame} onClose={() => setExportFrame(null)} />
      ) : null}
    </>
  );
  return { share, openExport, dialogs };
}
