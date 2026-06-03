import { BRANCHES } from '../constants/branches';

export const BRANCHES_API_PATH = '/api/blob/branches';

export async function loadBranchesWithFallback() {
  try {
    const response = await fetch(BRANCHES_API_PATH, { cache: 'no-store' });
    if (!response.ok || !String(response.headers.get('content-type') || '').includes('application/json')) {
      return BRANCHES;
    }
    const data = await response.json();
    if (!Array.isArray(data?.branches) || data.branches.length === 0) {
      return BRANCHES;
    }
    return data.branches;
  } catch {
    return BRANCHES;
  }
}
