import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Posters from './Posters';

const mocks = vi.hoisted(() => ({ mode: 'data' as 'loading' | 'error' | 'empty' | 'data', mutate: vi.fn() }));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: mocks.mutate, isPending: false }),
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[0] === 'admin-products-picker') return { data: [] };
    return {
      data:
        mocks.mode === 'data'
          ? [{ id: 1, imageUrl: '/poster.jpg', altText: 'Nova sale', productId: 2, sortOrder: 0, isActive: true }]
          : mocks.mode === 'empty'
            ? []
            : undefined,
      isLoading: mocks.mode === 'loading',
      isError: mocks.mode === 'error',
    };
  },
}));
vi.mock('../../lib/cloudinary', () => ({
  getProductImageSrc: (value: string) => value,
  isCloudinaryConfigured: () => true,
  isCloudinaryUrl: () => false,
  uploadPosterImage: vi.fn(),
}));
vi.mock('../../components/PageHeader', () => ({
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <header><h1>{title}</h1>{children}</header>
  ),
}));

describe('Posters', () => {
  beforeEach(() => {
    mocks.mode = 'data';
    vi.clearAllMocks();
  });

  it.each([
    ['loading', '.animate-spin'],
    ['error', 'Failed to load posters.'],
    ['empty', 'No posters yet. Add up to 8 promo images.'],
    ['data', 'Nova sale'],
  ] as const)('renders the %s state', (mode, expected) => {
    mocks.mode = mode;
    const { container } = render(<Posters />);

    if (expected.startsWith('.')) expect(container.querySelector(expected)).toBeInTheDocument();
    else expect(screen.getByText(expected)).toBeVisible();
  });

  it('validates image type and required form selections', () => {
    const { container } = render(<Posters />);
    fireEvent.click(screen.getByRole('button', { name: 'Add poster' }));
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [new File(['text'], 'poster.txt', { type: 'text/plain' })] } });
    expect(screen.getByText(/Please select a valid image file/)).toBeVisible();

    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    expect(screen.getByText('Please select a product to link this poster to.')).toBeVisible();
  });
});
