const TYPE_TO_TAB = {
  estimate: 'Estimates',
  change_order: 'Change orders',
  progress_update: 'Progress',
  payment: 'Payments',
  message: 'Messages',
  review: 'Review',
  milestone: 'Overview',
  invite: 'Overview',
}

export function notificationLink(notification) {
  if (notification.type === 'verification') {
    return '/profile'
  }
  if (notification.type === 'inquiry') {
    return notification.project_id ? `/projects/${notification.project_id}` : '/inquiries'
  }
  if (!notification.project_id) {
    return '/'
  }
  const tab = TYPE_TO_TAB[notification.type] || 'Overview'
  return tab === 'Overview'
    ? `/projects/${notification.project_id}`
    : `/projects/${notification.project_id}?tab=${encodeURIComponent(tab)}`
}
