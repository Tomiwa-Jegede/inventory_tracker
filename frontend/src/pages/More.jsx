import { Link } from 'react-router-dom';
import { Button, Card, ListRow } from '../components/ui.jsx';

export default function More({ session, onLogout }) {
  const isOwner = session?.user?.role === 'owner';
  return (
    <div>
      <h2 className="page-title">More</h2>
      {isOwner ? (
        <Card>
          <Link className="listrow" to="/more/products">Products<span aria-hidden="true"> ›</span></Link>
          <Link className="listrow" to="/more/recipes">Recipes<span aria-hidden="true"> ›</span></Link>
          <Link className="listrow" to="/more/overheads">Overheads<span aria-hidden="true"> ›</span></Link>
          <Link className="listrow" to="/more/recurring">Recurring expenses<span aria-hidden="true"> ›</span></Link>
        </Card>
      ) : (
        <Card><p className="stat-label">Staff workspace — sales only. Setup screens are owner-only.</p></Card>
      )}
      <Card>
        <ListRow title={session?.user?.email} subtitle={`Role: ${session?.user?.role}`} />
        <div className="mt"><Button variant="secondary" block onClick={onLogout}>Log out</Button></div>
      </Card>
    </div>
  );
}
