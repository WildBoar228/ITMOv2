import { useEffect, useRef, useState } from 'react';
import {
  Alert, AppBar, Button, CircularProgress, Container, Dialog,
  DialogActions, DialogContent, DialogContentText, DialogTitle, Stack, Toolbar, Typography,
} from '@mui/material';
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
  const titleRef = useRef(null);
  const importRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadDecks() {
      setLoadStatus('loading');
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/decks.json`, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data) || !data.every(validateDeck)) throw new Error('Некорректный формат игр');
        if (!controller.signal.aborted) {
          setDecks(normalizeDecks(data));
          setLoadStatus('ready');
        }
      } catch (error) {
        if (!controller.signal.aborted) setLoadStatus('error');
      }
    }
    loadDecks();
    return () => controller.abort();
  }, [loadAttempt]);

  useEffect(() => { titleRef.current?.focus(); }, [screen]);

  function openEditor(deck = null) {
    setEditingDeck(deck);
    setScreen('editor');
  }

  function saveDeck(deck) {
    setDecks((current) => editingDeck
      ? current.map((item) => item.id === editingDeck.id ? deck : item)
      : [...current, deck]);
    setNotice({ severity: 'success', text: 'Игра сохранена. Можно начинать!' });
    setScreen('list');
  }

  async function importDecks(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const items = Array.isArray(data) ? data : [data];
      if (!items.length || !items.every(validateDeck)) throw new Error('Проверьте название, вопросы, четыре варианта и индекс правильного ответа (0–3).');
      setDecks((current) => [...current, ...normalizeDecks(items, current)]);
      setNotice({ severity: 'success', text: `Импортировано игр: ${items.length}.` });
    } catch (error) {
      setNotice({ severity: 'error', text: `Не удалось импортировать JSON. ${error.message}` });
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
    <>
      <AppBar position="sticky" color="transparent" sx={{ bgcolor: 'rgba(15,18,38,.94)', backdropFilter: 'blur(8px)' }}>
        <Toolbar sx={{ gap: 2, flexWrap: 'wrap', py: 1 }}>
          <Typography component="div" variant="h3" sx={{ flexGrow: 1 }}>🎯 Quiz-карточки</Typography>
          <Stack component="nav" aria-label="Основная навигация" direction="row" spacing={1}>
            <Button onClick={() => setScreen('list')} aria-current={screen === 'list' ? 'page' : undefined}>Игры</Button>
            <Button variant="contained" disabled={loadStatus !== 'ready'} onClick={() => openEditor()}>+ Новая игра</Button>
          </Stack>
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="md" sx={{ py: 4, pb: 8 }}>
        {notice && <Alert severity={notice.severity} onClose={() => setNotice(null)} sx={{ mb: 3 }}>{notice.text}</Alert>}
        {screen === 'list' && <>
          <Typography ref={titleRef} tabIndex={-1} className="screen-title" variant="h1" gutterBottom>Выбери игру</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>15 секунд на вопрос · 4 варианта · прогресс не сохраняется</Typography>
          {loadStatus === 'loading' && <Stack role="status" direction="row" spacing={2} alignItems="center"><CircularProgress size={24} /><span>Загружаем игры…</span></Stack>}
          {loadStatus === 'error' && <Alert severity="error" action={<Button color="inherit" onClick={() => setLoadAttempt((value) => value + 1)}>Повторить</Button>}>Не удалось загрузить игры. Проверьте соединение и повторите попытку.</Alert>}
          {loadStatus === 'ready' && <>
            <DeckList decks={decks} onPlay={(deck) => { setPlayingDeck(deck); setScreen('play'); }} onEdit={openEditor} onDelete={setDeletingDeck} />
            <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" sx={{ mt: 3 }}>
              <Button variant="outlined" onClick={() => importRef.current.click()}>Импорт JSON</Button>
              <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={importDecks} />
              <Button variant="outlined" onClick={exportDecks}>Скачать все игры</Button>
            </Stack>
            <Typography color="text.secondary" variant="body2" sx={{ mt: 2 }}>Изменения хранятся до перезагрузки страницы. Скачайте JSON, чтобы сохранить свои игры.</Typography>
          </>}
        </>}
        {screen === 'editor' && <DeckEditor key={editingDeck?.id ?? 'new'} deck={editingDeck} onSave={saveDeck} onCancel={() => setScreen('list')} />}
        {screen === 'play' && playingDeck && <Game deck={playingDeck} onHome={() => setScreen('list')} />}
      </Container>
      <Dialog open={Boolean(deletingDeck)} onClose={() => setDeletingDeck(null)} aria-labelledby="delete-title" aria-describedby="delete-description">
        <DialogTitle id="delete-title">Удалить игру?</DialogTitle>
        <DialogContent><DialogContentText id="delete-description">Игра «{deletingDeck?.title}» будет удалена из текущего списка.</DialogContentText></DialogContent>
        <DialogActions>
          <Button autoFocus onClick={() => setDeletingDeck(null)}>Отмена</Button>
          <Button color="error" onClick={() => {
            setDecks((current) => current.filter((deck) => deck.id !== deletingDeck.id));
            setDeletingDeck(null);
          }}>Удалить</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
