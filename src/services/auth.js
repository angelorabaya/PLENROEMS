export async function login(log_user, log_pass) {
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_user, log_pass }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Invalid username or password');
    }

    return response.json();
}

export async function changePassword(log_user, old_password, new_password) {
    const response = await fetch('/api/login/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_user, old_password, new_password }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to change password');
    }

    return response.json();
}
