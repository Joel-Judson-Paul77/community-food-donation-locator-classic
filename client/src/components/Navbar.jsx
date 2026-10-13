import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth, dashboardPath } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const handleLogout = () => {
    logout();
    close();
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand" onClick={close}>
          <img src="/favicon.svg" alt="" width="32" height="32" />
          <span>
            Food<b>Share</b>
          </span>
        </Link>

        <button className="nav-toggle" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span />
          <span />
          <span />
        </button>

        <nav className={`nav-links ${open ? 'open' : ''}`}>
          <NavLink to="/browse" onClick={close}>Find food</NavLink>
          {user?.role === 'donor' && <NavLink to="/donate" onClick={close}>Donate food</NavLink>}
          {user && (
            <NavLink to={dashboardPath(user)} onClick={close}>
              {user.role === 'admin' ? 'Admin' : 'Dashboard'}
            </NavLink>
          )}
          {user ? (
            <>
              <NavLink to="/profile" className="nav-user" onClick={close} title="Your profile">
                <span className="avatar">{user.name[0]?.toUpperCase()}</span>
                <span className="nav-user-name">{user.name.split(' ')[0]}</span>
              </NavLink>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <>
              <NavLink to="/login" onClick={close}>Log in</NavLink>
              <Link to="/register" className="btn btn-primary btn-sm" onClick={close}>Join now</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
