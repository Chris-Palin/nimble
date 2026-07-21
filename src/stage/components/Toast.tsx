import { useEffect, useState } from 'react';
import { useStage } from '../store';

/** Transient status pill, driven by store.showToast(). */
export function Toast() {
  const toast = useStage(s => s.toast);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!toast.seq) return;
    setShow(true);
    const id = setTimeout(() => setShow(false), 2600);
    return () => clearTimeout(id);
  }, [toast.seq]);
  return <div className={'toast' + (show ? ' show' : '')} role="status">{toast.msg}</div>;
}
