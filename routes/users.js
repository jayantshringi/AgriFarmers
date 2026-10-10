/**
 * AgriFarmers — User Profile & Session Persistence Routes
 * Modular route handler for /api/users
 */

function createUsersHandler(getDb, helpers) {
    const { sendJson, readJsonBody, createHttpError } = helpers;

    function assertDbAvailable() {
        const client = getDb();
        if (!client) {
            throw createHttpError(503, 'Database is unavailable. Please try again later.');
        }
        return client;
    }

    /** Convert a Supabase DB row to a clean profile object for the frontend */
    function rowToProfile(row) {
        if (!row) return null;
        return {
            uid:       row.uid,
            mobile:    row.mobile,
            name:      row.name,
            state:     row.state     || '',
            district:  row.district  || '',
            location:  row.location  || null,
            createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
            updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
            lastLogin: row.last_login ? new Date(row.last_login).toISOString()  : null
        };
    }

    /** POST /api/users — create or update user profile */
    async function handleCreateUser(req, res) {
        const client = assertDbAvailable();

        const body = await readJsonBody(req);
        const { mobile, uid, name, state, district, location } = body;

        if (!mobile || !/^\d{10}$/.test(mobile)) {
            throw createHttpError(400, 'Invalid mobile number.');
        }
        if (!name || name.trim().length < 2) {
            throw createHttpError(400, 'Name must be at least 2 characters.');
        }

        const safeUid = uid || `user_${mobile}`;

        const { data, error } = await client
            .from('users')
            .upsert(
                {
                    mobile,
                    uid: safeUid,
                    name: name.trim(),
                    state: state || null,
                    district: district || null,
                    location: location || null
                },
                { onConflict: 'mobile' }
            )
            .select()
            .single();

        if (error) {
            console.error('Supabase createUser error:', error);
            throw createHttpError(500, 'Failed to save user profile: ' + error.message);
        }

        sendJson(req, res, 201, { user: rowToProfile(data) });
    }

    /** GET /api/users/:mobile — fetch user profile */
    async function handleGetUser(req, res, mobile) {
        const client = assertDbAvailable();

        if (!mobile || !/^\d{10}$/.test(mobile)) {
            throw createHttpError(400, 'Invalid mobile number.');
        }

        const { data, error } = await client
            .from('users')
            .select('*')
            .eq('mobile', mobile)
            .maybeSingle();

        if (error) {
            console.error('Supabase getUser error:', error);
            throw createHttpError(500, 'Failed to query database: ' + error.message);
        }

        if (!data) {
            throw createHttpError(404, 'User not found.');
        }

        sendJson(req, res, 200, { user: rowToProfile(data) });
    }

    /** PUT /api/users/:mobile/login — update last_login timestamp */
    async function handleUpdateLogin(req, res, mobile) {
        const client = assertDbAvailable();

        if (!mobile || !/^\d{10}$/.test(mobile)) {
            throw createHttpError(400, 'Invalid mobile number.');
        }

        const { data, error } = await client
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('mobile', mobile)
            .select()
            .maybeSingle();

        if (error) {
            console.error('Supabase updateLogin error:', error);
            throw createHttpError(500, 'Failed to update login timestamp: ' + error.message);
        }

        if (!data) {
            throw createHttpError(404, 'User not found.');
        }

        sendJson(req, res, 200, { user: rowToProfile(data) });
    }

    return {
        handleCreateUser,
        handleGetUser,
        handleUpdateLogin,
        rowToProfile
    };
}

module.exports = {
    createUsersHandler
};
