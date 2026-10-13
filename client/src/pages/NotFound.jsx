import { Link } from 'react-router-dom';
import { EmptyState } from '../components/Loader.jsx';

export default function NotFound() {
  return (
    <div className="container page">
      <EmptyState icon="🥡" title="Page not found">
        <Link to="/" className="btn btn-primary">Go home</Link>
      </EmptyState>
    </div>
  );
}
