import { useState } from 'react';
import type { SessionNotice } from '../../session/initial-session';
import { Banner } from '../Banner';
import styles from './session-notices.module.scss';

export interface SessionNoticesProps {
  notices: SessionNotice[];
}

export function SessionNotices({ notices }: SessionNoticesProps) {
  const [dismissed, setDismissed] = useState<ReadonlySet<SessionNotice['id']>>(() => new Set());
  const visible = notices.filter((notice) => !dismissed.has(notice.id));
  if (visible.length === 0) return null;
  return (
    <div className={styles.notices}>
      {visible.map((notice) => (
        <Banner
          key={notice.id}
          tone={notice.tone}
          title={notice.title}
          onDismiss={() => setDismissed(new Set([...dismissed, notice.id]))}
        >
          {notice.body}
        </Banner>
      ))}
    </div>
  );
}
