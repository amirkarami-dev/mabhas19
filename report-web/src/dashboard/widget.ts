// Dashboard widget and grid layout types.
// Defined here (per Task 10 binding decisions); Task 16 will import from @/dashboard/widget.

export interface DashboardWidget {
  i: string;
  reportId: string;
  viewIndex?: number;
  title?: string;
}

export interface GridLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}
