import { ArrowRight, Clock3, List, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TIME_PER_QUESTION, getDeckAppearance } from '../decks.js';

export default function DeckList({ decks, onPlay, onEdit, onDelete, onCreate }) {
  if (!decks.length) return <div className="state-panel empty-panel"><span className="empty-mark" aria-hidden="true">✦</span><h3>A little curiosity starts here.</h3><p>No quizzes yet. Create your first one or import a JSON file.</p><Button onClick={onCreate}><Plus />Create a quiz</Button></div>;

  return <div className="quiz-grid">
    {decks.map((deck, index) => {
      const appearance = getDeckAppearance(deck, index);
      return <Card key={deck.id} className="quiz-card">
        <CardContent className="quiz-cover" style={{ backgroundColor: appearance.color }}>
          <span className="cover-emoji" aria-hidden="true">{appearance.emoji}</span>
          <Badge className="category-badge">{appearance.category}</Badge>
        </CardContent>
        <CardHeader className="quiz-card-header">
          <div className="quiz-title-row"><CardTitle><h3>{deck.title}</h3></CardTitle>
            <div className="card-actions">
              <Button variant="ghost" size="icon-xs" onClick={() => onEdit(deck)} aria-label={`Edit ${deck.title}`} title="Edit quiz"><Pencil /></Button>
              <Button variant="ghost" size="icon-xs" onClick={() => onDelete(deck)} aria-label={`Delete ${deck.title}`} title="Delete quiz"><Trash2 /></Button>
            </div>
          </div>
          <CardDescription>{appearance.description}</CardDescription>
        </CardHeader>
        <CardFooter className="quiz-card-footer">
          <div className="quiz-meta"><span><Clock3 />{deck.questions.length * TIME_PER_QUESTION} sec</span><span><List />{deck.questions.length} questions</span></div>
          <Button size="sm" className="play-button" onClick={() => onPlay(deck)} aria-label={`Play ${deck.title}`}>Play quiz <ArrowRight /></Button>
        </CardFooter>
      </Card>;
    })}
  </div>;
}
