import { render, screen, fireEvent } from '@testing-library/react';
import { ClaudeStatus } from './ClaudeStatus';
import { ClaudeStatus as ClaudeStatusType } from '@/types/api';

describe('ClaudeStatus', () => {
  const mockStatus: ClaudeStatusType = {
    connected: true,
    lastCheck: '2024-01-01T10:00:00Z',
    capabilities: {
      model: 'claude-3',
      maxTokens: 100000,
    },
  };

  it('renders loading state', () => {
    render(<ClaudeStatus status={null} loading={true} />);
    expect(screen.getByText('Checking...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    const error = 'Connection failed';
    render(<ClaudeStatus status={null} error={error} />);
    expect(screen.getByRole('alert')).toHaveTextContent(error);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('renders connected status', () => {
    render(<ClaudeStatus status={mockStatus} />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('claude-3')).toBeInTheDocument();
    expect(screen.getByText('100,000')).toBeInTheDocument();
  });

  it('renders disconnected status', () => {
    const disconnectedStatus = { ...mockStatus, connected: false };
    render(<ClaudeStatus status={disconnectedStatus} />);
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('calls onRefresh when refresh button is clicked', () => {
    const onRefresh = jest.fn();
    render(<ClaudeStatus status={mockStatus} onRefresh={onRefresh} />);
    
    const refreshButton = screen.getByLabelText('Refresh Claude status');
    fireEvent.click(refreshButton);
    
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('disables refresh button when loading', () => {
    const onRefresh = jest.fn();
    render(<ClaudeStatus status={null} loading={true} onRefresh={onRefresh} />);
    
    const refreshButton = screen.getByLabelText('Refresh Claude status');
    expect(refreshButton).toBeDisabled();
  });

  it('renders unknown state when no status and not loading', () => {
    render(<ClaudeStatus status={null} />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<ClaudeStatus status={mockStatus} />);
    
    const statusElement = screen.getByRole('status');
    expect(statusElement).toHaveAttribute('aria-live', 'polite');
    expect(statusElement).toHaveAttribute('aria-label', 'Claude status: Connected');
  });
});