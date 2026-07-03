import {
  UseSortByColumnOptions,
  UseSortByColumnProps,
  UseSortByOptions,
  UseSortByState,
  UsePaginationInstanceProps,
  UsePaginationOptions,
  UsePaginationState,
} from 'react-table';

declare module 'react-table' {
  // Merge plugin options into the base TableOptions.
  export interface TableOptions<D extends object>
    extends UseSortByOptions<D>,
      UsePaginationOptions<D> {}

  // Merge plugin instance props into the base TableInstance.
  export interface TableInstance<D extends object>
    extends UsePaginationInstanceProps<D> {}

  // Merge plugin state into the base TableState.
  export interface TableState<D extends object>
    extends UseSortByState<D>,
      UsePaginationState<D> {}

  // Merge plugin column options into the base ColumnInterface.
  export interface ColumnInstance<D extends object>
    extends UseSortByColumnProps<D> {}

  export interface Column<D extends object>
    extends UseSortByColumnOptions<D> {}
}
