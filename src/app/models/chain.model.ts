export interface DayStatus {
  date: Date;
  completed: boolean;
}

export interface Chain {
  id: string;
  name: string;
  description?: string;
  goal?: string;
  startDate: Date;
  endDate?: Date;
  days: Map<string, boolean>; // date string -> completed
  color?: string;
}

export interface MonthData {
  year: number;
  month: number; // 0-11
  days: DayStatus[];
}
