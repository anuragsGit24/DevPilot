import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('DevPilot Frontend Application', () => {
  it('renders application shell and core branding', async () => {
    render(<App />);
    const matches = await screen.findAllByText(/DevPilot/i);
    expect(matches.length).toBeGreaterThan(0);
  });
});
