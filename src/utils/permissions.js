export const normalizeUserRole = (user) => {
    const role = String(user?.role || user?.log_role || '')
        .trim()
        .toLowerCase();
    const username = String(user?.log_user || '')
        .trim()
        .toLowerCase();
    const access = Number(user?.log_access || 0);

    if (role === 'administrator' || role === 'admin') return 'administrator';
    if (role === 'editor') return 'editor';
    if (role === 'viewer') return 'viewer';
    if (username === 'admin' || username === 'builtin administrator' || access === 1) {
        return 'administrator';
    }

    return 'viewer';
};

export const getUserPermissions = (user) => {
    const role = normalizeUserRole(user);

    return {
        role,
        canRead: true,
        canCreate: role === 'administrator' || role === 'editor',
        canUpdate: role === 'administrator' || role === 'editor',
        canDelete: role === 'administrator',
        isAdministrator: role === 'administrator',
        isEditor: role === 'editor',
        isViewer: role === 'viewer',
    };
};
