import { useEffect, useRef, useState } from 'react';
import {
  EXPORT_CANCEL_LABEL,
  EXPORT_DOWNLOAD_LABEL,
  EXPORT_FILE_NAME,
  EXPORT_NOTE,
  EXPORT_PNG_LABEL,
  EXPORT_PREVIEW_LABEL,
} from '../../copy';
import { Button } from '../../controls/Button';
import { Dialog } from '../../feedback/Dialog';
import { ExportFrame, type ExportFrameProps } from '../ExportFrame';
import { EXPORT_HEIGHT, EXPORT_WIDTH } from '../export-size';
import { renderPng } from '../png';
import styles from './export-dialog.module.scss';

export interface ExportDialogProps {
  frame: ExportFrameProps;
  onClose: () => void;
}

export function ExportDialog({ frame, onClose }: ExportDialogProps) {
  const source = useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const node = source.current?.firstElementChild;
    if (!(node instanceof HTMLElement)) return undefined;
    let current = true;
    let url: string | null = null;
    renderPng(node, EXPORT_WIDTH, EXPORT_HEIGHT).then(
      (blob) => {
        if (!current) return;
        url = URL.createObjectURL(blob);
        setImageUrl(url);
      },
      () => undefined,
    );
    return () => {
      current = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  const download = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = EXPORT_FILE_NAME;
    link.click();
  };

  return (
    <Dialog
      title={EXPORT_PNG_LABEL}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {EXPORT_CANCEL_LABEL}
          </Button>
          <Button variant="primary" icon="download" disabled={!imageUrl} onClick={download}>
            {EXPORT_DOWNLOAD_LABEL}
          </Button>
        </>
      }
    >
      <div className={styles.preview}>
        {imageUrl ? (
          <img src={imageUrl} alt={EXPORT_PREVIEW_LABEL} className={styles.image} />
        ) : null}
      </div>
      <p className={styles.note}>{EXPORT_NOTE}</p>
      <div ref={source} className={styles.source} aria-hidden="true">
        <ExportFrame {...frame} />
      </div>
    </Dialog>
  );
}
