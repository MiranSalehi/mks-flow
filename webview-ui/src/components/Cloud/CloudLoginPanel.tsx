import { useState } from 'react';
import { Button } from '../shared/Button';

type LoginTab = 'signin' | 'token';

interface CloudLoginPanelProps {
  onLogin: (email: string, password: string) => void;
  onLoginWithToken: (token: string) => void;
}

export function CloudLoginPanel({ onLogin, onLoginWithToken }: CloudLoginPanelProps) {
  const [tab, setTab] = useState<LoginTab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');

  const submitSignIn = () => {
    if (!email.trim() || !password) {
      return;
    }
    onLogin(email.trim(), password);
  };

  const submitToken = () => {
    if (!token.trim()) {
      return;
    }
    onLoginWithToken(token.trim());
  };

  return (
    <div className="cloud-login">
      <h2 className="cloud-login__title">Sign in to MKSFlow Cloud</h2>
      <p className="cloud-login__hint">
        Team mode shows tasks assigned to you on mksflow.com. Create an API token in
        Profile with tasks:read and tasks:write.
      </p>

      <div className="cloud-login__tabs" role="tablist" aria-label="Sign-in method">
        <button
          type="button"
          role="tab"
          className={`cloud-login__tab${tab === 'signin' ? ' cloud-login__tab--active' : ''}`}
          aria-selected={tab === 'signin'}
          onClick={() => setTab('signin')}
        >
          Email
        </button>
        <button
          type="button"
          role="tab"
          className={`cloud-login__tab${tab === 'token' ? ' cloud-login__tab--active' : ''}`}
          aria-selected={tab === 'token'}
          onClick={() => setTab('token')}
        >
          API token
        </button>
      </div>

      {tab === 'signin' ? (
        <>
          <div className="field-group">
            <label className="field-label" htmlFor="cloud-email">
              Email
            </label>
            <input
              id="cloud-email"
              className="input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="cloud-password">
              Password
            </label>
            <input
              id="cloud-password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  submitSignIn();
                }
              }}
            />
          </div>
          <Button onClick={submitSignIn}>Sign in</Button>
        </>
      ) : (
        <>
          <div className="field-group">
            <label className="field-label" htmlFor="cloud-token">
              API token
            </label>
            <input
              id="cloud-token"
              className="input"
              type="password"
              autoComplete="off"
              placeholder="Paste token from mksflow.com Profile"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  submitToken();
                }
              }}
            />
          </div>
          <Button onClick={submitToken}>Connect</Button>
        </>
      )}
    </div>
  );
}
