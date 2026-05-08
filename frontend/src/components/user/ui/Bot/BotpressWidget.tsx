import { useState, useRef, useCallback, useEffect } from 'react';
import { Webchat, WebchatProvider, type Configuration } from '@botpress/webchat';
import '../../../../botpress.css';

const CLIENT_ID = '9ae160f9-3b57-4752-8be6-7371a0882f36';

const CONFIG: Configuration = {
  botName: 'Morning Fruit AI',
  color: '#16a34a',
};

const BTN_SIZE = 56;
const CHAT_W = 380;
const CHAT_H = 520;

function ChatHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-green-600 text-white shrink-0">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
        <span className="text-sm font-semibold">Morning Fruit AI</span>
      </div>
      <button
        type="button"
        title="Đóng chat"
        aria-label="Đóng chat"
        onClick={onClose}
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-green-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [pos, setPos] = useState({ x: window.innerWidth - BTN_SIZE - 24, y: window.innerHeight - BTN_SIZE - 24 });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const moved = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const clamp = useCallback((x: number, y: number) => ({
    x: Math.max(0, Math.min(window.innerWidth - BTN_SIZE, x)),
    y: Math.max(0, Math.min(window.innerHeight - BTN_SIZE, y)),
  }), []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    moved.current = false;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }, [pos]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    dragging.current = true;
    moved.current = false;
    const t = e.touches[0];
    offset.current = { x: t.clientX - pos.x, y: t.clientY - pos.y };
  }, [pos]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      moved.current = true;
      setPos(clamp(e.clientX - offset.current.x, e.clientY - offset.current.y));
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current) return;
      moved.current = true;
      const t = e.touches[0];
      setPos(clamp(t.clientX - offset.current.x, t.clientY - offset.current.y));
      e.preventDefault();
    };
    const onUp = () => { dragging.current = false; };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [clamp]);

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 640);
      setPos(p => clamp(p.x, p.y));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clamp]);

  const handleClick = useCallback(() => {
    if (!moved.current) setOpen(v => !v);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.left = `${pos.x}px`;
      containerRef.current.style.top = `${pos.y}px`;
    }
    if (chatRef.current && !isMobile) {
      const cx = Math.max(8, Math.min(window.innerWidth - CHAT_W - 8, pos.x + BTN_SIZE / 2 - CHAT_W / 2));
      const cy = pos.y - CHAT_H - 12 < 8 ? pos.y + BTN_SIZE + 12 : pos.y - CHAT_H - 12;
      chatRef.current.style.left = `${cx}px`;
      chatRef.current.style.top = `${cy}px`;
    }
  }, [pos, isMobile]);

  if (dismissed) return null;

  return (
    <>
      {open && isMobile && (
        <div className="fixed inset-0 z-9998 flex flex-col bg-white">
          <ChatHeader onClose={() => setOpen(false)} />
          <div className="flex-1 overflow-hidden">
            <Webchat clientId={CLIENT_ID} configuration={CONFIG} className="w-full h-full" />
          </div>
        </div>
      )}

      {open && !isMobile && (
        <div
          ref={chatRef}
          className="fixed z-9998 rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white flex flex-col"
        >
          <ChatHeader onClose={() => setOpen(false)} />
          <div className="bp-chat-body overflow-hidden">
            <Webchat clientId={CLIENT_ID} configuration={CONFIG} className="w-full h-full" />
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className={`fixed z-9999 w-14 h-14 select-none${open ? ' hidden' : ''}`}
      >
        <button
          type="button"
          title="Chat với AI hỗ trợ"
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onClick={handleClick}
          className="w-full h-full rounded-full shadow-xl flex items-center justify-center transition-transform duration-100 hover:scale-105 active:scale-95 bg-green-600 hover:bg-green-700 text-white cursor-grab active:cursor-grabbing"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full animate-pulse" />
        </button>
        <button
          type="button"
          title="Tắt chat"
          onClick={() => setDismissed(true)}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-500 hover:bg-gray-700 text-white flex items-center justify-center shadow transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </>
  );
}

export default function BotpressWidget() {
  return (
    <WebchatProvider clientId={CLIENT_ID}>
      <ChatWidget />
    </WebchatProvider>
  );
}
