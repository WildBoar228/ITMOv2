import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import { TIME_PER_QUESTION } from '../decks.js';

function Question({ question, index, total, score, onNext }) {
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [answer, setAnswer] = useState(null);
  const locked = useRef(false);
  const deadline = useRef(0);
  const timerRef = useRef(null);
  const titleRef = useRef(null);
  const nextRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
    deadline.current = performance.now() + TIME_PER_QUESTION * 1000;
    const timer = setInterval(() => {
      if (locked.current) return;
      const remaining = Math.max(0, (deadline.current - performance.now()) / 1000);
      setTimeLeft(remaining);
      if (remaining === 0) {
        locked.current = true;
        clearInterval(timer);
        setAnswer({ choice: -1, gained: 0 });
      }
    }, 100);
    timerRef.current = timer;
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { if (answer) nextRef.current?.focus(); }, [answer]);

  function choose(choice) {
    if (locked.current) return;
    locked.current = true;
    clearInterval(timerRef.current);
    const remaining = Math.max(0, (deadline.current - performance.now()) / 1000);
    setTimeLeft(remaining);
    const selected = remaining > 0 ? choice : -1;
    setAnswer({ choice: selected, gained: selected === question.correct ? 10 + Math.ceil(remaining) : 0 });
  }

  const isCorrect = answer?.choice === question.correct;
  return <>
    <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="center" sx={{ my: 2 }}>
      <Typography color="text.secondary">Вопрос {index + 1} из {total}</Typography>
      <Chip label={`${score + (answer?.gained ?? 0)} очков`} />
    </Stack>
    <LinearProgress variant="determinate" value={timeLeft / TIME_PER_QUESTION * 100} color={timeLeft <= 5 ? 'error' : 'secondary'} aria-label="Оставшееся время" sx={{ height: 8, borderRadius: 4 }} />
    <Typography color="text.secondary" sx={{ mt: 1 }}>Осталось: {Math.ceil(timeLeft)} с</Typography>
    <Typography component="h2" variant="h2" ref={titleRef} tabIndex={-1} className="question-title" sx={{ mt: 3 }}>{question.q}</Typography>
    <Box className="answer-grid">
      {question.options.map((option, i) => <Button key={i} variant="outlined" disabled={Boolean(answer)} onClick={() => choose(i)} className={answer && i === question.correct ? 'answer-correct' : answer?.choice === i ? 'answer-wrong' : ''}>{option}</Button>)}
    </Box>
    {answer && <>
      <Alert severity={isCorrect ? 'success' : 'warning'} role="status">
        {isCorrect ? `Верно! +${answer.gained}` : answer.choice === -1 ? 'Время вышло!' : 'Неверно.'}
        {!isCorrect && <Typography>Правильный ответ: {question.options[question.correct]}</Typography>}
        {question.explain && <Typography sx={{ mt: 1 }}>{question.explain}</Typography>}
      </Alert>
      <Button ref={nextRef} variant="contained" sx={{ mt: 3 }} onClick={() => onNext(answer.gained, isCorrect)}>{index === total - 1 ? 'К результату' : 'Далее'}</Button>
    </>}
  </>;
}

export default function Game({ deck, onHome }) {
  const [game, setGame] = useState({ index: 0, score: 0, correctCount: 0, finished: false, attempt: 0 });
  const resultRef = useRef(null);
  const advancedQuestion = useRef(null);
  useEffect(() => { if (game.finished) resultRef.current?.focus(); }, [game.finished]);

  function next(gained, correct) {
    const key = `${game.attempt}-${game.index}`;
    if (advancedQuestion.current === key) return;
    advancedQuestion.current = key;
    setGame((current) => ({ ...current, score: current.score + gained, correctCount: current.correctCount + Number(correct), index: current.index + 1, finished: current.index === deck.questions.length - 1 }));
  }

  if (game.finished) return <>
    <Typography variant="h1" ref={resultRef} tabIndex={-1} className="screen-title">Результат</Typography>
    <Typography sx={{ fontSize: { xs: 40, sm: 54 }, fontWeight: 900, my: 2 }}>{game.score} очков</Typography>
    <Typography>Правильно: {game.correctCount} из {deck.questions.length} · «{deck.title}»</Typography>
    <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" sx={{ mt: 3 }}>
      <Button variant="contained" onClick={() => setGame((current) => ({ index: 0, score: 0, correctCount: 0, finished: false, attempt: current.attempt + 1 }))}>Пройти ещё раз</Button>
      <Button variant="outlined" onClick={onHome}>К списку игр</Button>
    </Stack>
  </>;

  return <>
    <Typography variant="h1">{deck.title}</Typography>
    <Question key={`${game.attempt}-${game.index}`} question={deck.questions[game.index]} index={game.index} total={deck.questions.length} score={game.score} onNext={next} />
    <Button sx={{ mt: 3 }} onClick={onHome}>К списку игр</Button>
  </>;
}
