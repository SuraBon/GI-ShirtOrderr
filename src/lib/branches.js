import { BRANCHES } from '../constants/branches';

export const BRANCHES_API_PATH = '/api/blob/branches';

export async function loadBranchesWithFallback() {
  try {
    const response = await fetch(BRANCHES_API_PATH, { cache: 'no-store' });
    const data = await response.json();
    if (!Array.isArray(data?.branches) || data.branches.length === 0) {
      return BRANCHES;
    }
    return data.branches;
  } catch (error) {
    console.warn('loadBranchesWithFallback failed, using default branches', error);
    return BRANCHES;
  }
}
