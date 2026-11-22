import { Alert, Box, Button, Card, CardActions, CardContent, Stack, Typography } from '@mui/material';
import { TIME_PER_QUESTION } from '../decks.js';

export default function DeckList({ decks, onPlay, onEdit, onDelete }) {
  if (!decks.length) return <Alert severity="info">Пока нет игр. Создай первую через «+ Новая игра» или импортируй JSON.</Alert>;

  return <Box className="deck-grid">
    {decks.map((deck) => <Card key={deck.id} component="article" sx={{ display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h3" component="h2" gutterBottom>{deck.title}</Typography>
        <Typography color="text.secondary">{deck.questions.length} вопр. · {TIME_PER_QUESTION} с на вопрос</Typography>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button variant="contained" onClick={() => onPlay(deck)} aria-label={`Играть: ${deck.title}`}>Играть</Button>
        <Stack direction="row" useFlexGap flexWrap="wrap">
          <Button size="small" onClick={() => onEdit(deck)} aria-label={`Редактировать «${deck.title}»`}>Правка</Button>
          <Button size="small" color="error" onClick={() => onDelete(deck)} aria-label={`Удалить «${deck.title}»`}>Удалить</Button>
        </Stack>
      </CardActions>
    </Card>)}
  </Box>;
}
