// Augmentación de tipos de react-table (v7): los plugins useSortBy y usePagination
// agregan propiedades en tiempo de ejecución que TypeScript no conoce por defecto.
// Aquí se las declaramos para que el tipado las reconozca.
import {
  UsePaginationInstanceProps,
  UsePaginationState,
  UseSortByColumnProps,
} from 'react-table';

declare module 'react-table' {
  // Instancia de tabla: métodos/estado de paginación (page, gotoPage, nextPage, etc.)
  export interface TableInstance<D extends object = {}>
    extends UsePaginationInstanceProps<D> {}

  // Estado de la tabla: pageIndex y pageSize.
  export interface TableState<D extends object = {}>
    extends UsePaginationState<D> {}

  // Columna: props de ordenamiento (getSortByToggleProps, isSorted, isSortedDesc).
  export interface ColumnInstance<D extends object = {}>
    extends UseSortByColumnProps<D> {}
}
