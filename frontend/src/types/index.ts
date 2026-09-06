export type UserRole = 'ADMIN' | 'CUSTOMER';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  level_name?: string | null;
  level_id?: number | null;
  is_active: boolean;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
  user: User;
}

export interface Level {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  programs_count?: number;
  users_count?: number;
}

export interface Exercise {
  id: number;
  name: string;
  muscle_group: string;
  equipment: string;
  difficulty: string;
  instructions?: string;
  default_sets: number;
  default_reps: number;
  rest_seconds: number;
  media_url?: string;
  is_active: boolean;
}

export interface ProgramExercise {
  id?: number;
  exercise_id: number;
  exercise_order: number;
  target_sets: number;
  target_reps: number;
  rest_seconds: number;
  notes?: string;
  exercise?: Exercise;
}

export interface ProgramDay {
  id?: number;
  day_order: number;
  name: string;
  day_type: string;
  is_rest_day: boolean;
  estimated_duration_minutes: number;
  notes?: string;
  exercises: ProgramExercise[];
}

export interface Program {
  id: number;
  name: string;
  description?: string;
  level_id?: number;
  level_name?: string;
  is_active: boolean;
  created_at: string;
  days_count?: number;
  days?: ProgramDay[];
}

export interface WorkoutExerciseTarget {
  exercise_id: number;
  name: string;
  muscle_group: string;
  equipment: string;
  exercise_order: number;
  target_sets: number;
  target_reps: number;
  rest_seconds: number;
  instructions?: string;
  media_url?: string;
  notes?: string;
  previous_best_weight?: number | null;
}

export interface CurrentWorkout {
  has_assignment: boolean;
  program_id?: number;
  program_name?: string;
  level_name?: string;
  day_id?: number;
  day_order?: number;
  day_name?: string;
  day_type?: string;
  is_rest_day: boolean;
  estimated_duration_minutes: number;
  exercises: WorkoutExerciseTarget[];
  total_program_days: number;
  completed_days_count: number;
  start_date?: string;
  due_date?: string;
  days_remaining?: number;
  assignment_status?: string;
  current_streak: number;
  notes?: string;
}

export interface SetLogInput {
  exercise_id?: number;
  exercise_name: string;
  set_number: number;
  target_weight_kg?: number;
  target_reps?: number;
  actual_weight_kg: number;
  actual_reps: number;
  is_completed: boolean;
  notes?: string;
}

export interface WorkoutSetLog {
  id: number;
  exercise_id?: number;
  exercise_name: string;
  set_number: number;
  target_weight_kg?: number;
  target_reps?: number;
  actual_weight_kg: number;
  actual_reps: number;
  is_completed: boolean;
  notes?: string;
}

export interface WorkoutLog {
  id: number;
  user_id: number;
  day_order_completed: number;
  day_name: string;
  day_type: string;
  started_at: string;
  completed_at: string;
  duration_seconds: number;
  notes?: string;
  sets: WorkoutSetLog[];
}

export interface PersonalRecord {
  id: number;
  exercise_id: number;
  exercise_name: string;
  weight_kg: number;
  reps: number;
  achieved_at: string;
}

export interface CompletionDataPoint {
  week_label: string;
  completion_rate: number;
  completed_count: number;
  target_count: number;
}

export interface StrengthDataPoint {
  date_label: string;
  exercise_name: string;
  weight_kg: number;
}

export interface ConsistencyDataPoint {
  day_name: string;
  workouts_count: number;
}

export interface ProgressStats {
  has_assignment: boolean;
  program_name?: string;
  level_name?: string;
  overall_completion_percent: number;
  total_program_days: number;
  completed_workouts: number;
  remaining_workouts: number;
  current_workout_day: number;
  current_streak: number;
  longest_streak: number;
  due_date?: string;
  days_remaining?: number;
  status: string;
  personal_records: PersonalRecord[];
  completion_chart: CompletionDataPoint[];
  strength_chart: StrengthDataPoint[];
  consistency_chart: ConsistencyDataPoint[];
  recent_history: WorkoutLog[];
}

export interface JourneyDay {
  day_order: number;
  day_name: string;
  day_type: string;
  is_rest_day: boolean;
  status: 'COMPLETED' | 'CURRENT' | 'UPCOMING';
  completed_at?: string;
  exercises_count: number;
  duration_minutes: number;
}

export interface CustomerDetail extends User {
  assigned_program_id?: number;
  assigned_program_name?: string;
  current_day_order?: number;
  total_days?: number;
  start_date?: string;
  due_date?: string;
  assignment_status?: string;
  completed_workouts_count: number;
  current_streak: number;
  longest_streak: number;
}

export interface RecentActivityItem {
  id: string;
  user_name: string;
  user_email: string;
  action_type: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

export interface AdminDashboardStats {
  total_customers: number;
  active_customers: number;
  active_programs: number;
  completed_workouts_today: number;
  programs_expiring_soon: number;
  recent_activities: RecentActivityItem[];
}
