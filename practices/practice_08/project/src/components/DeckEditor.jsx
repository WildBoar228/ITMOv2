import { useRef, useState } from 'react';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createId, newQuestion, validateDeck } from '../decks.js';

const letters = ['A', 'B', 'C', 'D'];

export default function DeckEditor({ deck, onSave, onCancel }) {
  const [title, setTitle] = useState(deck?.title ?? '');
  const [category, setCategory] = useState(deck?.category ?? '');
  const [description, setDescription] = useState(deck?.description ?? '');
  const [questions, setQuestions] = useState(() => deck
    ? deck.questions.map((question) => ({ ...question, id: createId(), options: [...question.options] }))
    : [newQuestion()]);
  const [error, setError] = useState('');
  const errorRef = useRef(null);
  const saving = useRef(false);

  function updateQuestion(id, patch) {
    setQuestions((current) => current.map((question) => question.id === id ? { ...question, ...patch } : question));
  }

  function submit(event) {
    event.preventDefault();
    if (saving.current) return;
    const result = {
      ...deck, id: deck?.id ?? createId(), title: title.trim(),
      category: category.trim(), description: description.trim(),
      questions: questions.map((question, index) => ({
        id: `q${index + 1}`, q: question.q.trim(), options: question.options.map((option) => option.trim()),
        correct: question.correct,
        ...(question.explain?.trim() ? { explain: question.explain.trim() } : {}),
      })),
    };
    if (!validateDeck(result)) {
      setError('Add a quiz name and at least one question. Fill in each question and all four answers; spaces alone do not count.');
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    saving.current = true;
    onSave(result);
  }

  return <>
    <DialogHeader className="editor-header"><p className="eyebrow">Make it yours</p><DialogTitle>{deck ? 'Edit your quiz' : 'Create a new quiz'}</DialogTitle><DialogDescription className="sr-only">Name your quiz, add questions and choose one correct answer for each.</DialogDescription></DialogHeader>
    <form className="editor-body" onSubmit={submit}>
      <div className="form-row">
        <div className="field"><Label htmlFor="game-title">Game name</Label><Input id="game-title" required autoFocus maxLength={80} placeholder="e.g. Curious about coffee" value={title} onChange={(event) => setTitle(event.target.value)} /></div>
        <div className="field"><Label htmlFor="game-category">Category <span className="optional">· optional</span></Label><Input id="game-category" maxLength={40} placeholder="e.g. Food & drink" value={category} onChange={(event) => setCategory(event.target.value)} /></div>
      </div>
      <div className="field"><Label htmlFor="game-description">Description <span className="optional">· optional</span></Label><Input id="game-description" maxLength={160} placeholder="A little introduction to your quiz" value={description} onChange={(event) => setDescription(event.target.value)} /></div>
      {questions.map((question, index) => <Card key={question.id} className="question-card">
        <CardContent>
          <div className="question-card-head"><h3 id={`question-${question.id}`}>Question {index + 1}</h3><Button type="button" variant="ghost" size="icon-xs" aria-label={`Remove question ${index + 1}`} onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id))}><Trash2 /></Button></div>
          <div className="field"><Label htmlFor={`text-${question.id}`}>Question</Label><Input id={`text-${question.id}`} required maxLength={200} placeholder="What would you like to ask?" value={question.q} onChange={(event) => updateQuestion(question.id, { q: event.target.value })} /></div>
          <fieldset className="answer-fields"><legend>Four answer options</legend><div className="answer-input-grid">
            {question.options.map((option, optionIndex) => <div className="answer-input" key={optionIndex}><Label htmlFor={`option-${question.id}-${optionIndex}`} className="sr-only">Question {index + 1}, option {letters[optionIndex]}</Label><span aria-hidden="true">{letters[optionIndex]}</span><Input id={`option-${question.id}-${optionIndex}`} required maxLength={120} placeholder={`Option ${letters[optionIndex]}`} value={option} onChange={(event) => updateQuestion(question.id, { options: question.options.map((text, i) => i === optionIndex ? event.target.value : text) })} /></div>)}
          </div></fieldset>
          <div className="correct-pick"><Label htmlFor={`correct-${question.id}`}>Correct answer</Label><Select value={String(question.correct)} onValueChange={(value) => updateQuestion(question.id, { correct: Number(value) })}><SelectTrigger id={`correct-${question.id}`} aria-label={`Correct answer for question ${index + 1}`}><SelectValue /></SelectTrigger><SelectContent>{letters.map((letter, i) => <SelectItem key={letter} value={String(i)}>{letter}</SelectItem>)}</SelectContent></Select></div>
          <div className="field explanation-field"><Label htmlFor={`explain-${question.id}`}>Explanation <span className="optional">· optional</span></Label><Input id={`explain-${question.id}`} maxLength={300} placeholder="A fun fact or helpful context" value={question.explain ?? ''} onChange={(event) => updateQuestion(question.id, { explain: event.target.value })} /></div>
        </CardContent>
      </Card>)}
      {error && <Alert variant="destructive" className="editor-error" ref={errorRef} tabIndex={-1}><AlertDescription>{error}</AlertDescription></Alert>}
      <Button type="button" variant="outline" onClick={() => setQuestions((current) => [...current, newQuestion()])}><Plus />Add another question</Button>
      <div className="form-actions"><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit">Save game <ArrowRight /></Button></div>
    </form>
  </>;
}
