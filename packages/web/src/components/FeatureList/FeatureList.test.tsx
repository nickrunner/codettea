import { render, screen, fireEvent } from '@testing-library/react';
import { FeatureList } from './FeatureList';
import { Feature } from '@/types/api';

describe('FeatureList', () => {
  const mockFeatures: Feature[] = [
    {
      name: 'feature-1',
      description: 'First feature',
      status: 'in_progress',
      branch: 'feature/feature-1',
      worktreePath: '/path/to/worktree',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-02T10:00:00Z',
    },
    {
      name: 'feature-2',
      description: 'Second feature',
      status: 'completed',
      branch: 'feature/feature-2',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-03T10:00:00Z',
    },
  ];

  it('renders loading state', () => {
    render(<FeatureList features={[]} loading={true} />);
    expect(screen.getByText('Loading features...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    const error = 'Failed to load features';
    render(<FeatureList features={[]} error={error} />);
    expect(screen.getByRole('alert')).toHaveTextContent(error);
  });

  it('renders empty state', () => {
    render(<FeatureList features={[]} />);
    expect(screen.getByText('No features yet')).toBeInTheDocument();
  });

  it('renders empty state with create button', () => {
    const onCreateFeature = jest.fn();
    render(<FeatureList features={[]} onCreateFeature={onCreateFeature} />);
    
    const createButton = screen.getByText('Create your first feature');
    fireEvent.click(createButton);
    
    expect(onCreateFeature).toHaveBeenCalledTimes(1);
  });

  it('renders feature list', () => {
    render(<FeatureList features={mockFeatures} />);
    
    expect(screen.getByText('feature-1')).toBeInTheDocument();
    expect(screen.getByText('First feature')).toBeInTheDocument();
    expect(screen.getByText('in progress')).toBeInTheDocument();
    
    expect(screen.getByText('feature-2')).toBeInTheDocument();
    expect(screen.getByText('Second feature')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('highlights selected feature', () => {
    const { container } = render(
      <FeatureList features={mockFeatures} selectedFeature="feature-1" />
    );
    
    const selectedItems = container.querySelectorAll('.selected');
    expect(selectedItems).toHaveLength(1);
    expect(selectedItems[0]).toHaveTextContent('feature-1');
  });

  it('calls onSelectFeature when feature is clicked', () => {
    const onSelectFeature = jest.fn();
    render(
      <FeatureList features={mockFeatures} onSelectFeature={onSelectFeature} />
    );
    
    fireEvent.click(screen.getByText('feature-1'));
    expect(onSelectFeature).toHaveBeenCalledWith('feature-1');
  });

  it('supports keyboard navigation', () => {
    const onSelectFeature = jest.fn();
    render(
      <FeatureList features={mockFeatures} onSelectFeature={onSelectFeature} />
    );
    
    const featureItem = screen.getByText('feature-1').closest('[role="button"]');
    
    if (featureItem) {
      fireEvent.keyDown(featureItem, { key: 'Enter' });
      expect(onSelectFeature).toHaveBeenCalledWith('feature-1');
      
      onSelectFeature.mockClear();
      
      fireEvent.keyDown(featureItem, { key: ' ' });
      expect(onSelectFeature).toHaveBeenCalledWith('feature-1');
    }
  });

  it('renders create button in header', () => {
    const onCreateFeature = jest.fn();
    render(
      <FeatureList features={mockFeatures} onCreateFeature={onCreateFeature} />
    );
    
    const createButton = screen.getByLabelText('Create new feature');
    fireEvent.click(createButton);
    
    expect(onCreateFeature).toHaveBeenCalledTimes(1);
  });

  it('displays correct status badges', () => {
    render(<FeatureList features={mockFeatures} />);
    
    const inProgressBadge = screen.getByText('in progress');
    const completedBadge = screen.getByText('completed');
    
    expect(inProgressBadge).toBeInTheDocument();
    expect(completedBadge).toBeInTheDocument();
  });
});