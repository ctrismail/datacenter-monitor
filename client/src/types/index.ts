export interface User {
  id: number;
  username: string;
  display_name: string;
  is_active?: boolean;
  created_at?: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string | null;
  sort_order: number;
}

export interface Equipment {
  id: number;
  category_id: number;
  name: string;
  location: string | null;
  description: string | null;
  is_active: boolean;
  category_name?: string;
  category_icon?: string;
}

export interface CheckType {
  id: number;
  name: string;
  description: string | null;
}

export interface CheckSchedule {
  id: number;
  equipment_id: number;
  check_type_id: number;
  interval_hours: number;
  is_active: boolean;
  equipment_name?: string;
  check_type_name?: string;
}

export interface CheckLog {
  id: number;
  equipment_id: number;
  check_type_id: number;
  user_id: number;
  status: 'ok' | 'warning' | 'critical';
  notes: string | null;
  checked_at: string;
  equipment_name?: string;
  check_type_name?: string;
  user_name?: string;
  fields?: FieldValue[];
}

export interface FieldDefinition {
  id: number;
  category_id: number;
  field_name: string;
  field_label: string;
  field_type: 'number' | 'text' | 'select' | 'boolean';
  unit: string | null;
  options: string | null;
  sort_order: number;
  is_required: boolean;
}

export interface FieldValue {
  id: number;
  check_log_id: number;
  field_def_id: number;
  value: string;
  field_name?: string;
  field_label?: string;
  field_type?: string;
  unit?: string;
}

export interface DashboardSummary {
  total_equipment: string;
  total_checks: string;
  ok_count: string;
  warning_count: string;
  overdue_count: string;
}

export interface EquipmentStatus {
  id: number;
  name: string;
  location: string | null;
  category_id: number;
  category_name: string;
  category_icon: string | null;
  schedules: ScheduleStatus[];
}

export interface ScheduleStatus {
  schedule_id: number;
  check_type_id: number;
  check_type_name: string;
  interval_hours: number;
  last_checked: string | null;
  last_status: string | null;
  last_user: string | null;
  hours_since_check: number | null;
}

export interface Alert {
  equipment_id: number;
  equipment_name: string;
  location: string | null;
  category_name: string;
  check_type_name: string;
  interval_hours: number;
  last_checked: string | null;
  hours_overdue: number | null;
}
