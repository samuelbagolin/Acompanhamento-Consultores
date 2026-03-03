export interface Month {
  id: number;
  name: string;
}

export interface Sector {
  id: number;
  name: string;
  color: string;
  logo_url: string | null;
}

export interface Employee {
  id: number;
  month_id: number;
  sector_id: number;
  name: string;
  image_url: string;
  goal: string | null;
}

export interface Indicator {
  id: number;
  month_id: number;
  sector_id: number;
  name: string;
  type: 'NUMBER' | 'PERCENT' | 'CURRENCY';
  is_negative: boolean;
  order_index: number;
}

export interface PerformanceValue {
  id: number;
  indicator_id: number;
  employee_id: number;
  value: number;
}

export interface DashboardData {
  sector: Sector;
  employees: Employee[];
  indicators: Indicator[];
  values: PerformanceValue[];
}
