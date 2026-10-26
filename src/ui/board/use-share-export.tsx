import { useState, type ReactNode } from 'react';
import type { StoreApi } from 'zustand';
import type { Point } from '../../data/types';
import { buildShareLink, type ShareLinkResult } from '../../share/link';
import type { PitchStore } from '../../state/store';
import { ShareDialog } from '../chrome/ShareDialog';
import { Button } from '../controls/Button';
import {
  CANCEL_LABEL,
  COPY_FM_POSITIONS_CONFIRMATION,
  COPY_FM_POSITIONS_CONFIRM_LABEL,
  COPY_FM_POSITIONS_LABEL,
  SHARE_LABEL,
} from '../copy';
import { ExportDialog } from '../export/ExportDialog';
import type { ExportFrameProps } from '../export/ExportFrame';
import { Dialog } from '../feedback/Dialog';
import { exportFrameProps, type ExportSnapshot } from './export-frame-props';

export interface ShareExport {
  share: () => void;
  openExport: (snapshot: ExportSnapshot) => void;
  requestCopy: () => void;
  dialogs: ReactNode;
}

export function useShareExport(
  store: StoreApi<PitchStore>,
  livePieces?: ReadonlyMap<string, Point>,
): ShareExport {
  const [shareLink, setShareLink] = useState<ShareLinkResult | null>(null);
  const [exportFrame, setExportFrame] = useState<ExportFrameProps | null>(null);
  const [confirmingCopy, setConfirmingCopy] = useState(false);

  const share = () => {
    const { tactic, ui } = store.getState();
    setShareLink(buildShareLink({ tactic, mode: ui.mode }));
  };
  const openExport = (snapshot: ExportSnapshot) => setExportFrame(exportFrameProps(snapshot));
  const confirmCopy = () => {
    if (!livePieces) return;
    store.getState().copyFmPositions(livePieces);
    setConfirmingCopy(false);
  };

  const dialogs = (
    <>
      {confirmingCopy && livePieces ? (
        <Dialog
          title={COPY_FM_POSITIONS_LABEL}
          onClose={() => setConfirmingCopy(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmingCopy(false)}>
                {CANCEL_LABEL}
              </Button>
              <Button variant="primary" onClick={confirmCopy}>
                {COPY_FM_POSITIONS_CONFIRM_LABEL}
              </Button>
            </>
          }
        >
          <p>{COPY_FM_POSITIONS_CONFIRMATION}</p>
        </Dialog>
      ) : null}
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
  return {
    share,
    openExport,
    requestCopy: () => {
      if (livePieces) setConfirmingCopy(true);
    },
    dialogs,
  };
}
