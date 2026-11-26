import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppErrorBoundary } from '@/components/ui/AppErrorBoundary';
import { Input } from '@/components/ui/Input';
import { DataTable, Pagination } from '@/components/ui/DataTable';
import { Dialog } from '@/components/ui/Dialog';
import { Drawer } from '@/components/ui/Drawer';

describe('Shared workspace interactions', () => {
  it('offers recovery when a page fails to render', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    function BrokenPage(): never { throw new Error('Test render failure'); }
    try {
      render(<AppErrorBoundary><BrokenPage /></AppErrorBoundary>);
      expect(screen.getByRole('button', { name: 'Reload workspace' })).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('This page couldn’t load');
    } finally { log.mockRestore(); }
  });
  it('gives repeated input labels unique associations and allows trailing actions', async () => {
    const action = vi.fn();
    render(<><Input label="Password" iconRight={<button onClick={action}>Show password</button>} /><Input label="Password" /></>);
    const inputs = screen.getAllByLabelText('Password');
    expect(inputs[0].id).not.toBe(inputs[1].id);
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(action).toHaveBeenCalledOnce();
  });

  it('sorts numeric values with keyboard input and keeps row actions separate', async () => {
    const rowClick = vi.fn();
    render(<DataTable data={[{ id: 'a', count: 10 }, { id: 'b', count: 2 }]} keyExtractor={(row) => row.id} onRowClick={rowClick}
      columns={[{ key: 'count', header: 'Count', sortable: true, render: (row) => row.count }, { key: 'action', header: 'Action', render: () => <button>Edit</button> }]} />);
    screen.getByRole('button', { name: /Count/ }).focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getAllByRole('cell')[0]).toHaveTextContent('2');
    await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    expect(rowClick).not.toHaveBeenCalled();
  });

  it('keeps the current page reachable beyond the first five pages', () => {
    render(<Pagination page={9} totalPages={12} total={120} pageSize={10} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Page 9' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows a valid range for empty pagination', () => {
    render(<Pagination page={1} totalPages={0} total={0} pageSize={10} onChange={vi.fn()} />);
    expect(screen.getByText('0–0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  for (const Component of [Dialog, Drawer]) {
    it(`gives ${Component.name} a name and supports Escape`, async () => {
      const close = vi.fn();
      render(<Component open onClose={close} title="Review details" description="Review your changes."><button>Continue</button></Component>);
      expect(screen.getByRole('dialog', { name: 'Review details' })).toHaveAccessibleDescription('Review your changes.');
      await userEvent.keyboard('{Escape}');
      expect(close).toHaveBeenCalledOnce();
    });
  }
});
