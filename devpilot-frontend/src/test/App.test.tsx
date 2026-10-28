import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('DevPilot Frontend Application', () => {
  it('renders application shell and core branding', () => {
    render(<App />);
    expect(screen.getAllByText(/DevPilot/i).length).toBeGreaterThan(0);
  });
});
