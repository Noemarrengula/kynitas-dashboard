import { supabase } from "./supabase";
import type { BusinessRole, BusinessUser } from "@/types/domains/user";

export interface CreateUserParams {
  email: string;
  password: string;
  name: string;
  businessId: string;
  role: Extract<BusinessRole, 'manager' | 'staff'>;
}

export interface CreateUserResult {
  user_id: string;
  created: boolean;
}

export async function createBusinessUser(
  params: CreateUserParams
): Promise<CreateUserResult> {
  const { data, error } = await supabase.rpc('create_business_user', {
    p_email: params.email,
    p_password: params.password,
    p_name: params.name,
    p_business_id: params.businessId,
    p_role: params.role,
  });

  if (error) throw error;
  return data as CreateUserResult;
}

export async function listBusinessUsers(
  businessId?: string
): Promise<BusinessUser[]> {
  const { data, error } = await supabase.rpc('list_business_users', {
    p_business_id: businessId || null,
  });

  if (error) throw error;
  return (data || []) as BusinessUser[];
}

export async function deactivateBusinessUser(
  userId: string,
  businessId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('deactivate_business_user', {
    p_user_id: userId,
    p_business_id: businessId,
  });

  if (error) throw error;
  return data as boolean;
}

export async function getCurrentUserBusinessRole(
  businessId: string
): Promise<BusinessRole | null> {
  const { data, error } = await supabase
    .from('business_users')
    .select('role')
    .eq('business_id', businessId)
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .single();

  if (error || !data) return null;
  return data.role as BusinessRole;
}
