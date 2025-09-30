export interface User {
  id: string;
  username: string;
  password: string;
  email: string;
  role: 'admin' | 'accountant' | 'user';
  created_at: Date;
  updated_at: Date;
}

export interface Event {
  id: string;
  name: string;
  location: string;
  start_date: Date;
  end_date: Date;
  budget: number;
  status: 'active' | 'completed' | 'cancelled';
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface Expense {
  id: string;
  event_id: string;
  user_id: string;
  category: string;
  amount: number;
  description: string;
  receipt_url?: string;
  ocr_text?: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: Date;
  reviewed_at?: Date;
  reviewed_by?: string;
  comments?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}
