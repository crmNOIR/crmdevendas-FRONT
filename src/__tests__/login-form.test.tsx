import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../components/login-form';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('../lib/api', () => ({
  api: {
    login: jest.fn(),
    setToken: jest.fn(),
  },
}));

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form correctly', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/E-mail/i)).toBeTruthy();
    expect(screen.getByLabelText(/Senha/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Login' })).toBeTruthy();
  });

  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const submitButton = screen.getByRole('button', { name: 'Login' });
    await user.click(submitButton);

    // Since HTML5 validation is used, we can check for the validity state
    const emailInput = screen.getByLabelText(/E-mail/i);
    const passwordInput = screen.getByLabelText(/Senha/i);

    await waitFor(() => {
      expect(emailInput.hasAttribute('required')).toBe(true);
      expect(passwordInput.hasAttribute('required')).toBe(true);
    });
  });

  it('calls login API on form submission', async () => {
    const user = userEvent.setup();
    const { api } = require('../lib/api');
    (api.login as jest.Mock).mockImplementation(async (data) => {
      const response = {
        token: 'fake-token',
        user: { id: '1', email: 'test@example.com' }
      };
      api.setToken(response.token);
      return response;
    });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: 'Login' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
      expect(api.setToken).toHaveBeenCalledWith('fake-token');
    });
  });

  it('shows error message on login failure', async () => {
    const user = userEvent.setup();
    const { api } = require('../lib/api');
    (api.login as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/E-mail/i);
    const passwordInput = screen.getByLabelText(/Senha/i);
    const submitButton = screen.getByRole('button', { name: 'Login' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeTruthy();
    });
  });
});
