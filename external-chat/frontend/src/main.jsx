import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import './styles.css';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const FN = import.meta.env.VITE_ASTRA_FUNCTION_URL || (URL + '/functions/v1/astra-external-chat');
if (!URL || !KEY) throw new Error('Brak konfiguracji Supabase');

const supabase = createClient(URL, KEY);

async function astra(token, body) {
  const res = await fetch(FN, {
    method: 'POST',
    headers: {'Content-Type':'application/json','Authorization':'Bearer ' + token,'apikey':KEY},
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({ok:false,error:'INVALID_RESPONSE'}));
  if (!res.ok || data.ok === false) throw new Error(data.error || ('HTTP_' + res.status));
  return data;
}

function Auth() {
  const [signup,setSignup]=useState(false), [email,setEmail]=useState(''), [password,setPassword]=useState('');
  const [busy,setBusy]=useState(false), [info,setInfo]=useState(''), [error,setError]=useState('');
  async function submit(e) {
    e.preventDefault(); setBusy(true); setInfo(''); setError('');
    try {
      if (signup) {
        const r=await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin}});
        if (r.error) throw r.error;
        if (!r.data.session) setInfo('Sprawdź e-mail i potwierdź konto, potem zaloguj się.');
      } else {
        const r=await supabase.auth.signInWithPassword({email,password});
        if (r.error) throw r.error;
      }
    } catch(e) { setError(e.message || 'Błąd logowania'); }
    finally { setBusy(false); }
  }
  return <main className="auth"><section className="card">
    <div className="logo"><b>A</b><div><strong>ASTRA</strong><small>EXTERNAL v0.1</small></div></div>
    <h1>{signup?'Utwórz dostęp':'Wejdź do Astry'}</h1>
    <p>Niezależny czat poza interfejsem ChatGPT.</p>
    <form onSubmit={submit}>
      <input type="email" placeholder="E-mail" required value={email} onChange={e=>setEmail(e.target.value)} />
      <input type="password" placeholder="Hasło (min. 8 znaków)" minLength="8" required value={password} onChange={e=>setPassword(e.target.value)} />
      {error&&<div className="err">{error}</div>}{info&&<div className="ok">{info}</div>}
      <button disabled={busy}>{busy?'Pracuję…':signup?'Utwórz konto':'Zaloguj'}</button>
    </form>
    <button className="link" onClick={()=>{setSignup(!signup);setError('');setInfo('')}}>{signup?'Mam konto — logowanie':'Nie mam konta — rejestracja'}</button>
  </section></main>;
}

function App() {
  const [ready,setReady]=useState(false), [session,setSession]=useState(null);
  const [chats,setChats]=useState([]), [chatId,setChatId]=useState(null), [messages,setMessages]=useState([]);
  const [configured,setConfigured]=useState(false), [checked,setChecked]=useState(false), [groqKey,setGroqKey]=useState('');
  const [draft,setDraft]=useState(''), [busy,setBusy]=useState(false), [error,setError]=useState('');
  const end=useRef(null);

  useEffect(()=>{
    supabase.auth.getSession().then(r=>{setSession(r.data.session||null);setReady(true)});
    const l=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);setReady(true)});
    return ()=>l.data.subscription.unsubscribe();
  },[]);

  const loadChats=useCallback(async()=>{
    if(!session)return;
    const r=await supabase.from('astra_external_sessions').select('id,title,updated_at').order('updated_at',{ascending:false}).limit(100);
    if(r.error)throw r.error; setChats(r.data||[]);
  },[session]);

  const loadMessages=useCallback(async(id)=>{
    if(!id){setMessages([]);return}
    const r=await supabase.from('astra_external_messages').select('id,role,content,created_at').eq('session_id',id).in('role',['user','assistant']).order('id',{ascending:true}).limit(500);
    if(r.error)throw r.error; setMessages(r.data||[]);
  },[]);

  const check=useCallback(async()=>{
    if(!session)return;
    try { const r=await astra(session.access_token,{action:'provider_status'}); setConfigured(!!r.configured); }
    catch(e){setError(e.message)} finally{setChecked(true)}
  },[session]);

  useEffect(()=>{if(session){loadChats().catch(e=>setError(e.message));check()}},[session,loadChats,check]);
  useEffect(()=>{if(session)loadMessages(chatId).catch(e=>setError(e.message))},[session,chatId,loadMessages]);
  useEffect(()=>end.current&&end.current.scrollIntoView({behavior:'smooth'}),[messages,busy]);

  async function saveKey(e){
    e.preventDefault();setBusy(true);setError('');
    try {await astra(session.access_token,{action:'set_provider_key',api_key:groqKey});setGroqKey('');setConfigured(true)}
    catch(e){setError(e.message==='PROVIDER_KEY_REJECTED'?'Groq odrzucił klucz.':e.message)}
    finally{setBusy(false)}
  }

  async function send(e){
    e&&e.preventDefault(); const text=draft.trim();
    if(!text||busy||!configured)return;
    setDraft('');setBusy(true);setError('');
    const local='local-'+Date.now();setMessages(v=>v.concat([{id:local,role:'user',content:text}]));
    try{
      const r=await astra(session.access_token,{action:'chat',session_id:chatId,message:text});
      setChatId(r.session_id); await loadChats(); await loadMessages(r.session_id);
    }catch(e){setMessages(v=>v.filter(x=>x.id!==local));setError(e.message==='PROVIDER_RATE_LIMIT'?'Darmowy limit Groq został osiągnięty — spróbuj później.':e.message)}
    finally{setBusy(false)}
  }

  if(!ready)return <main className="splash">Uruchamiam ASTRA…</main>;
  if(!session)return <Auth/>;

  return <div className="shell">
    <aside>
      <div className="logo"><b>A</b><div><strong>ASTRA</strong><small>EXTERNAL v0.1</small></div></div>
      <button className="new" onClick={()=>{setChatId(null);setMessages([]);setError('')}}>＋ Nowa rozmowa</button>
      <nav>{chats.map(c=><button className={c.id===chatId?'active':''} key={c.id} onClick={()=>setChatId(c.id)}><span>{c.title}</span><small>{new Date(c.updated_at).toLocaleDateString('pl-PL')}</small></button>)}</nav>
      <footer><span className={configured?'status on':'status'}>● {checked?(configured?'Groq podłączony':'Model niepodłączony'):'Sprawdzam…'}</span><button className="link" onClick={()=>supabase.auth.signOut()}>Wyloguj</button></footer>
    </aside>
    <main className="chat">
      <header><div><strong>ASTRA</strong><small>openai/gpt-oss-120b · Groq Free</small></div><span>EXTERNAL RUNTIME</span></header>
      {!configured&&checked?<section className="setup"><div className="provider">
        <h2>Podłącz darmowy model</h2>
        <p>Wklej klucz Groq. Po weryfikacji trafia zaszyfrowany do Supabase Vault i nie jest przechowywany w przeglądarce.</p>
        <form onSubmit={saveKey}><input type="password" placeholder="Klucz Groq API" minLength="20" required value={groqKey} onChange={e=>setGroqKey(e.target.value)}/><button disabled={busy}>{busy?'Sprawdzam…':'Podłącz'}</button></form>
        <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">Utwórz bezpłatny klucz Groq ↗</a>
      </div></section>:<section className="msgs">
        {!messages.length&&<div className="welcome"><b>A</b><h1>ASTRA jest gotowa</h1><p>Prawdziwy czat poza ChatGPT, z trwałą historią, aktualnym web search i bezpiecznym wykonywaniem kodu po stronie modelu.</p></div>}
        {messages.map(m=><article className={m.role} key={m.id}><div className="avatar">{m.role==='user'?'TY':'A'}</div><div>{m.content}</div></article>)}
        {busy&&<article className="assistant"><div className="avatar">A</div><div className="thinking">● ● ●</div></article>}<div ref={end}/>
      </section>}
      {error&&<div className="errorbar">{error}<button onClick={()=>setError('')}>×</button></div>}
      <form className="composer" onSubmit={send}><textarea rows="1" maxLength="20000" placeholder={configured?'Napisz do Astry…':'Najpierw podłącz Groq'} disabled={!configured||busy} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(e)}}}/><button disabled={!configured||busy||!draft.trim()}>↑</button></form>
    </main>
  </div>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
