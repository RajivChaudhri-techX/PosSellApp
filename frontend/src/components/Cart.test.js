import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Cart from './Cart';

const mockOnUpdateQuantity = jest.fn();
const mockOnRemoveItem = jest.fn();
const mockOnCheckout = jest.fn();

const cart = [
  { id: 1, name: 'Product 1', price: 10, quantity: 2 },
  { id: 2, name: 'Product 2', price: 20, quantity: 1 },
];

describe('Cart Component', () => {
  test('renders cart items and total', () => {
    render(
      <Cart
        cart={cart}
        onUpdateQuantity={mockOnUpdateQuantity}
        onRemoveItem={mockOnRemoveItem}
        onCheckout={mockOnCheckout}
      />
    );
    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('Product 2')).toBeInTheDocument();
    expect(screen.getByText('Total: $40.00')).toBeInTheDocument();
  });

  test('calls onUpdateQuantity when quantity buttons are clicked', () => {
    render(
      <Cart
        cart={cart}
        onUpdateQuantity={mockOnUpdateQuantity}
        onRemoveItem={mockOnRemoveItem}
        onCheckout={mockOnCheckout}
      />
    );
    fireEvent.click(screen.getAllByText('+')[0]);
    expect(mockOnUpdateQuantity).toHaveBeenCalledWith(1, 3);
  });

  test('calls onRemoveItem when delete button is clicked', () => {
    render(
      <Cart
        cart={cart}
        onUpdateQuantity={mockOnUpdateQuantity}
        onRemoveItem={mockOnRemoveItem}
        onCheckout={mockOnCheckout}
      />
    );
    fireEvent.click(screen.getAllByRole('button', { hidden: true })[0]); // Assuming delete button
    expect(mockOnRemoveItem).toHaveBeenCalledWith(1);
  });

  test('calls onCheckout when checkout button is clicked', () => {
    render(
      <Cart
        cart={cart}
        onUpdateQuantity={mockOnUpdateQuantity}
        onRemoveItem={mockOnRemoveItem}
        onCheckout={mockOnCheckout}
      />
    );
    fireEvent.click(screen.getByText('Checkout'));
    expect(mockOnCheckout).toHaveBeenCalled();
  });
});