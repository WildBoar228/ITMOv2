import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Download, LoaderCircle, Plus, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import DeckList from './components/DeckList.jsx';
import DeckEditor from './components/DeckEditor.jsx';
import Game from './components/Game.jsx';
import { normalizeDecks, validateDeck } from './decks.js';

export default function App() {
  const [decks, setDecks] = useState([]);
  const [screen, setScreen] = useState('list');
  const [editingDeck, setEditingDeck] = useState(null);
  const [playingDeck, setPlayingDeck] = useState(null);
  const [deletingDeck, setDeletingDeck] = useState(null);
  const [loadStatus, setLoadStatus] = useState('loading');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [notice, setNotice] = useState(null);
  const [importing, setImporting] = useState(false);
  const importingRef = useRef(false);
  const importRef = useRef(null);
  const returnFocusRef = useRef(null);
  const newGameRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadDecks() {
      setLoadStatus('loading');
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/decks.json`, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data) || !data.every(validateDeck)) throw new Error('Invalid quiz data');
        if (!controller.signal.aborted) {
          setDecks(normalizeDecks(data));
          setLoadStatus('ready');
        }
      } catch {
        if (!controller.signal.aborted) setLoadStatus('error');
      }
    }
    loadDecks();
    return () => controller.abort();
  }, [loadAttempt]);

  function rememberFocus() {
    returnFocusRef.current = document.activeElement;
    setNotice(null);
  }

  function restoreFocus(event) {
    event.preventDefault();
    const target = returnFocusRef.current?.isConnected ? returnFocusRef.current : newGameRef.current;
    target?.focus();
  }

  function openEditor(deck = null) {
    rememberFocus();
    setEditingDeck(deck);
    setScreen('editor');
  }

  function saveDeck(deck) {
    setDecks((current) => editingDeck
      ? current.map((item) => item.id === editingDeck.id ? deck : item)
      : [deck, ...current]);
    setNotice({ severity: 'success', text: 'Your quiz is ready to play.' });
    setScreen('list');
  }

  async function importDecks(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || importingRef.current) return;
    importingRef.current = true;
    setImporting(true);
    try {
      const data = JSON.parse(await file.text());
      const items = Array.isArray(data) ? data : [data];
      if (!items.length || !items.every(validateDeck)) throw new Error('Each quiz needs a name, at least one question, four answers and a correct answer index (0–3).');
      setDecks((current) => [...current, ...normalizeDecks(items, current)]);
      setNotice({ severity: 'success', text: `Imported ${items.length} quiz(es).` });
    } catch (error) {
      setNotice({ severity: 'error', text: `Could not import JSON. ${error.message}` });
    } finally {
      importingRef.current = false;
      setImporting(false);
    }
  }

  function exportDecks() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(decks, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'decks.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <div className="shell">
      <a className="skip-link" href="#games">Skip to quizzes</a>
      <header className="topbar">
        <a href="#" className="brand" aria-label="Quiz Club home"><span className="brandmark" aria-hidden="true">q</span>quiz club</a>
        <nav aria-label="Main navigation"><a className="nav-link" href="#games" aria-current="page">Games</a></nav>
      </header>
      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div>
            <p className="eyebrow">Your next little challenge</p>
            <h1 id="hero-title">Make curiosity<br />your superpower.</h1>
            <p className="sub">Pick a quiz, trust your gut, and see what you know.</p>
          </div>
          <Button ref={newGameRef} size="lg" disabled={loadStatus !== 'ready'} onClick={() => openEditor()}><Plus />New game</Button>
        </section>
        {notice && <Alert variant={notice.severity === 'error' ? 'destructive' : 'default'} className={`notice notice-${notice.severity}`} role={notice.severity === 'error' ? 'alert' : 'status'}>
          <AlertDescription>{notice.text}</AlertDescription>
          <Button variant="ghost" size="icon-sm" className="notice-close" aria-label="Dismiss message" onClick={() => setNotice(null)}><X /></Button>
        </Alert>}
        <section id="games" aria-labelledby="games-title" tabIndex={-1}>
          <div className="sectionhead"><h2 id="games-title">Find your next quiz</h2><span>{loadStatus === 'ready' ? `${decks.length} games` : 'Your collection'}</span></div>
          {loadStatus === 'loading' && <div className="state-panel" role="status"><LoaderCircle className="animate-spin" /><h3>Getting your quizzes ready…</h3><p>Just a moment. Your next challenge is on its way.</p></div>}
          {loadStatus === 'error' && <Alert variant="destructive" className="state-panel"><AlertTitle>Could not load quizzes</AlertTitle><AlertDescription>Check your connection and try again.</AlertDescription><Button variant="outline" onClick={() => setLoadAttempt((value) => value + 1)}>Try again <ArrowRight /></Button></Alert>}
          {loadStatus === 'ready' && <>
            <DeckList decks={decks} onCreate={() => openEditor()} onPlay={(deck) => { rememberFocus(); setPlayingDeck(deck); setScreen('play'); }} onEdit={openEditor} onDelete={(deck) => { rememberFocus(); setDeletingDeck(deck); }} />
            <div className="collection-tools">
              <div className="tool-buttons">
                <Button variant="outline" disabled={importing} onClick={() => importRef.current.click()}>{importing ? <LoaderCircle className="animate-spin" /> : <Upload />}{importing ? 'Importing…' : 'Import JSON'}</Button>
                <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={importDecks} />
                <Button variant="ghost" onClick={exportDecks}><Download />Export quizzes</Button>
              </div>
              <p>Made a quiz? Export it to keep it.<br />Changes stay here until you refresh.</p>
            </div>
          </>}
        </section>
      </main>
      <footer className="footer"><span>Little quizzes. Big brain energy.</span><span>Made for the curious.</span></footer>
      <Dialog open={screen === 'editor'} onOpenChange={(open) => { if (!open) setScreen('list'); }}>
        <DialogContent className="editor-dialog" onCloseAutoFocus={restoreFocus}>
          <DeckEditor key={editingDeck?.id ?? 'new'} deck={editingDeck} onSave={saveDeck} onCancel={() => setScreen('list')} />
        </DialogContent>
      </Dialog>
      <Dialog open={screen === 'play'} onOpenChange={(open) => { if (!open) setScreen('list'); }}>
        <DialogContent className="game-dialog" showCloseButton={false} onOpenAutoFocus={(event) => event.preventDefault()} onCloseAutoFocus={restoreFocus}>
          {screen === 'play' && playingDeck && <Game key={playingDeck.id} deck={playingDeck} onHome={() => setScreen('list')} />}
        </DialogContent>
      </Dialog>
      <AlertDialog open={Boolean(deletingDeck)} onOpenChange={(open) => { if (!open) setDeletingDeck(null); }}>
        <AlertDialogContent onCloseAutoFocus={restoreFocus}>
          <AlertDialogHeader><AlertDialogTitle>Delete this quiz?</AlertDialogTitle><AlertDialogDescription>“{deletingDeck?.title}” will be removed from this session. You can import it again if you have an exported copy.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => {
              setDecks((current) => current.filter((deck) => deck.id !== deletingDeck.id));
              setDeletingDeck(null);
              setNotice({ severity: 'success', text: 'Quiz removed from your collection.' });
            }}>Delete quiz</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
