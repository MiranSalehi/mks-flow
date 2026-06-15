import { useState } from 'react';
import { Button } from '../shared/Button';

interface CloudLoginPanelProps {
  onLogin: (email: string, password: string) => void;
}

export function CloudLoginPanel({ onLogin }: CloudLoginPanelProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = () => {
    if (!email.trim() || !password) {
      return;
    }
    onLogin(email.trim(), password);
  };

  return (
    <div className="cloud-login">
      <h2 className="cloud-login__title">Sign in to MKSFlow Cloud</h2>
      <p className="cloud-login__hint">
        Team tasks assigned to you on mksflow.com appear here after login.
      </p>
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
              submit();
            }
          }}
        />
      </div>
      <Button onClick={submit}>Sign in</Button>
    </div>
  );
}
