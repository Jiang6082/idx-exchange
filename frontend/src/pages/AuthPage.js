import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSessionToken, loginAccount, logoutAccount, registerAccount } from '../api/client';
import './AuthPage.css';

function AuthPage() {
  const navigate = useNavigate();
  const [isSignedIn, setIsSignedIn] = useState(Boolean(getSessionToken()));
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    function handleSessionChange() {
      setIsSignedIn(Boolean(getSessionToken()));
    }

    window.addEventListener('idx-session-change', handleSessionChange);
    return () => {
      window.removeEventListener('idx-session-change', handleSessionChange);
    };
  }, []);

  return (
    <div className="auth-page">
      <section className="panel auth-card">
        <span className="section-kicker">Authentication</span>
        <h1>{mode === 'login' ? 'Sign in to sync your workspace' : 'Create your account'}</h1>
        <p>
          Sign in with email and password to unlock real session-backed collaboration,
          alerts, and account persistence across devices.
        </p>

        <div className="auth-toggle">
          <button
            type="button"
            className={mode === 'login' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setMode('login')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setMode('register')}
          >
            Register
          </button>
        </div>

        {isSignedIn && (
          <button
            type="button"
            className="btn-secondary"
            onClick={async () => {
              await logoutAccount();
              setMessage('You have been signed out.');
            }}
          >
            Sign out
          </button>
        )}

        <div className="auth-form">
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Full name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={async () => {
              try {
                if (mode === 'login') {
                  await loginAccount(form);
                } else {
                  await registerAccount(form);
                }
                navigate('/workspace');
              } catch (error) {
                setMessage('Unable to complete authentication right now.');
              }
            }}
          >
            {mode === 'login' ? 'Continue' : 'Create account'}
          </button>
          {message && <p className="auth-message">{message}</p>}
        </div>
      </section>
    </div>
  );
}

export default AuthPage;
