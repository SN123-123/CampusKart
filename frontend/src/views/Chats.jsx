'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { timeAgo } from '@/lib/format';

export default function Chats() {
  const { user } = useAuth();
  const [convs, setConvs] = useState([]);
  const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const box = useRef(null);

  async function loadConvs() {
    try {
      setConvs((await api('/chats')).conversations);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!user) return;
    const c = new URLSearchParams(window.location.search).get('c');
    if (c) setActive(c);
    loadConvs();
    const t = setInterval(loadConvs, 8000);
    return () => clearInterval(t);
  }, [user]);

  useEffect(() => {
    if (!active) return;
    let stop = false;
    async function load() {
      try {
        const d = await api(`/chats/${active}/messages`);
        if (!stop) setMsgs(d.messages);
      } catch {}
    }
    setMsgs([]);
    load();
    const t = setInterval(load, 4000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [active]);

  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [msgs.length, active]);

  async function send(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText('');
    setError('');
    try {
      await api(`/chats/${active}/messages`, { method: 'POST', body: { text: t } });
      setMsgs((await api(`/chats/${active}/messages`)).messages);
      loadConvs();
    } catch (err) {
      setError(err.message);
      setText(t);
    }
  }

  if (!user) return null;
  const current = convs.find((c) => String(c.id) === String(active));

  return (
    <div>
      <h1>Chats</h1>
      {error && <div className="error">{error}</div>}
      <div className="chat" style={{ marginTop: 14 }}>
        <div className="chat-list">
          {convs.length === 0 && <div className="empty">No chats yet. Open a listing and tap “Message seller”.</div>}
          {convs.map((c) => (
            <div key={c.id} className={'conv' + (String(c.id) === String(active) ? ' on' : '')} onClick={() => setActive(String(c.id))}>
              <div className="t">
                <span>{c.otherName}</span>
                {c.unread > 0 && <span className="unread-pill">{c.unread}</span>}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>{c.listingTitle} · {c.role}</div>
              <div className="s">{c.lastMessage || 'No messages yet'}</div>
            </div>
          ))}
        </div>
        <div className="chat-thread">
          {!active && <div className="empty">Pick a conversation</div>}
          {active && (
            <>
              <div className="thread-head">
                {current ? `${current.otherName} · ${current.listingTitle}` : 'Conversation'}
              </div>
              <div className="msgs" ref={box}>
                {msgs.map((m) => (
                  <div key={m.id} className={'bubble ' + (m.senderId === user.id ? 'me' : 'them')} title={timeAgo(m.createdAt)}>
                    {m.text}
                  </div>
                ))}
              </div>
              <form className="composer" onSubmit={send}>
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." maxLength={1000} />
                <button className="btn">Send</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
