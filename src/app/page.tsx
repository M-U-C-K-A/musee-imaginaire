import WallPage from '@/components/wall/WallPage';
import { artists, salles, wallItems } from '@/data';

export default function Home() {
  const items = wallItems();
  return (
    <WallPage
      items={items}
      artists={artists.length}
      salles={salles.map((s) => ({
        numeral: s.numeral,
        short: s.short,
        count: s.artists.reduce((n, a) => n + a.works.length, 0),
      }))}
    />
  );
}
