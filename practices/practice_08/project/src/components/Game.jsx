import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock3, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/utils';
import { TIME_PER_QUESTION } from '../decks.js';

const letters = ['A', 'B', 'C', 'D'];

function Question({ question, title, index, total, score, onNext, onHome }) {
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
    <div className="game-top"><span className="game-label">{title} · {index + 1} of {total}</span><div className={cn('timer', timeLeft <= 5 && 'timer-warning')} aria-label={`${Math.ceil(timeLeft)} seconds remaining`}><Clock3 aria-hidden="true" /><span>{Math.ceil(timeLeft)} s</span></div></div>
    <Progress className="game-progress" value={index / total * 100} aria-label="Quiz progress" />
    <DialogTitle ref={titleRef} tabIndex={-1} className="question-title">{question.q}</DialogTitle>
    <DialogDescription className="sr-only">Choose one of four answers. You have 15 seconds. After answering, continue to the next question.</DialogDescription>
    <div className="answers">
      {question.options.map((option, i) => <Button key={i} variant="outline" disabled={Boolean(answer)} onClick={() => choose(i)} className={cn('answer-option', answer && i === question.correct && 'answer-correct', answer?.choice === i && !isCorrect && 'answer-wrong')}><span className="answer-letter" aria-hidden="true">{letters[i]}</span><span>{option}</span>{answer && i === question.correct && <Check className="answer-check" aria-label="Correct answer" />}</Button>)}
    </div>
    {answer && <Alert className={cn('feedback', isCorrect ? 'feedback-good' : 'feedback-bad')} role="status"><AlertTitle>{isCorrect ? `That’s right! +${answer.gained} points` : answer.choice === -1 ? 'Time’s up!' : 'Not quite.'}</AlertTitle><AlertDescription>{!isCorrect && <p>The correct answer is {question.options[question.correct]}.</p>}{question.explain && <p>{question.explain}</p>}</AlertDescription></Alert>}
    <div className="game-bottom"><p className="score-hint">+10 points, plus time left, for a correct answer</p><Button ref={nextRef} disabled={!answer} onClick={() => onNext(answer.gained, isCorrect)}>{index === total - 1 ? 'To the result' : 'Next question'}<ArrowRight /></Button></div>
    <div className="game-secondary"><Button variant="ghost" size="sm" onClick={onHome}><ArrowLeft />All games</Button><span aria-live="polite">{score + (answer?.gained ?? 0)} points</span></div>
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

  if (game.finished) return <div className="result">
    <div className="result-mark" aria-hidden="true">{game.correctCount === deck.questions.length ? '✦' : '✓'}</div>
    <p className="eyebrow">Quiz complete</p>
    <DialogTitle ref={resultRef} tabIndex={-1}>{game.correctCount === deck.questions.length ? 'Perfect score!' : game.correctCount === 0 ? 'Good try!' : 'Nice work!'}</DialogTitle>
    <DialogDescription>You finished <strong>{deck.title}</strong></DialogDescription>
    <div className="result-score">{game.score}<span>pts</span></div>
    <div className="result-stats"><div><strong>{game.correctCount}/{deck.questions.length}</strong><span>Correct answers</span></div><div><strong>{Math.round(game.correctCount / deck.questions.length * 100)}%</strong><span>Accuracy</span></div></div>
    <div className="result-actions"><Button variant="outline" onClick={onHome}><ArrowLeft />All games</Button><Button onClick={() => setGame((current) => ({ index: 0, score: 0, correctCount: 0, finished: false, attempt: current.attempt + 1 }))}>Play again<RotateCcw /></Button></div>
  </div>;

  return <Question key={`${game.attempt}-${game.index}`} question={deck.questions[game.index]} title={deck.title} index={game.index} total={deck.questions.length} score={game.score} onNext={next} onHome={onHome} />;
}
