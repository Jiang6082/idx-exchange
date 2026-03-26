import { render, screen, fireEvent } from '@testing-library/react';
import Pagination from './Pagination';

describe('Pagination', () => {
  test('renders pagination controls', () => {
    const onPageChange = jest.fn();

    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />
    );

    expect(screen.getByText('← Previous')).toBeInTheDocument();
    expect(screen.getByText('Next →')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  test('disables Previous button on first page', () => {
    const onPageChange = jest.fn();

    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />
    );

    expect(screen.getByText('← Previous')).toBeDisabled();
  });

  test('disables Next button on last page', () => {
    const onPageChange = jest.fn();

    render(
      <Pagination currentPage={5} totalPages={5} onPageChange={onPageChange} />
    );

    expect(screen.getByText('Next →')).toBeDisabled();
  });

  test('calls onPageChange when Next is clicked', () => {
    const onPageChange = jest.fn();

    render(
      <Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} />
    );

    fireEvent.click(screen.getByText('Next →'));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  test('calls onPageChange when Previous is clicked', () => {
    const onPageChange = jest.fn();

    render(
      <Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />
    );

    fireEvent.click(screen.getByText('← Previous'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  test('calls onPageChange when page number is clicked', () => {
    const onPageChange = jest.fn();

    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />
    );

    fireEvent.click(screen.getByText('3'));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  test('highlights current page', () => {
    const onPageChange = jest.fn();

    render(
      <Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />
    );

    expect(screen.getByText('3')).toHaveClass('active');
  });

  test('does not render when totalPages is 1', () => {
    const onPageChange = jest.fn();
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={onPageChange} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});