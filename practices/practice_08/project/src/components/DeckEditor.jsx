import { useRef, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, FormControlLabel, Radio, RadioGroup, Stack, TextField, Typography } from '@mui/material';
import { createId, newQuestion, validateDeck } from '../decks.js';

export default function DeckEditor({ deck, onSave, onCancel }) {
  const [title, setTitle] = useState(deck?.title ?? '');
  const [questions, setQuestions] = useState(() => deck
    ? deck.questions.map((question) => ({ ...question, id: createId(), options: [...question.options] }))
    : [newQuestion()]);
  const [error, setError] = useState('');
  const saving = useRef(false);

  function updateQuestion(id, patch) {
    setQuestions((current) => current.map((question) => question.id === id ? { ...question, ...patch } : question));
  }

  function submit(event) {
    event.preventDefault();
    if (saving.current) return;
    const result = {
      id: deck?.id ?? createId(), title: title.trim(),
      questions: questions.map((question, index) => ({
        id: `q${index + 1}`, q: question.q.trim(), options: question.options.map((option) => option.trim()),
        correct: question.correct,
        ...(question.explain?.trim() ? { explain: question.explain.trim() } : {}),
      })),
    };
    if (!validateDeck(result)) {
      setError('Введите название, добавьте хотя бы один вопрос и заполните текст и все четыре варианта ответа. Поля не могут состоять только из пробелов.');
      return;
    }
    saving.current = true;
    onSave(result);
  }

  return <Box component="form" onSubmit={submit}>
    <Typography variant="h1" gutterBottom>{deck ? 'Редактирование' : 'Новая игра'}</Typography>
    <TextField label="Название игры" required autoFocus value={title} onChange={(event) => setTitle(event.target.value)} slotProps={{ htmlInput: { maxLength: 80 } }} sx={{ my: 2 }} />
    {questions.map((question, index) => <Card key={question.id} component="fieldset" sx={{ m: 0, mb: 2, p: 0, minWidth: 0 }}>
      <Typography component="legend" sx={{ mx: 2, px: 1 }}>Вопрос {index + 1}</Typography>
      <CardContent>
        <Stack spacing={2}>
          <TextField label="Текст вопроса" required value={question.q} onChange={(event) => updateQuestion(question.id, { q: event.target.value })} slotProps={{ htmlInput: { maxLength: 200 } }} />
          {question.options.map((option, optionIndex) => <TextField key={optionIndex} required label={`Вариант ${optionIndex + 1}`} value={option} slotProps={{ htmlInput: { maxLength: 120 } }} onChange={(event) => updateQuestion(question.id, { options: question.options.map((text, i) => i === optionIndex ? event.target.value : text) })} />)}
          <Box>
            <Typography id={`correct-${question.id}`}>Правильный ответ</Typography>
            <RadioGroup row aria-labelledby={`correct-${question.id}`} name={`correct-${question.id}`} value={question.correct} onChange={(event) => updateQuestion(question.id, { correct: Number(event.target.value) })}>
              {question.options.map((_, i) => <FormControlLabel key={i} value={i} control={<Radio />} label={`Вариант ${i + 1}`} />)}
            </RadioGroup>
          </Box>
          <TextField label="Пояснение (необязательно)" value={question.explain ?? ''} slotProps={{ htmlInput: { maxLength: 300 } }} onChange={(event) => updateQuestion(question.id, { explain: event.target.value })} />
          <Button color="error" sx={{ alignSelf: 'flex-start' }} onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id))}>Удалить вопрос {index + 1}</Button>
        </Stack>
      </CardContent>
    </Card>)}
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
      <Button variant="outlined" onClick={() => setQuestions((current) => [...current, newQuestion()])}>+ Вопрос</Button>
      <Button variant="contained" type="submit">Сохранить игру</Button>
      <Button onClick={onCancel}>Отмена</Button>
    </Stack>
  </Box>;
}
