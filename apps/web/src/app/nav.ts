import { ADMIN_ROLES, type Role } from '@aura/contracts';

/**
 * Single source of truth for the primary navigation + route permissions.
 * Add a destination here and it shows up in the sidebar automatically.
 */
export interface NavItem {
  to: string;
  label: string;
  icon: string;
  /** If set, only these roles see the item. */
  roles?: Role[];
  /** Show at the bottom of the sidebar. */
  footer?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: 'LayoutDashboard' },
  { to: '/games', label: 'Games', icon: 'Gamepad2' },
  { to: '/leaderboards', label: 'Leaderboards', icon: 'Trophy' },
  { to: '/wallet', label: 'Wallet', icon: 'Wallet' },
  { to: '/notifications', label: 'Notifications', icon: 'Bell' },
  { to: '/me', label: 'Profile', icon: 'User' },
  { to: '/admin', label: 'Admin', icon: 'ShieldCheck', roles: ADMIN_ROLES, footer: true },
];

export function visibleNav(role: Role | undefined): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role)));
}
